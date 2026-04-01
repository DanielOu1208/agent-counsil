# Agent Council PRD

## Product Name
Agent Council

## Document Type
Technical Product Requirements Document (PRD)

## Version
v1 Prototype

## Last Updated
2026-04-01

---

## 1. Overview

Agent Council is a local-first multi-agent decision application where multiple AI agents, each with its own model, context, and personality, debate a user’s question and converge toward a final recommendation.

The system is designed around an orchestrator-controlled debate flow. Agents do not directly talk to each other in an uncontrolled loop. Instead, the orchestrator assigns tasks, collects responses, triggers critique/refinement rounds, and produces a final answer with a summary of the most important argument points.

The user can:
- choose how many agents participate
- choose the model used by each agent
- choose or create agent personalities
- view the debate as a graph of message nodes
- follow up during the debate if the direction is wrong
- regenerate from a specific message while preserving prior context
- switch between debates in a sidebar
- revisit prior debate branches

This prototype is local-first and does not use Supabase for persistence. Data will be stored locally using SQLite.

---

## 2. Goals

### Primary Goal
Build a working prototype that allows a single user to run structured multi-agent debates and receive a final answer plus a summary of the key arguments.

### Secondary Goals
- Make agent reasoning visually understandable through a graph UI
- Allow branching and regeneration from any point in a debate
- Let users customize agent personalities in a structured way
- Support multiple separate debates with clean local persistence

---

## 3. Non-Goals for Prototype

The prototype will not include:
- multi-user collaboration
- cloud sync
- team workspaces
- permissions / roles
- long-term cross-debate memory
- agent-to-agent autonomous free conversation without orchestrator control
- production-grade cost analytics or billing
- robust auth beyond basic local prototype assumptions

---

## 4. Core Product Decisions

### 4.1 Interaction Model
The app is a council decision tool. The purpose is not just free-form conversation, but structured convergence toward a final recommendation.

### 4.2 Agent Model
Each agent must be a separate model call with its own separate context.

### 4.3 Debate Control
Agents respond asynchronously, but only through orchestrator-issued jobs. The orchestrator determines when agents speak and what context they receive.

### 4.4 Node Definition
Each node in the graph represents one message.

### 4.5 Graph Purpose
The graph is primarily for visual navigation and understanding the flow of debate. It is not the main reasoning engine.

### 4.6 Regeneration Rule
When the user regenerates from a specific message:
- all earlier context is preserved
- regeneration starts from the selected point
- the old branch remains in history
- a new branch is created rather than overwriting existing history

### 4.7 Personality System
Personalities are structured and customizable, not just raw prompt blobs.

### 4.8 Debate Isolation
Each debate is independent. No memory is shared across debates.

### 4.9 Persistence
The prototype uses local database storage rather than Supabase.

### 4.10 Final Output
The system must produce:
- a final answer
- a summary of the main important argument points

---

## 5. User Stories

### 5.1 Debate Setup
As a user, I want to create a new debate, choose the number of agents, pick models, and assign personalities so I can run a custom council.

### 5.2 Graph Visibility
As a user, I want to see message nodes in a graph so I can understand how the debate unfolded.

### 5.3 Agent Monitoring
As a user, I want to see each agent’s avatar and streaming output so I know who is currently speaking.

### 5.4 User Intervention
As a user, I want to intervene during the debate if the agents are moving in the wrong direction.

### 5.5 Regeneration
As a user, I want to regenerate from a specific message so I can explore an alternate outcome without losing earlier context.

### 5.6 Debate Navigation
As a user, I want a sidebar to switch between debates and branches so I can manage multiple runs.

### 5.7 Personality Creation
As a user, I want to create my own agent personalities so I can customize how the council behaves.

### 5.8 Final Decision
As a user, I want the system to produce a final recommendation plus a summary of the main arguments so I can quickly understand the outcome.

---

## 6. Functional Requirements

## 6.1 Debate Creation
The system must allow the user to:
- create a debate
- enter a prompt / problem statement
- select the number of agents
- select a model for each agent
- select or create a personality for each agent

## 6.2 Debate Execution
The system must:
- create a new debate run
- create agent jobs per debate phase
- stream agent outputs as they arrive
- store each message as a node
- track message relationships as edges

## 6.3 Debate Phases
The initial prototype must support these phases:
1. setup
2. opening positions
3. critique / rebuttal
4. convergence
5. final synthesis

