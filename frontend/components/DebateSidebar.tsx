'use client';

import {
  MessageSquare,
  HelpCircle,
  Circle,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DebateStatus } from '@/types/ui';
import { DebateListItem } from '@/lib/api';

interface DebateSidebarProps {
  status: DebateStatus;
  onFinalize: () => void;
  onNewDebate: () => void;
  disableFinalize: boolean;
  collapsed: boolean;
  onCollapseToggle: () => void;
  // Debate list props
  debates: DebateListItem[];
  debatesLoading: boolean;
  debatesError: string | null;
  activeDebateId: string | null;
  loadingDebateId: string | null;
  onSelectDebate: (debateId: string) => void;
}

function getDayGroup(dateString: string): 'today' | 'yesterday' | 'older' {
  const date = new Date(dateString);
  const now = new Date();
  
  // Reset to start of day in local timezone
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (itemDate.getTime() === today.getTime()) {
    return 'today';
  } else if (itemDate.getTime() === yesterday.getTime()) {
    return 'yesterday';
  }
  return 'older';
}

function safeTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function getStatusIcon(status: DebateListItem['status']) {
  switch (status) {
    case 'running':
      return <Loader2 className="size-3 animate-spin text-blue-400" />;
    case 'completed':
      return <CheckCircle2 className="size-3 text-green-400" />;
    case 'errored':
      return <AlertCircle className="size-3 text-red-400" />;
    case 'waiting_user':
    case 'draft':
    default:
      return <Circle className="size-3 text-muted-foreground" />;
  }
}

export default function DebateSidebar({
  status,
  onFinalize,
  onNewDebate,
  disableFinalize,
  collapsed,
  onCollapseToggle,
  debates = [],
  debatesLoading = false,
  debatesError = null,
  activeDebateId = null,
  loadingDebateId = null,
  onSelectDebate = () => {},
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

  // Group debates by day
  const groupedDebates = {
    today: [] as DebateListItem[],
    yesterday: [] as DebateListItem[],
    older: [] as DebateListItem[],
  };
  
  debates.forEach((debate) => {
    const group = getDayGroup(debate.updatedAt);
    groupedDebates[group].push(debate);
  });

  // Sort each group by updatedAt desc
  Object.values(groupedDebates).forEach((group) => {
    group.sort((a, b) => safeTimestamp(b.updatedAt) - safeTimestamp(a.updatedAt));
  });

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
                <h1 className="text-sm font-semibold text-foreground">Agent Counsil</h1>
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

      {/* Session Controls */}
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

      <Separator />

      {/* Past Debates */}
      <nav className="flex-1 py-2 overflow-y-auto min-h-0">
        {!collapsed && (
          <div className="px-4 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
              Past Debates
            </span>
          </div>
        )}

        {collapsed ? (
          // Collapsed view - show icon only
          <div className="flex flex-col gap-0.5 px-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="justify-center px-2 text-muted-foreground"
                >
                  <FileText className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Past Debates</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          // Expanded view - show grouped debates
          <div className="flex flex-col gap-0.5 px-2">
            {/* Loading state */}
            {debatesLoading && (
              <div className="px-2 py-3 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-3 animate-spin" />
                <span>Loading debates...</span>
              </div>
            )}

            {/* Error state */}
            {debatesError && (
              <div className="px-2 py-3 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="size-3 mt-0.5 flex-shrink-0" />
                <span>{debatesError}</span>
              </div>
            )}

            {/* Empty state */}
            {!debatesLoading && !debatesError && debates.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No past debates yet
              </div>
            )}

            {/* Debate groups */}
            {!debatesLoading && !debatesError && debates.length > 0 && (
              <>
                {/* Today */}
                {groupedDebates.today.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Today
                    </div>
                    {groupedDebates.today.map((debate) => (
                      <button
                        key={debate.id}
                        onClick={() => onSelectDebate(debate.id)}
                        disabled={loadingDebateId !== null}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                          activeDebateId === debate.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-foreground'
                        } ${loadingDebateId === debate.id ? 'opacity-50' : ''}`}
                      >
                        {loadingDebateId === debate.id ? (
                          <Loader2 className="size-3 animate-spin flex-shrink-0" />
                        ) : (
                          getStatusIcon(debate.status)
                        )}
                        <span className="truncate flex-1">{debate.title || 'Untitled'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Yesterday */}
                {groupedDebates.yesterday.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Yesterday
                    </div>
                    {groupedDebates.yesterday.map((debate) => (
                      <button
                        key={debate.id}
                        onClick={() => onSelectDebate(debate.id)}
                        disabled={loadingDebateId !== null}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                          activeDebateId === debate.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-foreground'
                        } ${loadingDebateId === debate.id ? 'opacity-50' : ''}`}
                      >
                        {loadingDebateId === debate.id ? (
                          <Loader2 className="size-3 animate-spin flex-shrink-0" />
                        ) : (
                          getStatusIcon(debate.status)
                        )}
                        <span className="truncate flex-1">{debate.title || 'Untitled'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Older */}
                {groupedDebates.older.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Older
                    </div>
                    {groupedDebates.older.map((debate) => (
                      <button
                        key={debate.id}
                        onClick={() => onSelectDebate(debate.id)}
                        disabled={loadingDebateId !== null}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                          activeDebateId === debate.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-foreground'
                        } ${loadingDebateId === debate.id ? 'opacity-50' : ''}`}
                      >
                        {loadingDebateId === debate.id ? (
                          <Loader2 className="size-3 animate-spin flex-shrink-0" />
                        ) : (
                          getStatusIcon(debate.status)
                        )}
                        <span className="truncate flex-1">{debate.title || 'Untitled'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </nav>

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
