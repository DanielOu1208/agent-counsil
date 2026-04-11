'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import NodeDetailsPane from './NodeDetailsPane';
import { cn } from '@/lib/utils';
import { canClosePane, getSplitPaneBlockReason, MAX_RIGHT_PANES } from '@/lib/nodeDetailsLayout';
import {
  WorkspaceNodeDetails,
  WorkspaceNodeDetailsLayoutV2,
  WorkspaceNodeTab,
  WorkspaceSplitEdge,
} from '@/types/ui';

interface NodeDetailsPaneGroupProps {
  layout: WorkspaceNodeDetailsLayoutV2;
  tabsById: Record<string, WorkspaceNodeTab>;
  detailsByTabId: Record<string, WorkspaceNodeDetails>;
  externalNotice?: string | null;
  onActivatePane: (paneId: string) => void;
  onActivateTab: (paneId: string, tabId: string) => void;
  onCloseTab: (paneId: string, tabId: string) => void;
  onClosePane: (paneId: string) => void;
  onSplitTab: (targetPaneId: string, edge: WorkspaceSplitEdge, tabId: string) => void;
  onMoveTabToPane?: (tabId: string, fromPaneId: string, toPaneId: string, toIndex?: number) => void;
  onReorderTabInPane?: (paneId: string, fromIndex: number, toIndex: number) => void;
}

interface TabDragSession {
  type: 'tab';
  pointerId: number;
  tabId: string;
  fromPaneId: string;
  fromTabIndex: number;
  startX: number;
  startY: number;
  isDragging: boolean;
}

interface TabDropTargetSplit {
  intent: 'split';
  paneId: string;
  edge: WorkspaceSplitEdge;
}

interface TabDropTargetInsert {
  intent: 'insert-tab';
  paneId: string;
  tabIndex: number;
}

interface TabDropTargetAppend {
  intent: 'append-tab';
  paneId: string;
}

type DropTarget = TabDropTargetSplit | TabDropTargetInsert | TabDropTargetAppend | null;

const DRAG_START_THRESHOLD_PX = 6;
const MIN_PANE_WIDTH_PX = 260;
const TAB_STRIP_EDGE_THRESHOLD_PX = 80;

