# MISSION: Build "ZES OS Dashboard v3" — orchestration dashboard for a phone-hosted AI agent fleet

You are building a REAL dashboard for an AI-agent orchestration system that runs entirely
on one Android phone (Termux, aarch64). It replaces an older dashboard whose focus was:
orchestration / parallel agents / subagents — NOT just router stats.

## NON-NEGOTIABLE RULES
1. **ZERO fake data.** Every number rendered must come from a live source listed below.
   If a source is down or empty → render state "unavailable"/empty honestly.
   Forbidden words anywhere in source: mock, fake, dummy, fixture, sample-data, lorem.
2. **Read-only.** You may READ ~/.hermes/*.json, ~/.zes/bus/events.jsonl and HTTP APIs.
   You must NEVER write to them (the orchestrator owns them).
3. **Do not touch** anything outside your working directory ~/zes-os/dashboard-v3/
   (especially: ~/zes-os/zeso.mjs, port 8090 app, gateways on 20128/5050/7077).

## ENVIRONMENT (verified facts)
- Termux Android aarch64. Node v26.4 (has built-in WebSocket, fetch). Python 3.14.
- Phone: keep RAM low. Target: server < 80MB RSS, cold start < 2s, zero/minimal deps.
- Working dir to create: ~/zes-os/dashboard-v3/

## LIVE DATA SOURCES (all verified working — use these, only these)

### A. Event bus (the heartbeat of orchestration)
- File (append-only JSONL): ~/.zes/bus/events.jsonl
- CLI: python3 ~/.hermes/events_bus.py --json list <limit> <source> <type>
        python3 ~/.hermes/events_bus.py --json stats
        (filters may be empty strings "" meaning all)
- Event record shape:
  {"id":"a1b2c3d4e5f6","ts":"2026-08-26T09:19:25.123Z","source":"zeso",
   "type":"task.completed","agent":"pollinations",
   "payload":{"id":"t-xxx","exit_code":0,"duration_ms":8396,"tail":"..."}}
- Event types you will see: daemon.started, task.queued, task.running,
  attempt.started, task.completed, task.failed, judge.unavailable, daemon.error

### B. Tasks (kanban + org view) — ~/.hermes/tasks.json
{"tasks":[{
  "id":"t-811e3c26","title":"real-llm smoke","description":"",
  "assigned_to":"pollinations","priority":"high|normal|low","company_id":"zes-os",
  "status":"pending|running|completed|failed","created_at":"<iso>",
  "parent":"t-parentid|null","cwd":"...","bestOf":1,
  "attempts":[{"agent":"api:pollinations/kimi-k3","code":1,"ms":3914}],
  "started_at":"<iso>","finished_at":"<iso>","exit_code":0,"duration_ms":8396,
  "result_tail":"last 500 chars of worker output"}]}
Kanban columns: pending | running | completed | failed

### C. Roster / org chart — ~/.hermes/roster.json
{"company":{"id,name,description,status,monthlyBudgetCents,spentMonthCents},
 "agents":[{"id":"opencode","name":"OpenCode","role":"orchestrator","status":
   "active|running|paused|error","reportsTo":null|"agentId",
   "budgetMonthlyCents":0,"spentMonthCents":0}],
 "budget_policies":[]}
Org chart = tree built from reportsTo (null = root). Currently 5 flat agents:
opencode, claude, codex, agy, hermes.

### D. Companies — ~/.hermes/companies.json = {"companies":[{...same as company}]}

### E. Live HTTP (all local, GET):
- http://127.0.0.1:20128/api/usage/stats
    {"totalRequests":231,"totalPromptTokens":3102128,"totalCompletionTokens":24417,
     "totalCachedTokens":1554431,"totalCost":5.30,
     "byProvider":{"<provider>":{"requests":n,"promptTokens":n,...}}}
- http://127.0.0.1:20128/api/providers
    {"connections":[{id,provider,name,testStatus:"active|unknown",priority,...}]}
- http://127.0.0.1:20128/v1/models  → {"data":[...]} (~853 models)
- http://127.0.0.1:5050/v1/models    → {"data":[...]} (47 keyless models)
- http://127.0.0.1:7077/health       → {"ok":true}  (zen relay)
- ws://127.0.0.1:9222                → Lightpanda CDP (browser tool, optional)

## PAGES TO BUILD

1. **Fleet / Org** (default "/")
   - Company header from roster.company
   - Org chart tree from reportsTo
   - LIVE status merge: an agent tile shows "running" if any tasks.json entry has
     status=running && assigned_to == agent.id; else roster status; dot green/gray.
   - Active task count + last event per agent.

2. **Tasks Kanban** ("/tasks")
   - 4 columns pending/running/completed/failed from tasks.json (real records incl.
     attempts[], duration, result_tail expandable on click).
   - Subagent linkage: tasks with parent!=null render nested/indented under parent id.

3. **Activity** ("/activity")
   - Live feed from event bus (newest first), auto-refresh ≤5s (SSE preferred if your
     stack makes it easy; else polling).
   - Filters by source/type. Each row: time, colored type badge, agent, payload summary.
   - Top stat chips from events_bus.py --json stats.

4. **Infrastructure** ("/infra")
   - Service cards with real up/down probes: 20128, 5050, 7077 (+9222 CDP optional).
     Probe = fetch with 2s timeout; down = red "unreachable".
   - Model counts from both /v1/models (render count + 5 sample ids).
   - Usage cards: totalRequests, tokens, cachedTokens, totalCost USD from usage/stats;
     per-provider mini-table from byProvider.

## STACK REQUIREMENTS (choose deliberately — this is the core engineering judgment)
The previous attempt used Next.js dev mode: too heavy/slow for this phone.
Choose a fast+stable stack and JUSTIFY it in README. Strong candidates:
  - Single Node ESM server (node:http) + vanilla JS/ES modules frontend, zero deps
  - Or Hono/Express-class micro framework if justified (still minimal)
Hard requirements regardless of stack:
  - Production run: ONE command: node server.mjs  → serves on PORT env or 7070
  - Cold start <2s, RSS <80MB, no build step required to run (build allowed but must
    be pre-runnable from source directly)
  - All API aggregation happens SERVER-SIDE (/api/* routes proxy/compute from the
    sources above) so the phone's browsers make few requests
  - Frost design system: reuse CSS from ~/build/frost-cards/css/ (styles.css,
    frost-overrides.css, dark-bg.css — copy into public/, link them).
    Card classes: .glass .glass-card .glass-frost-green|blue|orange|red .glass-badge
    4-color semantics: blue=default, green=running/ok, orange=warning, red=error.
  - Reference for features/tone (do NOT copy its heavy stack): ~/build/zd-ref/
    (a Next.js version of this same concept — pages agents/activity/kanban/company).

## VERIFICATION GATE (must pass before you claim done)
Run the server, then prove with real commands and include outputs:
  1. curl -s localhost:7070/api/status        → JSON listing 3 services up/down (real)
  2. curl -s localhost:7070/api/tasks         → ≥1 real task (there are several already)
  3. curl -s localhost:7070/api/activity      → real events from the bus
  4. curl -s localhost:7070/                  → 200 HTML containing "Fleet"
  5. Self-render check: node ~/zes-os/tools/browser.mjs open http://127.0.0.1:7070/
     → returns page title + visible text proving it renders (dogfood our own browser tool)
  6. grep -riE "mock|fake|dummy|lorem" public/ server* → zero hits
Kill any leftover process you started before finishing.

## DELIVERABLES
~/zes-os/dashboard-v3/{server.mjs, public/*, README.md}
README.md: stack choice + why (≤10 lines), how to run, data-source map per endpoint,
and known limitations. Conventional quality: clean small modules, comments where
non-obvious, no dead code.

## REPORT FORMAT (final message)
1. Stack chosen & justification
2. File tree
3. Verification outputs (the 6 gate commands, real output pasted)
4. What renders real vs unavailable right now, and why
