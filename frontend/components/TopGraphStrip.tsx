'use client';

import { useCallback, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import ReactFlow, { Background, Edge, Node, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { MessageSquare } from 'lucide-react';
import { DebateGraphEdge, DebateGraphNode, LaneConfig, LaneId, WorkspaceNodeDetails } from '@/types/ui';

interface TopGraphStripProps {
  graphNodes: DebateGraphNode[];
  graphEdges: DebateGraphEdge[];
  resolveLane: (node: DebateGraphNode) => LaneId;
  laneConfigs: LaneConfig[];
  openNodeIds?: Set<string>;
  onOpenNodeTab?: (nodeId: string, details: WorkspaceNodeDetails) => void;
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

function getNodeLabel(node: DebateGraphNode): string {
  return node.status === 'streaming' ? `${getNodeTitle(node)} •` : getNodeTitle(node);
}

export default function TopGraphStrip({
  graphNodes,
  graphEdges,
  resolveLane,
  laneConfigs,
  openNodeIds = new Set<string>(),
  onOpenNodeTab,
}: TopGraphStripProps) {
  const autoOpenedFinalNodeIdsRef = useRef<Set<string>>(new Set());
  const graphNodeIdSet = useMemo(() => new Set(graphNodes.map((node) => node.id)), [graphNodes]);
  const activeOpenNodeIds = useMemo(
    () => new Set(Array.from(openNodeIds).filter((id) => graphNodeIdSet.has(id))),
    [graphNodeIdSet, openNodeIds],
  );

  const { flowNodes, flowEdges, nodeDetails } = useMemo(() => {
    const sortedNodes = [...graphNodes].sort((a, b) => {
      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    const nodesById = new Map(sortedNodes.map((node) => [node.id, node]));
    const laneRowIndex = new Map(laneConfigs.map((lane, index) => [lane.id, index]));

    const edgeRelationKey = (edge: {
      fromNodeId: string;
      toNodeId: string;
      edgeType: DebateGraphEdge['edgeType'];
    }) => `${edge.fromNodeId}|${edge.toNodeId}|${edge.edgeType}`;

    const relationKeySet = new Set<string>();
    const pairKeySet = new Set<string>();
    const mergedEdges: DebateGraphEdge[] = [];

    for (const edge of graphEdges) {
      const key = edgeRelationKey(edge);
      const pairKey = `${edge.fromNodeId}|${edge.toNodeId}`;
      if (relationKeySet.has(key)) continue;
      relationKeySet.add(key);
      pairKeySet.add(pairKey);
      mergedEdges.push(edge);
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
      mergedEdges.push(fallbackEdge);
    }

    const parentsByNodeId = new Map<string, string[]>();
    for (const edge of mergedEdges) {
      const list = parentsByNodeId.get(edge.toNodeId) ?? [];
      list.push(edge.fromNodeId);
      parentsByNodeId.set(edge.toNodeId, list);
    }

    const columnByNodeId = new Map<string, number>();
    for (const node of sortedNodes) {
      const parentIds = (parentsByNodeId.get(node.id) ?? []).filter((parentId) =>
        columnByNodeId.has(parentId),
      );
      const column =
        parentIds.length > 0
          ? Math.max(...parentIds.map((parentId) => (columnByNodeId.get(parentId) ?? 0) + 1))
          : 0;
      columnByNodeId.set(node.id, column);
    }

    const laneColumnOffsets = new Map<string, number>();
    const nextFlowNodes: Node[] = [];
    const details: Record<string, WorkspaceNodeDetails> = {};
    const nodeOrderById = new Map(sortedNodes.map((node, index) => [node.id, index]));

    for (const node of sortedNodes) {
      const laneId = resolveLane(node);
      const laneIndex = laneRowIndex.get(laneId) ?? 0;
      const column = columnByNodeId.get(node.id) ?? 0;

      const laneColumnKey = `${laneId}:${column}`;
      const offsetInLaneColumn = laneColumnOffsets.get(laneColumnKey) ?? 0;
      laneColumnOffsets.set(laneColumnKey, offsetInLaneColumn + 1);

      const title = getNodeTitle(node);
      const laneLabel = laneConfigs.find((lane) => lane.id === laneId)?.label ?? 'Unknown';
      const laneColor = getLaneColor(laneId, laneConfigs);
      details[node.id] = {
        title,
        lane: laneLabel,
        content: node.content || (node.status === 'streaming' ? 'Streaming...' : 'No content'),
      };

      nextFlowNodes.push({
        id: node.id,
        type: 'default',
        position: {
          x: 90 + column * 320,
          y: 50 + laneIndex * 185 + offsetInLaneColumn * 38,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { label: getNodeLabel(node) },
        style: {
          background: 'oklch(0.15 0 0)',
          color: laneColor,
          border:
            node.status === 'streaming' ? `2px solid ${laneColor}` : '2px solid oklch(0.28 0 0)',
          borderRadius: '0px',
          padding: '10px 15px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow:
            node.status === 'streaming'
              ? `0 0 10px color-mix(in srgb, ${laneColor} 55%, transparent)`
              : 'none',
        },
      });
    }

    const flowNodeById = new Map(nextFlowNodes.map((node) => [node.id, node]));
    const childrenByParentId = new Map<string, string[]>();

    for (const edge of mergedEdges) {
      if (!nodesById.has(edge.fromNodeId) || !nodesById.has(edge.toNodeId)) continue;
      const children = childrenByParentId.get(edge.fromNodeId) ?? [];
      children.push(edge.toNodeId);
      childrenByParentId.set(edge.fromNodeId, children);
    }

    const qualifyingParents = Array.from(childrenByParentId.entries())
      .filter(([, childIds]) => {
        const agentChildCount = childIds.filter(
          (childId) => nodesById.get(childId)?.speakerType === 'agent',
        ).length;
        return agentChildCount >= 2;
      })
      .map(([parentId]) => parentId)
      .sort((leftParentId, rightParentId) => {
        const leftColumn = columnByNodeId.get(leftParentId) ?? 0;
        const rightColumn = columnByNodeId.get(rightParentId) ?? 0;
        if (leftColumn !== rightColumn) return leftColumn - rightColumn;

        const leftOrder = nodeOrderById.get(leftParentId) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = nodeOrderById.get(rightParentId) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;

        return leftParentId.localeCompare(rightParentId);
      });

    for (const parentId of qualifyingParents) {
      const parentNode = flowNodeById.get(parentId);
      if (!parentNode) continue;

      const agentChildren = (childrenByParentId.get(parentId) ?? [])
        .filter((childId) => nodesById.get(childId)?.speakerType === 'agent')
        .map((childId) => flowNodeById.get(childId))
        .filter((childNode): childNode is Node => Boolean(childNode));

      if (agentChildren.length < 2) continue;

      const minChildY = Math.min(...agentChildren.map((childNode) => childNode.position.y));
      const yShift = parentNode.position.y - minChildY;
      if (yShift === 0) continue;

      for (const childNode of agentChildren) {
        childNode.position = {
          ...childNode.position,
          y: childNode.position.y + yShift,
        };
      }
    }

    const nextFlowEdges: Edge[] = mergedEdges
      .filter((edge) => nodesById.has(edge.fromNodeId) && nodesById.has(edge.toNodeId))
      .map((edge) => {
        const targetNode = nodesById.get(edge.toNodeId);
        return {
          id: edge.id,
          source: edge.fromNodeId,
          target: edge.toNodeId,
          type: 'straight',
          animated: targetNode?.status === 'streaming',
          style: { stroke: 'oklch(0.28 0 0)' },
        };
      });

    return { flowNodes: nextFlowNodes, flowEdges: nextFlowEdges, nodeDetails: details };
  }, [graphNodes, graphEdges, resolveLane, laneConfigs]);

  const nodes = useMemo(() => {
    return flowNodes.map((node) => ({
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
    }));
  }, [activeOpenNodeIds, flowNodes]);

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
