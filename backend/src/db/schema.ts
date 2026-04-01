import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

// ─── debates ───────────────────────────────────────────────
export const debates = pgTable("debates", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status", {
    enum: ["draft", "running", "waiting_user", "completed", "errored"],
  }).notNull(),
  goal: text("goal").notNull(),
  activeBranchId: text("active_branch_id"),
  finalAnswerNodeId: text("final_answer_node_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── debate_branches ───────────────────────────────────────
export const debateBranches = pgTable("debate_branches", {
  id: text("id").primaryKey(),
  debateId: text("debate_id").notNull(),
  parentBranchId: text("parent_branch_id"),
  rootNodeId: text("root_node_id").notNull(),
  label: text("label").notNull(),
  isActive: boolean("is_active").notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── agents ────────────────────────────────────────────────
export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  debateId: text("debate_id").notNull(),
  name: text("name").notNull(),
  modelKey: text("model_key").notNull(),
  personalityJson: text("personality_json").notNull(),
  avatarConfigJson: text("avatar_config_json"),
  displayOrder: integer("display_order").notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── nodes ─────────────────────────────────────────────────
export const nodes = pgTable("nodes", {
  id: text("id").primaryKey(),
  debateId: text("debate_id").notNull(),
  branchId: text("branch_id").notNull(),
  parentNodeId: text("parent_node_id"),
  speakerType: text("speaker_type", {
    enum: ["user", "orchestrator", "agent", "system"],
  }).notNull(),
  speakerId: text("speaker_id"),
  nodeType: text("node_type", {
    enum: [
      "message",
      "summary",
      "final",
      "intervention",
      "regen_root",
    ],
  }).notNull(),
  content: text("content").notNull(),
  status: text("status", {
    enum: ["pending", "streaming", "complete", "errored", "superseded"],
  }).notNull(),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").notNull(),
});

// ─── edges ─────────────────────────────────────────────────
export const edges = pgTable("edges", {
  id: text("id").primaryKey(),
  debateId: text("debate_id").notNull(),
  branchId: text("branch_id").notNull(),
  fromNodeId: text("from_node_id").notNull(),
  toNodeId: text("to_node_id").notNull(),
  edgeType: text("edge_type", {
    enum: [
      "responds_to",
      "criticizes",
      "supports",
      "summarizes",
      "regenerated_from",
      "spawned_by_orchestrator",
    ],
  }).notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── runs ──────────────────────────────────────────────────
export const runs = pgTable("runs", {
  id: text("id").primaryKey(),
  debateId: text("debate_id").notNull(),
  branchId: text("branch_id").notNull(),
  phase: text("phase", {
    enum: ["setup", "opening", "critique", "convergence", "final"],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "running", "completed", "errored"],
  }).notNull(),
  orchestratorStateJson: text("orchestrator_state_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── agent_jobs ────────────────────────────────────────────
export const agentJobs = pgTable("agent_jobs", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  debateId: text("debate_id").notNull(),
  branchId: text("branch_id").notNull(),
  agentId: text("agent_id").notNull(),
  promptSnapshot: text("prompt_snapshot").notNull(),
  contextSnapshot: text("context_snapshot").notNull(),
  status: text("status", {
    enum: ["queued", "running", "complete", "failed"],
  }).notNull(),
  resultNodeId: text("result_node_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── personality_presets ───────────────────────────────────
export const personalityPresets = pgTable("personality_presets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  personalityJson: text("personality_json").notNull(),
  isUserCreated: boolean("is_user_created").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
