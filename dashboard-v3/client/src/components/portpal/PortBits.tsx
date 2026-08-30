import type { ReactNode } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { FrostColor } from "@/lib/types";
import { frostText } from "@/lib/theme";

/** Small frosted pill — status (ACTIVE / LISTENING / STOPPED / SYSTEM). */
export function StatusBadge({ label, frost, className }: { label: string; frost: FrostColor; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider",
        frost === "green" && "border-frost-green/35 bg-frost-green/10 text-frost-green",
        frost === "blue" && "border-frost-blue/35 bg-frost-blue/10 text-frost-blue",
        frost === "orange" && "border-frost-orange/35 bg-frost-orange/10 text-frost-orange",
        frost === "red" && "border-frost-red/35 bg-frost-red/10 text-frost-red",
        frost === "violet" && "border-frost-violet/35 bg-frost-violet/10 text-frost-violet",
        frost === "gray" && "border-white/15 bg-white/5 text-white/50",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Framework badge — frosted dot + label, colored by category. */
export function FwBadge({ label, hex, className }: { label: string; hex: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold", className)}
      style={{ borderColor: `${hex}44`, background: `${hex}14`, color: hex }}
    >
      <span className="size-1.5 rounded-full" style={{ background: hex, boxShadow: `0 0 6px ${hex}` }} />
      {label}
    </span>
  );
}

/** Kill ✕ / restart ↻ action buttons — 36px touch targets. */
export function ActionBtn({
  kind,
  busy,
  disabled,
  title,
  onClick,
}: {
  kind: "kill" | "restart";
  busy?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl border transition active:scale-90",
        kind === "kill"
          ? "border-frost-red/30 bg-frost-red/10 text-frost-red hover:border-frost-red/60 hover:bg-frost-red/20"
          : "border-frost-blue/30 bg-frost-blue/10 text-frost-blue hover:border-frost-blue/60 hover:bg-frost-blue/20",
        (disabled || busy) && "opacity-40",
      )}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : kind === "kill" ? (
        <X className="size-4" strokeWidth={2.4} />
      ) : (
        <RefreshCw className="size-4" strokeWidth={2.2} />
      )}
    </button>
  );
}

export function ActionToast({ toast }: { toast: { msg: string; kind: "ok" | "err"; id: number } | null }) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      className={cn(
        "glass-strong animate-fade-up fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 font-mono text-[11px] shadow-2xl",
        toast.kind === "ok" ? "border-frost-green/40 text-frost-green" : "border-frost-red/40 text-frost-red",
      )}
    >
      {toast.msg}
    </div>
  );
}

export function EmptyRing() {
  return (
    <div className="relative mx-auto size-14">
      <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-frost-blue/30" />
      <div className="absolute inset-2 rounded-full border border-frost-blue/15" />
    </div>
  );
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <EmptyRing />
      <p className="mt-1 text-[13px] font-medium text-white/60">{title}</p>
      {sub && <p className="font-mono text-[10px] text-white/30">{sub}</p>}
    </div>
  );
}

export function MiniStat({ value, label, frost = "blue" }: { value: ReactNode; label: string; frost?: FrostColor }) {
  return (
    <div className="rounded-xl border border-frost-blue/8 bg-black/20 px-3 py-2.5 text-center">
      <p className={cn("font-display text-lg font-bold leading-none", frostText(frost))}>{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-wide text-white/35">{label}</p>
    </div>
  );
}
