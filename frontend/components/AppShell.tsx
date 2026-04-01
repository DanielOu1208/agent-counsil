'use client';

import DebateSidebar from './DebateSidebar';
import TopGraphStrip from './TopGraphStrip';
import SettingsPanel from './SettingsPanel';
import ReasoningLanes from './ReasoningLanes';
import DebateInputBar from './DebateInputBar';
import { LaneId, LaneSettings, ReasoningMessage, DebateStatus } from '@/types/ui';
import { getLaneForNode } from '@/lib/nodeLaneMap';

interface AppShellProps {
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  laneSettings: Record<LaneId, LaneSettings>;
  onLaneSettingsChange: (laneId: LaneId, settings: LaneSettings) => void;
  messages: ReasoningMessage[];
  onSendMessage: (content: string) => void;
  status: DebateStatus;
  onStatusChange: (status: DebateStatus) => void;
}

export default function AppShell({
  selectedNode,
  onNodeSelect,
  laneSettings,
  onLaneSettingsChange,
  messages,
  onSendMessage,
  status,
  onStatusChange,
}: AppShellProps) {
  const selectedLane = selectedNode ? getLaneForNode(selectedNode) : null;
  
  return (
    <div className="flex h-screen w-full bg-[#0c0c0f] text-[#d4d4d8] overflow-hidden">
      {/* Left Sidebar */}
      <DebateSidebar status={status} onStatusChange={onStatusChange} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Graph Strip */}
        <TopGraphStrip selectedNode={selectedNode} onNodeSelect={onNodeSelect} />
        
        {/* Lower Row: Settings + Lanes */}
        <div className="flex-1 flex min-h-0 border-t border-[#1e1e24]">
          {/* Settings Panel */}
          <SettingsPanel 
            laneSettings={laneSettings} 
            onLaneSettingsChange={onLaneSettingsChange}
            selectedLane={selectedLane}
          />
          
          {/* Reasoning Lanes */}
          <ReasoningLanes 
            messages={messages}
            laneSettings={laneSettings}
            selectedLane={selectedLane}
          />
        </div>
        
        {/* Bottom Input Bar */}
        <DebateInputBar onSendMessage={onSendMessage} disabled={status === 'completed'} />
      </div>
    </div>
  );
}