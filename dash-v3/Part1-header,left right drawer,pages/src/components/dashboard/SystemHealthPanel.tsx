import { Database, Route, ShieldCheck, Timer } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { Bullet } from "../ui/Bullet";

export function SystemHealthPanel() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <GlassCard className="glass-frost-blue">
        <div className="flex items-center gap-2 text-[12px] text-white/70">
          <Database className="size-4 text-sky-300" /> Semantic Cache
        </div>
        <p className="mt-2 text-2xl font-semibold text-white">80%</p>
        <p className="mt-0.5 text-[11px] text-white/45">845 hits · 213 misses · 1h TTL</p>
      </GlassCard>

      <GlassCard className="glass-frost-green">
        <div className="flex items-center gap-2 text-[12px] text-white/70">
          <Route className="size-4 text-emerald-300" /> Free Proxy Pool
        </div>
        <p className="mt-2 text-2xl font-semibold text-white">148/160</p>
        <p className="mt-0.5 text-[11px] text-white/45">Round-robin rotation active</p>
      </GlassCard>

      <GlassCard className="glass-frost-orange">
        <div className="flex items-center gap-2 text-[12px] text-white/70">
          <ShieldCheck className="size-4 text-orange-300" /> Circuit Breakers
        </div>
        <p className="mt-2 text-2xl font-semibold text-white">1 tripped</p>
        <p className="mt-0.5 text-[11px] text-white/45">antigravity: 90s cooldown</p>
      </GlassCard>

      <GlassCard className="glass-frost-blue">
        <div className="flex items-center gap-2 text-[12px] text-white/70">
          <Timer className="size-4 text-sky-300" /> Node Uptime
        </div>
        <p className="mt-2 text-2xl font-semibold text-white">14h 23m</p>
        <p className="mt-0.5 text-[11px] text-white/45">Auto-recovery daemon: running</p>
      </GlassCard>

      <GlassCard className="sm:col-span-2 xl:col-span-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-white/80">Circuit Breaker States</h3>
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <Bullet frost="green" pulse /> live
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { name: "antigravity", state: "tripped", detail: "90s / 10 failures", frost: "red" as const },
            { name: "cloudflare-ai", state: "closed", detail: "120s / 15 failures", frost: "green" as const },
            { name: "gemini", state: "closed", detail: "120s / 15 failures", frost: "green" as const },
          ].map((cb) => (
            <div key={cb.name} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-white/80">{cb.name}</span>
                <Bullet frost={cb.frost} pulse={cb.frost === "red"} />
              </div>
              <p className="mt-1 text-[11px] capitalize text-white/50">{cb.state}</p>
              <p className="mono mt-0.5 text-[10px] text-white/30">{cb.detail}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
