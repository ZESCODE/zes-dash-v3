#!/usr/bin/env node
// zeso.mjs — ZES orchestrator daemon + CLI (Phase 1)
// Queue in ~/.hermes/tasks.json (dashboard contract), events to ~/.zes/bus/events.jsonl.
// No fake data: every event reflects a real spawn/exit; failures are recorded as failures.
import fs from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";

const HOME = process.env.HOME || "/data/data/com.termux/files/home";
const TASKS_FILE = path.join(HOME, ".hermes", "tasks.json");
const BUS_FILE = path.join(HOME, ".zes", "bus", "events.jsonl");
const OS_DIR = path.join(HOME, "zes-os");
const LOG_DIR = path.join(OS_DIR, "logs");
const PID_FILE = path.join(HOME, ".zes", "os", "daemon.pid");
const RUN_DIR = path.join(HOME, ".zes", "os");

const CAP = Number(process.env.ZESO_CAP || 2);          // max parallel heavy tasks
const TICK_MS = 3000;
const PRI = { high: 0, normal: 1, low: 2 };

const ADAPTERS = {
  opencode: (p) => ["opencode", "run", p],
  claude:   (p) => ["claude", "-p", p],
  codex:    (p) => ["codex", "exec", "--skip-git-repo-check", p],
  agy:      (p) => ["agy", "-p", p],
  hermes:   (p) => ["hermes", "-p", p],            // experimental: verify separately
  sh:       (p) => ["bash", "-lc", p],             // real exec; only via --exec
  pollinations: (p) => ["node", path.join(OS_DIR, "lib", "llm.mjs"), "pollinations/claude-sonnet-5", p],
};

// resolve agent spec -> argv ("api:<model>" = any model on :5050)
function adapterArgv(agentName, prompt) {
  if (agentName?.startsWith("api:"))
    return ["node", path.join(OS_DIR, "lib", "llm.mjs"), agentName.slice(4), prompt];
  return (ADAPTERS[agentName] || ADAPTERS.opencode)(prompt);
}

const nowIso = () => new Date().toISOString();
const uid = () => Math.random().toString(16).slice(2, 10);

function ensureDirs() { for (const d of [LOG_DIR, RUN_DIR]) fs.mkdirSync(d, { recursive: true }); }

// ---------- storage ----------
function loadTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, "utf8")).tasks || []; }
  catch { return []; }
}
function saveTasks(tasks) {
  const tmp = TASKS_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ tasks }, null, 2));
  fs.renameSync(tmp, TASKS_FILE);
}

// ---------- events (append-only, same schema as events_bus.py) ----------
export function publish(source, type, payload = {}, agent = null) {
  try {
    fs.mkdirSync(path.dirname(BUS_FILE), { recursive: true });
    const ev = { id: uid(), ts: nowIso(), source, type, agent,
      payload: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v).slice(0, 300) : v])) };
    fs.appendFileSync(BUS_FILE, JSON.stringify(ev) + "\n");
    return ev;
  } catch { /* bus down must not kill daemon */ }
}

// ---------- task lifecycle ----------
async function runAttempt(task, promptOverride, attemptNo) {
  const { buildPrompt } = await import("./lib/scaffold.mjs");
  const agentName0 = task.agent === "bestof" ? (task.attemptAgents?.[attemptNo - 1] || "opencode") : task.agent;
  // sh adapter executes raw commands — never wrap in LLM scaffolding
  const effectivePrompt = agentName0 === "sh"
    ? (promptOverride ?? task.prompt ?? "")
    : buildPrompt({ ...task, prompt: promptOverride ?? task.prompt }).prompt;
  const argv = adapterArgv(agentName0, effectivePrompt);
  const logFile = task.log;

  return new Promise((resolve) => {
    const started = Date.now();
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), {
        cwd: task.cwd && fs.existsSync(task.cwd) ? task.cwd : HOME,
        env: process.env,
        stdio: ["ignore", fs.openSync(logFile, attemptNo > 1 ? "a" : "w"), fs.openSync(logFile, "a")],
      });
      markTask(task.id, { pid: child.pid });
    } catch (e) {
      return resolve({ code: -1, ms: 0, error: String(e.message) });
    }
    publish("zeso", "attempt.started", { id: task.id, attempt: attemptNo, agent: agentName0, pid: child.pid });
    const timeout = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, (task.timeoutSec || 1800) * 1000);
    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve({ code: code ?? -1, ms: Date.now() - started });
    });
    child.on("error", (e) => { clearTimeout(timeout); resolve({ code: -1, ms: Date.now() - started, error: String(e.message) }); });
  });
}

