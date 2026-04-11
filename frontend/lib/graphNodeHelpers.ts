/**
 * Get a human-readable title for a graph node.
 * @param nodeType - The type of the node (final, summary, intervention, regen_root, message)
 * @param speakerType - The speaker type (user, orchestrator, agent, system)
 */
export function getNodeTitle(nodeType: string, speakerType: string): string {
  if (nodeType === 'final') return 'Final Answer';
  if (nodeType === 'summary') return 'Summary';
  if (nodeType === 'intervention') return 'Intervention';
  if (nodeType === 'regen_root') return 'Regeneration Root';
  if (speakerType === 'user') return 'User Prompt';
  if (speakerType === 'orchestrator') return 'Orchestrator';
  if (speakerType === 'system') return 'System';
  return 'Agent Message';
}