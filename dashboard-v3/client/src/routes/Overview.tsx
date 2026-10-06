import { LayoutDashboard, Users, ListTodo, AlertTriangle, XCircle, Layers3, Timer, Workflow, GitBranch, Radio, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import type { OverviewData, FleetAgent, BusEvent, FlowData } from "@/lib/types";
import { groupMeshAgents } from "@/lib/workflow";
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
  const { data: flowData } = useFetch<FlowData & { error?: string }>("/api/flow", 5000);
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
            ZES OS · Mesh Command Center
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

      {/* orchestration architecture snapshot */}
      <MeshSnapshot flow={flowData ?? null} fallbackAgents={agents} />

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

function MeshSnapshot({ flow, fallbackAgents }: { flow: (FlowData & { error?: string }) | null; fallbackAgents: FleetAgent[] }) {
  const nodes = flow?.nodes ?? fallbackAgents;
  const groups = groupMeshAgents(nodes);
  const tiles = [
    { key: "control" as const, label: "Control plane", detail: "coordinate · dispatch", icon: Workflow, color: "violet" as const },
    { key: "worker" as const, label: "Agent mesh", detail: "parallel execution", icon: Users, color: "blue" as const },
    { key: "gateway" as const, label: "Model route", detail: "gateway · providers", icon: GitBranch, color: "cyan" as const },
  ];
  const tones = {
    violet: { border: "border-frost-violet/15", bg: "bg-frost-violet/[0.05]", icon: "text-frost-violet", count: "text-frost-violet" },
    blue: { border: "border-frost-blue/15", bg: "bg-frost-blue/[0.05]", icon: "text-frost-blue", count: "text-frost-blue" },
    cyan: { border: "border-frost-cyan/15", bg: "bg-frost-cyan/[0.05]", icon: "text-frost-cyan", count: "text-frost-cyan" },
  };

  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <SectionTitle title="Workflow architecture" hint={`${nodes.length} live nodes`} />
          <p className="-mt-2 text-[10px] text-white/35">A quick view of the control-to-execution path.</p>
        </div>
        <Link to="/flow" className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-medium text-frost-blue/80 transition hover:bg-frost-blue/[0.07] hover:text-frost-blue">
          Open topology <ArrowRight className="size-3" />
        </Link>
      </div>
      <GlassCard className="p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tiles.map((tile, index) => {
            const agents = groups[tile.key];
            const Icon = tile.icon;
            const tone = tones[tile.color];
            const online = agents.filter((agent) => agent.online).length;
            const running = agents.reduce((sum, agent) => sum + agent.runningTasks, 0);
            return (
              <div key={tile.key} className={`relative rounded-xl border ${tone.border} ${tone.bg} p-3`}>
                <div className="flex items-center gap-2.5">
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${tone.border} bg-black/15`}>
                    <Icon className={`size-4 ${tone.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-white/80">{tile.label}</p>
                    <p className="mt-0.5 truncate text-[9px] text-white/35">{tile.detail}</p>
                  </div>
                  <span className={`font-display text-base font-bold ${tone.count}`}>{agents.length}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2 font-mono text-[8px] text-white/40">
                  <span>{online}/{agents.length} online</span>
                  <span>{running} running</span>
                </div>
                {index < tiles.length - 1 && <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden size-4 -translate-y-1/2 text-frost-blue/45 sm:block" />}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-3">
          <span className="flex items-center gap-1.5 font-mono text-[9px] text-white/35">
            <Radio className="size-3 text-frost-green/70" />
            {flow?.error ? "Flow endpoint unavailable · showing agent roster" : `${flow?.edges?.length ?? 0} reported routes · live roster metadata`}
          </span>
          <Link to="/events" className="flex min-h-9 items-center gap-1 rounded-lg border border-frost-green/10 px-2.5 text-[9px] text-frost-green/70 transition hover:bg-frost-green/[0.06]">
            Inspect events <ArrowRight className="size-3" />
          </Link>
        </div>
      </GlassCard>
    </section>
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
