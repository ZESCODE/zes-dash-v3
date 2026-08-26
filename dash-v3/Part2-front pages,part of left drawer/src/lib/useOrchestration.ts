import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Agent,
  AgentId,
  AgentState,
  DashboardState,
  OmniMetrics,
  StreamEvent,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/* ---------------- Initial topology ---------------- */
function makeHistory(base: number) {
  return Array.from({ length: 24 }, () => clamp(base + rnd(-18, 18), 3, 99));
}

const BASE_AGENTS: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    short: "CLAUDE",
    role: "Primary Coder · Global Orchestrator",
    kind: "orchestrator",
    state: "running",
    enabled: true,
    currentTask: "Refactoring trinity.md routing table",
    configPath: "~/.claude/settings.json",
    model: "auto/free",
    uptimeSec: 51840,
    cpu: 34,
    mem: 412,
    tasksCompleted: 1284,
    tokens: 982340,
    latencyMs: 412,
    heartbeatMs: 800,
    history: makeHistory(40),
  },
  {
    id: "codex",
    name: "Codex CLI",
    short: "CODEX",
    role: "Secondary Coder · Executor",
    kind: "executor",
    state: "running",
    enabled: true,
    currentTask: "Build & test zes-dashboard module",
    configPath: "~/.codex/config.toml",
    model: "auto/free",
    uptimeSec: 41200,
    cpu: 52,
    mem: 368,
    tasksCompleted: 968,
    tokens: 712200,
    latencyMs: 388,
    heartbeatMs: 1100,
    history: makeHistory(52),
  },
  {
    id: "hermes",
    name: "Hermes",
    short: "HERMES",
    role: "Maintainer · Memory & Self-Improvement",
    kind: "maintainer",
    state: "running",
    enabled: true,
    currentTask: "Syncing shared-memory bridge",
    configPath: "~/.config/hermes/config.yaml",
    model: "auto/free",
    uptimeSec: 86400,
    cpu: 18,
    mem: 156,
    tasksCompleted: 4421,
    tokens: 210400,
    latencyMs: 240,
    heartbeatMs: 600,
    history: makeHistory(22),
  },
  {
    id: "opencode",
    name: "OpenCode",
    short: "OPENCODE",
    role: "Code Reviewer · Secondary Advisor",
    kind: "advisor",
    state: "idle",
    enabled: true,
    currentTask: "Awaiting review queue",
    configPath: "~/.opencode/config.yaml",
    model: "auto/free",
    uptimeSec: 23600,
    cpu: 6,
    mem: 92,
    tasksCompleted: 318,
    tokens: 142000,
    latencyMs: 196,
    heartbeatMs: 2400,
    history: makeHistory(8),
  },
  {
    id: "antigravity",
    name: "Antigravity",
    short: "ANTIGRAV",
    role: "Systems Engineer · Technical Backbone",
    kind: "engineer",
    state: "warning",
    enabled: true,
    currentTask: "Recovering circuit breaker · cloudflare-ai",
    configPath: "System Environment",
    model: "auto/free",
    uptimeSec: 71200,
    cpu: 71,
    mem: 504,
    tasksCompleted: 773,
    tokens: 521900,
    latencyMs: 920,
    heartbeatMs: 1600,
    history: makeHistory(64),
  },
  {
    id: "omnirouter",
    name: "Inference OmniRouter",
    short: "OMNIROUTE",
    role: "Inference Gateway · LLM Router :20128",
    kind: "router",
    state: "running",
    enabled: true,
    currentTask: "Routing auto/free · 78 models",
    configPath: "~/.config/omniroute/config.yaml",
    port: "20128",
    endpoint: "http://127.0.0.1:20128/v1",
    model: "auto/free",
    uptimeSec: 51840,
    cpu: 44,
    mem: 612,
    tasksCompleted: 88412,
    tokens: 18420000,
    latencyMs: 356,
    heartbeatMs: 400,
    history: makeHistory(48),
  },
];

const BASE_OMNI: OmniMetrics = {
  status: "running",
  cache: { size: 200, capacity: 200, ttlMin: 60, hits: 845, misses: 213 },
  proxyPool: { total: 160, active: 148, rotating: true },
  throughputRpm: 312,
  errorRate: 1.4,
  uptimeSec: 51840,
  combos: [
    { id: "auto/free", name: "auto/free", strategy: "context-optimized", models: 78, load: 64, best: "General coding & chat" },
    { id: "auto/vision", name: "auto/vision", strategy: "priority", models: 28, load: 22, best: "Images · OCR · multimodal" },
    { id: "auto/reasoning", name: "auto/reasoning", strategy: "priority", models: 11, load: 41, best: "Architecture · deep debug" },
  ],
  breakers: [
    { id: "antigravity", state: "closed", failures: 0, threshold: 10, cooldownSec: 90 },
    { id: "cloudflare-ai", state: "half", failures: 6, threshold: 15, cooldownSec: 120 },
    { id: "gemini", state: "closed", failures: 1, threshold: 15, cooldownSec: 120 },
  ],
};

