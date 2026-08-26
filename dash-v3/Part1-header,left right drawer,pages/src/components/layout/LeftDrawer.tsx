import {
  LayoutGrid,
  Cpu,
  Waypoints,
  ScrollText,
  Activity,
  Settings,
  X,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { Bullet } from "../ui/Bullet";
import type { Section } from "../../App";

interface LeftDrawerProps {
  open: boolean;
  onClose: () => void;
  active: Section;
  onNavigate: (section: Section) => void;
}

const navItems: { id: Section; label: string; icon: typeof LayoutGrid; hint: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, hint: "System summary" },
  { id: "agents", label: "Agents", icon: Cpu, hint: "6 modules" },
  { id: "flow", label: "Orchestration Flow", icon: Waypoints, hint: "Request paths" },
  { id: "logs", label: "Event Stream", icon: ScrollText, hint: "Live SSE feed" },
  { id: "health", label: "System Health", icon: Activity, hint: "Router metrics" },
  { id: "settings", label: "Settings", icon: Settings, hint: "Endpoints & config" },
];

export function LeftDrawer({ open, onClose, active, onNavigate }: LeftDrawerProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-[300px] flex-col border-r border-white/10 bg-black/90 backdrop-blur-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0 animate-slide-in-left" : "-translate-x-full pointer-events-none",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-400/30">
              <Terminal className="size-3.5 text-sky-300" />
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

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "border border-sky-400/30 bg-sky-500/10 text-white"
                    : "border border-transparent text-white/65 hover:bg-white/5",
                )}
              >
                <Icon className={cn("size-4.5", isActive ? "text-sky-300" : "text-white/50")} />
                <span className="flex-1">
                  <span className="block text-[13px] font-medium">{item.label}</span>
                  <span className="block text-[10px] text-white/35">{item.hint}</span>
                </span>
                {isActive && <Bullet frost="blue" pulse />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/8 p-4">
          <div className="glass-card rounded-xl p-3">
            <p className="text-[11px] font-medium text-white/70">OmniRoute Gateway</p>
            <p className="mt-1 mono text-[10px] text-emerald-300/90">127.0.0.1:20128/v1</p>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="mt-2 inline-flex items-center gap-1 text-[10px] text-sky-300/80"
            >
              View gateway docs <ExternalLink className="size-2.5" />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
