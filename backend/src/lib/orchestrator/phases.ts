import { v4 as uuid } from "uuid";
import { db } from "../../db/client.js";
import { agents, nodes, edges, debateBranches, debates } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { executeAgentJob, type JobResult } from "./jobs.js";
import { emitDebateEvent } from "../events.js";
import { DEFAULT_MODEL_KEY } from "../models/registry.js";
import {
  buildOpeningContext,
  buildCritiqueContext,
  buildConvergenceContext,
  buildSynthesisContext,
  buildContinuationOpeningContext,
  buildContinuationSynthesisContext,
} from "./context.js";

interface PhaseParams {
  debateId: string;
  branchId: string;
  runId: string;
  goal: string;
}

// Get all agents in a debate
async function getDebateAgents(debateId: string) {
  return db
    .select()
    .from(agents)
    .where(eq(agents.debateId, debateId))
    .orderBy(agents.displayOrder);
}

async function getSynthesisModelKey(debateId: string): Promise<string> {
  const [debate] = await db
    .select({ orchestratorModelKey: debates.orchestratorModelKey })
    .from(debates)
    .where(eq(debates.id, debateId));

  return debate?.orchestratorModelKey ?? DEFAULT_MODEL_KEY;
}

// Get nodes by branch and type metadata
async function getBranchNodes(debateId: string, branchId: string) {
  return db
    .select()
    .from(nodes)
    .where(and(eq(nodes.debateId, debateId), eq(nodes.branchId, branchId), eq(nodes.status, "complete")));
}

function collectSuccessfulResults(
  results: PromiseSettledResult<JobResult>[],
  phaseName: string,
): JobResult[] {
  const successful: JobResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      console.error(`${phaseName} job failed:`, result.reason);
    }
  }

  return successful;
}

async function buildAgentPositionsFromResults(
  results: JobResult[],
  debateAgents: { id: string; name: string }[],
): Promise<{ agentName: string; content: string }[]> {
  const positions: { agentName: string; content: string }[] = [];

  for (const result of results) {
    const [node] = await db.select().from(nodes).where(eq(nodes.id, result.nodeId));
    if (!node?.speakerId) continue;

    const agent = debateAgents.find((a) => a.id === node.speakerId);
    if (agent) {
      positions.push({ agentName: agent.name, content: result.content });
    }
  }

  return positions;
}

// ─── Opening Phase ─────────────────────────────────────────
export async function runOpeningPhase(params: PhaseParams): Promise<JobResult[]> {
  const { debateId, branchId, runId, goal } = params;
  const debateAgents = await getDebateAgents(debateId);

  const [branch] = await db
    .select()
    .from(debateBranches)
    .where(eq(debateBranches.id, branchId));
  const branchRootNodeId = branch?.rootNodeId ?? null;

  // Create root orchestrator node for this phase
  const rootNodeId = uuid();
  const now = new Date().toISOString();
  await db.insert(nodes)
    .values({
      id: rootNodeId,
      debateId,
      branchId,
      parentNodeId: branchRootNodeId,
      speakerType: "orchestrator",
      speakerId: null,
      nodeType: "message",
      content: `Opening phase: Each agent provides their independent recommendation on "${goal}"`,
      status: "complete",
      createdAt: now,
    });

  if (branchRootNodeId) {
    const edgeId = uuid();
    await db.insert(edges)
      .values({
        id: edgeId,
        debateId,
        branchId,
        fromNodeId: branchRootNodeId,
        toNodeId: rootNodeId,
        edgeType: "spawned_by_orchestrator",
        createdAt: now,
      });

    emitDebateEvent(debateId, {
      type: "edge:created",
      data: {
        edgeId,
        fromNodeId: branchRootNodeId,
        toNodeId: rootNodeId,
        edgeType: "spawned_by_orchestrator",
      },
    });
  }

  // Emit node:created event so frontend sees the root node
  emitDebateEvent(debateId, {
    type: "node:created",
    data: {
      nodeId: rootNodeId,
      speakerType: "orchestrator",
      speakerId: undefined,
      nodeType: "message",
      parentNodeId: branchRootNodeId ?? undefined,
      createdAt: now,
    },
  });

  // Emit node:complete since this node is already complete
  emitDebateEvent(debateId, {
    type: "node:complete",
    data: {
      nodeId: rootNodeId,
      content: `Opening phase: Each agent provides their independent recommendation on "${goal}"`,
    },
  });

  // Execute all agent jobs in parallel
  const jobPromises = debateAgents.map((agent) => {
    const messages = buildOpeningContext(goal, agent);
    return executeAgentJob({
      runId,
      debateId,
      branchId,
      agentId: agent.id,
      agentName: agent.name,
      modelKey: agent.modelKey,
      messages,
      speakerType: "agent",
      nodeType: "message",
      parentNodeId: rootNodeId,
      edgeType: "responds_to",
    });
  });

  const results = await Promise.allSettled(jobPromises);
  return collectSuccessfulResults(results, "Opening phase");
}