function tail(file, n = 3) {
  try { return fs.readFileSync(file, "utf8").trimEnd().split("\n").slice(-n).join(" | ").slice(0, 280); }
  catch { return ""; }
}

async function judgePick(task, outputs) {
  // cheap judge via local router :5050 — honest fallback if unavailable
  const valid = outputs.filter((o) => o.code === 0 && tail(o.logFile, 1));
  if (valid.length <= 1) return valid[0] ?? outputs[0];
  try {
    const res = await fetch("http://127.0.0.1:5050/v1/chat/completions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: task.judgeModel || "opencode/nemotron-3-ultra-free",
        messages: [{ role: "user", content:
          `Pick the better result for this task. Reply with ONLY the letter A or B.\nTask: ${task.title}\n--- A ---\n${tail(valid[0].logFile, 40)}\n--- B ---\n${tail(valid[1].logFile, 40)}` }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(60000),
    });
    const j = await res.json();
    const letter = (j.choices?.[0]?.message?.content || "").trim().toUpperCase();
    if (letter.startsWith("B") && valid[1]) return valid[1];
    return valid[0];
  } catch {
    publish("zeso", "judge.unavailable", { id: task.id, fallback: "first-success" });
    return valid[0];
  }
}

async function runTask(task) {
  markTask(task.id, { status: "running", started_at: nowIso() });
  publish("zeso", "task.running", { id: task.id, title: task.title, agent: task.agent });

  let result;
  if (task.bestOf > 1) {
    const agents = task.attemptAgents || ["opencode", "codex"];
    const attempts = [];
    const runs = await Promise.all(agents.map((a, i) =>
      runAttempt({ ...task, log: task.log.replace(/\.log$/, `.${i}.log`), agent: "bestof" }, null, i + 1)
        .then((r) => ({ ...r, agent: a, logFile: task.log.replace(/\.log$/, `.${i}.log`) }))));
    attempts.push(...runs.map(({ agent, code, ms }) => ({ agent, code, ms })));
    markTask(task.id, { pid: null }); // attempts done; judge phase has no live child
    result = await judgePick(task, runs);
    markTask(task.id, { attempts, judged_by: task.judgeModel || "opencode/nemotron-3-ultra-free" });
  } else {
    const r = await runAttempt(task, null, 1);
    result = { ...r, logFile: task.log };
  }

  const outTail = tail(result.logFile);
  const ok = result.code === 0;
  markTask(task.id, {
    status: ok ? "completed" : "failed",
    finished_at: nowIso(),
    exit_code: result.code,
    duration_ms: result.ms,
    result_tail: outTail.slice(0, 500),
    pid: null,
  });
  publish("zeso", ok ? "task.completed" : "task.failed",
    { id: task.id, exit_code: result.code, duration_ms: result.ms, tail: outTail });
}

function markTask(id, patch) {
  const tasks = loadTasks();
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  saveTasks(tasks);
}

// ---------- daemon loop ----------
let running = 0;
async function tick() {
  const tasks = loadTasks();
  // stale detection: running task whose pid is gone
  for (const t of tasks.filter((x) => x.status === "running" && x.pid)) {
    try { process.kill(t.pid, 0); } catch {
      markTask(t.id, { status: "failed", finished_at: nowIso(), exit_code: -1, result_tail: "stale: pid gone" });
      publish("zeso", "task.failed", { id: t.id, reason: "stale_pid" });
    }
  }
  const fresh = loadTasks();
  running = fresh.filter((x) => x.status === "running").length;
  const pending = fresh
    .filter((x) => x.status === "pending")
    .sort((a, b) => (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1) || a.created_at.localeCompare(b.created_at));
  while (running < CAP && pending.length) {
    const t = pending.shift();
    running++;
    runTask(t).catch((e) => { markTask(t.id, { status: "failed", result_tail: String(e.message).slice(0, 300) }); publish("zeso", "task.failed", { id: t.id, error: String(e.message).slice(0, 200) }); })
      .finally(() => { running--; });
  }
}

function startDaemon() {
  ensureDirs();
  if (fs.existsSync(PID_FILE)) {
    const old = Number(fs.readFileSync(PID_FILE, "utf8"));
    try { process.kill(old, 0); return console.log(`already running pid=${old}`); } catch {}
  }
  const logFd = fs.openSync(path.join(LOG_DIR, "daemon.log"), "a");
  const child = spawn(process.execPath, [path.join(OS_DIR, "zeso.mjs"), "worker"], { detached: true, stdio: ["ignore", logFd, logFd] });
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log(`daemon started pid=${child.pid} cap=${CAP}`);
  process.exit(0);
}

