import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { seedPersonalityPresets } from "./lib/personality.js";
import { AVAILABLE_MODELS } from "./lib/models/registry.js";
import debatesRouter from "./routes/debates.js";
import personalitiesRouter from "./routes/personalities.js";
import streamRouter from "./routes/stream.js";

const app = new Hono();

// ─── Middleware ──────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// ─── Health check ────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ─── Available models ────────────────────────────────────────
app.get("/api/models", (c) => c.json(AVAILABLE_MODELS));

// ─── Routes ──────────────────────────────────────────────────
app.route("/api/debates", debatesRouter);
app.route("/api/personalities", personalitiesRouter);
app.route("/api/stream", streamRouter);

// ─── Startup ─────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// Seed built-in personality presets
seedPersonalityPresets();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Agent Council backend running on http://localhost:${info.port}`);
});
