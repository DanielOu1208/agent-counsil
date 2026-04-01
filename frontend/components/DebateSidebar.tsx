'use client';

import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  History, 
  HelpCircle,
  Circle,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { DebateStatus } from '@/types/ui';

interface DebateSidebarProps {
  status: DebateStatus;
  onStatusChange: (status: DebateStatus) => void;
}

export default function DebateSidebar({ status, onStatusChange }: DebateSidebarProps) {
  const statusColor = {
    idle: 'text-gray-400',
    running: 'text-green-400 animate-pulse',
    paused: 'text-yellow-400',
    completed: 'text-blue-400',
  }[status];

  const statusLabel = {
    idle: 'Ready',
    running: 'Active',
    paused: 'Paused',
    completed: 'Done',
  }[status];

  const handleStart = () => {
    onStatusChange('running');
  };

  const handlePause = () => {
    onStatusChange('paused');
  };

  const handleIntervene = () => {
    alert('Intervention triggered! This would pause for user input in a real implementation.');
  };

  const handleFinalize = () => {
    onStatusChange('completed');
  };

  return (
    <aside className="w-60 bg-[#111116] flex flex-col border-r border-[#1e1e24]">
      {/* Header */}
      <div className="p-4 border-b border-[#1e1e24]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#d4d4d8]">Debate Arena</h1>
            <span className="text-xs text-gray-500">v1.0</span>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4">
        <div className="px-3 mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2">Navigation</span>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-purple-400 bg-[#1e1e24]/50 hover:bg-[#1e1e24] transition-colors">
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-[#1e1e24]/50 transition-colors">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">Debates</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-[#1e1e24]/50 transition-colors">
          <History className="w-4 h-4" />
          <span className="text-sm">History</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-[#1e1e24]/50 transition-colors">
          <Settings className="w-4 h-4" />
          <span className="text-sm">Settings</span>
        </button>
      </nav>

      {/* Session Controls Section */}
      <div className="border-t border-[#1e1e24] p-3">
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1">Session Controls</span>
        </div>
        <div className="space-y-2">
          {status === 'idle' && (
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
          
          {status === 'running' && (
            <>
              <button
                onClick={handlePause}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
              <button
                onClick={handleIntervene}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Intervene
              </button>
            </>
          )}
          
          {status === 'paused' && (
            <>
              <button
                onClick={handleStart}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
              <button
                onClick={handleIntervene}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Intervene
              </button>
            </>
          )}
          
          {(status === 'running' || status === 'paused') && (
            <button
              onClick={handleFinalize}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalize
            </button>
          )}
          
          {status === 'completed' && (
            <div className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t border-[#1e1e24] p-3">
        <button className="w-full flex items-center gap-3 px-2 py-2 text-gray-400 hover:text-gray-200 hover:bg-[#1e1e24]/50 rounded-lg transition-colors">
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm">Help</span>
        </button>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-2 py-2 mt-1">
          <Circle className={`w-2.5 h-2.5 ${statusColor} fill-current`} />
          <span className="text-xs text-gray-500">{statusLabel}</span>
        </div>
      </div>
    </aside>
  );
}