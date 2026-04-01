import { v4 as uuid } from "uuid";
import { db } from "../../db/client.js";
import { debates, debateBranches, nodes, edges, runs } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { runDebate } from "./engine.js";
import { emitDebateEvent } from "../events.js";
import type { RunPhase } from "../../types.js";

// Determine which phase a node belongs to based on metadata/position
async function determineNodePhase(nodeId: string, debateId: string, branchId: string): Promise<RunPhase> {
  // Walk up the node chain and count the depth to determine the phase
  // Simple heuristic: look at the node type and position
  const [node] = await db.select().from(nodes).where(eq(nodes.id, nodeId));
  if (!node) return "opening";

  // Check metadata for phase info
  if (node.metadataJson) {
    try {
      const meta = JSON.parse(node.metadataJson);
      if (meta.phase) return meta.phase as RunPhase;
    } catch {}
  }

  // Default: start from opening
  return "opening";
}

export async function regenerateFromNode(
  nodeId: string,
  reason?: string,
  branchLabel?: string,
): Promise<{ branchId: string; runId: string }> {
  const [node] = await db.select().from(nodes).where(eq(nodes.id, nodeId));
  if (!node) throw new Error(`Node ${nodeId} not found`);

  const [debate] = await db.select().from(debates).where(eq(debates.id, node.debateId));
  if (!debate) throw new Error(`Debate ${node.debateId} not found`);

  const now = new Date().toISOString();
  const newBranchId = uuid();
  const newRunId = uuid();
  const regenRootNodeId = uuid();

  // Create the regen_root node in the new branch
  await db.insert(nodes)
    .values({
      id: regenRootNodeId,
      debateId: node.debateId,
      branchId: newBranchId,
      parentNodeId: nodeId,
      speakerType: "system",
      speakerId: null,
      nodeType: "regen_root",
      content: reason ?? "Regeneration started from this point",
      status: "complete",
      metadataJson: JSON.stringify({ originalBranchId: node.branchId, reason }),
      createdAt: now,
    });

  // Create new branch
  await db.insert(debateBranches)
    .values({
      id: newBranchId,
      debateId: node.debateId,
      parentBranchId: node.branchId,
      rootNodeId: regenRootNodeId,
      label: branchLabel ?? `Branch from regeneration`,
      isActive: true,
      createdAt: now,
    });

  // Deactivate old branch
  await db.update(debateBranches)
    .set({ isActive: false })
    .where(eq(debateBranches.id, node.branchId));

  // Create regenerated_from edge
  await db.insert(edges)
    .values({
      id: uuid(),
      debateId: node.debateId,
      branchId: newBranchId,
      fromNodeId: nodeId,
      toNodeId: regenRootNodeId,
      edgeType: "regenerated_from",
      createdAt: now,
    });

  // Determine which phase to restart from
  const startPhase = await determineNodePhase(nodeId, node.debateId, node.branchId);

  // Create new run
  await db.insert(runs)
    .values({
      id: newRunId,
      debateId: node.debateId,
      branchId: newBranchId,
      phase: startPhase,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

  // Update debate to point to new branch
  await db.update(debates)
    .set({ activeBranchId: newBranchId, status: "running", updatedAt: now })
    .where(eq(debates.id, node.debateId));

  // Run the debate asynchronously from the regeneration point
  runDebate(node.debateId, newRunId).catch((err) => {
    console.error("Regeneration run failed:", err);
  });

  return { branchId: newBranchId, runId: newRunId };
}