function stopDaemon() {
  if (!fs.existsSync(PID_FILE)) return console.log("not running");
  const pid = Number(fs.readFileSync(PID_FILE, "utf8"));
  try { process.kill(pid); fs.unlinkSync(PID_FILE); console.log(`stopped ${pid}`); }
  catch { fs.unlinkSync(PID_FILE); console.log("cleaned stale pidfile"); }
  process.exit(0);
}

// ---------- CLI ----------
const [, , cmd, ...rest] = process.argv;
function arg(name, def = null) {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : def;
}
ensureDirs();

switch (cmd) {
  case "submit": {
    const title = rest[0];
    if (!title) { console.error("usage: zeso submit <title> [--prompt P] [--agent claude|codex|opencode|agy|sh] [--exec] [--priority high|normal|low] [--parent ID] [--cwd DIR] [--timeout SEC] [--best-of N]"); process.exit(1); }
    const tasks = loadTasks();
    const bestOf = Number(arg("--best-of", "1"));
    const task = {
      id: "t-" + uid(),
      title,
      description: "",
      prompt: arg("--prompt", title),
      agent: bestOf > 1 ? "bestof" : (arg("--agent", "opencode")),
      priority: arg("--priority", "normal"),
      company_id: "zes-os",
      status: "pending",
      created_at: nowIso(),
      parent: arg("--parent"),
      cwd: arg("--cwd"),
      timeoutSec: Number(arg("--timeout", "1800")),
      bestOf,
      judgeModel: arg("--judge"),
      attemptAgents: bestOf > 1 ? (arg("--agents", "opencode,codex").split(",")) : null,
      exec: rest.includes("--exec"),
      log: path.join(LOG_DIR, "t-" + uid() + ".log"),
    };
    if (task.agent === "sh" && !task.exec) { console.error("refusing: sh adapter requires --exec"); process.exit(1); }
    tasks.push(task);
    saveTasks(tasks);
    publish("zeso", "task.queued", { id: task.id, title: task.title, agent: task.agent, priority: task.priority }, task.agent);
    console.log(`${task.id} queued (${task.agent}${bestOf > 1 ? ` x${bestOf}: ${task.attemptAgents.join("+")}` : ""}, prio=${task.priority})`);
    break;
  }
  case "status": {
    const tasks = loadTasks();
    const id = rest[0];
    const rows = id ? tasks.filter((t) => t.id === id) : tasks.slice(-15);
    for (const t of rows.reverse())
      console.log(`${t.id}  ${String(t.status).padEnd(10)} ${String(t.priority).padEnd(6)} ${t.agent.padEnd(9)} ${(t.result_tail || t.title).slice(0, 70)}`);
    if (!id) console.log(`\n${tasks.filter(t=>t.status==="running").length} running · cap ${CAP}`);
    break;
  }
  case "logs": {
    const t = loadTasks().find((x) => x.id === rest[0]);
    if (!t) { console.error("no such task"); process.exit(1); }
    console.log(fs.readFileSync(t.log, "utf8").split("\n").slice(-Number(arg("-n", "30"))).join("\n"));
    break;
  }
  case "start": startDaemon(); break;
  case "stop": stopDaemon(); break;
  case "worker": {
    if (!fs.existsSync(RUN_DIR)) fs.mkdirSync(RUN_DIR, { recursive: true });
    fs.writeFileSync(PID_FILE, String(process.pid));
    // startup sweep: daemon restart orphans in-flight tasks — record honestly
    const orphaned = loadTasks().filter((x) => x.status === "running");
    for (const t of orphaned) {
      markTask(t.id, { status: "failed", finished_at: nowIso(), exit_code: -1, pid: null,
        result_tail: "daemon restarted mid-task" });
      publish("zeso", "task.failed", { id: t.id, reason: "daemon_restart_orphan" });
    }
    publish("zeso", "daemon.started", { pid: process.pid, cap: CAP, swept: orphaned.length });
    setInterval(() => tick().catch((e) => publish("zeso", "daemon.error", { msg: String(e.message).slice(0, 200) })), TICK_MS);
    break;
  }
  case "bus": {
    const n = Number(rest[0] || 10);
    execFile("python3", [path.join(HOME, ".hermes", "events_bus.py"), "--json", "list", String(n), "", ""],
      (e, out) => console.log(JSON.stringify(JSON.parse(out).events, null, 2)));
    break;
  }
  default:
    console.log(`zeso — ZES orchestrator
  submit <title> [opts]   queue a task
  status [id]             list recent / one task
  logs <id> [-n N]        task output tail
  start | stop            daemon control
  bus [n]                 last n events`);
}
