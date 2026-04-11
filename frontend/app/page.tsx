'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '@/components/AppShell';
import {
  continueDebate,
  createDebate,
  fetchGraph,
  fetchModels,
  fetchPersonalities,
  finalizeDebate,
  getApiBaseUrl,
  getDebate,
  listDebates,
  sendIntervention,
  startDebate,
  BackendDebateStatus,
  DebateListItem,
} from '@/lib/api';
import {
  buildAgentLanes,
  buildLaneConfigs,
  ApiModel,
  ApiPersonality,
  DebateGraphNode,
  DebateStatus,
  LaneId,
  LaneSettings,
  ReasoningMessage,
} from '@/types/ui';

const FALLBACK_MODEL_KEY = 'openrouter:stepfun/step-3.5-flash';

const DEFAULT_AGENT_COUNT = 3;
const MIN_AGENT_COUNT = 1;
const MAX_AGENT_COUNT = 5;

// Map backend status to frontend UI status
function mapBackendStatusToFrontend(backendStatus: BackendDebateStatus): DebateStatus {
  switch (backendStatus) {
    case 'running':
      return 'running';
    case 'waiting_user':
    case 'completed':
      return 'completed';
    case 'errored':
      return 'errored';
    case 'draft':
    default:
      return 'idle';
  }
}

function buildInitialLaneSettings(agentCount: number): Record<LaneId, LaneSettings> {
  const settings: Record<LaneId, LaneSettings> = {
    orchestrator: { modelKey: '', personalityId: '' },
  };
  for (const laneId of buildAgentLanes(agentCount)) {
    settings[laneId] = { modelKey: '', personalityId: '' };
  }
  return settings;
}

const PERSONALITY_ROTATION = ['Strategist', 'Contrarian', 'Optimist', 'Skeptic', 'Synthesizer', 'Domain Expert'];

function getPreferredPersonalityNames(laneId: LaneId): string[] {
  if (laneId === 'orchestrator') return ['Synthesizer', 'Strategist'];
  // Extract debater index from lane id (e.g. 'debater-a' -> 0, 'debater-b' -> 1)
  const letter = laneId.split('-')[1];
  const index = letter ? letter.charCodeAt(0) - 97 : 0;
  const primary = PERSONALITY_ROTATION[index % PERSONALITY_ROTATION.length];
  const secondary = PERSONALITY_ROTATION[(index + 1) % PERSONALITY_ROTATION.length];
  return [primary, secondary];
}

type CreateEventPayload = {
  nodeId: string;
  speakerType: 'user' | 'orchestrator' | 'agent' | 'system';
  speakerId?: string;
  nodeType: 'message' | 'summary' | 'final' | 'intervention' | 'regen_root';
  parentNodeId?: string;
  createdAt?: string;
};

type ChunkEventPayload = {
  nodeId: string;
  chunk: string;
};

type CompleteEventPayload = {
  nodeId: string;
  content: string;
};

type EdgeCreatedEventPayload = {
  edgeId?: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: 'responds_to' | 'criticizes' | 'supports' | 'summarizes' | 'regenerated_from' | 'spawned_by_orchestrator';
};

type UsageUpdatedEventPayload = {
  debateId: string;
  runId: string;
  modelKey: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
};

function toEdgeRelationKey(edge: {
  fromNodeId: string;
  toNodeId: string;
  edgeType:
    | 'responds_to'
    | 'criticizes'
    | 'supports'
    | 'summarizes'
    | 'regenerated_from'
    | 'spawned_by_orchestrator';
}): string {
  return `${edge.fromNodeId}|${edge.toNodeId}|${edge.edgeType}`;
}

function parseEventData<T>(event: Event): T | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
    return null;
  }

  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}

