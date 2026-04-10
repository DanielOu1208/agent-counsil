import { v4 as uuid } from "uuid";
import { db } from "../../db/client.js";
import { nodes, edges, agentJobs } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getModelAdapter } from "../models/registry.js";
import { emitDebateEvent } from "../events.js";
import { estimateModelCostUsd } from "../models/catalog-cache.js";
import type { ChatMessage, SpeakerType, NodeType, EdgeType, UsageReport } from "../../types.js";

interface ExecuteJobParams {
  runId: string;
  debateId: string;
  branchId: string;
  agentId: string;
  agentName: string;
  modelKey: string;
  messages: ChatMessage[];
  speakerType: SpeakerType;
  nodeType: NodeType;
  parentNodeId?: string;
  edgeType: EdgeType;
  onNodeCreated?: (nodeId: string) => Promise<void> | void;
}

export interface JobResult {
  nodeId: string;
  jobId: string;
  content: string;
}

export async function executeAgentJob(params: ExecuteJobParams): Promise<JobResult> {
  const {
    runId,
    debateId,
    branchId,
    agentId,
    agentName,
    modelKey,
    messages,
    speakerType,
    nodeType,
    parentNodeId,
    edgeType,
    onNodeCreated,
  } = params;

  const now = new Date().toISOString();
  const jobId = uuid();
  const nodeId = uuid();

  // Create the job record
  await db.insert(agentJobs)
    .values({
      id: jobId,
      runId,
      debateId,
      branchId,
      agentId,
      promptSnapshot: JSON.stringify(messages),
      contextSnapshot: JSON.stringify({ modelKey }),
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });

  // Create the node record (status = streaming)
  await db.insert(nodes)
    .values({
      id: nodeId,
      debateId,
      branchId,
      parentNodeId: parentNodeId ?? null,
      speakerType,
      speakerId: agentId,
      nodeType,
      content: "",
      status: "streaming",
      metadataJson: JSON.stringify({ modelKey, agentName }),
      createdAt: now,
    });

  // Create edge from parent to this node
  if (parentNodeId) {
    const edgeId = uuid();
    await db.insert(edges)
      .values({
        id: edgeId,
        debateId,
        branchId,
        fromNodeId: parentNodeId,
        toNodeId: nodeId,
        edgeType,
        createdAt: now,
      });

    emitDebateEvent(debateId, {
      type: "edge:created",
      data: {
        edgeId,
        fromNodeId: parentNodeId,
        toNodeId: nodeId,
        edgeType,
      },
    });
  }

  // Emit node:created event
  emitDebateEvent(debateId, {
    type: "node:created",
    data: { nodeId, speakerType, speakerId: agentId, nodeType, parentNodeId, createdAt: now },
  });

  if (onNodeCreated) {
    await onNodeCreated(nodeId);
  }

  // Mark job as running
  await db.update(agentJobs)
    .set({ status: "running", updatedAt: new Date().toISOString() })
    .where(eq(agentJobs.id, jobId));

  let fullContent = "";
  const MAX_RETRIES = 3;
  
  // Capture usage reported by adapter (using object reference for TypeScript compatibility)
  const capturedUsage: { value: UsageReport | null } = { value: null };

  try {
    const adapter = getModelAdapter(modelKey);

    // Retry loop for transient errors (rate limits, etc.)
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const stream = adapter.generateStream(messages, {
          temperature: 0.7,
          onUsage: (usage) => {
            capturedUsage.value = usage;
          },
        });
        for await (const chunk of stream) {
          fullContent += chunk;
          emitDebateEvent(debateId, {
            type: "node:chunk",
            data: { nodeId, chunk },
          });
        }
        lastError = null;
        break; // success
      } catch (err: unknown) {
        lastError = err;
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes("429") || err.message.includes("Too Many Requests") || err.message.includes("quota"));
        if (isRateLimit && attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt + 1) * 5000; // 10s, 20s, 40s
          console.log(`Rate limited on attempt ${attempt + 1}, retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          fullContent = ""; // reset for retry
        } else {
          throw err;
        }
      }
    }

    // Update node to complete
    await db.update(nodes)
      .set({ content: fullContent, status: "complete" })
      .where(eq(nodes.id, nodeId));

    // Update job to complete
    await db.update(agentJobs)
      .set({
        status: "complete",
        resultNodeId: nodeId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(agentJobs.id, jobId));

    // Emit node:complete event
    emitDebateEvent(debateId, {
      type: "node:complete",
      data: { nodeId, content: fullContent },
    });

    // Emit usage:updated event if usage was reported
    // Always emit with zeros if no usage, for predictable frontend behavior
    const usageReport = capturedUsage.value;
    const promptTokens = usageReport?.promptTokens ?? 0;
    const completionTokens = usageReport?.completionTokens ?? 0;
    const totalTokens = usageReport?.totalTokens ?? 0;
    const estimatedCostUsd = usageReport
      ? estimateModelCostUsd(modelKey, promptTokens, completionTokens)
      : null;

    emitDebateEvent(debateId, {
      type: "usage:updated",
      data: {
        debateId,
        runId,
        modelKey,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd,
      },
    });

    return { nodeId, jobId, content: fullContent };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Mark node and job as errored
    await db.update(nodes)
      .set({ content: fullContent, status: "errored", metadataJson: JSON.stringify({ error: errMsg }) })
      .where(eq(nodes.id, nodeId));

    await db.update(agentJobs)
      .set({ status: "failed", updatedAt: new Date().toISOString() })
      .where(eq(agentJobs.id, jobId));

    emitDebateEvent(debateId, {
      type: "node:error",
      data: { nodeId, error: errMsg },
    });

    throw error;
  }
}
