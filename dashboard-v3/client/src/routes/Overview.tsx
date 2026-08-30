import { LayoutDashboard, Users, ListTodo, AlertTriangle, XCircle, Layers3, Timer } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { OverviewData, FleetAgent, BusEvent } from "@/lib/types";
import { fmtUptime } from "@/lib/theme";
import { PageHeader } from "@/components/PageHeader";
import { StatsCard } from "@/components/StatsCard";
import { ModuleCard } from "@/components/ModuleCard";
import { EventItem } from "@/components/EventItem";
import { GlassCard } from "@/components/ui/GlassCard";
import { OverviewPortpal } from "@/components/portpal/OverviewPortpal";

export default function Overview() {
  const { data: o } = useFetch<OverviewData & { error?: string }>("/api/overview", 5000);
  const { data: agentsData } = useFetch<{ agents?: FleetAgent[]; error?: string }>("/api/agents", 5000);
  const { data: eventsData } = useFetch<{ events?: BusEvent[]; error?: string }>("/api/events?limit=8", 5000);

  const unreachable = !!o?.error;
  const agents = agentsData?.agents ?? [];
  const events = eventsData?.events ?? [];

  return (
    <div className="space-y-6">
      <PageHeader icon={LayoutDashboard} title="Overview" subtitle="roster.json + tasks.json · aggregated live stats" live={!unreachable} />

      {/* hero */}
      <GlassCard frost="blue" className="relative overflow-hidden animate-fade-up">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-frost-blue/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-frost-green/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-frost-blue/30 bg-frost-blue/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-frost-blue">
            <Layers3 className="size-3" /> Orchestration System
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
            ZES OS · Control Panel
          </h2>
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-white/50 sm:text-[12px]">
            {unreachable
              ? "live sources unreachable — start zeso daemon on the Termux node"
              : `${o?.agents.online ?? 0}/${o?.agents.total ?? 0} agents online · ${o?.tasks.total ?? 0} tasks tracked`}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px]">
            <HeroStat label="Completed" value={o ? String(o.tasks?.completed ?? "–") : "–"} color="text-frost-green" />
            <HeroStat label="Running" value={o ? String(o.tasks?.running ?? "–") : "–"} color="text-frost-blue" />
            <HeroStat label="Pending" value={o ? String(o.tasks?.pending ?? "–") : "–"} color="text-frost-orange" />
            <HeroStat label="Uptime" value={o?.uptimeSec != null ? fmtUptime(o.uptimeSec) : "–"} color="text-frost-blue" />
          </div>
        </div>
      </GlassCard>

      {/* top-level stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 animate-fade-up">
        <StatsCard icon={Users} label="Agents online" value={o && !unreachable ? `${o.agents.online}/${o.agents.total}` : "–"} frost="green" pulse />
        <StatsCard icon={ListTodo} label="Running pipelines" value={o && !unreachable ? o.tasks.running : "–"} frost="blue" pulse={!!o && o.tasks?.running > 0} />
        <StatsCard icon={AlertTriangle} label="Warnings" value={o && !unreachable ? o.warnings : "–"} frost="orange" />
        <StatsCard icon={XCircle} label="Errors" value={o && !unreachable ? o.errors : "–"} frost="red" />
        <StatsCard icon={Timer} label="Node uptime" value={o?.uptimeSec != null ? fmtUptime(o.uptimeSec) : "–"} frost="blue" />
      </div>

      {/* agent snapshot */}
      <section className="animate-fade-up">
        <SectionTitle title="Agent Modules" hint={`${agents.length} tracked`} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <ModuleCard key={a.id} agent={a} />
          ))}
          {agents.length === 0 && <Empty msg="roster.json unreachable" />}
        </div>
      </section>

      {/* PortPal — ports dashboard */}
      <OverviewPortpal />

      {/* latest events */}
      <section className="animate-fade-up">
        <SectionTitle title="Latest Bus Events" hint="tail · 5s poll" />
        <GlassCard className="space-y-1.5 p-3">
          {events.map((e) => (
            <EventItem key={e.id} event={e} />
          ))}
          {events.length === 0 && <Empty msg="events.jsonl unreachable" />}
        </GlassCard>
      </section>
    </div>
  );
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col">
      <span className={`font-display text-base font-bold ${color}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-white/35">{label}</span>
    </div>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">{title}</h2>
      {hint && <span className="font-mono text-[10px] text-white/30">{hint}</span>}
    </div>
  );
}

export function Empty({ msg }: { msg: string }) {
  return <p className="py-4 text-center font-mono text-[11px] text-white/30">{msg}</p>;
}
