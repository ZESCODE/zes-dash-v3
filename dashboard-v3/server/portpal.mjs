// portpal.mjs — PortPal backend for the ZES dashboard (Node ESM, zero deps).
// Inspired by github.com/wisher567/Portpal (Tauri/Rust), re-implemented for
// the Termux node: scans listening TCP ports, classifies dev frameworks and
// projects, samples per-port connection traffic, logs start/stop events,
// builds the port-map graph and can kill / restart processes.
//
// Scanner strategy (auto-detected, first that works wins):
//   1. /proc/net/tcp + /proc/net/tcp6        (Linux / Termux / Android — preferred)
//   2. `ss -tlnp` / `ss -tnp`                (iproute2)
//   3. `netstat -tlnp` / `netstat -tnp`      (net-tools)
//   4. `lsof -iTCP -sTCP:LISTEN`             (macOS / fallback)
//
// All state is in-memory (same as PortPal). The sampler runs every
// PORTPAL_SAMPLE_MS (default 3000ms) and keeps PORTPAL_HISTORY samples
// per port. Kill / restart can be disabled with PORTPAL_ALLOW_KILL=0.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

/* ---------------- config ---------------- */

const SAMPLE_MS = Math.max(1000, Number(process.env.PORTPAL_SAMPLE_MS || 3000));
const HISTORY = Math.min(240, Math.max(10, Number(process.env.PORTPAL_HISTORY || 40)));
const EVENTS_MAX = Math.min(2000, Math.max(50, Number(process.env.PORTPAL_EVENTS_MAX || 200)));
const ALLOW_KILL = process.env.PORTPAL_ALLOW_KILL !== "0";

// Known dev / ZES ports → framework label + category (client colors by category).
const DEV_PORTS = new Map([
  // frontend dev servers
  [3000, { label: "React", category: "frontend" }],
  [3001, { label: "React", category: "frontend" }],
  [4200, { label: "Angular", category: "frontend" }],
  [5173, { label: "Vite", category: "frontend" }],
  [5174, { label: "Vite", category: "frontend" }],
  [4173, { label: "Vite", category: "frontend" }],
  [1420, { label: "Tauri", category: "frontend" }],
  [8081, { label: "Metro", category: "frontend" }],
  [19006, { label: "RN", category: "frontend" }],
  // backends / tooling
  [4000, { label: "Node", category: "backend" }],
  [2000, { label: "Node", category: "backend" }],
  [8000, { label: "Django", category: "backend" }],
  [8888, { label: "Jupyter", category: "backend" }],
  [9000, { label: "PHP", category: "backend" }],
  [8080, { label: "HTTP", category: "backend" }],
  [5000, { label: "Flask", category: "backend" }],
  [3002, { label: "Express", category: "backend" }],
  // databases / caches
  [5432, { label: "Postgres", category: "database" }],
  [3306, { label: "MySQL", category: "database" }],
  [6379, { label: "Redis", category: "database" }],
  [27017, { label: "Mongo", category: "database" }],
  [9200, { label: "Elastic", category: "database" }],
  [8090, { label: "ClickHouse", category: "database" }],
  // web / secure
  [80, { label: "HTTP", category: "web" }],
  [443, { label: "HTTPS", category: "secure" }],
  [8443, { label: "HTTPS", category: "secure" }],
  [22, { label: "SSH", category: "secure" }],
  // ZES node services
  [7070, { label: "ZES Dash", category: "zes" }],
  [20128, { label: "9router", category: "zes" }],
  [5050, { label: "ZESRouter", category: "zes" }],
  [4400, { label: "gw-proxy", category: "zes" }],
  [4050, { label: "opencode", category: "zes" }],
  [7077, { label: "zen relay", category: "zes" }],
  [37758, { label: "claude-mem", category: "zes" }],
]);

const PROJECT_MARKERS = [
  "package.json", "Cargo.toml", "go.mod", "pyproject.toml", "requirements.txt",
  "pom.xml", "build.gradle", "deno.json", "Gemfile", "composer.json", "mix.exs", ".git",
];

/* ---------------- small helpers ---------------- */

const now = () => Date.now();

