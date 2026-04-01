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
  sendIntervention,
  startDebate,
} from '@/lib/api';
import {
  AGENT_LANES,
  ApiModel,
  ApiPersonality,
  DebateGraphNode,
  DebateStatus,
  LaneId,
  LaneSettings,
  LANE_CONFIGS,
  ReasoningMessage,
} from '@/types/ui';

const FALLBACK_MODEL_KEY = 'gemini:gemini-2.5-flash-lite';

const INITIAL_LANE_SETTINGS: Record<LaneId, LaneSettings> = {
  orchestrator: { modelKey: '', personalityId: '' },
  'debater-a': { modelKey: '', personalityId: '' },
  'debater-b': { modelKey: '', personalityId: '' },
  'debater-c': { modelKey: '', personalityId: '' },
};

const PREFERRED_PERSONALITY_NAMES: Record<LaneId, string[]> = {
  orchestrator: ['Synthesizer', 'Strategist'],
  'debater-a': ['Strategist', 'Skeptic'],
  'debater-b': ['Contrarian', 'Skeptic'],
  'debater-c': ['Optimist', 'Synthesizer'],
};

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
  const preferredNames = PREFERRED_PERSONALITY_NAMES[laneId];
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
  const [status, setStatus] = useState<DebateStatus>('idle');
  const [debateId, setDebateId] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<ApiModel[]>([]);
  const [personalityOptions, setPersonalityOptions] = useState<ApiPersonality[]>([]);
  const [laneSettings, setLaneSettings] =
    useState<Record<LaneId, LaneSettings>>(INITIAL_LANE_SETTINGS);
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
  const eventSourceRef = useRef<EventSource | null>(null);

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
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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
    const [models, personalities] = await Promise.all([
      fetchModels(),
      fetchPersonalities(),
    ]);

    setModelOptions(models);
    setPersonalityOptions(personalities);

    const modelFallback = models[0]?.key ?? FALLBACK_MODEL_KEY;

    setLaneSettings((prev) => {
      const next = { ...prev };
      for (const lane of LANE_CONFIGS) {
        const previous = next[lane.id] ?? { modelKey: '', personalityId: '' };
        const modelKey = previous.modelKey || modelFallback;
        const personalityId =
          previous.personalityId || findPersonalityIdForLane(lane.id, personalities);
        next[lane.id] = { modelKey, personalityId };
      }
      return next;
    });

    return { models, personalities };
  }, []);

  const openSse = useCallback(
    (targetDebateId: string) => {
      closeStream();
      const source = new EventSource(`${getApiBaseUrl()}/api/stream/${targetDebateId}/stream`);
      eventSourceRef.current = source;

      source.addEventListener('phase:changed', () => {
        setStatus('running');
      });

      source.addEventListener('node:created', (event) => {
        const payload = parseEventData<CreateEventPayload>(event);
        if (!payload) return;

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

        setGraphNodes((prev) =>
          prev.map((node) =>
            node.id === payload.nodeId
              ? {
                  ...node,
                  content: `${node.content}${payload.chunk}`,
                  status: 'streaming',
                }
              : node,
          ),
        );
      });

      source.addEventListener('node:complete', (event) => {
        const payload = parseEventData<CompleteEventPayload>(event);
        if (!payload) return;

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
        setStatus('completed');
        // No need to refresh - SSE stream already has all nodes/edges
      });

      source.addEventListener('run:error', () => {
        setStatus('errored');
      });

      source.onerror = () => {
        // Keep existing state; reconnecting can be handled with a refresh/new run.
        console.error('SSE stream disconnected');
      };
    },
    [closeStream],
  );

  const startNewDebate = useCallback(
    async (goal: string) => {
      let models = modelOptions;
      let personalities = personalityOptions;

      if (models.length === 0 || personalities.length === 0) {
        const hydrated = await hydrateOptions();
        models = hydrated.models;
        personalities = hydrated.personalities;
      }

      if (models.length === 0 || personalities.length === 0) {
        throw new Error('No models or personalities available from backend');
      }

      const personalityById = new Map(
        personalities.map((personality) => [personality.id, personality]),
      );

      const modelFallback = models[0]?.key ?? FALLBACK_MODEL_KEY;

      const laneAgentInputs = AGENT_LANES.map((laneId, index) => {
        const laneConfig = LANE_CONFIGS.find((lane) => lane.id === laneId);
        const laneState = laneSettings[laneId];
        const modelKey =
          laneState.modelKey ||
          models[index % models.length]?.key ||
          modelFallback;
        const personalityId =
          laneState.personalityId || findPersonalityIdForLane(laneId, personalities);
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

      openSse(created.debateId);
      await refreshGraph(created.debateId);
      await startDebate(created.debateId);
      setStatus('running');
    },
    [
      hydrateOptions,
      laneSettings,
      modelOptions,
      openSse,
      personalityOptions,
      refreshGraph,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      hydrateOptions().catch((error) => {
        console.error('Failed to fetch model/personality options:', error);
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hydrateOptions]);

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, [closeStream]);

  const handleNewDebate = useCallback(() => {
    closeStream();
    setDebateId(null);
    setAgentLaneById({});
    setGraphNodes([]);
    setGraphEdges([]);
    setStatus('idle');
  }, [closeStream]);

  const handleLaneSettingsChange = useCallback((laneId: LaneId, settings: LaneSettings) => {
    setLaneSettings((prev) => ({
      ...prev,
      [laneId]: settings,
    }));
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
          setStatus('starting');
          await startNewDebate(trimmed);
          return;
        }

        if (status === 'completed') {
          setStatus('running');
          await continueDebate(debateId, trimmed);
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
    [closeStream, debateId, refreshGraph, startNewDebate, status],
  );

  const handleFinalize = useCallback(async () => {
    if (!debateId || status !== 'running') return;

    try {
      await finalizeDebate(debateId);
    } catch (error) {
      console.error('Finalize request failed:', error);
      setStatus('errored');
    }
  }, [debateId, status]);

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
      laneSettings={laneSettings}
      onLaneSettingsChange={handleLaneSettingsChange}
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
    />
  );
}
