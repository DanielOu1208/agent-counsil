'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import ReactFlow, { Background, Edge, Handle, Node, NodeProps, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { MessageSquare } from 'lucide-react';
import ElkConstructor from 'elkjs/lib/elk.bundled.js';
import { DebateGraphEdge, DebateGraphNode, LaneConfig, LaneId, WorkspaceNodeDetails } from '@/types/ui';

interface TopGraphStripProps {
  graphNodes: DebateGraphNode[];
  graphEdges: DebateGraphEdge[];
  resolveLane: (node: DebateGraphNode) => LaneId;
  laneConfigs: LaneConfig[];
  lanePersonalityNameById?: Record<LaneId, string>;
  openNodeIds?: Set<string>;
  onOpenNodeTab?: (nodeId: string, details: WorkspaceNodeDetails) => void;
}

interface CompactGraphNodeData {
  title: string;
  personality: string;
  messageType: string;
  laneColor: string;
  hoverText: string;
}

const FIT_VIEW_OPTIONS = { padding: 0.2 } as const;
const FLOW_STYLE = { background: 'oklch(0.15 0 0)' } as const;

const LANE_COLOR_PALETTE = [
  'oklch(0.7 0 0)',
  'oklch(0.65 0 0)',
  'oklch(0.6 0 0)',
  'oklch(0.55 0 0)',
  'oklch(0.62 0 0)',
  'oklch(0.58 0 0)',
  'oklch(0.68 0 0)',
  'oklch(0.52 0 0)',
  'oklch(0.72 0 0)',
];

const elk = new ElkConstructor();

const ELK_LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '50',
  'elk.layered.spacing.nodeNodeBetweenLayers': '56',
  'elk.layered.spacing.layerLayer': '45',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
};

const NODE_WIDTH = 110;
const NODE_HEIGHT = 42;

function CompactGraphNode({ data }: NodeProps<CompactGraphNodeData>) {
  return (
    <div
      title={data.hoverText}
      className="relative flex h-full w-full items-center overflow-hidden px-2 py-1"
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 6, height: 6, opacity: 0, pointerEvents: 'none' }}
      />
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[2px]"
        style={{ backgroundColor: data.laneColor }}
      />
      <div className="min-w-0 pl-1">
        <div className="truncate text-[9px] font-semibold tracking-wide text-foreground/90">{data.title}</div>
        <div className="truncate text-[8px] text-foreground/50">{data.personality}</div>
        <div className="truncate text-[8px] text-foreground/50">{data.messageType}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 6, height: 6, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}

const NODE_TYPES = { compactNode: CompactGraphNode };

function getLaneColor(laneId: LaneId, laneConfigs: LaneConfig[]): string {
  const index = laneConfigs.findIndex((lane) => lane.id === laneId);
  return LANE_COLOR_PALETTE[index >= 0 ? index % LANE_COLOR_PALETTE.length : 0];
}

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

function computeFallbackGridPositions(nodeIds: string[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const cols = Math.ceil(Math.sqrt(nodeIds.length));
  nodeIds.forEach((id, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    positions.set(id, { x: col * 238, y: row * 80 });
  });
  return positions;
}

function centerMultiParentTargets(
  flowNodes: Node[],
  flowEdges: DebateGraphEdge[],
): Node[] {
  const nodesById = new Map(flowNodes.map((node) => [node.id, node]));
  const parentIdsByTargetId = new Map<string, string[]>();

  for (const edge of flowEdges) {
    if (!nodesById.has(edge.fromNodeId) || !nodesById.has(edge.toNodeId)) continue;
    const parentIds = parentIdsByTargetId.get(edge.toNodeId) ?? [];
    parentIds.push(edge.fromNodeId);
    parentIdsByTargetId.set(edge.toNodeId, parentIds);
  }

  const nextNodes = flowNodes.map((node) => ({ ...node, position: { ...node.position } }));
  const nextById = new Map(nextNodes.map((node) => [node.id, node]));

  for (const [targetId, parentIds] of parentIdsByTargetId) {
    if (parentIds.length < 2) continue;

    const parentNodes = parentIds
      .map((parentId) => nextById.get(parentId))
      .filter((node): node is Node => Boolean(node));

    if (parentNodes.length < 2) continue;

    const avgParentY =
      parentNodes.reduce((sum, node) => sum + node.position.y, 0) / parentNodes.length;
    const targetNode = nextById.get(targetId);
    if (!targetNode) continue;

    targetNode.position.y = avgParentY;
  }

  return nextNodes;
}

function orderAgentSiblingsByLane(
  flowNodes: Node[],
  flowEdges: DebateGraphEdge[],
  nodeMetaById: Map<string, { speakerType: DebateGraphNode['speakerType']; laneOrder: number }>,
): Node[] {
  const nextNodes = flowNodes.map((node) => ({ ...node, position: { ...node.position } }));
  const nodesById = new Map(nextNodes.map((node) => [node.id, node]));
  const childIdsByParentId = new Map<string, string[]>();

  for (const edge of flowEdges) {
    if (!nodesById.has(edge.fromNodeId) || !nodesById.has(edge.toNodeId)) continue;
    const childIds = childIdsByParentId.get(edge.fromNodeId) ?? [];
    childIds.push(edge.toNodeId);
    childIdsByParentId.set(edge.fromNodeId, childIds);
  }

  for (const childIds of childIdsByParentId.values()) {
    const agentChildren = childIds
      .map((id) => nodesById.get(id))
      .filter((node): node is Node => Boolean(node))
      .filter((node) => nodeMetaById.get(node.id)?.speakerType === 'agent');

    if (agentChildren.length < 2) continue;

    const laneOrdered = [...agentChildren].sort((a, b) => {
      const aOrder = nodeMetaById.get(a.id)?.laneOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = nodeMetaById.get(b.id)?.laneOrder ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

    const currentYSorted = [...agentChildren]
      .map((node) => node.position.y)
      .sort((a, b) => a - b);

    for (let i = 0; i < laneOrdered.length; i++) {
      const node = laneOrdered[i];
      const y = currentYSorted[i];
      if (node && y !== undefined) {
        node.position.y = y;
      }
    }
  }

  return nextNodes;
}

async function computeElkLayout(
  nodes: DebateGraphNode[],
  edges: DebateGraphEdge[],
): Promise<Map<string, { x: number; y: number }>> {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) return positions;

  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const layoutEdges = edges.filter(
    (edge) => nodeIdSet.has(edge.fromNodeId) && nodeIdSet.has(edge.toNodeId),
  );

  const elkGraph = {
    id: 'root',
    layoutOptions: ELK_LAYOUT_OPTIONS,
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: layoutEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.fromNodeId],
      targets: [edge.toNodeId],
    })),
  };

  try {
    const layout = await elk.layout(elkGraph);
    if (layout?.children) {
      for (const child of layout.children) {
        if (child.x !== undefined && child.y !== undefined) {
          positions.set(child.id, { x: child.x, y: child.y });
        }
      }
    }
  } catch (error) {
    console.error('ELK layout failed, using fallback grid:', error);
    return computeFallbackGridPositions(nodes.map((n) => n.id));
  }

  return positions;
}

