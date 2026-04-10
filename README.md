# Agent Council

Agent Council is a multi-agent decision workspace where several AI agents debate a question, critique each other, and converge on a final recommendation.

It includes:
- a Next.js frontend for configuring debates and visualizing debate graphs
- a Hono + TypeScript backend that orchestrates debate phases and streams events
- Postgres persistence (via Drizzle ORM) for debates, branches, nodes, edges, and runs

## Who This Is For

- Contributors who want to build or extend the system
- Developers who want to try structured multi-agent debates locally
- Anyone evaluating this project as a prototype for orchestrated agent workflows

## Core Capabilities

- Configure a debate with multiple agents (model + personality per agent)
- Orchestrator-driven debate phases (instead of uncontrolled free chat)
- Streamed debate output via SSE
- Graph view of message nodes and relationships
- User interventions during a run
- Regeneration from a specific node into a new branch
- Personality preset and custom personality management

## Tech Stack

- Frontend: Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui
- Backend: Hono, TypeScript, Node.js, Drizzle ORM
- Database: Postgres
- Model providers: OpenRouter

## Repository Structure

```text
agent-counsil/
├── frontend/      # Next.js app (UI)
├── backend/       # Hono API + orchestrator + DB layer
├── SPEC.md        # Current UX/implementation spec notes
├── prd.md         # Product requirements document
└── render.yaml    # Render deployment config (backend)
```

## Quick Start (Local)

### 1. Prerequisites

- Node.js 18+
- npm
- A running Postgres database

### 2. Start the backend

```bash
cd backend
npm install
```

Create `backend/.env` with at least:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
DRIZZLE_DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME

# Required model provider
OPENROUTER_API_KEY=sk-or-...

# Optional runtime config
PORT=3001
```

Then run:

```bash
npm run db:push
npm run dev
```

Backend default URL: `http://localhost:3001`

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Then run:

```bash
npm run dev
```

Frontend default URL: `http://localhost:3000`

## Environment Variables

### Backend

- `DATABASE_URL` (required): runtime DB connection
- `DRIZZLE_DATABASE_URL` (required for `npm run db:push`): migration/schema push connection
- `OPENROUTER_API_KEY` (required): enables OpenRouter-backed models
- `PORT` (optional): backend port (defaults to `3001`)
- `OPENROUTER_REFERER` (optional): OpenRouter request header override
- `OPENROUTER_TITLE` (optional): OpenRouter request header override

### Frontend

- `NEXT_PUBLIC_API_BASE_URL` (optional): API base URL (defaults to `http://localhost:3001`)

## API Overview

Base URL: `http://localhost:3001`

- `GET /health`
- `GET /api/models`
- `GET /api/personalities`
- `POST /api/personalities`
- `PATCH /api/personalities/:id`
- `DELETE /api/personalities/:id`
- `POST /api/debates`
- `GET /api/debates`
- `GET /api/debates/:id`
- `GET /api/debates/:id/graph`
- `POST /api/debates/:id/start`
- `POST /api/debates/:id/continue`
- `POST /api/debates/:id/intervene`
- `POST /api/debates/:id/finalize`
- `POST /api/debates/nodes/:nodeId/regenerate`
- `POST /api/debates/:id/branches/:branchId/activate`
- `GET /api/stream/:id/stream` (SSE)

## Contributing

1. Fork or branch from `main`.
2. Install dependencies in both `backend/` and `frontend/`.
3. Run backend + frontend locally and verify core flows (create debate, start debate, receive streamed messages, view graph updates).
4. Open a PR with a short change summary and any setup notes.

## Troubleshooting

- `DATABASE_URL environment variable is required`
  - Ensure `backend/.env` exists and includes `DATABASE_URL`.
- `db:push` fails due to missing URL
  - Set `DRIZZLE_DATABASE_URL` in `backend/.env`.
- Frontend cannot reach backend
  - Check `NEXT_PUBLIC_API_BASE_URL` and confirm backend is running.
- CORS errors from non-localhost origin
  - Current backend CORS policy explicitly allows localhost/127.0.0.1 origins.

## Current Status

Prototype in active development. Expect breaking changes in API shape and UI behavior as debate orchestration and workspace UX continue to evolve.
