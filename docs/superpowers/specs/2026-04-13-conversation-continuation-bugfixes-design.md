# Spec: Critical Bug Fixes — Conversation Continuation

**Date:** 2026-04-13
**Status:** Approved for implementation

---

## 1. Race Condition: Concurrent `continueDebate` (#1)

### Problem
The API route checks `debate.status === "completed"` then fires `continueDebate` asynchronously. Two rapid calls both pass the check → two orchestrator instances run simultaneously on the same branch → interleaved nodes, duplicate runs.

### Solution
Add `SELECT ... FOR UPDATE` pessimistic locking in the `continue` route handler.

**File:** `backend/src/routes/debates.ts`

**Changes:**
- Add `version` column (`integer, default 1`) to the `debates` table schema (`backend/src/db/schema.ts`). Incremented on every status change.
- In the `POST /:id/continue` handler, wrap the status check and run creation in a transaction using `db.transaction()`.
- Use `db.select().from(debates).where(eq(debates.id, id)).forUpdate()` pattern (Drizzle supports this via the underlying PostgreSQL `FOR UPDATE` lock).
- If `debate.status !== "completed"`, rollback and return 409.
- Increment `version` and set `status = 'running'` in the same transaction before firing `continueDebate` async.

**Implementation note:** Drizzle ORM does not have a native `.forUpdate()` chainable method. Instead, use a raw SQL transaction:
```ts
await db.transaction(async (tx) => {
  const [debate] = await tx.execute(sql<DebateRow>`SELECT * FROM debates WHERE id = ${id} FOR UPDATE`);
  if (!debate || debate.status !== 'completed') throw new Error('Conflict');
  await tx.update(debates).set({ status: 'running', version: debate.version + 1 }).where(eq(debates.id, id));
  await tx.insert(runs).values({ id: runId, debateId: id, branchId, phase: 'setup', status: 'pending', ... });
});
```

---

## 2. Race Condition: Concurrent `regenerateFromNode` (#2)

### Problem
`regenerateFromNode` has no DB transaction and no locking. Two simultaneous calls on the same origin node create two branches in parallel, both writing to `debates.activeBranchId` in a last-write-wins manner.

### Solution
Wrap in a DB transaction with row-level locking. Add a partial unique index on `edges` to prevent duplicate `regenerated_from` edges per origin node (DB-level guard).

**Files:** `backend/src/lib/orchestrator/regenerate.ts`, `backend/src/db/schema.ts`

**Changes:**
1. Wrap the entire body of `regenerateFromNode` in `db.transaction()`.
2. Lock the origin node row with `FOR UPDATE` to prevent concurrent fork attempts.
3. Add a `UNIQUE` partial index on `edges(from_node_id, edge_type)` where `edge_type = 'regenerated_from'` — implemented via a raw SQL migration or Drizzle raw SQL in the schema seed. This makes the DB reject duplicate fork edges with a constraint error.
4. If a `regenerated_from` edge already exists for this `nodeId` in the database, return a clean 409 Conflict response instead of a raw DB error.

**Error handling:** Catch the unique constraint violation from step 3 and translate it to a 409 response at the route level (`backend/src/routes/debates.ts:479-490`).

---

## 3. Regenerated Branch Loses Parent History (#3)

### Problem
`runDebate` hardcodes `"opening"` phase and `buildOpeningContext` ignores parent branch nodes. Forking from node 5 re-runs the full debate from scratch, wasting tokens and producing incoherent continuations.

### Solution
Three-part fix:

#### 3a. Capture parent history in `regenerateFromNode`

**File:** `backend/src/lib/orchestrator/regenerate.ts`

Before creating the new branch and `regen_root` node, fetch:
- All `complete` agent nodes from the parent branch (agent positions)
- The latest `final` node from the parent branch (prior synthesis)

Store them in `regen_root.metadataJson` as `parentBranchHistory: { agentPositions: [...], priorSynthesis: string }`.

#### 3b. Pass history through to `runDebate`

**Files:** `backend/src/lib/orchestrator/engine.ts`, `backend/src/lib/orchestrator/context.ts`

- Add an optional `parentHistory` parameter to `runDebate(debateId, runId, parentHistory?)`.
- In `regenerateFromNode`, populate this from step 3a and pass it to `runDebate`.
- In `continueDebate`, `parentHistory` is already implicitly available via the existing node query — extract it from `priorPositions` and `priorSynthesis`.
- In `buildOpeningContext`, if `parentHistory` is provided, prepend a "Prior discussion:" section to the orchestrator system prompt, including agent positions and prior synthesis.

#### 3c. Honor the determined start phase

**File:** `backend/src/lib/orchestrator/engine.ts`

