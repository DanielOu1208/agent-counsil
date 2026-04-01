'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, { 
  Node, 
  Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { mockNodes, mockEdges } from '@/lib/mockData';

interface TopGraphStripProps {
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}

export default function TopGraphStrip({ selectedNode, onNodeSelect }: TopGraphStripProps) {
  // Use memoized nodes with selection highlight
  const nodes = useMemo(() => {
    return mockNodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        border: selectedNode === node.id 
          ? '2px solid #89b4fa' 
          : node.style?.border || '2px solid #2a2a34',
        boxShadow: selectedNode === node.id 
          ? '0 0 12px rgba(137, 180, 250, 0.4)' 
          : 'none',
      },
    }));
  }, [selectedNode]);

  const edges = useMemo(() => {
    return mockEdges;
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id === selectedNode ? null : node.id);
    },
    [selectedNode, onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Handle empty data gracefully
  if (mockNodes.length === 0) {
    return (
      <div className="h-[38vh] bg-[#111116] border-b border-[#1e1e24] flex items-center justify-center sticky top-0 z-10">
        <p className="text-gray-500">No graph data available</p>
      </div>
    );
  }

  return (
    <div className="h-[38vh] bg-[#111116] border-b border-[#1e1e24] sticky top-0 z-10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
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
        style={{ background: '#111116' }}
      >
        <Background color="#1e1e24" gap={16} />
      </ReactFlow>
    </div>
  );
}
