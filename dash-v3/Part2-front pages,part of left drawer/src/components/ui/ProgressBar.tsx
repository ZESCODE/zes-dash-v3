import { cn } from "@/utils/cn";
import type { FrostColor } from "@/lib/types";
import { FROST_HEX } from "@/lib/theme";

export function ProgressBar({
  value,
  color = "blue",
  className,
  track = true,
}: {
  value: number; // 0..100
  color?: Exclude<FrostColor, "gray">;
  className?: string;
  track?: boolean;
}) {
  const stroke = FROST_HEX[color];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", track && "bg-white/10", className)}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${Math.max(2, Math.min(100, value))}%`,
          background: `linear-gradient(90deg, ${stroke}, ${stroke}cc)`,
          boxShadow: `0 0 10px ${stroke}aa`,
        }}
      />
    </div>
  );
}
