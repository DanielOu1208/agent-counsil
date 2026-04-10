import { Hono } from "hono";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db/client.js";
import {
  debates,
  debateBranches,
  agents,
  nodes,
  edges,
  runs,
} from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { runDebate, continueDebate } from "../lib/orchestrator/engine.js";
import { handleIntervention } from "../lib/orchestrator/intervention.js";
import { regenerateFromNode } from "../lib/orchestrator/regenerate.js";
import { DEFAULT_MODEL_KEY } from "../lib/models/registry.js";
import { validateModelKeys } from "../lib/models/validation.js";
import { personalitySchema } from "../lib/personalitySchema.js";

const app = new Hono();

// ─── Validation schemas ─────────────────────────────────────

const createDebateSchema = z.object({
  title: z.string().min(1).max(200),
  goal: z.string().min(1).max(5000),
  orchestratorModelKey: z.string().min(1).optional(),
  agents: z
    .array(
      z.object({
        name: z.string().min(1),
        modelKey: z.string().min(1),
        personalityJson: z.string(), // stringified AgentPersonality
        avatarConfigJson: z.string().optional(),
      }),
    )
    .min(2)
    .max(5),
});

const interveneSchema = z.object({
  nodeId: z.string().optional(),
  interventionType: z.enum([
    "redirect_focus",
    "add_constraint",
    "ask_for_stronger_counterargument",
    "ask_agent_to_reconsider",
    "force_finalize",
  ]),
  instruction: z.string().min(1).max(2000),
  targetAgentId: z.string().optional(),
});

const regenerateSchema = z.object({
  reason: z.string().optional(),
  branchLabel: z.string().optional(),
});

// ─── POST /api/debates — create a new debate ────────────────

app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createDebateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { title, goal, orchestratorModelKey, agents: agentInputs } = parsed.data;

  // Runtime catalog membership check
  const modelKeysToValidate = [
    orchestratorModelKey,
    ...agentInputs.map((a) => a.modelKey),
  ];
  const validation = await validateModelKeys(modelKeysToValidate);
  if (!validation.valid) {
    const firstInvalid = validation.invalidKeys[0];
    const message = firstInvalid === orchestratorModelKey
      ? "Unknown orchestrator model key"
      : `Unknown model key: ${firstInvalid}`;
    return c.json({ error: { formErrors: [message], fieldErrors: {} } }, 400);
  }
  
  const now = new Date().toISOString();
  const debateId = uuid();
  const branchId = uuid();
  const runId = uuid();

  // Create root node for the debate
  const rootNodeId = uuid();
  await db.insert(nodes)
    .values({
      id: rootNodeId,
      debateId,
      branchId,
      parentNodeId: null,
      speakerType: "user",
      speakerId: null,
      nodeType: "message",
      content: goal,
      status: "complete",
      metadataJson: JSON.stringify({ isRoot: true }),
      createdAt: now,
    });

  // Create debate
  await db.insert(debates)
    .values({
      id: debateId,
      title,
      status: "draft",
      goal,
      orchestratorModelKey: orchestratorModelKey ?? DEFAULT_MODEL_KEY,
      activeBranchId: branchId,
      finalAnswerNodeId: null,
      createdAt: now,
      updatedAt: now,
    });

  // Create root branch
  await db.insert(debateBranches)
    .values({
      id: branchId,
      debateId,
      parentBranchId: null,
      rootNodeId,
      label: "Main",
      isActive: true,
      createdAt: now,
    });

  // Create agents
  const agentRecords = agentInputs.map((a, i) => ({
    id: uuid(),
    debateId,
    name: a.name,
    modelKey: a.modelKey,
    personalityJson: a.personalityJson,
    avatarConfigJson: a.avatarConfigJson ?? null,
    displayOrder: i,
    createdAt: now,
  }));
  for (const agent of agentRecords) {
    await db.insert(agents).values(agent);
  }

  // Create initial run
  await db.insert(runs)
    .values({
      id: runId,
      debateId,
      branchId,
      phase: "setup",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

  return c.json(
    {
      debateId,
      activeBranchId: branchId,
      runId,
      agents: agentRecords.map((a) => ({ id: a.id, name: a.name, modelKey: a.modelKey })),
    },
    201,
  );
});

// ─── GET /api/debates — list debates for sidebar ────────────

app.get("/", async (c) => {
  const allDebates = await db
    .select({
      id: debates.id,
      title: debates.title,
      status: debates.status,
      createdAt: debates.createdAt,
      updatedAt: debates.updatedAt,
    })
    .from(debates)
    .orderBy(desc(debates.createdAt));

  return c.json(allDebates);
});

