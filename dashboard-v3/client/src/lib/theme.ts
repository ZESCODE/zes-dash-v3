/* ============================================================
   Frost token system — merged from frost-cards repo + Part2 theme
   blue = main/default · green = running · orange = warning · red = error
   ============================================================ */

import type { AgentStatus, FrostColor } from "./types";

export function statusColor(status: AgentStatus | string): FrostColor {
  switch (status) {
    case "running":
    case "active":
    case "success":
    case "healthy":
    case "completed":
    case "online":
      return "green";
    case "warning":
    case "degraded":
    case "pending":
      return "orange";
    case "error":
    case "critical":
    case "failed":
      return "red";
    case "offline":
      return "gray";
    default:
      return "blue";
  }
}

export const FROST_HEX: Record<Exclude<FrostColor, "gray">, string> = {
  blue: "rgb(64, 156, 255)",
  green: "rgb(16, 209, 129)",
  orange: "rgb(251, 146, 60)",
  red: "rgb(248, 85, 100)",
  violet: "rgb(167, 139, 250)",
};

export function frostCard(c: FrostColor): string {
  if (c === "gray") return "";
  return `frost-${c}`;
}

export function frostText(c: FrostColor): string {
  if (c === "gray") return "text-white/40";
  return `text-frost-${c}`;
}

export function frostBg(c: FrostColor): string {
  if (c === "gray") return "bg-white/5";
  return `bg-frost-${c}/15`;
}

export function frostBorder(c: FrostColor): string {
  if (c === "gray") return "border-frost-blue/10";
  return `border-frost-${c}/40`;
}

export function frostBar(c: FrostColor): string {
  if (c === "gray") return "bg-white/30";
  return `bg-frost-${c}`;
}

export function frostBullet(c: FrostColor): string {
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

export function fmtBytes(n: number): string {
  if (n >= 1 << 30) return `${(n / (1 << 30)).toFixed(1)} GB`;
  if (n >= 1 << 20) return `${(n / (1 << 20)).toFixed(1)} MB`;
  if (n >= 1 << 10) return `${(n / (1 << 10)).toFixed(1)} KB`;
  return `${n} B`;
}

export function fmtMs(n?: number | null): string {
  if (n == null) return "–";
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return "–";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 2) return "now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtTime(iso?: string): string {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleTimeString([], { hour12: false });
  } catch {
    return iso;
  }
}

export function eventColor(type: string): FrostColor {
  if (type.includes("completed") || type.includes("started")) return "green";
  if (type.includes("failed") || type.includes("error")) return "red";
  if (type.includes("running") || type.includes("attempt")) return "blue";
  if (type.includes("queued") || type.includes("unavailable")) return "orange";
  return "blue";
}
