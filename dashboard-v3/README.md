# ZES OS Dashboard v3 — Frost Edition

Production dashboard for the ZES agent-orchestration system (Termux / Android).
Merged from `dash-v3/Part1` (header, left/right drawers, pages) + `dash-v3/Part2`
(front page, part of left drawer), rebuilt on the
[frost-cards](https://github.com/ZESCODE/frost-cards) design system, with
[archify](https://github.com/tt-a1i/archify)-inspired charts/graphs for
Infrastructure, System Health and Activity.

## The 11 pages

| # | Page | Route | Data |
|---|------|-------|------|
| 1 | Overview | `/` | `/api/overview` (roster + tasks) |
| 2 | Agents | `/agents` | `/api/agents` |
| 3 | Orchestration Flow | `/flow` | `/api/flow` |
| 4 | Event Stream | `/events` | `/api/events` (3s poll) |
| 5 | System Health | `/health` | `/api/health` (:20128 + os.uptime) |
| 6 | Memory | `/memory` | `/api/memory` — holographic shared + agent banks |
| 7 | Fleet / Org | `/fleet` | `/api/fleet` (roster ⨝ tasks) |
| 8 | Tasks Kanban | `/tasks` | `/api/tasks` — pending / running / completed / failed |
| 9 | Activity | `/activity` | `/api/activity` (setInterval 5s, last 200 kept client-side) |
| 10 | Infrastructure | `/infra` | `/api/infra` (:20128/api/usage/stats, :20128/v1/models, :5050/v1/models) |
| 11 | Settings | `/settings` | `/api/settings` |

## Live data sources (read-only)

| Source | Path / URL |
|--------|-----------|
| Roster | `~/.hermes/roster.json` |
| Tasks | `~/.hermes/tasks.json` |
| Event bus | `~/.zes/bus/events.jsonl` |
| Memory banks | `~/.zes/memory/*.json` |
| Infra stats | `http://127.0.0.1:20128/api/usage/stats`, `:20128/v1/models`, `:5050/v1/models` |
| Uptime | `os.uptime()` |

If a source is unreachable the API returns `{ "error": "unreachable" }` and the
UI shows `–`. Numbers are never fabricated.

Paths can be overridden with env vars: `ZES_ROSTER`, `ZES_TASKS`, `ZES_BUS`,
`ZES_MEMORY`, `ZES_GW`, `ZES_ROUTER`, `PORT`.

## Frost design system

- Background `#0a0a0a` with a subtle radial gradient in the top-right.
- Every card: `bg-black/40` + `backdrop-blur-xl` + frost border + `rounded-2xl` + color-matched glow.
- 4-color frost semantics — **blue** = default/main, **green** = running/healthy,
  **orange** = warning/pending, **red** = error/failed. Memory uses a **holographic**
  (violet/cyan conic-gradient) variant.
- Sidebar: persistent 240 px on desktop with the 11 lucide icons
  (LayoutDashboard, Users, GitBranch, Radio, HeartPulse, BrainCircuit, Building2,
  ListTodo, Activity, Server, Settings); hamburger drawer below 768 px.
- Right drawer: live bus feed + router metrics (cache, proxy pool, breakers).
- Fonts: Inter (UI) + JetBrains Mono (data).

## Stack

React 19 · Vite 7 · Tailwind 4 (`@tailwindcss/vite`) · TypeScript ·
react-router-dom v6 · lucide-react. Server is a zero-dependency Node ESM
`http` server that serves `client/dist` and all `/api/*` routes.

## Run

```bash
cd client && npm install && npm run build
cd .. && node server/server.mjs        # PORT=7070 (default)
# open http://127.0.0.1:7070
```

Dev mode (hot reload, API proxied to :7070):

```bash
node server/server.mjs &               # API
cd client && npm run dev               # Vite on :5173
```

### Preview without the real gateway

`server/mock-infra.mjs` is an optional stand-in for OmniRoute (:20128) and the
ZES Router (:5050) so the dashboard can be previewed on machines where the real
services are not running. **Do not start it on the Termux node.**

```bash
node server/mock-infra.mjs &
node server/server.mjs
```

## Structure

```
dashboard-v3/
├── server/
│   ├── server.mjs          # Node ESM server, all /api/* routes
│   └── mock-infra.mjs      # optional preview-only gateway mock
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
│       └── lib/             # api.ts  theme.ts  types.ts
└── README.md
```
