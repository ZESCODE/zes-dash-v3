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
  Hexagon,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Bullet } from "@/components/ui/Bullet";

export const NAV_ITEMS: { to: string; label: string; icon: LucideIcon; hint: string }[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, hint: "System summary" },
  { to: "/agents", label: "Agents", icon: Users, hint: "Status · tasks · latency" },
  { to: "/flow", label: "Orchestration Flow", icon: GitBranch, hint: "Request paths" },
  { to: "/events", label: "Event Stream", icon: Radio, hint: "Live bus feed" },
  { to: "/health", label: "System Health", icon: HeartPulse, hint: "Gateway metrics" },
  { to: "/memory", label: "Memory", icon: BrainCircuit, hint: "Holographic banks" },
  { to: "/fleet", label: "Fleet / Org", icon: Building2, hint: "Organization roster" },
  { to: "/tasks", label: "Tasks Kanban", icon: ListTodo, hint: "4-column board" },
  { to: "/activity", label: "Activity", icon: Activity, hint: "Bus tail · 5s poll" },
  { to: "/infra", label: "Infrastructure", icon: Server, hint: "Raw gateway stats" },
  { to: "/ports", label: "Ports & Map", icon: Waypoints, hint: "PortPal · map + kill" },
  { to: "/traffic", label: "Traffic", icon: TrendingUp, hint: "Port connections" },
  { to: "/services", label: "Services", icon: Boxes, hint: "Grouped by project" },
  { to: "/settings", label: "Settings", icon: Settings, hint: "Endpoints & config" },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scroll-area">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                isActive
                  ? "border border-frost-blue/30 bg-frost-blue/10 text-white"
                  : "border border-transparent text-white/65 hover:bg-white/5",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("size-4.5", isActive ? "text-frost-blue" : "text-white/50")} strokeWidth={1.8} />
                <span className="flex-1">
                  <span className="block text-[13px] font-medium">{item.label}</span>
                  <span className="block text-[10px] text-white/35">{item.hint}</span>
                </span>
                {isActive && <Bullet color="blue" pulse />}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-frost-blue/8 p-4">
      <div className="glass-card frost-blue rounded-xl p-3">
        <p className="text-[11px] font-medium text-white/70">OmniRoute Gateway</p>
        <p className="mono mt-1 text-[10px] text-frost-green/90">127.0.0.1:20128/v1</p>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="mt-2 inline-flex items-center gap-1 text-[10px] text-frost-blue/80"
        >
          View gateway docs <ExternalLink className="size-2.5" />
        </a>
      </div>
    </div>
  );
}

/** Persistent 240px sidebar on ≥768px; slide-in drawer below. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in md:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-[300px] flex-col border-r border-frost-blue/10 bg-black/90 backdrop-blur-2xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0 animate-slide-in-left" : "pointer-events-none -translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-frost-blue/8 px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-frost-blue/15 ring-1 ring-frost-blue/30">
              <Hexagon className="size-3.5 text-frost-blue" />
            </div>
            <span className="text-[13px] font-semibold text-white">ZES Control</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex size-8 items-center justify-center rounded-lg text-white/60 active:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>
        <NavList onNavigate={onClose} />
        <SidebarFooter />
      </aside>

      {/* desktop persistent sidebar (~240px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-frost-blue/10 bg-black/60 pt-16 backdrop-blur-2xl md:flex">
        <NavList />
        <SidebarFooter />
      </aside>
    </>
  );
}
