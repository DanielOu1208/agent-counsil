import { Node, Edge } from 'reactflow';

export interface DebateNode {
  id: string;
  label: string;
  type: 'question' | 'argument' | 'synthesis' | 'conclusion';
}

export interface DebateEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// Deterministic mock nodes for the debate graph
export const mockNodes: Node[] = [
  {
    id: 'node-1',
    type: 'default',
    position: { x: 100, y: 50 },
    data: { label: 'Initial Question' },
    style: {
      background: '#111116',
      color: '#d4d4d8',
      border: '2px solid #2a2a34',
      borderRadius: '8px',
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: 500,
    },
  },
  {
    id: 'node-2',
    type: 'default',
    position: { x: 300, y: 50 },
    data: { label: 'Argument A' },
    style: {
      background: '#111116',
      color: '#89b4fa',
      border: '2px solid #2a2a34',
      borderRadius: '8px',
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: 500,
    },
  },
  {
    id: 'node-3',
    type: 'default',
    position: { x: 300, y: 130 },
    data: { label: 'Argument B' },
    style: {
      background: '#111116',
      color: '#a6e3a1',
      border: '2px solid #2a2a34',
      borderRadius: '8px',
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: 500,
    },
  },
  {
    id: 'node-4',
    type: 'default',
    position: { x: 500, y: 90 },
    data: { label: 'Synthesis' },
    style: {
      background: '#111116',
      color: '#f9e2af',
      border: '2px solid #2a2a34',
      borderRadius: '8px',
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: 500,
    },
  },
  {
    id: 'node-5',
    type: 'default',
    position: { x: 700, y: 90 },
    data: { label: 'Conclusion' },
    style: {
      background: '#111116',
      color: '#f5c2e7',
      border: '2px solid #2a2a34',
      borderRadius: '8px',
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: 500,
    },
  },
];

// Deterministic mock edges for the debate graph
export const mockEdges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: false, style: { stroke: '#2a2a34' } },
  { id: 'e1-3', source: 'node-1', target: 'node-3', animated: false, style: { stroke: '#2a2a34' } },
  { id: 'e2-4', source: 'node-2', target: 'node-4', animated: false, style: { stroke: '#2a2a34' } },
  { id: 'e3-4', source: 'node-3', target: 'node-4', animated: false, style: { stroke: '#2a2a34' } },
  { id: 'e4-5', source: 'node-4', target: 'node-5', animated: true, style: { stroke: '#89b4fa' } },
];

// Mock reasoning messages for lanes
export const mockReasoningTexts: Record<string, string> = {
  orchestrator: 'Coordinating the debate flow. Waiting for arguments from both sides before synthesizing key points.',
  'debater-a': 'Building the primary argument based on logical consistency. The premise holds that rational analysis leads to better outcomes.',
  'debater-b': 'Challenging assumptions. The counter-argument rests on empirical evidence suggesting alternative interpretations.',
  'debater-c': 'Synthesizing perspectives. Both arguments have merit, but the synthesis reveals a third path forward.',
};

// Empty fallback data
export const emptyNodes: Node[] = [];
export const emptyEdges: Edge[] = [];