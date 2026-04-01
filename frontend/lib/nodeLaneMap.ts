import { LaneId } from '@/types/ui';

// Maps graph nodes to their corresponding reasoning lanes
// This allows highlighting the right lane when a node is selected
export const nodeToLaneMap: Record<string, LaneId | null> = {
  'node-1': 'orchestrator', // Initial question -> orchestrator
  'node-2': 'debater-a',    // Argument A -> debater-a
  'node-3': 'debater-b',    // Argument B -> debater-b
  'node-4': 'debater-c',    // Synthesis -> debater-c
  'node-5': 'orchestrator', // Conclusion -> orchestrator
};

// Gets the lane ID for a given node ID, returns null if not mapped
export function getLaneForNode(nodeId: string): LaneId | null {
  return nodeToLaneMap[nodeId] ?? null;
}

// Gets all node IDs for a given lane
export function getNodesForLane(laneId: LaneId): string[] {
  return Object.entries(nodeToLaneMap)
    .filter((entry) => entry[1] === laneId)
    .map((entry) => entry[0]);
}
