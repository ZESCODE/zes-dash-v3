import {
  Brain,
  Cpu,
  Zap,
  GitBranch,
  Boxes,
  Network,
  type LucideIcon,
} from "lucide-react";
import type { AgentId, AgentState, FrostColor } from "./types";

/** State -> frost color.  blue = main/default, green = running, orange = warning, red = error */
export function stateColor(state: AgentState): FrostColor {
  switch (state) {
    case "running":
      return "green";
    case "warning":
      return "orange";
    case "error":
      return "red";
    case "idle":
      return "blue";
    case "offline":
    default:
      return "gray";
  }
}

export function stateLabel(state: AgentState): string {
  switch (state) {
    case "running":
      return "Running";
    case "warning":
      return "Warning";
    case "error":
      return "Error";
    case "idle":
      return "Idle";
    case "offline":
      return "Offline";
  }
}

export const AGENT_ICON: Record<AgentId, LucideIcon> = {
  claude: Brain,
  codex: Cpu,
  hermes: Zap,
  opencode: GitBranch,
  antigravity: Boxes,
  omnirouter: Network,
};

export const FROST_HEX: Record<Exclude<FrostColor, "gray">, string> = {
  blue: "rgb(64, 156, 255)",
  green: "rgb(16, 209, 129)",
  orange: "rgb(251, 146, 60)",
  red: "rgb(248, 85, 100)",
};

export function frostClass(c: FrostColor): string {
  if (c === "gray") return "";
  return `frost-${c}`;
}

export function frostText(c: FrostColor): string {
  if (c === "gray") return "text-white/40";
  return `text-frost-${c}`;
}

export function frostBullet(c: FrostColor): string {
  if (c === "gray") return "bullet-gray";
  return `bullet-${c}`;
}

/* formatting helpers */
export function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

export function fmtHeartbeat(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function timeAgo(t: number): string {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 2) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}
