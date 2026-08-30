/* ============================================================
   PortPal — domain types + frost color mapping (client side)
   Data comes from /api/portpal/* backed by server/portpal.mjs
   ============================================================ */

import type { FrostColor } from "@/lib/types";

export interface PortFramework {
  label: string;
  category: string;
}

export interface PortInfo {
  port: number;
  pid: number;
  processName: string;
  projectName: string | null;
  projectPath: string | null;
  protocol: string;
  startCmd: string | null;
  framework: PortFramework | null;
  isDev: boolean;
  connections: number;
  firstSeen?: number | null;
}

export interface PortEvent {
  port: number;
  pid: number;
  processName: string;
  framework: string | null;
  eventType: "started" | "stopped" | string;
  timestamp: number;
}

export interface TrafficSample {
  connections: number;
  timestamp: number;
}

export interface PortGraphNode {
  id: string;
  port: number;
  pid: number;
  processName: string;
  projectName: string | null;
  framework: string | null;
  category: string | null;
  isDev: boolean;
  connections: number;
  connectionCount: number;
}

export interface PortGraphEdge {
  source: string;
  target: string;
  active: boolean;
}

export interface PortGraphData {
  nodes: PortGraphNode[];
  edges: PortGraphEdge[];
  scannedAt?: string | null;
}

export interface PortsResponse {
  ports: PortInfo[];
  scannedAt: string | null;
  scanner: string | null;
  allowKill: boolean;
  error?: string | null;
}

export interface TrafficResponse {
  traffic: Record<string, TrafficSample[]>;
  sampleMs: number;
  history: number;
}

export interface PortpalSummary {
  totals: { ports: number; devPorts: number; connections: number; frameworks: number; events24h: number };
  services: { port: number; pid: number; name: string; framework: PortFramework | null; connections: number; samples: number[] }[];
  events: PortEvent[];
  scanner: string | null;
  allowKill: boolean;
  ts: string;
}

export interface PortpalConfig {
  sampleMs: number;
  history: number;
  eventsMax: number;
  allowKill: boolean;
  scanner: string | null;
  platform: string;
  arch: string;
  frameworks: { port: number; label: string; category: string }[];
  portsTracked: number;
  eventsTracked: number;
  uptimeSec: number;
  note: string;
}

/* ---------------- frost color mapping ---------------- */

export const CATEGORY_FROST: Record<string, FrostColor> = {
  frontend: "cyan",
  backend: "blue",
  database: "violet",
  secure: "green",
  web: "orange",
  zes: "green",
};

/** Hex values matching the frost palette in index.css (for SVG strokes/fills). */
export const FROST_HEX: Record<string, string> = {
  blue: "#409cff",
  green: "#10d181",
  orange: "#fb923c",
  red: "#f85564",
  violet: "#a78bfa",
  cyan: "#22d3ee",
  gray: "#8b93a7",
};

export function categoryFrost(category: string | null | undefined): FrostColor {
  if (!category) return "gray";
  return CATEGORY_FROST[category] ?? "blue";
}

export function portFrost(p: PortInfo): FrostColor {
  return categoryFrost(p.framework?.category);
}

export function portHex(p: { framework?: PortFramework | null; category?: string | null }): string {
  return FROST_HEX[categoryFrost(p.framework?.category ?? p.category)];
}

/* ---------------- helpers (PortPal parity) ---------------- */

export function serviceLabel(p: PortInfo): string {
  if (p.projectName) return p.projectName;
  if (p.framework) return `${p.framework.label} Server`;
  return p.processName;
}

export function statusFor(p: PortInfo): { label: string; frost: FrostColor } {
  if (p.pid === 0) return { label: "SYSTEM", frost: "gray" };
  if (p.framework) return { label: "ACTIVE", frost: "green" };
  return { label: "LISTENING", frost: "blue" };
}

export function timeAgoMs(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtTimeMs(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour12: false });
  } catch {
    return "–";
  }
}

export function samplesToSeries(samples: TrafficSample[] | undefined): number[] {
  return (samples ?? []).map((s) => s.connections);
}
