import { useState } from "react";
import { Users, X } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { FleetAgent } from "@/lib/types";
import { statusColor, frostText, frostBg, fmtMs, timeAgo } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { ModuleCard, agentIcon } from "@/components/ModuleCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { Empty } from "@/routes/Overview";

export default function Agents() {
  const { data } = useFetch<{ agents?: FleetAgent[]; error?: string }>("/api/agents", 5000);
  const [selected, setSelected] = useState<FleetAgent | null>(null);
  const agents = data?.agents ?? [];

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Agents" subtitle="detailed list · status · tasks · latency" live={!data?.error} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 animate-fade-up">
        {agents.map((a) => (
          <ModuleCard key={a.id} agent={a} onSelect={setSelected} />
        ))}
        {agents.length === 0 && <Empty msg="roster.json unreachable" />}
      </div>

      {/* detail table */}
      {agents.length > 0 && (
        <GlassCard className="overflow-x-auto p-0 animate-fade-up">
          <table className="w-full min-w-[560px] text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-frost-blue/8 text-[9px] uppercase tracking-[0.12em] text-white/40">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Running</th>
                <th className="px-4 py-3">Done</th>
                <th className="px-4 py-3">Failed</th>
                <th className="px-4 py-3">Avg latency</th>
                <th className="px-4 py-3">Last task</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const c = statusColor(a.status);
                return (
                  <tr key={a.id} className="cursor-pointer border-b border-frost-blue/5 transition-colors hover:bg-white/[0.03]" onClick={() => setSelected(a)}>
                    <td className="px-4 py-2.5 font-semibold text-white/85">{a.name ?? a.id}</td>
                    <td className={cn("px-4 py-2.5", frostText(c))}>
                      <span className="flex items-center gap-1.5">
                        <Bullet color={c} pulse={a.status === "running"} /> {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-white/60">{a.taskCounts.pending}</td>
                    <td className="px-4 py-2.5 text-white/60">{a.taskCounts.running}</td>
                    <td className="px-4 py-2.5 text-frost-green/80">{a.taskCounts.completed}</td>
                    <td className="px-4 py-2.5 text-frost-red/80">{a.taskCounts.failed}</td>
                    <td className="px-4 py-2.5 text-white/60">{fmtMs(a.latencyMs)}</td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-white/40">{a.lastTask?.title ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* detail modal */}
      {selected && <AgentModal agent={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AgentModal({ agent, onClose }: { agent: FleetAgent; onClose: () => void }) {
  const c = statusColor(agent.status);
  const Icon = agentIcon(agent.id);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in sm:items-center" onClick={onClose}>
      <div
        className={cn("glass-card m-3 w-full max-w-md rounded-2xl p-5", `frost-${c === "gray" ? "blue" : c}`)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex size-11 items-center justify-center rounded-xl", frostBg(c))}>
              <Icon className={cn("size-5.5", frostText(c))} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">{agent.name ?? agent.id}</h3>
              <p className="font-mono text-[10px] text-white/45">{agent.role ?? agent.kind ?? "agent"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px]">
          <KV k="Status" v={agent.status} />
          <KV k="Online" v={agent.online ? "yes" : "no"} />
          <KV k="Tasks total" v={String(agent.taskCounts.total)} />
          <KV k="Running" v={String(agent.taskCounts.running)} />
          <KV k="Completed" v={String(agent.taskCounts.completed)} />
          <KV k="Failed" v={String(agent.taskCounts.failed)} />
          <KV k="Avg latency" v={fmtMs(agent.latencyMs)} />
          <KV k="Model" v={agent.model ?? "–"} />
        </div>

        {agent.lastTask && (
          <div className="mt-3 rounded-xl border border-frost-blue/8 bg-black/30 p-3">
            <p className="font-mono text-[9px] uppercase tracking-wide text-white/35">Last task · {timeAgo(agent.lastTask.created_at)}</p>
            <p className="mt-1 text-[12px] font-medium text-white/85">{agent.lastTask.title}</p>
            {agent.lastTask.result_tail && (
              <p className="mono mt-1.5 line-clamp-3 text-[10px] leading-relaxed text-white/45">{agent.lastTask.result_tail}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-frost-blue/5 bg-black/20 px-2.5 py-2">
      <div className="text-[8px] uppercase tracking-wide text-white/35">{k}</div>
      <div className="mt-0.5 truncate text-white/80">{v}</div>
    </div>
  );
}
