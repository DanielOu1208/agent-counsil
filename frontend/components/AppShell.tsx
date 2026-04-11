'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DebateSidebar from './DebateSidebar';
import TopGraphStrip from './TopGraphStrip';
import DebateInputBar from './DebateInputBar';
import BottomTabbedWorkspace from './BottomTabbedWorkspace';
import {
  activatePane,
  activateTab,
  buildNodeTabId,
  closeTabInPane,
  createDefaultNodeDetailsLayout,
  getSplitPaneBlockReason,
  LAYOUT_STORAGE_WRITE_DEBOUNCE_MS,
  moveTabToPane,
  openNodeTabInActivePane,
  parseLayoutFromStorage,
  parseNodeIdFromTabId,
  reorderTabInPane,
  sanitizeNodeDetailsLayout,
  serializeLayoutForStorage,
  splitPaneWithTab,
} from '@/lib/nodeDetailsLayout';
import {
  ApiModel,
  ApiPersonality,
  DEFAULT_WORKSPACE_TAB_ID,
  DebateGraphEdge,
  DebateGraphNode,
  DebateStatus,
  LaneConfig,
  LaneId,
  LaneSettings,
  ReasoningMessage,
  WorkspaceFixedTabId,
  WorkspaceNodeDetails,
  WorkspaceNodeTab,
  WorkspaceSplitEdge,
  WORKSPACE_FIXED_TABS,
} from '@/types/ui';
import { DebateListItem } from '@/lib/api';
import { getNodeTitle } from '@/lib/graphNodeHelpers';

// Helper to format large numbers with commas
function formatNumber(n: number): string {
  return n.toLocaleString();
}

// Helper to format cost
function formatCost(cost: number | null, hasUnknown: boolean): string {
  if (hasUnknown) return '—';
  if (cost === null) return '$0.00';
  return `$${cost.toFixed(4)}`;
}

const SESSION_SCOPE_ID_KEY = 'workspace:node-details-layout:session-id';

interface AppShellProps {
  laneConfigs: LaneConfig[];
  laneSettings: Record<LaneId, LaneSettings>;
  onLaneSettingsChange: (laneId: LaneId, settings: LaneSettings) => void;
  onPersonalityGenerated: (personality: ApiPersonality) => void;
  modelOptions: ApiModel[];
  personalityOptions: ApiPersonality[];
  messages: ReasoningMessage[];
  graphNodes: DebateGraphNode[];
  graphEdges: DebateGraphEdge[];
  resolveLane: (node: DebateGraphNode) => LaneId;
  onSendMessage: (content: string) => void;
  status: DebateStatus;
  onFinalize: () => void;
  onNewDebate: () => void;
  disableFinalize: boolean;
  onAddAgent: () => void;
  onRemoveAgent: (laneId: LaneId) => void;
  canAddAgent: boolean;
  canRemoveAgent: boolean;
  showSessionUsageTracker: boolean;
  sessionTotalTokens: number;
  sessionTotalCost: number | null;
  sessionHasUnknownCost: boolean;
  // Debate list props for sidebar
  debates: DebateListItem[];
  debatesLoading: boolean;
  debatesError: string | null;
  activeDebateId: string | null;
  loadingDebateId: string | null;
  onSelectDebate: (debateId: string) => void;
}

