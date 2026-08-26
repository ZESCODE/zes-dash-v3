import { Radio, Pause, Play, Trash2 } from "lucide-react";
import type { StreamEvent } from "@/lib/types";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/lib/theme";
import { Bullet } from "./ui/Bullet";

const LEVEL: Record<StreamEvent["level"], { color: "blue" | "green" | "orange" | "red"; tag: string }> = {
  info: { color: "blue", tag: "INFO" },
  success: { color: "green", tag: " OK " },
  warn: { color: "orange", tag: "WARN" },
  error: { color: "red", tag: "ERR " },
};

export function EventStream({
  events,
  paused,
  onTogglePause,
  onClear,
  className,
}: {
  events: StreamEvent[];
  paused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  className?: string;
}) {
  return (
    <div className={cn("glass-card flex flex-col p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className={cn("size-4", paused ? "text-white/30" : "text-frost-green animate-glow")} />
          <h3 className="font-display text-sm font-semibold text-white">Event Stream</h3>
          <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-white/40">SSE :20128</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePause}
            title={paused ? "Resume" : "Pause"}
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-90"
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </button>
          <button
            onClick={onClear}
            title="Clear"
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-90"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="scroll-area mt-3 flex-1 space-y-1 overflow-y-auto pr-1" style={{ maxHeight: 320 }}>
        {events.length === 0 && (
          <div className="flex h-full min-h-[120px] items-center justify-center font-mono text-[11px] text-white/30">no events · waiting for stream…</div>
        )}
        {events.map((e) => {
          const lv = LEVEL[e.level];
          return (
            <div key={e.id} className="animate-fade-in flex items-start gap-2 rounded-md px-1.5 py-1 font-mono text-[11px] hover:bg-white/[0.03]">
              <span className="mt-1 shrink-0">
                <Bullet color={lv.color} />
              </span>
              <span className="shrink-0 text-white/30">{fmtClock(e.t)}</span>
              <span className={cn("shrink-0 font-semibold", `text-frost-${lv.color}`)}>[{lv.tag}]</span>
              <span className="shrink-0 rounded bg-white/5 px-1 text-[9px] uppercase text-white/45">{e.source}</span>
              <span className="min-w-0 flex-1 break-words text-white/70">{e.message}</span>
              <span className="ml-auto shrink-0 text-white/25">{timeAgo(e.t)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtClock(t: number) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
