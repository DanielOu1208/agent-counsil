'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
}

interface DragSession {
  pointerId: number;
  tabId: string;
  fromPaneId: string;
  startX: number;
  startY: number;
  isDragging: boolean;
}

interface DropTarget {
  paneId: string;
  edge: WorkspaceSplitEdge;
}

const DRAG_START_THRESHOLD_PX = 6;
const MIN_PANE_WIDTH_PX = 260;

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
}: NodeDetailsPaneGroupProps) {
  const dragSessionRef = useRef<DragSession | null>(null);
  const layoutRef = useRef(layout);
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
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

  const getDropTargetAtPoint = useCallback((clientX: number, clientY: number): DropTarget | null => {
    const target = document.elementFromPoint(clientX, clientY);
    const paneElement = target instanceof Element
      ? target.closest<HTMLElement>('[data-node-details-pane-id]')
      : null;
    if (!paneElement) return null;

    const paneId = paneElement.dataset.nodeDetailsPaneId;
    if (!paneId) return null;

    const rect = paneElement.getBoundingClientRect();
    return {
      paneId,
      edge: clientX < rect.left + rect.width / 2 ? 'left' : 'right',
    };
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
    setDropTarget(null);
  }, [teardownListeners]);

  const beginTabDrag = useCallback(
    (params: { paneId: string; tabId: string; pointerId: number; startX: number; startY: number }) => {
      // Defensive: always tear down any previous session before starting new one
      teardownListeners();

      dragSessionRef.current = {
        pointerId: params.pointerId,
        tabId: params.tabId,
        fromPaneId: params.paneId,
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
          setNotice(null);
        }

        const nextTarget = getDropTargetAtPoint(event.clientX, event.clientY);
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

        const finalTarget = getDropTargetAtPoint(event.clientX, event.clientY);
        if (finalTarget) {
          // Use latest layout at release-time, not closure-captured stale layout
          const currentLayout = layoutRef.current;
          
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
    [cleanupDragSession, getDropTargetAtPoint, onSplitTab, teardownListeners],
  );

  useEffect(() => {
    return () => {
      cleanupDragSession();
    };
  }, [cleanupDragSession]);

  const draggingBadge = useMemo(() => {
    if (!draggingTabId) return null;
    return tabsById[draggingTabId]?.title ?? 'node tab';
  }, [draggingTabId, tabsById]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {activeNotice ? (
        <div className="border-b border-border bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
          {activeNotice}
        </div>
      ) : null}

      {draggingBadge ? (
        <div className="border-b border-border/70 bg-primary/5 px-3 py-1 text-[11px] text-foreground/85">
          Dragging <span className="font-medium">{draggingBadge}</span> — release on a pane edge to split.
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
              hoveredDropEdge={dropTarget?.paneId === pane.id ? dropTarget.edge : null}
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
              onSplitRejected={(message) => {
                setNotice(message);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
