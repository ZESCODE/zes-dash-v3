import { Smartphone, RotateCw, Terminal, Wifi, FileCog, Activity } from "lucide-react";
import type { Agent, OmniMetrics } from "@/lib/types";
import { cn } from "@/utils/cn";
import { AGENT_ICON, FROST_HEX, frostText, stateColor, stateLabel, fmtUptime } from "@/lib/theme";
import { Bullet } from "./ui/Bullet";

export function LeftPanel({
  agents,
  omni,
  onToggle,
  onRestart,
  onSelect,
}: {
  agents: Agent[];
  omni: OmniMetrics;
  onToggle: (id: Agent["id"]) => void;
  onRestart: (id: Agent["id"]) => void;
  onSelect: (a: Agent) => void;
}) {
  return (
    <div className="space-y-5">
      {/* node identity */}
      <div className="glass-card frost-blue p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-frost-blue/30 bg-frost-blue/15 text-frost-blue">
            <Smartphone className="size-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold text-white">ZES OS · Termux Node</div>
            <div className="font-mono text-[10px] text-white/45">v5.0 · Dashboard & Archify</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
          <KV k="Node" v="phone-local" />
          <KV k="Uptime" v={fmtUptime(omni.uptimeSec)} />
          <KV k="Throughput" v={`${Math.round(omni.throughputRpm)} rpm`} />
          <KV k="Error rate" v={`${omni.errorRate.toFixed(1)}%`} />
        </div>
      </div>

      {/* agent roster */}
      <Section title="Agent Roster" hint={`${agents.filter((a) => a.enabled).length}/${agents.length} active`}>
        <div className="space-y-1.5">
          {agents.map((a) => {
            const color = stateColor(a.state);
            const Icon = AGENT_ICON[a.id];
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 p-2">
                <button onClick={() => onSelect(a)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <Icon className={cn("size-4 shrink-0", frostText(color))} />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] font-semibold text-white/85">{a.name}</div>
                    <div className="truncate text-[9px] text-white/35">{stateLabel(a.state)}</div>
                  </div>
                </button>
                <Bullet color={color} pulse={a.state === "running"} />
                <button
                  onClick={() => onRestart(a.id)}
                  title="Restart"
                  className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:scale-90"
                >
                  <RotateCw className="size-3" />
                </button>
                <Switch on={a.enabled} onClick={() => onToggle(a.id)} color={color} />
              </div>
            );
          })}
        </div>
      </Section>

      {/* endpoints */}
      <Section title="Endpoints" hint="tap to view">
        <div className="space-y-1.5 font-mono text-[10px]">
          <Cmd icon={Wifi} label="OmniRoute API" cmd="curl http://127.0.0.1:20128/" />
          <Cmd icon={Activity} label="MCP SSE stream" cmd=":20128/api/mcp/sse" />
          <Cmd icon={Terminal} label="A2A discovery" cmd=":20128/.well-known/agent.json" />
          <Cmd icon={FileCog} label="Health check" cmd="~/zes-scripts/health-check.sh" />
        </div>
      </Section>

      <div className="divider" />
      <p className="px-1 text-center font-mono text-[9px] leading-relaxed text-white/25">
        ZES Control Center · self-updating system map<br />Frost design system · #000000
      </p>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">{title}</h3>
        {hint && <span className="font-mono text-[9px] text-white/30">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
      <div className="text-[8px] uppercase tracking-wide text-white/35">{k}</div>
      <div className="text-white/75">{v}</div>
    </div>
  );
}

function Cmd({ icon: Icon, label, cmd }: { icon: typeof Wifi; label: string; cmd: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
      <Icon className="size-3 shrink-0 text-frost-blue/70" />
      <span className="shrink-0 text-white/45">{label}</span>
      <code className="ml-auto truncate text-white/65">{cmd}</code>
    </div>
  );
}

function Switch({ on, onClick, color }: { on: boolean; onClick: () => void; color: ReturnType<typeof stateColor> }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Enabled" : "Disabled"}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
        on ? "border-white/20 bg-white/15" : "border-white/10 bg-white/5",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-3.5 rounded-full transition-all",
          on ? "left-[18px]" : "left-0.5",
        )}
        style={{
          background: on ? (color === "gray" ? "rgba(255,255,255,0.7)" : FROST_HEX[color]) : "rgba(255,255,255,0.4)",
          boxShadow: on && color !== "gray" ? `0 0 8px ${FROST_HEX[color]}` : "none",
        }}
      />
    </button>
  );
}