`determineNodePhase` (called at `regenerate.ts:90`) currently returns a phase that is inserted into the `runs` row but never used. In `runDebate`, replace the hardcoded `phase = "opening"` with `phase = phase ?? run.phase ?? "opening"`, falling back to `"opening"` only if both are absent.

---

## 4. `superseded` Status Is Dead Code (#4)

### Problem
`superseded` is defined in `NodeStatus` enum but never set anywhere. UI cannot distinguish stale branch paths.

### Solution
Mark the latest `final` node of the deactivated branch as `superseded` in `regenerateFromNode`.

**File:** `backend/src/lib/orchestrator/regenerate.ts`

After deactivating the old branch (line ~73), query for the latest `final` node in `node.branchId` and update its status to `"superseded"` within the same transaction.

```ts
await tx.update(nodes)
  .set({ status: "superseded" })
  .where(and(
    eq(nodes.branchId, node.branchId),
    eq(nodes.nodeType, "final"),
    eq(nodes.status, "complete")
  ));
```

---

## 5. No Ordering on `latestFinal` Node Lookup (#5)

### Problem
`continueDebate` fetches nodes without `ORDER BY`. "Latest" final node is undefined-order dependent in Postgres.

**File:** `backend/src/lib/orchestrator/engine.ts`

Change line ~115 from:
```ts
const allNodes = await db.select().from(nodes).where(and(...));
```
to:
```ts
const allNodes = await db.select().from(nodes)
  .where(and(eq(nodes.debateId, debateId), eq(nodes.branchId, branchId), eq(nodes.status, "complete")))
  .orderBy(nodes.createdAt);
```

Then `finalNodes[finalNodes.length - 1]` correctly picks the chronologically latest.

---

## 6. `regenerated_from` Edge Is One-Way (#7)

### Problem
Fork edges only live in the new branch's `branchId`. Viewing the old branch shows no sign of the fork — it's invisible.

### Solution
Create a second `regenerated_from` edge in the **parent branch** pointing from the origin node to the new branch's `rootNodeId`.

**File:** `backend/src/lib/orchestrator/regenerate.ts`

After creating the first edge (which has `branchId = newBranchId`), insert a second edge with `branchId = node.branchId` (the parent branch). The `edges.toNodeId` can reference a node in a different branch — the schema allows this. This makes forks visible when viewing either branch.

---

## 7. SSE Broadcasts Without `branchId` (#10)

### Problem
SSE events carry no `branchId`. Events from an inactive (background) branch pollute the active branch's view.

### Solution
Add `branchId: string` to all event type data objects in `backend/src/types.ts`. Populate it in every `emitDebateEvent` call.

**Files:** `backend/src/types.ts`, all `emitDebateEvent` call sites in orchestrator modules

**Changes:**
- Add `branchId: string` field to each event data type in `backend/src/types.ts:66-104`.
- Update all `emitDebateEvent` calls to include `data: { ...branchId }`. Most call sites already have `branchId` in scope from their function parameters.
- In `regenerateFromNode`, populate `branchId = newBranchId` for all events emitted during the new branch's setup.
- In `continueDebate`, populate `branchId = branchId` for all events.

---

## 8. `finalAnswerNodeId` Not Reset on Branch (#9)

### Problem
After a fork, `debate.finalAnswerNodeId` still points to the old branch's final node. UI shows wrong answer.

### Solution
Reset `debate.finalAnswerNodeId` to `null` in `regenerateFromNode`.

**File:** `backend/src/lib/orchestrator/regenerate.ts`

In the `debates` update (around line ~105), add `finalAnswerNodeId: null` to the set clause alongside `activeBranchId` and `status`.

---

## 9. `parentNodeId = null` Orphaned Nodes (#14)

### Problem
If `latestFinal` is `null` (partial failure), `continueDebate` creates a user node with `parentNodeId = null`, breaking the node chain.

### Solution
In `continueDebate`, replace `null` fallback with the oldest `complete` node in the branch.

**File:** `backend/src/lib/orchestrator/engine.ts`

```ts
// After fetching allNodes (now with ORDER BY)
const tip = latestFinal ?? allNodes[0] ?? null;
if (!tip) throw new Error(`No nodes found for branch ${branchId}`);
// Then use: parentNodeId = tip.id
```

Also add a defensive check: if `allNodes` is empty after the query, throw an error before inserting the user node (debate is in an invalid state — should not happen, but prevents silent corruption).

---

## 10. Branch Activation Missing SSE Event (#12)

### Problem
`POST /:id/branches/:branchId/activate` updates DB but emits no SSE event. Frontend doesn't know a branch switch happened.

### Solution
Emit a `branch:activated` event in the activation endpoint.

**File:** `backend/src/routes/debates.ts`

