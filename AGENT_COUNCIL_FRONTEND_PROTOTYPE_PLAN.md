# Agent Council Frontend Prototype Implementation Plan

Date: 2026-04-01  
Depends on: `AGENT_COUNCIL_FRONTEND_PROTOTYPE_SPEC.md`

## Goal

Implement a **desktop-first interactive mock frontend** with:

- Fixed top unified graph strip (graph-first)
- Left sidebar
- Lower-left interactive settings (config only)
- 4 reasoning lanes (orchestrator + 3 debaters)
- Bottom shared input
- Local mock state only (no backend)

## Execution Strategy

- Keep scope tight to Approach A (fast mock shell)
- Build visible structure first, then wire interactions
- Use deterministic mock fixtures
- Validate against spec checklist before polish

## Phase Plan

## Phase 0 — Bootstrap frontend app

1. Initialize Next.js App Router project in `frontend/` (TS + Tailwind)
2. Install dependencies:
   - `reactflow`
   - optional UI helpers (`clsx`, `lucide-react`)
3. Set dark global baseline styles

**Exit criteria**
- App runs locally
- Base dark screen renders

## Phase 1 — Shell layout and panels

1. Build page scaffold:
   - full-height desktop container
   - fixed-width left sidebar
   - right main workspace
2. Add fixed-height top graph strip container
3. Add lower row with settings (left) and reasoning lanes (right)
4. Add bottom-centered input bar

**Exit criteria**
- Full layout matches approved structure
- Desktop layout is stable at 1440+

## Phase 2 — Graph strip (priority)

1. Integrate React Flow in top strip
2. Seed mock nodes + edges (unified graph)
3. Enable pan/zoom/click selection
4. Implement selected-node visual emphasis
5. Map selected node -> lane highlight ID

**Exit criteria**
- Graph supports pan/zoom/click
- Node click triggers correct lane highlighting

## Phase 3 — Settings panel (interactive config)

1. Render 4 lane config cards:
   - Orchestrator
   - Debater A
   - Debater B
   - Debater C
2. Add model + personality dropdowns per card
3. Update lane metadata badges live from config state

**Exit criteria**
- Config changes update lane headers/badges immediately

## Phase 4 — Reasoning lanes + presence

1. Render 4 lane columns
2. Add avatar, role label, model/personality metadata
3. Add mock reasoning text block per lane
4. Add idle/speaking indicator (light pulse)

**Exit criteria**
- All 4 lanes visible and coherent
- Selection highlighting is clearly visible

## Phase 5 — Input + minimal controls

1. Implement bottom input field with submit
2. On submit, append mock user message item
3. Add top controls (Start/Pause/Intervene/Finalize) as presentational or mock feedback

**Exit criteria**
- Input submits and appends message
- Top controls are present and visually consistent

## Phase 6 — Error guards + polish

1. Empty/fallback state for missing graph data
2. Safe defaults for missing lane config
3. Unmapped-node handling (no crash)
4. Final spacing, contrast, border, and focus polish

**Exit criteria**
- Prototype-safe behavior for expected mock failures
- Visual style matches approved dark direction

## Proposed File Structure (frontend)

```text
frontend/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    AppShell.tsx
    DebateSidebar.tsx
    TopGraphStrip.tsx
    SettingsPanel.tsx
    ReasoningLanes.tsx
    DebateInputBar.tsx
    TopControls.tsx
  lib/
    mockData.ts
    nodeLaneMap.ts
  types/
    ui.ts
```

## State Shape (prototype)

- `selectedNodeId: string | null`
- `selectedLaneId: "orchestrator" | "debater-a" | "debater-b" | "debater-c" | null`
- `laneConfigs: Record<LaneId, { model: string; personality: string }>`
- `laneMessages: Record<LaneId, string[]>`
- `laneStatus: Record<LaneId, "idle" | "speaking">`
- `draftInput: string`

## Validation Checklist (must pass)

1. Fixed-height top graph strip renders consistently
2. Graph pan/zoom/click works
3. Node click highlights mapped lane
4. Settings dropdown changes reflect in lane metadata immediately
5. 4 lanes show avatar + status + mock reasoning
6. Bottom input submits and appends mock user message
7. Desktop-only layout remains stable and readable

## Risks + Mitigations

- **Risk:** Graph area steals too much vertical space  
  **Mitigation:** lock strip height with tested value and clamp lower row min-height

- **Risk:** Lane mapping confusion  
  **Mitigation:** explicit `nodeLaneMap` fixture and visual lane labels

- **Risk:** Prototype feels too static  
  **Mitigation:** subtle status pulse + clear selected states

## Definition of Done

- All validation checklist items pass
- Prototype aligns with approved spec scope (no backend wiring)
- Code is organized for future swap from mock state to real data
