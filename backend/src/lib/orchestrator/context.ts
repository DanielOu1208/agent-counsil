import type { ChatMessage, AgentPersonality } from "../../types.js";
import {
  personalityToSystemPrompt,
  openingPrompt,
  critiquePrompt,
  convergencePrompt,
  finalSynthesisPrompt,
  continuationOpeningPrompt,
  continuationSynthesisPrompt,
} from "./prompts.js";

interface AgentRecord {
  id: string;
  name: string;
  personalityJson: string;
}

interface NodeRecord {
  id: string;
  content: string;
  speakerId: string | null;
}

export function buildOpeningContext(
  goal: string,
  agent: AgentRecord,
): ChatMessage[] {
  const personality: AgentPersonality = JSON.parse(agent.personalityJson);
  return [
    { role: "system", content: personalityToSystemPrompt(personality) },
    { role: "user", content: openingPrompt(goal) },
  ];
}

export function buildCritiqueContext(
  goal: string,
  agent: AgentRecord,
  otherOpeningNodes: { agentName: string; content: string }[],
): ChatMessage[] {
  const personality: AgentPersonality = JSON.parse(agent.personalityJson);
  return [
    { role: "system", content: personalityToSystemPrompt(personality) },
    { role: "user", content: critiquePrompt(goal, otherOpeningNodes) },
  ];
}

export function buildConvergenceContext(
  goal: string,
  agent: AgentRecord,
  critiqueNodes: { agentName: string; content: string }[],
): ChatMessage[] {
  const personality: AgentPersonality = JSON.parse(agent.personalityJson);
  return [
    { role: "system", content: personalityToSystemPrompt(personality) },
    { role: "user", content: convergencePrompt(goal, critiqueNodes) },
  ];
}

export function buildSynthesisContext(
  goal: string,
  convergenceNodes: { agentName: string; content: string }[],
): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a debate synthesis engine. Your job is to analyze the final positions of all debate agents and produce a clear, decisive final recommendation with a summary of the key arguments.",
    },
    { role: "user", content: finalSynthesisPrompt(goal, convergenceNodes) },
  ];
}

// ─── Continuation Context Builders ─────────────────────────

export function buildContinuationOpeningContext(
  goal: string,
  userFollowUp: string,
  agent: AgentRecord,
  priorPositions: { agentName: string; content: string }[],
  priorSynthesis: string,
): ChatMessage[] {
  const personality: AgentPersonality = JSON.parse(agent.personalityJson);
  return [
    { role: "system", content: personalityToSystemPrompt(personality) },
    { role: "user", content: continuationOpeningPrompt(goal, userFollowUp, priorPositions, priorSynthesis) },
  ];
}

export function buildContinuationSynthesisContext(
  goal: string,
  userFollowUp: string,
  priorSynthesis: string,
  newPositions: { agentName: string; content: string }[],
): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a debate synthesis engine. Your job is to analyze the agents' updated positions after a follow-up question and produce a clear, decisive recommendation that builds on the prior discussion.",
    },
    { role: "user", content: continuationSynthesisPrompt(goal, userFollowUp, priorSynthesis, newPositions) },
  ];
}