## 6.4 User Interventions
The system must allow the user to intervene during a run with actions such as:
- redirect focus
- add a missing constraint
- request stronger criticism
- request that one agent reconsider
- force final answer now

## 6.5 Regeneration
The system must allow the user to:
- select a message node
- regenerate from that point
- preserve prior context
- create a new branch
- keep the previous branch available for inspection

## 6.6 Sidebar
The sidebar must allow:
- switching between debates
- switching between branches within a debate
- creating a new debate
- viewing debate status

## 6.7 Personality Management
The system must allow:
- selecting a built-in personality preset
- creating a custom personality
- editing a custom personality
- saving custom personalities locally

## 6.8 Graph View
The system must display:
- one node per message
- edges connecting related messages
- active speaking state for streaming nodes
- branch structure for regenerated paths

## 6.9 Final Output
The system must generate:
- a final answer node
- a summary node or summary section containing the main argument points

---

## 7. UX Requirements

## 7.1 Main Layout
The UI should include:
- left sidebar for debate navigation
- central graph / conversation workspace
- right-side detail panel or bottom drawer for node inspection
- top controls for starting, pausing, intervening, or regenerating

## 7.2 Agent Presence
Each agent should have:
- avatar
- name
- model label
- speaking / idle indicator

## 7.3 Streaming Experience
While an agent is responding:
- its node should show partial streaming content
- its avatar should visually indicate active output
- the UI should not block other updates

## 7.4 Graph Controls
The graph should support:
- pan and zoom
- click node to inspect
- highlight active branch
- regenerate from selected node
- optional auto-focus on newest active node

## 7.5 Branch Visibility
Regenerated branches should be visually distinguishable from the original branch.

---

## 8. Technical Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- React Flow for node graph visualization

### Backend
- Next.js Route Handlers
- server-side orchestration modules
- provider adapter layer for model APIs

### Persistence
- SQLite local database
- Drizzle ORM or Prisma (recommended: Drizzle for lighter prototype footprint)

### Optional Local State
- Zustand for client-side UI state
- TanStack Query if needed for server data fetching patterns

---

## 9. Local Storage / Persistence Strategy

The prototype should not use Supabase.

### Recommended Persistence Design
Use a local SQLite database stored in the app environment.

Recommended options:
- SQLite file via better-sqlite3 for local desktop/dev environments
- Drizzle ORM on top of SQLite for schema management and typed access

### Reasoning
SQLite is better than browser localStorage because:
- it supports relational data
- it supports branching/history cleanly
- it is safer for storing larger structured debate data
- it makes future migration to a hosted DB easier

### File Storage
If needed later:
- avatars can be stored as generated config data, not image binaries
- exports can be written as local files

---

## 10. System Architecture

## 10.1 High-Level Architecture

The app has four major layers:

### A. UI Layer
Responsible for:
- displaying debates
- streaming output
- rendering graph
- accepting user actions

### B. API Layer
Responsible for:
- debate creation
- run control
- intervention requests
- regeneration requests
- returning debate state

### C. Orchestrator Layer
Responsible for:
- phase transitions
- job creation
- context assembly
- convergence decision
- final synthesis generation

### D. Persistence Layer
Responsible for:
- debates
- nodes
- branches
- personalities
- jobs
- run state

---

## 11. Debate Execution Model

## 11.1 Important Rule
Agents do not directly message each other freely.

The orchestrator is the central controller.

## 11.2 Debate Flow

### Phase 1: Setup
Inputs:
- user prompt
- selected agent count
- model per agent
- personality per agent

Actions:
- create debate
- create root branch
- create agent records
- create run record

### Phase 2: Opening Positions
For each agent:
- send debate goal
- send agent personality
- send initial user prompt
- ask for its independent recommendation

Store each response as a node.

### Phase 3: Critique
For each agent:
- provide selected responses from other agents
- ask for strongest objections or refinements

Store each response as a node.

### Phase 4: Convergence
For each agent:
- ask for final stance
- ask for confidence
- ask for top evidence
- ask for biggest remaining concern

Store each response as a node.

### Phase 5: Final Synthesis
The orchestrator produces:
- final recommendation
- summary of main argument points
- unresolved disagreements if any

Store final output as dedicated nodes.

---

## 12. Orchestrator Design

## 12.1 Responsibilities
The orchestrator must:
- manage the phase state machine
- queue agent jobs
- assemble context packs
- store stream updates
- handle retries/errors
- process interventions
- trigger regeneration branches
- produce final synthesis

