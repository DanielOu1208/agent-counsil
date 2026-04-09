# Bottom Tabbed Workspace Spec

## Status
Approved design for replacing the current card + popout layout with a unified bottom tab system.

## Goal
Make the interface more intuitive by replacing separate floating cards/popouts with a single bottom tab workspace.

## Required Changes
1. Replace current card system for:
   - Generate Personality
   - Configuration
   - Popout cards
2. Add a tab system in the bottom half of the screen to hold these views.
3. Remove the avatar/lane bar currently above the textbox.
4. Move the textbox to live above the new tab container.

## Chosen UX Approach
Approach 1: **Single bottom workspace with mixed tabs**.

Layout order (top → bottom):
1. Graph area
2. Textbox row
3. Tabbed workspace container

## Tab Model

### Fixed tabs (always present, not closable)
- Configuration
- Personality
- Lanes

### Dynamic tabs (ephemeral, closable)
- One tab per opened popout/node.
- Tab label = node title.
- If node tab already exists, focus existing tab (no duplicates).
- New dynamic tabs append to the end.
- On close active tab, activate tab to the left.
- Tabs are **not persisted** across refresh/session.

### Overflow behavior
- Tab bar uses horizontal scrolling.

### Default active tab
- Configuration on first load.

## Interaction Rules

### Opening node details
When a node/popout is opened:
1. Resolve tab ID from node ID.
2. If tab exists, focus it.
3. If tab does not exist, create new dynamic node tab, append it, and focus it.

### Closing tabs
- Fixed tabs cannot be closed.
- Closing active dynamic tab activates immediate left tab.
- If no left tab exists, fallback to Configuration.

## Content Placement
- Configuration tab: existing configuration/settings functionality.
- Personality tab: existing generate-personality functionality.
- Lanes tab: functionality currently shown in the avatar/lane bar above textbox.
- Dynamic node tabs: existing popout detail content rendering.

## Component Boundary Plan
- `AppShell` owns layout stack and tab state.
- `BottomTabbedWorkspace` (new) renders tab bar + panel areas.
- `TopGraphStrip` should emit selection/open events for node tab creation.
- Legacy floating popout card path should be removed from final UI path.

## State Model (high-level)
- `tabs: TabItem[]` (fixed + dynamic)
- `activeTabId: string`
- Optional `selectedNodeId` (or derive from active node tab)

## Migration Phases
1. Introduce bottom tab container with fixed tabs and new page stack.
2. Wire dynamic node tabs and details rendering.
3. Remove avatar bar above textbox and remove floating popout UI path.
4. Polish accessibility, responsiveness, and scroll behavior.

## Acceptance Criteria
- Graph/Textbox/Tabs are stacked in this order: Graph → Textbox → Tabs.
- Fixed tabs exist: Configuration, Personality, Lanes.
- Avatar bar above textbox is removed.
- Opening a node creates/focuses exactly one dynamic tab titled with node title.
- Duplicate node tabs are not created.
- Dynamic tabs append to end; closing active tab moves focus left.
- Dynamic tabs are ephemeral (not restored on refresh).
- Tab bar supports horizontal overflow scrolling.
- Floating popout overlays are removed from final experience.
- Keyboard/screen-reader tab semantics are implemented.
