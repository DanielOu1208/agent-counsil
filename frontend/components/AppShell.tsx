'use client';

import { useEffect, useRef, useState } from 'react';
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
  onPersonalityGenerated: (personality: ApiPersonality, targetLaneId: LaneId) => void;
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
  const mainAreaRef = useRef<HTMLDivElement | null>(null);
  const [creatorPosition, setCreatorPosition] = useState({ x: 16, y: 16 });
  const [settingsPosition, setSettingsPosition] = useState({ x: 16, y: 320 });
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [dragState, setDragState] = useState<{
    target: 'creator' | 'settings';
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = mainAreaRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const panelWidth = 240;
      const topMargin = 16;
      const nextX = event.clientX - bounds.left - dragState.offsetX;
      const nextY = event.clientY - bounds.top - dragState.offsetY;

      const nextPosition = {
        x: Math.max(0, Math.min(nextX, bounds.width - panelWidth)),
        y: Math.max(topMargin, Math.min(nextY, bounds.height - topMargin)),
      };

      if (dragState.target === 'creator') {
        setCreatorPosition(nextPosition);
      } else {
        setSettingsPosition(nextPosition);
      }
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState]);

  const startDrag = (
    target: 'creator' | 'settings',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const overlayRect = event.currentTarget.parentElement?.getBoundingClientRect();
    const bounds = mainAreaRef.current?.getBoundingClientRect();
    if (!overlayRect || !bounds) return;

    setDragState({
      target,
      offsetX: event.clientX - overlayRect.left,
      offsetY: event.clientY - overlayRect.top,
    });
  };

  const handleSettingsDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    startDrag('settings', event);
  };

  const handleCreatorDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    startDrag('creator', event);
  };

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
      <div ref={mainAreaRef} className="flex-1 relative min-w-0 overflow-hidden">
        {/* Graph - fills entire main area */}
        <TopGraphStrip
          graphNodes={graphNodes}
          graphEdges={graphEdges}
          resolveLane={resolveLane}
        />

        {/* Fixed personality creator */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${creatorPosition.x}px`,
            top: `${creatorPosition.y}px`,
          }}
        >
          <div className="pointer-events-auto shrink-0">
            <CustomPersonalityCard
              modelOptions={modelOptions}
              onPersonalityGenerated={onPersonalityGenerated}
              onDragStart={handleCreatorDragStart}
              isDragging={dragState?.target === 'creator'}
            />
          </div>
        </div>

        {/* Draggable configuration panel */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${settingsPosition.x}px`,
            top: `${settingsPosition.y}px`,
          }}
        >
          <div
            className={settingsExpanded
              ? 'pointer-events-auto h-[min(520px,calc(100vh-2rem))] min-h-0'
              : 'pointer-events-auto h-auto'}
          >
            <SettingsPanel
              laneSettings={laneSettings}
              onLaneSettingsChange={onLaneSettingsChange}
              modelOptions={modelOptions}
              personalityOptions={personalityOptions}
              onDragStart={handleSettingsDragStart}
              isDragging={dragState?.target === 'settings'}
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
