'use client';

import { useCallback, useMemo, useState, useRef, type MouseEvent } from 'react';
import ReactFlow, { Background, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { X, GripVertical, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DebateGraphEdge, DebateGraphNode, LaneId, LANE_CONFIGS } from '@/types/ui';

interface OpenPopout {
  id: string;
  x: number;
  y: number;
}

interface NodeDetails {
  title: string;
  lane: string;
  content: string;
}

interface TopGraphStripProps {
  graphNodes: DebateGraphNode[];
  graphEdges: DebateGraphEdge[];
  resolveLane: (node: DebateGraphNode) => LaneId;
}

const POPOUT_WIDTH = 320;
const POPOUT_HEIGHT = 220;
const POPOUT_GAP = 16;
const POPOUT_COLUMNS = 2;
const MIN_X_CLEAR_SETTINGS = 340;
const POPOUT_START_Y = 24;

const LANE_COLORS: Record<LaneId, string> = {
  orchestrator: 'oklch(0.7 0 0)',
  'debater-a': 'oklch(0.65 0 0)',
  'debater-b': 'oklch(0.6 0 0)',
  'debater-c': 'oklch(0.55 0 0)',
};

function getNodeTitle(node: DebateGraphNode): string {
  if (node.nodeType === 'final') return 'Final Answer';
  if (node.nodeType === 'summary') return 'Summary';
  if (node.nodeType === 'intervention') return 'Intervention';
  if (node.nodeType === 'regen_root') return 'Regeneration Root';
  if (node.speakerType === 'user') return 'User Prompt';
  if (node.speakerType === 'orchestrator') return 'Orchestrator';
  if (node.speakerType === 'system') return 'System';
  return 'Agent Message';
}

function getNodeLabel(node: DebateGraphNode): string {
  if (!node.content) {
    return node.status === 'streaming' ? 'Streaming...' : getNodeTitle(node);
  }
  return node.content.length > 42 ? `${node.content.slice(0, 42)}...` : node.content;
}

export default function TopGraphStrip({
  graphNodes,
  graphEdges,
  resolveLane,
}: TopGraphStripProps) {
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

  const { flowNodes, flowEdges, nodeDetails } = useMemo(() => {
    const sortedNodes = [...graphNodes].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const laneRowIndex = new Map(LANE_CONFIGS.map((lane, index) => [lane.id, index]));
    const nodesById = new Map(sortedNodes.map((node) => [node.id, node]));
    const depthByNodeId = new Map<string, number>();

    const getDepth = (nodeId: string): number => {
      const cached = depthByNodeId.get(nodeId);
      if (cached !== undefined) return cached;

      const node = nodesById.get(nodeId);
      if (!node?.parentNodeId || !nodesById.has(node.parentNodeId)) {
        depthByNodeId.set(nodeId, 0);
        return 0;
      }

      const depth = getDepth(node.parentNodeId) + 1;
      depthByNodeId.set(nodeId, depth);
      return depth;
    };

    const laneDepthOffsets = new Map<string, number>();
    const nextFlowNodes: Node[] = [];
    const details: Record<string, NodeDetails> = {};

    for (const node of sortedNodes) {
      const laneId = resolveLane(node);
      const laneIndex = laneRowIndex.get(laneId) ?? 0;
      const depth = getDepth(node.id);

      const laneDepthKey = `${laneId}:${depth}`;
      const offsetInLaneDepth = laneDepthOffsets.get(laneDepthKey) ?? 0;
      laneDepthOffsets.set(laneDepthKey, offsetInLaneDepth + 1);

      const title = getNodeTitle(node);
      const laneLabel = LANE_CONFIGS.find((lane) => lane.id === laneId)?.label ?? 'Unknown';

      details[node.id] = {
        title,
        lane: laneLabel,
        content: node.content || (node.status === 'streaming' ? 'Streaming...' : 'No content'),
      };

      nextFlowNodes.push({
        id: node.id,
        type: 'default',
        position: {
          x: 90 + depth * 290,
          y: 50 + laneIndex * 165 + offsetInLaneDepth * 22,
        },
        data: { label: getNodeLabel(node) },
        style: {
          background: 'oklch(0.15 0 0)',
          color: LANE_COLORS[laneId],
          border:
            node.status === 'streaming'
              ? `2px solid ${LANE_COLORS[laneId]}`
              : '2px solid oklch(0.28 0 0)',
          borderRadius: '0px',
          padding: '10px 15px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow:
            node.status === 'streaming'
              ? `0 0 10px color-mix(in srgb, ${LANE_COLORS[laneId]} 55%, transparent)`
              : 'none',
        },
      });
    }

    const fallbackEdges: Edge[] = sortedNodes
      .filter((node) => node.parentNodeId)
      .map((node) => ({
        id: `parent-${node.parentNodeId}-${node.id}`,
        source: node.parentNodeId as string,
        target: node.id,
        animated: node.status === 'streaming',
        style: { stroke: 'oklch(0.28 0 0)' },
      }));

    const nextFlowEdges: Edge[] =
      graphEdges.length > 0
        ? graphEdges.map((edge) => {
            const targetNode = nodesById.get(edge.toNodeId);
            return {
              id: edge.id,
              source: edge.fromNodeId,
              target: edge.toNodeId,
              animated: targetNode?.status === 'streaming',
              style: { stroke: 'oklch(0.28 0 0)' },
            };
          })
        : fallbackEdges;

    return { flowNodes: nextFlowNodes, flowEdges: nextFlowEdges, nodeDetails: details };
  }, [graphNodes, graphEdges, resolveLane]);

  const nodes = useMemo(() => {
    return flowNodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        border: openPopouts.has(node.id)
          ? '2px solid oklch(0.6 0 0)'
          : node.style?.border || '2px solid oklch(0.28 0 0)',
        boxShadow: openPopouts.has(node.id)
          ? '0 0 12px oklch(0.6 0 0 / 0.3)'
          : node.style?.boxShadow || 'none',
      },
    }));
  }, [flowNodes, openPopouts]);

  const togglePopout = useCallback(
    (nodeId: string) => {
      setOpenPopouts((prev) => {
        const next = new Map(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.set(nodeId, { id: nodeId, ...getNextPosition() });
        }
        return next;
      });
    },
    [getNextPosition],
  );

  const closePopout = useCallback((nodeId: string) => {
    setOpenPopouts((prev) => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const handleMouseDown = useCallback(
    (event: MouseEvent, nodeId: string) => {
      event.preventDefault();
      const popout = openPopouts.get(nodeId);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!popout || !rect) return;

      dragOffset.current = {
        x: event.clientX - rect.left - popout.x,
        y: event.clientY - rect.top - popout.y,
      };
      setDraggingId(nodeId);
    },
    [openPopouts],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!draggingId || !rect) return;

      const maxX = Math.max(0, rect.width - POPOUT_WIDTH);
      const maxY = Math.max(0, rect.height - POPOUT_HEIGHT);
      const newX = Math.min(maxX, Math.max(0, event.clientX - rect.left - dragOffset.current.x));
      const newY = Math.min(maxY, Math.max(0, event.clientY - rect.top - dragOffset.current.y));

      setOpenPopouts((prev) => {
        const next = new Map(prev);
        const popout = next.get(draggingId);
        if (popout) {
          next.set(draggingId, { ...popout, x: newX, y: newY });
        }
        return next;
      });
    },
    [draggingId],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      togglePopout(node.id);
    },
    [togglePopout],
  );

  if (nodes.length === 0) {
    return (
      <div className="absolute inset-0 bg-card flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <MessageSquare className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Start a debate to render the graph</p>
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
        edges={flowEdges}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        preventScrolling
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        style={{ background: 'oklch(0.15 0 0)' }}
      >
        <Background color="oklch(0.22 0 0)" gap={16} />
      </ReactFlow>

      {Array.from(openPopouts.entries()).map(([nodeId, popout]) => {
        const nodeData = nodeDetails[nodeId];
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
            <CardHeader
              className="cursor-move py-3 flex-row items-center justify-between space-y-0"
              onMouseDown={(event) => handleMouseDown(event, nodeId)}
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
                onClick={(event) => {
                  event.stopPropagation();
                  closePopout(nodeId);
                }}
                aria-label="Close popup"
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="py-3">
              <ScrollArea className="max-h-[140px]">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
