# Bottom Tabbed Workspace

## Status
Current UI direction for node details and workspace navigation.

## Purpose

The workspace replaces the older floating card and popout pattern with a single bottom tab system.
This keeps the screen hierarchy predictable:

1. Graph area
2. Text input row
3. Bottom tabbed workspace

## Tab Types

The workspace supports two categories of tabs.

### Fixed Tabs

These always exist and are not closable:

- Configuration
- Personality
- Lanes

### Dynamic Tabs

These are created when a user opens a node detail view.

- one tab per node
- tab title comes from the node title
- duplicates are avoided
- dynamic tabs are closable
- dynamic tabs are not persisted across refresh

## Interaction Rules

- Opening a node creates the tab if needed, then focuses it.
- Closing an active dynamic tab moves focus left when possible.
- If no left tab exists, the workspace falls back to Configuration.
- Tabs can be reordered and moved between panes as part of the workspace management flow.

## State Ownership

`AppShell` owns the workspace state and coordinates it with graph selection.
The bottom workspace component is responsible for rendering the tab bar and the active content panel.

## User Value

This structure gives the user one place to manage:

- debate configuration
- personality setup
- lane behavior
- node inspection

It also reduces the visual overhead of separate popouts and makes workspace navigation easier to follow.

