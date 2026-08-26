import { X, Cpu, MemoryStick, Timer, Radio, FolderCog, RefreshCw, Power, ScrollText } from "lucide-react";
import { cn } from "../../utils/cn";
import type { OrchestrationModule } from "../../types";
import { frostBg, frostText, statusLabel, frostBorder } from "../../utils/status";
import { Bullet } from "../ui/Bullet";

interface ModuleDetailModalProps {
  module: OrchestrationModule | null;
  onClose: () => void;
}

export function ModuleDetailModal({ module, onClose }: ModuleDetailModalProps) {
  if (!module) return null;
  const Icon = module.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-t-2xl border p-5 sm:rounded-2xl animate-rise-in",
          "glass-strong",
          frostBorder[module.frost],
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-white/60 active:bg-white/10"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className={cn("flex size-12 items-center justify-center rounded-xl", frostBg[module.frost])}>
            <Icon className={cn("size-6", frostText[module.frost])} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">{module.name}</h2>
            <p className="text-[12px] text-white/50">{module.role}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", frostBg[module.frost], frostText[module.frost])}>
            <Bullet frost={module.frost} pulse />
            {statusLabel[module.status]}
          </span>
          <span className="text-[11px] text-white/40">Heartbeat {module.lastHeartbeat}</span>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-white/65">{module.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2.5 text-center">
            <Cpu className="mx-auto size-3.5 text-white/40" />
            <p className="mt-1 text-sm font-semibold text-white">{module.cpu}%</p>
            <p className="text-[9.5px] text-white/40">CPU</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2.5 text-center">
            <MemoryStick className="mx-auto size-3.5 text-white/40" />
            <p className="mt-1 text-sm font-semibold text-white">{module.mem}%</p>
            <p className="text-[9.5px] text-white/40">Memory</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2.5 text-center">
            <Timer className="mx-auto size-3.5 text-white/40" />
            <p className="mt-1 text-sm font-semibold text-white">{module.latency}ms</p>
            <p className="text-[9.5px] text-white/40">Latency</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-lg border border-white/8 bg-white/[0.02] p-3 text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-white/45"><Radio className="size-3.5" /> Endpoint</span>
            <span className="mono truncate text-white/75">{module.endpoint}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-white/45"><FolderCog className="size-3.5" /> Config</span>
            <span className="mono truncate text-white/75">{module.configPath}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/45">Model / Combo</span>
            <span className="mono truncate text-white/75">{module.model}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/45">Uptime</span>
            <span className="mono text-white/75">{module.uptime}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-medium text-white/80 active:bg-white/10">
            <RefreshCw className="size-3.5" /> Restart
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-medium text-white/80 active:bg-white/10">
            <ScrollText className="size-3.5" /> Logs
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-lg border border-red-400/25 bg-red-500/10 py-2 text-[11px] font-medium text-red-300 active:bg-red-500/20">
            <Power className="size-3.5" /> Stop
          </button>
        </div>
      </div>
    </div>
  );
}
