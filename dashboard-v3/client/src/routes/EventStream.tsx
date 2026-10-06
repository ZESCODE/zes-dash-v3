import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Filter,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { BusEvent, FrostColor } from "@/lib/types";
import { eventColor, fmtTime, frostText, timeAgo } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { SectionTitle } from "@/routes/Overview";
import { StatsCard } from "@/components/StatsCard";

export default function EventStream() {
  const { data, error: requestError, lastUpdated, refresh } = useFetch<{ events?: BusEvent[]; error?: string }>("/api/events?limit=200", 3000);
  const [frozenEvents, setFrozenEvents] = useState<BusEvent[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const live = data?.events ?? [];
  const paused = frozenEvents !== null;
  const events = frozenEvents ?? live;
  const sourceError = !!data?.error || !!requestError;
  const streamColor: FrostColor = sourceError ? "red" : paused ? "orange" : data ? "green" : "blue";
  const streamStatus = sourceError ? "SOURCE OFFLINE" : paused ? "SNAPSHOT PAUSED" : data ? "POLLING · 3S" : "CONNECTING";

  const categories = useMemo(() => Array.from(new Set(live.map((event) => event.type.split(".")[0]).filter(Boolean))), [live]);
  const typeCounts = useMemo(() => {
    const result = new Map<string, number>();
    for (const event of live) result.set(event.type, (result.get(event.type) ?? 0) + 1);
    return Array.from(result.entries()).sort((a, b) => b[1] - a[1]);
  }, [live]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesCategory = filter === "all" || event.type.startsWith(`${filter}.`) || event.type === filter;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      const haystack = [event.type, event.source, event.agent ?? "", event.id, JSON.stringify(event.payload ?? {})].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [events, filter, query]);

  const counts = useMemo(() => ({
    completed: live.filter((event) => event.type.includes("completed")).length,
    failed: live.filter((event) => event.type.includes("failed") || event.type.includes("error")).length,
    queued: live.filter((event) => event.type.includes("queued")).length,
    recent: live.filter((event) => {
      const ts = Date.parse(event.ts);
      return Number.isFinite(ts) && ts >= Date.now() - 60_000;
    }).length,
  }), [live]);

  const sources = useMemo(() => new Set(live.map((event) => event.source).filter(Boolean)).size, [live]);

  const togglePause = () => {
    setFrozenEvents((current) => current === null ? live : null);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          icon={Radio}
          title="Event Stream"
          subtitle="bus timeline · task lifecycle · agent handoffs"
          live={!sourceError && !paused && !!data}
        />
        <div className="mt-1 flex items-center gap-2">
          <span className={cn(
            "hidden min-h-9 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[9px] sm:inline-flex",
            streamColor === "red" ? "border-frost-red/20 bg-frost-red/[0.06] text-frost-red/80" : streamColor === "orange" ? "border-frost-orange/20 bg-frost-orange/[0.06] text-frost-orange" : streamColor === "green" ? "border-frost-green/20 bg-frost-green/[0.06] text-frost-green" : "border-frost-blue/20 bg-frost-blue/[0.06] text-frost-blue",
          )}>
            <Bullet color={streamColor} pulse={!!data && !sourceError && !paused} />
            {streamStatus}
          </span>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh event stream"
            className="flex size-11 items-center justify-center rounded-xl border border-frost-blue/15 bg-white/[0.035] text-white/55 transition hover:border-frost-blue/35 hover:bg-frost-blue/10 hover:text-frost-blue active:scale-95"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 animate-fade-up">
        <StatsCard icon={Zap} label="Events in window" value={sourceError ? "–" : live.length} hint="latest 200 bus records" frost="blue" pulse={!!data && !paused && !sourceError} />
        <StatsCard icon={Activity} label="Last minute" value={sourceError ? "–" : counts.recent} hint="based on event timestamps" frost="cyan" />
        <StatsCard icon={CheckCircle2} label="Completed" value={sourceError ? "–" : counts.completed} frost="green" />
        <StatsCard icon={XCircle} label="Failed / errors" value={sourceError ? "–" : counts.failed} frost="red" />
      </div>

      {counts.failed > 0 && !sourceError && (
        <div className="flex items-start gap-3 rounded-xl border border-frost-orange/20 bg-frost-orange/[0.06] px-3.5 py-3 animate-fade-up">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-frost-orange" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-frost-orange">Failure events in the current window</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-white/40">{counts.failed} failed or error record{counts.failed === 1 ? "" : "s"} detected. Expand a row to inspect its payload and task context.</p>
          </div>
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 animate-fade-up">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <SectionTitle title="Live bus" hint={`${filtered.length} shown${paused ? " · frozen" : ""}`} />
              <p className="-mt-2 text-[10px] text-white/35">Newest first <span className="px-1 text-white/15">·</span> source: <span className="mono text-white/45">~/.zes/bus/events.jsonl</span></p>
            </div>
            {lastUpdated && <span className="hidden shrink-0 font-mono text-[8px] text-white/25 sm:block">updated {new Date(lastUpdated).toLocaleTimeString([], { hour12: false })}</span>}
          </div>

          <GlassCard className="min-w-0 p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search type, source, agent, payload…"
                  aria-label="Search events"
                  className="min-h-11 w-full rounded-xl border border-frost-blue/10 bg-black/25 pl-9 pr-10 text-[11px] text-white/80 outline-none placeholder:text-white/25 focus:border-frost-blue/35 focus:ring-2 focus:ring-frost-blue/10"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/35 hover:bg-white/5 hover:text-white/70">
                    <X className="size-3.5" />
                  </button>
                )}
              </label>
              <button
                type="button"
                onClick={togglePause}
                aria-pressed={paused}
                className={cn(
                  "flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 font-mono text-[9px] font-semibold tracking-wide transition active:scale-[0.98]",
                  paused ? "border-frost-orange/30 bg-frost-orange/[0.08] text-frost-orange" : "border-frost-green/25 bg-frost-green/[0.06] text-frost-green",
                )}
              >
                {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                {paused ? "RESUME" : "PAUSE FEED"}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Filter className="size-3.5 shrink-0 text-white/30" />
              <div className="no-bar flex min-w-0 gap-1.5 overflow-x-auto py-0.5">
                {["all", ...categories].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFilter(category)}
                    aria-pressed={filter === category}
                    className={cn(
                      "min-h-9 shrink-0 rounded-full border px-3 font-mono text-[9px] transition",
                      filter === category ? "border-frost-blue/35 bg-frost-blue/10 text-frost-blue" : "border-frost-blue/10 bg-white/[0.025] text-white/45 hover:bg-white/[0.06] hover:text-white/70",
                    )}
                  >
                    {category === "all" ? "All events" : category}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-4 min-h-32 space-y-2">
              {filtered.length > 0 && <span className="pointer-events-none absolute bottom-3 left-[13px] top-3 w-px bg-gradient-to-b from-frost-blue/25 via-white/[0.07] to-transparent" />}
              {filtered.map((event) => (
                <StreamEvent key={event.id} event={event} expanded={expanded === event.id} onToggle={() => setExpanded((current) => current === event.id ? null : event.id)} />
              ))}
              {filtered.length === 0 && (
                <div className="rounded-xl border border-dashed border-frost-blue/12 bg-black/15 px-4 py-10 text-center">
                  <Radio className="mx-auto size-5 text-white/25" />
                  <p className="mt-2 text-[11px] font-medium text-white/55">{sourceError ? "Event source is unreachable" : live.length === 0 ? "Waiting for bus events" : "No events match this view"}</p>
                  <p className="mt-1 text-[9px] text-white/30">{sourceError ? "Check the ZES daemon and its event log path." : "Try another category or clear your search."}</p>
                </div>
              )}
            </div>
          </GlassCard>
        </section>

        <aside className="space-y-3 animate-fade-up">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg border border-frost-blue/15 bg-frost-blue/[0.07]">
                  <Server className="size-3.5 text-frost-blue" />
                </div>
                <h2 className="font-display text-[12px] font-semibold text-white/85">Stream health</h2>
              </div>
              <Bullet color={sourceError ? "red" : paused ? "orange" : "green"} pulse={!sourceError && !paused} />
            </div>
            <div className="mt-3 space-y-2">
              <InfoLine label="Connection" value={sourceError ? "unavailable" : paused ? "paused snapshot" : data ? "polling" : "connecting"} color={streamColor} />
              <InfoLine label="Poll interval" value="3 seconds" />
              <InfoLine label="Sources" value={sourceError ? "–" : String(sources)} />
              <InfoLine label="Unique event types" value={sourceError ? "–" : String(typeCounts.length)} />
              <InfoLine label="Queued" value={sourceError ? "–" : String(counts.queued)} color="orange" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[12px] font-semibold text-white/85">Event mix</h2>
              <span className="font-mono text-[8px] text-white/30">top types</span>
            </div>
            {typeCounts.length > 0 ? (
              <div className="space-y-2.5">
                {typeCounts.slice(0, 6).map(([type, count]) => {
                  const color = eventColor(type);
                  const width = live.length ? (count / live.length) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="mb-1 flex items-center justify-between gap-2 font-mono text-[9px]">
                        <span className={cn("truncate", frostText(color))}>{type}</span>
                        <span className="shrink-0 text-white/40">{count}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className={cn("h-full rounded-full", eventBarColor(color))} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="py-5 text-center text-[10px] text-white/30">No event types in this window.</p>}
          </GlassCard>

          <div className="rounded-xl border border-frost-violet/15 bg-frost-violet/[0.045] p-3.5">
            <div className="flex items-start gap-2.5">
              <Clock3 className="mt-0.5 size-3.5 shrink-0 text-frost-violet/75" />
              <div>
                <p className="text-[10px] font-semibold text-white/70">Event detail</p>
                <p className="mt-1 text-[9px] leading-relaxed text-white/35">Tap any row to expand the structured payload. Pause freezes the current list while the daemon continues collecting events.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StreamEvent({ event, expanded, onToggle }: { event: BusEvent; expanded: boolean; onToggle: () => void }) {
  const color = eventColor(event.type);
  const payload = event.payload ? JSON.stringify(event.payload, null, 2) : null;
  const displayTime = fmtTime(event.ts);
  return (
    <article className="relative pl-7">
      <span className={cn("absolute left-[9px] top-4 z-[1] size-2.5 rounded-full border-2 border-[#080b10]", eventDotColor(color))} />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Inspect"} ${event.type} event from ${event.source}`}
        className={cn(
          "w-full rounded-xl border bg-[#090d13]/75 p-3 text-left transition hover:bg-white/[0.035] active:scale-[0.998] sm:px-3.5",
          expanded ? "border-frost-blue/25" : "border-white/[0.055] hover:border-frost-blue/15",
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn("mono text-[10px] font-semibold sm:text-[11px]", frostText(color))}>{event.type}</span>
              {event.agent && <span className="rounded-md border border-frost-blue/10 bg-frost-blue/[0.04] px-1.5 py-0.5 font-mono text-[8px] text-frost-blue/65">{event.agent}</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[8px] text-white/35 sm:text-[9px]">
              <span className="text-white/50">{event.source || "unknown source"}</span>
              <span className="text-white/15">·</span>
              <span title={event.ts}>{displayTime}</span>
              <span className="text-white/15">·</span>
              <span>{timeAgo(event.ts)}</span>
            </div>
            {!expanded && payload && <p className="mono mt-2 line-clamp-1 break-all text-[8px] text-white/30">{JSON.stringify(event.payload)}</p>}
          </div>
          <ChevronDown className={cn("mt-0.5 size-3.5 shrink-0 text-white/30 transition-transform", expanded && "rotate-180 text-frost-blue")} />
        </div>
      </button>
      {expanded && (
        <div className="mt-1.5 rounded-xl border border-frost-blue/10 bg-black/30 p-3 animate-fade-in">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">Event payload</span>
            <span className="mono max-w-[55%] truncate text-[8px] text-white/25">{event.id}</span>
          </div>
          {payload ? <pre className="scroll-area max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[9px] leading-relaxed text-frost-cyan/70">{payload}</pre> : <p className="text-[9px] text-white/35">No structured payload attached.</p>}
        </div>
      )}
    </article>
  );
}

function InfoLine({ label, value, color }: { label: string; value: string; color?: FrostColor }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/[0.045] pb-2 last:border-0 last:pb-0">
      <span className="text-[9px] text-white/40">{label}</span>
      <span className={cn("mono truncate text-right text-[9px]", color ? frostText(color) : "text-white/65")}>{value}</span>
    </div>
  );
}

function eventDotColor(color: FrostColor): string {
  const classes: Record<FrostColor, string> = {
    blue: "bg-frost-blue shadow-[0_0_9px_rgba(64,156,255,0.55)]",
    green: "bg-frost-green shadow-[0_0_9px_rgba(16,209,129,0.55)]",
    orange: "bg-frost-orange shadow-[0_0_9px_rgba(251,146,60,0.55)]",
    red: "bg-frost-red shadow-[0_0_9px_rgba(248,85,100,0.55)]",
    violet: "bg-frost-violet",
    cyan: "bg-frost-cyan",
    gray: "bg-white/35",
  };
  return classes[color];
}

function eventBarColor(color: FrostColor): string {
  const classes: Record<FrostColor, string> = {
    blue: "bg-frost-blue/75",
    green: "bg-frost-green/75",
    orange: "bg-frost-orange/75",
    red: "bg-frost-red/75",
    violet: "bg-frost-violet/75",
    cyan: "bg-frost-cyan/75",
    gray: "bg-white/40",
  };
  return classes[color];
}
