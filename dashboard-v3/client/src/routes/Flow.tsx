import { GitBranch } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { FlowData, FleetAgent } from "@/lib/types";
import { statusColor, frostText, frostBg, frostBorder, FROST_HEX } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { agentIcon } from "@/components/ModuleCard";
import { Empty, SectionTitle } from "@/routes/Overview";

/* Deterministic node layout: orchestrator top-center, router bottom-center,
   executors arranged in an arc between them. */
function layout(nodes: FleetAgent[]): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  const orch = nodes.find((n) => n.kind === "orchestrator" || n.id === "zeso");
  const hub = nodes.find((n) => n.kind === "router" || n.id === "omnirouter");
  const mid = nodes.filter((n) => n !== orch && n !== hub);
  if (orch) pos[orch.id] = { x: 50, y: 12 };
  if (hub) pos[hub.id] = { x: 50, y: 88 };
  mid.forEach((n, i) => {
    const t = mid.length === 1 ? 0.5 : i / (mid.length - 1);
    pos[n.id] = { x: 10 + t * 80, y: 42 + Math.sin(t * Math.PI) * 8 };
  });
  return pos;
}

export default function Flow() {
  const { data } = useFetch<FlowData & { error?: string }>("/api/flow", 5000);
  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];
  const pos = layout(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-5">
      <PageHeader icon={GitBranch} title="Orchestration Flow" subtitle="live request paths between agents" live={!data?.error} />

      <GlassCard className="p-2 sm:p-3 animate-fade-up">
        <div className="relative h-96 w-full overflow-hidden rounded-xl border border-white/8 bg-black/40 sm:h-[28rem]">
          {nodes.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <Empty msg="roster.json unreachable — no flow to draw" />
            </div>
          )}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {edges.map((e, i) => {
              const from = pos[e.from];
              const to = pos[e.to];
              if (!from || !to) return null;
              const target = byId.get(e.to);
              const c = statusColor(target?.status ?? "idle");
              const stroke = c === "gray" ? "rgba(255,255,255,0.2)" : FROST_HEX[c];
              return (
                <line
                  key={`${e.from}-${e.to}-${i}`}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={stroke} strokeOpacity={0.5} strokeWidth={0.4}
                  className="flow-line" vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {nodes.map((n) => {
            const p = pos[n.id];
            if (!p) return null;
            const c = statusColor(n.status);
            const Icon = agentIcon(n.id);
            const isHub = n.kind === "router" || n.kind === "orchestrator" || n.id === "omnirouter" || n.id === "zeso";
            return (
              <div
                key={n.id}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <div className={cn(
                  "flex items-center justify-center rounded-full border backdrop-blur-md",
                  frostBg(c), frostBorder(c),
                  isHub ? "size-14" : "size-10",
                )}>
                  <Icon className={cn(isHub ? "size-6" : "size-4.5", frostText(c))} strokeWidth={1.7} />
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5">
                  <Bullet color={c} pulse={n.status === "running"} />
                  <span className="text-[9.5px] font-medium text-white/80">{n.name ?? n.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* edge list */}
      {edges.length > 0 && (
        <section className="animate-fade-up">
          <SectionTitle title="Active Routes" hint={`${edges.length} edges`} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {edges.map((e, i) => {
              const target = byId.get(e.to);
              const c = statusColor(target?.status ?? "idle");
              return (
                <div key={i} className="glass-card flex items-center gap-2 rounded-xl px-3 py-2.5 font-mono text-[11px]">
                  <Bullet color={c} />
                  <span className="text-white/70">{byId.get(e.from)?.name ?? e.from}</span>
                  <span className="text-white/30">→</span>
                  <span className={frostText(c)}>{target?.name ?? e.to}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
