import { Power, RotateCw, Play } from "lucide-react";
import type { Agent } from "@/lib/types";
import { cn } from "@/utils/cn";
import { AGENT_ICON, frostClass, frostText, stateColor, stateLabel, fmtUptime, fmtTokens, fmtHeartbeat } from "@/lib/theme";
import { Sparkline } from "./ui/Sparkline";
import { Bullet } from "./ui/Bullet";

export function AgentCard({
  agent,
  onSelect,
  onToggle,
  onRestart,
  onRun,
}: {
  agent: Agent;
  onSelect: (a: Agent) => void;
  onToggle: (id: Agent["id"]) => void;
  onRestart: (id: Agent["id"]) => void;
  onRun: (id: Agent["id"]) => void;
}) {
  const color = stateColor(agent.state);
  const Icon = AGENT_ICON[agent.id];
  const offline = !agent.enabled;

  return (
    <div
      onClick={() => onSelect(agent)}
      className={cn(
        "glass-card group relative cursor-pointer p-4 transition-all duration-300 hover:-translate-y-0.5",
        frostClass(color),
        offline && "opacity-60 saturate-50",
      )}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-transform group-hover:scale-105",
              frostText(color),
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-[15px] font-semibold leading-tight text-white">{agent.name}</h3>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {agent.short} · {agent.kind}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-semibold",
            frostText(color),
          )}
        >
          <Bullet color={color} pulse={agent.state === "running" || agent.state === "error"} />
          {stateLabel(agent.state)}
        </span>
      </div>

      {/* current task */}
      <p className="mt-3 line-clamp-1 font-mono text-[11px] text-white/55">
        <span className={frostText(color)}>›</span> {agent.currentTask}
      </p>

      {/* sparkline */}
      <div className="mt-2 -mx-1">
        <Sparkline data={agent.history} color={color === "gray" ? "blue" : color} height={32} />
      </div>

      {/* metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono">
        <Metric label="CPU" value={`${Math.round(agent.cpu)}%`} color={color} />
        <Metric label="MEM" value={`${Math.round(agent.mem)}M`} color={color} />
        <Metric label="LAT" value={`${Math.round(agent.latencyMs)}ms`} color={color} />
      </div>

      {/* cpu bar */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${agent.cpu}%`,
            background: color === "gray" ? "rgba(255,255,255,0.4)" : `rgb(${color === "blue" ? "64,156,255" : color === "green" ? "16,209,129" : color === "orange" ? "251,146,60" : "248,85,100"})`,
            boxShadow: color === "gray" ? "none" : `0 0 10px rgba(${color === "blue" ? "64,156,255" : color === "green" ? "16,209,129" : color === "orange" ? "251,146,60" : "248,85,100"},0.6)`,
          }}
        />
      </div>

      {/* footer */}
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
        <div className="flex items-center gap-3 font-mono text-[10px] text-white/45">
          <span title="uptime">⏱ {fmtUptime(agent.uptimeSec)}</span>
          <span title="tokens">◈ {fmtTokens(agent.tokens)}</span>
          <span title="heartbeat" className={agent.heartbeatMs > 3000 ? "text-frost-orange" : ""}>
            ♥ {fmtHeartbeat(agent.heartbeatMs)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn title={offline ? "Enable" : "Run task"} onClick={(e) => { e.stopPropagation(); offline ? onToggle(agent.id) : onRun(agent.id); }} danger={false}>
            {offline ? <Power className="size-3.5" /> : <Play className="size-3.5" />}
          </IconBtn>
          <IconBtn title="Restart" onClick={(e) => { e.stopPropagation(); onRestart(agent.id); }}>
            <RotateCw className="size-3.5" />
          </IconBtn>
          <IconBtn title={offline ? "Disabled" : "Disable"} onClick={(e) => { e.stopPropagation(); onToggle(agent.id); }} active={offline} danger={offline}>
            <Power className="size-3.5" />
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: import("@/lib/types").FrostColor }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
      <div className={cn("text-[12px] font-semibold", color === "gray" ? "text-white/40" : "")}>{value}</div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
  danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white active:scale-90",
        active && danger && "border-frost-red/40 bg-frost-red/15 text-frost-red",
      )}
    >
      {children}
    </button>
  );
}
