import { X, Radio, Database, Route, ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@/utils/cn";
import { useFetch } from "@/hooks/useFetch";
import type { BusEvent } from "@/lib/types";
import { fmtUptime } from "@/lib/theme";
import { Bullet } from "@/components/ui/Bullet";
import { EventItem } from "@/components/EventItem";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface UsageStats {
  cache?: { hits?: number; misses?: number; ttl_s?: number };
  proxy_pool?: { total?: number; active?: number; rotating?: boolean };
  breakers?: { id: string; state: string; cooldown_s?: number }[];
  error?: string;
}

export function RightDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: eventsData } = useFetch<{ events?: BusEvent[]; error?: string }>("/api/events?limit=30", 5000);
  const { data: health } = useFetch<{ gateway?: UsageStats; uptimeSec?: number }>("/api/health", 5000);

  const events = eventsData?.events ?? [];
  const gw = health?.gateway;
  const gwOk = !!gw && !gw.error;
  const hits = gw?.cache?.hits ?? 0;
  const misses = gw?.cache?.misses ?? 0;
  const hitPct = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-[360px] flex-col border-l border-white/10 bg-black/90 backdrop-blur-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0 animate-slide-in-right" : "pointer-events-none translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-frost-green" />
            <span className="text-[13px] font-semibold text-white">Live System Panel</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close system panel"
            className="flex size-8 items-center justify-center rounded-lg text-white/60 active:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="scroll-area flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* node identity */}
          <div className="glass-card frost-blue rounded-xl p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg border border-frost-blue/30 bg-frost-blue/15 text-frost-blue">
                <Smartphone className="size-4.5" />
              </div>
              <div>
                <div className="font-display text-[13px] font-bold text-white">ZES OS · Termux Node</div>
                <div className="font-mono text-[10px] text-white/45">
                  uptime {health?.uptimeSec != null ? fmtUptime(health.uptimeSec) : "–"}
                </div>
              </div>
            </div>
          </div>

          {/* live events */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Bus Events</h3>
              <span className="flex items-center gap-1 font-mono text-[10px] text-frost-green">
                <Bullet color="green" pulse /> polling 5s
              </span>
            </div>
            <div className="space-y-1.5">
              {events.slice(0, 12).map((e) => (
                <EventItem key={e.id} event={e} compact />
              ))}
              {events.length === 0 && <p className="font-mono text-[10px] text-white/30">bus unreachable</p>}
            </div>
          </section>

          {/* router metrics */}
          <section className="space-y-2.5">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Router Metrics</h3>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[12px] text-white/70">
                <Database className="size-3.5 text-frost-blue" /> Semantic cache
              </div>
              <div className="mt-1.5 flex items-end justify-between">
                <span className="text-lg font-semibold text-white">{hitPct != null ? `${hitPct}%` : "–"}</span>
                <span className="mono text-[10px] text-white/40">
                  {gwOk ? `${hits} hits · ${misses} miss` : "unreachable"}
                </span>
              </div>
              <ProgressBar value={hitPct ?? 0} color="blue" className="mt-2" />
            </div>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[12px] text-white/70">
                <Route className="size-3.5 text-frost-green" /> Free proxy pool
              </div>
              <div className="mt-1.5 flex items-end justify-between">
                <span className="text-lg font-semibold text-white">
                  {gw?.proxy_pool ? `${gw.proxy_pool.active}/${gw.proxy_pool.total}` : "–"}
                </span>
                <span className="mono text-[10px] text-white/40">
                  {gw?.proxy_pool?.rotating ? "rotating · round robin" : gwOk ? "static" : "unreachable"}
                </span>
              </div>
              <ProgressBar
                value={gw?.proxy_pool?.total ? ((gw.proxy_pool.active ?? 0) / gw.proxy_pool.total) * 100 : 0}
                color="green"
                className="mt-2"
              />
            </div>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[12px] text-white/70">
                <ShieldCheck className="size-3.5 text-frost-orange" /> Circuit breakers
              </div>
              <div className="mt-2 space-y-1.5 text-[11px]">
                {(gw?.breakers ?? []).map((b) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <span className="text-white/55">{b.id}</span>
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        b.state === "open" ? "text-frost-red" : b.state === "half" ? "text-frost-orange" : "text-frost-green",
                      )}
                    >
                      <Bullet color={b.state === "open" ? "red" : b.state === "half" ? "orange" : "green"} />
                      {b.state === "open" ? "tripped" : b.state}
                    </span>
                  </div>
                ))}
                {!gw?.breakers?.length && <p className="font-mono text-[10px] text-white/30">{gwOk ? "none" : "unreachable"}</p>}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
