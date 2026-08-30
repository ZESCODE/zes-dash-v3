import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Waypoints, Zap, Link2, Flame, Clock, ChevronRight } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { PortsResponse, TrafficResponse, PortEvent } from "@/lib/portpal";
import { portHex, serviceLabel, fmtTimeMs, timeAgoMs, samplesToSeries } from "@/lib/portpal";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatsCard } from "@/components/StatsCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Bullet } from "@/components/ui/Bullet";
import { EmptyState, FwBadge } from "@/components/portpal/PortBits";
import { SectionTitle } from "@/routes/Overview";

/* ============================================================
   Traffic — PortPal's traffic page: live connection activity
   per port + the start/stop event log (PortPal "logs").
   ============================================================ */

export default function Traffic() {
  const { data: portsData } = useFetch<PortsResponse>("/api/portpal/ports", 4000);
  const { data: trafficData } = useFetch<TrafficResponse>("/api/portpal/traffic", 4000);
  const { data: eventsData } = useFetch<{ events?: PortEvent[] }>("/api/portpal/events?limit=100", 5000);

  const ports = useMemo(() => portsData?.ports ?? [], [portsData]);
  const traffic = trafficData?.traffic ?? {};
  const events = eventsData?.events ?? [];

  const total = ports.reduce((s, p) => s + p.connections, 0);
  const peak = Object.values(traffic).reduce(
    (s, samples) => s + Math.max(0, ...samplesToSeries(samples)), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={TrendingUp}
        title="Traffic Monitor"
        subtitle={`real-time connections · sample every ${trafficData ? Math.round(trafficData.sampleMs / 1000) : "–"}s`}
      />

      {/* overview stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 animate-fade-up">
        <StatsCard icon={Waypoints} label="Active ports" value={ports.length} frost="blue" pulse />
        <StatsCard icon={Link2} label="Connections" value={total} frost="green" pulse={total > 0} />
        <StatsCard icon={Flame} label="Peak (session)" value={peak} frost="violet" />
        <StatsCard icon={Clock} label="Samples kept" value={trafficData?.history ?? "–"} frost="orange" />
      </div>

      {/* per-port traffic cards */}
      <section className="animate-fade-up">
        <SectionTitle title="Per-port Activity" hint={`${ports.length} monitored`} />
        {ports.length === 0 ? (
          <GlassCard><EmptyState title="No active ports" sub="start a server to see traffic" /></GlassCard>
        ) : (
          <div className="space-y-2.5">
            {ports.map((p) => {
              const hex = portHex(p);
              const samples = traffic[String(p.port)] ?? [];
              const series = samplesToSeries(samples);
              const current = p.connections;
              const pk = Math.max(0, ...series);
              return (
                <GlassCard key={`${p.pid}-${p.port}`} className="p-3.5 transition hover:border-frost-blue/30">
                  <div className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: hex, boxShadow: `0 0 8px ${hex}` }} />
                    <span className="font-mono text-[15px] font-bold" style={{ color: hex }}>{p.port}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-white/85">{serviceLabel(p)}</span>
                    {p.framework && <FwBadge label={p.framework.label} hex={hex} />}
                  </div>
                  <div className="mt-2 flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      {series.length > 1 ? <Sparkline data={series} color={hex} height={38} /> : (
                        <p className="mono h-[38px] text-[10px] leading-[38px] text-white/25">collecting samples…</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-3 text-center font-mono">
                      <Metric v={current} k="current" hex={hex} />
                      <Metric v={pk} k="peak" hex="#a78bfa" />
                      <Metric v={series.length} k="samples" hex="#8b93a7" />
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      {/* port events (PortPal logs) */}
      <section className="animate-fade-up">
        <SectionTitle title="Port Events" hint="start / stop log" />
        <GlassCard className="p-2.5">
          {events.length === 0 ? (
            <EmptyState title="No events yet" sub="port start and stop events will appear here" />
          ) : (
            <div className="space-y-1">
              {events.slice(0, 40).map((ev, i) => (
                <div key={`${ev.timestamp}-${i}`} className="flex items-center gap-2.5 rounded-lg border border-frost-blue/5 bg-black/20 px-2.5 py-2">
                  <Bullet color={ev.eventType === "started" ? "green" : "red"} />
                  <span className="font-mono text-[11px] font-bold text-white/80">:{ev.port}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">{ev.processName}</span>
                  {ev.framework && <span className="mono hidden text-[9px] text-frost-violet sm:block">{ev.framework}</span>}
                  <span
                    className={
                      "rounded-full px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider " +
                      (ev.eventType === "started" ? "bg-frost-green/15 text-frost-green" : "bg-frost-red/15 text-frost-red")
                    }
                  >
                    {ev.eventType}
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-[9px] text-white/35">{timeAgoMs(ev.timestamp)}</span>
                  <span className="hidden w-16 shrink-0 text-right font-mono text-[9px] text-white/25 sm:block">{fmtTimeMs(ev.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </section>

      <Link
        to="/ports"
        className="glass-card frost-violet flex items-center justify-between rounded-2xl p-4 transition hover:border-frost-violet/50"
      >
        <span className="flex items-center gap-2.5 text-[12.5px] font-medium text-white/80">
          <Zap className="size-4 text-frost-violet" /> Open the port map to see service topology
        </span>
        <ChevronRight className="size-4 text-frost-violet" />
      </Link>
    </div>
  );
}

function Metric({ v, k, hex }: { v: number; k: string; hex: string }) {
  return (
    <div className="min-w-[44px]">
      <p className="text-[15px] font-bold leading-none" style={{ color: hex }}>{v}</p>
      <p className="mt-0.5 text-[8px] uppercase tracking-wider text-white/35">{k}</p>
    </div>
  );
}