After updating the `isActive` flags and `debate.activeBranchId`, add:
```ts
emitDebateEvent(debateId, {
  type: "branch:activated",
  data: { branchId, activeBranchId: branchId },
});
```

Add `branch:activated` to the event type union in `backend/src/types.ts`.

---

## 11. Phase Transition Guards (#15)

### Problem
`updateRunPhase` accepts any transition, enabling out-of-order phases under concurrent runs.

### Solution
Add a `VALID_TRANSITIONS` map in `engine.ts`.

**File:** `backend/src/lib/orchestrator/engine.ts`

```ts
const VALID_TRANSITIONS: Record<RunPhase, RunPhase[]> = {
  setup: ["opening"],
  opening: ["critique"],
  critique: ["convergence"],
  convergence: ["final"],
  final: [], // terminal
};

export async function updateRunPhase(runId: string, newPhase: RunPhase, newStatus: RunStatus): Promise<void> {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) return;
  const allowed = VALID_TRANSITIONS[run.phase as RunPhase] ?? [];
  if (!allowed.includes(newPhase)) {
    console.warn(`Invalid phase transition: ${run.phase} → ${newPhase} on run ${runId}`);
    return; // no-op, don't crash
  }
  await db.update(runs).set({ phase: newPhase, status: newStatus, updatedAt: new Date().toISOString() }).where(eq(runs.id, runId));
}
```

Also guard against concurrent runs on the same branch by checking for an existing `running` or `pending` run before starting a new one in `continueDebate` and `regenerateFromNode`. Return 409 if one exists.

---

## Testing Strategy

For each fix, verify with the following test cases:

1. **Race fix (#1):** Call `POST /:id/continue` twice in parallel (via curl or a test script) — second call must return 409, not spawn a second orchestrator.
2. **Race fix (#2):** Call `POST /nodes/:nodeId/regenerate` twice in parallel — second call returns 409.
3. **History fix (#3):** Fork from a mid-debate node, inspect the `regen_root` metadata for `parentBranchHistory`. Verify new branch's opening prompt includes it.
4. **Superseded fix (#4):** Regenerate, query the old branch's nodes — the old final node status is `"superseded"`.
5. **Ordering fix (#5):** Insert nodes out of order, call continue — the parent is correctly linked.
6. **Two-way edge (#6):** Regenerate, query both branches — `regenerated_from` edge exists in both.
7. **SSE fix (#7):** Listen to SSE during a regenerate — events include `branchId`.
8. **finalAnswerNodeId (#8):** Regenerate, query debate — `finalAnswerNodeId` is `null`.
9. **Orphaned node (#9):** Simulate no-final-node state, call continue — throws error, no silent orphan.
10. **Branch activation SSE (#10):** Activate a branch, listen to SSE — receives `branch:activated` event.
11. **Phase guards (#11):** Manually call `updateRunPhase` with invalid transition — logs warning, no DB change.

---

## Files to Modify

| # | File |
|---|------|
| 1 | `backend/src/db/schema.ts` — add `version` column to `debates` |
| 1 | `backend/src/routes/debates.ts` — transaction + FOR UPDATE in `POST /:id/continue` |
| 2 | `backend/src/lib/orchestrator/regenerate.ts` — transaction wrapper, duplicate edge guard |
| 2 | `backend/src/db/schema.ts` — partial unique index (raw SQL migration) |
| 3 | `backend/src/lib/orchestrator/regenerate.ts` — capture parent history |
| 3 | `backend/src/lib/orchestrator/engine.ts` — add `parentHistory` param, fix phase hardcode |
| 3 | `backend/src/lib/orchestrator/context.ts` — inject parent history into context |
| 4 | `backend/src/lib/orchestrator/regenerate.ts` — mark superseded |
| 5 | `backend/src/lib/orchestrator/engine.ts` — add `ORDER BY createdAt` |
| 6 | `backend/src/lib/orchestrator/regenerate.ts` — insert second edge |
| 7 | `backend/src/types.ts` — add `branchId` to all event types |
| 7 | All `emitDebateEvent` call sites (engine.ts, regenerate.ts, phases.ts, etc.) |
| 8 | `backend/src/lib/orchestrator/regenerate.ts` — reset `finalAnswerNodeId` |
| 9 | `backend/src/lib/orchestrator/engine.ts` — fix `parentNodeId` fallback |
| 10 | `backend/src/routes/debates.ts` — emit `branch:activated` event |
| 10 | `backend/src/types.ts` — add `branch:activated` to event types |
| 11 | `backend/src/lib/orchestrator/engine.ts` — add `VALID_TRANSITIONS` map |
| 11 | `backend/src/routes/debates.ts` — check for existing active run before continue |
