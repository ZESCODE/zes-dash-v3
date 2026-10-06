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
    <div className="mb-5 flex min-w-0 flex-1 items-center justify-between gap-2 animate-fade-up">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-frost-blue/30 bg-frost-blue/10">
          <Icon className="size-5 text-frost-blue" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-bold tracking-tight text-white sm:text-xl">{title}</h1>
          <p className="mt-0.5 truncate font-mono text-[9px] text-white/40 sm:text-[11px]">{subtitle}</p>
        </div>
      </div>
      {live && (
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-frost-green/25 bg-frost-green/10 px-2.5 py-1 font-mono text-[9px] text-frost-green sm:inline-flex">
          <Bullet color="green" pulse /> LIVE
        </span>
      )}
    </div>
  );
}