## 12.2 Design Principle
The orchestrator should be deterministic in structure even if model outputs vary.

Do not rely on a vague “super-agent” doing everything implicitly.

Use explicit phase rules in server code.

## 12.3 Context Packing
Each agent should not receive the entire transcript by default.

Each agent should receive:
- debate goal
- its personality spec
- a curated set of prior relevant messages
- current task instruction

This reduces token usage and keeps responses focused.

---

## 13. Personality System

## 13.1 Structured Personality Format

Each personality should use a structured schema such as:

```ts
type AgentPersonality = {
  name: string
  role: string
  tone: string
  goal: string
  worldview: string
  debateStyle: string
  riskTolerance: "low" | "medium" | "high"
  verbosity: "short" | "medium" | "long"
  preferredOutputFormat: string
  constraints: string[]
  customInstructions: string
  avatarSeed?: string
}
```

## 13.2 Personality Behavior
The system should transform this structured configuration into a model system prompt.

## 13.3 Presets
Ship with a few built-in presets such as:
- Skeptic
- Strategist
- Optimist
- Domain Expert
- Contrarian
- Synthesizer

## 13.4 Custom Personalities
Users should be able to:
- create
- edit
- save
- reuse
their own personalities locally.

---

## 14. Regeneration / Branching Model

## 14.1 Rule
Regeneration must never overwrite history.

## 14.2 Regeneration Behavior
When the user regenerates from node N:
- keep all nodes before N as context
- mark descendants in the old path as superseded only for that branch path
- create a new branch
- create a regeneration root edge
- continue execution from that point

## 14.3 Benefits
This gives:
- auditability
- comparison between branches
- safe history preservation
- easier debugging

---

## 15. Data Model

Below is the recommended local database schema.

## 15.1 debates
Purpose: top-level debate container

Fields:
- id
- title
- status (`draft`, `running`, `waiting_user`, `completed`, `errored`)
- goal
- active_branch_id
- final_answer_node_id (nullable)
- created_at
- updated_at

## 15.2 debate_branches
Purpose: stores alternate branches within a debate

Fields:
- id
- debate_id
- parent_branch_id (nullable)
- root_node_id
- label
- is_active
- created_at

## 15.3 agents
Purpose: stores the agents assigned to a debate

Fields:
- id
- debate_id
- name
- model_key
- personality_json
- avatar_config_json
- display_order
- created_at

## 15.4 nodes
Purpose: one record per message node

Fields:
- id
- debate_id
- branch_id
- parent_node_id (nullable)
- speaker_type (`user`, `orchestrator`, `agent`, `system`)
- speaker_id (nullable)
- node_type (`message`, `summary`, `final`, `intervention`, `regen_root`)
- content
- status (`pending`, `streaming`, `complete`, `errored`, `superseded`)
- metadata_json
- created_at

## 15.5 edges
Purpose: graph relationships between nodes

Fields:
- id
- debate_id
- branch_id
- from_node_id
- to_node_id
- edge_type (`responds_to`, `criticizes`, `supports`, `summarizes`, `regenerated_from`, `spawned_by_orchestrator`)
- created_at

## 15.6 runs
Purpose: stores orchestrator run state

Fields:
- id
- debate_id
- branch_id
- phase (`setup`, `opening`, `critique`, `convergence`, `final`)
- status
- orchestrator_state_json
- created_at
- updated_at

## 15.7 agent_jobs
Purpose: asynchronous model call tracking

Fields:
- id
- run_id
- debate_id
- branch_id
- agent_id
- prompt_snapshot
- context_snapshot
- status (`queued`, `running`, `complete`, `failed`)
- result_node_id (nullable)
- created_at
- updated_at

## 15.8 personality_presets
Purpose: stores built-in and user-created personalities

Fields:
- id
- name
- description
- personality_json
- is_user_created
- created_at
- updated_at

---

## 16. Suggested SQL-Like Schema Sketch