// ─── Critique Phase ────────────────────────────────────────
export async function runCritiquePhase(
  params: PhaseParams,
  openingResults: JobResult[],
): Promise<JobResult[]> {
  const { debateId, branchId, runId, goal } = params;
  const debateAgents = await getDebateAgents(debateId);

  // Build a map of agentId → opening content
  const openingByAgent = new Map<string, { agentName: string; content: string }>();
  for (const result of openingResults) {
    const [node] = await db.select().from(nodes).where(eq(nodes.id, result.nodeId));
    if (node && node.speakerId) {
      const agent = debateAgents.find((a) => a.id === node.speakerId);
      if (agent) {
        openingByAgent.set(agent.id, { agentName: agent.name, content: result.content });
      }
    }
  }

  // Each agent critiques the OTHER agents' opening positions
  const jobPromises = debateAgents.map(async (agent) => {
    const otherPositions = Array.from(openingByAgent.entries())
      .filter(([id]) => id !== agent.id)
      .map(([, pos]) => pos);

    const messages = buildCritiqueContext(goal, agent, otherPositions);

    // Find this agent's opening node to use as parent
    let parentNodeId: string | undefined;
    for (const r of openingResults) {
      const [n] = await db.select().from(nodes).where(eq(nodes.id, r.nodeId));
      if (n?.speakerId === agent.id) {
        parentNodeId = r.nodeId;
        break;
      }
    }

    return executeAgentJob({
      runId,
      debateId,
      branchId,
      agentId: agent.id,
      agentName: agent.name,
      modelKey: agent.modelKey,
      messages,
      speakerType: "agent",
      nodeType: "message",
      parentNodeId,
      edgeType: "criticizes",
    });
  });

  const results = await Promise.allSettled(jobPromises);
  return collectSuccessfulResults(results, "Critique phase");
}

// ─── Convergence Phase ─────────────────────────────────────
export async function runConvergencePhase(
  params: PhaseParams,
  critiqueResults: JobResult[],
): Promise<JobResult[]> {
  const { debateId, branchId, runId, goal } = params;
  const debateAgents = await getDebateAgents(debateId);

  // Build critique nodes for context
  const critiquePositions = await buildAgentPositionsFromResults(critiqueResults, debateAgents);

  const jobPromises = debateAgents.map(async (agent) => {
    const messages = buildConvergenceContext(goal, agent, critiquePositions);

    // Find this agent's critique node as parent
    let parentNodeId: string | undefined;
    for (const r of critiqueResults) {
      const [n] = await db.select().from(nodes).where(eq(nodes.id, r.nodeId));
      if (n?.speakerId === agent.id) {
        parentNodeId = r.nodeId;
        break;
      }
    }

    return executeAgentJob({
      runId,
      debateId,
      branchId,
      agentId: agent.id,
      agentName: agent.name,
      modelKey: agent.modelKey,
      messages,
      speakerType: "agent",
      nodeType: "message",
      parentNodeId,
      edgeType: "responds_to",
    });
  });

  const results = await Promise.allSettled(jobPromises);
  return collectSuccessfulResults(results, "Convergence phase");
}

// ─── Final Synthesis Phase ─────────────────────────────────
export async function runFinalPhase(
  params: PhaseParams,
  convergenceResults: JobResult[],
): Promise<JobResult> {
  const { debateId, branchId, runId, goal } = params;
  const debateAgents = await getDebateAgents(debateId);

  // Build convergence positions for synthesis
  const convergencePositions = await buildAgentPositionsFromResults(convergenceResults, debateAgents);

  const messages = buildSynthesisContext(goal, convergencePositions);

  const synthesisModel = await getSynthesisModelKey(debateId);

  const result = await executeAgentJob({
    runId,
    debateId,
    branchId,
    agentId: "orchestrator",
    agentName: "Synthesis Engine",
    modelKey: synthesisModel,
    messages,
    speakerType: "orchestrator",
    nodeType: "final",
    parentNodeId: convergenceResults[0]?.nodeId,
    edgeType: "summarizes",
    onNodeCreated: async (finalNodeId) => {
      if (convergenceResults.length < 2) return;

      const now = new Date().toISOString();
      for (let i = 1; i < convergenceResults.length; i++) {
        const convergenceNodeId = convergenceResults[i]?.nodeId;
        if (!convergenceNodeId) continue;

        const edgeId = uuid();
        await db.insert(edges)
          .values({
            id: edgeId,
            debateId,
            branchId,
            fromNodeId: convergenceNodeId,
            toNodeId: finalNodeId,
            edgeType: "summarizes",
            createdAt: now,
          });

        emitDebateEvent(debateId, {
          type: "edge:created",
          data: {
            edgeId,
            fromNodeId: convergenceNodeId,
            toNodeId: finalNodeId,
            edgeType: "summarizes",
          },
        });
      }
    },
  });

  return result;
}

