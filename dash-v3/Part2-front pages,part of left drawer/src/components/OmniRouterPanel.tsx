import { Network, Gauge, ShieldCheck, Database, Server } from "lucide-react";
import type { OmniMetrics } from "@/lib/types";
import { cn } from "@/utils/cn";
import { Bullet } from "./ui/Bullet";
import { ProgressBar } from "./ui/ProgressBar";
import { fmtUptime } from "@/lib/theme";

export function OmniRouterPanel({ omni }: { omni: OmniMetrics }) {
  const hitRate = omni.cache.hits / (omni.cache.hits + omni.cache.misses) * 100;
  const proxyPct = omni.proxyPool.active / omni.proxyPool.total * 100;

  return (
    <div className="glass-card frost-blue p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-frost-blue/30 bg-frost-blue/15 text-frost-blue">
            <Network className="size-5.5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">Inference OmniRouter</h3>
            <p className="font-mono text-[11px] text-white/45">http://127.0.0.1:20128/v1</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-frost-green/30 bg-frost-green/10 px-2.5 py-1 text-[10px] font-semibold text-frost-green">
          <Bullet color="green" pulse /> LIVE
        </span>
      </div>

      {/* headline metrics */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat icon={Gauge} label="Throughput" value={`${Math.round(omni.throughputRpm)}`} unit="rpm" />
        <Stat icon={ShieldCheck} label="Error rate" value={`${omni.errorRate.toFixed(1)}`} unit="%" warn={omni.errorRate > 4} />
        <Stat icon={Database} label="Cache hit" value={`${hitRate.toFixed(0)}`} unit="%" />
        <Stat icon={Server} label="Uptime" value={fmtUptime(omni.uptimeSec)} unit="" />
      </div>

      {/* model combos */}
      <div className="mt-5">
        <SectionLabel>Model Combos</SectionLabel>
        <div className="mt-2 space-y-2.5">
          {omni.combos.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/5 bg-black/20 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[12px] font-semibold text-frost-blue">{c.name}</code>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-white/40">{c.strategy}</span>
                </div>
                <span className="font-mono text-[10px] text-white/45">{c.models} models</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressBar value={c.load} color={c.load > 80 ? "orange" : "blue"} />
                <span className="w-9 shrink-0 text-right font-mono text-[10px] text-white/55">{Math.round(c.load)}%</span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-white/35">{c.best}</p>
            </div>
          ))}
        </div>
      </div>

      {/* cache + proxy */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <SectionLabel noMargin>Semantic Cache</SectionLabel>
            <span className="font-mono text-[10px] text-white/40">{omni.cache.size}/{omni.cache.capacity} · {omni.cache.ttlMin}m TTL</span>
          </div>
          <div className="mt-2 flex items-end justify-between font-mono text-[11px]">
            <span className="text-frost-green">{omni.cache.hits} hits</span>
            <span className="text-frost-orange">{omni.cache.misses} miss</span>
          </div>
          <ProgressBar className="mt-1.5" value={hitRate} color="green" />
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <SectionLabel noMargin>Proxy Pool</SectionLabel>
            <span className={cn("font-mono text-[10px]", omni.proxyPool.rotating ? "text-frost-green" : "text-white/40")}>
              {omni.proxyPool.rotating ? "rotating ↻" : "idle"}
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between font-mono text-[11px]">
            <span className="text-frost-blue">{omni.proxyPool.active} active</span>
            <span className="text-white/40">/ {omni.proxyPool.total}</span>
          </div>
          <ProgressBar className="mt-1.5" value={proxyPct} color="blue" />
        </div>
      </div>

      {/* circuit breakers */}
      <div className="mt-4">
        <SectionLabel>Circuit Breakers</SectionLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {omni.breakers.map((b) => {
            const tone = b.state === "closed" ? "green" : b.state === "half" ? "orange" : "red";
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5">
                <Bullet color={tone} />
                <code className="font-mono text-[11px] text-white/70">{b.id}</code>
                <span className="font-mono text-[9px] uppercase text-white/35">{b.state}</span>
                <span className="font-mono text-[9px] text-white/30">{b.failures}/{b.threshold}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, unit, warn }: { icon: typeof Gauge; label: string; value: string; unit: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-2.5">
      <Icon className={cn("size-3.5", warn ? "text-frost-orange" : "text-frost-blue/70")} />
      <div className={cn("mt-1 font-mono text-[15px] font-semibold", warn ? "text-frost-orange" : "text-white")}>
        {value}
        {unit && <span className="ml-0.5 text-[9px] font-normal text-white/40">{unit}</span>}
      </div>
      <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
    </div>
  );
}

function SectionLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return <div className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40", !noMargin && "mb-0")}>{children}</div>;
}