// ─── GET /api/debates/:id — debate details ──────────────────

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [debate] = await db.select().from(debates).where(eq(debates.id, id));
  if (!debate) return c.json({ error: "Debate not found" }, 404);

  const debateAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.debateId, id))
    .orderBy(agents.displayOrder);

  const branches = await db.select().from(debateBranches).where(eq(debateBranches.debateId, id));

  const debateRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.debateId, id))
    .orderBy(desc(runs.createdAt));

  return c.json({
    ...debate,
    agents: debateAgents.map((a) => ({
      id: a.id,
      name: a.name,
      modelKey: a.modelKey,
      personality: JSON.parse(a.personalityJson),
      avatarConfig: a.avatarConfigJson ? JSON.parse(a.avatarConfigJson) : null,
      displayOrder: a.displayOrder,
    })),
    branches: branches.map((b) => ({
      id: b.id,
      parentBranchId: b.parentBranchId,
      label: b.label,
      isActive: b.isActive,
      createdAt: b.createdAt,
    })),
    runs: debateRuns.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      phase: r.phase,
      status: r.status,
    })),
  });
});

// ─── GET /api/debates/:id/graph — nodes + edges for branch ──

app.get("/:id/graph", async (c) => {
  const id = c.req.param("id");
  const branchId = c.req.query("branch_id");

  const [debate] = await db.select().from(debates).where(eq(debates.id, id));
  if (!debate) return c.json({ error: "Debate not found" }, 404);

  const targetBranchId = branchId ?? debate.activeBranchId;

  let graphNodes;
  let graphEdges;

  if (targetBranchId) {
    graphNodes = await db
      .select()
      .from(nodes)
      .where(and(eq(nodes.debateId, id), eq(nodes.branchId, targetBranchId)));
    graphEdges = await db
      .select()
      .from(edges)
      .where(and(eq(edges.debateId, id), eq(edges.branchId, targetBranchId)));
  } else {
    graphNodes = await db.select().from(nodes).where(eq(nodes.debateId, id));
    graphEdges = await db.select().from(edges).where(eq(edges.debateId, id));
  }

  return c.json({
    nodes: graphNodes.map((n) => ({
      id: n.id,
      parentNodeId: n.parentNodeId,
      speakerType: n.speakerType,
      speakerId: n.speakerId,
      nodeType: n.nodeType,
      content: n.content,
      status: n.status,
      metadata: n.metadataJson ? JSON.parse(n.metadataJson) : null,
      createdAt: n.createdAt,
    })),
    edges: graphEdges.map((e) => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      edgeType: e.edgeType,
    })),
  });
});

// ─── POST /api/debates/:id/start — start debate run ─────────

app.post("/:id/start", async (c) => {
  const id = c.req.param("id");
  const [debate] = await db.select().from(debates).where(eq(debates.id, id));
  if (!debate) return c.json({ error: "Debate not found" }, 404);
  if (debate.status === "running") return c.json({ error: "Debate is already running" }, 409);

  // Find the pending run
  const [pendingRun] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.debateId, id), eq(runs.status, "pending")));

  if (!pendingRun) return c.json({ error: "No pending run found" }, 404);

  // Run asynchronously — do not await
  runDebate(id, pendingRun.id).catch((err) => {
    console.error("Debate run failed:", err);
  });

  return c.json({ runId: pendingRun.id, status: "started" });
});

// ─── POST /api/debates/:id/continue — continue with follow-up ─

const continueSchema = z.object({
  prompt: z.string().min(1).max(5000),
  orchestratorModelKey: z.string().min(1).optional(),
  agentOverrides: z.array(
    z.object({
      laneId: z.string().regex(/^debater-[a-e]$/, "Invalid laneId"),
      modelKey: z.string().min(1),
      personalityJson: z.string().refine((value) => {
        try {
          return personalitySchema.safeParse(JSON.parse(value)).success;
        } catch {
          return false;
        }
      }, { message: "Invalid personalityJson payload" }),
    }),
  ).max(5).optional(),
});

