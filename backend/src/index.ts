import "dotenv/config";
import { createServer } from "node:net";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { seedPersonalityPresets } from "./lib/personality.js";
import { getCatalog } from "./lib/models/catalog-cache.js";
import debatesRouter from "./routes/debates.js";
import personalitiesRouter from "./routes/personalities.js";
import streamRouter from "./routes/stream.js";

const app = new Hono();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer();

    tester.once("error", () => {
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, "::");
  });
}

async function findAvailablePort(startPort: number, maxAttempts = 20): Promise<number> {
  for (let offset = 0; offset < maxAttempts; offset++) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find an open port in range ${startPort}-${startPort + maxAttempts - 1}`,
  );
}

// ─── Middleware ──────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin;
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return origin;
      return "";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// ─── Health check ────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ─── Available models ────────────────────────────────────────
app.get("/api/models", async (c) => {
  const catalog = await getCatalog();
  return c.json(catalog);
});

// ─── Routes ──────────────────────────────────────────────────
app.route("/api/debates", debatesRouter);
app.route("/api/personalities", personalitiesRouter);
app.route("/api/stream", streamRouter);

// ─── Startup ─────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// Seed built-in personality presets
seedPersonalityPresets();

const start = async () => {
  const selectedPort = await findAvailablePort(PORT);

  if (selectedPort !== PORT) {
    console.warn(
      `Port ${PORT} is in use. Falling back to available port ${selectedPort}.`,
    );
  }

  serve({ fetch: app.fetch, port: selectedPort }, (info) => {
    console.log(`Agent Council backend running on http://localhost:${info.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