export default function TopGraphStrip({
  graphNodes,
  graphEdges,
  resolveLane,
  laneConfigs,
  lanePersonalityNameById = {},
  openNodeIds = new Set<string>(),
  onOpenNodeTab,
}: TopGraphStripProps) {
  const autoOpenedFinalNodeIdsRef = useRef<Set<string>>(new Set());
  const graphNodeIdSet = useMemo(() => new Set(graphNodes.map((node) => node.id)), [graphNodes]);
  const activeOpenNodeIds = useMemo(
    () => new Set(Array.from(openNodeIds).filter((id) => graphNodeIdSet.has(id))),
    [graphNodeIdSet, openNodeIds],
  );

  const sortedNodes = useMemo(
    () =>
      [...graphNodes].sort((a, b) => {
        const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      }),
    [graphNodes],
  );

  const { mergedEdges, nodeDetails } = useMemo(() => {
    const nodesById = new Map(sortedNodes.map((node) => [node.id, node]));

    const edgeRelationKey = (edge: {
      fromNodeId: string;
      toNodeId: string;
      edgeType: DebateGraphEdge['edgeType'];
    }) => `${edge.fromNodeId}|${edge.toNodeId}|${edge.edgeType}`;

    const relationKeySet = new Set<string>();
    const pairKeySet = new Set<string>();
    const merged: DebateGraphEdge[] = [];

    for (const edge of graphEdges) {
      const key = edgeRelationKey(edge);
      const pairKey = `${edge.fromNodeId}|${edge.toNodeId}`;
      if (relationKeySet.has(key)) continue;
      relationKeySet.add(key);
      pairKeySet.add(pairKey);
      merged.push(edge);
    }

    for (const node of sortedNodes) {
      if (!node.parentNodeId) continue;
      const fallbackEdge: DebateGraphEdge = {
        id: `fallback-${node.parentNodeId}-${node.id}`,
        fromNodeId: node.parentNodeId,
        toNodeId: node.id,
        edgeType: 'spawned_by_orchestrator',
      };
      const pairKey = `${fallbackEdge.fromNodeId}|${fallbackEdge.toNodeId}`;
      if (pairKeySet.has(pairKey)) continue;
      const key = edgeRelationKey(fallbackEdge);
      if (relationKeySet.has(key)) continue;
      relationKeySet.add(key);
      pairKeySet.add(pairKey);
      merged.push(fallbackEdge);
    }

    const details: Record<string, WorkspaceNodeDetails> = {};
    for (const node of sortedNodes) {
      const laneId = resolveLane(node);
      const title = getNodeTitle(node);
      const laneLabel = laneConfigs.find((lane) => lane.id === laneId)?.label ?? 'Unknown';
      details[node.id] = {
        title,
        lane: laneLabel,
        content: node.content || (node.status === 'streaming' ? 'Streaming...' : 'No content'),
      };
    }

    return { mergedEdges: merged, nodeDetails: details };
  }, [sortedNodes, graphEdges, resolveLane, laneConfigs]);

  const [layoutPositions, setLayoutPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const layoutKey = useMemo(
    () =>
      `${sortedNodes.map((n) => n.id).join(',')}|${mergedEdges.map((e) => e.id).join(',')}`,
    [sortedNodes, mergedEdges],
  );

  useEffect(() => {
    let cancelled = false;
    computeElkLayout(sortedNodes, mergedEdges).then((positions) => {
      if (!cancelled) {
        setLayoutPositions(positions);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [layoutKey, sortedNodes, mergedEdges]);

  const flowNodes: Node<CompactGraphNodeData>[] = useMemo(() => {
    const fallbackPositions = computeFallbackGridPositions(sortedNodes.map((n) => n.id));
    const laneOrderById = new Map(laneConfigs.map((lane, index) => [lane.id, index]));
    const nodeMetaById = new Map<string, { speakerType: DebateGraphNode['speakerType']; laneOrder: number }>();

    const baseNodes = sortedNodes.map((node) => {
      const laneId = resolveLane(node);
      nodeMetaById.set(node.id, {
        speakerType: node.speakerType,
        laneOrder: laneOrderById.get(laneId) ?? Number.MAX_SAFE_INTEGER,
      });
      const laneColor = getLaneColor(laneId, laneConfigs);
      const laneLabel = laneConfigs.find((lane) => lane.id === laneId)?.label ?? 'UNK';
      const elkPos = layoutPositions.get(node.id);
      const fallbackPos = fallbackPositions.get(node.id)!;
      const position = elkPos ?? fallbackPos;
      const contentSnippet = (node.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
      const messageType = getNodeTitle(node);
      const title = node.speakerType === 'user' ? 'User' : laneLabel;
      const personality = node.speakerType === 'agent' || node.speakerType === 'orchestrator'
        ? lanePersonalityNameById[laneId] ?? 'No personality'
        : '—';
      const hoverText = `${title}\n${personality}\n${messageType}${contentSnippet ? `\n${contentSnippet}` : ''}`;

      return {
        id: node.id,
        type: 'compactNode',
        position,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          title,
          personality,
          messageType,
          laneColor,
          hoverText,
        },
        style: {
          background: 'oklch(0.15 0 0)',
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          border: node.status === 'streaming' ? `2px solid ${laneColor}` : '2px solid oklch(0.28 0 0)',
          borderRadius: '0px',
          padding: '0',
          cursor: 'pointer',
          boxShadow:
            node.status === 'streaming'
              ? `0 0 10px color-mix(in srgb, ${laneColor} 55%, transparent)`
              : 'none',
        },
      };
    });

    const laneOrderedNodes = orderAgentSiblingsByLane(baseNodes, mergedEdges, nodeMetaById);
    return centerMultiParentTargets(laneOrderedNodes, mergedEdges);
  }, [sortedNodes, layoutPositions, resolveLane, laneConfigs, lanePersonalityNameById, mergedEdges]);

  const flowEdges: Edge[] = useMemo(
    () =>
      mergedEdges
        .filter((edge) => graphNodeIdSet.has(edge.fromNodeId) && graphNodeIdSet.has(edge.toNodeId))
        .map((edge) => {
          const targetNode = graphNodes.find((n) => n.id === edge.toNodeId);
          return {
            id: edge.id,
            source: edge.fromNodeId,
            target: edge.toNodeId,
            type: 'smoothstep',
            animated: targetNode?.status === 'streaming',
            style: { stroke: 'oklch(0.28 0 0)' },
          };
        }),
    [mergedEdges, graphNodeIdSet, graphNodes],
  );

  const nodes = useMemo(
    () =>
      flowNodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          border: activeOpenNodeIds.has(node.id)
            ? '2px solid oklch(0.6 0 0)'
            : node.style?.border || '2px solid oklch(0.28 0 0)',
          boxShadow: activeOpenNodeIds.has(node.id)
            ? '0 0 12px oklch(0.6 0 0 / 0.3)'
            : node.style?.boxShadow || 'none',
        },
      })),
    [activeOpenNodeIds, flowNodes],
  );

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      const details = nodeDetails[node.id];
      if (!details) return;
      onOpenNodeTab?.(node.id, details);
    },
    [nodeDetails, onOpenNodeTab],
  );

  useEffect(() => {
    if (!onOpenNodeTab) return;

    const latestCompletedFinalNode = [...graphNodes]
      .filter((node) => node.nodeType === 'final' && node.status === 'complete')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .at(-1);

    if (!latestCompletedFinalNode) return;
    if (autoOpenedFinalNodeIdsRef.current.has(latestCompletedFinalNode.id)) return;

    const details = nodeDetails[latestCompletedFinalNode.id];
    if (!details) return;

    onOpenNodeTab(latestCompletedFinalNode.id, details);
    autoOpenedFinalNodeIdsRef.current.add(latestCompletedFinalNode.id);
  }, [graphNodes, nodeDetails, onOpenNodeTab]);

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
    <div className="absolute inset-0 bg-card">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        preventScrolling
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        style={FLOW_STYLE}
      >
        <Background color="oklch(0.22 0 0)" gap={16} />
      </ReactFlow>
    </div>
  );
}
