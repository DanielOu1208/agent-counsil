'use client';

import { useState } from 'react';
import DebateSidebar from './DebateSidebar';
import TopGraphStrip from './TopGraphStrip';
import CustomPersonalityCard from './CustomPersonalityCard';
import SettingsPanel from './SettingsPanel';
import ReasoningLanes from './ReasoningLanes';
import DebateInputBar from './DebateInputBar';
import {
  ApiModel,
  ApiPersonality,
  DebateGraphEdge,
  DebateGraphNode,
  DebateStatus,
  LaneId,
  LaneSettings,
  ReasoningMessage,
} from '@/types/ui';

interface AppShellProps {
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
}

export default function AppShell({
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
}: AppShellProps) {
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

      {/* Main Content Area - Relative container for overlays */}
      <div className="flex-1 relative min-w-0 overflow-hidden">
        {/* Graph - fills entire main area */}
        <TopGraphStrip
          graphNodes={graphNodes}
          graphEdges={graphEdges}
          resolveLane={resolveLane}
        />

        {/* Anchored controls */}
        <div className="absolute left-4 top-4 z-20 pointer-events-none flex flex-col gap-3">
          <div className="pointer-events-auto">
            <CustomPersonalityCard
              modelOptions={modelOptions}
              onPersonalityGenerated={onPersonalityGenerated}
            />
          </div>

          <div
            className={settingsExpanded
              ? 'pointer-events-auto h-[min(520px,calc(100vh-8rem))] min-h-0'
              : 'pointer-events-auto h-auto'}
          >
            <SettingsPanel
              laneSettings={laneSettings}
              onLaneSettingsChange={onLaneSettingsChange}
              modelOptions={modelOptions}
              personalityOptions={personalityOptions}
              isExpanded={settingsExpanded}
              onExpandedChange={setSettingsExpanded}
            />
          </div>
        </div>

        {/* Bottom Container - Streams + Input */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pointer-events-none">
          {/* Reasoning Stream Card */}
          <div className="pointer-events-auto w-full max-w-5xl mb-2 px-4">
            <ReasoningLanes
              messages={messages}
              laneSettings={laneSettings}
              modelOptions={modelOptions}
              personalityOptions={personalityOptions}
            />
          </div>

          {/* Input Card */}
          <div className="pointer-events-auto w-full max-w-2xl mb-4 px-4">
            <DebateInputBar
              onSendMessage={onSendMessage}
              disabled={status === 'starting'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
