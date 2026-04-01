import { db } from "../../db/client.js";
import { debates, runs } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { emitDebateEvent } from "../events.js";
import {
  runOpeningPhase,
  runCritiquePhase,
  runConvergencePhase,
  runFinalPhase,
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

    // ── Phase 2: Critique ─────────────────────────────────
    await updateRunPhase(runId, "critique", "running");
    emitDebateEvent(debateId, {
      type: "phase:changed",
      data: { phase: "critique", runId },
    });

    const critiqueResults = await runCritiquePhase(phaseParams, openingResults);

    // ── Phase 3: Convergence ──────────────────────────────
    await updateRunPhase(runId, "convergence", "running");
    emitDebateEvent(debateId, {
      type: "phase:changed",
      data: { phase: "convergence", runId },
    });

    const convergenceResults = await runConvergencePhase(phaseParams, critiqueResults);

    // ── Phase 4: Final Synthesis ──────────────────────────
    await updateRunPhase(runId, "final", "running");
    emitDebateEvent(debateId, {
      type: "phase:changed",
      data: { phase: "final", runId },
    });

    const finalResult = await runFinalPhase(phaseParams, convergenceResults);

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
