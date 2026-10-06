import { X, Database, Route, ShieldCheck, Smartphone, Workflow, Boxes, Router, ChevronRight, ListTodo, Clock3 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useFetch } from "@/hooks/useFetch";
import type { BusEvent, FlowData, FleetAgent, FrostColor, OverviewData } from "@/lib/types";
import { fmtUptime, frostBg, frostBorder, frostText } from "@/lib/theme";
import { Bullet } from "@/components/ui/Bullet";
import { EventItem } from "@/components/EventItem";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { groupMeshAgents, meshLayerHealth, type MeshLayer } from "@/lib/workflow";
import { Link } from "react-router-dom";

interface UsageStats {
  cache?: { hits?: number; misses?: number; ttl_s?: number };
  proxy_pool?: { total?: number; active?: number; rotating?: boolean };
  breakers?: { id: string; state: string; cooldown_s?: number }[];
  error?: string;
}

const LAYER_META: Record<MeshLayer, { title: string; caption: string; icon: typeof Workflow; color: FrostColor }> = {
  control: { title: "Control plane", caption: "orchestrator · dispatch", icon: Workflow, color: "violet" },
  worker: { title: "Agent mesh", caption: "specialists · execution", icon: Boxes, color: "blue" },
  gateway: { title: "Model route", caption: "router · provider access", icon: Router, color: "cyan" },
};

