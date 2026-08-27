import { ListTodo, Clock, PlayCircle, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { Task, FrostColor } from "@/lib/types";
import { frostText, frostBg } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { TaskCard } from "@/components/TaskCard";
import { Bullet } from "@/components/ui/Bullet";
import { Empty } from "@/routes/Overview";

const COLUMNS: { key: Task["status"]; label: string; icon: LucideIcon; frost: FrostColor }[] = [
  { key: "pending", label: "Pending", icon: Clock, frost: "orange" },
  { key: "running", label: "Running", icon: PlayCircle, frost: "blue" },
  { key: "completed", label: "Completed", icon: CheckCircle2, frost: "green" },
  { key: "failed", label: "Failed", icon: XCircle, frost: "red" },
];

export default function Tasks() {
  const { data } = useFetch<{ tasks?: Task[]; error?: string }>("/api/tasks", 5000);
  const tasks = data?.tasks ?? [];

  const sorted = (status: Task["status"]) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

  return (
    <div className="space-y-5">
      <PageHeader icon={ListTodo} title="Tasks Kanban" subtitle="~/.hermes/tasks.json · 4-column board" live={!data?.error} />

      {data?.error && <Empty msg={'tasks.json unreachable — { error: "unreachable" }'} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const list = sorted(col.key);
          return (
            <div key={col.key} className="flex flex-col">
              {/* column header */}
              <div className={cn("glass-card mb-2.5 flex items-center justify-between rounded-xl px-3 py-2.5", `frost-${col.frost}`)}>
                <div className="flex items-center gap-2">
                  <Icon className={cn("size-4", frostText(col.frost))} strokeWidth={1.8} />
                  <span className="text-[12px] font-semibold text-white">{col.label}</span>
                </div>
                <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold", frostBg(col.frost), frostText(col.frost))}>
                  <Bullet color={col.frost} pulse={col.key === "running" && list.length > 0} />
                  {list.length}
                </span>
              </div>

              {/* cards */}
              <div className="scroll-area flex-1 space-y-2 overflow-y-auto pb-2 xl:max-h-[36rem]">
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
                {list.length === 0 && (
                  <div className="rounded-xl border border-dashed border-frost-blue/8 py-6 text-center font-mono text-[10px] text-white/25">
                    empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
