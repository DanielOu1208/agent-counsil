# Agent Council Frontend Prototype Spec

Date: 2026-04-01  
Status: Approved for prototype implementation  
Scope: Frontend interactive mock prototype (desktop-first)

## 1) Purpose

Define a lightweight, graph-first frontend prototype for **Agent Council** based on `prd.md` and the rough mockup reference.

This prototype is for fast validation and demos, not production behavior.

## 2) Confirmed Product Constraints

- Keep a similar layout/style direction from the rough mockup, but **do not recreate 1:1**.
- Build an **interactive mock prototype** (not fully connected production UI).
- Prioritize **graph interaction first**.
- **Desktop only**.
- Top graph area is **fixed-height** and always visible.
- Show **4 lanes total**:
  - 1 orchestrator
  - 3 debaters
- Top graph is **one unified canvas**.
- Settings focus: **agent configs are interactive**.
- Other controls can be present but mostly non-interactive/placeholders.

## 3) Chosen Prototype Approach

### Approach A — Fast Mock Shell (Selected)

Deliver a clean, believable shell with selective interactivity:

- Graph supports pan/zoom/node selection.
- Node selection maps to lane highlighting.
- Settings config controls (model/personality) are editable.
- All other major controls are visible, with minimal or no deep interaction.

Reason selected:

- Fastest path to a polished prototype.
- Meets graph-first requirement.
- Avoids overbuilding orchestration simulation.

## 4) Layout & Information Architecture

## Overall page

- Dark desktop shell.
- Two-column root split:
  - Left fixed sidebar (full height)
  - Right main workspace

## Left Sidebar (full height)

- Debate list
- New debate action
- Active debate status chip
- Branch list section (visible; low interaction in this pass)

## Main Workspace (right)

1. **Top Graph Strip** (fixed height, always visible)
   - Unified Obsidian-style graph canvas
2. **Lower Content Row**
   - Left: Settings panel
   - Right: 4 reasoning lanes
3. **Bottom Input Bar**
   - Shared debate input centered in lower area

## 5) Interaction Model (Prototype Level)

## Graph interactions (priority lane)

- Pan
- Zoom
- Click node to select
- Selected node gets visual emphasis (glow/ring/edge highlight)
- Node selection highlights its mapped lane in lower panel

No advanced graph editing or branch authoring UX in this pass.

## Settings interactions (primary editable controls)

For each of 4 lane cards (Orchestrator, Debater A/B/C):

- Model dropdown (editable)
- Personality dropdown (editable)
- Optional visual toggle (display-only if needed)

Behavior:

- Updates apply immediately in local UI state.
- Lane headers/badges reflect new config instantly.

## Reasoning lanes (light interaction)

Each lane includes:

- Avatar
- Role label
- Model/personality metadata badge(s)
- Reasoning text area (mock content)
- Speaking/idle state indicator (simple pulse/status)

## Input bar (light interaction)

- Accept text input.
- Submit appends lightweight mock user message item.

## Present-but-minimal controls

- Start / Pause / Intervene / Finalize shown in top controls.
- May be placeholders or emit simple “mock action” feedback.

## 6) Visual Direction

## Style intent

- Dark, minimal, clean, “obsidian-like” atmosphere.
- Similar feel to mockup, not literal replication.
- Avoid heavy visual gimmicks.

## Visual rules

- Near-black slate background.
- Slightly raised charcoal panels.
- Low-contrast cool-gray borders.
- Soft off-white primary text, muted secondary labels.
- One main accent for selection/focus.
- Distinct secondary accent for orchestrator lane.
- Compact desktop spacing rhythm.
- Subtle shadows; low blur; moderate corner radii.
- Short transitions and restrained motion.

## 7) Technical Architecture (Frontend Prototype)

Stack:

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- React Flow (top graph strip)

Page-level composition (target):

- `app/page.tsx` — prototype screen assembly
- `AppShell` — sidebar + main layout
- `TopGraphStrip` — React Flow wrapper
- `SettingsPanel` — lane config controls
- `ReasoningLanes` — 4 lane columns
- `DebateInputBar` — bottom input

State approach:

- Local client state only (React state or lightweight store)
- No backend dependency for prototype interactions

Prototype state includes:

- selected graph node id
- lane config (model/personality for 4 lanes)
- lane selection/active indicators
- mock lane messages
- input draft text

## 8) Data & Behavior Model (Mock)

- Seed deterministic mock graph nodes/edges at load.
- Maintain explicit node-to-lane mapping.
- On node click:
  - set selected node
  - highlight associated lane
- On config change:
  - update lane metadata badges immediately
- On input submit:
  - append mock user message item

## 9) Out of Scope (Explicit)

- Real orchestration engine behavior
- Real streaming transport/events
- SQLite or persistence wiring
- Regeneration logic and true branch state management
- Production-grade accessibility/performance hardening

## 10) Error Handling (Prototype-Safe)

- If graph seed fails: show empty graph state (“No nodes yet”).
- If lane config missing: use safe defaults.
- If node has no lane mapping: do not crash; show unmapped hint.
- Keep actions idempotent and deterministic.

## 11) Validation Checklist

Prototype is acceptable when all are true:

1. Graph renders in fixed top strip and supports pan/zoom/click.
2. Clicking nodes correctly highlights mapped lanes.
3. Settings model/personality controls update lane metadata in real time.
4. Reasoning lanes show avatars + status indicators for all 4 lanes.
5. Bottom input accepts text and appends mock user message.
6. Desktop layout is stable and visually coherent.

## 12) Implementation Notes for Future Phases

When moving beyond this prototype:

- Replace mock lane data with real run/job streams.
- Add branch switching/regeneration semantics from PRD.
- Add persistence-backed debate list/graph state.
- Expand top controls from placeholder to functional handlers.
