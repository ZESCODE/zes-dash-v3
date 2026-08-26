import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export function Drawer({
  side,
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-opacity duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* panel */}
      <aside
        className={cn(
          "absolute top-0 bottom-0 flex w-[86%] max-w-sm flex-col glass-strong shadow-2xl transition-transform duration-300 ease-out",
          side === "left" ? "left-0" : "right-0",
          open
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">{title}</h2>
            {subtitle && <p className="font-mono text-[11px] text-white/40">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-90"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="scroll-area flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
