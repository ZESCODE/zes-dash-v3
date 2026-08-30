import { useMemo, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import { cn } from "@/utils/cn";
import { Sparkline } from "@/components/ui/Sparkline";
import type { PortInfo, TrafficSample } from "@/lib/portpal";
import { portHex, serviceLabel, statusFor, timeAgoMs } from "@/lib/portpal";
import { ActionBtn, EmptyState, FwBadge, StatusBadge } from "@/components/portpal/PortBits";

export type PortFilter = "all" | "dev" | "other";

/* ============================================================
   PortList — PortPal's ports page (3 tabs: All / Dev / Other),
   search, one-tap kill, restart, kill-all panic button.
   Mobile: card rows. ≥md: full table.
   ============================================================ */

export function PortList({
  ports,
  traffic,
  killedPorts,
  killing,
  restarting,
  allowKill,
  onKill,
  onRestart,
  loading,
}: {
  ports: PortInfo[];
  traffic: Record<string, TrafficSample[]>;
  killedPorts: Map<number, PortInfo>;
  killing: Set<number>;
  restarting: Set<number>;
  allowKill: boolean;
  onKill: (pid: number, label: string) => void;
  onRestart: (pid: number, label: string) => void;
  loading: boolean;
}) {
  const [filter, setFilter] = useState<PortFilter>("all");
  const [search, setSearch] = useState("");
  const [killAllArmed, setKillAllArmed] = useState(false);

  const counts = useMemo(
    () => ({
      all: ports.length,
      dev: ports.filter((p) => p.isDev).length,
      other: ports.filter((p) => !p.isDev).length,
    }),
    [ports],
  );

  const filtered = useMemo(() => {
    let list = ports;
    if (filter === "dev") list = list.filter((p) => p.isDev);
    else if (filter === "other") list = list.filter((p) => !p.isDev);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        String(p.port).includes(q) ||
        p.processName.toLowerCase().includes(q) ||
        (p.projectName ?? "").toLowerCase().includes(q) ||
        (p.framework?.label ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [ports, filter, search]);

  const killAll = () => {
    if (!killAllArmed) {
      setKillAllArmed(true);
      setTimeout(() => setKillAllArmed(false), 3000);
      return;
    }
    setKillAllArmed(false);
    for (const p of filtered) {
      if (p.pid > 0) onKill(p.pid, `:${p.port} ${serviceLabel(p)}`);
    }
  };

  return (
    <div>
      {/* search + tabs — sticky on mobile */}
      <div className="sticky top-[61px] z-20 -mx-1 bg-black/40 px-1 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search port, process, project…"
              className="h-10 w-full rounded-xl border border-frost-blue/15 bg-black/40 pl-9 pr-3 text-[12px] text-white placeholder:text-white/25 focus:border-frost-blue/45 focus:outline-none"
            />
          </div>
          {allowKill && (
            <button
              onClick={killAll}
              disabled={filtered.length === 0}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 font-mono text-[11px] font-bold transition active:scale-95",
                killAllArmed
                  ? "border-frost-red/70 bg-frost-red/25 text-frost-red"
                  : "border-frost-red/30 bg-frost-red/10 text-frost-red/90 hover:bg-frost-red/20",
                filtered.length === 0 && "opacity-40",
              )}
            >
              <ShieldAlert className="size-3.5" />
              {killAllArmed ? "SURE?" : `KILL ALL ${filtered.length}`}
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <Tab label="All" n={counts.all} active={filter === "all"} onClick={() => setFilter("all")} frost="blue" />
          <Tab label="Dev" n={counts.dev} active={filter === "dev"} onClick={() => setFilter("dev")} frost="cyan" />
          <Tab label="Other" n={counts.other} active={filter === "other"} onClick={() => setFilter("other")} frost="orange" />
        </div>
      </div>

      {/* summary line */}
      <p className="px-1 pb-2 pt-1 font-mono text-[10px] text-white/35">
        {filtered.length} listener{filtered.length !== 1 ? "s" : ""} ·{" "}
        {filtered.filter((p) => p.isDev).length} dev port{filtered.filter((p) => p.isDev).length !== 1 ? "s" : ""} ·{" "}
        {filtered.reduce((s, p) => s + p.connections, 0)} connection{filtered.reduce((s, p) => s + p.connections, 0) !== 1 ? "s" : ""}
      </p>

      {loading && ports.length === 0 ? (
        <EmptyState title="Scanning ports…" sub="reading /proc/net/tcp" />
      ) : filtered.length === 0 && killedPorts.size === 0 ? (
        <EmptyState title="No ports in use" sub="start a server and it'll appear here" />
      ) : (
        <>
          {/* ── mobile cards (<md) ── */}
          <div className="space-y-2 md:hidden">
            {filtered.map((p) => (
              <PortCard
                key={`${p.pid}-${p.port}`}
                port={p}
                traffic={traffic}
                killing={killing.has(p.pid)}
                restarting={restarting.has(p.pid)}
                allowKill={allowKill}
                onKill={onKill}
                onRestart={onRestart}
              />
            ))}
            {[...killedPorts.values()].map((p) => (
              <DeadCard key={`dead-${p.port}`} port={p} restarting={restarting.has(p.pid)} onRestart={onRestart} />
            ))}
          </div>

          {/* ── table (≥md) ── */}
          <div className="hidden overflow-x-auto rounded-xl border border-frost-blue/10 bg-black/20 md:block scroll-area">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-frost-blue/10 font-mono text-[9px] uppercase tracking-wider text-white/35">
                  <th className="px-3 py-2.5">Port</th>
                  <th className="px-3 py-2.5">Service</th>
                  <th className="px-3 py-2.5">Process</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Framework</th>
                  <th className="px-3 py-2.5">Traffic</th>
                  <th className="px-3 py-2.5">Up</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const hex = portHex(p);
                  const st = statusFor(p);
                  const samples = traffic[String(p.port)] ?? [];
                  const series = samples.map((s) => s.connections);
                  const canRestart = !!p.startCmd;
                  return (
                    <tr key={`${p.pid}-${p.port}`} className="border-b border-frost-blue/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2 font-mono text-[13px] font-bold" style={{ color: hex }}>
                          <span className="size-1.5 rounded-full" style={{ background: hex, boxShadow: `0 0 6px ${hex}` }} />
                          {p.port}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-[12px] text-white/85">{serviceLabel(p)}</td>
                      <td className="max-w-[180px] truncate px-3 py-2.5">
                        <code className="font-mono text-[10px] text-white/45">
                          {p.startCmd ? p.startCmd.split(" ").slice(0, 2).join(" ") : p.processName}
                        </code>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge label={st.label} frost={st.frost} /></td>
                      <td className="px-3 py-2.5">
                        {p.framework ? <FwBadge label={p.framework.label} hex={hex} /> : (
                          <span className="font-mono text-[9px] text-white/30">{p.protocol}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-12 font-mono text-[10px] text-white/60">{p.connections} conn</span>
                          <div className="w-20">{series.length > 1 && <Sparkline data={series} color={hex} height={22} />}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-white/40">
                        {p.firstSeen ? timeAgoMs(p.firstSeen) : "–"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {canRestart && (
                            <ActionBtn kind="restart" busy={restarting.has(p.pid)} disabled={killing.has(p.pid) || !allowKill}
                              title={`Restart: ${p.startCmd}`} onClick={() => onRestart(p.pid, `:${p.port} ${serviceLabel(p)}`)} />
                          )}
                          <ActionBtn kind="kill" busy={killing.has(p.pid)} disabled={restarting.has(p.pid) || !allowKill}
                            title={`Kill PID ${p.pid}`} onClick={() => onKill(p.pid, `:${p.port} ${serviceLabel(p)}`)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {[...killedPorts.values()].map((p) => (
                  <tr key={`dead-${p.port}`} className="border-b border-frost-blue/5 last:border-0 opacity-60">
                    <td className="px-3 py-2.5 font-mono text-[13px] font-bold text-frost-red">{p.port}</td>
                    <td className="px-3 py-2.5 text-[12px] text-white/60">{serviceLabel(p)}</td>
                    <td className="px-3 py-2.5"><code className="font-mono text-[10px] text-white/35">{p.processName}</code></td>
                    <td className="px-3 py-2.5"><StatusBadge label="STOPPED" frost="red" /></td>
                    <td className="px-3 py-2.5">
                      {p.framework ? <FwBadge label={p.framework.label} hex={portHex(p)} /> : <span className="font-mono text-[9px] text-white/30">{p.protocol}</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-white/30">–</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-white/30">–</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end">
                        <ActionBtn kind="restart" busy={restarting.has(p.pid)} title={`Restart: ${p.startCmd}`}
                          onClick={() => onRestart(p.pid, `:${p.port} ${serviceLabel(p)}`)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Tab({ label, n, active, onClick, frost }: { label: string; n: number; active: boolean; onClick: () => void; frost: "blue" | "cyan" | "orange" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border font-mono text-[11px] font-bold transition active:scale-[0.98]",
        active && frost === "blue" && "border-frost-blue/50 bg-frost-blue/15 text-frost-blue",
        active && frost === "cyan" && "border-frost-cyan/50 bg-frost-cyan/15 text-frost-cyan",
        active && frost === "orange" && "border-frost-orange/50 bg-frost-orange/15 text-frost-orange",
        !active && "border-white/8 bg-black/30 text-white/45 hover:bg-white/5",
      )}
    >
      {label}
      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px]", active ? "bg-black/30" : "bg-white/8")}>{n}</span>
    </button>
  );
}

function PortCard({
  port: p,
  traffic,
  killing,
  restarting,
  allowKill,
  onKill,
  onRestart,
}: {
  port: PortInfo;
  traffic: Record<string, TrafficSample[]>;
  killing: boolean;
  restarting: boolean;
  allowKill: boolean;
  onKill: (pid: number, label: string) => void;
  onRestart: (pid: number, label: string) => void;
}) {
  const hex = portHex(p);
  const st = statusFor(p);
  const series = (traffic[String(p.port)] ?? []).map((s) => s.connections);
  const label = `:${p.port} ${serviceLabel(p)}`;

  return (
    <div className={cn("rounded-2xl border border-frost-blue/10 bg-black/30 p-3 transition", (killing || restarting) && "opacity-50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[16px] font-bold leading-none" style={{ color: hex }}>{p.port}</span>
            <StatusBadge label={st.label} frost={st.frost} />
          </div>
          <p className="mt-1.5 truncate text-[13px] font-medium text-white/85">{serviceLabel(p)}</p>
          <p className="mono truncate text-[10px] text-white/40">
            {p.processName} · PID {p.pid > 0 ? p.pid : "–"}
            {p.firstSeen ? ` · up ${timeAgoMs(p.firstSeen)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {p.startCmd && (
            <ActionBtn kind="restart" busy={restarting} disabled={killing || !allowKill} title={`Restart: ${p.startCmd}`} onClick={() => onRestart(p.pid, label)} />
          )}
          <ActionBtn kind="kill" busy={killing} disabled={restarting || !allowKill} title={`Kill PID ${p.pid}`} onClick={() => onKill(p.pid, label)} />
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <div className="min-w-0 flex-1">{series.length > 1 && <Sparkline data={series} color={hex} height={26} />}</div>
        <span className="shrink-0 font-mono text-[10px] text-white/50">{p.connections} conn</span>
        {p.framework && <FwBadge label={p.framework.label} hex={hex} className="shrink-0" />}
      </div>
    </div>
  );
}

function DeadCard({ port: p, restarting, onRestart }: { port: PortInfo; restarting: boolean; onRestart: (pid: number, label: string) => void }) {
  return (
    <div className="rounded-2xl border border-frost-red/20 bg-frost-red/[0.04] p-3 opacity-70">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[16px] font-bold leading-none text-frost-red">{p.port}</span>
            <StatusBadge label="STOPPED" frost="red" />
          </div>
          <p className="mt-1.5 truncate text-[13px] font-medium text-white/60">{serviceLabel(p)}</p>
          <p className="mono truncate text-[10px] text-white/35">{p.startCmd}</p>
        </div>
        {p.startCmd && (
          <ActionBtn kind="restart" busy={restarting} title={`Restart: ${p.startCmd}`} onClick={() => onRestart(p.pid, `:${p.port} ${serviceLabel(p)}`)} />
        )}
      </div>
    </div>
  );
}
