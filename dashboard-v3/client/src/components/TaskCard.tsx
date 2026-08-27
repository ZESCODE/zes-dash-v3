import { Clock, Cpu, Flag } from "lucide-react";
import { cn } from "@/utils/cn";
import type { Task, FrostColor } from "@/lib/types";
import { statusColor, frostText, frostCard, timeAgo, fmtMs } from "@/lib/theme";
import { Bullet } from "@/components/ui/Bullet";

const prioColor: Record<string, FrostColor> = { high: "red", normal: "blue", low: "gray" };

export function TaskCard({ task }: { task: Task }) {
  const c = statusColor(task.status);
  const pc = prioColor[task.priority] ?? "blue";
  return (
    <div className={cn("glass-card rounded-xl p-3", frostCard(c))}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">{task.title}</p>
        <Bullet color={c} pulse={task.status === "running"} className="mt-1" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-white/45">
        <span className="flex items-center gap-1">
          <Cpu className="size-3 text-white/30" /> {task.agent}
        </span>
        <span className={cn("flex items-center gap-1", frostText(pc))}>
          <Flag className="size-3" /> {task.priority}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3 text-white/30" /> {timeAgo(task.created_at)}
        </span>
        {task.duration_ms != null && <span className="text-white/35">{fmtMs(task.duration_ms)}</span>}
      </div>
      {task.result_tail && (
        <p className="mono mt-2 line-clamp-2 rounded-lg bg-black/30 px-2 py-1.5 text-[9.5px] leading-relaxed text-white/40">
          {task.result_tail}
        </p>
      )}
    </div>
  );
}
