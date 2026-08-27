

MISSION: Build ZES OS Dashboard v3 – 10 Pages, Modern Design, Live Data

You are to create a production dashboard for an AI‑agent orchestration system running on Termux (Android).
It must:

1. use frost color to all card
2. Include ALL 10 pages listed below.
3. Use live data only – every number must come from real sources (files or HTTP APIs). if possible 

---

THE 10 PAGES (routes & descriptions)

# Page Route Description
1 Overview / Main dashboard with top‑level stats (agents online, running pipelines, warnings, errors) – keep as in template

2 Agents /agents Detailed list of all agents with status, tasks, latency – keep as in template

3 Orchestration Flow /flow Visual representation of request paths between agents – keep as in template

4 Event Stream /events Live feed of bus events (SSE or polling) 

5 System Health /health Gateway metrics: cache, proxy pool, circuit breakers, uptime – keep as in template

6 Memory /Memory pages that show shared memory with holographic 

7 Fleet / Org /fleet Organization roster with live agent status (merge roster.json + tasks.json)

8 Tasks Kanban /tasks Kanban board with columns: pending, running, completed, failed

9 Activity /activity Real‑time event stream from bus (poll every ≤5s, no SSE) – similar to Event Stream but with different layout

10 Infrastructure /infra Raw stats from :20128/api/usage/stats, :20128/v1/models, :5050/v1/models

11 Settings /settings Configuration endpoints 
---

VISUAL DESIGN (from the templates – replicate exactly)

· Background: #0a0a0a with subtle radial gradient in top‑right.
· Cards: bg-black/40), backdrop-blur-xl, border border- frost blue, rounded-2xl, shadow‑lg.
· Accent: frost blue – for headers, badges, active links, progress bars.
· Sidebar: width ~240px, dark , with 10 icons (one for each page). Use appropriate lucide-react icons:
  · Dashboard: LayoutDashboard
  · Agents: Users
  · Flow: GitBranch
  · Event Stream: Radio
  · System Health: HeartPulse
  · Memory : memory pages with holographic 
  · Fleet: Building2 (or Users)
  · Tasks: ListTodo
  · Activity: Activity
  · Infrastructure: Server
  • Settings: Settings
· Responsive: sidebar collapses to hamburger on mobile (<768px).
· Font: Inter (Google Fonts).

---

TECH STACK

· Client: React 19 + Vite 7 + Tailwind 4 (@tailwindcss/vite) + TypeScript (optional).
· Routing: react-router-dom v6.
· Icons: lucide-react.
· Server: Node.js ESM (http module) – zero extra server dependencies. Serves built client/dist and provides /api/* endpoints.

---

LIVE DATA SOURCES (read‑only, no mocks)

Source Path / URL Used by
Roster ~/.hermes/roster.json Fleet, Agents, Overview
Tasks ~/.hermes/tasks.json Tasks Kanban, Fleet, Overview
Event bus ~/.zes/bus/events.jsonl Event Stream, Activity
Infra stats http://127.0.0.1:20128/api/usage/stats http://127.0.0.1:20128/v1/models http://127.0.0.1:5050/v1/models Infrastructure, System Health
System uptime os.uptime() System Health, Infrastructure
check this files for live data

If a source is unreachable → return { error: "unreachable" } – never fabricate numbers.

---

SERVER API ENDPOINTS (implement all)

Endpoint Returns Source
GET /api/overview Aggregated stats (agents online, running tasks, warnings, errors) roster + tasks
GET /api/agents Detailed agent list with status, tasks, latency roster + tasks
GET /api/flow Agents with connections (for orchestration flow) roster + tasks
GET /api/events Live event stream (SSE or polling) events.jsonl
GET /api/health Cache, proxy pool, circuit breakers, uptime HTTP calls to :20128 + os.uptime()
GET /api/settings (Static config – can return empty or predefined) –
GET /api/fleet Roster + tasks merged – each agent gets online, runningTasks, warnings, errors roster + tasks
GET /api/tasks Full tasks list (for Kanban) tasks.json
GET /api/activity Last 100 events (tail of file) events.jsonl
GET /api/infra Combined raw stats from the three infra HTTP endpoints HTTP calls

Note: /api/events and /api/activity can both read from the same source, but they are separate endpoints for different UI views.

---

FILE STRUCTURE (create these)

```
~/zes-os/dashboard-v3/
├── server/
│   └── server.mjs          # Node ESM server with all /api/* routes
├── client/
│   ├── package.json        # (use the one you provided – react, vite, tailwind, lucide-react, react-router-dom)
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx         # Routes for all 10 pages
│   │   ├── routes/
│   │   │   ├── Overview.tsx
│   │   │   ├── Agents.tsx
│   │   │   ├── Flow.tsx
│   │   │   ├── EventStream.tsx
│   │   │   ├── SystemHealth.tsx
│   │   │   ├── Fleet.tsx
│   │   │   ├── Tasks.tsx           
│   │   │   ├── Activity.tsx
│   │   │   ├── Infrastructure 
│   │   │   └── Settings.tsx.  
│   │   ├── components/
│   │   │   ├── Sidebar.tsx     # includes all 10 nav items
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ModuleCard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── EventItem.tsx
│   │   ├── hooks/
│   │   │   └── useFetch.ts
│   │   └── lib/
│   │       └── api.ts
│   └── public/
└── README.md
```

---

PAGE‑BY‑PAGE REQUIREMENTS (NEW pages only – keep existing 6 as in template)

✅ Fleet (/fleet)

· Top stats: total agents, online, running tasks, warnings, errors.
· List each agent with status badge, description, task count.
· Merge roster.json (agent metadata) with tasks.json (tasks assigned to them) to compute live status.

✅ Tasks Kanban (/tasks)

· Four columns: pending, running, completed, failed.
· Each task card shows title, assigned_to, priority (high/normal/low), and timestamp.
· No drag‑and‑drop required – just render static boards.

✅ Activity (/activity)

· Reverse‑chronological list of events from the bus.
· Each event: timestamp, source, type, payload snippet.
· Poll /api/activity every 5 seconds (no SSE – use setInterval).
· Keep last 200 events in memory on the client.

✅ Infrastructure (/infra)

· Display cards for:
  · Semantic Cache: hit %, hits/misses, TTL.
  · Free Proxy Pool: used/total, rotation status.
  · Circuit Breakers: list of tripped breakers with cooldown.
  · Node Uptime: system uptime (from os.uptime()).
· All numbers come from the three HTTP endpoints – if an endpoint fails, show –.

---

KEEP EXISTING 6 PAGES AS IN TEMPLATE

· Do not change the layout, content, or data presentation of Overview, Agents, Orchestration Flow, Event Stream, System Health, and Settings.
· Make sure their data also comes from the live sources (e.g., Overview uses aggregated stats from /api/overview, Agents from /api/agents, etc.).
· The design and behaviour should match the screenshots you shared earlier.

---

RUN COMMANDS

```bash
cd client && npm install && npm run build
cd .. && node server/server.mjs   # PORT=7070 (default)
```

Open http://127.0.0.1:7070

---

NON‑NEGOTIABLE RULES

1. Zero mock data – every number must come from a live source.
2. Read‑only – the server never writes to ~/.hermes/ or ~/.zes/.
3. Memory‑efficient – Node server RSS < 80MB, cold start < 2s.
4. Design must match the templates – dark glass, purple accent, sidebar with icons.
5. All 10 pages must be accessible from the sidebar.

---

DELIVERABLES

Provide complete, runnable code for every file listed in the structure above. No TODOs, no placeholders – all pages functional with live data.

---

Build it 