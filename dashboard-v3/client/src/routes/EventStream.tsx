import { useMemo, useState } from "react";
import { Radio, Pause, Play, Filter } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { BusEvent } from "@/lib/types";
import { eventColor, frostText } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { EventItem } from "@/components/EventItem";
import { Empty, SectionTitle } from "@/routes/Overview";
import { StatsCard } from "@/components/StatsCard";
import { CheckCircle2, XCircle, ListPlus, Zap } from "lucide-react";

export default function EventStream() {
  const { data } = useFetch<{ events?: BusEvent[]; error?: string }>("/api/events?limit=200", 3000);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [frozen, setFrozen] = useState<BusEvent[]>([]);

  const live = data?.events ?? [];
  const events = paused ? frozen : live;

  const types = useMemo(() => ["all", ...Array.from(new Set(live.map((e) => e.type.split(".")[0])))], [live]);
  const filtered = filter === "all" ? events : events.filter((e) => e.type.startsWith(filter));

  const counts = useMemo(() => ({
    completed: live.filter((e) => e.type.includes("completed")).length,
    failed: live.filter((e) => e.type.includes("failed")).length,
    queued: live.filter((e) => e.type.includes("queued")).length,
    total: live.length,
  }), [live]);

  const togglePause = () => {
    if (!paused) setFrozen(live);
    setPaused((p) => !p);
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Radio} title="Event Stream" subtitle="~/.zes/bus/events.jsonl · 3s poll" live={!data?.error && !paused} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 animate-fade-up">
        <StatsCard icon={Zap} label="Events in window" value={data?.error ? "–" : counts.total} frost="blue" pulse={!paused} />
        <StatsCard icon={CheckCircle2} label="Completed" value={data?.error ? "–" : counts.completed} frost="green" />
        <StatsCard icon={XCircle} label="Failed" value={data?.error ? "–" : counts.failed} frost="red" />
        <StatsCard icon={ListPlus} label="Queued" value={data?.error ? "–" : counts.queued} frost="orange" />
      </div>

      <section className="animate-fade-up">
        <SectionTitle title="Stream" hint={`${filtered.length} shown`} />
        <GlassCard className="p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={togglePause}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold transition",
                paused
                  ? "border-frost-orange/40 bg-frost-orange/10 text-frost-orange"
                  : "border-frost-green/40 bg-frost-green/10 text-frost-green",
              )}
            >
              {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
              {paused ? "RESUME" : "PAUSE"}
            </button>
            <Filter className="ml-2 size-3.5 text-white/30" />
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[10px] transition",
                  filter === t
                    ? "border-frost-blue/40 bg-frost-blue/15 text-frost-blue"
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="scroll-area max-h-[32rem] space-y-1.5 overflow-y-auto pr-1">
            {filtered.map((e) => (
              <EventItem key={e.id} event={e} />
            ))}
            {filtered.length === 0 && <Empty msg={data?.error ? "events.jsonl unreachable" : "no events match filter"} />}
          </div>
        </GlassCard>
      </section>

      {/* type legend */}
      <section className="animate-fade-up">
        <SectionTitle title="Event Types" />
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(live.map((e) => e.type))).map((t) => (
            <span key={t} className={cn("rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[10px]", frostText(eventColor(t)))}>
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
