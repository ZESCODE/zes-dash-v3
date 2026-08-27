import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import type { FrostColor } from "@/lib/types";
import { frostCard } from "@/lib/theme";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  frost?: FrostColor;
  as?: "div" | "section" | "article";
  onClick?: () => void;
}

/** Frost glass card — bg-black/40, backdrop-blur-xl, frost border, rounded-2xl, glow. */
export function GlassCard({ children, className, frost = "blue", as: Comp = "div", onClick }: GlassCardProps) {
  return (
    <Comp onClick={onClick} className={cn("glass-card rounded-2xl p-4 sm:p-5", frostCard(frost), className)}>
      {children}
    </Comp>
  );
}
