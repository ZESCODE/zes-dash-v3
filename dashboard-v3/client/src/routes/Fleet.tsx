import { Building2, Users, PlayCircle, AlertTriangle, XCircle } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { FleetAgent } from "@/lib/types";
import { statusColor, frostText, frostBg, fmtMs, timeAgo } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { StatsCard } from "@/components/StatsCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { agentIcon } from "@/components/ModuleCard";
import { Empty, SectionTitle } from "@/routes/Overview";

interface FleetData {
  error?: string;
  totals?: { agents: number; online: number; runningTasks: number; warnings: number; errors: number };
  agents?: FleetAgent[];
}

export default function Fleet() {
  const { data } = useFetch<FleetData>("/api/fleet", 5000);
  const t = data?.totals;
  const agents = data?.agents ?? [];

  return (
    <div className="space-y-5">
      <PageHeader icon={Building2} title="Fleet / Org" subtitle="roster.json ⨝ tasks.json · live status merge" live={!data?.error} />

      {/* top stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 animate-fade-up">
        <StatsCard icon={Building2} label="Total agents" value={t ? t.agents : "–"} frost="blue" />
        <StatsCard icon={Users} label="Online" value={t ? t.online : "–"} frost="green" pulse />
        <StatsCard icon={PlayCircle} label="Running tasks" value={t ? t.runningTasks : "–"} frost="blue" pulse={!!t?.runningTasks} />
        <StatsCard icon={AlertTriangle} label="Warnings" value={t ? t.warnings : "–"} frost="orange" />
        <StatsCard icon={XCircle} label="Errors" value={t ? t.errors : "–"} frost="red" />
      </div>

      {/* roster list */}
      <section className="animate-fade-up">
        <SectionTitle title="Organization Roster" hint={`${agents.length} members`} />
        <div className="space-y-2.5">
          {agents.map((a) => {
            const c = statusColor(a.status);
            const Icon = agentIcon(a.id);
            return (
              <GlassCard key={a.id} frost={c === "gray" ? "blue" : c} className="p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", frostBg(c))}>
                    <Icon className={cn("size-5", frostText(c))} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{a.name ?? a.id}</h3>
                      <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide", frostBg(c), frostText(c))}>
                        <Bullet color={c} pulse={a.status === "running"} /> {a.status}
                      </span>
                      {a.kind && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/45">{a.kind}</span>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/50">
                      {a.description ?? a.role ?? "—"}
                    </p>
                  </div>
                  <div className="hidden shrink-0 grid-cols-4 gap-2 text-center font-mono text-[11px] sm:grid">
                    <Metric label="tasks" value={String(a.taskCounts.total)} />
                    <Metric label="running" value={String(a.runningTasks)} tone="text-frost-blue" />
                    <Metric label="failed" value={String(a.taskCounts.failed)} tone={a.taskCounts.failed ? "text-frost-red" : undefined} />
                    <Metric label="latency" value={fmtMs(a.latencyMs)} />
                  </div>
                </div>
                {/* mobile metrics + last task */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-white/40 sm:hidden">
                  <span>{a.taskCounts.total} tasks</span>
                  <span className="text-frost-blue">{a.runningTasks} running</span>
                  <span className={a.taskCounts.failed ? "text-frost-red" : ""}>{a.taskCounts.failed} failed</span>
                  <span>{fmtMs(a.latencyMs)}</span>
                </div>
                {a.lastTask && (
                  <p className="mono mt-2 truncate text-[10px] text-white/35">
                    last: {a.lastTask.title} · {timeAgo(a.lastTask.created_at)}
                  </p>
                )}
              </GlassCard>
            );
          })}
          {agents.length === 0 && <Empty msg="roster.json unreachable" />}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5">
      <div className={cn("text-sm font-semibold text-white/85", tone)}>{value}</div>
      <div className="text-[8px] uppercase tracking-wide text-white/35">{label}</div>
    </div>
  );
}
