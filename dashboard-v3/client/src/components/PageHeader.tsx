import type { LucideIcon } from "lucide-react";
import { Bullet } from "@/components/ui/Bullet";

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  live = true,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  live?: boolean;
}) {
  return (
    <div className="mb-5 flex items-center justify-between animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-frost-blue/30 bg-frost-blue/10">
          <Icon className="size-5 text-frost-blue" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h1>
          <p className="font-mono text-[11px] text-white/40">{subtitle}</p>
        </div>
      </div>
      {live && (
        <span className="flex items-center gap-1.5 rounded-full border border-frost-green/25 bg-frost-green/10 px-2.5 py-1 font-mono text-[10px] text-frost-green">
          <Bullet color="green" pulse /> LIVE
        </span>
      )}
    </div>
  );
}
