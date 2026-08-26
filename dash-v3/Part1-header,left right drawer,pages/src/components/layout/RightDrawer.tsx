import { X, Radio, Database, Waypoints as Route, ShieldCheck } from "lucide-react";
import { cn } from "../../utils/cn";
import type { LogEvent } from "../../types";
import { EventStream } from "../dashboard/EventStream";
import { Bullet } from "../ui/Bullet";

interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  logs: LogEvent[];
}

export function RightDrawer({ open, onClose, logs }: RightDrawerProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-[360px] flex-col border-l border-white/10 bg-black/90 backdrop-blur-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0 animate-slide-in-right" : "translate-x-full pointer-events-none",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-emerald-300" />
            <span className="text-[13px] font-semibold text-white">Live System Panel</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close system panel"
            className="flex size-8 items-center justify-center rounded-lg text-white/60 active:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-white/45">SSE Event Stream</h3>
              <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                <Bullet frost="green" pulse /> connected
              </span>
            </div>
            <EventStream logs={logs} compact />
          </section>

          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Router Metrics</h3>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[12px] text-white/70">
                <Database className="size-3.5 text-sky-300" /> Semantic cache
              </div>
              <div className="mt-1.5 flex items-end justify-between">
                <span className="text-lg font-semibold text-white">80%</span>
                <span className="mono text-[10px] text-white/40">845 hits · 213 miss</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-4/5 rounded-full bg-sky-400/80" />
              </div>
            </div>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[12px] text-white/70">
                <Route className="size-3.5 text-emerald-300" /> Free proxy pool
              </div>
              <div className="mt-1.5 flex items-end justify-between">
                <span className="text-lg font-semibold text-white">148/160</span>
                <span className="mono text-[10px] text-white/40">rotating · round robin</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-[92%] rounded-full bg-emerald-400/80" />
              </div>
            </div>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 text-[12px] text-white/70">
                <ShieldCheck className="size-3.5 text-orange-300" /> Circuit breakers
              </div>
              <div className="mt-2 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/55">antigravity</span>
                  <span className="flex items-center gap-1 text-red-300"><Bullet frost="red" /> tripped</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">cloudflare-ai</span>
                  <span className="flex items-center gap-1 text-emerald-300"><Bullet frost="green" /> closed</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">gemini</span>
                  <span className="flex items-center gap-1 text-emerald-300"><Bullet frost="green" /> closed</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