function run(cmd, args, timeoutMs = 3000) {
  return new Promise((resolve) => {
    let out = "";
    let done = false;
    let child;
    try { child = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] }); } catch { return resolve(""); }
    const t = setTimeout(() => { if (!done) { done = true; try { child.kill("SIGKILL"); } catch {} resolve(""); } }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.on("error", () => { if (!done) { done = true; clearTimeout(t); resolve(""); } });
    child.on("close", () => { if (!done) { done = true; clearTimeout(t); resolve(out); } });
  });
}

function hexToIp(hex) {
  try {
    if (hex.length === 8) {
      // /proc/net/tcp — 32-bit little-endian words
      const b = [];
      for (let i = hex.length - 2; i >= 0; i -= 2) b.push(parseInt(hex.substr(i, 2), 16));
      return b.join(".");
    }
    if (hex.length === 32) {
      // /proc/net/tcp6 — four 32-bit little-endian words
      const parts = [];
      for (let w = 0; w < 4; w++) {
        const word = hex.substr(w * 8, 8);
        const sub = [];
        for (let i = word.length - 2; i >= 0; i -= 2) sub.push(parseInt(word.substr(i, 2), 16));
        parts.push(sub.join("."));
      }
      return parts.join(".");
    }
  } catch { /* ignore */ }
  return hex;
}

/* ---------------- /proc scanner (Linux / Termux) ---------------- */

let procCache = { t: 0, pidInfo: null, sockInfo: null };

/** Read every process' fds/comm/cmdline/cwd once per tick (cached ~1.5s). */
function readProcProcesses() {
  const info = { sockToPid: new Map(), procs: new Map() };
  let pids;
  try { pids = fs.readdirSync("/proc").filter((d) => /^\d+$/.test(d)); } catch { return info; }
  for (const pidStr of pids) {
    const pid = Number(pidStr);
    if (!pid) continue;
    // sockets owned by this pid
    try {
      const fds = fs.readdirSync(`/proc/${pidStr}/fd`);
      for (const fd of fds) {
        try {
          const link = fs.readlinkSync(`/proc/${pidStr}/fd/${fd}`);
          const m = link.match(/^socket:\[(\d+)\]$/);
          if (m) info.sockToPid.set(Number(m[1]), pid);
        } catch { /* permission */ }
      }
    } catch { /* permission */ }
    // process metadata
    let comm = "", argv = null, cwd = null;
    try { comm = fs.readFileSync(`/proc/${pidStr}/comm`, "utf8").trim(); } catch {}
    try {
      const raw = fs.readFileSync(`/proc/${pidStr}/cmdline`, "utf8");
      const parts = raw.split("\0").filter(Boolean);
      if (parts.length) argv = parts;
    } catch {}
    try { cwd = fs.readlinkSync(`/proc/${pidStr}/cwd`); } catch {}
    info.procs.set(pid, { pid, comm, argv, cwd });
  }
  return info;
}

function getProcInfo() {
  if (procCache.pidInfo && now() - procCache.t < 1500) return procCache.pidInfo;
  const info = readProcProcesses();
  procCache = { t: now(), pidInfo: info, sockInfo: null };
  return info;
}

/** Parse /proc/net/tcp + tcp6. Returns socket rows. */
function readProcNet() {
  const rows = [];
  for (const [file, family] of [["/proc/net/tcp", "TCP"], ["/proc/net/tcp6", "TCP6"]]) {
    let text;
    try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
    for (const line of text.split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10) continue;
      const local = parts[1].split(":");
      const rem = parts[2].split(":");
      if (local.length !== 2 || rem.length !== 2) continue;
      rows.push({
        family,
        localIp: hexToIp(local[0]),
        localPort: parseInt(local[1], 16),
        remIp: hexToIp(rem[0]),
        remPort: parseInt(rem[1], 16),
        state: parts[3],
        inode: Number(parts[9]) || 0,
      });
    }
  }
  return rows;
}

/** Full socket table: key `local|remote` → pid (for pairing ESTAB peers). */
function getProcSockMap(procRows, proc) {
  const map = new Map();
  for (const r of procRows) {
    if (!r.inode) continue;
    const pid = proc.sockToPid.get(r.inode) || 0;
    map.set(`${r.localIp}:${r.localPort}|${r.remIp}:${r.remPort}`, pid);
  }
  return map;
}

