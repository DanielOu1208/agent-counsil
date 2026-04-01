import { db } from "../../db/client.js";
import { debates, runs, nodes, agents } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { emitDebateEvent } from "../events.js";
import { v4 as uuid } from "uuid";
import {
  runOpeningPhase,
  runFinalPhase,
  runContinuationOpeningPhase,
  runContinuationFinalPhase,
} from "./phases.js";
import type { RunPhase, RunStatus } from "../../types.js";

async function updateRunPhase(runId: string, phase: RunPhase, status: RunStatus) {
  await db.update(runs)
    .set({ phase, status, updatedAt: new Date().toISOString() })
    .where(eq(runs.id, runId));
}

export async function runDebate(debateId: string, runId: string): Promise<void> {
  const [debate] = await db.select().from(debates).where(eq(debates.id, debateId));
  if (!debate) throw new Error(`Debate ${debateId} not found`);

  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) throw new Error(`Run ${runId} not found`);

  const branchId = run.branchId;
  const goal = debate.goal;

  // Update debate status to running
  await db.update(debates)
    .set({ status: "running", updatedAt: new Date().toISOString() })
    .where(eq(debates.id, debateId));

  const phaseParams = { debateId, branchId, runId, goal };

  try {
    // ── Phase 1: Opening ──────────────────────────────────
    await updateRunPhase(runId, "opening", "running");
    emitDebateEvent(debateId, {
      type: "phase:changed",
      data: { phase: "opening", runId },
    });

    const openingResults = await runOpeningPhase(phaseParams);

    if (openingResults.length === 0) {
      throw new Error("No agents completed the opening phase");
    }

    // ── Phase 2: Final Synthesis ──────────────────────────
    await updateRunPhase(runId, "final", "running");
    emitDebateEvent(debateId, {
      type: "phase:changed",
      data: { phase: "final", runId },
    });

    const finalResult = await runFinalPhase(phaseParams, openingResults);

    // ── Mark completed ────────────────────────────────────
    await updateRunPhase(runId, "final", "completed");

    await db.update(debates)
      .set({
        status: "completed",
        finalAnswerNodeId: finalResult.nodeId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(debates.id, debateId));

    emitDebateEvent(debateId, {
      type: "run:complete",
      data: { runId, debateId },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Debate ${debateId} failed:`, errMsg);
    if (error instanceof Error && error.stack) console.error(error.stack);

    await updateRunPhase(runId, run.phase as RunPhase, "errored");

    await db.update(debates)
      .set({ status: "errored", updatedAt: new Date().toISOString() })
      .where(eq(debates.id, debateId));

    emitDebateEvent(debateId, {
      type: "run:error",
      data: { runId, error: errMsg },
    });
  }
}

// ─── Continue Debate ──────────────────────────────────────
export async function continueDebate(
  debateId: string,
  runId: string,
  userPrompt: string,
): Promise<void> {
  const [debate] = await db.select().from(debates).where(eq(debates.id, debateId));
  if (!debate) throw new Error(`Debate ${debateId} not found`);

  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) throw new Error(`Run ${runId} not found`);

  const branchId = run.branchId;
  const goal = debate.goal;

  // Gather prior context: agent opening positions and the latest synthesis
  const debateAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.debateId, debateId))
    .orderBy(agents.displayOrder);

  const allNodes = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.debateId, debateId), eq(nodes.branchId, branchId), eq(nodes.status, "complete")));

  // Find the latest final synthesis node
  const finalNodes = allNodes.filter((n) => n.nodeType === "final");
  const latestFinal = finalNodes[finalNodes.length - 1];
  const priorSynthesis = latestFinal?.content ?? "";

  // Find agent positions from the most recent round (nodes that are agent messages)
  const agentNodes = allNodes.filter((n) => n.speakerType === "agent" && n.nodeType === "message");
  const priorPositions: { agentName: string; content: string }[] = [];
  for (const node of agentNodes) {
    const agent = debateAgents.find((a) => a.id === node.speakerId);
    if (agent) {
      priorPositions.push({ agentName: agent.name, content: node.content ?? "" });
    }
  }

  // Update debate status to running
  await db.update(debates)
    .set({ status: "running", updatedAt: new Date().toISOString() })
    .where(eq(debates.id, debateId));

  const phaseParams = { debateId, branchId, runId, goal };

  try {
    // Create user follow-up node
    const userNodeId = uuid();
    const now = new Date().toISOString();
    const parentNodeId = latestFinal?.id ?? null;

    await db.insert(nodes)
      .values({
        id: userNodeId,
        debateId,
        branchId,
        parentNodeId,
        speakerType: "user",
        speakerId: null,
        nodeType: "message",
        content: userPrompt,
        status: "complete",
        metadataJson: JSON.stringify({ isFollowUp: true }),
        createdAt: now,
      });

    emitDebateEvent(debateId, {
      type: "node:created",
      data: {
        nodeId: userNodeId,
        speakerType: "user",
        speakerId: undefined,
        nodeType: "message",
        parentNodeId: parentNodeId ?? undefined,
        createdAt: now,
      },
    });

    emitDebateEvent(debateId, {
      type: "node:complete",
      data: { nodeId: userNodeId, content: userPrompt },
    });

    // ── Phase 1: Continuation Opening ──────────────────────
    await updateRunPhase(runId, "opening", "running");
    emitDebateEvent(debateId, {
      type: "phase:changed",
      data: { phase: "opening", runId },
    });

    const continuationResults = await runContinuationOpeningPhase(
      phaseParams,
      userPrompt,
      userNodeId,
      priorPositions,
      priorSynthesis,
    );

    if (continuationResults.length === 0) {
      throw new Error("No agents completed the continuation phase");
    }

    // ── Phase 2: Continuation Synthesis ────────────────────
    await updateRunPhase(runId, "final", "running");
    emitDebateEvent(debateId, {
      type: "phase:changed",
      data: { phase: "final", runId },
    });

    const finalResult = await runContinuationFinalPhase(
      phaseParams,
      userPrompt,
      priorSynthesis,
      continuationResults,
    );

    // ── Mark completed ────────────────────────────────────
    await updateRunPhase(runId, "final", "completed");

    await db.update(debates)
      .set({
        status: "completed",
        finalAnswerNodeId: finalResult.nodeId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(debates.id, debateId));

    emitDebateEvent(debateId, {
      type: "run:complete",
      data: { runId, debateId },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Debate continuation ${debateId} failed:`, errMsg);
    if (error instanceof Error && error.stack) console.error(error.stack);

    await updateRunPhase(runId, run.phase as RunPhase, "errored");

    await db.update(debates)
      .set({ status: "errored", updatedAt: new Date().toISOString() })
      .where(eq(debates.id, debateId));

    emitDebateEvent(debateId, {
      type: "run:error",
      data: { runId, error: errMsg },
    });
  }
}
