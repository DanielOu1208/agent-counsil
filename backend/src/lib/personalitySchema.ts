import { z } from "zod";

export const personalitySchema = z.object({
  name: z.string(),
  role: z.string(),
  tone: z.string(),
  goal: z.string(),
  worldview: z.string(),
  debateStyle: z.string(),
  riskTolerance: z.enum(["low", "medium", "high"]),
  verbosity: z.enum(["short", "medium", "long"]),
  preferredOutputFormat: z.string(),
  constraints: z.array(z.string()),
  customInstructions: z.string(),
  avatarSeed: z.string().optional(),
});
