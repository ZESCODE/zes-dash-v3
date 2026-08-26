import { Pause, Play, Trash2, RotateCcw, Radio, SlidersHorizontal } from "lucide-react";
import type { StreamEvent } from "@/lib/types";
import { cn } from "@/utils/cn";
import { EventStream } from "./EventStream";
import { Bullet } from "./ui/Bullet";

export function RightPanel({
  events,
  paused,
  onTogglePause,
  onClear,
  onRestartAll,
}: {
  events: StreamEvent[];
  paused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  onRestartAll: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* global controls */}
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-frost-blue" />
          <h3 className="font-display text-sm font-semibold text-white">Global Controls</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Action onClick={onTogglePause} tone={paused ? "success" : "orange"}>
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? "Resume" : "Pause"}
          </Action>
          <Action onClick={onRestartAll} tone="blue">
            <RotateCcw className="size-4" /> Restart all
          </Action>
          <Action onClick={onClear} tone="ghost" className="col-span-2">
            <Trash2 className="size-4" /> Clear event log
          </Action>
        </div>
      </div>

      {/* event stream */}
      <EventStream events={events} paused={paused} onTogglePause={onTogglePause} onClear={onClear} className="flex-shrink-0" />

      {/* frost legend */}
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Radio className="size-4 text-frost-blue" />
          <h3 className="font-display text-sm font-semibold text-white">Frost System</h3>
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <Legend color="blue" label="Default / Main" desc="nominal · idle" />
          <Legend color="green" label="Running" desc="active pipeline" />
          <Legend color="orange" label="Warning" desc="needs attention" />
          <Legend color="red" label="Error" desc="intervention" />
        </div>
      </div>
    </div>
  );
}

function Action({
  children,
  onClick,
  tone,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone: "blue" | "orange" | "success" | "ghost";
  className?: string;
}) {
  const tones = {
    blue: "border-frost-blue/40 bg-frost-blue/10 text-frost-blue hover:bg-frost-blue/20",
    orange: "border-frost-orange/40 bg-frost-orange/10 text-frost-orange hover:bg-frost-orange/20",
    success: "border-frost-green/40 bg-frost-green/10 text-frost-green hover:bg-frost-green/20",
    ghost: "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
  } as const;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 font-mono text-[11px] font-semibold transition active:scale-95",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

function Legend({ color, label, desc }: { color: "blue" | "green" | "orange" | "red"; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5">
      <Bullet color={color} />
      <span className={cn("font-semibold", `text-frost-${color}`)}>{label}</span>
      <span className="ml-auto text-white/35">{desc}</span>
    </div>
  );
}
