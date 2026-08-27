# ZES OS Dashboard v3 — Frost Edition

> Production observability dashboard for the **ZES** multi‑agent orchestration system.
> Built to run on **Termux / Android** and monitor agents, tasks, the orchestration
> graph, the live event bus, system health, shared memory banks, and the AI
> gateway / router infrastructure — in real time, with zero fabricated numbers.

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [The 11 pages](#the-11-pages)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Development mode](#development-mode)
- [Preview without the real gateways](#preview-without-the-real-gateways)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Data sources](#data-sources)
- [Frost design system](#frost-design-system)
- [Project structure](#project-structure)
- [Deployment on the ZES Termux node](#deployment-on-the-zes-termux-node)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Credits](#credits)

---

## Overview

`zes-dash-v3` is the front‑end for the ZES agent mesh. It is a single‑page React
app served by a **zero‑dependency Node HTTP server** that also exposes a small
JSON API (`/api/*`). The API is backed by:

- local state files written by the rest of the ZES system
  (`~/.hermes/roster.json`, `~/.hermes/tasks.json`, `~/.zes/bus/events.jsonl`,
  `~/.zes/memory/*.json`), and
- the live AI gateways — **9router / OmniRoute** (`:20128`) and **ZESRouter /
  BitRouter** (`:5050`).

If any source is unreachable the API returns `{ "error": "unreachable" }` and the
UI renders a `–` placeholder. **Numbers are never invented.**

---

## Features

- **11 focused pages** — Overview, Agents, Orchestration Flow, Event Stream,
  System Health, Memory, Fleet, Tasks (Kanban), Activity, Infrastructure, Settings.
- **Live, read‑only data** — polls local files + gateways; never mutates state.
- **Frost glassmorphism UI** — dark `#0a0a0a` canvas, blurred glass cards,
  four‑color semantic borders (blue / green / orange / red) + a holographic
  memory variant.
- **Zero‑dependency server** — `server/server.mjs` is plain Node ESM (`node:http`),
  no `node_modules` required to run the server.
- **Self‑contained build** — the React client builds to static `client/dist`.
- **Offline preview** — `server/mock-infra.mjs` stands in for the gateways so the
  dashboard can be demoed without the real ZES node.
- **Graceful degradation** — every panel degrades to `–` when its source is down.

---

## The 11 pages

| # | Page | Route | Data |
|---|------|-------|------|
| 1 | Overview | `/` | `/api/overview` (roster + tasks) |
| 2 | Agents | `/agents` | `/api/agents` |
| 3 | Orchestration Flow | `/flow` | `/api/flow` |
| 4 | Event Stream | `/events` | `/api/events` (poll, `?limit=`) |
| 5 | System Health | `/health` | `/api/health` (gateway stats + `os.uptime`) |
| 6 | Memory | `/memory` | `/api/memory` — holographic shared + agent banks |
| 7 | Fleet / Org | `/fleet` | `/api/fleet` (roster ⨝ tasks) |
| 8 | Tasks Kanban | `/tasks` | `/api/tasks` — pending / running / completed / failed |
| 9 | Activity | `/activity` | `/api/activity` (recent events) |
| 10 | Infrastructure | `/infra` | `/api/infra` (`:20128/api/usage/stats`, `:20128/v1/models`, `:5050/v1/models`) |
| 11 | Settings | `/settings` | `/api/settings` |

---

## Architecture

```
                         ┌─────────────────────────────────────────┐
        Browser ───────▶ │   ZES Dashboard v3  (Node ESM server)     │
                         │   listens on :7070  (PORT)               │
                         │                                           │
                         │   /            ──▶ client/dist (static)   │
                         │   /api/*       ──▶ handlers below         │
                         └───────┬───────────────────┬───────────────┘
                                 │                   │
                local files      │                   │   live gateways
                                 ▼                   ▼
        ┌────────────────────────────┐    ┌────────────────────┐  ┌────────────────────┐
        │ ~/.hermes/roster.json      │    │ 9router / OmniRoute │  │ ZESRouter / BitRouter│
        │ ~/.hermes/tasks.json       │    │ :20128              │  │ :5050               │
        │ ~/.zes/bus/events.jsonl    │    │ /api/usage/stats    │  │ /v1/models          │
        │ ~/.zes/memory/*.json       │    │ /v1/models          │  │                      │
        └────────────────────────────┘    └────────────────────┘  └────────────────────┘
```

The server is **read‑only**: it fetches/reads and aggregates, it never writes to
the source files or calls mutating gateway endpoints.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, TypeScript |
| Build | Vite 7 (`@vitejs/plugin-react`) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Routing | react-router-dom v6 |
| Icons | lucide-react |
| Utilities | clsx, tailwind-merge |
| Server | Node.js ESM `node:http` (zero dependencies) |

Pinned versions live in `dashboard-v3/client/package.json`.

---

## Requirements

- **Node.js ≥ 20** (the client build uses Vite 7; the server uses built‑in
  `fetch` / `AbortController`, available since Node 18).
- **npm** (tested with npm 11).
- For live data: the ZES local files and/or the gateways. Without them the
  dashboard still renders, but panels show `–` / `unreachable`.

---

## Quick start

```bash
# 1. build the client
cd dashboard-v3/client
npm install
npm run build            # → dashboard-v3/client/dist

# 2. start the server (serves the build + /api)
cd dashboard-v3
node server/server.mjs   # PORT=7070 by default

# 3. open it
#    http://127.0.0.1:7070
```

> Paths above are relative to this repository root. The application lives in the
> `dashboard-v3/` directory; the repo root also contains historical `dash-v3/`
> working folders.

---

## Development mode

Run the API server and the Vite dev server side‑by‑side for hot reload:

```bash
# terminal 1 — API + static (also serves /api)
cd dashboard-v3 && node server/server.mjs &

# terminal 2 — Vite dev server on :5173, proxies /api to :7070
cd dashboard-v3/client && npm run dev
```

Then open `http://127.0.0.1:5173`.

---

## Preview without the real gateways

`server/mock-infra.mjs` is an optional stand‑in for 9router (`:20128`) and
ZESRouter (`:5050`), so the dashboard can be previewed on a machine where the
real services are not running.

```bash
node dashboard-v3/server/mock-infra.mjs &
node dashboard-v3/server/server.mjs
```

> ⚠️ Do **not** start the mock on the production Termux node — it would shadow the
> real gateways.

---

## Configuration

All overrides are environment variables read by `server/server.mjs`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `7070` | HTTP port the dashboard listens on |
| `HOME` | `os.homedir()` | Base for the default local file paths |
| `ZES_ROSTER` | `~/.hermes/roster.json` | Agent roster |
| `ZES_TASKS` | `~/.hermes/tasks.json` | Task list |
| `ZES_BUS` | `~/.zes/bus/events.jsonl` | Event bus (JSONL) |
| `ZES_MEMORY` | `~/.zes/memory` | Memory banks directory (`*.json`) |
| `ZES_GW` | `http://127.0.0.1:20128` | 9router / OmniRoute gateway |
| `ZES_ROUTER` | `http://127.0.0.1:5050` | ZESRouter / BitRouter gateway |

Example:

```bash
PORT=8080 ZES_GW=http://10.0.0.5:20128 node dashboard-v3/server/server.mjs
```

---

## API reference

All routes are `GET`, return JSON, and set `Access-Control-Allow-Origin: *`.
Unreachable backends yield `{ "error": "unreachable" }`.

| Route | Source | Notes |
|-------|--------|-------|
| `/api/overview` | roster + tasks | agent/task counts, warnings, errors, uptime |
| `/api/agents` | roster ⨝ tasks | per‑agent status + task counts |
| `/api/flow` | roster + tasks | orchestration graph (`nodes` + `edges`) |
| `/api/events` | `~/.zes/bus/events.jsonl` | reversed event feed; `?limit=` (max 500) |
| `/api/activity` | bus (last 100) | recent activity |
| `/api/tasks` | tasks file | raw task list |
| `/api/fleet` | roster ⨝ tasks | org/fleet totals + agents |
| `/api/health` | `ZES_GW/api/usage/stats` + `os` | gateway stats + loadavg / memory / uptime |
| `/api/infra` | `ZES_GW` + `ZES_ROUTER` | usage stats, gateway models, router models, node info |
| `/api/memory` | `ZES_MEMORY/*.json` | memory banks with mtime/size |
| `/api/settings` | server config | sources, endpoints, dashboard version/poll |

---

## Data sources

| Source | Path / URL |
|--------|-----------|
| Roster | `~/.hermes/roster.json` |
| Tasks | `~/.hermes/tasks.json` |
| Event bus | `~/.zes/bus/events.jsonl` |
| Memory banks | `~/.zes/memory/*.json` |
| Gateway usage stats | `http://127.0.0.1:20128/api/usage/stats` |
| Gateway models | `http://127.0.0.1:20128/v1/models` |
| Router models | `http://127.0.0.1:5050/v1/models` |
| Node uptime | `os.uptime()` |

If a source is unreachable the API returns `{ "error": "unreachable" }` and the
UI shows `–`.

---

## Frost design system

- Background `#0a0a0a` with a subtle radial gradient in the top‑right.
- Every card: `bg-black/40` + `backdrop-blur-xl` + frost border + `rounded-2xl`
  + color‑matched glow.
- **4‑color frost semantics** — **blue** = default/main, **green** = running/
  healthy, **orange** = warning/pending, **red** = error/failed. Memory uses a
  **holographic** (violet/cyan conic‑gradient) variant.
- Sidebar: persistent 240 px on desktop with the 11 lucide icons
  (`LayoutDashboard`, `Users`, `GitBranch`, `Radio`, `HeartPulse`,
  `BrainCircuit`, `Building2`, `ListTodo`, `Activity`, `Server`, `Settings`);
  hamburger drawer below 768 px.
- Right drawer: live bus feed + router metrics (cache, proxy pool, breakers).
- Fonts: Inter (UI) + JetBrains Mono (data).
- Frost CSS custom properties (`--frost-blue`, etc.) are **space‑separated RGB
  triples** (`64 156 255`) so they compose with the `rgba(var(--frost) / a)`
  syntax.

---

## Project structure

```
dashboard-v3/
├── server/
│   ├── server.mjs          # Node ESM server, all /api/* routes, serves client/dist
│   └── mock-infra.mjs      # optional preview-only gateway mock (do NOT use on node)
├── client/
│   ├── package.json  vite.config.ts  tsconfig.json  index.html
│   └── src/
│       ├── main.tsx  App.tsx  index.css
│       ├── routes/          # Overview, Agents, Flow, EventStream, SystemHealth,
│       │                    # Memory, Fleet, Tasks, Activity, Infrastructure, Settings
│       ├── components/
│       │   ├── layout/      # TopBar, Sidebar (11 nav items), RightDrawer
│       │   ├── ui/          # GlassCard, Bullet, ProgressBar, Sparkline, BarChart
│       │   ├── StatsCard.tsx  ModuleCard.tsx  TaskCard.tsx  EventItem.tsx  PageHeader.tsx
│       ├── hooks/useFetch.ts
│       ├── lib/             # api.ts  theme.ts  types.ts
│       └── utils/cn.ts
└── README.md
```

---

## Deployment on the ZES Termux node

On the ZES Termux node the dashboard is launched automatically on **`:7070`**
alongside the rest of the mesh, e.g.:

| Service | Port |
|---------|------|
| opencode serve | `:4050` |
| claude‑mem worker | `:37758` |
| ZES Dashboard | `:7070` |
| ZESRouter UI (Frost Control Panel) | `:8090` |
| zen keyless relay | `:7077` |
| 9router / OmniRoute | `:20128` |
| ZESRouter / BitRouter API | `:5050` |

To run the dashboard standalone (outside that wrapper) just use the
[Quick start](#quick-start) commands. Background it with your process manager of
choice (e.g. `setsid node dashboard-v3/server/server.mjs >dash.log 2>&1 &`).

---

## Troubleshooting

- **Browser shows `not found — run: cd client && npm install && npm run build`**
  → `client/dist` is missing. Build the client first (see Quick start).
- **Panels show `–` / `unreachable`** → the relevant source file or gateway is
  down. Check paths (`ZES_ROSTER`, `ZES_TASKS`, `ZES_BUS`, `ZES_MEMORY`) and that
  `ZES_GW` (`:20128`) / `ZES_ROUTER` (`:5050`) are reachable.
- **Port already in use** → set `PORT` to something free.
- **CORS / cross‑origin** → the server already sends
  `Access-Control-Allow-Origin: *`; no extra config needed.

---

## License

See [`LICENSE`](./LICENSE) in this repository.

---

## Credits

- Design system: [ZESCODE/frost-cards](https://github.com/ZESCODE/frost-cards)
- Chart / graph inspiration: [tt-a1i/archify](https://github.com/tt-a1i/archify)
- Built as part of the ZES agent‑orchestration system.
