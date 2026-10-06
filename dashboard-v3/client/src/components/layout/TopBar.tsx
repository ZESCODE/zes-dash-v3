import { Menu, PanelRight, Hexagon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Bullet } from "@/components/ui/Bullet";
import type { FrostColor } from "@/lib/types";

type ConnectionState = "loading" | "connected" | "attention" | "offline";

const STATUS_TONE: Record<FrostColor, { text: string; border: string; bg: string }> = {
  blue: { text: "text-frost-blue", border: "border-frost-blue/25", bg: "bg-frost-blue/[0.08]" },
  green: { text: "text-frost-green", border: "border-frost-green/25", bg: "bg-frost-green/[0.08]" },
  orange: { text: "text-frost-orange", border: "border-frost-orange/25", bg: "bg-frost-orange/[0.08]" },
  red: { text: "text-frost-red", border: "border-frost-red/25", bg: "bg-frost-red/[0.08]" },
  violet: { text: "text-frost-violet", border: "border-frost-violet/25", bg: "bg-frost-violet/[0.08]" },
  cyan: { text: "text-frost-cyan", border: "border-frost-cyan/25", bg: "bg-frost-cyan/[0.08]" },
  gray: { text: "text-white/45", border: "border-white/15", bg: "bg-white/[0.04]" },
};

export function TopBar({
  onLeft,
  onRight,
  leftOpen = false,
  rightOpen = false,
  online,
  total,
  errors,
  connection = "loading",
}: {
  onLeft: () => void;
  onRight: () => void;
  leftOpen?: boolean;
  rightOpen?: boolean;
  online: number;
  total: number;
  errors: number;
  connection?: ConnectionState;
}) {
  const healthy = connection === "connected" && total > 0 && online === total && errors === 0;
  const status = healthy ? "NOMINAL" : connection === "loading" ? "SYNCING" : connection === "offline" ? "OFFLINE" : "ATTENTION";
  const statusColor: FrostColor = healthy ? "green" : connection === "loading" ? "blue" : connection === "offline" ? "red" : "orange";
  const tone = STATUS_TONE[statusColor];

  return (
    <header
      className="sticky top-0 z-40 border-b border-frost-blue/10 bg-[#080b10]/85 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex min-h-14 max-w-[1800px] items-center gap-2.5 px-3 py-1.5 sm:gap-3 sm:px-5">
        <button
          type="button"
          onClick={onLeft}
          title="Open navigation"
          aria-label="Open navigation menu"
          aria-controls="primary-navigation-drawer"
          aria-expanded={leftOpen}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-frost-blue/20 bg-frost-blue/[0.08] text-frost-blue transition hover:border-frost-blue/40 hover:bg-frost-blue/15 active:scale-95 md:hidden"
        >
          <Menu className="size-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative hidden size-9 shrink-0 items-center justify-center sm:flex">
            <Hexagon className="absolute size-9 animate-spin-slow text-frost-blue/25" strokeWidth={1} />
            <Hexagon className="size-5 text-frost-blue" strokeWidth={2} fill="rgba(64,156,255,0.15)" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[13px] font-bold leading-tight tracking-tight text-white sm:text-base">
              ZES <span className="text-frost-blue">Control Center</span>
              <span className="ml-2 hidden rounded border border-frost-blue/15 bg-frost-blue/[0.06] px-1.5 py-0.5 align-middle font-mono text-[8px] font-medium tracking-wider text-frost-blue/80 lg:inline">MESH RUNTIME</span>
            </h1>
            <p className="mt-0.5 hidden truncate font-mono text-[9px] text-white/35 sm:block">
              orchestration fabric <span className="text-white/20">/</span> Termux node <span className="text-white/20">/</span> v3
            </p>
          </div>
        </div>

        <div
          className={cn(
            "hidden min-h-8 items-center gap-2 rounded-full border px-3 py-1 sm:inline-flex",
            healthy ? "border-frost-green/25 bg-frost-green/[0.08]" : connection === "offline" ? "border-frost-red/30 bg-frost-red/10" : connection === "loading" ? "border-frost-blue/25 bg-frost-blue/[0.08]" : "border-frost-orange/30 bg-frost-orange/10",
          )}
        >
          <Bullet color={statusColor} pulse={healthy || connection === "loading"} />
          <span className={cn("font-mono text-[9px] font-semibold tracking-[0.12em]", tone.text)}>{status}</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="font-mono text-[9px] text-white/45">{connection === "loading" ? "—" : `${online}/${total}`}</span>
        </div>

        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border sm:hidden",
            tone.border,
            tone.bg,
          )}
          title={status}
          aria-label={`System status: ${status}`}
        >
          <Bullet color={statusColor} pulse={healthy || connection === "loading"} />
        </span>

        <button
          type="button"
          onClick={onRight}
          title="Open mesh inspector"
          aria-label="Open workflow and system panel"
          aria-controls="mesh-inspector-drawer"
          aria-expanded={rightOpen}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-frost-blue/15 bg-white/[0.04] text-white/65 transition hover:border-frost-blue/40 hover:bg-frost-blue/10 hover:text-frost-blue active:scale-95"
        >
          <PanelRight className="size-4.5" />
        </button>
      </div>
    </header>
  );
}
