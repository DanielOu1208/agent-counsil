// Shared types used across the backend

export type DebateStatus = "draft" | "running" | "waiting_user" | "completed" | "errored";
export type RunPhase = "setup" | "opening" | "critique" | "convergence" | "final";
export type RunStatus = "pending" | "running" | "completed" | "errored";
export type SpeakerType = "user" | "orchestrator" | "agent" | "system";
export type NodeType = "message" | "summary" | "final" | "intervention" | "regen_root";
export type NodeStatus = "pending" | "streaming" | "complete" | "errored" | "superseded";
export type EdgeType =
  | "responds_to"
  | "criticizes"
  | "supports"
  | "summarizes"
  | "regenerated_from"
  | "spawned_by_orchestrator";
export type JobStatus = "queued" | "running" | "complete" | "failed";

export type InterventionType =
  | "redirect_focus"
  | "add_constraint"
  | "ask_for_stronger_counterargument"
  | "ask_agent_to_reconsider"
  | "force_finalize";

export interface AgentPersonality {
  name: string;
  role: string;
  tone: string;
  goal: string;
  worldview: string;
  debateStyle: string;
  riskTolerance: "low" | "medium" | "high";
  verbosity: "short" | "medium" | "long";
  preferredOutputFormat: string;
  constraints: string[];
  customInstructions: string;
  avatarSeed?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ModelAdapter {
  generateStream(
    messages: ChatMessage[],
    options?: ModelOptions,
  ): AsyncIterable<string>;
}

// SSE event types emitted during debate execution
export type DebateEvent =
  | { type: "node:created"; data: { nodeId: string; speakerType: SpeakerType; speakerId?: string; nodeType: NodeType; parentNodeId?: string } }
  | { type: "node:chunk"; data: { nodeId: string; chunk: string } }
  | { type: "node:complete"; data: { nodeId: string; content: string } }
  | { type: "node:error"; data: { nodeId: string; error: string } }
  | { type: "phase:changed"; data: { phase: RunPhase; runId: string } }
  | { type: "run:complete"; data: { runId: string; debateId: string } }
  | { type: "run:error"; data: { runId: string; error: string } };
