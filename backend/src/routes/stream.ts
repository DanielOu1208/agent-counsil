import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getDebateBus } from "../lib/events.js";
import { db } from "../db/client.js";
import { debates } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { DebateEvent } from "../types.js";

const app = new Hono();

// GET /api/debates/:id/stream — SSE endpoint for debate events
app.get("/:id/stream", async (c) => {
  const debateId = c.req.param("id");
  const [debate] = await db.select().from(debates).where(eq(debates.id, debateId));
  if (!debate) return c.json({ error: "Debate not found" }, 404);

  return streamSSE(c, async (stream) => {
    const bus = getDebateBus(debateId);
    let alive = true;

    const listener = (event: DebateEvent) => {
      if (!alive) return;
      stream
        .writeSSE({
          event: event.type,
          data: JSON.stringify(event.data),
        })
        .catch(() => {
          alive = false;
        });
    };

    bus.on("debate-event", listener);

    // Send initial connected event
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({ debateId, status: debate.status }),
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      if (!alive) {
        clearInterval(heartbeat);
        return;
      }
      stream.writeSSE({ event: "heartbeat", data: "" }).catch(() => {
        alive = false;
        clearInterval(heartbeat);
      });
    }, 15000);

    // Wait until the stream is aborted
    stream.onAbort(() => {
      alive = false;
      clearInterval(heartbeat);
      bus.off("debate-event", listener);
    });

    // Keep the stream open until aborted
    while (alive) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });
});

export default app;
