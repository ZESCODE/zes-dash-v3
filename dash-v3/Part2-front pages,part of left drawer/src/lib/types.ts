/* ============================================================
   ZES Orchestration — domain types
   ============================================================ */

export type FrostColor = "blue" | "green" | "orange" | "red" | "gray";

/** Agent operational state. Maps directly to a frost color. */
export type AgentState = "idle" | "running" | "warning" | "error" | "offline";

export type AgentId =
  | "claude"
  | "codex"
  | "hermes"
  | "opencode"
  | "antigravity"
  | "omnirouter";

export interface Agent {
  id: AgentId;
  name: string;
  short: string;
  role: string;
  /** What kind of node it is in the topology */
  kind: "orchestrator" | "executor" | "maintainer" | "engineer" | "advisor" | "router";
  state: AgentState;
  enabled: boolean;
  currentTask: string;
  configPath: string;
  port?: string;
  endpoint?: string;
  model: string;
  uptimeSec: number;
  cpu: number; // 0..100
  mem: number; // MB
  tasksCompleted: number;
  tokens: number;
  latencyMs: number;
  heartbeatMs: number; // age of last heartbeat
  history: number[]; // mini sparkline
}

export type EventLevel = "info" | "success" | "warn" | "error";

export interface StreamEvent {
  id: string;
  t: number; // epoch ms
  level: EventLevel;
  source: AgentId | "system";
  message: string;
}

export interface ModelCombo {
  id: string;
  name: string;
  strategy: string;
  models: number;
  load: number; // 0..100
  best: string;
}

export interface CircuitBreaker {
  id: string;
  state: "closed" | "open" | "half";
  failures: number;
  threshold: number;
  cooldownSec: number;
}

export interface OmniMetrics {
  status: AgentState;
  cache: { size: number; capacity: number; ttlMin: number; hits: number; misses: number };
  proxyPool: { total: number; active: number; rotating: boolean };
  throughputRpm: number;
  errorRate: number; // %
  uptimeSec: number;
  combos: ModelCombo[];
  breakers: CircuitBreaker[];
}

export interface DashboardState {
  agents: Agent[];
  omni: OmniMetrics;
  events: StreamEvent[];
}
