import { cn } from "@/utils/cn";
import type { FrostColor } from "@/lib/types";
import { frostBar } from "@/lib/theme";

export function ProgressBar({
  value,
  color = "blue",
  className,
}: {
  value: number; // 0..100
  color?: FrostColor;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700", frostBar(color))}
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, opacity: 0.85 }}
      />
    </div>
  );
}
