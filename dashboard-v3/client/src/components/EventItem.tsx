import { cn } from "@/utils/cn";
import type { BusEvent } from "@/lib/types";
import { eventColor, frostText, fmtTime } from "@/lib/theme";
import { Bullet } from "@/components/ui/Bullet";

export function EventItem({ event, compact = false }: { event: BusEvent; compact?: boolean }) {
  const c = eventColor(event.type);
  const payload = event.payload ? JSON.stringify(event.payload) : "";
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-frost-blue/5 bg-black/20 px-2.5 py-2">
      <Bullet color={c} className="mt-1.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("font-mono text-[11px] font-semibold", frostText(c))}>{event.type}</span>
          <span className="font-mono text-[9.5px] text-white/35">{event.source}</span>
          {event.agent && <span className="font-mono text-[9.5px] text-white/25">→ {event.agent}</span>}
          <span className="ml-auto font-mono text-[9.5px] text-white/30">{fmtTime(event.ts)}</span>
        </div>
        {!compact && payload && (
          <p className="mono mt-1 truncate text-[9.5px] text-white/40">{payload.slice(0, 160)}</p>
        )}
      </div>
    </div>
  );
}
