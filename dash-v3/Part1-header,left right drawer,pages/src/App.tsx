import { useState } from "react";
import { TopBar } from "./components/layout/TopBar";
import { LeftDrawer } from "./components/layout/LeftDrawer";
import { RightDrawer } from "./components/layout/RightDrawer";
import { ModuleGrid } from "./components/dashboard/ModuleGrid";
import { OrchestrationFlow } from "./components/dashboard/OrchestrationFlow";
import { EventStream } from "./components/dashboard/EventStream";
import { SystemHealthPanel } from "./components/dashboard/SystemHealthPanel";
import { ModuleDetailModal } from "./components/dashboard/ModuleDetailModal";
import { GlassCard } from "./components/ui/GlassCard";
import { Bullet } from "./components/ui/Bullet";
import { flowEdges } from "./data/modules";
import { useLiveModules } from "./hooks/useLiveModules";
import type { OrchestrationModule } from "./types";
import { Activity, ListChecks, Wifi } from "lucide-react";

export type Section = "overview" | "agents" | "flow" | "logs" | "health" | "settings";

const sectionTitle: Record<Section, string> = {
  overview: "Overview",
  agents: "Agents",
  flow: "Orchestration Flow",
  logs: "Event Stream",
  health: "System Health",
  settings: "Settings",
};

export default function App() {
  const { modules, logs } = useLiveModules();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [selectedModule, setSelectedModule] = useState<OrchestrationModule | null>(null);

  const erroredCount = modules.filter((m) => m.status === "error").length;
  const warningCount = modules.filter((m) => m.status === "warning").length;
  const runningCount = modules.filter((m) => m.status === "running" || m.status === "online").length;
  const totalTasks = modules.reduce((acc, m) => acc + m.tasks, 0);
  const systemsNominal = erroredCount === 0;

  const handleNavigate = (next: Section) => {
    setSection(next);
    setLeftOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <TopBar
        onOpenLeft={() => setLeftOpen(true)}
        onOpenRight={() => setRightOpen(true)}
        title="ZES Control Center"
        online={systemsNominal}
      />

      <LeftDrawer open={leftOpen} onClose={() => setLeftOpen(false)} active={section} onNavigate={handleNavigate} />
      <RightDrawer open={rightOpen} onClose={() => setRightOpen(false)} logs={logs} />
      <ModuleDetailModal module={selectedModule} onClose={() => setSelectedModule(null)} />

      <main className="mx-auto max-w-6xl px-3 pb-24 pt-4 sm:px-5 sm:pt-6">
        {/* Header summary strip */}
        <GlassCard className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              {sectionTitle[section]}
            </h1>
            <p className="mt-0.5 text-[12px] text-white/45">
              Agent orchestration · Termux node · 6 modules tracked
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
              <Bullet frost="green" pulse /> {runningCount} running
            </span>
            {warningCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-orange-500/10 px-2.5 py-1 text-[11px] text-orange-300">
                <Bullet frost="orange" pulse /> {warningCount} warning
              </span>
            )}
            {erroredCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300">
                <Bullet frost="red" pulse /> {erroredCount} error
              </span>
            )}
          </div>
        </GlassCard>

        {(section === "overview" || section === "agents") && (
          <section className="mb-6">
            <SectionHeading icon={ListChecks} label="Modules" hint={`${totalTasks} active tasks`} />
            <ModuleGrid modules={modules} onSelect={setSelectedModule} />
          </section>
        )}

        {(section === "overview" || section === "flow") && (
          <section className="mb-6">
            <SectionHeading icon={Wifi} label="Orchestration Flow" hint="Live request paths" />
            <OrchestrationFlow modules={modules} edges={flowEdges} />
          </section>
        )}

        {(section === "overview" || section === "health") && (
          <section className="mb-6">
            <SectionHeading icon={Activity} label="System Health" hint="OmniRoute gateway" />
            <SystemHealthPanel />
          </section>
        )}

        {(section === "overview" || section === "logs") && (
          <section className="mb-6">
            <SectionHeading icon={Activity} label="Event Stream" hint="Auto-refreshing" />
            <GlassCard>
              <EventStream logs={logs} />
            </GlassCard>
          </section>
        )}

        {section === "settings" && (
          <section className="mb-6">
            <SectionHeading icon={Activity} label="Gateway & Config" hint="Read-only preview" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {modules.map((m) => (
                <GlassCard key={m.id} className="text-[12px]">
                  <p className="font-semibold text-white">{m.name}</p>
                  <p className="mono mt-1 text-white/50">{m.configPath}</p>
                  <p className="mono mt-1 text-white/40">{m.endpoint}</p>
                </GlassCard>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/8 py-4 text-center text-[11px] text-white/30">
        ZES Orchestration Dashboard · built for Termux &amp; mobile control
      </footer>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  hint: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-white/50" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-white/70">{label}</h2>
      </div>
      <span className="text-[11px] text-white/35">{hint}</span>
    </div>
  );
}
