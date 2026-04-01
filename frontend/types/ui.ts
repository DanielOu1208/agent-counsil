export type LaneId = "orchestrator" | "debater-a" | "debater-b" | "debater-c";

export interface LaneConfig {
  id: LaneId;
  label: string;
  avatar: string;
  role: string;
}

export const LANE_CONFIGS: LaneConfig[] = [
  { id: "orchestrator", label: "Orchestrator", avatar: "", role: "Moderator" },
  { id: "debater-a", label: "Debater A", avatar: "", role: "Proponent" },
  { id: "debater-b", label: "Debater B", avatar: "", role: "Opponent" },
  { id: "debater-c", label: "Debater C", avatar: "", role: "Synthesizer" },
];

export const AGENT_LANES: LaneId[] = ["debater-a", "debater-b", "debater-c"];

export const LANE_ICON_NAMES: Record<LaneId, string> = {
  orchestrator: "sparkles",
  "debater-a": "shield",
  "debater-b": "user",
  "debater-c": "bot",
};

export type DebateStatus = "idle" | "starting" | "running" | "completed" | "errored";

export interface LaneSettings {
  modelKey: string;
  personalityId: string;
}

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

export interface ApiModel {
  key: string;
  label: string;
  provider: string;
}

export interface ApiPersonality {
  id: string;
  name: string;
  description?: string | null;
  personality: AgentPersonality;
  isUserCreated: boolean;
}

export interface DebateGraphNode {
  id: string;
  parentNodeId: string | null;
  speakerType: "user" | "orchestrator" | "agent" | "system";
  speakerId: string | null;
  nodeType: "message" | "summary" | "final" | "intervention" | "regen_root";
  content: string;
  status: "pending" | "streaming" | "complete" | "errored" | "superseded";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DebateGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType:
    | "responds_to"
    | "criticizes"
    | "supports"
    | "summarizes"
    | "regenerated_from"
    | "spawned_by_orchestrator";
}

export interface ReasoningMessage {
  id: string;
  laneId: LaneId;
  content: string;
  timestamp: Date;
  isUser?: boolean;
  isStreaming?: boolean;
}
