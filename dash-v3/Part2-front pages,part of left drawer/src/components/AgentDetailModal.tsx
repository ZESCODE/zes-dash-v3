import { Power, RotateCw, Play, X, Activity, FileCog, Clock, Cpu, MemoryStick, Gauge, Hash, Timer } from "lucide-react";
import type { Agent } from "@/lib/types";
import { cn } from "@/utils/cn";
import { AGENT_ICON, frostClass, frostText, stateColor, stateLabel, fmtUptime, fmtTokens, fmtHeartbeat } from "@/lib/theme";
import { Sparkline } from "./ui/Sparkline";
import { Bullet } from "./ui/Bullet";

export function AgentDetailModal({
  agent,
  onClose,
  onToggle,
  onRestart,
  onRun,
}: {
  agent: Agent | null;
  onClose: () => void;
  onToggle: (id: Agent["id"]) => void;
  onRestart: (id: Agent["id"]) => void;
  onRun: (id: Agent["id"]) => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-end justify-center p-0 transition-opacity duration-200 sm:items-center sm:p-4",
        agent ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!agent}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      {agent && <Panel agent={agent} onClose={onClose} onToggle={onToggle} onRestart={onRestart} onRun={onRun} />}
    </div>
  );
}

function Panel({ agent, onClose, onToggle, onRestart, onRun }: {
  agent: Agent;
  onClose: () => void;
  onToggle: (id: Agent["id"]) => void;
  onRestart: (id: Agent["id"]) => void;
  onRun: (id: Agent["id"]) => void;
}) {
  const color = stateColor(agent.state);
  const Icon = AGENT_ICON[agent.id];
  return (
    <div className={cn("glass-card animate-fade-up relative z-10 w-full max-w-lg rounded-b-none p-5 sm:rounded-2xl", frostClass(color))}>
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/5", frostText(color))}>
            <Icon className="size-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">{agent.name}</h2>
            <p className="font-mono text-[11px] text-white/45">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-semibold", frostText(color))}>
            <Bullet color={color} pulse={agent.state === "running" || agent.state === "error"} /> {stateLabel(agent.state)}
          </span>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* current task */}
      <div className="mt-4 rounded-xl border border-white/5 bg-black/25 p-3">
        <div className="font-mono text-[9px] uppercase tracking-wider text-white/35">Current Task</div>
        <p className="mt-1 font-mono text-[12px] text-white/75">{agent.currentTask}</p>
      </div>

      {/* sparkline */}
      <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
            <Activity className="size-3" /> CPU load · 24 ticks
          </span>
          <span className={cn("font-mono text-[11px] font-semibold", frostText(color))}>{Math.round(agent.cpu)}%</span>
        </div>
        <Sparkline data={agent.history} color={color === "gray" ? "blue" : color} height={48} />
      </div>

      {/* telemetry grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tile icon={Cpu} label="CPU" value={`${Math.round(agent.cpu)}%`} />
        <Tile icon={MemoryStick} label="Memory" value={`${Math.round(agent.mem)} MB`} />
        <Tile icon={Gauge} label="Latency" value={`${Math.round(agent.latencyMs)} ms`} />
        <Tile icon={Hash} label="Tasks" value={agent.tasksCompleted.toLocaleString()} />
        <Tile icon={Timer} label="Heartbeat" value={fmtHeartbeat(agent.heartbeatMs)} warn={agent.heartbeatMs > 3000} />
        <Tile icon={Clock} label="Uptime" value={fmtUptime(agent.uptimeSec)} />
      </div>

      {/* config */}
      <div className="mt-3 space-y-1.5 rounded-xl border border-white/5 bg-black/20 p-3 font-mono text-[11px]">
        <Row icon={FileCog} label="Config" value={agent.configPath} />
        <Row icon={Activity} label="Model" value={agent.model} />
        {agent.endpoint && <Row icon={Activity} label="Endpoint" value={agent.endpoint} />}
        {agent.port && <Row icon={Activity} label="Port" value={agent.port} />}
        <Row icon={Hash} label="Tokens" value={fmtTokens(agent.tokens)} />
      </div>

      {/* controls */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <CtrlBtn onClick={() => onToggle(agent.id)} tone={agent.enabled ? "danger" : "primary"}>
          <Power className="size-4" /> {agent.enabled ? "Disable" : "Enable"}
        </CtrlBtn>
        <CtrlBtn onClick={() => onRestart(agent.id)} tone="ghost">
          <RotateCw className="size-4" /> Restart
        </CtrlBtn>
        <CtrlBtn onClick={() => onRun(agent.id)} tone="success" disabled={!agent.enabled}>
          <Play className="size-4" /> Run
        </CtrlBtn>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value, warn }: { icon: typeof Cpu; label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-2.5">
      <Icon className={cn("size-3.5", warn ? "text-frost-orange" : "text-white/35")} />
      <div className={cn("mt-1 font-mono text-[13px] font-semibold", warn ? "text-frost-orange" : "text-white")}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-white/40">
        <Icon className="size-3" /> {label}
      </span>
      <span className="truncate text-white/70">{value}</span>
    </div>
  );
}

function CtrlBtn({ children, onClick, tone, disabled }: { children: React.ReactNode; onClick: () => void; tone: "primary" | "danger" | "success" | "ghost"; disabled?: boolean }) {
  const tones = {
    primary: "border-frost-blue/40 bg-frost-blue/10 text-frost-blue hover:bg-frost-blue/20",
    danger: "border-frost-red/40 bg-frost-red/10 text-frost-red hover:bg-frost-red/20",
    success: "border-frost-green/40 bg-frost-green/10 text-frost-green hover:bg-frost-green/20",
    ghost: "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 font-mono text-[12px] font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        tones[tone],
      )}
    >
      {children}
    </button>
  );
}
