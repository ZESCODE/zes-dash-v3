import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Radio,
  HeartPulse,
  BrainCircuit,
  Building2,
  ListTodo,
  Activity,
  Server,
  Waypoints,
  TrendingUp,
  Boxes,
  Settings,
  X,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Bullet } from "@/components/ui/Bullet";

export const NAV_ITEMS: { to: string; label: string; icon: LucideIcon; hint: string }[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, hint: "Mesh at a glance" },
  { to: "/agents", label: "Agents", icon: Users, hint: "Roster · tasks · latency" },
  { to: "/flow", label: "Orchestration Flow", icon: GitBranch, hint: "Control → execution → route" },
  { to: "/events", label: "Event Stream", icon: Radio, hint: "Live bus timeline" },
  { to: "/health", label: "System Health", icon: HeartPulse, hint: "Gateway · runtime" },
  { to: "/memory", label: "Memory", icon: BrainCircuit, hint: "Shared memory banks" },
  { to: "/fleet", label: "Fleet / Org", icon: Building2, hint: "Organization roster" },
  { to: "/tasks", label: "Tasks Kanban", icon: ListTodo, hint: "Queue · running · done" },
  { to: "/activity", label: "Activity", icon: Activity, hint: "Recent bus activity" },
  { to: "/infra", label: "Infrastructure", icon: Server, hint: "Node + gateway stats" },
  { to: "/ports", label: "Ports & Map", icon: Waypoints, hint: "PortPal · map + kill" },
  { to: "/traffic", label: "Traffic", icon: TrendingUp, hint: "Port connections" },
  { to: "/services", label: "Services", icon: Boxes, hint: "Grouped by project" },
  { to: "/settings", label: "Settings", icon: Settings, hint: "Endpoints & config" },
];

const NAV_GROUPS = [
  { label: "WORKSPACE", items: NAV_ITEMS.slice(0, 4) },
  { label: "OPERATIONS", items: NAV_ITEMS.slice(4, 9) },
  { label: "INFRASTRUCTURE", items: NAV_ITEMS.slice(9) },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-frost-blue/25 bg-frost-blue/10">
        <Workflow className="size-4.5 text-frost-blue" strokeWidth={1.8} />
        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-black bg-frost-blue shadow-[0_0_10px_rgba(64,156,255,0.8)]" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-[13px] font-bold leading-none text-white">ZES <span className="text-frost-blue">MESH</span></p>
        {!compact && <p className="mono mt-1 text-[9px] uppercase tracking-[0.16em] text-white/35">Control plane · v3</p>}
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary navigation" className="scroll-area min-h-0 flex-1 overflow-y-auto px-3 py-3">
      {NAV_GROUPS.map((group) => (
        <section key={group.label} className="mb-4 last:mb-0">
          <h2 className="px-3 pb-2 pt-1 font-mono text-[9px] font-semibold tracking-[0.18em] text-white/25">
            {group.label}
          </h2>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isFlow = item.to === "/flow";
              const isEvents = item.to === "/events";
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                      isActive
                        ? "border-frost-blue/25 bg-frost-blue/[0.11] text-white shadow-[inset_0_1px_0_rgba(64,156,255,0.08)]"
                        : "border-transparent text-white/60 hover:border-white/5 hover:bg-white/[0.045] hover:text-white/90",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-frost-blue shadow-[0_0_9px_rgba(64,156,255,0.8)]" />}
                      <Icon className={cn("size-[18px] shrink-0 transition-colors", isActive ? "text-frost-blue" : "text-white/40 group-hover:text-white/70")} strokeWidth={1.8} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[9px] text-white/30">{item.hint}</span>
                      </span>
                      {isFlow && <span className="rounded-md border border-frost-violet/20 bg-frost-violet/10 px-1.5 py-0.5 font-mono text-[8px] text-frost-violet/90">MESH</span>}
                      {isEvents && <span className="rounded-md border border-frost-cyan/15 bg-frost-cyan/[0.04] px-1.5 py-0.5 font-mono text-[8px] text-frost-cyan/70">BUS</span>}
                      {isActive && !isFlow && !isEvents && <Bullet color="blue" className="size-1.5" />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="shrink-0 border-t border-frost-blue/10 p-3">
      <div className="glass-card rounded-xl border border-frost-blue/15 bg-frost-blue/[0.035] p-3 shadow-none">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold text-white/70">Local runtime</p>
          <span className="rounded-md border border-frost-cyan/15 bg-frost-cyan/[0.04] px-1.5 py-1 font-mono text-[7px] uppercase tracking-wide text-frost-cyan/70">
            Termux node
          </span>
        </div>
        <p className="mono mt-2 text-[9px] text-white/35">OmniRoute <span className="text-white/20">·</span> :20128</p>
        <p className="mt-1 text-[9px] leading-relaxed text-white/25">Compact controls · low-bandwidth friendly</p>
      </div>
    </div>
  );
}

/** Persistent navigation on desktop; a touch-sized slide-in drawer on mobile. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/65 backdrop-blur-sm animate-fade-in md:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        id="primary-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-frost-blue/15 bg-[#080b10]/95 pt-[env(safe-area-inset-top)] shadow-[20px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "pointer-events-none -translate-x-full",
        )}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-frost-blue/10 px-4">
          <BrandMark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex size-11 items-center justify-center rounded-xl border border-white/5 text-white/55 transition hover:bg-white/5 active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>
        <NavList onNavigate={onClose} />
        <SidebarFooter />
      </aside>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-frost-blue/10 bg-black/45 pt-14 backdrop-blur-xl md:flex">
        <div className="flex min-h-[76px] shrink-0 items-center border-b border-frost-blue/8 px-4">
          <BrandMark />
          <span className="ml-auto rounded-md border border-white/5 px-1.5 py-1 font-mono text-[8px] text-white/25">LOCAL</span>
        </div>
        <NavList />
        <SidebarFooter />
      </aside>
    </>
  );
}
