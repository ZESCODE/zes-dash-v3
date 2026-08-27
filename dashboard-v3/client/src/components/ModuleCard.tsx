import { ChevronRight, Brain, Cpu, Zap, GitBranch, Boxes, Network, Bot, TerminalSquare, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import type { FleetAgent } from "@/lib/types";
import { statusColor, frostBg, frostText, frostCard, fmtMs } from "@/lib/theme";
import { Bullet } from "@/components/ui/Bullet";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const AGENT_ICON: Record<string, LucideIcon> = {
  claude: Brain,
  "claude-code": Brain,
  codex: Cpu,
  hermes: Zap,
  opencode: GitBranch,
  antigravity: Boxes,
  agy: Boxes,
  omnirouter: Network,
  zeso: TerminalSquare,
  pollinations: Bot,
  sh: TerminalSquare,
};

export function agentIcon(id: string): LucideIcon {
  return AGENT_ICON[id] ?? Bot;
}

const statusLabel: Record<string, string> = {
  idle: "Idle",
  running: "Running",
  warning: "Warning",
  error: "Error",
  offline: "Offline",
};

/** Agent/module frost card — merged Part1 ModuleCard + Part2 AgentCard. */
export function ModuleCard({ agent, onSelect }: { agent: FleetAgent; onSelect?: (a: FleetAgent) => void }) {
  const c = statusColor(agent.status);
  const Icon = agentIcon(agent.id);
  const done = agent.taskCounts.completed;
  const total = Math.max(1, agent.taskCounts.total);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(agent)}
      className={cn(
        "group glass-card relative w-full rounded-2xl p-4 text-left transition-all duration-300 active:scale-[0.98]",
        frostCard(c),
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex size-10 items-center justify-center rounded-xl", frostBg(c))}>
          <Icon className={cn("size-5", frostText(c))} strokeWidth={1.8} />
        </div>
        <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide", frostBg(c), frostText(c))}>
          <Bullet color={c} pulse={agent.status === "running"} />
          {statusLabel[agent.status] ?? agent.status}
        </span>
      </div>

      <div className="mt-3.5">
        <h3 className="text-sm font-semibold text-white">{agent.name ?? agent.id}</h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-white/50">{agent.role ?? agent.description ?? agent.kind ?? "agent"}</p>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-white/60">
        <div className="flex gap-3 font-mono">
          <span><span className="text-white/85">{agent.taskCounts.total}</span> tasks</span>
          <span><span className="text-white/85">{agent.runningTasks}</span> running</span>
          <span><span className="text-white/85">{fmtMs(agent.latencyMs)}</span></span>
        </div>
        <ChevronRight className="size-3.5 text-white/30 transition-transform group-hover:translate-x-0.5" />
      </div>

      <ProgressBar value={(done / total) * 100} color={c} className="mt-3 h-1" />
    </button>
  );
}