```sql
CREATE TABLE debates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  goal TEXT NOT NULL,
  active_branch_id TEXT,
  final_answer_node_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE debate_branches (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL,
  parent_branch_id TEXT,
  root_node_id TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL,
  name TEXT NOT NULL,
  model_key TEXT NOT NULL,
  personality_json TEXT NOT NULL,
  avatar_config_json TEXT,
  display_order INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  parent_node_id TEXT,
  speaker_type TEXT NOT NULL,
  speaker_id TEXT,
  node_type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  orchestrator_state_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE agent_jobs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  debate_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  prompt_snapshot TEXT NOT NULL,
  context_snapshot TEXT NOT NULL,
  status TEXT NOT NULL,
  result_node_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE personality_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  personality_json TEXT NOT NULL,
  is_user_created INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 17. API Design

All routes can be implemented as Next.js Route Handlers.

## 17.1 Debate Routes

### POST /api/debates
Create a new debate

Body:
- title
- goal
- agents[]
- optional initial user message

Returns:
- debate id
- active branch id
- run id

### GET /api/debates
Return debate list for sidebar

### GET /api/debates/:id
Return debate details

### GET /api/debates/:id/graph
Return nodes + edges for active branch

---

## 17.2 Run Routes

### POST /api/debates/:id/start
Start the debate run

### POST /api/debates/:id/intervene
Inject user intervention

Body:
- nodeId (optional current focus)
- interventionType
- instruction

### POST /api/debates/:id/finalize
Force final synthesis now

### GET /api/runs/:id
Get run status

---

## 17.3 Regeneration Routes

### POST /api/nodes/:id/regenerate
Regenerate from a selected node

Body:
- reason (optional)
- branch label (optional)

Returns:
- new branch id
- new run id

---

## 17.4 Personality Routes

### GET /api/personalities
List presets

### POST /api/personalities
Create custom personality

### PATCH /api/personalities/:id
Edit personality

### DELETE /api/personalities/:id
Delete custom personality

---

## 18. Streaming Design

## 18.1 Streaming Requirement
Each agent response should stream into the UI as it is produced.

## 18.2 Recommended Approach
Use server streaming from Route Handlers or a local event system to push partial chunks to the client.

Options:
- Server-Sent Events
- streaming fetch response
- WebSocket if later needed

For the prototype, use streaming fetch or SSE.

## 18.3 Storage Behavior During Streaming
When a new agent message starts:
1. create node with `status = streaming`
2. append chunks to node content
3. update UI incrementally
4. mark node `complete` when finished

---

## 19. Graph Rendering Logic

## 19.1 Graph Library
Use React Flow.

## 19.2 Node Types
Recommended node types:
- user_message
- orchestrator_prompt
- agent_message
- system_summary
- final_answer
- intervention
- regeneration_root

## 19.3 Edge Types
Recommended edge types:
- responds_to
- criticizes
- supports
- summarizes
- regenerated_from
- spawned_by_orchestrator

## 19.4 Layout
Recommended initial layout:
- main timeline left to right
- agent responses fan below parent node
- branches diverge visibly
- final answer pinned visually

Optional:
- use dagre for auto-layout

---

## 20. Orchestrator Algorithm (Prototype)

```text
1. Create debate, branch, run, and agent records
2. Phase = opening
3. Create one job per agent:
   "Give your independent recommendation"
4. Wait for all opening jobs to complete
5. Phase = critique
6. Create critique jobs using selected opposing agent responses
7. Wait for critique jobs
8. Optionally run one more critique/refinement round if disagreement is still high
9. Phase = convergence
10. Ask each agent for:
    - final stance
    - confidence
    - key supporting points
    - main remaining concern
