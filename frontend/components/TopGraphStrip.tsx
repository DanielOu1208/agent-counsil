'use client';

import { useCallback, useMemo, useState, useRef } from 'react';
import ReactFlow, { Node, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { X, GripVertical, MessageSquare } from 'lucide-react';
import { mockNodes, mockEdges, nodeConversations } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface OpenPopout {
  id: string;
  x: number;
  y: number;
}

// Constants for popout positioning
const POPOUT_WIDTH = 320;
const POPOUT_HEIGHT = 200;
const POPOUT_GAP = 16;
const POPOUT_COLUMNS = 2;
const MIN_X_CLEAR_SETTINGS = 340;
const POPOUT_START_Y = 24;

export default function TopGraphStrip() {
  const [openPopouts, setOpenPopouts] = useState<Map<string, OpenPopout>>(new Map());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const getNextPosition = useCallback((): { x: number; y: number } => {
    const count = openPopouts.size;
    const col = count % POPOUT_COLUMNS;
    const row = Math.floor(count / POPOUT_COLUMNS);
    const containerWidth = containerRef.current?.clientWidth ?? 1200;
    const totalGridWidth =
      POPOUT_COLUMNS * POPOUT_WIDTH + (POPOUT_COLUMNS - 1) * POPOUT_GAP;
    const preferredStartX = containerWidth - totalGridWidth - POPOUT_GAP;
    const startX = Math.max(MIN_X_CLEAR_SETTINGS, preferredStartX);

    return {
      x: startX + col * (POPOUT_WIDTH + POPOUT_GAP),
      y: POPOUT_START_Y + row * (POPOUT_HEIGHT + POPOUT_GAP),
    };
  }, [openPopouts]);

  const nodes = useMemo(() => {
    return mockNodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        border: openPopouts.has(node.id)
          ? '2px solid oklch(0.72 0.14 270)'
          : node.style?.border || '2px solid oklch(0.25 0.012 270)',
        boxShadow: openPopouts.has(node.id)
          ? '0 0 12px oklch(0.72 0.14 270 / 0.4)'
          : 'none',
        cursor: 'pointer',
      },
    }));
  }, [openPopouts]);

  const edges = useMemo(() => {
    return mockEdges;
  }, []);

  const togglePopout = useCallback(
    (nodeId: string) => {
      setOpenPopouts((prev) => {
        const newMap = new Map(prev);
        if (newMap.has(nodeId)) {
          newMap.delete(nodeId);
        } else {
          newMap.set(nodeId, {
            id: nodeId,
            ...getNextPosition(),
          });
        }
        return newMap;
      });
    },
    [getNextPosition]
  );

  const closePopout = useCallback((nodeId: string) => {
    setOpenPopouts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(nodeId);
      return newMap;
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      const popout = openPopouts.get(nodeId);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!popout || !rect) return;

      dragOffset.current = {
        x: e.clientX - rect.left - popout.x,
        y: e.clientY - rect.top - popout.y,
      };
      setDraggingId(nodeId);
    },
    [openPopouts]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!draggingId || !rect) return;

      const maxX = Math.max(0, rect.width - POPOUT_WIDTH);
      const maxY = Math.max(0, rect.height - POPOUT_HEIGHT);
      const newX = Math.min(maxX, Math.max(0, e.clientX - rect.left - dragOffset.current.x));
      const newY = Math.min(maxY, Math.max(0, e.clientY - rect.top - dragOffset.current.y));

      setOpenPopouts((prev) => {
        const newMap = new Map(prev);
        const popout = newMap.get(draggingId);
        if (popout) {
          newMap.set(draggingId, { ...popout, x: newX, y: newY });
        }
        return newMap;
      });
    },
    [draggingId]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      togglePopout(node.id);
    },
    [togglePopout]
  );

  if (mockNodes.length === 0) {
    return (
      <div className="absolute inset-0 bg-card flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <MessageSquare className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No graph data available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-card"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        preventScrolling={true}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        style={{ background: 'oklch(0.14 0.008 270)' }}
      >
        <Background color="oklch(0.2 0.01 270)" gap={16} />
      </ReactFlow>

      {/* Open Popouts */}
      {Array.from(openPopouts.entries()).map(([nodeId, popout]) => {
        const nodeData = nodeConversations[nodeId];
        if (!nodeData) return null;

        return (
          <Card
            key={nodeId}
            className="absolute bg-background border border-border shadow-xl z-30"
            style={{
              left: popout.x,
              top: popout.y,
              width: POPOUT_WIDTH,
              userSelect: draggingId === nodeId ? 'none' : 'auto',
            }}
          >
            {/* Popup Header - Draggable */}
            <CardHeader
              className="cursor-move py-3 flex-row items-center justify-between space-y-0"
              onMouseDown={(e) => handleMouseDown(e, nodeId)}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="size-4 text-muted-foreground" />
                <div className="w-1.5 h-4 bg-primary" />
                <div>
                  <CardTitle className="text-sm">{nodeData.title}</CardTitle>
                  <span className="text-xs text-muted-foreground">{nodeData.lane}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  closePopout(nodeId);
                }}
                aria-label="Close popup"
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="py-3">
              <ScrollArea className="max-h-[120px]">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {nodeData.content}
                </p>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
