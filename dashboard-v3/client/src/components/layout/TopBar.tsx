import { Menu, PanelRight, Hexagon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Bullet } from "@/components/ui/Bullet";

export function TopBar({
  onLeft,
  onRight,
  online,
  total,
  errors,
}: {
  onLeft: () => void;
  onRight: () => void;
  online: number;
  total: number;
  errors: number;
}) {
  const allGood = errors === 0 && online === total;
  return (
    <header className="sticky top-0 z-40 border-b border-frost-blue/10 bg-black/50 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5">
        {/* hamburger — mobile only, sidebar is persistent on desktop */}
        <button
          onClick={onLeft}
          title="Navigation"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-frost-blue/10 bg-white/5 text-white/70 transition hover:border-frost-blue/40 hover:bg-frost-blue/10 hover:text-frost-blue active:scale-95 md:hidden"
        >
          <Menu className="size-5" />
        </button>

        {/* brand */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative flex size-9 shrink-0 items-center justify-center">
            <Hexagon className="absolute size-9 animate-spin-slow text-frost-blue/30" strokeWidth={1} />
            <Hexagon className="size-5 text-frost-blue" strokeWidth={2} fill="rgba(64,156,255,0.15)" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[15px] font-bold leading-none tracking-tight text-white sm:text-base">
              ZES <span className="text-frost-blue">Control Center</span>
            </h1>
            <p className="mt-0.5 hidden font-mono text-[10px] text-white/40 sm:block">
              agent orchestration · termux node · v3
            </p>
          </div>
        </div>

        {/* status pill */}
        <div
          className={cn(
            "hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:inline-flex",
            allGood ? "border-frost-green/30 bg-frost-green/10" : "border-frost-orange/30 bg-frost-orange/10",
          )}
        >
          <Bullet color={allGood ? "green" : "orange"} pulse />
          <span className={cn("font-mono text-[11px] font-semibold", allGood ? "text-frost-green" : "text-frost-orange")}>
            {allGood ? "NOMINAL" : "ATTENTION"}
          </span>
          <span className="font-mono text-[10px] text-white/40">{online}/{total}</span>
        </div>

        {/* mobile status dot */}
        <span
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-xl border sm:hidden",
            allGood ? "border-frost-green/40 bg-frost-green/10" : "border-frost-orange/40 bg-frost-orange/10",
          )}
        >
          <Bullet color={allGood ? "green" : "orange"} pulse />
        </span>

        {/* right drawer */}
        <button
          onClick={onRight}
          title="Live feed & metrics"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-frost-blue/10 bg-white/5 text-white/70 transition hover:border-frost-blue/40 hover:bg-frost-blue/10 hover:text-frost-blue active:scale-95"
        >
          <PanelRight className="size-5" />
        </button>
      </div>
    </header>
  );
}
