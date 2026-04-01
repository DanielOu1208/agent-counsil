import { v4 as uuid } from "uuid";
import { db } from "../../db/client.js";
import { debates, nodes, edges, runs, agents } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { emitDebateEvent } from "../events.js";
import { executeAgentJob } from "./jobs.js";
import { buildOpeningContext } from "./context.js";
import { interventionInjectionPrompt, personalityToSystemPrompt } from "./prompts.js";
import type { InterventionType, AgentPersonality } from "../../types.js";

interface InterventionParams {
  debateId: string;
  interventionType: InterventionType;
  instruction: string;
  nodeId?: string;       // optional: node context for the intervention
  targetAgentId?: string; // for "ask_agent_to_reconsider"
}

export async function handleIntervention(params: InterventionParams): Promise<{ nodeId: string }> {
  const { debateId, interventionType, instruction, nodeId, targetAgentId } = params;
  const now = new Date().toISOString();

  const [debate] = await db.select().from(debates).where(eq(debates.id, debateId));
  if (!debate) throw new Error(`Debate ${debateId} not found`);

  // Find the active run
  const allRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.debateId, debateId));
  const activeRun = allRuns.find((r) => r.status === "running" || r.status === "pending");

  // Create intervention node
  const interventionNodeId = uuid();
  await db.insert(nodes)
    .values({
      id: interventionNodeId,
      debateId,
      branchId: debate.activeBranchId ?? "",
      parentNodeId: nodeId ?? null,
      speakerType: "user",
      speakerId: null,
      nodeType: "intervention",
      content: `[${interventionType}] ${instruction}`,
      status: "complete",
      metadataJson: JSON.stringify({ interventionType, targetAgentId }),
      createdAt: now,
    });

  emitDebateEvent(debateId, {
    type: "node:created",
    data: {
      nodeId: interventionNodeId,
      speakerType: "user",
      nodeType: "intervention",
      parentNodeId: nodeId,
    },
  });

  // Handle force_finalize: skip to final phase
  if (interventionType === "force_finalize" && activeRun) {
    await db.update(runs)
      .set({ phase: "final", updatedAt: now })
      .where(eq(runs.id, activeRun.id));

    emitDebateEvent(debateId, {
      type: "phase:changed",
      data: { phase: "final", runId: activeRun.id },
    });
  }

  // Handle ask_agent_to_reconsider: create a new job for specific agent
  if (interventionType === "ask_agent_to_reconsider" && targetAgentId && activeRun) {
    const [agent] = await db.select().from(agents).where(eq(agents.id, targetAgentId));
    if (agent) {
      const personality: AgentPersonality = JSON.parse(agent.personalityJson);
      const messages = [
        { role: "system" as const, content: personalityToSystemPrompt(personality) },
        {
          role: "user" as const,
          content: interventionInjectionPrompt(interventionType, instruction),
        },
      ];

      // Fire and forget — the job will emit its own events
      executeAgentJob({
        runId: activeRun.id,
        debateId,
        branchId: debate.activeBranchId ?? "",
        agentId: agent.id,
        agentName: agent.name,
        modelKey: agent.modelKey,
        messages,
        speakerType: "agent",
        nodeType: "message",
        parentNodeId: interventionNodeId,
        edgeType: "responds_to",
      }).catch((err) => console.error("Intervention job failed:", err));
    }
  }

  return { nodeId: interventionNodeId };
}
