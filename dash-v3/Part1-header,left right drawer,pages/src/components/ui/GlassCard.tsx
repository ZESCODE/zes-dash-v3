import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function GlassCard({ children, className, as: Component = "div" }: GlassCardProps) {
  return (
    <Component className={cn("glass-card rounded-2xl p-4 sm:p-5", className)}>
      {children}
    </Component>
  );
}