/* ---------------- Event generator ---------------- */
const EVENT_POOL: Record<string, { level: StreamEvent["level"]; msg: string }[]> = {
  claude: [
    { level: "info", msg: "Dispatched subtask → codex (file ops)" },
    { level: "success", msg: "Merged routing-table patch · PR #128" },
    { level: "info", msg: "Reading shared-memory.md for context" },
    { level: "warn", msg: "Token budget approaching soft cap" },
  ],
  codex: [
    { level: "success", msg: "Build passed · 0 type errors" },
    { level: "info", msg: "Wrote 3 modules to ~/zes-dashboard" },
    { level: "warn", msg: "Test flake · retrying suite" },
    { level: "success", msg: "Vite build complete · 1.2s" },
  ],
  hermes: [
    { level: "info", msg: "Memory bridge synced → laptop hub" },
    { level: "success", msg: "Self-improvement loop completed" },
    { level: "info", msg: "Health check: 6/6 subsystems nominal" },
    { level: "success", msg: "Pruned 24 stale cache entries" },
  ],
  opencode: [
    { level: "info", msg: "Review queued for module/drawer.tsx" },
    { level: "success", msg: "Approved diff · 2 suggestions filed" },
    { level: "info", msg: "Documented Frost palette in memory" },
  ],
  antigravity: [
    { level: "warn", msg: "Circuit breaker half-open · cloudflare-ai" },
    { level: "info", msg: "Rotated proxy pool · round-robin" },
    { level: "success", msg: "Auto-recovery daemon restarted OmniRoute" },
    { level: "error", msg: "Provider timeout · failover triggered" },
  ],
  omnirouter: [
    { level: "success", msg: "Cache HIT · semantic match p=0.94" },
    { level: "info", msg: "Routed → auto/free (78 models)" },
    { level: "success", msg: "Prompt compressed · 5.1k→2.9k tokens" },
    { level: "info", msg: "SSE heartbeat → dashboard client" },
    { level: "warn", msg: "Rate limit near · proxy rotate" },
  ],
  system: [
    { level: "info", msg: "Auto-recovery: 60s health sweep complete" },
    { level: "success", msg: "Device reboot survived · all daemons up" },
    { level: "warn", msg: "Thermal throttle warning · CPU" },
    { level: "info", msg: "MCP SSE endpoint reachable :20128" },
  ],
};

function makeEvent(source: StreamEvent["source"], forced?: { level: StreamEvent["level"]; msg: string }): StreamEvent {
  const def = forced ?? pick(EVENT_POOL[source] ?? EVENT_POOL.system);
  return { id: uid(), t: Date.now(), level: def.level, source, message: def.msg };
}

