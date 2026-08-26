import { ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import type { OrchestrationModule } from "../../types";
import { frostCardClass, frostBg, frostText, statusLabel, frostBar } from "../../utils/status";
import { Bullet } from "./Bullet";

interface ModuleCardProps {
  module: OrchestrationModule;
  onSelect: (module: OrchestrationModule) => void;
}

export function ModuleCard({ module, onSelect }: ModuleCardProps) {
  const Icon = module.icon;
  const isLive = module.status === "running" || module.status === "online";

  return (
    <button
      type="button"
      onClick={() => onSelect(module)}
      className={cn(
        "group relative w-full rounded-2xl p-4 text-left transition-all duration-300 active:scale-[0.98]",
        frostCardClass[module.frost],
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex size-10 items-center justify-center rounded-xl backdrop-blur-sm", frostBg[module.frost])}>
          <Icon className={cn("size-5", frostText[module.frost])} strokeWidth={1.8} />
        </div>
        <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide", frostBg[module.frost], frostText[module.frost])}>
          <Bullet frost={module.frost} pulse={isLive} />
          {statusLabel[module.status]}
        </span>
      </div>

      <div className="mt-3.5">
        <h3 className="text-sm font-semibold text-white">{module.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-white/50">{module.role}</p>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-white/60">
        <div className="flex gap-3">
          <span>
            <span className="font-mono text-white/85">{module.tasks}</span> tasks
          </span>
          <span>
            <span className="font-mono text-white/85">{module.latency}</span>ms
          </span>
        </div>
        <ChevronRight className="size-3.5 text-white/30 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={cn("h-full rounded-full", frostBar[module.frost])}
          style={{ width: `${Math.min(module.cpu, 100)}%`, opacity: 0.7 }}
        />
      </div>
    </button>
  );
}