export default function AppShell({
  laneConfigs,
  laneSettings,
  onLaneSettingsChange,
  onPersonalityGenerated,
  modelOptions,
  personalityOptions,
  messages,
  graphNodes,
  graphEdges,
  resolveLane,
  onSendMessage,
  status,
  onFinalize,
  onNewDebate,
  disableFinalize,
  onAddAgent,
  onRemoveAgent,
  canAddAgent,
  canRemoveAgent,
  showSessionUsageTracker,
  sessionTotalTokens,
  sessionTotalCost,
  sessionHasUnknownCost,
  debates,
  debatesLoading,
  debatesError,
  activeDebateId,
  loadingDebateId,
  onSelectDebate,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leftActiveTabId, setLeftActiveTabId] = useState<WorkspaceFixedTabId>(DEFAULT_WORKSPACE_TAB_ID);
  const [rightLayout, setRightLayout] = useState(() => createDefaultNodeDetailsLayout());
  const [rightPaneNotice, setRightPaneNotice] = useState<string | null>(null);
  const lanePersonalityNameById = useMemo(() => {
    const personalityNameById = new Map(
      personalityOptions.map((personality) => [personality.id, personality.name]),
    );
    const result: Record<LaneId, string> = {};
    for (const lane of laneConfigs) {
      const personalityId = laneSettings[lane.id]?.personalityId;
      result[lane.id] =
        (personalityId ? personalityNameById.get(personalityId) : undefined) ?? 'No personality';
    }
    return result;
  }, [laneConfigs, laneSettings, personalityOptions]);
  const [sessionScopeId] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return 'server-session';
    }

    const existing = window.sessionStorage.getItem(SESSION_SCOPE_ID_KEY);
    if (existing) return existing;

    const nextSessionId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    window.sessionStorage.setItem(SESSION_SCOPE_ID_KEY, nextSessionId);
    return nextSessionId;
  });

  const hasHydratedScopeRef = useRef(false);
  const layoutScopeTokenRef = useRef(0);

  useEffect(() => {
    if (!rightPaneNotice) return;
    const timeoutId = window.setTimeout(() => {
      setRightPaneNotice(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [rightPaneNotice]);

  const layoutStorageKey = useMemo(() => {
    if (activeDebateId) return `workspace:node-details-layout:v2:debate:${activeDebateId}`;
    if (sessionScopeId) return `workspace:node-details-layout:v2:session:${sessionScopeId}`;
    return null;
  }, [activeDebateId, sessionScopeId]);

  const graphNodeIdSet = useMemo(() => new Set(graphNodes.map((node) => node.id)), [graphNodes]);

  const graphDerivedNodeDetailsByTabId = useMemo(() => {
    const detailsByTabId: Record<string, WorkspaceNodeDetails> = {};

    for (const node of graphNodes) {
      const tabId = buildNodeTabId(node.id);
      const laneId = resolveLane(node);
      const lane = laneConfigs.find((config) => config.id === laneId)?.label ?? 'Unknown';

      detailsByTabId[tabId] = {
        title: getNodeTitle(node.nodeType, node.speakerType),
        lane,
        content: node.content || (node.status === 'streaming' ? 'Streaming...' : 'No content'),
      };
    }

    return detailsByTabId;
  }, [graphNodes, laneConfigs, resolveLane]);

  const rightTabsById = useMemo(() => {
    const tabsById: Record<string, WorkspaceNodeTab> = {};

    for (const pane of rightLayout.panes) {
      for (const tabId of pane.tabIds) {
        const nodeId = parseNodeIdFromTabId(tabId);
        if (!nodeId) continue;
        if (tabsById[tabId]) continue;

        tabsById[tabId] = {
          id: tabId,
          kind: 'node',
          title: graphDerivedNodeDetailsByTabId[tabId]?.title ?? `Node ${nodeId.slice(0, 8)}`,
          nodeId,
          closable: true,
        };
      }
    }

    return tabsById;
  }, [graphDerivedNodeDetailsByTabId, rightLayout.panes]);

  const graphReadyForReconciliation = status !== 'starting';

  useEffect(() => {
    if (!layoutStorageKey) return;
    if (typeof window === 'undefined') return;

    layoutScopeTokenRef.current += 1;
    const scopeToken = layoutScopeTokenRef.current;
    hasHydratedScopeRef.current = false;

    let hydrated = createDefaultNodeDetailsLayout();
    try {
      const persistedRaw = window.localStorage.getItem(layoutStorageKey);
      if (persistedRaw) {
        const parsed = parseLayoutFromStorage(persistedRaw);
        hydrated = sanitizeNodeDetailsLayout(parsed, {
          pruneMissingNodeTabs: false,
        });
      }
    } catch {
      hydrated = createDefaultNodeDetailsLayout();
    }

    const hydrationTimeoutId = window.setTimeout(() => {
      if (scopeToken !== layoutScopeTokenRef.current) return;
      setRightLayout(hydrated);
      hasHydratedScopeRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(hydrationTimeoutId);
    };
  }, [layoutStorageKey]);

  useEffect(() => {
    if (!layoutStorageKey) return;
    if (!graphReadyForReconciliation) return;

    const scopeToken = layoutScopeTokenRef.current;
    setRightLayout((prev) => {
      if (scopeToken !== layoutScopeTokenRef.current) return prev;
      return sanitizeNodeDetailsLayout(prev, {
        validNodeIds: graphNodeIdSet,
        pruneMissingNodeTabs: true,
      });
    });
  }, [graphNodeIdSet, graphReadyForReconciliation, layoutStorageKey]);

  useEffect(() => {
    if (!layoutStorageKey) return;
    if (typeof window === 'undefined') return;
    if (!hasHydratedScopeRef.current) return;

    const scopeToken = layoutScopeTokenRef.current;
    const timeoutId = window.setTimeout(() => {
      if (scopeToken !== layoutScopeTokenRef.current) return;

      const serialized = serializeLayoutForStorage(rightLayout);
      if (!serialized) return;

      try {
        window.localStorage.setItem(layoutStorageKey, serialized);
      } catch {
        // Fail-soft: ignore storage errors/quota issues.
      }
    }, LAYOUT_STORAGE_WRITE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [layoutStorageKey, rightLayout]);

  useEffect(() => {
    if (!layoutStorageKey) return;
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== layoutStorageKey) return;
      if (!event.newValue) return;

      const parsed = parseLayoutFromStorage(event.newValue);
      if (!parsed) return;

      setRightLayout(
        sanitizeNodeDetailsLayout(parsed, {
          validNodeIds: graphReadyForReconciliation ? graphNodeIdSet : undefined,
          pruneMissingNodeTabs: graphReadyForReconciliation,
        }),
      );
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [graphNodeIdSet, graphReadyForReconciliation, layoutStorageKey]);

  const openNodeIds = useMemo(() => {
    const openIds = new Set<string>();

    for (const pane of rightLayout.panes) {
      for (const tabId of pane.tabIds) {
        const nodeId = parseNodeIdFromTabId(tabId);
        if (!nodeId) continue;
        if (!graphNodeIdSet.has(nodeId)) continue;
        openIds.add(nodeId);
      }
    }

    return openIds;
  }, [graphNodeIdSet, rightLayout.panes]);

  const handleOpenNodeTab = useCallback((nodeId: string) => {
    const tabId = buildNodeTabId(nodeId);
    setRightLayout((prev) => openNodeTabInActivePane(prev, tabId));
  }, []);

  const handleActivateRightPane = useCallback((paneId: string) => {
    setRightLayout((prev) => activatePane(prev, paneId));
  }, []);

  const handleActivateRightTab = useCallback((paneId: string, tabId: string) => {
    setRightLayout((prev) => activateTab(prev, paneId, tabId));
  }, []);

  const handleCloseRightTab = useCallback((paneId: string, tabId: string) => {
    setRightLayout((prev) => closeTabInPane(prev, paneId, tabId));
  }, []);

  const handleSplitRightTab = useCallback((targetPaneId: string, edge: WorkspaceSplitEdge, tabId: string) => {
    setRightLayout((prev) => {
      const next = splitPaneWithTab(prev, {
        targetPaneId,
        edge,
        draggedTabId: tabId,
      });

      return next ?? prev;
    });
  }, []);

  const handleSplitActivePaneRight = useCallback(() => {
    setRightLayout((prev) => {
      const activePane = prev.panes.find((pane) => pane.id === prev.activePaneId);
      if (!activePane) {
        setRightPaneNotice('No active pane available to split.');
        return prev;
      }

      const splitTabId = activePane.activeTabId ?? activePane.tabIds[activePane.tabIds.length - 1];
      if (!splitTabId) {
        setRightPaneNotice('Open a node tab first, then split the pane.');
        return prev;
      }

      const splitBlockReason = getSplitPaneBlockReason(prev, {
        targetPaneId: activePane.id,
        draggedTabId: splitTabId,
      });
      if (splitBlockReason) {
        setRightPaneNotice(splitBlockReason);
        return prev;
      }

      const next = splitPaneWithTab(prev, {
        targetPaneId: activePane.id,
        edge: 'right',
        draggedTabId: splitTabId,
      });

      if (!next) {
        setRightPaneNotice('Could not split pane right now. Please try again.');
        return prev;
      }

      setRightPaneNotice(null);

      return next;
    });
  }, []);

  const handleFocusRightPaneByIndex = useCallback((index: number) => {
    setRightLayout((prev) => {
      const targetPane = prev.panes[index];
      if (!targetPane) return prev;
      return activatePane(prev, targetPane.id);
    });
  }, []);

  const handleMoveRightTabToPane = useCallback(
    (tabId: string, fromPaneId: string, toPaneId: string, toIndex?: number) => {
      setRightLayout((prev) => moveTabToPane(prev, { tabId, fromPaneId, toPaneId, toIndex }));
    },
    [],
  );

  const handleReorderRightTabInPane = useCallback((paneId: string, fromIndex: number, toIndex: number) => {
    setRightLayout((prev) => reorderTabInPane(prev, { paneId, fromIndex, toIndex }));
  }, []);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Left Sidebar */}
      <DebateSidebar
        status={status}
        onFinalize={onFinalize}
        onNewDebate={onNewDebate}
        disableFinalize={disableFinalize}
        collapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        debates={debates}
        debatesLoading={debatesLoading}
        debatesError={debatesError}
        activeDebateId={activeDebateId}
        loadingDebateId={loadingDebateId}
        onSelectDebate={onSelectDebate}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <TopGraphStrip
            graphNodes={graphNodes}
            graphEdges={graphEdges}
            resolveLane={resolveLane}
            laneConfigs={laneConfigs}
            lanePersonalityNameById={lanePersonalityNameById}
            openNodeIds={openNodeIds}
            onOpenNodeTab={handleOpenNodeTab}
          />
          
          {/* Session usage tracker - bottom-left overlay */}
          {showSessionUsageTracker && (
            <div className="absolute bottom-2 left-2 z-10 flex items-baseline gap-3 rounded-none border border-border bg-card px-3 py-2 text-xs">
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground">Tokens</span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatNumber(sessionTotalTokens)}
                </span>
              </div>
              <div className="h-3 w-px shrink-0 bg-border" aria-hidden />
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatCost(sessionTotalCost, sessionHasUnknownCost)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 z-20 px-4"
          style={{ bottom: 'calc(50% + 0.75rem)' }}
        >
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            <DebateInputBar
              onSendMessage={onSendMessage}
              disabled={status === 'starting'}
            />
          </div>
        </div>

        <div className="h-1/2 min-h-[260px]">
          <BottomTabbedWorkspace
            leftTabs={WORKSPACE_FIXED_TABS}
            leftActiveTabId={leftActiveTabId}
            onLeftTabChange={setLeftActiveTabId}
            rightLayout={rightLayout}
            rightTabsById={rightTabsById}
            onActivateRightPane={handleActivateRightPane}
            onActivateRightTab={handleActivateRightTab}
            onCloseRightTab={handleCloseRightTab}
            onSplitRightTab={handleSplitRightTab}
            onSplitActivePaneRight={handleSplitActivePaneRight}
            onFocusRightPaneByIndex={handleFocusRightPaneByIndex}
            rightPaneNotice={rightPaneNotice}
            onMoveRightTabToPane={handleMoveRightTabToPane}
            onReorderRightTabInPane={handleReorderRightTabInPane}
            laneConfigs={laneConfigs}
            laneSettings={laneSettings}
            onLaneSettingsChange={onLaneSettingsChange}
            onPersonalityGenerated={onPersonalityGenerated}
            modelOptions={modelOptions}
            personalityOptions={personalityOptions}
            messages={messages}
            onAddAgent={onAddAgent}
            onRemoveAgent={onRemoveAgent}
            canAddAgent={canAddAgent}
            canRemoveAgent={canRemoveAgent}
            nodeDetailsById={graphDerivedNodeDetailsByTabId}
          />
        </div>
      </div>
    </div>
  );
}
