import { useEffect, useMemo, useState } from "react";
import { Waypoints, Radar } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { usePortpalActions } from "@/hooks/usePortpal";
import type { PortGraphData, PortGraphNode, PortsResponse, PortInfo, TrafficResponse } from "@/lib/portpal";
import { FROST_HEX, categoryFrost } from "@/lib/portpal";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { PortGraph } from "@/components/portpal/PortGraph";
import { PortList } from "@/components/portpal/PortList";
import { ActionBtn, ActionToast, FwBadge } from "@/components/portpal/PortBits";

/* ============================================================
   Ports & Map — PortPal's "ports" (3 tabs) + "port map" (D3
   topology) merged into one vertical page: map on top, list below.
   ============================================================ */

export default function PortsMap() {
  const { data: portsData, loading, refresh } = useFetch<PortsResponse>("/api/portpal/ports", 4000);
  const { data: graphData } = useFetch<PortGraphData>("/api/portpal/graph", 4000);
  const { data: trafficData } = useFetch<TrafficResponse>("/api/portpal/traffic", 4000);

  const [selected, setSelected] = useState<PortGraphNode | null>(null);
  const [killedPorts, setKilledPorts] = useState<Map<number, PortInfo>>(new Map());
  const { killing, restarting, toast, kill, restart, rescan } = usePortpalActions(refresh);

  const ports = useMemo(() => portsData?.ports ?? [], [portsData]);
  const traffic = trafficData?.traffic ?? {};
  const graph = useMemo(
    () => ({ nodes: graphData?.nodes ?? [], edges: graphData?.edges ?? [] }),
    [graphData],
  );

  // prune killed entries whose port came back to life
  useEffect(() => {
    if (!portsData) return;
    const live = new Set(portsData.ports.map((p) => p.port));
    setKilledPorts((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const port of next.keys()) if (live.has(port)) { next.delete(port); changed = true; }
      return changed ? next : prev;
    });
  }, [portsData]);

  const handleKill = (pid: number, label: string) => {
    const p = ports.find((x) => x.pid === pid);
    kill(pid, label);
    if (p?.startCmd) setKilledPorts((prev) => new Map(prev).set(p.port, p));
  };

  const selHex = FROST_HEX[categoryFrost(selected?.category)] ?? FROST_HEX.blue;
  const selPortInfo = selected ? ports.find((p) => p.port === selected.port) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Waypoints}
        title="Ports & Map"
        subtitle={`portpal · ${portsData?.scanner ?? "scanner"} · ${ports.length} listeners`}
      />

      {/* ── PORT MAP (top) ── */}
      <GlassCard frost="violet" className="animate-fade-up overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-frost-violet/15 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-frost-violet shadow-[0_0_10px_rgba(167,139,250,0.9)]" />
            <div>
              <p className="font-mono text-[11px] font-bold tracking-[0.15em] text-white/80">PORT MAP</p>
              <p className="font-mono text-[9.5px] text-white/40">
                {graph.nodes.length} nodes · {graph.edges.length} links
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 font-mono text-[9px] tracking-wider text-frost-green sm:flex">
              <Bullet color="green" pulse /> LIVE SCAN
            </span>
            <button
              onClick={rescan}
              title="Rescan now"
              className="flex size-8 items-center justify-center rounded-lg border border-frost-violet/30 bg-black/40 text-frost-violet transition hover:border-frost-violet/60 active:scale-95"
            >
              <Radar className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <PortGraph graph={graph} selectedId={selected?.id ?? null} onSelect={setSelected} className="relative h-[52vh] min-h-[330px] w-full" />

          {/* legend */}
          <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 px-1">
            {([["cyan", "frontend"], ["blue", "backend"], ["violet", "database"], ["green", "zes / secure"], ["gray", "system"]] as const).map(([c, l]) => (
              <span key={l} className="flex items-center gap-1 font-mono text-[8.5px] text-white/40">
                <span className="size-1.5 rounded-full" style={{ background: FROST_HEX[c], boxShadow: `0 0 5px ${FROST_HEX[c]}` }} />
                {l}
              </span>
            ))}
          </div>
          <p className="pointer-events-none absolute bottom-2 right-2 font-mono text-[8.5px] tracking-wider text-white/30">
            DRAG · PINCH TO ZOOM · TAP NODE
          </p>

          {graph.nodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 backdrop-blur-[2px]">
              <div className="relative size-12">
                <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-frost-violet/40" />
              </div>
              <p className="text-[12px] text-white/50">No ports to map</p>
              <p className="font-mono text-[10px] text-white/30">start some servers and come back</p>
            </div>
          )}

          {/* inspector — bottom sheet on mobile */}
          {selected && (
            <div className="glass-strong absolute bottom-2 left-2 right-2 rounded-2xl border-frost-violet/40 p-3 sm:right-auto sm:w-72">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-lg font-bold leading-none" style={{ color: selHex }}>:{selected.port}</p>
                  <p className="mt-1 truncate text-[13px] font-medium text-white/90">
                    {selected.projectName ?? selected.processName}
                  </p>
                  {selected.framework && <FwBadge label={selected.framework} hex={selHex} className="mt-1.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  {portsData?.allowKill && selected.pid > 0 && (
                    <ActionBtn kind="kill" busy={killing.has(selected.pid)} title={`Kill PID ${selected.pid}`}
                      onClick={() => { handleKill(selected.pid, `:${selected.port}`); setSelected(null); }} />
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-black/40 font-mono text-[11px] text-white/50 active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-[10px]">
                <InspectorKV k="PID" v={selected.pid > 0 ? String(selected.pid) : "–"} />
                <InspectorKV k="Conns" v={String(selected.connectionCount)} />
                <InspectorKV k="Process" v={selected.processName.slice(0, 10)} />
              </div>
              {selPortInfo?.startCmd && (
                <p className="mono mt-2 truncate text-[9.5px] text-white/35">{selPortInfo.startCmd}</p>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── PORT LIST (3 tabs, below the map) ── */}
      <GlassCard className="animate-fade-up">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">Listening Ports</h2>
          <span className="font-mono text-[10px] text-white/30">{portsData?.scannedAt ? "live · 4s poll" : "…"}</span>
        </div>
        <PortList
          ports={ports}
          traffic={traffic}
          killedPorts={killedPorts}
          killing={killing}
          restarting={restarting}
          allowKill={portsData?.allowKill ?? false}
          onKill={handleKill}
          onRestart={restart}
          loading={loading}
        />
      </GlassCard>

      <ActionToast toast={toast} />
    </div>
  );
}

function InspectorKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-frost-violet/15 bg-black/30 px-2 py-1.5">
      <p className="text-[8px] uppercase tracking-wider text-white/35">{k}</p>
      <p className="truncate text-white/80">{v}</p>
    </div>
  );
}