export default function NodeDetailsPaneGroup({
  layout,
  tabsById,
  detailsByTabId,
  externalNotice,
  onActivatePane,
  onActivateTab,
  onCloseTab,
  onClosePane,
  onSplitTab,
  onMoveTabToPane,
  onReorderTabInPane,
}: NodeDetailsPaneGroupProps) {
  const dragSessionRef = useRef<TabDragSession | null>(null);
  const layoutRef = useRef(layout);
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dragFromPaneId, setDragFromPaneId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Sync layout ref to avoid stale closure in async handlers
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const activeNotice = externalNotice ?? notice;

  const canSplit = layout.panes.length < MAX_RIGHT_PANES;

  const getTabDropTargetAtPoint = useCallback((clientX: number, clientY: number, fromPaneId: string, fromTabIndex: number): DropTarget => {
    const target = document.elementFromPoint(clientX, clientY);
    if (!target || !(target instanceof Element)) return null;

    // Check if over a tab item first (for insert-tab intent)
    const tabItemElement = target.closest<HTMLElement>('[data-tab-item-pane-id]');
    if (tabItemElement) {
      const targetPaneId = tabItemElement.dataset.tabItemPaneId;
      const targetTabIndex = parseInt(tabItemElement.dataset.tabItemIndex ?? '-1', 10);

      if (targetPaneId && targetTabIndex >= 0) {
        const currentLayout = layoutRef.current;
        const fromPane = currentLayout.panes.find((p) => p.id === fromPaneId);
        const targetPane = currentLayout.panes.find((p) => p.id === targetPaneId);

        if (fromPane && targetPane) {
          const tabRect = tabItemElement.getBoundingClientRect();
          const insertAfter = clientX > tabRect.left + tabRect.width / 2;
          const insertionIndex = targetTabIndex + (insertAfter ? 1 : 0);

          if (fromPaneId === targetPaneId) {
            if (insertionIndex === fromTabIndex || insertionIndex === fromTabIndex + 1) return null;
            return { intent: 'insert-tab', paneId: targetPaneId, tabIndex: insertionIndex };
          }

          return { intent: 'insert-tab', paneId: targetPaneId, tabIndex: insertionIndex };
        }
      }
    }

    // Check if over tab strip (for append-tab intent)
    const tabStripElement = target.closest<HTMLElement>('[data-tab-strip]');
    if (tabStripElement) {
      const targetPaneId = tabStripElement.dataset.tabStrip;
      if (targetPaneId) {
        const isOverEmptyArea = tabItemElement === null;

        if (isOverEmptyArea) {
          const currentLayout = layoutRef.current;
          const targetPane = currentLayout.panes.find((p) => p.id === targetPaneId);
          if (targetPane) {
            return { intent: 'append-tab', paneId: targetPaneId };
          }
        }
      }
    }

    // Check if over pane (for split intent)
    const paneElement = target.closest<HTMLElement>('[data-node-details-pane-id]');
    if (paneElement) {
      const targetPaneId = paneElement.dataset.nodeDetailsPaneId;
      if (targetPaneId) {
        const rect = paneElement.getBoundingClientRect();
        const isInEdgeZone =
          clientX < rect.left + TAB_STRIP_EDGE_THRESHOLD_PX || clientX > rect.right - TAB_STRIP_EDGE_THRESHOLD_PX;

        if (isInEdgeZone) {
          const edge = clientX < rect.left + rect.width / 2 ? 'left' : 'right';
          return { intent: 'split', paneId: targetPaneId, edge };
        }

        // Center/body drop zone: merge/move tab into this pane
        return { intent: 'append-tab', paneId: targetPaneId };
      }
    }

    return null;
  }, []);

  // Central teardown for all window listeners - prevents leaks on any cleanup path
  const teardownListeners = useCallback(() => {
    if (listenerCleanupRef.current) {
      listenerCleanupRef.current();
      listenerCleanupRef.current = null;
    }
  }, []);

  const cleanupDragSession = useCallback(() => {
    teardownListeners();
    dragSessionRef.current = null;
    setDraggingTabId(null);
    setDragFromPaneId(null);
    setDropTarget(null);
  }, [teardownListeners]);

  const beginTabDrag = useCallback(
    (params: { paneId: string; tabId: string; tabIndex: number; pointerId: number; startX: number; startY: number }) => {
      // Defensive: always tear down any previous session before starting new one
      teardownListeners();

      dragSessionRef.current = {
        type: 'tab',
        pointerId: params.pointerId,
        tabId: params.tabId,
        fromPaneId: params.paneId,
        fromTabIndex: params.tabIndex,
        startX: params.startX,
        startY: params.startY,
        isDragging: false,
      };

      const handlePointerMove = (event: PointerEvent) => {
        const session = dragSessionRef.current;
        if (!session || event.pointerId !== session.pointerId) return;

        if (!session.isDragging) {
          const dx = Math.abs(event.clientX - session.startX);
          const dy = Math.abs(event.clientY - session.startY);
          if (Math.max(dx, dy) < DRAG_START_THRESHOLD_PX) return;

          session.isDragging = true;
          dragSessionRef.current = session;
          setDraggingTabId(session.tabId);
          setDragFromPaneId(session.fromPaneId);
          setNotice(null);
        }

        const nextTarget = getTabDropTargetAtPoint(event.clientX, event.clientY, session.fromPaneId, session.fromTabIndex);
        setDropTarget(nextTarget);
      };

      const finishPointerSession = (event: PointerEvent) => {
        const session = dragSessionRef.current;
        if (!session || event.pointerId !== session.pointerId) return;

        // Always tear down listeners first
        teardownListeners();

        const wasDragging = session.isDragging;
        if (!wasDragging) {
          cleanupDragSession();
          return;
        }

        const finalTarget = getTabDropTargetAtPoint(event.clientX, event.clientY, session.fromPaneId, session.fromTabIndex);
        if (finalTarget) {
          const currentLayout = layoutRef.current;
          
          if (finalTarget.intent === 'split') {
            // Validate target pane width for split viability
            const targetPaneElement = document.querySelector(`[data-node-details-pane-id="${finalTarget.paneId}"]`);
            const targetPaneWidth = targetPaneElement?.getBoundingClientRect().width ?? 0;
            if (targetPaneWidth > 0 && targetPaneWidth / 2 < MIN_PANE_WIDTH_PX) {
              setNotice('Target pane is too narrow to split. Widen the workspace first.');
            } else {
              const splitBlockReason = getSplitPaneBlockReason(currentLayout, {
                targetPaneId: finalTarget.paneId,
                draggedTabId: session.tabId,
              });

              if (splitBlockReason) {
                setNotice(splitBlockReason);
              } else {
                onSplitTab(finalTarget.paneId, finalTarget.edge, session.tabId);
              }
            }
          } else if (finalTarget.intent === 'insert-tab') {
            if (onMoveTabToPane || onReorderTabInPane) {
              if (session.fromPaneId === finalTarget.paneId) {
                // Reorder within same pane
                if (onReorderTabInPane) {
                  // Adjust index if moving within same pane
                  let adjustedIndex = finalTarget.tabIndex;
                  if (session.fromTabIndex < finalTarget.tabIndex) {
                    adjustedIndex = Math.max(0, finalTarget.tabIndex - 1);
                  }
                  if (adjustedIndex !== session.fromTabIndex) {
                    onReorderTabInPane(finalTarget.paneId, session.fromTabIndex, adjustedIndex);
                  }
                }
              } else {
                // Move to different pane
                if (onMoveTabToPane) {
                  onMoveTabToPane(session.tabId, session.fromPaneId, finalTarget.paneId, finalTarget.tabIndex);
                }
              }
            }
          } else if (finalTarget.intent === 'append-tab') {
            if (onMoveTabToPane) {
              if (session.fromPaneId !== finalTarget.paneId) {
                onMoveTabToPane(session.tabId, session.fromPaneId, finalTarget.paneId);
              } else {
                // Append to end of same pane
                const pane = currentLayout.panes.find(p => p.id === finalTarget.paneId);
                if (pane && onReorderTabInPane) {
                  const lastIndex = pane.tabIds.length - 1;
                  if (session.fromTabIndex !== lastIndex) {
                    onReorderTabInPane(finalTarget.paneId, session.fromTabIndex, lastIndex);
                  }
                }
              }
            }
          }
        }

        cleanupDragSession();
      };

      // Register listeners
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', finishPointerSession);
      window.addEventListener('pointercancel', finishPointerSession);

      // Store cleanup function for central teardown
      listenerCleanupRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', finishPointerSession);
        window.removeEventListener('pointercancel', finishPointerSession);
      };
    },
    [cleanupDragSession, getTabDropTargetAtPoint, onSplitTab, onMoveTabToPane, onReorderTabInPane, teardownListeners],
  );

  useEffect(() => {
    return () => {
      cleanupDragSession();
    };
  }, [cleanupDragSession]);

  // Compute drop overlay position for visual feedback
  const dropOverlay = (() => {
    if (!dropTarget) return null;

    if (dropTarget.intent === 'split') {
      return { paneId: dropTarget.paneId, edge: dropTarget.edge };
    }

    return null;
  })();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {activeNotice ? (
        <div className="border-b border-border bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
          {activeNotice}
        </div>
      ) : null}

      <div className={cn('flex min-h-0 flex-1', draggingTabId && 'cursor-grabbing')}>
        {layout.panes.map((pane, index) => {
          const tabs = pane.tabIds
            .map((tabId) => tabsById[tabId])
            .filter((tab): tab is WorkspaceNodeTab => Boolean(tab));
          const closeCheck = canClosePane(layout, pane.id);

          return (
            <NodeDetailsPane
              key={pane.id}
              pane={pane}
              paneIndex={index}
              paneCount={layout.panes.length}
              isActivePane={pane.id === layout.activePaneId}
              tabs={tabs}
              detailsByTabId={detailsByTabId}
              draggingTabId={draggingTabId}
              hoveredDropEdge={dropOverlay?.paneId === pane.id ? dropOverlay.edge : null}
              hoveredMergeZone={
                dropTarget?.intent === 'append-tab' &&
                dropTarget.paneId === pane.id &&
                dragFromPaneId !== pane.id
              }
              canSplit={canSplit}
              onActivatePane={onActivatePane}
              onActivateTab={onActivateTab}
              onCloseTab={onCloseTab}
              onClosePane={onClosePane}
              canClosePane={closeCheck.ok}
              closePaneBlockedReason={closeCheck.reason}
              onClosePaneRejected={(message) => {
                setNotice(message);
              }}
              onBeginTabDrag={beginTabDrag}
            />
          );
        })}
      </div>
    </div>
  );
}
