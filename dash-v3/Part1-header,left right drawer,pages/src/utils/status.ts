import type { FrostColor, ModuleStatus } from "../types";

export function frostFromStatus(status: ModuleStatus): FrostColor {
  switch (status) {
    case "running":
    case "online":
      return "green";
    case "warning":
      return "orange";
    case "error":
      return "red";
    default:
      return "blue";
  }
}

export const statusLabel: Record<ModuleStatus, string> = {
  online: "Online",
  running: "Running",
  warning: "Warning",
  error: "Error",
  offline: "Offline",
};

export const frostText: Record<FrostColor, string> = {
  blue: "text-sky-300",
  green: "text-emerald-300",
  orange: "text-orange-300",
  red: "text-red-300",
};

export const frostBg: Record<FrostColor, string> = {
  blue: "bg-sky-500/15",
  green: "bg-emerald-500/15",
  orange: "bg-orange-500/15",
  red: "bg-red-500/15",
};

export const frostRing: Record<FrostColor, string> = {
  blue: "ring-sky-400/40",
  green: "ring-emerald-400/40",
  orange: "ring-orange-400/40",
  red: "ring-red-400/40",
};

export const frostCardClass: Record<FrostColor, string> = {
  blue: "glass-frost-blue",
  green: "glass-frost-green",
  orange: "glass-frost-orange",
  red: "glass-frost-red",
};

export const frostBullet: Record<FrostColor, string> = {
  blue: "bullet-blue",
  green: "bullet-green",
  orange: "bullet-orange",
  red: "bullet-red",
};

export const frostBar: Record<FrostColor, string> = {
  blue: "bg-sky-400",
  green: "bg-emerald-400",
  orange: "bg-orange-400",
  red: "bg-red-400",
};

export const frostBorder: Record<FrostColor, string> = {
  blue: "border-sky-400/40",
  green: "border-emerald-400/40",
  orange: "border-orange-400/40",
  red: "border-red-400/40",
};
