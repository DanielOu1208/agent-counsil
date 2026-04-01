'use client';

import { LaneId, LaneSettings, LANE_CONFIGS, MODEL_OPTIONS, PERSONALITY_OPTIONS } from '@/types/ui';

interface SettingsPanelProps {
  laneSettings: Record<LaneId, LaneSettings>;
  onLaneSettingsChange: (laneId: LaneId, settings: LaneSettings) => void;
  selectedLane: LaneId | null;
}

export default function SettingsPanel({ 
  laneSettings, 
  onLaneSettingsChange,
  selectedLane 
}: SettingsPanelProps) {
  return (
    <div className="w-72 bg-[#0a0a0e] border-r border-[#1e1e24] overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1e1e24] bg-[#0a0a0e] sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-purple-500 rounded-full" />
          <h2 className="text-sm font-semibold text-[#d4d4d8] uppercase tracking-wider">
            Lane Configuration
          </h2>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-3">Customize each debate lane</p>
      </div>
      
      {/* Settings Content */}
      <div className="flex-1 p-3 space-y-4">
        {LANE_CONFIGS.map((lane) => {
          const isSelected = selectedLane === lane.id;
          const settings = laneSettings[lane.id];
          
          return (
            <div 
              key={lane.id}
              className={`p-3 rounded-lg border transition-all ${
                isSelected 
                  ? 'bg-[#111116] border-[#89b4fa] shadow-[0_0_12px_rgba(137,180,250,0.2)]' 
                  : 'bg-[#111116] border-[#1e1e24]'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{lane.avatar}</span>
                <div>
                  <h3 className="text-sm font-medium text-[#d4d4d8]">{lane.label}</h3>
                  <p className="text-xs text-gray-500">{lane.role}</p>
                </div>
              </div>
              
              {/* Model Dropdown */}
              <div className="mb-2">
                <label className="block text-xs text-gray-500 mb-1">Model</label>
                <select
                  value={settings.model}
                  onChange={(e) => onLaneSettingsChange(lane.id, { 
                    ...settings, 
                    model: e.target.value as LaneSettings['model'] 
                  })}
                  className="w-full bg-[#1e1e24] border border-[#2a2a34] rounded-md px-2 py-1.5 text-sm text-[#d4d4d8] focus:outline-none focus:border-[#89b4fa]"
                >
                  {MODEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Personality Dropdown */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Personality</label>
                <select
                  value={settings.personality}
                  onChange={(e) => onLaneSettingsChange(lane.id, { 
                    ...settings, 
                    personality: e.target.value as LaneSettings['personality'] 
                  })}
                  className="w-full bg-[#1e1e24] border border-[#2a2a34] rounded-md px-2 py-1.5 text-sm text-[#d4d4d8] focus:outline-none focus:border-[#89b4fa]"
                >
                  {PERSONALITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}