export function RightDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: eventsData } = useFetch<{ events?: BusEvent[]; error?: string }>("/api/events?limit=30", 5000);
  const { data: health } = useFetch<{ gateway?: UsageStats; uptimeSec?: number }>("/api/health", 5000);
  const { data: flowData } = useFetch<FlowData & { error?: string }>("/api/flow", 5000);
  const { data: overview } = useFetch<OverviewData & { error?: string }>("/api/overview", 5000);

  const events = eventsData?.events ?? [];
  const nodes = flowData?.nodes ?? [];
  const edges = flowData?.edges ?? [];
  const layers = groupMeshAgents(nodes);
  const gw = health?.gateway;
  const gwOk = !!gw && !gw.error;
  const hits = gw?.cache?.hits ?? 0;
  const misses = gw?.cache?.misses ?? 0;
  const hitPct = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null;
  const total = overview?.tasks?.total ?? 0;
  const completion = total ? ((overview?.tasks?.completed ?? 0) / total) * 100 : 0;

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/65 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
          aria-label="Close mesh inspector"
        />
      )}
      <aside
        id="mesh-inspector-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Workflow and system inspector"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(92vw,400px)] flex-col border-l border-frost-blue/15 bg-[#080b10]/96 pt-[env(safe-area-inset-top)] shadow-[-20px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-frost-blue/10 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-frost-cyan/20 bg-frost-cyan/[0.08]">
              <Workflow className="size-4 text-frost-cyan" />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-white">Mesh inspector</span>
              <span className="mono block text-[8px] text-white/35">workflow · runtime · router</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close system panel"
            className="flex size-11 items-center justify-center rounded-xl border border-white/5 text-white/55 transition hover:bg-white/5 active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="scroll-area min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="glass-card rounded-2xl border-frost-blue/20 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl border border-frost-blue/20 bg-frost-blue/[0.08] text-frost-blue">
                <Smartphone className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[12px] font-bold text-white">ZES OS <span className="font-normal text-white/40">· Termux node</span></div>
                <div className="mono mt-0.5 text-[9px] text-white/40">uptime {health?.uptimeSec != null ? fmtUptime(health.uptimeSec) : "–"}</div>
              </div>
              <span className="rounded-md border border-frost-green/15 bg-frost-green/[0.06] px-1.5 py-1 font-mono text-[7px] tracking-wide text-frost-green/75">LOCAL</span>
            </div>
          </div>

          <section>
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Orchestration workflow</h2>
                <p className="mt-1 text-[9px] text-white/30">Live roster layers and reported links</p>
              </div>
              <span className="shrink-0 font-mono text-[8px] text-white/35">{nodes.length} nodes <span className="px-0.5 text-white/15">·</span> {edges.length} links</span>
            </div>

            <div className="space-y-1.5">
              <WorkflowLayerCard layer="control" agents={layers.control} edges={edges} />
              <LayerConnector />
              <WorkflowLayerCard layer="worker" agents={layers.worker} edges={edges} />
              <LayerConnector />
              <WorkflowLayerCard layer="gateway" agents={layers.gateway} edges={edges} />
            </div>

            {!nodes.length && (
              <p className="mt-2 rounded-lg border border-dashed border-white/10 px-3 py-2.5 text-center text-[9px] leading-relaxed text-white/30">
                {flowData?.error ? "Roster unavailable. Workflow layers will appear when the node reconnects." : "Waiting for the live roster snapshot…"}
              </p>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Task pipeline</h2>
              <Link to="/flow" onClick={onClose} className="flex min-h-8 items-center gap-1 font-mono text-[8px] text-frost-blue/70 hover:text-frost-blue">View flow <ChevronRight className="size-3" /></Link>
            </div>
            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[10px] text-white/65">
                <ListTodo className="size-3.5 text-frost-blue" /> Live task states
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
                <TaskCount label="Queue" value={overview?.error ? "–" : overview?.tasks?.pending ?? "–"} color="orange" />
                <TaskCount label="Run" value={overview?.error ? "–" : overview?.tasks?.running ?? "–"} color="blue" />
                <TaskCount label="Done" value={overview?.error ? "–" : overview?.tasks?.completed ?? "–"} color="green" />
                <TaskCount label="Failed" value={overview?.error ? "–" : overview?.tasks?.failed ?? "–"} color="red" />
              </div>
              <ProgressBar value={completion} color="green" className="mt-3" />
              <p className="mt-1.5 text-right font-mono text-[8px] text-white/30">{total ? `${Math.round(completion)}% complete` : "no task sample"}</p>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Bus events</h2>
              <Link to="/events" onClick={onClose} className="flex min-h-8 items-center gap-1 font-mono text-[8px] text-frost-green/70 hover:text-frost-green">Open stream <ChevronRight className="size-3" /></Link>
            </div>
            <div className="space-y-1.5">
              {events.slice(0, 5).map((event) => <EventItem key={event.id} event={event} compact />)}
              {events.length === 0 && <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center font-mono text-[9px] text-white/30">{eventsData?.error ? "bus unreachable" : "no recent bus records"}</p>}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Router health</h2>
            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[10px] text-white/70">
                <Database className="size-3.5 text-frost-blue" /> Semantic cache
              </div>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <span className="font-display text-lg font-semibold text-white">{hitPct != null ? `${hitPct}%` : "–"}</span>
                <span className="mono text-[8px] text-white/40">{gwOk ? `${hits} hits · ${misses} misses` : "unreachable"}</span>
              </div>
              <ProgressBar value={hitPct ?? 0} color="blue" className="mt-2" />
            </div>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[10px] text-white/70">
                <Route className="size-3.5 text-frost-green" /> Free proxy pool
              </div>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <span className="font-display text-lg font-semibold text-white">{gw?.proxy_pool ? `${gw.proxy_pool.active ?? 0}/${gw.proxy_pool.total ?? 0}` : "–"}</span>
                <span className="mono text-[8px] text-white/40">{gw?.proxy_pool?.rotating ? "rotating · round robin" : gwOk ? "static" : "unreachable"}</span>
              </div>
              <ProgressBar value={gw?.proxy_pool?.total ? ((gw.proxy_pool.active ?? 0) / gw.proxy_pool.total) * 100 : 0} color="green" className="mt-2" />
            </div>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[10px] text-white/70">
                <ShieldCheck className="size-3.5 text-frost-orange" /> Circuit breakers
              </div>
              <div className="mt-2 space-y-1.5 text-[9px]">
                {(gw?.breakers ?? []).map((breaker) => (
                  <div key={breaker.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-white/50">{breaker.id}</span>
                    <span className={cn("flex shrink-0 items-center gap-1", breaker.state === "open" ? "text-frost-red" : breaker.state === "half" ? "text-frost-orange" : "text-frost-green")}>
                      <Bullet color={breaker.state === "open" ? "red" : breaker.state === "half" ? "orange" : "green"} />
                      {breaker.state === "open" ? "tripped" : breaker.state}
                    </span>
                  </div>
                ))}
                {!gw?.breakers?.length && <p className="font-mono text-[8px] text-white/30">{gwOk ? "no active breakers" : "unreachable"}</p>}
              </div>
            </div>
          </section>

          <div className="flex items-center justify-center gap-1.5 pt-1 font-mono text-[8px] text-white/25">
            <Clock3 className="size-3" /> Data refreshes every 5 seconds
          </div>
        </div>
      </aside>
    </>
  );
}

function WorkflowLayerCard({ layer, agents, edges }: { layer: MeshLayer; agents: FleetAgent[]; edges: FlowData["edges"] }) {
  const meta = LAYER_META[layer];
  const Icon = meta.icon;
  const state = meshLayerHealth(agents);
  const online = agents.filter((agent) => agent.online).length;
  const running = agents.reduce((sum, agent) => sum + agent.runningTasks, 0);
  const agentIds = new Set(agents.map((agent) => agent.id));
  const links = edges.filter((edge) => agentIds.has(edge.from) || agentIds.has(edge.to)).length;

  return (
    <div className={cn("rounded-xl border bg-black/25 p-2.5", frostBorder(meta.color))}>
      <div className="flex items-center gap-2">
        <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border", frostBorder(meta.color), frostBg(meta.color))}>
          <Icon className={cn("size-3.5", frostText(meta.color))} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-semibold text-white/80">{meta.title}</span>
            <Bullet color={state.color} pulse={agents.some((agent) => agent.status === "running")} />
          </div>
          <span className="block truncate font-mono text-[7px] text-white/30">{meta.caption}</span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.045] pt-2 font-mono text-[8px] text-white/45">
        <span>{online}/{agents.length} online</span>
        <span>{running} running <span className="text-white/20">·</span> {links} links</span>
      </div>
      {agents.length > 0 && (
        <p className="mt-1.5 truncate text-[8px] text-white/30">{agents.slice(0, 2).map((agent) => agent.name ?? agent.id).join(" · ")}{agents.length > 2 ? ` +${agents.length - 2}` : ""}</p>
      )}
      {agents.length === 0 && <p className="mt-1.5 font-mono text-[7px] text-white/25">no role-matched node</p>}
    </div>
  );
}

function LayerConnector() {
  return <div className="flex h-2 items-center justify-center text-frost-blue/35"><span className="hidden h-px w-5 bg-frost-blue/20 sm:block" /><ChevronRight className="size-3 rotate-90 sm:rotate-90" /><span className="hidden h-px w-5 bg-frost-blue/20 sm:block" /></div>;
}

function TaskCount({ label, value, color }: { label: string; value: string | number; color: FrostColor }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 px-1 py-2">
      <p className={cn("font-display text-sm font-semibold", frostText(color))}>{value}</p>
      <p className="mt-0.5 font-mono text-[7px] uppercase tracking-wide text-white/35">{label}</p>
    </div>
  );
}
