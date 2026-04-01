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
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DebateStatus } from '@/types/ui';

interface DebateSidebarProps {
  status: DebateStatus;
  onStatusChange: (status: DebateStatus) => void;
}

export default function DebateSidebar({ status, onStatusChange }: DebateSidebarProps) {
  const statusColor: Record<DebateStatus, string> = {
    idle: 'text-muted-foreground',
    running: 'text-green-400 animate-pulse',
    paused: 'text-yellow-400',
    completed: 'text-primary',
  };

  const statusLabel: Record<DebateStatus, string> = {
    idle: 'Ready',
    running: 'Active',
    paused: 'Paused',
    completed: 'Done',
  };

  const handleStart = () => onStatusChange('running');
  const handlePause = () => onStatusChange('paused');
  const handleIntervene = () => {
    alert('Intervention triggered! This would pause for user input in a real implementation.');
  };
  const handleFinalize = () => onStatusChange('completed');

  return (
    <aside className="w-60 bg-card flex flex-col border-r border-border">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-9 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
            <MessageSquare className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Debate Arena</h1>
            <span className="text-xs text-muted-foreground">v1.0</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <div className="px-4 mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
            Navigation
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-2">
          <Button variant="ghost" className="w-full justify-start gap-3 text-primary">
            <LayoutDashboard className="size-4" />
            <span className="text-sm">Dashboard</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <MessageSquare className="size-4" />
            <span className="text-sm">Debates</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <History className="size-4" />
            <span className="text-sm">History</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <Settings className="size-4" />
            <span className="text-sm">Settings</span>
          </Button>
        </div>
      </nav>

      {/* Session Controls */}
      <Separator />
      <div className="p-3">
        <div className="mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Session Controls
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {status === 'idle' && (
            <Button
              onClick={handleStart}
              className="w-full bg-green-600 hover:bg-green-500 text-white"
            >
              <Play className="size-4" />
              Start
            </Button>
          )}

          {status === 'running' && (
            <>
              <Button
                onClick={handlePause}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white"
              >
                <Pause className="size-4" />
                Pause
              </Button>
              <Button
                onClick={handleIntervene}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white"
              >
                <AlertTriangle className="size-4" />
                Intervene
              </Button>
            </>
          )}

          {status === 'paused' && (
            <>
              <Button
                onClick={handleStart}
                className="w-full bg-green-600 hover:bg-green-500 text-white"
              >
                <Play className="size-4" />
                Resume
              </Button>
              <Button
                onClick={handleIntervene}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white"
              >
                <AlertTriangle className="size-4" />
                Intervene
              </Button>
            </>
          )}

          {(status === 'running' || status === 'paused') && (
            <Button
              onClick={handleFinalize}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            >
              <CheckCircle2 className="size-4" />
              Finalize
            </Button>
          )}

          {status === 'completed' && (
            <Button disabled className="w-full">
              <CheckCircle2 className="size-4" />
              Completed
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <Separator />
      <div className="p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <HelpCircle className="size-4" />
              <span className="text-sm">Help</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Get help and documentation</TooltipContent>
        </Tooltip>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-2 py-2 mt-1">
          <Circle className={`size-2.5 ${statusColor[status]} fill-current`} />
          <span className="text-xs text-muted-foreground">{statusLabel[status]}</span>
        </div>
      </div>
    </aside>
  );
}
