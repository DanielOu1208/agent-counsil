# Sidebar, Debate Switching, and Model Usage

## Status
Implementation notes for debate navigation and session-level feedback.

## Sidebar Responsibilities

The sidebar is used for debate navigation and status awareness.

It can:

- list debates
- show loading state while debate history is being fetched
- show an error state when fetches fail
- highlight the active debate
- switch the user between debates

## Debate Behavior

The app treats each debate as its own isolated run.
Users can move between debates without sharing context across them.

The sidebar is part of the main navigation surface for that flow.

## Model and Usage Feedback

The current UI also surfaces model-related context for the active session.

That includes:

- model selection browsing
- pricing estimation
- token and cost tracking for the current session
- handling of unknown cost states when pricing cannot be resolved cleanly

## Why This Matters

These pieces help the user understand:

- which debate they are viewing
- whether data is still loading
- whether the backend is healthy enough to continue
- what the session is using in terms of tokens and estimated cost

That makes the app feel more explicit during long-running debate sessions.

