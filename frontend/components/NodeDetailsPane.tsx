'use client';

import { KeyboardEvent, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NodeDetailsTabPanel from './NodeDetailsTabPanel';
import { cn } from '@/lib/utils';
import {
  WorkspaceNodeDetails,
  WorkspaceNodeTab,
  WorkspaceRightPane,
  WorkspaceSplitEdge,
} from '@/types/ui';

interface NodeDetailsPaneProps {
  pane: WorkspaceRightPane;
  paneIndex: number;
  paneCount: number;
  isActivePane: boolean;
  tabs: WorkspaceNodeTab[];
  detailsByTabId: Record<string, WorkspaceNodeDetails>;
  draggingTabId: string | null;
  hoveredDropEdge: WorkspaceSplitEdge | null;
  hoveredMergeZone: boolean;
  canSplit: boolean;
  onActivatePane: (paneId: string) => void;
  onActivateTab: (paneId: string, tabId: string) => void;
  onCloseTab: (paneId: string, tabId: string) => void;
  onBeginTabDrag: (params: {
    paneId: string;
    tabId: string;
    tabIndex: number;
    pointerId: number;
    startX: number;
    startY: number;
  }) => void;
}

export default function NodeDetailsPane({
  pane,
  paneIndex,
  paneCount,
  isActivePane,
  tabs,
  detailsByTabId,
  draggingTabId,
  hoveredDropEdge,
  hoveredMergeZone,
  canSplit,
  onActivatePane,
  onActivateTab,
  onCloseTab,
  onBeginTabDrag,
}: NodeDetailsPaneProps) {
  const activeTabId = pane.activeTabId;
  const activeDetails = activeTabId ? detailsByTabId[activeTabId] : undefined;

  // Show drag overlays when dragging (for merge cues), edge highlights only when canSplit
  const hasDraggableContext = Boolean(draggingTabId);
  const canRenderDropTargets = hasDraggableContext;
  const canShowSplitEdge = hasDraggableContext && canSplit;

  const ariaLabel = useMemo(() => `Results pane ${paneIndex + 1} of ${paneCount}`, [paneCount, paneIndex]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex === -1) return;

    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    onActivateTab(pane.id, nextTab.id);
    const trigger = document.getElementById(`workspace-right-tab-${pane.id}-${nextTab.id}`);
    trigger?.focus();
  };

  return (
    <div
      data-node-details-pane-id={pane.id}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'relative flex min-w-0 min-h-0 flex-1 flex-col border-l border-border first:border-l-0',
        isActivePane && 'ring-1 ring-inset ring-foreground/35',
      )}
      onMouseDown={() => onActivatePane(pane.id)}
    >
      {canRenderDropTargets ? (
        <div className="pointer-events-none absolute inset-0 z-30">
          <div
            className={cn(
              'absolute inset-0 transition-colors',
              hoveredMergeZone ? 'bg-primary/14' : 'bg-transparent',
            )}
          />

          <div
            className={cn(
              'absolute inset-y-0 left-0 w-1/3 transition-colors',
              canShowSplitEdge && hoveredDropEdge === 'left' ? 'bg-primary/18' : 'bg-transparent',
            )}
          />

          <div
            className={cn(
              'absolute inset-y-0 right-0 w-1/3 transition-colors',
              canShowSplitEdge && hoveredDropEdge === 'right' ? 'bg-primary/18' : 'bg-transparent',
            )}
          />
        </div>
      ) : null}

      <div
        className="flex min-h-8 items-center border-b border-border bg-muted/30 pr-1"
        role="tablist" 
        aria-label={ariaLabel}
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-2 py-1"
          data-tab-strip={pane.id}
        >
          {tabs.map((tab, tabIndex) => {
            const isActive = tab.id === activeTabId;
            const panelId = `workspace-right-panel-${pane.id}-${tab.id}`;

            return (
              <div
                key={tab.id}
                data-tab-item-pane-id={pane.id}
                data-tab-item-tab-id={tab.id}
                data-tab-item-index={tabIndex}
                className={cn(
                  'group relative flex items-center rounded-sm',
                  draggingTabId === tab.id && 'opacity-70',
                  isActive
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <button
                  type="button"
                  id={`workspace-right-tab-${pane.id}-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  className="max-w-[180px] cursor-grab truncate px-2 py-1 text-left text-[11px] font-medium active:cursor-grabbing select-none touch-none"
                  onClick={() => onActivateTab(pane.id, tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();

                    onBeginTabDrag({
                      paneId: pane.id,
                      tabId: tab.id,
                      tabIndex,
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startY: event.clientY,
                    });
                  }}
                  onKeyUp={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      onActivateTab(pane.id, tab.id);
                    }
                  }}
                >
                  {tab.title}
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    'size-5 rounded-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    !isActive && 'opacity-70 group-hover:opacity-100',
                  )}
                  onClick={() => onCloseTab(pane.id, tab.id)}
                  aria-label={`Close ${tab.title} tab`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div
        id={activeTabId ? `workspace-right-panel-${pane.id}-${activeTabId}` : `workspace-right-panel-empty-${pane.id}`}
        role="tabpanel"
        aria-labelledby={activeTabId ? `workspace-right-tab-${pane.id}-${activeTabId}` : undefined}
        aria-label={activeTabId ? undefined : ariaLabel}
        className="min-h-0 flex-1"
      >
        <NodeDetailsTabPanel details={activeDetails} />
      </div>
    </div>
  );
}
