import { Link } from "react-router-dom";
import { Waypoints, Boxes, Link2, Zap, ChevronRight } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { PortpalSummary } from "@/lib/portpal";
import { FROST_HEX, categoryFrost, timeAgoMs } from "@/lib/portpal";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Bullet } from "@/components/ui/Bullet";
import { cn } from "@/utils/cn";

/* ============================================================
   OverviewPortpal — PortPal's "dashboard" page embedded in the
   dash-v3 Overview: stat cards, active service chips w/ live
   sparklines, and the recent port start/stop events.
   ============================================================ */

export function OverviewPortpal() {
  const { data } = useFetch<PortpalSummary>("/api/portpal/summary", 5000);
  const t = data?.totals;

  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">PortPal · Ports</h2>
        <Link to="/ports" className="flex items-center gap-1 font-mono text-[10px] text-frost-cyan hover:text-frost-cyan/70">
          open <ChevronRight className="size-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PpStat icon={Waypoints} label="Active ports" value={t ? t.ports : "–"} frost="green" to="/ports" pulse />
        <PpStat icon={Boxes} label="Frameworks" value={t ? t.frameworks : "–"} frost="violet" to="/services" />
        <PpStat icon={Link2} label="Connections" value={t ? t.connections : "–"} frost="blue" to="/traffic" />
        <PpStat icon={Zap} label="Events 24h" value={t ? t.events24h : "–"} frost="orange" to="/traffic" />
      </div>

      {/* active services — snap-scroll on mobile */}
      {(data?.services?.length ?? 0) > 0 && (
        <div className="mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 no-bar sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
          {data!.services.map((s) => {
            const hex = FROST_HEX[categoryFrost(s.framework?.category)];
            return (
              <Link
                key={s.port}
                to="/ports"
                className="glass-card w-[46vw] shrink-0 snap-start rounded-2xl p-3 transition hover:border-frost-cyan/40 sm:w-auto"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[15px] font-bold" style={{ color: hex }}>:{s.port}</span>
                  <span className="flex items-center gap-1 font-mono text-[8.5px] text-frost-green">
                    <Bullet color="green" /> LIVE
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11.5px] font-medium text-white/75">{s.name}</p>
                <div className="mt-1.5">
                  {s.samples.length > 1 && <Sparkline data={s.samples} color={hex} height={24} />}
                </div>
                <p className="mono mt-1 text-[9px] text-white/35">{s.connections} conn{s.connections !== 1 ? "s" : ""}</p>
              </Link>
            );
          })}
        </div>
      )}

      {/* recent port events */}
      {(data?.events?.length ?? 0) > 0 && (
        <GlassCard className="mt-3 space-y-1.5 p-3">
          {data!.events.slice(0, 5).map((ev, i) => (
            <div key={`${ev.timestamp}-${i}`} className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
              <Bullet color={ev.eventType === "started" ? "green" : "red"} />
              <span className="font-mono text-[11px] font-bold text-white/80">:{ev.port}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-white/55">{ev.processName}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider",
                  ev.eventType === "started" ? "bg-frost-green/15 text-frost-green" : "bg-frost-red/15 text-frost-red",
                )}
              >
                {ev.eventType}
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-[9px] text-white/35">{timeAgoMs(ev.timestamp)}</span>
            </div>
          ))}
        </GlassCard>
      )}
    </section>
  );
}

function PpStat({
  icon: Icon,
  label,
  value,
  frost,
  to,
  pulse,
}: {
  icon: typeof Waypoints;
  label: string;
  value: string | number;
  frost: "green" | "violet" | "blue" | "orange";
  to: string;
  pulse?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "glass-card rounded-2xl p-3.5 transition hover:border-frost-blue/40 active:scale-[0.98]",
        frost === "green" && "frost-green",
        frost === "violet" && "frost-violet",
        frost === "blue" && "frost-blue",
        frost === "orange" && "frost-orange",
      )}
    >
      <div className="flex items-center justify-between">
        <Icon
          className={cn(
            "size-4.5",
            frost === "green" && "text-frost-green",
            frost === "violet" && "text-frost-violet",
            frost === "blue" && "text-frost-blue",
            frost === "orange" && "text-frost-orange",
          )}
          strokeWidth={1.8}
        />
        <Bullet color={frost} pulse={pulse} />
      </div>
      <p className="mt-2 font-display text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">{label}</p>
    </Link>
  );
}