async function scanProc() {
  const proc = getProcInfo();
  const rows = readProcNet();
  const sockPid = getProcSockMap(rows, proc);

  const listening = [];
  const established = [];

  for (const r of rows) {
    if (r.state === "0A") {
      // LISTEN — one entry per (port, pid); kernel usually prints 0.0.0.0 + :: twice
      const pid = proc.sockToPid.get(r.inode) || 0;
      listening.push({ port: r.localPort, pid, family: r.family, inode: r.inode });
    } else if (r.state === "01") {
      // ESTABLISHED
      const srcPid = proc.sockToPid.get(r.inode) || 0;
      const dstPid = sockPid.get(`${r.remIp}:${r.remPort}|${r.localIp}:${r.localPort}`) || 0;
      established.push({ srcPort: r.localPort, dstPort: r.remPort, srcPid, dstPid });
    }
  }

  // de-dupe listening (v4+v6 double bind) — keep entry with a known pid
  const seen = new Map();
  for (const l of listening) {
    const prev = seen.get(l.port);
    if (!prev || (!prev.pid && l.pid)) seen.set(l.port, l);
  }

  // keep unknown-pid listeners too (shown as "unknown process" in the UI)
  const ports = [...seen.values()].map((l) => {
    const p = l.pid ? proc.procs.get(l.pid) : null;
    return enrich({ port: l.port, pid: l.pid, protocol: l.family }, p);
  });

  return { ports, established, method: "/proc/net/tcp" };
}

/* ---------------- ss / netstat / lsof fallbacks ---------------- */

