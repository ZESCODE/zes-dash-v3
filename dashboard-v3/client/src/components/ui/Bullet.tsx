import { cn } from "@/utils/cn";
import type { FrostColor } from "@/lib/types";
import { frostBullet } from "@/lib/theme";

export function Bullet({
  color = "blue",
  pulse = false,
  className,
}: {
  color?: FrostColor;
  pulse?: boolean;
  className?: string;
}) {
  return <span className={cn("bullet", frostBullet(color), pulse && "bullet-pulse", className)} />;
}
