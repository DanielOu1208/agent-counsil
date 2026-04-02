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
  ChevronLeft,
  ChevronRight,
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
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export default function DebateSidebar({
  status,
  onFinalize,
  onNewDebate,
  disableFinalize,
  collapsed,
  onCollapseToggle,
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
    <aside
      className={`${
        collapsed ? 'w-[60px]' : 'w-60'
      } bg-card flex flex-col border-r border-border transition-all duration-300 ease-in-out`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {!collapsed && (
            <>
              <div className="size-9 flex items-center justify-center bg-muted">
                <MessageSquare className="size-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground">Debate Arena</h1>
                <span className="text-xs text-muted-foreground">v1.0</span>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCollapseToggle}
            className={`${collapsed ? 'mx-auto' : 'ml-auto'}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {!collapsed && (
          <div className="px-4 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
              Navigation
            </span>
          </div>
        )}
        <div className="flex flex-col gap-0.5 px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`${
                  collapsed ? 'justify-center px-2' : 'justify-start gap-3'
                } text-primary w-full`}
              >
                <LayoutDashboard className="size-4" />
                {!collapsed && <span className="text-sm">Dashboard</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Dashboard</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`${
                  collapsed ? 'justify-center px-2' : 'justify-start gap-3'
                } text-muted-foreground w-full`}
              >
                <MessageSquare className="size-4" />
                {!collapsed && <span className="text-sm">Debates</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Debates</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`${
                  collapsed ? 'justify-center px-2' : 'justify-start gap-3'
                } text-muted-foreground w-full`}
              >
                <History className="size-4" />
                {!collapsed && <span className="text-sm">History</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">History</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`${
                  collapsed ? 'justify-center px-2' : 'justify-start gap-3'
                } text-muted-foreground w-full`}
              >
                <Settings className="size-4" />
                {!collapsed && <span className="text-sm">Settings</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>
        </div>
      </nav>

      {/* Session Controls */}
      <Separator />
      <div className="p-3">
        {!collapsed && (
          <div className="mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Session Controls
            </span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onNewDebate}
                disabled={status === 'starting'}
                className={`${
                  collapsed ? 'justify-center px-2' : 'w-full'
                }`}
              >
                <PlusCircle className="size-4" />
                {!collapsed && 'New Debate'}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">New Debate</TooltipContent>}
          </Tooltip>

          {status === 'idle' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled
                  className={`${collapsed ? 'justify-center px-2' : 'w-full'}`}
                >
                  <Play className="size-4" />
                  {!collapsed && 'Send First Prompt'}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Send First Prompt</TooltipContent>}
            </Tooltip>
          )}

          {status === 'starting' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled
                  className={`${collapsed ? 'justify-center px-2' : 'w-full'}`}
                >
                  <Loader2 className="size-4 animate-spin" />
                  {!collapsed && 'Starting Debate'}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Starting Debate</TooltipContent>}
            </Tooltip>
          )}

          {(status === 'running' || status === 'completed' || status === 'errored') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onFinalize}
                  className={`${collapsed ? 'justify-center px-2' : 'w-full'} bg-primary text-primary-foreground`}
                  disabled={disableFinalize}
                >
                  <CheckCircle2 className="size-4" />
                  {!collapsed && 'Finalize'}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Finalize</TooltipContent>}
            </Tooltip>
          )}

          {status === 'completed' && !collapsed && (
            <p className="text-xs text-muted-foreground px-1">
              Debate completed. Send a follow-up to continue, or click New Debate to start fresh.
            </p>
          )}
          {status === 'errored' && !collapsed && (
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
            <Button
              variant="ghost"
              className={`${
                collapsed ? 'justify-center px-2' : 'justify-start gap-3'
              } text-muted-foreground w-full`}
            >
              <HelpCircle className="size-4" />
              {!collapsed && <span className="text-sm">Help</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Help</TooltipContent>}
          {!collapsed && <TooltipContent>Get help and documentation</TooltipContent>}
        </Tooltip>

        {/* Status Indicator */}
        <div className={`flex items-center gap-2 px-2 py-2 mt-1 ${collapsed ? 'justify-center' : ''}`}>
          <Circle className={`size-2.5 ${statusColor[status]} fill-current`} />
          {!collapsed && <span className="text-xs text-muted-foreground">{statusLabel[status]}</span>}
        </div>
      </div>
    </aside>
  );
}
