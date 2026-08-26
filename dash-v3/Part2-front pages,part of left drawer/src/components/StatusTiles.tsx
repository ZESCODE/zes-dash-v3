import { Boxes, CircleCheck, TriangleAlert, OctagonAlert } from "lucide-react";
import type { Agent } from "@/lib/types";
import { cn } from "@/utils/cn";

export function StatusTiles({ agents }: { agents: Agent[] }) {
  const total = agents.length;
  const online = agents.filter((a) => a.enabled).length;
  const running = agents.filter((a) => a.state === "running").length;
  const warning = agents.filter((a) => a.state === "warning").length;
  const error = agents.filter((a) => a.state === "error").length;

  const tiles = [
    { color: "blue", icon: Boxes, label: "Agents Online", value: online, total, sub: `${total} total nodes` },
    { color: "green", icon: CircleCheck, label: "Running", value: running, total, sub: "active pipelines" },
    { color: "orange", icon: TriangleAlert, label: "Warnings", value: warning, total, sub: "need attention" },
    { color: "red", icon: OctagonAlert, label: "Errors", value: error, total, sub: "intervention" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className={cn("glass-card relative overflow-hidden p-4", `frost-${t.color}`)}>
          <div className="flex items-start justify-between">
            <t.icon className={cn("size-5", `text-frost-${t.color}`)} />
            <span className={cn("font-mono text-[10px] uppercase tracking-wide text-white/40")}>
              {t.value}/{t.total}
            </span>
          </div>
          <div className={cn("mt-2 font-display text-3xl font-bold leading-none", `text-frost-${t.color}`)}>
            {String(t.value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[11px] font-medium text-white/70">{t.label}</div>
          <div className="font-mono text-[9px] text-white/35">{t.sub}</div>
          {/* progress hairline */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (t.value / t.total) * 100)}%`,
                background: `rgb(${t.color === "blue" ? "64,156,255" : t.color === "green" ? "16,209,129" : t.color === "orange" ? "251,146,60" : "248,85,100"})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
