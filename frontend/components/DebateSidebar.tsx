'use client';

import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  History,
  HelpCircle,
  Circle,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DebateStatus } from '@/types/ui';

interface DebateSidebarProps {
  status: DebateStatus;
  onFinalize: () => void;
  onNewDebate: () => void;
  disableFinalize: boolean;
}

export default function DebateSidebar({
  status,
  onFinalize,
  onNewDebate,
  disableFinalize,
}: DebateSidebarProps) {
  const statusColor: Record<DebateStatus, string> = {
    idle: 'text-muted-foreground',
    starting: 'text-foreground/70 animate-pulse',
    running: 'text-foreground/70 animate-pulse',
    completed: 'text-muted-foreground',
    errored: 'text-red-400/80',
  };

  const statusLabel: Record<DebateStatus, string> = {
    idle: 'Ready',
    starting: 'Starting',
    running: 'Active',
    completed: 'Done',
    errored: 'Error',
  };

  return (
    <aside className="w-60 bg-card flex flex-col border-r border-border">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-9 flex items-center justify-center bg-muted">
            <MessageSquare className="size-5 text-foreground" />
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
          <Button
            variant="outline"
            onClick={onNewDebate}
            disabled={status === 'starting'}
            className="w-full"
          >
            <PlusCircle className="size-4" />
            New Debate
          </Button>

          {status === 'idle' && (
            <Button disabled className="w-full">
              <Play className="size-4" />
              Send First Prompt
            </Button>
          )}

          {status === 'starting' && (
            <Button disabled className="w-full">
              <Loader2 className="size-4 animate-spin" />
              Starting Debate
            </Button>
          )}

          {(status === 'running' || status === 'completed' || status === 'errored') && (
            <Button
              onClick={onFinalize}
              className="w-full bg-primary text-primary-foreground"
              disabled={disableFinalize}
            >
              <CheckCircle2 className="size-4" />
              Finalize
            </Button>
          )}

          {status === 'completed' && (
            <p className="text-xs text-muted-foreground px-1">
              Debate completed. Send a follow-up to continue, or click New Debate to start fresh.
            </p>
          )}
          {status === 'errored' && (
            <div className="flex items-start gap-2 text-xs text-red-300 px-1">
              <AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
              <span>Run failed. Send a new prompt to try again.</span>
            </div>
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