app.post("/:id/continue", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = continueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  // Runtime catalog membership check
  const modelKeysToValidate = [
    parsed.data.orchestratorModelKey,
    ...(parsed.data.agentOverrides?.map((o) => o.modelKey) ?? []),
  ];
  const validation = await validateModelKeys(modelKeysToValidate);
  if (!validation.valid) {
    const firstInvalid = validation.invalidKeys[0];
    const message = firstInvalid === parsed.data.orchestratorModelKey
      ? "Unknown orchestrator model key"
      : `Unknown model key: ${firstInvalid}`;
    return c.json({ error: { formErrors: [message], fieldErrors: {} } }, 400);
  }

  const [debate] = await db.select().from(debates).where(eq(debates.id, id));
  if (!debate) return c.json({ error: "Debate not found" }, 404);
  if (debate.status === "running") return c.json({ error: "Debate is already running" }, 409);
  if (debate.status !== "completed") {
    return c.json({ error: "Debate must be completed before continuing" }, 400);
  }

  if (parsed.data.orchestratorModelKey) {
    await db.update(debates)
      .set({
        orchestratorModelKey: parsed.data.orchestratorModelKey,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(debates.id, id));
  }

  if (parsed.data.agentOverrides && parsed.data.agentOverrides.length > 0) {
    const laneOrder = Array.from({ length: 5 }, (_, index) => `debater-${String.fromCharCode(97 + index)}`);
    const laneIndexById = new Map(laneOrder.map((laneId, index) => [laneId, index]));
    const debateAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.debateId, id))
      .orderBy(agents.displayOrder);

    const overridesByLane = new Map(
      parsed.data.agentOverrides.map((override) => [override.laneId, override]),
    );

    for (const [laneId, override] of overridesByLane) {
      const displayOrder = laneIndexById.get(laneId);
      const targetAgent = displayOrder !== undefined ? debateAgents[displayOrder] : undefined;

      if (!targetAgent) {
        return c.json({ error: `No agent found for lane ${laneId}` }, 400);
      }

      await db.update(agents)
        .set({
          modelKey: override.modelKey,
          personalityJson: override.personalityJson,
        })
        .where(eq(agents.id, targetAgent.id));
    }
  }

  const branchId = debate.activeBranchId!;
  const now = new Date().toISOString();
  const runId = uuid();

  // Create a new run for the continuation
  await db.insert(runs)
    .values({
      id: runId,
      debateId: id,
      branchId,
      phase: "setup",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

  // Run asynchronously — do not await
  continueDebate(id, runId, parsed.data.prompt).catch((err) => {
    console.error("Debate continuation failed:", err);
  });

  return c.json({ runId, status: "started" });
});

// ─── POST /api/debates/:id/intervene — user intervention ────

app.post("/:id/intervene", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = interveneSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const [debate] = await db.select().from(debates).where(eq(debates.id, id));
  if (!debate) return c.json({ error: "Debate not found" }, 404);

  const result = await handleIntervention({
    debateId: id,
    ...parsed.data,
  });

  return c.json(result);
});

// ─── POST /api/debates/:id/finalize — force final synthesis ──

app.post("/:id/finalize", async (c) => {
  const id = c.req.param("id");
  const [debate] = await db.select().from(debates).where(eq(debates.id, id));
  if (!debate) return c.json({ error: "Debate not found" }, 404);

  const result = await handleIntervention({
    debateId: id,
    interventionType: "force_finalize",
    instruction: "User requested immediate finalization of the debate.",
  });

  return c.json(result);
});

// ─── POST /api/nodes/:nodeId/regenerate — regenerate from node ─

app.post("/nodes/:nodeId/regenerate", async (c) => {
  const nodeId = c.req.param("nodeId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = regenerateSchema.safeParse(body);

  const result = await regenerateFromNode(
    nodeId,
    parsed.success ? parsed.data.reason : undefined,
    parsed.success ? parsed.data.branchLabel : undefined,
  );

  return c.json(result, 201);
});

// ─── GET /api/runs/:id — run status ─────────────────────────

app.get("/runs/:id", async (c) => {
  const id = c.req.param("id");
  const [run] = await db.select().from(runs).where(eq(runs.id, id));
  if (!run) return c.json({ error: "Run not found" }, 404);

  return c.json({
    id: run.id,
    debateId: run.debateId,
    branchId: run.branchId,
    phase: run.phase,
    status: run.status,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  });
});

// ─── POST /api/debates/:id/branches/:branchId/activate ──────

app.post("/:id/branches/:branchId/activate", async (c) => {
  const debateId = c.req.param("id");
  const branchId = c.req.param("branchId");

  const [branch] = await db
    .select()
    .from(debateBranches)
    .where(and(eq(debateBranches.id, branchId), eq(debateBranches.debateId, debateId)));

  if (!branch) return c.json({ error: "Branch not found" }, 404);

  // Deactivate all branches for this debate
  await db.update(debateBranches)
    .set({ isActive: false })
    .where(eq(debateBranches.debateId, debateId));

  // Activate the selected branch
  await db.update(debateBranches)
    .set({ isActive: true })
    .where(eq(debateBranches.id, branchId));

  // Update debate active branch
  await db.update(debates)
    .set({ activeBranchId: branchId, updatedAt: new Date().toISOString() })
    .where(eq(debates.id, debateId));

  return c.json({ success: true, activeBranchId: branchId });
});

export default app;
