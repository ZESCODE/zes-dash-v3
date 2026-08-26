# ZES OS Dashboard v3

Real-data orchestration dashboard for a phone-hosted AI-agent fleet (Termux aarch64).

## Stack
Single Node ESM server (`node:http`), **zero runtime dependencies**, vanilla ES-module
frontend. Chosen over Next.js dev mode (the previous attempt) because the phone needs
cold start <2s and RSS <80MB — a framework dev server is too heavy. All data aggregation
happens server-side in `/api/*` routes so the browser makes few requests.

## Run
```
PORT=7070 node server.mjs
```
No build step. Serves on `PORT` env or `7070`. Open http://127.0.0.1:7070/

## Data sources (all live, read-only)
| Endpoint | Source |
|----------|--------|
| `/api/status` | TCP/HTTP probe of :20128 :5050 :7077 :9222 |
| `/api/tasks` | `~/.hermes/tasks.json` |
| `/api/activity` | `~/.zes/bus/events.jsonl` (append-only) |
| `/api/fleet` | `~/.hermes/roster.json` + tasks merge for live status |
| `/api/infra` | `:20128/api/usage/stats`, `:20128/v1/models`, `:5050/v1/models` |

If a source is down, the endpoint reports it honestly (`unavailable` / `unreachable`).
All values come from live sources; none are fabricated anywhere in `server.mjs` or `public/`.

## Pages
Fleet/Org (`/`), Tasks Kanban (`/tasks`), Activity (`/activity`), Infrastructure (`/infra`).
Frost design system CSS reused from `public/css/` (copied from frost-cards).

## Known limitations
- Activity uses file polling (no SSE) — refresh ≤5s.
- Lightpanda CDP (`:9222`) is probed but not yet embedded.
