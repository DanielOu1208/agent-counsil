# Agent Council — Backend Setup

## Prerequisites

- **Node.js** >= 18 (check with `node -v`)
- **npm** (comes with Node.js)
- **Python 3** (needed by `better-sqlite3` native build on some systems)
- **C++ build tools** (for `better-sqlite3` native compilation):
  - **macOS**: `xcode-select --install`
  - **Ubuntu/Debian**: `sudo apt install build-essential python3`
  - **Windows**: `npm install -g windows-build-tools`

## Quick Start

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Copy environment file and add your API keys
cp .env.example .env

# 3. (Optional) Add your LLM API keys to .env
#    - OpenAI: https://platform.openai.com/api-keys
#    - Gemini: https://aistudio.google.com/apikey
#    - Or leave blank and use "mock:default" for testing

# 4. Create the database
npm run db:push

# 5. Start the dev server (with hot reload)
npm run dev
```

The server runs on **http://localhost:3001** by default.

## Available Scripts

| Command             | Description                            |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Start with hot reload (development)    |
| `npm start`         | Start without hot reload (production)  |
| `npm run setup`     | Install deps + create database         |
| `npm run db:push`   | Push schema changes to SQLite          |
| `npm run db:studio` | Open Drizzle Studio (DB browser)       |

## API Keys & Models

You need **at least one** LLM provider key, or use the mock adapter for testing.

| Provider | Model Keys                                          | Get a Key                              |
| -------- | --------------------------------------------------- | -------------------------------------- |
| OpenAI   | `openai:gpt-4o`, `openai:gpt-4o-mini`              | https://platform.openai.com/api-keys   |
| Gemini   | `gemini:gemini-2.0-flash`, `gemini:gemini-1.5-pro`  | https://aistudio.google.com/apikey     |
| Mock     | `mock:default`, `mock:fast`                         | No key needed (simulated responses)    |

Set your keys in `.env`:

```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...
SYNTHESIS_MODEL=gemini:gemini-2.0-flash
```

For testing without keys, use:

```
SYNTHESIS_MODEL=mock:default
```

## API Endpoints

### Health
- `GET /health` — Server status
- `GET /api/models` — List available models

### Debates
- `POST /api/debates` — Create a debate
- `GET /api/debates` — List all debates
- `GET /api/debates/:id` — Get debate details
- `GET /api/debates/:id/graph` — Get nodes + edges (optional `?branch_id=`)
- `POST /api/debates/:id/start` — Start the debate
- `POST /api/debates/:id/intervene` — Inject user intervention
- `POST /api/debates/:id/finalize` — Force final synthesis

### Streaming
- `GET /api/stream/:id/stream` — SSE stream for live debate events

### Regeneration
- `POST /api/debates/nodes/:nodeId/regenerate` — Regenerate from a node

### Branch Management
- `POST /api/debates/:id/branches/:branchId/activate` — Switch active branch

### Personalities
- `GET /api/personalities` — List all presets
- `POST /api/personalities` — Create custom personality
- `PATCH /api/personalities/:id` — Update personality
- `DELETE /api/personalities/:id` — Delete custom personality

## Troubleshooting

### `npm install` fails with `better-sqlite3` error
You need C++ build tools. See Prerequisites above.

### Server starts but API calls return 429
Your API key has no quota. Either add billing to your provider account or use `mock:default`.

### `drizzle-kit push` fails with "directory does not exist"
Run `mkdir -p data` first, then retry.

### Port 3001 already in use
Kill the existing process: `kill $(lsof -ti:3001)` or change `PORT` in `.env`.
