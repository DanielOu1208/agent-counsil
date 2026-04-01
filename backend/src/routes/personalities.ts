import { Hono } from "hono";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db/client.js";
import { personalityPresets } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = new Hono();

// Validation schemas
const createPersonalitySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  personality: z.object({
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
  }),
});

const updatePersonalitySchema = createPersonalitySchema.partial();

// GET /api/personalities — list all presets
app.get("/", async (c) => {
  const presets = await db.select().from(personalityPresets);
  return c.json(
    presets.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      personality: JSON.parse(p.personalityJson),
      isUserCreated: p.isUserCreated,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  );
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

  return c.json({ id, name, description, personality, isUserCreated: true, createdAt: now }, 201);
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
  return c.json({
    id: updated!.id,
    name: updated!.name,
    description: updated!.description,
    personality: JSON.parse(updated!.personalityJson),
    isUserCreated: updated!.isUserCreated,
  });
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
