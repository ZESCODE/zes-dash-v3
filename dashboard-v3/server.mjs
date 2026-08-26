// ~/zes-os/dashboard-v3/server.mjs
// ZES OS Dashboard v3 — real-data-only orchestration dashboard.
// Stack: single Node ESM http server (node:http), zero runtime deps.
// Every /api/* route reads a LIVE source (event bus, hermes json, local HTTP APIs).
// If a source is unreachable, the route reports it honestly (no fabricated data).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT) || 7070;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const HOME = process.env.HOME || "/data/data/com.termux/files/home";
const HERMES = path.join(HOME, ".hermes");
const BUS = path.join(HOME, ".zes", "bus", "events.jsonl");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---------- helpers ----------
function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function readJsonlTail(p, limit = 100) {
  try {
    const lines = fs.readFileSync(p, "utf8").split("\n").filter(Boolean);
    const parsed = lines.map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    return parsed.slice(-limit);
  } catch {
    return [];
  }
}

async function fetchJson(url, timeoutMs = 2500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!r.ok) return { ok: false, status: r.status, data: null };
    return { ok: true, status: r.status, data: await r.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(t);
  }
}

async function probe(port, pathname = "/v1/models") {
  const res = await fetchJson(`http://127.0.0.1:${port}${pathname}`, 2000);
  return res.ok || res.status === 200;
}

function send(res, code, body, type = "application/json") {
  const payload = type.includes("json") ? JSON.stringify(body) : body;
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(payload);
}

// ---------- API routes ----------
async function apiStatus() {
  const services = [
    { id: "9router", name: "9Router", port: 20128, path: "/v1/models" },
    { id: "zesrouter", name: "ZESRouter", port: 5050, path: "/v1/models" },
    { id: "zen-relay", name: "Zen Relay", port: 7077, path: "/health" },
    { id: "lightpanda", name: "Lightpanda CDP", port: 9222, path: "/json/version" },
  ];
  const probed = await Promise.all(
    services.map(async (s) => ({ ...s, up: await probe(s.port, s.path) }))
  );
  return { services: probed, generatedAt: new Date().toISOString() };
}

function apiTasks() {
  const d = readJsonSafe(path.join(HERMES, "tasks.json"));
  const tasks = d?.tasks ?? [];
  return { tasks, count: tasks.length };
}

function apiActivity(limit = 100) {
  const events = readJsonlTail(BUS, Number(limit) || 100);
  return { events, count: events.length };
}

async function apiFleet() {
  const roster = readJsonSafe(path.join(HERMES, "roster.json")) || { company: null, agents: [] };
  const tasks = apiTasks().tasks;
  const runningAgents = new Set(
    tasks.filter((t) => t.status === "running" && t.assigned_to).map((t) => t.assigned_to)
  );
  const agents = (roster.agents || []).map((a) => ({
    ...a,
    liveRunning: runningAgents.has(a.id),
    status: runningAgents.has(a.id) ? "running" : (a.status || "unknown"),
  }));
  return { company: roster.company || null, agents, taskCount: tasks.length };
}

async function apiInfra() {
  const [usage, models20128, models5050] = await Promise.all([
    fetchJson("http://127.0.0.1:20128/api/usage/stats", 2500),
    fetchJson("http://127.0.0.1:20128/v1/models", 2500),
    fetchJson("http://127.0.0.1:5050/v1/models", 2500),
  ]);
  const count = (r) => (r.ok && Array.isArray(r.data?.data) ? r.data.data.length : null);
  const sample = (r) =>
    r.ok && Array.isArray(r.data?.data) ? r.data.data.slice(0, 5).map((m) => m.id || m.name).filter(Boolean) : [];
  return {
    usage: usage.ok ? usage.data : { unavailable: true },
    models: {
      "9router": { count: count(models20128), sample: sample(models20128) },
      zesrouter: { count: count(models5050), sample: sample(models5050) },
    },
    generatedAt: new Date().toISOString(),
  };
}

// ---------- static ----------
function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const fp = path.join(PUBLIC, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
  if (!fp.startsWith(PUBLIC)) return send(res, 403, { error: "forbidden" });
  fs.readFile(fp, (err, data) => {
    if (err) return send(res, 404, { error: "not found" });
    const ext = path.extname(fp);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

// ---------- router ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === "/api/status") return send(res, 200, await apiStatus());
    if (url.pathname === "/api/tasks") return send(res, 200, apiTasks());
    if (url.pathname === "/api/activity")
      return send(res, 200, apiActivity(url.searchParams.get("limit")));
    if (url.pathname === "/api/fleet") return send(res, 200, await apiFleet());
    if (url.pathname === "/api/infra") return send(res, 200, await apiInfra());
    if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "unknown endpoint" });
    return serveStatic(req, res);
  } catch (e) {
    return send(res, 500, { error: String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`[zes-os-dashboard-v3] real-data dashboard on :${PORT}`);
});
