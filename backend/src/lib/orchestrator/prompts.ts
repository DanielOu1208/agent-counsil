import type { AgentPersonality, ChatMessage } from "../../types.js";

// ─── Personality → System Prompt ───────────────────────────
export function personalityToSystemPrompt(p: AgentPersonality): string {
  const lines = [
    `You are ${p.name ?? "an AI agent"}, a ${p.role ?? "debate participant"}.`,
  ];
  if (p.tone) lines.push(`Tone: ${p.tone}.`);
  if (p.goal) lines.push(`Goal: ${p.goal}.`);
  if (p.worldview) lines.push(`Worldview: ${p.worldview}.`);
  if (p.debateStyle) lines.push(`Debate style: ${p.debateStyle}.`);
  if (p.riskTolerance) lines.push(`Risk tolerance: ${p.riskTolerance}.`);
  if (p.verbosity) lines.push(`Verbosity: ${p.verbosity} — keep your responses ${p.verbosity} in length.`);
  if (p.preferredOutputFormat) lines.push(`Preferred output format: ${p.preferredOutputFormat}.`);
  if (p.constraints && p.constraints.length > 0) {
    lines.push(`Constraints:\n${p.constraints.map((c) => `- ${c}`).join("\n")}`);
  }
  if (p.customInstructions) {
    lines.push(`Additional instructions: ${p.customInstructions}`);
  }
  return lines.join("\n");
}

// ─── Phase Prompt Templates ───────────────────────────────

export function openingPrompt(goal: string): string {
  return `You are participating in a structured multi-agent debate.

The debate question/problem is:
"""
${goal}
"""

Give your independent recommendation or position on this. Be clear about:
1. Your recommendation
2. Your key reasoning
3. Important considerations or risks

Do not hold back — give your honest, well-reasoned position.`;
}

export function critiquePrompt(goal: string, otherPositions: { agentName: string; content: string }[]): string {
  const positionsText = otherPositions
    .map((p) => `**${p.agentName}**:\n${p.content}`)
    .join("\n\n---\n\n");

  return `You are participating in a structured multi-agent debate.

The debate question/problem is:
"""
${goal}
"""

Other agents have shared their positions:

${positionsText}

Now provide your critique. Focus on:
1. The strongest objections to the other positions
2. Flaws in reasoning or missing considerations
3. Where you agree and where you fundamentally disagree
4. Specific evidence or logic that challenges weak arguments

Be rigorous but fair.`;
}

export function convergencePrompt(
  goal: string,
  critiqueRound: { agentName: string; content: string }[],
): string {
  const critiquesText = critiqueRound
    .map((c) => `**${c.agentName}**:\n${c.content}`)
    .join("\n\n---\n\n");

  return `You are participating in a structured multi-agent debate, now in the convergence phase.

The debate question/problem is:
"""
${goal}
"""

After the critique round, here are the refined positions:

${critiquesText}

Provide your FINAL position. Be explicit about:
1. **Final stance**: Your recommendation after considering all arguments
2. **Confidence**: How confident you are (low / medium / high) and why
3. **Top evidence**: The strongest 2-3 points supporting your position
4. **Biggest remaining concern**: What still worries you or remains unresolved`;
}

export function finalSynthesisPrompt(
  goal: string,
  convergencePositions: { agentName: string; content: string }[],
): string {
  const positionsText = convergencePositions
    .map((p) => `**${p.agentName}**:\n${p.content}`)
    .join("\n\n---\n\n");

  return `You are the synthesis orchestrator for a multi-agent debate.

The debate question/problem was:
"""
${goal}
"""

The agents have reached their final positions after opening arguments, critique, and convergence:

${positionsText}

Produce the final output with TWO clearly separated sections:

## Final Recommendation
Synthesize the agents' positions into a clear, actionable recommendation. Where agents agree, state the consensus. Where they disagree, weigh the arguments and make a call.

## Key Arguments Summary
List the most important argument points from the debate:
- Areas of consensus
- Key disagreements and how they were resolved (or not)
- Critical risks or concerns raised
- The strongest supporting evidence

Be decisive. The user needs a clear answer, not a fence-sitting summary.`;
}

export function interventionInjectionPrompt(
  interventionType: string,
  instruction: string,
): string {
  return `[DEBATE MODERATOR INTERVENTION — ${interventionType.toUpperCase()}]
The debate moderator has intervened with the following direction:
"""
${instruction}
"""
Take this into account in your next response. Adjust your position or analysis accordingly.`;
}
