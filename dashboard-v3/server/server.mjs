// server.mjs — ZES OS Dashboard v3 server (Node ESM, zero deps)
// Serves client/dist + /api/* endpoints backed by live sources:
//   ~/.hermes/roster.json   ~/.hermes/tasks.json   ~/.zes/bus/events.jsonl
//   http://127.0.0.1:20128  http://127.0.0.1:5050
// Unreachable sources return { error: "unreachable" } — numbers are never fabricated.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || os.homedir();
const PORT = Number(process.env.PORT || 7070);

const ROSTER_FILE = process.env.ZES_ROSTER || path.join(HOME, ".hermes", "roster.json");
const TASKS_FILE = process.env.ZES_TASKS || path.join(HOME, ".hermes", "tasks.json");
const BUS_FILE = process.env.ZES_BUS || path.join(HOME, ".zes", "bus", "events.jsonl");
const MEMORY_DIR = process.env.ZES_MEMORY || path.join(HOME, ".zes", "memory");
const DIST_DIR = path.join(__dirname, "..", "client", "dist");

const GW = process.env.ZES_GW || "http://127.0.0.1:20128";
const ROUTER = process.env.ZES_ROUTER || "http://127.0.0.1:5050";

/* ---------------- helpers ---------------- */

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function readJsonl(file, limit = 500) {
  try {
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return null; }
}

async function fetchJson(url, timeoutMs = 2000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { error: "unreachable", status: res.status };
    return await res.json();
  } catch {
    return { error: "unreachable" };
  } finally { clearTimeout(t); }
}

function loadRoster() {
  const j = readJson(ROSTER_FILE);
  if (!j) return null;
  return Array.isArray(j) ? j : j.agents || null;
}

function loadTasks() {
  const j = readJson(TASKS_FILE);
  if (!j) return null;
  return Array.isArray(j) ? j : j.tasks || null;
}

/* ---------------- aggregation ---------------- */

function mergeFleet(roster, tasks) {
  return (roster || []).map((a) => {
    const mine = (tasks || []).filter((t) => t.agent === a.id || t.agent === a.name);
    const running = mine.filter((t) => t.status === "running");
    const failed = mine.filter((t) => t.status === "failed");
    const completed = mine.filter((t) => t.status === "completed");
    const pending = mine.filter((t) => t.status === "pending");
    const durations = completed.map((t) => t.duration_ms).filter((n) => typeof n === "number");
    const latency = durations.length ? Math.round(durations.reduce((s, n) => s + n, 0) / durations.length) : null;
    const online = a.online !== false;
    const status = !online ? "offline" : running.length ? "running" : failed.length > completed.length ? "error" : failed.length ? "warning" : "idle";
    return {
      ...a,
      online,
      status,
      taskCounts: { pending: pending.length, running: running.length, completed: completed.length, failed: failed.length, total: mine.length },
      runningTasks: running.length,
      warnings: failed.length && completed.length ? failed.length : 0,
      errors: failed.length > completed.length ? failed.length : 0,
      latencyMs: latency,
      lastTask: mine.sort((x, y) => String(y.created_at || "").localeCompare(String(x.created_at || "")))[0] || null,
    };
  });
}

/* ---------------- API handlers ---------------- */

