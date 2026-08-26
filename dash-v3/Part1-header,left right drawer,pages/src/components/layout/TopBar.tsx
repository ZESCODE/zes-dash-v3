import { Menu, PanelRightOpen, Terminal } from "lucide-react";
import { Bullet } from "../ui/Bullet";

interface TopBarProps {
  onOpenLeft: () => void;
  onOpenRight: () => void;
  title: string;
  online: boolean;
}

export function TopBar({ onOpenLeft, onOpenRight, title, online }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-black/70 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLeft}
            aria-label="Open navigation drawer"
            className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors active:bg-white/10"
          >
            <Menu className="size-4.5" />
          </button>
          <div className="flex items-center gap-2 pl-1">
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-400/30">
              <Terminal className="size-3.5 text-sky-300" />
            </div>
            <div className="leading-none">
              <p className="text-[13px] font-semibold tracking-tight text-white">{title}</p>
              <p className="hidden text-[10px] text-white/40 sm:block">Termux · Mobile Orchestration</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 sm:flex">
            <Bullet frost={online ? "green" : "red"} pulse={online} />
            <span className="text-[11px] text-white/60">{online ? "All systems nominal" : "Degraded"}</span>
          </div>
          <button
            type="button"
            onClick={onOpenRight}
            aria-label="Open system panel"
            className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors active:bg-white/10"
          >
            <PanelRightOpen className="size-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
