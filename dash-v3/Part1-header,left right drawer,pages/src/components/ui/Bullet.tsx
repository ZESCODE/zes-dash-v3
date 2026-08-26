import { cn } from "../../utils/cn";
import type { FrostColor } from "../../types";
import { frostBullet } from "../../utils/status";

interface BulletProps {
  frost?: FrostColor;
  className?: string;
  pulse?: boolean;
}

export function Bullet({ frost = "blue", className, pulse = false }: BulletProps) {
  return (
    <span
      className={cn("bullet", frostBullet[frost], pulse && "pulse-dot", className)}
    />
  );
}
