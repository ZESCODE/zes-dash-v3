import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Boxes, AppWindow, ServerCog, Database, Lock, Hexagon, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { PortsResponse, PortInfo, TrafficResponse } from "@/lib/portpal";
import { portHex, samplesToSeries } from "@/lib/portpal";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatusBadge } from "@/components/portpal/PortBits";
import { EmptyState } from "@/components/portpal/PortBits";
import { SectionTitle } from "@/routes/Overview";
import { cn } from "@/utils/cn";

/* ============================================================
   Services — PortPal's services page: ports auto-grouped into
   project / framework cards with merged sparklines.
   ============================================================ */

const CATEGORY_ICON: Record<string, LucideIcon> = {
  frontend: AppWindow,
  backend: ServerCog,
  database: Database,
  secure: Lock,
  web: Hexagon,
  zes: Hexagon,
};

interface ServiceGroup {
  key: string;
  hex: string;
  icon: LucideIcon;
  ports: PortInfo[];
}

export default function Services() {
  const { data: portsData } = useFetch<PortsResponse>("/api/portpal/ports", 5000);
  const { data: trafficData } = useFetch<TrafficResponse>("/api/portpal/traffic", 5000);

  const ports = useMemo(() => portsData?.ports ?? [], [portsData]);
  const traffic = trafficData?.traffic ?? {};

  const groups = useMemo<ServiceGroup[]>(() => {
    const map = new Map<string, ServiceGroup>();
    for (const p of ports) {
      const key = p.projectName ?? p.framework?.label ?? p.processName;
      const existing = map.get(key);
      if (existing) existing.ports.push(p);
      else
        map.set(key, {
          key,
          hex: portHex(p),
          icon: CATEGORY_ICON[p.framework?.category ?? ""] ?? Hexagon,
          ports: [p],
        });
    }
    return [...map.values()].sort((a, b) => b.ports.length - a.ports.length);
  }, [ports]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Boxes}
        title="Services"
        subtitle={`${groups.length} service${groups.length !== 1 ? "s" : ""} across ${ports.length} port${ports.length !== 1 ? "s" : ""}`}
      />

      {groups.length === 0 ? (
        <GlassCard><EmptyState title="No services running" sub="start a server to see it here" /></GlassCard>
      ) : (
        <section className="animate-fade-up">
          <SectionTitle title="Grouped by Project / Framework" hint="auto-detected" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => {
              const conns = g.ports.reduce((s, p) => s + p.connections, 0);
              // merge sparklines across the group's ports
              const merged: number[] = [];
              for (const p of g.ports) {
                samplesToSeries(traffic[String(p.port)]).forEach((v, i) => {
                  merged[i] = (merged[i] ?? 0) + v;
                });
              }
              return (
                <GlassCard key={g.key} className="p-4 transition hover:border-frost-blue/30">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                      style={{ borderColor: `${g.hex}44`, background: `${g.hex}14` }}
                    >
                      <g.icon className="size-5" style={{ color: g.hex }} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-white/90">{g.key}</p>
                      <p className="mono text-[10px] text-white/40">
                        {g.ports.length} port{g.ports.length !== 1 ? "s" : ""} · {conns} conn{conns !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <StatusBadge label="RUNNING" frost="green" />
                  </div>

                  <div className="mt-3">{merged.length > 1 && <Sparkline data={merged} color={g.hex} height={34} />}</div>

                  <div className="mt-2 space-y-1">
                    {g.ports.map((p) => (
                      <div key={p.port} className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: g.hex }} />
                        <span className="font-mono text-[11px] font-bold" style={{ color: g.hex }}>:{p.port}</span>
                        <span className="mono min-w-0 flex-1 truncate text-[10px] text-white/50">{p.processName}</span>
                        <span className={cn("mono shrink-0 text-[9px]", p.pid > 0 ? "text-white/35" : "text-white/20")}>
                          {p.pid > 0 ? `PID ${p.pid}` : "system"}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </section>
      )}

      <Link
        to="/ports"
        className="glass-card frost-green flex items-center justify-between rounded-2xl p-4 transition hover:border-frost-green/50"
      >
        <span className="flex items-center gap-2.5 text-[12.5px] font-medium text-white/80">
          <Hexagon className="size-4 text-frost-green" /> Inspect, kill or restart these services on the Ports page
        </span>
        <ChevronRight className="size-4 text-frost-green" />
      </Link>
    </div>
  );
}