async function scanSs() {
  const out = await run("ss", ["-tlnp"]);
  if (!out) return null;
  const ports = [];
  for (const line of out.split("\n").slice(1)) {
    if (!/LISTEN/.test(line)) continue;
    const m = line.match(/([\d.]+|\[?::\]?):(\d+)\s/) || line.match(/\s(\d+)\s+\S+\s*$/);
    if (!m) continue;
    const port = Number(m[2] || m[1]);
    const pm = line.match(/pid=(\d+)/);
    const nm = line.match(/users:\(\("([^"]+)"/);
    if (!port || port > 65535) continue;
    ports.push(enrich({ port, pid: pm ? Number(pm[1]) : 0, protocol: "TCP" },
      pm ? { pid: Number(pm[1]), comm: nm ? nm[1] : "", argv: null, cwd: null } : null));
  }
  if (!ports.length) return null;

  const est = [];
  const eout = await run("ss", ["-tnp", "state", "established"]);
  for (const line of eout.split("\n").slice(1)) {
    const parts = line.trim().split(/\s+/);
    // header may or may not include State; find two addr:port tokens
    const addrs = parts.filter((p) => p.includes(":") && /:(\d+)$/.test(p));
    if (addrs.length < 2) continue;
    const src = addrs[0].match(/:(\d+)$/), dst = addrs[1].match(/:(\d+)$/);
    const pm = line.match(/pid=(\d+)/);
    if (src && dst) est.push({ srcPort: Number(src[1]), dstPort: Number(dst[1]), srcPid: pm ? Number(pm[1]) : 0, dstPid: 0 });
  }
  return { ports, established: est, method: "ss" };
}

async function scanNetstat() {
  const out = await run("netstat", ["-tlnp"]);
  if (!out || !/LISTEN/.test(out)) return null;
  const ports = [];
  for (const line of out.split("\n")) {
    if (!/LISTEN/.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const local = parts[3];
    const pm = local.match(/:(\d+)$/);
    const pidm = parts[parts.length - 1].match(/^(\d+)\/(.*)$/);
    if (!pm) continue;
    ports.push(enrich({ port: Number(pm[1]), pid: pidm ? Number(pidm[1]) : 0, protocol: "TCP" },
      pidm ? { pid: Number(pidm[1]), comm: pidm[2], argv: null, cwd: null } : null));
  }
  if (!ports.length) return null;

  const est = [];
  const eout = await run("netstat", ["-tnp"]);
  for (const line of eout.split("\n")) {
    if (!/ESTABLISHED/.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const src = (parts[3] || "").match(/:(\d+)$/), dst = (parts[4] || "").match(/:(\d+)$/);
    const pidm = (parts[parts.length - 1] || "").match(/^(\d+)\//);
    if (src && dst) est.push({ srcPort: Number(src[1]), dstPort: Number(dst[1]), srcPid: pidm ? Number(pidm[1]) : 0, dstPid: 0 });
  }
  return { ports, established: est, method: "netstat" };
}

async function scanLsof() {
  const out = await run("lsof", ["-iTCP", "-sTCP:LISTEN", "-n", "-P"]);
  if (!out) return null;
  const ports = [];
  for (const line of out.split("\n").slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) continue;
    const name = parts[parts.length - 1];
    const pm = name.match(/:(\d+)$/);
    if (!pm) continue;
    ports.push(enrich({ port: Number(pm[1]), pid: Number(parts[1]) || 0, protocol: "TCP" },
      { pid: Number(parts[1]), comm: parts[0], argv: null, cwd: null }));
  }
  if (!ports.length) return null;

  const est = [];
  const eout = await run("lsof", ["-iTCP", "-sTCP:ESTABLISHED", "-n", "-P"]);
  for (const line of eout.split("\n").slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) continue;
    const name = parts[parts.length - 1];
    if (!name.includes("->")) continue;
    const [s, d] = name.split("->");
    const sp = s.match(/:(\d+)$/), dp = d.match(/:(\d+)$/);
    if (sp && dp) est.push({ srcPort: Number(sp[1]), dstPort: Number(dp[1]), srcPid: Number(parts[1]) || 0, dstPid: 0 });
  }
  return { ports, established: est, method: "lsof" };
}

/* ---------------- enrichment (framework + project detection) ---------------- */

function findProjectRoot(start) {
  let dir = start;
  for (let i = 0; i < 6 && dir; i++) {
    try {
      for (const marker of PROJECT_MARKERS) {
        if (fs.existsSync(path.join(dir, marker))) return dir;
      }
    } catch { /* ignore */ }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function enrich(base, proc) {
  const dev = DEV_PORTS.get(base.port) || null;
  let processName = proc?.comm || "";
  let argv = proc?.argv || null;
  let cwd = proc?.cwd || null;

  if (!processName && argv?.length) processName = path.basename(argv[0]);
  if (!processName) processName = base.pid > 0 ? `PID ${base.pid}` : "system";

  let projectPath = cwd ? findProjectRoot(cwd) : null;
  const projectName = projectPath ? path.basename(projectPath) : null;

  return {
    port: base.port,
    pid: base.pid,
    processName,
    projectName,
    projectPath,
    protocol: base.protocol || "TCP",
    startCmd: argv ? argv.join(" ") : null,
    startArgs: argv,
    cwd,
    framework: dev ? { ...dev } : null,
    isDev: !!dev,
  };
}

/* ---------------- logger (events + traffic, in-memory) ---------------- */

const logger = {
  events: [],                    // newest last
  prev: new Map(),               // port -> { pid, processName }
  traffic: new Map(),            // port -> [{ connections, timestamp }]
  firstSeen: new Map(),          // port -> ts
};

function pushSample(port, connections) {
  let arr = logger.traffic.get(port);
  if (!arr) { arr = []; logger.traffic.set(port, arr); }
  arr.push({ connections, timestamp: now() });
  if (arr.length > HISTORY) arr.splice(0, arr.length - HISTORY);
}

function updateLogger(ports, connCounts) {
  const ts = now();
  const current = new Map(ports.map((p) => [p.port, p]));
  const fresh = [];

  for (const [port, p] of current) {
    if (!logger.prev.has(port)) {
      const ev = { port, pid: p.pid, processName: p.processName, framework: p.framework?.label ?? null, eventType: "started", timestamp: ts };
      logger.events.push(ev); fresh.push(ev);
      logger.firstSeen.set(port, ts);
    }
    pushSample(port, connCounts.get(port) || 0);
  }

  for (const [port, p] of logger.prev) {
    if (!current.has(port)) {
      const ev = { port, pid: p.pid, processName: p.processName, framework: null, eventType: "stopped", timestamp: ts };
      logger.events.push(ev); fresh.push(ev);
    }
  }

  logger.prev = new Map(ports.map((p) => [p.port, { pid: p.pid, processName: p.processName }]));
  if (logger.events.length > EVENTS_MAX) logger.events.splice(0, logger.events.length - EVENTS_MAX);
  return fresh;
}

/* ---------------- scanner state ---------------- */

const state = {
  ports: [],
  established: [],
  method: null,
  lastScan: 0,
  lastError: null,
  scanning: null,       // in-flight promise
  startedAt: now(),
  lastInfo: new Map(),  // pid -> { argv, cwd, ts } for restart
};

async function scanOnce(force = false) {
  if (!force && state.scanning) return state.scanning;
  state.scanning = (async () => {
    let result = null;
    if (process.platform === "linux" && fs.existsSync("/proc/net/tcp")) {
      result = await scanProc();
    }
    if (!result) result = await scanSs();
    if (!result) result = await scanNetstat();
    if (!result) result = await scanLsof();
    if (!result) {
      state.lastError = "no scanner available (/proc, ss, netstat, lsof all failed)";
      return;
    }
    state.lastError = null;
    state.method = result.method;
    state.established = result.established;
    state.ports = result.ports.sort((a, b) => a.port - b.port);
    state.lastScan = now();

    // restart bookkeeping + incoming connection counts
    const counts = new Map();
    for (const c of result.established) counts.set(c.dstPort, (counts.get(c.dstPort) || 0) + 1);
    for (const p of state.ports) {
      p.connections = counts.get(p.port) || 0;
      if (p.pid > 0 && p.startArgs) {
        state.lastInfo.set(p.pid, { argv: p.startArgs, cwd: p.projectPath || p.cwd, ts: now() });
      }
    }
    if (state.lastInfo.size > 600) {
      const cutoff = now() - 3600_000;
      for (const [pid, info] of state.lastInfo) if (info.ts < cutoff) state.lastInfo.delete(pid);
    }

    updateLogger(state.ports, counts);
    for (const p of state.ports) p.firstSeen = logger.firstSeen.get(p.port) ?? null;
  })();
  try { await state.scanning; } finally { state.scanning = null; }
}

let timer = null;
function startSampler() {
  if (timer) return;
  timer = setInterval(() => { scanOnce().catch(() => {}); }, SAMPLE_MS);
  scanOnce().catch(() => {});
}

/* ---------------- graph (PortPal topology) ---------------- */

function buildGraph() {
  const nodes = new Map();
  const pidToPorts = new Map();
  for (const p of state.ports) {
    nodes.set(p.port, {
      id: `port:${p.port}`,
      port: p.port,
      pid: p.pid,
      processName: p.processName,
      projectName: p.projectName,
      framework: p.framework?.label ?? null,
      category: p.framework?.category ?? null,
      isDev: p.isDev,
      connections: p.connections || 0,
      connectionCount: 0,
    });
    if (p.pid > 0) {
      if (!pidToPorts.has(p.pid)) pidToPorts.set(p.pid, []);
      pidToPorts.get(p.pid).push(p.port);
    }
  }

  const edges = [];
  const seen = new Set();
  const addEdge = (a, b) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: `port:${a}`, target: `port:${b}`, active: true });
    const na = nodes.get(a); if (na) na.connectionCount++;
    const nb = nodes.get(b); if (nb) nb.connectionCount++;
  };

  for (const { srcPort, dstPort, srcPid, dstPid } of state.established) {
    const srcListen = nodes.has(srcPort);
    const dstListen = nodes.has(dstPort);
    if (srcListen && dstListen) { addEdge(srcPort, dstPort); continue; }
    if (dstListen && srcPid > 0) {
      for (const sp of pidToPorts.get(srcPid) || []) if (sp !== dstPort) addEdge(sp, dstPort);
    }
    if (srcListen && dstPid > 0) {
      for (const dp of pidToPorts.get(dstPid) || []) if (dp !== srcPort) addEdge(srcPort, dp);
    }
  }

  return { nodes: [...nodes.values()], edges };
}

/* ---------------- actions ---------------- */

function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function killPid(pid) {
  if (!ALLOW_KILL) throw new Error("kill disabled (PORTPAL_ALLOW_KILL=0)");
  if (!Number.isInteger(pid) || pid <= 1) throw new Error(`refusing to kill pid ${pid}`);
  if (!alive(pid)) return { ok: true, note: "already dead" };
  try { process.kill(pid, "SIGTERM"); } catch (e) { throw new Error(`SIGTERM failed: ${e.message}`); }
  for (let i = 0; i < 10; i++) { await sleep(200); if (!alive(pid)) return { ok: true }; }
  try { process.kill(pid, "SIGKILL"); } catch (e) { throw new Error(`SIGKILL failed: ${e.message}`); }
  await sleep(200);
  return { ok: true };
}

async function restartPid(pid) {
  if (!ALLOW_KILL) throw new Error("restart disabled (PORTPAL_ALLOW_KILL=0)");
  const info = state.lastInfo.get(pid);
  if (!info?.argv?.length) throw new Error("no captured start command for this pid");
  if (alive(pid)) await killPid(pid);
  await sleep(300);
  try {
    const child = spawn(info.argv[0], info.argv.slice(1), {
      cwd: info.cwd || undefined,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
    });
    child.unref();
    return { ok: true, cmd: info.argv.join(" "), cwd: info.cwd };
  } catch (e) {
    throw new Error(`spawn failed: ${e.message}`);
  }
}

/* ---------------- API surface ---------------- */

export const portpal = {
  start: startSampler,

  async ports() {
    await scanOnce();
    return {
      ports: state.ports,
      scannedAt: state.lastScan ? new Date(state.lastScan).toISOString() : null,
      scanner: state.method,
      error: state.lastError,
      allowKill: ALLOW_KILL,
    };
  },

  traffic() {
    return {
      traffic: Object.fromEntries(logger.traffic),
      sampleMs: SAMPLE_MS,
      history: HISTORY,
    };
  },

  graph() {
    return { ...buildGraph(), scannedAt: state.lastScan ? new Date(state.lastScan).toISOString() : null };
  },

  events(limit = 200) {
    return { events: logger.events.slice(-limit).reverse() };
  },

  /** compact bundle for the Overview page */
  async summary() {
    await scanOnce();
    const dayAgo = now() - 86400_000;
    const totals = {
      ports: state.ports.length,
      devPorts: state.ports.filter((p) => p.isDev).length,
      connections: state.ports.reduce((s, p) => s + (p.connections || 0), 0),
      frameworks: new Set(state.ports.filter((p) => p.framework).map((p) => p.framework.label)).size,
      events24h: logger.events.filter((e) => e.timestamp > dayAgo).length,
    };
    const services = state.ports.slice(0, 8).map((p) => ({
      port: p.port,
      pid: p.pid,
      name: p.projectName || (p.framework ? `${p.framework.label} Server` : p.processName),
      framework: p.framework,
      connections: p.connections || 0,
      samples: (logger.traffic.get(p.port) || []).slice(-20).map((s) => s.connections),
    }));
    return {
      totals,
      services,
      events: logger.events.slice(-6).reverse(),
      scanner: state.method,
      allowKill: ALLOW_KILL,
      ts: new Date().toISOString(),
    };
  },

  config() {
    return {
      sampleMs: SAMPLE_MS,
      history: HISTORY,
      eventsMax: EVENTS_MAX,
      allowKill: ALLOW_KILL,
      scanner: state.method,
      platform: os.platform(),
      arch: os.arch(),
      frameworks: [...DEV_PORTS.entries()].map(([port, f]) => ({ port, ...f })),
      portsTracked: state.ports.length,
      eventsTracked: logger.events.length,
      uptimeSec: Math.round((now() - state.startedAt) / 1000),
      note: "state is in-memory; sparklines rebuild within a minute of a server restart",
    };
  },

  async rescan() {
    procCache = { t: 0, pidInfo: null, sockInfo: null };
    await scanOnce(true);
    return { ok: true, ports: state.ports.length, scanner: state.method };
  },

  kill: killPid,
  restart: restartPid,
};
