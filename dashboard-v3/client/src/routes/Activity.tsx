import { useEffect, useMemo, useRef, useState } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import type { BusEvent } from "@/lib/types";
import { eventColor, frostText, fmtTime } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { BarChart } from "@/components/ui/BarChart";
import { Empty, SectionTitle } from "@/routes/Overview";

const MAX_CLIENT_EVENTS = 200;

/** Activity — timeline layout, polls /api/activity every 5s via setInterval (no SSE),
    keeps the last 200 events in client memory. */
export default function Activity() {
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [unreachable, setUnreachable] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/activity");
        const json = await res.json();
        if (!alive) return;
        if (json.error || !Array.isArray(json.events)) {
          setUnreachable(true);
          return;
        }
        setUnreachable(false);
        setEvents((prev) => {
          const fresh = (json.events as BusEvent[]).filter((e) => !seen.current.has(e.id));
          fresh.forEach((e) => seen.current.add(e.id));
          return [...fresh, ...prev]
            .sort((a, b) => b.ts.localeCompare(a.ts))
            .slice(0, MAX_CLIENT_EVENTS);
        });
      } catch {
        if (alive) setUnreachable(true);
      }
    };
    load();
    const t = setInterval(load, 5000); // ≤5s poll per spec
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // per-hour histogram for the chart
  const histogram = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const e of events) {
      const key = e.ts.slice(11, 13) + ":00";
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
  }, [events]);

  // group by day for the timeline
  const groups = useMemo(() => {
    const g = new Map<string, BusEvent[]>();
    for (const e of events) {
      const day = e.ts.slice(0, 10);
      if (!g.has(day)) g.set(day, []);
      g.get(day)!.push(e);
    }
    return Array.from(g.entries());
  }, [events]);

  return (
    <div className="space-y-5">
      <PageHeader icon={ActivityIcon} title="Activity" subtitle="bus tail · setInterval 5s · last 200 in memory" live={!unreachable} />

      {/* activity histogram */}
      <section className="animate-fade-up">
        <SectionTitle title="Event Volume" hint={`${events.length}/${MAX_CLIENT_EVENTS} buffered`} />
        <GlassCard frost="green">
          {histogram.length > 0 ? (
            <BarChart label="events per hour" data={histogram} color="rgb(16,209,129)" height={130} />
          ) : (
            <Empty msg={unreachable ? "events.jsonl unreachable" : "no events yet"} />
          )}
        </GlassCard>
      </section>

      {/* vertical timeline — different layout from Event Stream */}
      <section className="animate-fade-up">
        <SectionTitle title="Timeline" hint="reverse-chronological" />
        <GlassCard className="p-4 sm:p-5">
          {groups.map(([day, list]) => (
            <div key={day} className="mb-4 last:mb-0">
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-frost-blue/80">{day}</p>
              <div className="relative ml-1.5 border-l border-frost-blue/10 pl-5">
                {list.map((e) => {
                  const c = eventColor(e.type);
                  const payload = e.payload ? JSON.stringify(e.payload) : "";
                  return (
                    <div key={e.id} className="relative mb-3.5 last:mb-0">
                      <span className="absolute -left-[26px] top-1">
                        <Bullet color={c} pulse={e.type.includes("running")} />
                      </span>
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-[10px] text-white/35">{fmtTime(e.ts)}</span>
                        <span className={cn("font-mono text-[11.5px] font-semibold", frostText(c))}>{e.type}</span>
                        <span className="font-mono text-[10px] text-white/40">{e.source}</span>
                        {e.agent && <span className="font-mono text-[10px] text-white/25">→ {e.agent}</span>}
                      </div>
                      {payload && (
                        <p className="mono mt-0.5 line-clamp-2 max-w-2xl text-[9.5px] leading-relaxed text-white/40">
                          {payload.slice(0, 200)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {events.length === 0 && <Empty msg={unreachable ? "events.jsonl unreachable" : "waiting for events…"} />}
        </GlassCard>
      </section>
    </div>
  );
}
