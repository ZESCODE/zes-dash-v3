import type { LucideIcon } from "lucide-react";

export type FrostColor = "blue" | "green" | "orange" | "red";

export type ModuleStatus = "online" | "running" | "warning" | "error" | "offline";

export interface OrchestrationModule {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: LucideIcon;
  status: ModuleStatus;
  frost: FrostColor;
  endpoint: string;
  model: string;
  configPath: string;
  tasks: number;
  cpu: number;
  mem: number;
  latency: number;
  lastHeartbeat: string;
  uptime: string;
}

export interface LogEvent {
  id: string;
  time: string;
  source: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
}

export interface FlowEdge {
  from: string;
  to: string;
}
