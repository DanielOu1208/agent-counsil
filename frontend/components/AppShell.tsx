'use client';

import { useCallback, useMemo, useState } from 'react';
import DebateSidebar from './DebateSidebar';
import TopGraphStrip from './TopGraphStrip';
import DebateInputBar from './DebateInputBar';
import BottomTabbedWorkspace from './BottomTabbedWorkspace';
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
  WORKSPACE_FIXED_TABS,
} from '@/types/ui';

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
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leftActiveTabId, setLeftActiveTabId] = useState<WorkspaceFixedTabId>(DEFAULT_WORKSPACE_TAB_ID);
  const [rightTabs, setRightTabs] = useState<WorkspaceNodeTab[]>([]);
  const [rightActiveTabId, setRightActiveTabId] = useState<string | null>(null);
  const [nodeDetailsByTabId, setNodeDetailsByTabId] = useState<Record<string, WorkspaceNodeDetails>>({});

  const graphNodeIdSet = useMemo(() => new Set(graphNodes.map((node) => node.id)), [graphNodes]);

  const visibleRightTabs = useMemo(() => {
    return rightTabs.filter((tab) => graphNodeIdSet.has(tab.nodeId));
  }, [graphNodeIdSet, rightTabs]);

  const resolvedRightActiveTabId = useMemo(() => {
    if (!rightActiveTabId) return null;
    return visibleRightTabs.some((tab) => tab.id === rightActiveTabId)
      ? rightActiveTabId
      : null;
  }, [rightActiveTabId, visibleRightTabs]);

  const openNodeIds = useMemo(() => {
    return new Set(
      visibleRightTabs.map((tab) => tab.nodeId),
    );
  }, [visibleRightTabs]);

  const handleOpenNodeTab = useCallback((nodeId: string, details: WorkspaceNodeDetails) => {
    const tabId = `node:${nodeId}`;

    setNodeDetailsByTabId((prev) => ({
      ...prev,
      [tabId]: details,
    }));

    setRightTabs((prev) => {
      if (prev.some((tab) => tab.id === tabId)) {
        return prev;
      }

      return [
        ...prev,
        {
          id: tabId,
          kind: 'node',
          title: details.title,
          nodeId,
          closable: true,
        },
      ];
    });

    setRightActiveTabId(tabId);
  }, []);

  const handleCloseNodeTab = useCallback((tabId: string) => {
    setRightTabs((prev) => {
      const closeIndex = prev.findIndex((tab) => tab.id === tabId);
      if (closeIndex === -1) return prev;

      const next = prev.filter((tab) => tab.id !== tabId);

      if (resolvedRightActiveTabId === tabId) {
        const leftNeighbor = prev[closeIndex - 1];
        setRightActiveTabId(leftNeighbor?.id ?? null);
      }

      return next;
    });

    setNodeDetailsByTabId((prev) => {
      if (!(tabId in prev)) return prev;
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
  }, [resolvedRightActiveTabId]);

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
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <TopGraphStrip
            graphNodes={graphNodes}
            graphEdges={graphEdges}
            resolveLane={resolveLane}
            laneConfigs={laneConfigs}
            openNodeIds={openNodeIds}
            onOpenNodeTab={handleOpenNodeTab}
          />
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
            rightTabs={visibleRightTabs}
            rightActiveTabId={resolvedRightActiveTabId}
            onRightTabChange={setRightActiveTabId}
            onCloseNodeTab={handleCloseNodeTab}
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
            nodeDetailsById={nodeDetailsByTabId}
          />
        </div>
      </div>
    </div>
  );
}
