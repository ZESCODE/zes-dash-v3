import type { FleetAgent, FrostColor } from "./types";

export type MeshLayer = "control" | "worker" | "gateway";
export type MeshLayerCollection = Record<MeshLayer, FleetAgent[]>;

/** Classify only from roster metadata; unknown agent roles stay in the worker pool. */
export function meshLayerOf(agent: FleetAgent): MeshLayer {
  const descriptor = `${agent.id} ${agent.name ?? ""} ${agent.kind ?? ""} ${agent.role ?? ""} ${agent.description ?? ""}`.toLowerCase();
  if (/orchestrat|coordinator|dispatcher|control[ -]?plane/.test(descriptor)) return "control";
  if (/router|gateway|omni.?route|model[ -]?route/.test(descriptor)) return "gateway";
  return "worker";
}

export function groupMeshAgents(agents: FleetAgent[]): MeshLayerCollection {
  const groups: MeshLayerCollection = { control: [], worker: [], gateway: [] };
  for (const agent of agents) groups[meshLayerOf(agent)].push(agent);
  return groups;
}

export function meshLayerHealth(agents: FleetAgent[]): { label: string; color: FrostColor } {
  if (agents.length === 0) return { label: "NOT DETECTED", color: "gray" };
  if (agents.some((agent) => agent.status === "error" || agent.status === "offline" || agent.status === "warning")) {
    return { label: "DEGRADED", color: "orange" };
  }
  return { label: "AVAILABLE", color: "green" };
}