/* ---------------- Hook ---------------- */
export function useOrchestration() {
  const [state, setState] = useState<DashboardState>({
    agents: BASE_AGENTS.map((a) => ({ ...a })),
    omni: structuredClone(BASE_OMNI),
    events: [
      makeEvent("system", { level: "info", msg: "Dashboard connected · OmniRoute SSE :20128" }),
      makeEvent("omnirouter"),
      makeEvent("claude"),
      makeEvent("hermes"),
    ],
  });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const pushEvent = useCallback((source: StreamEvent["source"], forced?: { level: StreamEvent["level"]; msg: string }) => {
    setState((s) => {
      const ev = makeEvent(source, forced);
      return { ...s, events: [ev, ...s.events].slice(0, 80) };
    });
  }, []);

  // main live tick
  useEffect(() => {
    const TICK = 1200;
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      setState((s) => {
        const agents = s.agents.map((a) => {
          if (!a.enabled) return { ...a, state: "offline" as AgentState, heartbeatMs: a.heartbeatMs + TICK };
          const running = a.state === "running";
          const heartbeatMs = Math.random() < 0.78 ? rnd(120, 1800) : a.heartbeatMs + TICK;

          // smooth random walk for cpu/mem/latency
          const cpu = clamp(a.cpu + rnd(-9, 9), a.state === "idle" ? 1 : 6, 98);
          const mem = clamp(a.mem + rnd(-12, 12), 40, 1200);
          const latencyMs = clamp(a.latencyMs + rnd(-60, 60), 120, 1500);

          // occasional state transitions
          let state = a.state;
          let currentTask = a.currentTask;
          let tasksCompleted = a.tasksCompleted;
          let tokens = a.tokens;
          if (a.state === "running" && Math.random() < 0.12) {
            const roll = Math.random();
            if (roll < 0.1) {
              state = "warning";
            } else if (roll < 0.13) {
              state = "idle";
              currentTask = "Idle · standing by";
            }
          } else if (a.state === "warning" && Math.random() < 0.25) {
            state = Math.random() < 0.8 ? "running" : "error";
          } else if (a.state === "error" && Math.random() < 0.3) {
            state = "warning";
          } else if (a.state === "idle" && Math.random() < 0.18) {
            state = "running";
          }
          if (running) {
            tokens += Math.round(rnd(120, 2600));
            if (Math.random() < 0.22) tasksCompleted += 1;
          }

          const history = [...a.history.slice(1), cpu];
          return { ...a, heartbeatMs, cpu, mem, latencyMs, state, currentTask, tasksCompleted, tokens, uptimeSec: a.uptimeSec + TICK / 1000, history };
        });

        // omni metrics drift
        const omni = s.omni;
        const hits = omni.cache.hits + (Math.random() < 0.7 ? Math.round(rnd(1, 6)) : 0);
        const misses = omni.cache.misses + (Math.random() < 0.4 ? 1 : 0);
        const active = clamp(omni.proxyPool.active + Math.round(rnd(-2, 2)), 120, 160);
        const throughputRpm = clamp(omni.throughputRpm + rnd(-18, 18), 60, 520);
        const errorRate = clamp(omni.errorRate + rnd(-0.3, 0.3), 0.1, 12);
        const combos = omni.combos.map((c) => ({ ...c, load: clamp(c.load + rnd(-7, 7), 5, 96) }));
        const breakers = omni.breakers.map((b) => {
          if (b.state === "half" && Math.random() < 0.3) return { ...b, state: "closed" as const, failures: 0 };
          const failures = b.state === "open" ? b.failures : Math.random() < 0.1 ? b.failures + 1 : b.failures;
          return { ...b, failures };
        });

        // emit an event ~55% of ticks
        let events = s.events;
        if (Math.random() < 0.55) {
          const source = pick(["claude", "codex", "hermes", "opencode", "antigravity", "omnirouter", "system"]) as StreamEvent["source"];
          events = [makeEvent(source), ...events].slice(0, 80);
        }

        return {
          agents,
          omni: {
            ...omni,
            cache: { ...omni.cache, hits, misses, size: clamp(200 - misses % 12, 150, 200) },
            proxyPool: { ...omni.proxyPool, active },
            throughputRpm,
            errorRate,
            uptimeSec: omni.uptimeSec + TICK / 1000,
            combos,
            breakers,
          },
          events,
        };
      });
    }, TICK);
    return () => clearInterval(iv);
  }, []);

  /* ---------------- control actions ---------------- */
  const toggleAgent = useCallback((id: AgentId) => {
    setState((s) => {
      const agents = s.agents.map((a) => {
        if (a.id !== id) return a;
        const enabled = !a.enabled;
        return {
          ...a,
          enabled,
          state: enabled ? ("idle" as AgentState) : ("offline" as AgentState),
          currentTask: enabled ? "Idle · standing by" : "Disabled by operator",
          heartbeatMs: enabled ? 200 : a.heartbeatMs,
        };
      });
      const target = s.agents.find((a) => a.id === id);
      const on = !target?.enabled;
      return {
        ...s,
        agents,
        events: [
          makeEvent(id, { level: on ? "success" : "warn", msg: `${target?.name} ${on ? "enabled" : "disabled"} by operator` }),
          ...s.events,
        ].slice(0, 80),
      };
    });
  }, []);

  const restartAgent = useCallback((id: AgentId) => {
    setState((s) => {
      const agents = s.agents.map((a) =>
        a.id === id
          ? { ...a, enabled: true, state: "idle" as AgentState, uptimeSec: 0, heartbeatMs: 100, cpu: 4, latencyMs: 180, currentTask: "Restarting…" }
          : a
      );
      const target = s.agents.find((a) => a.id === id);
      return {
        ...s,
        agents,
        events: [makeEvent(id, { level: "info", msg: `Restart issued · ${target?.name}` }), ...s.events].slice(0, 80),
      };
    });
  }, []);

  const runTask = useCallback((id: AgentId) => {
    setState((s) => {
      const agents = s.agents.map((a) =>
        a.id === id ? { ...a, enabled: true, state: "running" as AgentState, tasksCompleted: a.tasksCompleted + 1 } : a
      );
      const target = s.agents.find((a) => a.id === id);
      return {
        ...s,
        agents,
        events: [makeEvent(id, { level: "success", msg: `Task dispatched to ${target?.name}` }), ...s.events].slice(0, 80),
      };
    });
  }, []);

  const clearEvents = useCallback(() => setState((s) => ({ ...s, events: [] })), []);
  const togglePause = useCallback(() => setPaused((p) => !p), []);

  return { state, paused, pushEvent, toggleAgent, restartAgent, runTask, clearEvents, togglePause };
}
