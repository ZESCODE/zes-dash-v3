import { Network } from "lucide-react";
import type { Agent } from "@/lib/types";
import { cn } from "@/utils/cn";
import { AGENT_ICON, FROST_HEX, stateColor, stateLabel } from "@/lib/theme";
import { Bullet } from "./ui/Bullet";

type Pos = { x: number; y: number };

const ROUTER: Pos = { x: 50, y: 50 };
const POS: Record<string, Pos> = {
  claude: { x: 50, y: 14 },
  codex: { x: 87, y: 33 },
  antigravity: { x: 80, y: 86 },
  opencode: { x: 20, y: 86 },
  hermes: { x: 13, y: 33 },
};

export function OrchestrationFlow({ agents, onSelect }: { agents: Agent[]; onSelect: (a: Agent) => void }) {
  const router = agents.find((a) => a.id === "omnirouter");
  const peers = agents.filter((a) => a.id !== "omnirouter");

  return (
    <div className="glass-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-white">Orchestration Flow</h3>
          <p className="font-mono text-[11px] text-white/40">Live request paths · agents ↔ OmniRouter</p>
        </div>
        <span className="font-mono text-[10px] text-white/40">{peers.filter((p) => p.enabled).length}/{peers.length} linked</span>
      </div>

      <div className="relative mt-3 aspect-[16/11] w-full">
        {/* connection layer */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {peers.map((a) => {
            const p = POS[a.id];
            const color = stateColor(a.state);
            const hex = color === "gray" ? "rgba(255,255,255,0.25)" : FROST_HEX[color];
            const active = a.enabled && color !== "gray";
            return (
              <g key={a.id}>
                <line x1={ROUTER.x} y1={ROUTER.y} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
                {active && (
                  <line
                    x1={ROUTER.x}
                    y1={ROUTER.y}
                    x2={p.x}
                    y2={p.y}
                    stroke={hex}
                    strokeWidth={1.2}
                    strokeOpacity={0.75}
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ animation: "flowDash 3s linear infinite" }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* router node */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${ROUTER.x}%`, top: `${ROUTER.y}%` }}>
          <div className="relative">
            <div className="absolute inset-0 animate-glow rounded-2xl bg-frost-blue/30 blur-xl" />
            <div className="relative flex flex-col items-center gap-1 rounded-2xl border border-frost-blue/40 bg-black/70 px-3 py-2 backdrop-blur-md">
              <Network className="size-5 text-frost-blue" />
              <span className="font-mono text-[9px] font-semibold text-frost-blue">OMNIROUTE</span>
              <span className="inline-flex items-center gap-1 font-mono text-[8px] text-white/50">
                <Bullet color="green" pulse /> :20128
              </span>
            </div>
          </div>
        </div>

        {/* agent nodes */}
        {peers.map((a) => {
          const p = POS[a.id];
          const color = stateColor(a.state);
          const Icon = AGENT_ICON[a.id];
          const hex = color === "gray" ? "rgba(255,255,255,0.4)" : FROST_HEX[color];
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border bg-black/70 px-2 py-1.5 backdrop-blur-md transition-all group-hover:-translate-y-0.5 group-hover:bg-black/90",
                )}
                style={{ borderColor: `rgba(255,255,255,0.12)`, boxShadow: `0 0 18px -6px ${hex}` }}
              >
                <Icon className="size-3.5" style={{ color: hex }} />
                <span className="font-mono text-[8px] font-semibold uppercase tracking-wide" style={{ color: hex }}>
                  {a.short}
                </span>
                <span className="mt-0.5">
                  <Bullet color={color} pulse={a.state === "running"} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/5 pt-3 font-mono text-[10px] text-white/40">
        {peers.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1.5">
            <Bullet color={stateColor(a.state)} />
            {a.name.split(" ")[0]}
            <span className="text-white/25">· {stateLabel(a.state)}</span>
          </span>
        ))}
        {router && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-white/30">{router.tasksCompleted.toLocaleString()} requests routed</span>
        )}
      </div>
    </div>
  );
}