// ─── Continuation Opening Phase ────────────────────────────
export async function runContinuationOpeningPhase(
  params: PhaseParams,
  userFollowUp: string,
  userFollowUpNodeId: string,
  priorPositions: { agentName: string; content: string }[],
  priorSynthesis: string,
): Promise<JobResult[]> {
  const { debateId, branchId, runId, goal } = params;
  const debateAgents = await getDebateAgents(debateId);

  // Create orchestrator node for this continuation phase
  const rootNodeId = uuid();
  const now = new Date().toISOString();
  await db.insert(nodes)
    .values({
      id: rootNodeId,
      debateId,
      branchId,
      parentNodeId: userFollowUpNodeId,
      speakerType: "orchestrator",
      speakerId: null,
      nodeType: "message",
      content: `Continuation: Agents respond to follow-up "${userFollowUp}"`,
      status: "complete",
      createdAt: now,
    });

  await db.insert(edges)
    .values({
      id: uuid(),
      debateId,
      branchId,
      fromNodeId: userFollowUpNodeId,
      toNodeId: rootNodeId,
      edgeType: "responds_to",
      createdAt: now,
    });

  emitDebateEvent(debateId, {
    type: "node:created",
    data: {
      nodeId: rootNodeId,
      speakerType: "orchestrator",
      speakerId: undefined,
      nodeType: "message",
      parentNodeId: userFollowUpNodeId,
      createdAt: now,
    },
  });

  emitDebateEvent(debateId, {
    type: "node:complete",
    data: {
      nodeId: rootNodeId,
      content: `Continuation: Agents respond to follow-up "${userFollowUp}"`,
    },
  });

  // Execute all agent jobs in parallel with continuation context
  const jobPromises = debateAgents.map((agent) => {
    const messages = buildContinuationOpeningContext(
      goal,
      userFollowUp,
      agent,
      priorPositions,
      priorSynthesis,
    );
    return executeAgentJob({
      runId,
      debateId,
      branchId,
      agentId: agent.id,
      agentName: agent.name,
      modelKey: agent.modelKey,
      messages,
      speakerType: "agent",
      nodeType: "message",
      parentNodeId: rootNodeId,
      edgeType: "responds_to",
    });
  });

  const results = await Promise.allSettled(jobPromises);
  return collectSuccessfulResults(results, "Continuation opening phase");
}

// ─── Continuation Final Phase ──────────────────────────────
export async function runContinuationFinalPhase(
  params: PhaseParams,
  userFollowUp: string,
  priorSynthesis: string,
  continuationResults: JobResult[],
): Promise<JobResult> {
  const { debateId, branchId, runId, goal } = params;
  const debateAgents = await getDebateAgents(debateId);

  // Build new positions from continuation results
  const newPositions = await buildAgentPositionsFromResults(continuationResults, debateAgents);

  const messages = buildContinuationSynthesisContext(goal, userFollowUp, priorSynthesis, newPositions);

  const synthesisModel = await getSynthesisModelKey(debateId);

  const result = await executeAgentJob({
    runId,
    debateId,
    branchId,
    agentId: "orchestrator",
    agentName: "Synthesis Engine",
    modelKey: synthesisModel,
    messages,
    speakerType: "orchestrator",
    nodeType: "final",
    parentNodeId: continuationResults[0]?.nodeId,
    edgeType: "summarizes",
    onNodeCreated: async (finalNodeId) => {
      if (continuationResults.length < 2) return;

      const now = new Date().toISOString();
      for (let i = 1; i < continuationResults.length; i++) {
        const nodeId = continuationResults[i]?.nodeId;
        if (!nodeId) continue;

        const edgeId = uuid();
        await db.insert(edges)
          .values({
            id: edgeId,
            debateId,
            branchId,
            fromNodeId: nodeId,
            toNodeId: finalNodeId,
            edgeType: "summarizes",
            createdAt: now,
          });

        emitDebateEvent(debateId, {
          type: "edge:created",
          data: {
            edgeId,
            fromNodeId: nodeId,
            toNodeId: finalNodeId,
            edgeType: "summarizes",
          },
        });
      }
    },
  });

  return result;
}
