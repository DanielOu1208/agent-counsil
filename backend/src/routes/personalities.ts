import { Hono } from "hono";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db/client.js";
import { personalityPresets } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getModelAdapter } from "../lib/models/registry.js";
import { validateModelKeys } from "../lib/models/validation.js";
import { personalitySchema } from "../lib/personalitySchema.js";

const app = new Hono();

const createPersonalitySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  personality: personalitySchema,
});

const generatePersonalitySchema = z.object({
  brief: z.string().min(10).max(2000),
  modelKey: z.string().min(1),
});

const generatedPersonalityPayloadSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  personality: personalitySchema,
});

const updatePersonalitySchema = createPersonalitySchema.partial();

const GENERATION_SYSTEM_PROMPT = `You generate structured debate-agent personalities.
Return JSON only, with no markdown fences or extra text.

The JSON must match this exact shape:
{
  "name": "Short preset name",
  "description": "One sentence summary",
  "personality": {
    "name": "Display name for the agent persona",
    "role": "Clear debate role",
    "tone": "Tone description",
    "goal": "Primary objective",
    "worldview": "Core beliefs or framing",
    "debateStyle": "How the agent argues",
    "riskTolerance": "low" | "medium" | "high",
    "verbosity": "short" | "medium" | "long",
    "preferredOutputFormat": "How it likes to format outputs",
    "constraints": ["Constraint 1", "Constraint 2"],
    "customInstructions": "Practical behavioral instructions for this persona",
    "avatarSeed": "optional short seed"
  }
}

Requirements:
- Base the personality on the user's brief.
- Make it useful in a multi-agent debate setting.
- Keep constraints practical and specific.
- Avoid empty strings except avatarSeed, which may be omitted.
- Name and description should be concise and human-readable.`;

function serializePersonalityPreset(preset: {
  id: string;
  name: string;
  description: string | null;
  personalityJson: string;
  isUserCreated: boolean;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    personality: JSON.parse(preset.personalityJson),
    isUserCreated: preset.isUserCreated,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
  };
}

async function collectStream(stream: AsyncIterable<string>): Promise<string> {
  let output = "";
  for await (const chunk of stream) {
    output += chunk;
  }
  return output.trim();
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("Model did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

// GET /api/personalities — list all presets
app.get("/", async (c) => {
  const presets = await db.select().from(personalityPresets);
  return c.json(presets.map(serializePersonalityPreset));
});

// POST /api/personalities — create custom personality
app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createPersonalitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { name, description, personality } = parsed.data;
  const now = new Date().toISOString();
  const id = uuid();

  await db.insert(personalityPresets)
    .values({
      id,
      name,
      description: description ?? null,
      personalityJson: JSON.stringify(personality),
      isUserCreated: true,
      createdAt: now,
      updatedAt: now,
    });

  return c.json({
    id,
    name,
    description,
    personality,
    isUserCreated: true,
    createdAt: now,
    updatedAt: now,
  }, 201);
});

// POST /api/personalities/generate — create custom personality from a brief and model selection
app.post("/generate", async (c) => {
  const body = await c.req.json();
  const parsed = generatePersonalitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { brief, modelKey } = parsed.data;

  // Runtime catalog membership check
  const validation = await validateModelKeys([modelKey]);
  if (!validation.valid) {
    return c.json({ error: `Unknown model key: ${validation.invalidKeys[0]}` }, 400);
  }

  const migratedModelKey = validation.migratedKeys?.get(modelKey) ?? modelKey;

  try {
    const adapter = getModelAdapter(migratedModelKey);
    const rawResponse = await collectStream(
      adapter.generateStream(
        [
          { role: "system", content: GENERATION_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Create a debate personality from this brief:\n\n${brief}`,
          },
        ],
        { temperature: 0.8, maxTokens: 1200 },
      ),
    );

    const generatedPayload = generatedPersonalityPayloadSchema.safeParse(
      parseJsonObject(rawResponse),
    );

    if (!generatedPayload.success) {
      return c.json({
        error: "Generated personality did not match the expected schema.",
        details: generatedPayload.error.flatten(),
        rawResponse,
      }, 502);
    }

    const now = new Date().toISOString();
    const id = uuid();

    await db.insert(personalityPresets)
      .values({
        id,
        name: generatedPayload.data.name,
        description: generatedPayload.data.description,
        personalityJson: JSON.stringify(generatedPayload.data.personality),
        isUserCreated: true,
        createdAt: now,
        updatedAt: now,
      });

    return c.json({
      id,
      name: generatedPayload.data.name,
      description: generatedPayload.data.description,
      personality: generatedPayload.data.personality,
      isUserCreated: true,
      createdAt: now,
      updatedAt: now,
      generatedByModelKey: migratedModelKey,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    return c.json({
      error: "Failed to generate personality.",
      details: message,
    }, 500);
  }
});

// PATCH /api/personalities/:id — update personality
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const [existing] = await db.select().from(personalityPresets).where(eq(personalityPresets.id, id));

  if (!existing) return c.json({ error: "Personality not found" }, 404);
  if (!existing.isUserCreated) return c.json({ error: "Cannot edit built-in presets" }, 403);

  const body = await c.req.json();
  const parsed = updatePersonalitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.personality) updates.personalityJson = JSON.stringify(parsed.data.personality);

  await db.update(personalityPresets).set(updates).where(eq(personalityPresets.id, id));

  const [updated] = await db.select().from(personalityPresets).where(eq(personalityPresets.id, id));
  return c.json(serializePersonalityPreset(updated!));
});

// DELETE /api/personalities/:id — delete custom personality
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [existing] = await db.select().from(personalityPresets).where(eq(personalityPresets.id, id));

  if (!existing) return c.json({ error: "Personality not found" }, 404);
  if (!existing.isUserCreated) return c.json({ error: "Cannot delete built-in presets" }, 403);

  await db.delete(personalityPresets).where(eq(personalityPresets.id, id));
  return c.json({ success: true });
});

export default app;
