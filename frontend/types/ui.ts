export type LaneId = string;

export interface LaneConfig {
  id: LaneId;
  label: string;
  avatar: string;
  role: string;
}

const DEBATER_ROLES = ["Proponent", "Opponent", "Synthesizer", "Analyst", "Advocate", "Mediator", "Challenger", "Explorer"];

export function buildLaneConfigs(agentCount: number): LaneConfig[] {
  const configs: LaneConfig[] = [
    { id: "orchestrator", label: "Orchestrator", avatar: "", role: "Moderator" },
  ];
  for (let i = 0; i < agentCount; i++) {
    const letter = String.fromCharCode(65 + i); // A, B, C, ...
    configs.push({
      id: `debater-${letter.toLowerCase()}`,
      label: `Debater ${letter}`,
      avatar: "",
      role: DEBATER_ROLES[i % DEBATER_ROLES.length],
    });
  }
  return configs;
}

export function buildAgentLanes(agentCount: number): LaneId[] {
  return Array.from({ length: agentCount }, (_, i) => `debater-${String.fromCharCode(97 + i)}`);
}

export const LANE_ICON_NAMES: Record<string, string> = {
  orchestrator: "sparkles",
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
  createdAt?: string;
  updatedAt?: string;
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

export type WorkspaceFixedTabId = 'configuration' | 'personality' | 'lanes';

export interface WorkspaceFixedTab {
  id: WorkspaceFixedTabId;
  kind: 'fixed';
  title: string;
  closable: false;
}

export interface WorkspaceNodeDetails {
  title: string;
  lane: string;
  content: string;
}

export interface WorkspaceNodeTab {
  id: string;
  kind: 'node';
  title: string;
  nodeId: string;
  closable: true;
}

export type WorkspaceTab = WorkspaceFixedTab | WorkspaceNodeTab;

export const WORKSPACE_FIXED_TABS: WorkspaceFixedTab[] = [
  { id: 'configuration', kind: 'fixed', title: 'Configuration', closable: false },
  { id: 'personality', kind: 'fixed', title: 'Personality', closable: false },
  { id: 'lanes', kind: 'fixed', title: 'Lanes', closable: false },
];

export const DEFAULT_WORKSPACE_TAB_ID: WorkspaceFixedTabId = 'configuration';
