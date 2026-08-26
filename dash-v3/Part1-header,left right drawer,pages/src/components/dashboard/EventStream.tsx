import { cn } from "../../utils/cn";
import type { LogEvent } from "../../types";

interface EventStreamProps {
  logs: LogEvent[];
  compact?: boolean;
}

const levelDot: Record<LogEvent["level"], string> = {
  info: "bg-sky-400",
  success: "bg-emerald-400",
  warning: "bg-orange-400",
  error: "bg-red-400",
};

const levelText: Record<LogEvent["level"], string> = {
  info: "text-sky-300",
  success: "text-emerald-300",
  warning: "text-orange-300",
  error: "text-red-300",
};

export function EventStream({ logs, compact = false }: EventStreamProps) {
  return (
    <div className={cn("space-y-1 overflow-y-auto no-scrollbar", compact ? "max-h-72" : "max-h-[65vh]")}>
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 animate-rise-in"
        >
          <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", levelDot[log.level])} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-[11px] font-medium", levelText[log.level])}>{log.source}</span>
              <span className="mono shrink-0 text-[10px] text-white/35">{log.time}</span>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-white/70">{log.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