11. Wait for all convergence jobs
12. Phase = final
13. Orchestrator synthesizes final answer
14. Store final answer node and summary node
15. Mark run and debate completed
```

---

## 21. Convergence Logic

For prototype simplicity, convergence can be rule-based.

Suggested signals:
- whether recommendations are broadly aligned
- whether the same major risks keep appearing
- whether confidence is stabilizing
- whether the user explicitly asks for finalization

Stop after:
- 1 opening round
- 1 critique round
- optionally 1 refinement round
- 1 convergence round

Avoid endless loops.

---

## 22. Intervention Model

User interventions should be structured.

Suggested intervention types:
- `redirect_focus`
- `add_constraint`
- `ask_for_stronger_counterargument`
- `ask_agent_to_reconsider`
- `force_finalize`

The orchestrator should translate these into new jobs or phase transitions.

---

## 23. Error Handling

The system must handle:
- failed model call
- partial stream failure
- invalid branch regeneration request
- corrupted local data
- graph render issues with missing nodes

Fallback behavior:
- mark failed nodes/jobs as errored
- let user retry from the failed point
- preserve all successful prior nodes

---

## 24. MVP Scope

The MVP should include:

### Must Have
- create debate
- choose 2 to 5 agents
- choose model per agent
- choose personality per agent
- run orchestrated debate
- stream outputs
- store locally in SQLite
- show graph with one node per message
- allow user intervention
- allow regeneration from selected node
- produce final answer and main argument summary
- sidebar for switching debates and branches

### Nice to Have
- auto-layout improvements
- importance highlighting
- node filtering
- export to markdown

---

## 25. Roadmap

## Phase 1: Core Debate Engine
Build:
- local DB schema
- debate creation flow
- agent config UI
- orchestrator phase engine
- opening / critique / final synthesis
- basic message list view

Success Criteria:
- complete debate runs from start to finish

## Phase 2: Streaming + Graph
Build:
- streaming node updates
- React Flow graph
- message-to-node mapping
- branch visibility
- avatar speaking state

Success Criteria:
- live multi-agent debate visible in graph form

## Phase 3: Regeneration + Intervention
Build:
- regenerate from node
- create new branch
- intervention actions
- branch switching in sidebar

Success Criteria:
- user can steer debate and explore alternate outcomes

## Phase 4: Personality Builder
Build:
- structured personality editor
- save/edit/delete custom personalities
- built-in presets
- personality preview

Success Criteria:
- users can create reusable agents

## Phase 5: Polish
Build:
- graph filtering
- importance summaries
- better branch labels
- export debate to markdown
- retry UX for failures

Success Criteria:
- prototype is usable for demos and internal testing

---

## 26. Risks and Mitigations

### Risk 1: Context Explosion
Problem:
Too much transcript gets sent to each agent.

Mitigation:
Use curated context packs, not full transcript replay.

### Risk 2: Graph Clutter
Problem:
One-node-per-message gets messy quickly.

Mitigation:
Add filters, collapse modes, and branch-focused views.

### Risk 3: Regeneration Complexity
Problem:
Overwriting nodes creates broken history.

Mitigation:
Always create a new branch instead of overwriting.

### Risk 4: Async Race Conditions
Problem:
Parallel jobs finish in unpredictable order.

Mitigation:
Render by timestamps and graph relationships, not arrival order alone.

### Risk 5: Orchestrator Complexity
Problem:
A vague orchestrator becomes hard to debug.

Mitigation:
Use explicit phases and rule-based transitions in code.

---

## 27. Suggested File Structure

```text
/app
  /api
    /debates
    /runs
    /nodes
    /personalities
  /debates
    /[id]
  /components
    DebateSidebar.tsx
    DebateGraph.tsx
    DebateNode.tsx
    AgentAvatar.tsx
    PersonalityEditor.tsx
    FinalAnswerPanel.tsx
  /lib
    /db
      schema.ts
      client.ts
    /orchestrator
      engine.ts
      phases.ts
      context.ts
      jobs.ts
      regenerate.ts
    /models
      providerAdapter.ts
      prompts.ts
  /types
    debate.ts
    agent.ts
    node.ts
    personality.ts
```

---

## 28. Recommended Initial Build Order

1. local database schema
2. debate creation UI
3. personality + model selection UI
4. orchestrator engine without graph
5. message list rendering
6. streaming responses
7. React Flow graph
8. regeneration
9. intervention controls
10. polish and export

---

## 29. Open Questions for Implementation

These do not block the PRD, but should be decided during build:
- Which model providers will be supported first?
- How will model credentials be configured locally?
- Will final answer generation use the orchestrator model or a separate dedicated synthesis model?
- Should branches share the same debate title or allow per-branch labels?
- Should summary extraction happen during the debate or only at the end?

---

## 30. Final Recommendation

For this prototype, the hardest problem is not the graph UI. The hardest problems are:
- orchestration
- branching correctness
- context packing
- final synthesis quality

So the implementation should prioritize:
1. correct debate lifecycle
2. reliable local persistence
3. branching/regeneration model
4. streaming
5. graph visualization last

If those are built in that order, the graph becomes a useful interface over a solid system instead of a visualization of unstable behavior.

---

## 31. Prototype Success Criteria

The prototype is successful if a user can:
- create a debate with multiple agents
- watch independent model-backed agents debate asynchronously
- intervene during the process
- regenerate from a chosen node
- switch between branches
- receive a final recommendation with a useful summary
- revisit the entire result later from local storage

