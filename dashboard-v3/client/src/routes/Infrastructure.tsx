import { Server, Database, Route, ShieldCheck, Timer, Boxes, Network, Braces } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { fmtUptime, fmtBytes } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BarChart } from "@/components/ui/BarChart";
import { SectionTitle } from "@/routes/Overview";

interface UsageStats {
  error?: string;
  uptime_s?: number;
  requests?: { total?: number; per_minute?: number; error_rate?: number };
  cache?: { hits?: number; misses?: number; size?: number; capacity?: number; ttl_s?: number };
  proxy_pool?: { total?: number; active?: number; rotating?: boolean; strategy?: string };
  breakers?: { id: string; state: string; failures?: number; threshold?: number; cooldown_s?: number }[];
  history?: { minute: number; requests: number }[];
}

interface ModelList {
  error?: string;
  data?: { id: string; owned_by?: string }[];
}

interface InfraData {
  usageStats?: UsageStats;
  gatewayModels?: ModelList;
  routerModels?: ModelList;
  node?: {
    uptimeSec: number;
    platform: string;
    arch: string;
    cpus: number;
    loadavg: number[];
    memory: { total: number; free: number };
    hostname: string;
    nodeVersion: string;
  };
  endpoints?: Record<string, string>;
}

export default function Infrastructure() {
  const { data } = useFetch<InfraData>("/api/infra", 5000);
  const stats = data?.usageStats;
  const statsOk = !!stats && !stats.error;
  const hits = stats?.cache?.hits ?? 0;
  const misses = stats?.cache?.misses ?? 0;
  const hitPct = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null;
  const tripped = (stats?.breakers ?? []).filter((b) => b.state === "open");

  return (
    <div className="space-y-5">
      <PageHeader icon={Server} title="Infrastructure" subtitle=":20128/api/usage/stats · :20128/v1/models · :5050/v1/models" live={statsOk} />

      {/* the 4 required cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up">
        {/* Semantic Cache */}
        <GlassCard frost="blue">
          <div className="flex items-center gap-2 text-[12px] text-white/70">
            <Database className="size-4 text-frost-blue" /> Semantic Cache
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white">{hitPct != null ? `${hitPct}%` : "–"}</p>
          <p className="mt-0.5 font-mono text-[10px] text-white/45">
            {statsOk ? `${hits} hits · ${misses} misses · TTL ${stats?.cache?.ttl_s != null ? `${Math.round(stats.cache.ttl_s / 60)}m` : "–"}` : "–"}
          </p>
          <ProgressBar value={hitPct ?? 0} color="blue" className="mt-3" />
        </GlassCard>

        {/* Free Proxy Pool */}
        <GlassCard frost="green">
          <div className="flex items-center gap-2 text-[12px] text-white/70">
            <Route className="size-4 text-frost-green" /> Free Proxy Pool
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white">
            {stats?.proxy_pool ? `${stats.proxy_pool.active}/${stats.proxy_pool.total}` : "–"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-white/45">
            {stats?.proxy_pool ? (stats.proxy_pool.rotating ? `rotation active · ${stats.proxy_pool.strategy ?? "round-robin"}` : "rotation stopped") : "–"}
          </p>
          <ProgressBar value={stats?.proxy_pool?.total ? ((stats.proxy_pool.active ?? 0) / stats.proxy_pool.total) * 100 : 0} color="green" className="mt-3" />
        </GlassCard>

        {/* Circuit Breakers */}
        <GlassCard frost={tripped.length ? "red" : "orange"}>
          <div className="flex items-center gap-2 text-[12px] text-white/70">
            <ShieldCheck className="size-4 text-frost-orange" /> Circuit Breakers
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white">{statsOk ? `${tripped.length} tripped` : "–"}</p>
          <div className="mt-1.5 space-y-1 font-mono text-[10px]">
            {tripped.map((b) => (
              <p key={b.id} className="flex items-center gap-1.5 text-frost-red">
                <Bullet color="red" pulse /> {b.id} · {b.cooldown_s ?? "–"}s cooldown
              </p>
            ))}
            {statsOk && tripped.length === 0 && <p className="text-frost-green">all closed</p>}
            {!statsOk && <p className="text-white/40">–</p>}
          </div>
        </GlassCard>

        {/* Node Uptime */}
        <GlassCard frost="blue">
          <div className="flex items-center gap-2 text-[12px] text-white/70">
            <Timer className="size-4 text-frost-blue" /> Node Uptime
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white">
            {data?.node ? fmtUptime(data.node.uptimeSec) : "–"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-white/45">
            {data?.node ? `${data.node.platform}/${data.node.arch} · ${data.node.cpus} cpu · node ${data.node.nodeVersion}` : "–"}
          </p>
          <p className="mt-1 font-mono text-[10px] text-white/35">
            {data?.node ? `mem ${fmtBytes(data.node.memory.total - data.node.memory.free)} / ${fmtBytes(data.node.memory.total)}` : ""}
          </p>
        </GlassCard>
      </div>

      {/* archify-style throughput graph */}
      <section className="animate-fade-up">
        <SectionTitle title="Gateway Requests" hint={statsOk ? `${stats?.requests?.total ?? "–"} total · ${stats?.requests?.per_minute ?? "–"} rpm` : "unreachable"} />
        <GlassCard frost="blue">
          {stats?.history?.length ? (
            <BarChart label="requests / minute" data={stats.history.map((h) => ({ label: `m${h.minute}`, value: h.requests }))} color="rgb(34,211,238)" height={150} />
          ) : (
            <p className="py-6 text-center font-mono text-[11px] text-white/30">{statsOk ? "no history exposed" : "endpoint unreachable — showing –"}</p>
          )}
        </GlassCard>
      </section>

      {/* model catalogs */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2 animate-fade-up">
        <ModelPanel title="OmniRoute Models" subtitle=":20128/v1/models" icon={Network} list={data?.gatewayModels} frost="green" />
        <ModelPanel title="ZES Router Models" subtitle=":5050/v1/models" icon={Boxes} list={data?.routerModels} frost="orange" />
      </section>

      {/* raw endpoints */}
      <section className="animate-fade-up">
        <SectionTitle title="Raw Endpoints" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Object.entries(data?.endpoints ?? {}).map(([k, v]) => (
            <div key={k} className="glass-card flex items-center gap-2 rounded-xl px-3 py-2.5 font-mono text-[10px]">
              <Braces className="size-3.5 shrink-0 text-frost-blue/70" />
              <div className="min-w-0">
                <p className="text-white/45">{k}</p>
                <p className="truncate text-white/75">{v}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModelPanel({
  title,
  subtitle,
  icon: Icon,
  list,
  frost,
}: {
  title: string;
  subtitle: string;
  icon: typeof Network;
  list?: ModelList;
  frost: "green" | "orange";
}) {
  const ok = !!list && !list.error && Array.isArray(list.data);
  return (
    <GlassCard frost={frost}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4", `text-frost-${frost}`)} />
          <h3 className="text-[13px] font-semibold text-white">{title}</h3>
        </div>
        <span className="font-mono text-[9px] text-white/35">{subtitle}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold text-white">{ok ? `${list!.data!.length} models` : "–"}</p>
      <div className="scroll-area mt-2.5 max-h-44 space-y-1 overflow-y-auto pr-1">
        {ok &&
          list!.data!.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/25 px-2.5 py-1.5 font-mono text-[10px]">
              <span className="truncate text-white/75">{m.id}</span>
              {m.owned_by && <span className="ml-2 shrink-0 text-white/30">{m.owned_by}</span>}
            </div>
          ))}
        {!ok && <p className="font-mono text-[10px] text-white/30">unreachable — {"{ error: \"unreachable\" }"}</p>}
      </div>
    </GlassCard>
  );
}
