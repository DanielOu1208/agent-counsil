// Lane identifiers
export type LaneId = 'orchestrator' | 'debater-a' | 'debater-b' | 'debater-c';

export interface LaneConfig {
  id: LaneId;
  label: string;
  avatar: string;
  role: string;
}

export const LANE_CONFIGS: LaneConfig[] = [
  { id: 'orchestrator', label: 'Orchestrator', avatar: '🎯', role: 'Moderator' },
  { id: 'debater-a', label: 'Debater A', avatar: '🔵', role: 'Proponent' },
  { id: 'debater-b', label: 'Debater B', avatar: '🟢', role: 'Opponent' },
  { id: 'debater-c', label: 'Debater C', avatar: '🟡', role: 'Synthesizer' },
];

// Lucide icon names for each lane (used for consistent icon rendering)
export const LANE_ICON_NAMES: Record<LaneId, string> = {
  orchestrator: 'sparkles',
  'debater-a': 'shield',
  'debater-b': 'user',
  'debater-c': 'bot',
};

export type ModelOption = 'gpt-4' | 'claude-3' | 'gemini-pro' | 'llama-3';
export type PersonalityOption = 'neutral' | 'analytical' | 'creative' | 'skeptical' | 'enthusiastic';

export interface LaneSettings {
  model: ModelOption;
  personality: PersonalityOption;
}

export const MODEL_OPTIONS: { value: ModelOption; label: string }[] = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'claude-3', label: 'Claude 3' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'llama-3', label: 'Llama 3' },
];

export const PERSONALITY_OPTIONS: { value: PersonalityOption; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'creative', label: 'Creative' },
  { value: 'skeptical', label: 'Skeptical' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
];

export interface ReasoningMessage {
  id: string;
  laneId: LaneId;
  content: string;
  timestamp: Date;
  isUser?: boolean;
}

export type DebateStatus = 'idle' | 'running' | 'paused' | 'completed';