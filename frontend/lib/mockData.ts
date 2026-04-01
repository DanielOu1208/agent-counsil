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
      background: 'oklch(0.14 0.008 270)',
      color: 'oklch(0.84 0.006 270)',
      border: '2px solid oklch(0.25 0.012 270)',
      borderRadius: '0px',
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
      background: 'oklch(0.14 0.008 270)',
      color: 'oklch(0.72 0.14 270)',
      border: '2px solid oklch(0.25 0.012 270)',
      borderRadius: '0px',
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
      background: 'oklch(0.14 0.008 270)',
      color: 'oklch(0.78 0.14 160)',
      border: '2px solid oklch(0.25 0.012 270)',
      borderRadius: '0px',
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
      background: 'oklch(0.14 0.008 270)',
      color: 'oklch(0.82 0.14 90)',
      border: '2px solid oklch(0.25 0.012 270)',
      borderRadius: '0px',
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
      background: 'oklch(0.14 0.008 270)',
      color: 'oklch(0.78 0.14 330)',
      border: '2px solid oklch(0.25 0.012 270)',
      borderRadius: '0px',
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: 500,
    },
  },
];

// Deterministic mock edges for the debate graph
export const mockEdges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: false, style: { stroke: 'oklch(0.25 0.012 270)' } },
  { id: 'e1-3', source: 'node-1', target: 'node-3', animated: false, style: { stroke: 'oklch(0.25 0.012 270)' } },
  { id: 'e2-4', source: 'node-2', target: 'node-4', animated: false, style: { stroke: 'oklch(0.25 0.012 270)' } },
  { id: 'e3-4', source: 'node-3', target: 'node-4', animated: false, style: { stroke: 'oklch(0.25 0.012 270)' } },
  { id: 'e4-5', source: 'node-4', target: 'node-5', animated: true, style: { stroke: 'oklch(0.72 0.14 270)' } },
];

// Mock reasoning messages for lanes
export const mockReasoningTexts: Record<string, string> = {
  orchestrator: 'Coordinating the debate flow. Waiting for arguments from both sides before synthesizing key points.',
  'debater-a': 'Building the primary argument based on logical consistency. The premise holds that rational analysis leads to better outcomes.',
  'debater-b': 'Challenging assumptions. The counter-argument rests on empirical evidence suggesting alternative interpretations.',
  'debater-c': 'Synthesizing perspectives. Both arguments have merit, but the synthesis reveals a third path forward.',
};

// Mock conversation content for each graph node
export const nodeConversations: Record<string, { title: string; lane: string; content: string }> = {
  'node-1': {
    title: 'Initial Question',
    lane: 'Orchestrator',
    content: 'Let us begin by posing the central question: What principles should guide decision-making in complex scenarios? This debate will explore multiple perspectives to arrive at a balanced synthesis.',
  },
  'node-2': {
    title: 'Argument A',
    lane: 'Debater A',
    content: 'From a logical consistency standpoint, I argue that rational analysis and systematic evaluation lead to better outcomes. The evidence shows that structured approaches reduce cognitive bias and improve decision quality.',
  },
  'node-3': {
    title: 'Argument B',
    lane: 'Debater B',
    content: 'I challenge the assumption that pure rationality is sufficient. Empirical studies reveal that contextual factors, emotional intelligence, and adaptive thinking often produce superior results in real-world scenarios.',
  },
  'node-4': {
    title: 'Synthesis',
    lane: 'Debater C',
    content: 'Synthesizing both perspectives, I observe that neither pure rationality nor pure intuition alone suffices. The optimal approach integrates systematic analysis with contextual awareness and adaptive judgment.',
  },
  'node-5': {
    title: 'Conclusion',
    lane: 'Orchestrator',
    content: 'The debate reveals a clear path forward: effective decision-making requires a hybrid approach. We recommend structured frameworks supplemented by contextual flexibility and continuous learning.',
  },
};

// Empty fallback data
export const emptyNodes: Node[] = [];
export const emptyEdges: Edge[] = [];