const api = {
  async "/api/overview"() {
    const roster = loadRoster();
    const tasks = loadTasks();
    if (!roster && !tasks) return { error: "unreachable" };
    const fleet = mergeFleet(roster, tasks);
    const by = (s) => (tasks || []).filter((t) => t.status === s).length;
    return {
      agents: { total: fleet.length, online: fleet.filter((a) => a.online).length, running: fleet.filter((a) => a.status === "running").length },
      tasks: { pending: by("pending"), running: by("running"), completed: by("completed"), failed: by("failed"), total: (tasks || []).length },
      warnings: fleet.reduce((s, a) => s + a.warnings, 0),
      errors: fleet.reduce((s, a) => s + a.errors, 0),
      uptimeSec: os.uptime(),
      ts: new Date().toISOString(),
    };
  },

  async "/api/agents"() {
    const roster = loadRoster();
    if (!roster) return { error: "unreachable" };
    return { agents: mergeFleet(roster, loadTasks() || []) };
  },

  async "/api/flow"() {
    const roster = loadRoster();
    if (!roster) return { error: "unreachable" };
    const fleet = mergeFleet(roster, loadTasks() || []);
    const hub = fleet.find((a) => a.kind === "router") || fleet.find((a) => a.id === "omnirouter");
    const orch = fleet.find((a) => a.kind === "orchestrator") || fleet.find((a) => a.id === "zeso");
    const edges = [];
    for (const a of fleet) {
      if (orch && a.id !== orch.id && a.kind !== "router") edges.push({ from: orch.id, to: a.id });
      if (hub && a.id !== hub.id && a.kind !== "orchestrator") edges.push({ from: a.id, to: hub.id });
    }
    return { nodes: fleet, edges };
  },

  async "/api/events"(q) {
    const limit = Math.min(Number(q.get("limit")) || 200, 500);
    const events = readJsonl(BUS_FILE, limit);
    if (!events) return { error: "unreachable" };
    return { events: events.reverse() };
  },

  async "/api/activity"() {
    const events = readJsonl(BUS_FILE, 100);
    if (!events) return { error: "unreachable" };
    return { events: events.reverse() };
  },

  async "/api/tasks"() {
    const tasks = loadTasks();
    if (!tasks) return { error: "unreachable" };
    return { tasks };
  },

  async "/api/fleet"() {
    const roster = loadRoster();
    const tasks = loadTasks();
    if (!roster) return { error: "unreachable" };
    const fleet = mergeFleet(roster, tasks || []);
    return {
      totals: {
        agents: fleet.length,
        online: fleet.filter((a) => a.online).length,
        runningTasks: fleet.reduce((s, a) => s + a.runningTasks, 0),
        warnings: fleet.reduce((s, a) => s + a.warnings, 0),
        errors: fleet.reduce((s, a) => s + a.errors, 0),
      },
      agents: fleet,
    };
  },

  async "/api/health"() {
    const stats = await fetchJson(`${GW}/api/usage/stats`);
    return {
      gateway: stats,
      uptimeSec: os.uptime(),
      loadavg: os.loadavg(),
      memory: { total: os.totalmem(), free: os.freemem() },
      ts: new Date().toISOString(),
    };
  },

  async "/api/infra"() {
    const [stats, gwModels, routerModels] = await Promise.all([
      fetchJson(`${GW}/api/usage/stats`),
      fetchJson(`${GW}/v1/models`),
      fetchJson(`${ROUTER}/v1/models`),
    ]);
    return {
      usageStats: stats,
      gatewayModels: gwModels,
      routerModels: routerModels,
      node: {
        uptimeSec: os.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        loadavg: os.loadavg(),
        memory: { total: os.totalmem(), free: os.freemem() },
        hostname: os.hostname(),
        nodeVersion: process.version,
      },
      endpoints: { stats: `${GW}/api/usage/stats`, gatewayModels: `${GW}/v1/models`, routerModels: `${ROUTER}/v1/models` },
    };
  },

  async "/api/memory"() {
    let files = [];
    try { files = fs.readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".json")); } catch { return { error: "unreachable" }; }
    const banks = files.map((f) => {
      const data = readJson(path.join(MEMORY_DIR, f));
      let stat = null;
      try { stat = fs.statSync(path.join(MEMORY_DIR, f)); } catch { /* ignore */ }
      return { id: f.replace(/\.json$/, ""), file: f, updated: stat ? stat.mtime.toISOString() : null, bytes: stat ? stat.size : null, data };
    });
    return { banks };
  },

  async "/api/settings"() {
    return {
      node: { home: HOME, platform: os.platform(), nodeVersion: process.version, hostname: os.hostname() },
      sources: {
        roster: { path: ROSTER_FILE, ok: fs.existsSync(ROSTER_FILE) },
        tasks: { path: TASKS_FILE, ok: fs.existsSync(TASKS_FILE) },
        bus: { path: BUS_FILE, ok: fs.existsSync(BUS_FILE) },
        memory: { path: MEMORY_DIR, ok: fs.existsSync(MEMORY_DIR) },
      },
      endpoints: [
        { name: "OmniRoute usage stats", url: `${GW}/api/usage/stats` },
        { name: "OmniRoute models", url: `${GW}/v1/models` },
        { name: "ZES Router models", url: `${ROUTER}/v1/models` },
        { name: "gw-proxy", url: "http://127.0.0.1:4400" },
      ],
      dashboard: { port: PORT, version: "3.0.0", pollMs: 5000 },
    };
  },
};

/* ---------------- static + routing ---------------- */

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".map": "application/json",
};

function serveStatic(req, res, urlPath) {
  let file = path.join(DIST_DIR, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(DIST_DIR)) file = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST_DIR, "index.html");
  try {
    const body = fs.readFileSync(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": file.endsWith("index.html") ? "no-cache" : "public, max-age=3600" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found — run: cd client && npm install && npm run build");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    const handler = api[url.pathname];
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "not_found" }));
    }
    try {
      const data = await handler(url.searchParams);
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
      return res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: String(e.message).slice(0, 200) }));
    }
  }
  serveStatic(req, res, url.pathname === "/" ? "/index.html" : url.pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[dash-v3] listening on http://0.0.0.0:${PORT}`);
  console.log(`[dash-v3] roster=${ROSTER_FILE} tasks=${TASKS_FILE} bus=${BUS_FILE}`);
});
