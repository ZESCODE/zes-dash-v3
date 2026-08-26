import { cn } from "../../utils/cn";
import type { OrchestrationModule, FlowEdge } from "../../types";
import { frostBg, frostText, frostBorder } from "../../utils/status";
import { Bullet } from "../ui/Bullet";

interface OrchestrationFlowProps {
  modules: OrchestrationModule[];
  edges: FlowEdge[];
}

const positions: Record<string, { x: number; y: number }> = {
  "claude-code": { x: 12, y: 20 },
  codex: { x: 34, y: 8 },
  hermes: { x: 66, y: 8 },
  opencode: { x: 88, y: 20 },
  antigravity: { x: 50, y: 32 },
  omnirouter: { x: 50, y: 86 },
};

export function OrchestrationFlow({ modules, edges }: OrchestrationFlowProps) {
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  const edgeColor: Record<string, string> = {
    blue: "rgba(56,189,248,0.55)",
    green: "rgba(52,211,153,0.55)",
    orange: "rgba(251,146,60,0.55)",
    red: "rgba(248,113,113,0.55)",
  };

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-xl border border-white/8 bg-black/40 sm:h-96">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {edges.map((edge, i) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          const target = moduleMap.get(edge.to);
          if (!from || !to) return null;
          const color = edgeColor[target?.frost ?? "blue"];
          return (
            <line
              key={`${edge.from}-${edge.to}-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={0.4}
              className="flow-line"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {modules
        .filter((m) => positions[m.id])
        .map((module) => {
          const pos = positions[module.id];
          const Icon = module.icon;
          const isHub = module.id === "omnirouter";
          return (
            <div
              key={module.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border backdrop-blur-md transition-transform",
                  frostBg[module.frost],
                  frostBorder[module.frost],
                  isHub ? "size-14" : "size-10",
                )}
              >
                <Icon className={cn(isHub ? "size-6" : "size-4.5", frostText[module.frost])} strokeWidth={1.7} />
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5">
                <Bullet frost={module.frost} pulse={module.status === "running" || module.status === "online"} />
                <span className="text-[9.5px] font-medium text-white/80">{module.name}</span>
              </div>
            </div>
          );
        })}
    </div>
  );
}