function findPersonalityIdForLane(
  laneId: LaneId,
  personalities: ApiPersonality[],
): string {
  const preferredNames = getPreferredPersonalityNames(laneId);
  const byName = preferredNames
    .map((name) => personalities.find((personality) => personality.name === name)?.id)
    .find(Boolean);
  return byName ?? personalities[0]?.id ?? '';
}

function deriveTitle(goal: string): string {
  const normalized = goal.trim().replace(/\s+/g, ' ');
  if (normalized.length <= 70) return normalized;
  return `${normalized.slice(0, 67)}...`;
}

export default function Home() {
  const [agentCount, setAgentCount] = useState(DEFAULT_AGENT_COUNT);
  const [status, setStatus] = useState<DebateStatus>('idle');
  const [debateId, setDebateId] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<ApiModel[]>([]);
  const [defaultModelKey, setDefaultModelKey] = useState(FALLBACK_MODEL_KEY);
  const [personalityOptions, setPersonalityOptions] = useState<ApiPersonality[]>([]);
  const [laneSettings, setLaneSettings] =
    useState<Record<LaneId, LaneSettings>>(() => buildInitialLaneSettings(DEFAULT_AGENT_COUNT));

  const laneConfigs = useMemo(() => buildLaneConfigs(agentCount), [agentCount]);
  const agentLanes = useMemo(() => buildAgentLanes(agentCount), [agentCount]);

  const [graphNodes, setGraphNodes] = useState<DebateGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<
    Array<{
      id: string;
      fromNodeId: string;
      toNodeId: string;
      edgeType:
        | 'responds_to'
        | 'criticizes'
        | 'supports'
        | 'summarizes'
        | 'regenerated_from'
        | 'spawned_by_orchestrator';
    }>
  >([]);
  const [agentLaneById, setAgentLaneById] = useState<Record<string, LaneId>>({});
  
  // Session usage tracking (non-persistent)
  const [sessionTotalTokens, setSessionTotalTokens] = useState(0);
  const [sessionTotalCost, setSessionTotalCost] = useState<number | null>(null);
  const [sessionHasUnknownCost, setSessionHasUnknownCost] = useState(false);

  // Debate list state
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [debatesLoading, setDebatesLoading] = useState(false);
  const [debatesError, setDebatesError] = useState<string | null>(null);
  const [loadingDebateId, setLoadingDebateId] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const chunkBufferRef = useRef<Map<string, string>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stale request protection - increment on each new load request
  const loadRequestCounterRef = useRef(0);
  // Active stream debate ID guard
  const activeStreamDebateIdRef = useRef<string | null>(null);

  const handlePersonalityGenerated = useCallback((personality: ApiPersonality) => {
    setPersonalityOptions((prev) => {
      if (prev.some((existing) => existing.id === personality.id)) {
        return prev;
      }
      return [...prev, personality];
    });
  }, []);

  const buildContinueAgentOverrides = useCallback(() => {
    const personalityById = new Map(
      personalityOptions.map((personality) => [personality.id, personality]),
    );

    return agentLanes.flatMap((laneId) => {
      const laneState = laneSettings[laneId];
      if (!laneState?.modelKey || !laneState?.personalityId) {
        return [];
      }

      const personality = personalityById.get(laneState.personalityId);
      if (!personality) {
        return [];
      }

      return [{
        laneId,
        modelKey: laneState.modelKey,
        personalityJson: JSON.stringify(personality.personality),
      }];
    });
  }, [agentLanes, laneSettings, personalityOptions]);

  const resolveLaneForNode = useCallback(
    (node: DebateGraphNode): LaneId => {
      if (node.speakerType === 'agent' && node.speakerId) {
        return agentLaneById[node.speakerId] ?? 'debater-a';
      }
      return 'orchestrator';
    },
    [agentLaneById],
  );

  const closeStream = useCallback(() => {
    // Flush any remaining buffered chunks before closing
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (chunkBufferRef.current.size > 0) {
      setGraphNodes((prev) =>
        prev.map((node) => {
          const buffered = chunkBufferRef.current.get(node.id);
          if (!buffered) return node;
          return {
            ...node,
            content: `${node.content}${buffered}`,
            status: 'streaming',
          };
        }),
      );
      chunkBufferRef.current.clear();
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    activeStreamDebateIdRef.current = null;
  }, []);

  const flushBufferedChunks = useCallback(() => {
    if (chunkBufferRef.current.size === 0) {
      flushTimerRef.current = null;
      return;
    }

    const chunksToApply = new Map(chunkBufferRef.current);
    chunkBufferRef.current.clear();

    setGraphNodes((prev) =>
      prev.map((node) => {
        const buffered = chunksToApply.get(node.id);
        if (!buffered) return node;
        return {
          ...node,
          content: `${node.content}${buffered}`,
          status: 'streaming',
        };
      }),
    );

    flushTimerRef.current = null;
  }, []);

  const resetSessionUsage = useCallback(() => {
    setSessionTotalTokens(0);
    setSessionTotalCost(null);
    setSessionHasUnknownCost(false);
  }, []);

  // Refresh debate list with optional silent mode
  const refreshDebateList = useCallback(async (silent = false) => {
    if (!silent) {
      setDebatesLoading(true);
    }
    setDebatesError(null);
    
    try {
      const list = await listDebates();
      setDebates(list);
    } catch (error) {
      console.error('Failed to load debate list:', error);
      setDebatesError('Failed to load debates');
    } finally {
      if (!silent) {
        setDebatesLoading(false);
      }
    }
  }, []);

  const refreshGraph = useCallback(
    async (targetDebateId?: string) => {
      const id = targetDebateId ?? debateId;
      if (!id) return;
      const graph = await fetchGraph(id);
      setGraphNodes(graph.nodes);
      setGraphEdges(graph.edges);
    },
    [debateId],
  );

  const hydrateOptions = useCallback(async () => {
    const [{ models, defaultModelKey: backendDefaultModelKey }, personalities] = await Promise.all([
      fetchModels(),
      fetchPersonalities(),
    ]);

    setModelOptions(models);
    setDefaultModelKey(backendDefaultModelKey || FALLBACK_MODEL_KEY);
    setPersonalityOptions(personalities);

    const modelFallback = backendDefaultModelKey || models[0]?.key || FALLBACK_MODEL_KEY;

    setLaneSettings((prev) => {
      const next = { ...prev };
      for (const lane of laneConfigs) {
        const previous = next[lane.id] ?? { modelKey: '', personalityId: '' };
        const modelKey = previous.modelKey || modelFallback;
        const personalityId =
          previous.personalityId || findPersonalityIdForLane(lane.id, personalities);
        next[lane.id] = { modelKey, personalityId };
      }
      return next;
    });

    return {
      models,
      defaultModelKey: backendDefaultModelKey || FALLBACK_MODEL_KEY,
      personalities,
    };
  }, [laneConfigs]);

  const openSse = useCallback(
    (targetDebateId: string) => {
      closeStream();
      activeStreamDebateIdRef.current = targetDebateId;
      const source = new EventSource(`${getApiBaseUrl()}/api/stream/${targetDebateId}/stream`);
      eventSourceRef.current = source;

      source.addEventListener('phase:changed', () => {
        if (activeStreamDebateIdRef.current !== targetDebateId) return;
        setStatus('running');
      });

      source.addEventListener('node:created', (event) => {
        const payload = parseEventData<CreateEventPayload>(event);
        if (!payload) return;

        // Stale stream guard
        if (activeStreamDebateIdRef.current !== targetDebateId) return;

        setGraphNodes((prev) => {
          if (prev.some((node) => node.id === payload.nodeId)) return prev;
          return [
            ...prev,
            {
              id: payload.nodeId,
              parentNodeId: payload.parentNodeId ?? null,
              speakerType: payload.speakerType,
              speakerId: payload.speakerId ?? null,
              nodeType: payload.nodeType,
              content: '',
              status: 'streaming',
              metadata: null,
              createdAt: payload.createdAt ?? new Date().toISOString(),
            },
          ];
        });
      });

      source.addEventListener('node:chunk', (event) => {
        const payload = parseEventData<ChunkEventPayload>(event);
        if (!payload) return;

        // Stale stream guard
        if (activeStreamDebateIdRef.current !== targetDebateId) return;

        // Buffer the chunk for this node
        const existing = chunkBufferRef.current.get(payload.nodeId) ?? '';
        chunkBufferRef.current.set(payload.nodeId, existing + payload.chunk);

        // Schedule flush if not already scheduled (throttle to ~80ms)
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(flushBufferedChunks, 80);
        }
      });

      source.addEventListener('node:complete', (event) => {
        const payload = parseEventData<CompleteEventPayload>(event);
        if (!payload) return;

        // Stale stream guard
        if (activeStreamDebateIdRef.current !== targetDebateId) return;

        // Clear any buffered chunks for this node since we have the final content
        chunkBufferRef.current.delete(payload.nodeId);

        setGraphNodes((prev) =>
          prev.map((node) =>
            node.id === payload.nodeId
              ? {
                  ...node,
                  content: payload.content,
                  status: 'complete',
                }
              : node,
          ),
        );
      });

      source.addEventListener('edge:created', (event) => {
        const payload = parseEventData<EdgeCreatedEventPayload>(event);
        if (!payload) return;

        // Stale stream guard
        if (activeStreamDebateIdRef.current !== targetDebateId) return;

        setGraphEdges((prev) => {
          const relationKey = toEdgeRelationKey(payload);
          if (prev.some((edge) => toEdgeRelationKey(edge) === relationKey)) return prev;

          const id = payload.edgeId ?? `edge-${payload.fromNodeId}-${payload.toNodeId}-${payload.edgeType}`;
          return [
            ...prev,
            {
              id,
              fromNodeId: payload.fromNodeId,
              toNodeId: payload.toNodeId,
              edgeType: payload.edgeType,
            },
          ];
        });
      });

      source.addEventListener('run:complete', () => {
        // Stale stream guard
        if (activeStreamDebateIdRef.current !== targetDebateId) return;
        
        setStatus('completed');
        // Refresh debate list after run completes
        refreshDebateList(true);
      });

      source.addEventListener('run:error', () => {
        // Stale stream guard
        if (activeStreamDebateIdRef.current !== targetDebateId) return;
        
        setStatus('errored');
        // Refresh debate list after error
        refreshDebateList(true);
      });

      source.addEventListener('usage:updated', (event) => {
        const payload = parseEventData<UsageUpdatedEventPayload>(event);
        if (!payload) return;

        // Stale stream guard
        if (activeStreamDebateIdRef.current !== targetDebateId) return;

        // Accumulate session totals
        setSessionTotalTokens((prev) => prev + payload.totalTokens);

        const cost = payload.estimatedCostUsd;
        if (cost === null) {
          // Mark that we have unknown cost for this session
          setSessionHasUnknownCost(true);
        } else {
          setSessionTotalCost((prev) => (prev ?? 0) + cost);
        }
      });

      source.onerror = () => {
        // EventSource can fire onerror for transient reconnects or intentional closes.
        // Avoid surfacing this as a hard console error in Next.js dev overlay.
        if (source.readyState === EventSource.CLOSED) return;
        console.warn('SSE stream disconnected, retrying...');
      };
    },
    [closeStream, flushBufferedChunks, refreshDebateList],
  );

  // Load a specific debate by ID with stale-request protection
  const loadDebateById = useCallback(async (id: string) => {
    // Increment counter for stale request protection
    const currentRequestId = ++loadRequestCounterRef.current;
    
    setLoadingDebateId(id);
    
    try {
      // Close existing stream first
      closeStream();
      
      // Fetch debate detail and graph concurrently
      const [detail, graph] = await Promise.all([
        getDebate(id),
        fetchGraph(id),
      ]);
      
      // Stale request check - abort if a newer request came in
      if (currentRequestId !== loadRequestCounterRef.current) {
        return;
      }
      
      // Build agent lane map from detail agents by displayOrder
      const agentLanesMap: Record<string, LaneId> = {};
      const sortedAgents = [...detail.agents].sort((a, b) => a.displayOrder - b.displayOrder);
      const clampedAgentCount = Math.max(MIN_AGENT_COUNT, Math.min(sortedAgents.length, MAX_AGENT_COUNT));
      const activeAgents = sortedAgents.slice(0, clampedAgentCount);
      const personalityByName = new Map(
        personalityOptions.map((personality) => [personality.name, personality.id]),
      );
      const modelFallback = defaultModelKey || modelOptions[0]?.key || FALLBACK_MODEL_KEY;

      activeAgents.forEach((agent, index) => {
        agentLanesMap[agent.id] = `debater-${String.fromCharCode(97 + index)}`;
      });

      // Set agent count based on loaded agents
      setAgentCount(clampedAgentCount);
      setAgentLaneById(agentLanesMap);

      // Build lane settings from loaded agents
      const loadedLaneSettings = buildInitialLaneSettings(clampedAgentCount);
      loadedLaneSettings.orchestrator = {
        modelKey: detail.orchestratorModelKey || laneSettings.orchestrator?.modelKey || modelFallback,
        personalityId: laneSettings.orchestrator?.personalityId ?? '',
      };
      activeAgents.forEach((agent, index) => {
        const laneId = `debater-${String.fromCharCode(97 + index)}`;
        loadedLaneSettings[laneId] = {
          modelKey: agent.modelKey,
          personalityId:
            personalityByName.get(agent.personality.name) ||
            laneSettings[laneId]?.personalityId ||
            '',
        };
      });
      setLaneSettings(loadedLaneSettings);
      
      // Set the debate ID and graph
      setDebateId(detail.id);
      setGraphNodes(graph.nodes);
      setGraphEdges(graph.edges);
      
      // Map status
      const frontendStatus = mapBackendStatusToFrontend(detail.status);
      setStatus(frontendStatus);
      
      // Reset session usage for loaded debate
      resetSessionUsage();
      
      // Open SSE only if debate is running
      if (detail.status === 'running') {
        openSse(detail.id);
      }
    } catch (error) {
      // Stale request check - only show error if this is still the current request
      if (currentRequestId !== loadRequestCounterRef.current) {
        return;
      }
      console.error('Failed to load debate:', error);
      setDebatesError('Failed to load debate');
    } finally {
      // Only clear loading if this is still the current request
      if (currentRequestId === loadRequestCounterRef.current) {
        setLoadingDebateId(null);
      }
    }
  }, [
    closeStream,
    defaultModelKey,
    laneSettings,
    modelOptions,
    openSse,
    personalityOptions,
    resetSessionUsage,
  ]);

  const startNewDebate = useCallback(
    async (goal: string) => {
      let models = modelOptions;
      let personalities = personalityOptions;
      let effectiveDefaultModelKey = defaultModelKey;

      if (models.length === 0 || personalities.length === 0) {
        const hydrated = await hydrateOptions();
        models = hydrated.models;
        effectiveDefaultModelKey = hydrated.defaultModelKey;
        personalities = hydrated.personalities;
      }

      if (models.length === 0 || personalities.length === 0) {
        throw new Error('No models or personalities available from backend');
      }

      const personalityById = new Map(
        personalities.map((personality) => [personality.id, personality]),
      );

      const modelFallback = effectiveDefaultModelKey || models[0]?.key || FALLBACK_MODEL_KEY;
      const orchestratorModelKey = laneSettings.orchestrator?.modelKey || modelFallback;

      const laneAgentInputs = agentLanes.map((laneId, index) => {
        const laneConfig = laneConfigs.find((lane) => lane.id === laneId);
        const laneState = laneSettings[laneId];
        const modelKey =
          laneState?.modelKey ||
          models[index % models.length]?.key ||
          modelFallback;
        const personalityId =
          laneState?.personalityId || findPersonalityIdForLane(laneId, personalities);
        const personality = personalityById.get(personalityId) ?? personalities[0];

        return {
          laneId,
          payload: {
            name: laneConfig?.label ?? `Agent ${index + 1}`,
            modelKey,
            personalityJson: JSON.stringify(personality.personality),
          },
        };
      });

      const created = await createDebate({
        title: deriveTitle(goal),
        goal,
        orchestratorModelKey,
        agents: laneAgentInputs.map((item) => item.payload),
      });

      const nextAgentLaneMap: Record<string, LaneId> = {};
      created.agents.forEach((agent, index) => {
        nextAgentLaneMap[agent.id] = laneAgentInputs[index]?.laneId ?? 'debater-a';
      });

      setAgentLaneById(nextAgentLaneMap);
      setDebateId(created.debateId);
      setGraphNodes([]);
      setGraphEdges([]);
      // Reset session usage tracker for new debate
      resetSessionUsage();

      openSse(created.debateId);
      await refreshGraph(created.debateId);
      await startDebate(created.debateId);
      setStatus('running');
      
      // Refresh debate list after creating new debate
      refreshDebateList(true);
    },
    [
      agentLanes,
      hydrateOptions,
      laneConfigs,
      laneSettings,
      defaultModelKey,
      modelOptions,
      openSse,
      personalityOptions,
      refreshGraph,
      resetSessionUsage,
      refreshDebateList,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      hydrateOptions().catch((error) => {
        console.error('Failed to fetch model/personality options:', error);
      });
      // Fetch debate list on mount
      refreshDebateList().catch((error) => {
        console.error('Failed to fetch debate list:', error);
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hydrateOptions, refreshDebateList]);

  useEffect(() => {
    return () => {
      closeStream();
      activeStreamDebateIdRef.current = null;
    };
  }, [closeStream]);

  const handleNewDebate = useCallback(() => {
    closeStream();
    activeStreamDebateIdRef.current = null;
    setDebateId(null);
    setAgentLaneById({});
    setGraphNodes([]);
    setGraphEdges([]);
    setStatus('idle');
    // Reset session usage tracker
    resetSessionUsage();
  }, [closeStream, resetSessionUsage]);

  const handleLaneSettingsChange = useCallback((laneId: LaneId, settings: LaneSettings) => {
    setLaneSettings((prev) => ({
      ...prev,
      [laneId]: settings,
    }));
  }, []);

  const handleAddAgent = useCallback(() => {
    setAgentCount((prev) => {
      const next = Math.min(prev + 1, MAX_AGENT_COUNT);
      const newLaneId = `debater-${String.fromCharCode(97 + prev)}`;
      setLaneSettings((prevSettings) => ({
        ...prevSettings,
        [newLaneId]: {
          modelKey: defaultModelKey || modelOptions[0]?.key || '',
          personalityId: personalityOptions[0]?.id ?? '',
        },
      }));
      return next;
    });
  }, [defaultModelKey, modelOptions, personalityOptions]);

  const handleRemoveAgent = useCallback((laneId: LaneId) => {
    setAgentCount((prev) => {
      if (prev <= MIN_AGENT_COUNT) return prev;
      const next = prev - 1;
      // Rebuild lane settings without the removed lane, re-keying remaining debaters
      const newAgentLanes = buildAgentLanes(next);
      setLaneSettings((prevSettings) => {
        const oldDebaterLanes = buildAgentLanes(prev);
        const remaining = oldDebaterLanes.filter((id) => id !== laneId);
        const newSettings: Record<LaneId, LaneSettings> = {
          orchestrator: prevSettings.orchestrator ?? { modelKey: '', personalityId: '' },
        };
        remaining.forEach((oldId, i) => {
          const newId = newAgentLanes[i];
          newSettings[newId] = prevSettings[oldId] ?? { modelKey: '', personalityId: '' };
        });
        return newSettings;
      });
      return next;
    });
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || status === 'starting') return;

      try {
        if (!debateId || status === 'idle' || status === 'errored') {
          closeStream();
          setDebateId(null);
          setGraphNodes([]);
          setGraphEdges([]);
          // Reset session usage tracker for new debate
          resetSessionUsage();
          setStatus('starting');
          await startNewDebate(trimmed);
          return;
        }

        if (status === 'completed') {
          setStatus('running');
          const agentOverrides = buildContinueAgentOverrides();
          const modelFallback = defaultModelKey || modelOptions[0]?.key || FALLBACK_MODEL_KEY;
          const orchestratorModelKey = laneSettings.orchestrator?.modelKey || modelFallback;
          await continueDebate(
            debateId,
            trimmed,
            orchestratorModelKey,
            agentOverrides.length > 0 ? agentOverrides : undefined,
          );
          return;
        }

        if (status === 'running') {
          await sendIntervention(debateId, trimmed);
          await refreshGraph(debateId);
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        setStatus('errored');
      }
    },
    [
      buildContinueAgentOverrides,
      closeStream,
      debateId,
      defaultModelKey,
      laneSettings,
      modelOptions,
      refreshGraph,
      resetSessionUsage,
      startNewDebate,
      status,
    ],
  );

  const handleFinalize = useCallback(async () => {
    if (!debateId || status !== 'running') return;

    try {
      await finalizeDebate(debateId);
      // Refresh debate list after finalize
      refreshDebateList(true);
    } catch (error) {
      console.error('Finalize request failed:', error);
      setStatus('errored');
    }
  }, [debateId, status, refreshDebateList]);

  const messages = useMemo<ReasoningMessage[]>(() => {
    return [...graphNodes]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((node) => ({
        id: node.id,
        laneId: resolveLaneForNode(node),
        content: node.content || (node.status === 'streaming' ? 'Streaming...' : ''),
        timestamp: new Date(node.createdAt),
        isUser: node.speakerType === 'user',
        isStreaming: node.status === 'streaming',
      }))
      .filter((message) => message.content.length > 0);
  }, [graphNodes, resolveLaneForNode]);

  return (
    <AppShell
      laneConfigs={laneConfigs}
      laneSettings={laneSettings}
      onLaneSettingsChange={handleLaneSettingsChange}
      onPersonalityGenerated={handlePersonalityGenerated}
      modelOptions={modelOptions}
      personalityOptions={personalityOptions}
      messages={messages}
      graphNodes={graphNodes}
      graphEdges={graphEdges}
      resolveLane={resolveLaneForNode}
      onSendMessage={handleSendMessage}
      status={status}
      onFinalize={handleFinalize}
      onNewDebate={handleNewDebate}
      disableFinalize={!debateId || status !== 'running'}
      onAddAgent={handleAddAgent}
      onRemoveAgent={handleRemoveAgent}
      canAddAgent={agentCount < MAX_AGENT_COUNT}
      canRemoveAgent={agentCount > MIN_AGENT_COUNT}
      showSessionUsageTracker={Boolean(debateId)}
      sessionTotalTokens={sessionTotalTokens}
      sessionTotalCost={sessionTotalCost}
      sessionHasUnknownCost={sessionHasUnknownCost}
      debates={debates}
      debatesLoading={debatesLoading}
      debatesError={debatesError}
      activeDebateId={debateId}
      loadingDebateId={loadingDebateId}
      onSelectDebate={loadDebateById}
    />
  );
}
