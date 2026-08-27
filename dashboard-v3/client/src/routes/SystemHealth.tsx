import { HeartPulse, Database, Route, ShieldCheck, Timer, Gauge, MemoryStick } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { fmtUptime, fmtBytes } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatsCard } from "@/components/StatsCard";
import { BarChart } from "@/components/ui/BarChart";
import { SectionTitle } from "@/routes/Overview";

interface Gateway {
  error?: string;
  uptime_s?: number;
  requests?: { total?: number; per_minute?: number; error_rate?: number };
  cache?: { hits?: number; misses?: number; size?: number; capacity?: number; ttl_s?: number };
  proxy_pool?: { total?: number; active?: number; rotating?: boolean; strategy?: string };
  breakers?: { id: string; state: string; failures?: number; threshold?: number; cooldown_s?: number }[];
  history?: { minute: number; requests: number }[];
}

interface Health {
  gateway?: Gateway;
  uptimeSec?: number;
  loadavg?: number[];
  memory?: { total: number; free: number };
}

export default function SystemHealth() {
  const { data } = useFetch<Health>("/api/health", 5000);
  const gw = data?.gateway;
  const gwOk = !!gw && !gw.error;

  const hits = gw?.cache?.hits ?? 0;
  const misses = gw?.cache?.misses ?? 0;
  const hitPct = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null;
  const tripped = (gw?.breakers ?? []).filter((b) => b.state === "open");
  const memUsedPct = data?.memory ? Math.round(((data.memory.total - data.memory.free) / data.memory.total) * 100) : null;

  return (
    <div className="space-y-5">
      <PageHeader icon={HeartPulse} title="System Health" subtitle=":20128/api/usage/stats + os.uptime()" live={gwOk} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 animate-fade-up">
        <StatsCard icon={Database} label="Semantic cache" value={hitPct != null ? `${hitPct}%` : "–"}
          hint={gwOk ? `${hits} hits · ${misses} misses · ${gw?.cache?.ttl_s ? `${Math.round((gw.cache.ttl_s) / 60)}m TTL` : ""}` : "unreachable"} frost="blue" />
        <StatsCard icon={Route} label="Free proxy pool" value={gw?.proxy_pool ? `${gw.proxy_pool.active}/${gw.proxy_pool.total}` : "–"}
          hint={gw?.proxy_pool?.rotating ? `rotation: ${gw.proxy_pool.strategy ?? "on"}` : gwOk ? "static" : "unreachable"} frost="green" pulse={gw?.proxy_pool?.rotating} />
        <StatsCard icon={ShieldCheck} label="Circuit breakers" value={gwOk ? `${tripped.length} tripped` : "–"}
          hint={tripped.length ? tripped.map((b) => b.id).join(", ") : gwOk ? "all closed" : "unreachable"} frost={tripped.length ? "red" : "orange"} pulse={tripped.length > 0} />
        <StatsCard icon={Timer} label="Node uptime" value={data?.uptimeSec != null ? fmtUptime(data.uptimeSec) : "–"}
          hint={gw?.uptime_s != null ? `gateway ${fmtUptime(gw.uptime_s)}` : undefined} frost="blue" />
      </div>

      {/* archify-style request chart */}
      <section className="animate-fade-up">
        <SectionTitle title="Gateway Throughput" hint={gwOk ? `${gw?.requests?.per_minute ?? "–"} rpm · ${gw?.requests?.error_rate ?? "–"}% errors` : "unreachable"} />
        <GlassCard frost="blue">
          {gw?.history?.length ? (
            <BarChart
              label="requests / minute (last 24 buckets)"
              data={gw.history.map((h) => ({ label: `m${h.minute}`, value: h.requests }))}
              color="rgb(64,156,255)"
              height={150}
            />
          ) : (
            <p className="py-6 text-center font-mono text-[11px] text-white/30">{gwOk ? "no history exposed" : "gateway unreachable — { error: \"unreachable\" }"}</p>
          )}
        </GlassCard>
      </section>

      {/* breakers detail */}
      <section className="animate-fade-up">
        <SectionTitle title="Circuit Breaker States" hint="live" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(gw?.breakers ?? []).map((b) => {
            const c = b.state === "open" ? "red" : b.state === "half" ? "orange" : "green";
            return (
              <GlassCard key={b.id} frost={c} className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-white/85">{b.id}</span>
                  <Bullet color={c} pulse={b.state === "open"} />
                </div>
                <p className={cn("mt-1 font-mono text-[11px] capitalize", `text-frost-${c}`)}>
                  {b.state === "open" ? "tripped" : b.state}
                </p>
                <p className="mono mt-0.5 text-[10px] text-white/35">
                  {b.failures ?? 0}/{b.threshold ?? "–"} failures · {b.cooldown_s ?? "–"}s cooldown
                </p>
                <ProgressBar value={b.threshold ? ((b.failures ?? 0) / b.threshold) * 100 : 0} color={c} className="mt-2 h-1" />
              </GlassCard>
            );
          })}
          {!gw?.breakers?.length && (
            <GlassCard className="sm:col-span-2 lg:col-span-4">
              <p className="text-center font-mono text-[11px] text-white/30">{gwOk ? "no breakers reported" : "unreachable"}</p>
            </GlassCard>
          )}
        </div>
      </section>

      {/* host metrics */}
      <section className="animate-fade-up">
        <SectionTitle title="Host Node" hint="os module" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <GlassCard frost="green" className="p-4">
            <div className="flex items-center gap-2 text-[12px] text-white/70">
              <Gauge className="size-4 text-frost-green" /> Load average
            </div>
            <p className="mt-2 font-mono text-xl font-semibold text-white">
              {data?.loadavg ? data.loadavg.map((n) => n.toFixed(2)).join(" · ") : "–"}
            </p>
            <p className="mt-0.5 text-[10px] text-white/40">1m · 5m · 15m</p>
          </GlassCard>
          <GlassCard frost="orange" className="p-4">
            <div className="flex items-center gap-2 text-[12px] text-white/70">
              <MemoryStick className="size-4 text-frost-orange" /> Memory
            </div>
            <p className="mt-2 font-mono text-xl font-semibold text-white">
              {memUsedPct != null ? `${memUsedPct}% used` : "–"}
            </p>
            <p className="mt-0.5 text-[10px] text-white/40">
              {data?.memory ? `${fmtBytes(data.memory.total - data.memory.free)} of ${fmtBytes(data.memory.total)}` : "–"}
            </p>
            <ProgressBar value={memUsedPct ?? 0} color="orange" className="mt-2" />
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
