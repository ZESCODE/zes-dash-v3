import { useMemo, useState } from "react";
import { Boxes, Workflow, Layers3, Cpu } from "lucide-react";
import { useOrchestration } from "@/lib/useOrchestration";
import type { Agent } from "@/lib/types";
import { fmtTokens } from "@/lib/theme";
import { TopBar } from "@/components/TopBar";
import { StatusTiles } from "@/components/StatusTiles";
import { AgentCard } from "@/components/AgentCard";
import { OmniRouterPanel } from "@/components/OmniRouterPanel";
import { OrchestrationFlow } from "@/components/OrchestrationFlow";
import { EventStream } from "@/components/EventStream";
import { Drawer } from "@/components/Drawer";
import { LeftPanel } from "@/components/LeftPanel";
import { RightPanel } from "@/components/RightPanel";
import { AgentDetailModal } from "@/components/AgentDetailModal";

export default function App() {
  const { state, paused, toggleAgent, restartAgent, runTask, clearEvents, togglePause } = useOrchestration();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = state.agents.find((a) => a.id === selectedId) ?? null;
  const online = state.agents.filter((a) => a.enabled).length;
  const onSelect = (a: Agent) => setSelectedId(a.id);

  const restartAll = () => state.agents.forEach((a) => restartAgent(a.id));

  const hero = useMemo(() => {
    const load = Math.round(
      state.agents.filter((a) => a.enabled).reduce((s, a) => s + a.cpu, 0) / Math.max(1, state.agents.filter((a) => a.enabled).length),
    );
    const tokens = state.agents.reduce((s, a) => s + a.tokens, 0);
    const routed = state.agents.find((a) => a.id === "omnirouter")?.tasksCompleted ?? 0;
    const hitRate = state.omni.cache.hits / (state.omni.cache.hits + state.omni.cache.misses) * 100;
    return { load, tokens, routed, hitRate };
  }, [state]);

  return (
    <div className="relative min-h-screen">
      <TopBar onLeft={() => setLeftOpen(true)} onRight={() => setRightOpen(true)} online={online} total={state.agents.length} paused={paused} />

      <main className="relative z-10 mx-auto max-w-7xl space-y-5 px-3 pb-28 pt-4 sm:px-5">
        {/* hero */}
        <HeroBanner load={hero.load} tokens={hero.tokens} routed={hero.routed} hitRate={hero.hitRate} />

        {/* 4-frost status tiles */}
        <StatusTiles agents={state.agents} />

        {/* agents */}
        <section className="space-y-3">
          <SectionTitle icon={Boxes} title="Agent Services" subtitle={`${state.agents.length} modules`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.agents.map((a) => (
              <AgentCard key={a.id} agent={a} onSelect={onSelect} onToggle={toggleAgent} onRestart={restartAgent} onRun={runTask} />
            ))}
          </div>
        </section>

        {/* omni router + event stream */}
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OmniRouterPanel omni={state.omni} />
          </div>
          <EventStream events={state.events} paused={paused} onTogglePause={togglePause} onClear={clearEvents} className="lg:col-span-1" />
        </section>

        {/* orchestration flow */}
        <section className="space-y-3">
          <SectionTitle icon={Workflow} title="Orchestration Flow" subtitle="archify-inspired topology" />
          <OrchestrationFlow agents={state.agents} onSelect={onSelect} />
        </section>
      </main>

      {/* left drawer */}
      <Drawer side="left" open={leftOpen} onClose={() => setLeftOpen(false)} title="Control Panel" subtitle="nodes · routes · endpoints">
        <LeftPanel agents={state.agents} omni={state.omni} onToggle={toggleAgent} onRestart={restartAgent} onSelect={(a) => { onSelect(a); setLeftOpen(false); }} />
      </Drawer>

      {/* right drawer */}
      <Drawer side="right" open={rightOpen} onClose={() => setRightOpen(false)} title="Live Feed & Controls" subtitle="SSE · global actions">
        <RightPanel events={state.events} paused={paused} onTogglePause={togglePause} onClear={clearEvents} onRestartAll={restartAll} />
      </Drawer>

      {/* detail modal */}
      <AgentDetailModal agent={selected} onClose={() => setSelectedId(null)} onToggle={toggleAgent} onRestart={restartAgent} onRun={runTask} />
    </div>
  );
}

/* ---------------- inline helpers ---------------- */

function HeroBanner({ load, tokens, routed, hitRate }: { load: number; tokens: number; routed: number; hitRate: number }) {
  return (
    <div className="glass-card frost-blue relative overflow-hidden p-5 sm:p-6">
      {/* decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-frost-blue/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-frost-green/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-frost-blue/30 bg-frost-blue/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-frost-blue">
            <Layers3 className="size-3" /> Orchestration System
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
            Modular Control Panel
          </h2>
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-white/50 sm:text-[12px]">
            Hermes · Claude Code · Codex · OpenCode · Antigravity · OmniRouter
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px]">
            <HeroStat label="Routed" value={routed.toLocaleString()} color="text-frost-blue" />
            <HeroStat label="Tokens" value={fmtTokens(tokens)} color="text-frost-green" />
            <HeroStat label="Cache hit" value={`${hitRate.toFixed(0)}%`} color="text-frost-green" />
            <HeroStat label="Load" value={`${load}%`} color={load > 70 ? "text-frost-orange" : "text-frost-blue"} />
          </div>
        </div>

        {/* load ring */}
        <div className="flex shrink-0 items-center justify-center">
          <LoadRing load={load} />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col">
      <span className={`font-display text-base font-bold ${color}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-white/35">{label}</span>
    </div>
  );
}

function LoadRing({ load }: { load: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c - (load / 100) * c;
  const color = load > 70 ? "rgb(251,146,60)" : "rgb(64,156,255)";
  return (
    <div className="relative size-28">
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease", filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Cpu className="size-4 text-white/40" />
        <span className="mt-1 font-display text-xl font-bold text-white">{load}%</span>
        <span className="font-mono text-[8px] uppercase tracking-wide text-white/35">avg load</span>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Boxes; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-frost-blue">
        <Icon className="size-4" />
      </div>
      <h2 className="font-display text-base font-semibold text-white">{title}</h2>
      <span className="font-mono text-[10px] text-white/35">{subtitle}</span>
      <div className="divider ml-1 flex-1" />
    </div>
  );
}
