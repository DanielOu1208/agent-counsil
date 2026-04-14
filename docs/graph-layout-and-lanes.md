# Graph Layout and Lane Mapping

## Status
Current implementation notes for the top graph strip.

## What This Covers

The graph UI now focuses on two related ideas:

- showing debate structure clearly as message nodes and edges
- making the selected lane and personality easier to understand at a glance

## Lane Mapping

Each node is associated with a reasoning lane through the app shell layer. That lane is used to:

- determine which lane should be highlighted when a node is selected
- show the lane personality name in the graph node summary
- keep the graph visually aligned with the active debate configuration

## Visual Treatment

Graph nodes are rendered in a compact form with:

- a title line for the message type
- a personality line for the lane persona
- a message-type line for quick scanning
- a colored lane accent on the left edge of the node

This keeps the graph readable even when a debate has many nodes.

## Layout Behavior

The graph strip uses ELK layered layout to improve spacing and reduce overlap in denser trees.

Fallback behavior exists if ELK fails, so the graph still renders in a basic grid arrangement.

The layout logic also applies a few readability adjustments:

- sibling agent nodes are ordered by lane
- multi-parent targets are centered relative to their parents
- only nodes and edges currently in the graph are considered for layout

## Open Node Behavior

Clicking a node can open its corresponding detail tab in the bottom workspace.
When a node already has an open tab, the workspace reuses that tab instead of creating a duplicate.

## Why This Exists

These changes make the graph useful as a navigation surface instead of just a static visualization.
Readers should be able to see:

- which lane produced a node
- how a branch evolved
- which nodes belong together in the debate flow

