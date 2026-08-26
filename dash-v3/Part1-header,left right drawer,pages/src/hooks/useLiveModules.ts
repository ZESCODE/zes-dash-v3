import { useEffect, useState } from "react";
import { initialModules, initialLogs } from "../data/modules";
import type { OrchestrationModule, LogEvent } from "../types";
import { frostFromStatus } from "../utils/status";

const logMessages = [
  { source: "OmniRouter", message: "Semantic cache hit — saved 1 call", level: "success" as const },
  { source: "Claude Code", message: "Delegated subtask to Codex CLI", level: "info" as const },
  { source: "Codex CLI", message: "Build finished successfully", level: "success" as const },
  { source: "Hermes", message: "Synced shared memory checkpoint", level: "info" as const },
  { source: "OpenCode", message: "Started interactive review session", level: "info" as const },
  { source: "Antigravity", message: "Health probe timeout — retrying", level: "warning" as const },
  { source: "OmniRouter", message: "Proxy rotated after rate-limit signal", level: "warning" as const },
];

function randomLog(): LogEvent {
  const pick = logMessages[Math.floor(Math.random() * logMessages.length)];
  const now = new Date();
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    time: now.toLocaleTimeString("en-US", { hour12: false }),
    ...pick,
  };
}

export function useLiveModules() {
  const [modules, setModules] = useState<OrchestrationModule[]>(initialModules);
  const [logs, setLogs] = useState<LogEvent[]>(initialLogs);

  useEffect(() => {
    const metricsTimer = setInterval(() => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.status === "offline") return m;
          const jitter = () => Math.max(1, Math.min(99, Math.round(Math.random() * 100)));
          return {
            ...m,
            cpu: Math.max(1, Math.min(96, m.cpu + Math.round((Math.random() - 0.5) * 10))),
            latency: Math.max(40, Math.round(m.latency + (Math.random() - 0.5) * 40)),
            tasks: Math.max(0, m.tasks + (Math.random() > 0.7 ? 1 : 0)),
            lastHeartbeat: Math.random() > 0.5 ? "just now" : m.lastHeartbeat,
            mem: jitter() > 50 ? m.mem : m.mem,
          };
        }),
      );
    }, 4000);

    const logTimer = setInterval(() => {
      setLogs((prev) => [randomLog(), ...prev].slice(0, 40));
    }, 5000);

    // Occasionally recover the errored module to show state transitions
    const recoveryTimer = setInterval(() => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id === "antigravity" && Math.random() > 0.6) {
            const nextStatus = m.status === "error" ? "warning" : "error";
            return { ...m, status: nextStatus, frost: frostFromStatus(nextStatus) };
          }
          return m;
        }),
      );
    }, 9000);

    return () => {
      clearInterval(metricsTimer);
      clearInterval(logTimer);
      clearInterval(recoveryTimer);
    };
  }, []);

  return { modules, logs };
}
