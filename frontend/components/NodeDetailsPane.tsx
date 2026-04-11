'use client';

import { KeyboardEvent, useMemo, useRef } from 'react';
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

const MIN_PANE_WIDTH_PX = 260;

interface NodeDetailsPaneProps {
  pane: WorkspaceRightPane;
  paneIndex: number;
  paneCount: number;
  isActivePane: boolean;
  tabs: WorkspaceNodeTab[];
  detailsByTabId: Record<string, WorkspaceNodeDetails>;
  draggingTabId: string | null;
  hoveredDropEdge: WorkspaceSplitEdge | null;
  canSplit: boolean;
  onActivatePane: (paneId: string) => void;
  onActivateTab: (paneId: string, tabId: string) => void;
  onCloseTab: (paneId: string, tabId: string) => void;
  onClosePane: (paneId: string) => void;
  canClosePane: boolean;
  closePaneBlockedReason?: string;
  onClosePaneRejected: (message: string) => void;
  onBeginTabDrag: (params: {
    paneId: string;
    tabId: string;
    pointerId: number;
    startX: number;
    startY: number;
  }) => void;
  onSplitRejected: (message: string) => void;
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
  canSplit,
  onActivatePane,
  onActivateTab,
  onCloseTab,
  onClosePane,
  canClosePane,
  closePaneBlockedReason,
  onClosePaneRejected,
  onBeginTabDrag,
  onSplitRejected,
}: NodeDetailsPaneProps) {
  const paneRef = useRef<HTMLDivElement | null>(null);

  const activeTabId = pane.activeTabId;
  const activeDetails = activeTabId ? detailsByTabId[activeTabId] : undefined;

  const hasDraggableContext = Boolean(draggingTabId);
  const canRenderDropTargets = hasDraggableContext && canSplit;

  const ariaLabel = useMemo(() => `Results pane ${paneIndex + 1} of ${paneCount}`, [paneCount, paneIndex]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>, tabId: string) => {
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
      ref={paneRef}
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
              'pointer-events-auto absolute inset-y-0 left-0 w-1/2 border-r border-border/70 transition-colors',
              hoveredDropEdge === 'left' ? 'bg-primary/18' : 'bg-transparent',
            )}
          />

          <div
            className={cn(
              'pointer-events-auto absolute inset-y-0 right-0 w-1/2 transition-colors',
              hoveredDropEdge === 'right' ? 'bg-primary/18' : 'bg-transparent',
            )}
          />
        </div>
      ) : null}

      <div className="flex min-h-9 items-center border-b border-border bg-muted/40 pr-1" role="tablist" aria-label={ariaLabel}>
        <div className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto px-2 pt-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const panelId = `workspace-right-panel-${pane.id}-${tab.id}`;

            return (
              <div
                key={tab.id}
                className={cn(
                  'group relative flex min-h-8 items-stretch rounded-none border border-b-0',
                  draggingTabId === tab.id && 'opacity-70',
                  isActive
                    ? 'z-10 -mb-px border-border bg-background text-foreground shadow-sm'
                    : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <div
                  id={`workspace-right-tab-${pane.id}-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  className="max-w-[220px] cursor-grab truncate px-2.5 py-1.5 text-left text-xs font-medium active:cursor-grabbing select-none touch-none [-webkit-user-drag:element]"
                  onClick={() => onActivateTab(pane.id, tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    
                    // Immediate rejection if split is impossible (max panes reached)
                    if (!canSplit) {
                      onSplitRejected('Maximum 4 panes reached. Close a pane to split again.');
                      return;
                    }

                    // Check pane width for split viability
                    const paneWidth = paneRef.current?.getBoundingClientRect().width ?? 0;
                    if (paneWidth > 0 && paneWidth / 2 < MIN_PANE_WIDTH_PX) {
                      onSplitRejected('Pane is too narrow to split. Widen the workspace first.');
                      return;
                    }

                    onBeginTabDrag({
                      paneId: pane.id,
                      tabId: tab.id,
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
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    'size-6 rounded-none text-muted-foreground hover:bg-muted/60 hover:text-foreground',
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

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ml-1 size-6 rounded-none text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={() => {
            if (paneCount <= 1) {
              onClosePaneRejected('At least one pane must remain open.');
              return;
            }

            if (!canClosePane) {
              onClosePaneRejected(
                closePaneBlockedReason ??
                  'Cannot close pane right now. Move or close some tabs in the adjacent pane first.',
              );
              return;
            }

            onClosePane(pane.id);
          }}
          aria-label={`Close results pane ${paneIndex + 1}`}
        >
          <X className="size-3.5" />
        </Button>
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
