'use client';

import DebateSidebar from './DebateSidebar';
import TopGraphStrip from './TopGraphStrip';
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
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Left Sidebar */}
      <DebateSidebar
        status={status}
        onFinalize={onFinalize}
        onNewDebate={onNewDebate}
        disableFinalize={disableFinalize}
      />

      {/* Main Content Area - Relative container for overlays */}
      <div className="flex-1 relative min-w-0 overflow-hidden">
        {/* Graph - fills entire main area */}
        <TopGraphStrip
          graphNodes={graphNodes}
          graphEdges={graphEdges}
          resolveLane={resolveLane}
        />

        {/* Settings Overlay - fixed top-left */}
        <div className="absolute top-4 left-4 z-20">
          <SettingsPanel
            laneSettings={laneSettings}
            onLaneSettingsChange={onLaneSettingsChange}
            modelOptions={modelOptions}
            personalityOptions={personalityOptions}
          />
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
