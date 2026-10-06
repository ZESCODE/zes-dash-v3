import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  GitBranch,
  Radio,
  RefreshCw,
  Router,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { FlowData, FleetAgent, FrostColor, OverviewData } from "@/lib/types";
import { fmtMs, frostBg, frostBorder, frostText, statusColor } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatsCard } from "@/components/StatsCard";
import { Bullet } from "@/components/ui/Bullet";
import { agentIcon } from "@/components/ModuleCard";
import { SectionTitle } from "@/routes/Overview";
import { groupMeshAgents, meshLayerHealth } from "@/lib/workflow";

export default function Flow() {
  const { data, error: requestError, lastUpdated, refresh } = useFetch<FlowData & { error?: string }>("/api/flow", 5000);
  const { data: overview } = useFetch<OverviewData & { error?: string }>("/api/overview", 5000);
  const [filter, setFilter] = useState<"all" | "active" | "attention">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];
  const online = nodes.filter((node) => node.online).length;
  const activeAgents = nodes.filter((node) => node.status === "running").length;
  const measuredLatency = nodes.filter((node) => node.latencyMs != null);
  const averageLatency = measuredLatency.length
    ? measuredLatency.reduce((sum, node) => sum + (node.latencyMs ?? 0), 0) / measuredLatency.length
    : null;
  const hasError = !!data?.error || !!requestError;

  const visibleNodes = useMemo(() => nodes.filter((node) => {
    if (filter === "active") return node.status === "running";
    if (filter === "attention") return node.status === "error" || node.status === "warning" || node.status === "offline";
    return true;
  }), [filter, nodes]);

  const groups = useMemo(() => groupMeshAgents(visibleNodes), [visibleNodes]);
  const allGroups = useMemo(() => groupMeshAgents(nodes), [nodes]);

  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const tasks = overview?.tasks;
  const pipelineTotal = tasks?.total ?? 0;
  const progress = pipelineTotal > 0 ? ((tasks?.completed ?? 0) / pipelineTotal) * 100 : 0;

  const lanes: Omit<MeshLaneProps, "onSelect" | "selectedId">[] = [
    {
      id: "control",
      title: "Control plane",
      description: "Plan · coordinate · dispatch",
      icon: Workflow,
      color: "violet",
      agents: groups.control,
      totalAgents: allGroups.control.length,
      emptyMessage: filter === "all" ? "No dedicated orchestrator detected in the live roster." : "No control-plane agent matches this filter.",
    },
    {
      id: "workers",
      title: "Agent mesh",
      description: "Specialists · parallel execution",
      icon: Boxes,
      color: "blue",
      agents: groups.worker,
      totalAgents: allGroups.worker.length,
      emptyMessage: filter === "all" ? "No worker agents detected in the live roster." : "No agents match this filter.",
    },
    {
      id: "gateway",
      title: "Model route",
      description: "Gateway · provider selection",
      icon: Router,
      color: "cyan",
      agents: groups.gateway,
      totalAgents: allGroups.gateway.length,
      emptyMessage: filter === "all" ? "No router or model gateway detected in the live roster." : "No gateway matches this filter.",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          icon={GitBranch}
          title="Orchestration Flow"
          subtitle="live mesh topology · control plane → agents → model route"
          live={!!data && !hasError}
        />
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh orchestration topology"
          className="mt-1 flex min-h-11 items-center gap-2 rounded-xl border border-frost-blue/15 bg-white/[0.035] px-3 text-[11px] font-medium text-white/65 transition hover:border-frost-blue/35 hover:bg-frost-blue/10 hover:text-white active:scale-[0.98]"
        >
          <RefreshCw className="size-3.5 text-frost-blue" />
          <span>Refresh</span>
          <span className="mono hidden text-[9px] text-white/30 sm:inline">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour12: false }) : "waiting"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 animate-fade-up">
        <StatsCard icon={Boxes} label="Agents online" value={hasError ? "–" : `${online}/${nodes.length}`} frost="green" pulse={activeAgents > 0} />
        <StatsCard icon={Zap} label="Working now" value={overview?.error ? "–" : tasks?.running ?? "–"} hint={`${activeAgents} active agent${activeAgents === 1 ? "" : "s"}`} frost="blue" pulse={activeAgents > 0} />
        <StatsCard icon={GitBranch} label="Live routes" value={hasError ? "–" : edges.length} hint="reported by the roster mesh" frost="violet" />
        <StatsCard icon={Clock3} label="Mean agent latency" value={fmtMs(averageLatency)} hint={`${measuredLatency.length} agent${measuredLatency.length === 1 ? "" : "s"} with a sample`} frost="cyan" />
      </div>

      <GlassCard className="overflow-hidden p-4 sm:p-5 animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle title="Task lifecycle" hint="live counts · no synthetic throughput" />
            <p className="-mt-2 max-w-xl text-[10px] leading-relaxed text-white/35">Queue pressure and completed work, summarized from the current task store.</p>
          </div>
          {tasks && !overview?.error && (
            <span className="rounded-lg border border-frost-blue/10 bg-black/25 px-2.5 py-1.5 font-mono text-[9px] text-white/45">
              {tasks.total} tracked task{tasks.total === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <LifecycleStage label="Queued" value={overview?.error ? "–" : tasks?.pending ?? "–"} color="orange" caption="awaiting dispatch" />
          <LifecycleStage label="Executing" value={overview?.error ? "–" : tasks?.running ?? "–"} color="blue" caption="currently in flight" />
          <LifecycleStage label="Completed" value={overview?.error ? "–" : tasks?.completed ?? "–"} color="green" caption="terminal success" />
          <LifecycleStage label="Failed" value={overview?.error ? "–" : tasks?.failed ?? "–"} color="red" caption="needs inspection" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label="Share of tracked tasks completed" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-frost-cyan to-frost-green transition-[width] duration-700" style={{ width: `${progress}%` }} />
          </div>
          <span className="mono shrink-0 text-[9px] text-white/40">{pipelineTotal ? `${Math.round(progress)}% done` : "no tasks"}</span>
        </div>
      </GlassCard>

      <section className="animate-fade-up">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionTitle title="Live mesh topology" hint={`${hasError ? "source unavailable" : `${nodes.length} nodes · ${edges.length} reported links`}`} />
            <p className="-mt-2 text-[10px] leading-relaxed text-white/35">Node grouping follows live roster role/kind metadata; empty stages are left explicit.</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-frost-blue/10 bg-black/25 p-1" role="group" aria-label="Filter agents">
            {(["all", "active", "attention"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
                className={cn(
                  "min-h-9 rounded-lg px-2.5 font-mono text-[9px] uppercase tracking-wide transition sm:px-3",
                  filter === item ? "border border-frost-blue/25 bg-frost-blue/10 text-frost-blue" : "border border-transparent text-white/40 hover:bg-white/5 hover:text-white/70",
                )}
              >
                {item === "all" ? "All" : item === "active" ? "Working" : "Attention"}
              </button>
            ))}
          </div>
        </div>

        <GlassCard className="p-3 sm:p-4">
          {nodes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-frost-blue/15 bg-black/15 px-4 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-frost-blue/15 bg-frost-blue/[0.07]">
                <Workflow className="size-5 text-frost-blue/70" />
              </div>
              <p className="mt-3 font-display text-sm font-semibold text-white/75">Mesh topology unavailable</p>
              <p className="mt-1 text-[10px] text-white/35">{hasError ? "The roster endpoint is unreachable. Start the ZES runtime to load its real nodes and links." : "Waiting for the first roster snapshot…"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-2 lg:grid-cols-[minmax(0,0.9fr)_32px_minmax(0,1.3fr)_32px_minmax(0,0.9fr)]">
              <MeshLane {...lanes[0]} onSelect={setSelectedId} selectedId={selectedId} />
              <FlowConnector />
              <MeshLane {...lanes[1]} onSelect={setSelectedId} selectedId={selectedId} />
              <FlowConnector />
              <MeshLane {...lanes[2]} onSelect={setSelectedId} selectedId={selectedId} />
            </div>
          )}
          {nodes.length > 0 && visibleNodes.length === 0 && <p className="mt-3 text-center font-mono text-[10px] text-white/35">No agents match this filter.</p>}
        </GlassCard>
      </section>

      {selected && (
        <GlassCard className="animate-fade-up p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <AgentGlyph agent={selected} />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-white">{selected.name ?? selected.id}</p>
                <p className="mt-0.5 truncate font-mono text-[9px] text-white/35">{selected.kind ?? selected.role ?? "mesh worker"} · {selected.id}</p>
              </div>
            </div>
            <Link to="/agents" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-frost-blue/15 px-3 text-[10px] text-frost-blue/80 transition hover:bg-frost-blue/10">
              Agent details <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DetailMetric label="Status" value={selected.status} />
            <DetailMetric label="Running tasks" value={String(selected.taskCounts.running)} />
            <DetailMetric label="Latency" value={fmtMs(selected.latencyMs)} />
            <DetailMetric label="Routes in/out" value={String(edges.filter((edge) => edge.from === selected.id || edge.to === selected.id).length)} />
          </div>
          {selected.lastTask && (
            <div className="mt-3 rounded-xl border border-frost-blue/10 bg-black/20 p-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">Last task</p>
              <p className="mt-1 truncate text-[11px] text-white/75">{selected.lastTask.title}</p>
            </div>
          )}
        </GlassCard>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <GlassCard className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-frost-orange/20 bg-frost-orange/10">
              <CircleAlert className="size-4 text-frost-orange" />
            </div>
            <div>
              <p className="font-display text-[12px] font-semibold text-white/85">Route health</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/40">
                {edges.length > 0
                  ? `${edges.length} live connections are reported. ${nodes.filter((node) => node.status === "error" || node.status === "offline").length} node${nodes.filter((node) => node.status === "error" || node.status === "offline").length === 1 ? " is" : "s are"} currently offline or in error.`
                  : "No live links were returned. Check the roster roles and the ZES flow endpoint."}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-frost-green/20 bg-frost-green/10">
              <Radio className="size-4 text-frost-green" />
            </div>
            <div>
              <p className="font-display text-[12px] font-semibold text-white/85">Trace the mesh</p>
              <p className="mt-1 text-[10px] text-white/40">Inspect event handoffs and task transitions.</p>
            </div>
          </div>
          <Link to="/events" className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-frost-green/15 px-3 text-[10px] text-frost-green/80 transition hover:bg-frost-green/10">
            Event stream <ChevronRight className="size-3" />
          </Link>
        </GlassCard>
      </div>

      {hasError && <p className="font-mono text-[9px] text-frost-orange/70">Topology source could not be refreshed. Showing the last available snapshot if one exists.</p>}
    </div>
  );
}

interface MeshLaneProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: FrostColor;
  agents: FleetAgent[];
  totalAgents: number;
  emptyMessage: string;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

function MeshLane({ id, title, description, icon: Icon, color, agents, totalAgents, emptyMessage, onSelect, selectedId }: MeshLaneProps) {
  const state = meshLayerHealth(agents);
  const online = agents.filter((agent) => agent.online).length;
  const running = agents.reduce((sum, agent) => sum + agent.taskCounts.running, 0);
  const totalRunning = agents.reduce((sum, agent) => sum + agent.runningTasks, 0);
  const activeCount = Math.max(running, totalRunning);

  return (
    <section className={cn("min-w-0 rounded-2xl border bg-black/25 p-3", frostBorder(color), "shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]")} aria-labelledby={`lane-${id}`}>
      <div className="flex items-start gap-2.5">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", frostBorder(color), frostBg(color))}>
          <Icon className={cn("size-4", frostText(color))} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h3 id={`lane-${id}`} className="font-display text-[12px] font-semibold text-white">{title}</h3>
            <span className={cn("rounded-full border px-1.5 py-0.5 font-mono text-[7px] tracking-wide", frostBorder(state.color), frostText(state.color))}>{state.label}</span>
          </div>
          <p className="mt-0.5 truncate text-[9px] text-white/35">{description}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-y border-white/[0.045] py-2 font-mono text-[8px] text-white/40">
        <span>{online}/{agents.length || totalAgents} online</span>
        <span>{activeCount} executing</span>
      </div>

      <div className="mt-2.5 space-y-2">
        {agents.map((agent) => (
          <MeshNode key={agent.id} agent={agent} selected={selectedId === agent.id} onClick={() => onSelect(agent.id)} />
        ))}
        {agents.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-3 py-4 text-center">
            <span className="mx-auto flex size-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025]">
              <Check className="size-3 text-white/25" />
            </span>
            <p className="mt-2 text-[9px] leading-relaxed text-white/35">{emptyMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function MeshNode({ agent, selected, onClick }: { agent: FleetAgent; selected: boolean; onClick: () => void }) {
  const Icon = agentIcon(agent.id);
  const color = statusColor(agent.status);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-xl border bg-[#090d13]/80 p-2.5 text-left transition hover:bg-white/[0.04] active:scale-[0.99]",
        selected ? "border-frost-blue/45 ring-1 ring-frost-blue/15" : "border-white/[0.065] hover:border-frost-blue/20",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", frostBorder(color), frostBg(color))}>
          <Icon className={cn("size-3.5", frostText(color))} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold text-white/80">{agent.name ?? agent.id}</p>
          <p className="mt-0.5 truncate font-mono text-[8px] text-white/35">{agent.role ?? agent.kind ?? agent.id}</p>
        </div>
        <Bullet color={color} pulse={agent.status === "running"} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.045] pt-2 font-mono text-[8px]">
        <span className={frostText(color)}>{agent.status}</span>
        <span className="truncate text-white/35">{agent.runningTasks} running <span className="px-0.5 text-white/20">·</span> {fmtMs(agent.latencyMs)}</span>
      </div>
    </button>
  );
}

function AgentGlyph({ agent }: { agent: FleetAgent }) {
  const Icon = agentIcon(agent.id);
  const color = statusColor(agent.status);
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", frostBorder(color), frostBg(color))}>
      <Icon className={cn("size-4.5", frostText(color))} />
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex h-5 items-center justify-center text-frost-blue/50 lg:h-auto">
      <div className="hidden items-center gap-1 lg:flex">
        <span className="h-px w-2 bg-frost-blue/20" />
        <ArrowRight className="size-3.5" />
        <span className="h-px w-2 bg-frost-blue/20" />
      </div>
      <div className="flex items-center gap-1 lg:hidden">
        <span className="h-px w-4 bg-frost-blue/20" />
        <ArrowDown className="size-3.5" />
        <span className="h-px w-4 bg-frost-blue/20" />
      </div>
    </div>
  );
}

function LifecycleStage({ label, value, color, caption }: { label: string; value: string | number; color: FrostColor; caption: string }) {
  return (
    <div className={cn("rounded-xl border bg-black/25 px-3 py-2.5", frostBorder(color))}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-white/65">{label}</span>
        <Bullet color={color} />
      </div>
      <p className={cn("mt-1 font-display text-xl font-bold", frostText(color))}>{value}</p>
      <p className="mt-0.5 truncate text-[8px] text-white/30">{caption}</p>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-frost-blue/[0.08] bg-black/20 px-2.5 py-2">
      <p className="font-mono text-[8px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-white/75">{value}</p>
    </div>
  );
}
