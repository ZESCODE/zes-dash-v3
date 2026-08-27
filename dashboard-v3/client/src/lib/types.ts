/* ============================================================
   ZES OS Dashboard v3 — domain types (merged Part1 + Part2)
   ============================================================ */

export type FrostColor = "blue" | "green" | "orange" | "red" | "violet" | "gray";

export type AgentStatus = "idle" | "running" | "warning" | "error" | "offline";

export interface FleetAgent {
  id: string;
  name?: string;
  role?: string;
  kind?: string;
  description?: string;
  model?: string;
  endpoint?: string;
  configPath?: string;
  online: boolean;
  status: AgentStatus;
  taskCounts: { pending: number; running: number; completed: number; failed: number; total: number };
  runningTasks: number;
  warnings: number;
  errors: number;
  latencyMs: number | null;
  lastTask: Task | null;
}

export interface Task {
  id: string;
  title: string;
  prompt?: string;
  agent: string;
  priority: "high" | "normal" | "low";
  status: "pending" | "running" | "completed" | "failed";
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  exit_code?: number;
  result_tail?: string;
}

export interface BusEvent {
  id: string;
  ts: string;
  source: string;
  type: string;
  agent?: string | null;
  payload?: Record<string, unknown>;
}

export interface OverviewData {
  agents: { total: number; online: number; running: number };
  tasks: { pending: number; running: number; completed: number; failed: number; total: number };
  warnings: number;
  errors: number;
  uptimeSec: number;
  ts: string;
}

export interface FlowData {
  nodes: FleetAgent[];
  edges: { from: string; to: string }[];
}

export interface Unreachable {
  error: string;
}

export function isUnreachable(x: unknown): x is Unreachable {
  return !!x && typeof x === "object" && "error" in (x as Record<string, unknown>);
}
