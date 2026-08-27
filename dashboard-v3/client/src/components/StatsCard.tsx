import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { cn } from "@/utils/cn";
import type { FrostColor } from "@/lib/types";
import { frostBg, frostText } from "@/lib/theme";

/** GlassStatCard from frost-cards: compact metric with icon + frost accent. */
export function StatsCard({
  icon: Icon,
  label,
  value,
  hint,
  frost = "blue",
  pulse = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  frost?: FrostColor;
  pulse?: boolean;
}) {
  return (
    <GlassCard frost={frost} className="p-4">
      <div className="flex items-center justify-between">
        <div className={cn("flex size-9 items-center justify-center rounded-xl", frostBg(frost))}>
          <Icon className={cn("size-4.5", frostText(frost))} strokeWidth={1.8} />
        </div>
        <Bullet color={frost} pulse={pulse} />
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-white/45">{label}</p>
      {hint && <p className="mono mt-1 text-[10px] text-white/35">{hint}</p>}
    </GlassCard>
  );
}
