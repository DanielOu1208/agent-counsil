'use client';

import { LaneId, LaneSettings, ReasoningMessage, LANE_CONFIGS, MODEL_OPTIONS, PERSONALITY_OPTIONS } from '@/types/ui';
import { mockReasoningTexts } from '@/lib/mockData';
import { Circle, User } from 'lucide-react';

interface ReasoningLanesProps {
  messages: ReasoningMessage[];
  laneSettings: Record<LaneId, LaneSettings>;
  selectedLane: LaneId | null;
}

export default function ReasoningLanes({ 
  messages, 
  laneSettings,
  selectedLane 
}: ReasoningLanesProps) {
  return (
    <div className="flex-1 flex gap-2 p-3 min-w-0">
      {LANE_CONFIGS.map((lane) => {
        const isSelected = selectedLane === lane.id;
        const settings = laneSettings[lane.id];
        const laneMessages = messages.filter(m => m.laneId === lane.id);
        const modelLabel = MODEL_OPTIONS.find(m => m.value === settings.model)?.label || settings.model;
        const personalityLabel = PERSONALITY_OPTIONS.find(p => p.value === settings.personality)?.label || settings.personality;
        
        // Determine speaking status based on messages
        const isSpeaking = laneMessages.length > 0 && laneMessages[laneMessages.length - 1]?.isUser !== true;
        
        return (
          <div 
            key={lane.id}
            className={`flex-1 min-w-0 flex flex-col rounded-lg border transition-all ${
              isSelected 
                ? 'bg-[#111116] border-[#89b4fa] shadow-[0_0_16px_rgba(137,180,250,0.15)]' 
                : 'bg-[#111116] border-[#1e1e24]'
            }`}
          >
            {/* Lane Header */}
            <div className="p-3 border-b border-[#1e1e24]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{lane.avatar}</span>
                  <span className="font-medium text-[#d4d4d8] text-sm">{lane.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Circle className={`w-2 h-2 ${isSpeaking ? 'text-green-400 fill-current animate-pulse' : 'text-gray-500'}`} />
                  <span className="text-xs text-gray-500">{isSpeaking ? 'Speaking' : 'Idle'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  {modelLabel}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  {personalityLabel}
                </span>
              </div>
            </div>
            
            {/* Lane Content */}
            <div className="flex-1 p-3 overflow-y-auto">
              {/* Show messages if any */}
              {laneMessages.length > 0 ? (
                <div className="space-y-2">
                  {laneMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`p-2 rounded text-sm ${
                        msg.isUser 
                          ? 'bg-blue-500/20 text-blue-200' 
                          : 'bg-[#1e1e24] text-gray-300'
                      }`}
                    >
                      {msg.isUser && (
                        <div className="flex items-center gap-1 mb-1 text-xs text-blue-400">
                          <User className="w-3 h-3" />
                          <span>You</span>
                        </div>
                      )}
                      {msg.content}
                    </div>
                  ))}
                </div>
              ) : (
                // Show mock reasoning text when no messages
                <div className="text-sm text-gray-400 leading-relaxed">
                  {mockReasoningTexts[lane.id] || 'Waiting for input...'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}