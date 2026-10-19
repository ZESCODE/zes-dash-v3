import { useEffect, useState, type ReactNode } from "react";
import {
  Newspaper,
  PlayCircle,
  ImagePlus,
  RefreshCw,
  Trash2,
  Pencil,
  ExternalLink,
  FileText,
  Save,
  X,
  Radio,
  Settings2,
  Share2,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { autoblogApi } from "@/lib/api";
import { cn } from "@/utils/cn";
import { fmtMs, timeAgo } from "@/lib/theme";
import { PageHeader } from "@/components/PageHeader";
import { StatsCard } from "@/components/StatsCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { SectionTitle, Empty } from "@/routes/Overview";

interface AbStats {
  ok?: boolean;
  running?: boolean;
  posts?: number;
  seen?: number;
  lastRun?: number | null;
  lastRunMs?: number | null;
  nextRunMinutes?: number | null;
  autoRun?: boolean;
  config?: { topN?: number; intervalMinutes?: number; sources?: string[] | null; models?: string[]; baseUrl?: string | null };
  facebook?: { configured?: boolean; pageId?: string; autoPost?: boolean };
  error?: string;
}

interface AbPost {
  id: string;
  title: string;
  summary?: string;
  createdAt?: number;
  source?: string;
  sourceName?: string;
  sourceUrl?: string;
  image?: string | null;
  fb?: { id: string; kind?: string; at?: number } | null;
}

interface AbRunStep {
  t: number;
  msg: string;
}

interface AbRun {
  running: boolean;
  trigger: string | null;
  started: number | null;
  finished: number | null;
  steps: AbRunStep[];
  result: { generated?: number; fetched?: number; errors?: number; ms?: number } | null;
}

interface AbAgg {
  base?: string;
  stats?: AbStats;
  settings?: { settings?: AbSettingShape };
  posts?: { posts?: AbPost[] };
}

interface AbSettingShape {
  topN?: number;
  intervalMinutes?: number;
  sources?: string[];
  models?: string[] | null;
  baseUrl?: string | null;
  autoRun?: boolean;
  facebook?: { autoPost?: boolean };
}

interface AbSettingsForm {
  topN: number;
  intervalMinutes: number;
  sources: string[];
  models: string;
  baseUrl: string;
  autoRun: boolean;
  fbAutoPost: boolean;
}

const SOURCE_OPTIONS = ["hn", "trendingai"];

export default function Autoblog() {
  const { data: agg, refresh } = useFetch<AbAgg>("/api/autoblog", 5000);
  const { data: runData, refresh: refreshRun } = useFetch<{ run?: AbRun }>("/api/autoblog/runs/current", 2000);

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; summary: string; body: string } | null>(null);
  const [form, setForm] = useState<AbSettingsForm | null>(null);

  const stats = agg?.stats;
  const settings = agg?.settings?.settings;
  const posts = agg?.posts?.posts ?? [];
  const base = agg?.base ?? "";
  const run = runData?.run;
  const connected = !!stats && !stats.error;

  useEffect(() => {
    if (settings && !form) {
      setForm({
        topN: settings.topN ?? 3,
        intervalMinutes: settings.intervalMinutes ?? 360,
        sources: settings.sources ?? ["hn", "trendingai"],
        models: (settings.models ?? []).join(", "),
        baseUrl: settings.baseUrl ?? "",
        autoRun: settings.autoRun !== false,
        fbAutoPost: !!settings.facebook?.autoPost,
      });
    }
  }, [settings, form]);

  async function act(label: string, fn: () => Promise<unknown>, done: string) {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "ok", text: done });
      await refresh();
      refreshRun();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "request failed" });
    } finally {
      setBusy(null);
    }
  }

  async function startEdit(p: AbPost) {
    setBusy("edit");
    setMsg(null);
    try {
      const r = (await autoblogApi.getPost(p.id)) as { post?: { title: string; summary: string; body: string } };
      setDraft({ title: r.post?.title ?? "", summary: r.post?.summary ?? "", body: r.post?.body ?? "" });
      setEditingId(p.id);
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "load failed" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Newspaper}
        title="AutoBlog"
        subtitle={base.replace(/^https?:\/\//, "") || "AI-generated blog"}
        live={connected}
      />

      {!connected ? (
        <GlassCard frost="orange" className="animate-fade-up">
          <div className="flex items-center gap-2 text-[12px] text-frost-orange">
            <Radio className="size-4" /> AutoBlog API unreachable
          </div>
          <p className="mono mt-2 text-[10px] text-white/45">
            {stats?.error === "unreachable" ? "app may be asleep (Bonto wakes on request) — retrying" : (stats?.error ?? "no data yet")}
          </p>
        </GlassCard>
      ) : (
        <>
          {/* stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 animate-fade-up">
            <StatsCard icon={Newspaper} label="Posts" value={stats.posts ?? 0} frost="blue" />
            <StatsCard icon={FileText} label="Stories seen" value={stats.seen ?? 0} frost="cyan" />
            <StatsCard icon={PlayCircle} label="Running" value={stats.running ? "yes" : "no"} frost={stats.running ? "green" : "gray"} pulse={!!stats.running} />
            <StatsCard icon={RefreshCw} label="Last run" value={stats.lastRun ? timeAgo(new Date(stats.lastRun).toISOString()) : "never"} hint={stats.lastRunMs ? fmtMs(stats.lastRunMs) : undefined} frost="violet" />
            <StatsCard icon={Settings2} label="Auto-run" value={stats.autoRun ? `${stats.nextRunMinutes ?? "?"}m` : "off"} frost={stats.autoRun ? "green" : "gray"} />
          </div>

          {/* controls */}
          <GlassCard className="animate-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!!busy || stats.running}
                onClick={() => act("run", () => autoblogApi.run({ wait: false }), "run triggered")}
                className={btn("blue")}
              >
                <PlayCircle className="size-3.5" /> {busy === "run" ? "starting…" : "Run now"}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => act("backfill", () => autoblogApi.backfill(), "backfill done")}
                className={btn("violet")}
              >
                <ImagePlus className="size-3.5" /> {busy === "backfill" ? "backfilling…" : "Backfill images"}
              </button>
              <button type="button" disabled={!!busy} onClick={testFb} className={btn("neutral")} title="Check Facebook page credentials">
                <Share2 className="size-3.5" /> {busy === "fbtest" ? "checking…" : "Test Facebook"}
              </button>
              <button type="button" disabled={!!busy} onClick={() => { refresh(); refreshRun(); }} className={btn("neutral")}>
                <RefreshCw className={cn("size-3.5", busy === "refresh" && "animate-spin")} /> Refresh
              </button>
              {msg && (
                <span className={cn("ml-auto font-mono text-[10px]", msg.kind === "ok" ? "text-frost-green" : "text-frost-red")}>
                  {msg.text}
                </span>
              )}
            </div>
          </GlassCard>

          {/* live run */}
          <section className="animate-fade-up">
            <SectionTitle title="Live Run" hint={run?.running ? "in progress" : "last activity"} />
            <GlassCard frost={run?.running ? "green" : "blue"} className="p-3">
              {run?.running ? (
                <div className="scroll-area max-h-64 space-y-1 overflow-y-auto">
                  {run.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 font-mono text-[10px]">
                      <Bullet color="green" pulse={i === run.steps.length - 1} className="mt-1" />
                      <span className="text-white/35">{new Date(s.t).toLocaleTimeString([], { hour12: false })}</span>
                      <span className="text-white/75">{s.msg}</span>
                    </div>
                  ))}
                </div>
              ) : run?.result ? (
                <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] text-white/60">
                  <span>fetched <b className="text-white/85">{run.result.fetched ?? 0}</b></span>
                  <span>generated <b className="text-frost-green">{run.result.generated ?? 0}</b></span>
                  <span>errors <b className={run.result.errors ? "text-frost-red" : "text-white/85"}>{run.result.errors ?? 0}</b></span>
                  <span>duration <b className="text-white/85">{fmtMs(run.result.ms)}</b></span>
                  <span className="text-white/35">trigger: {run.trigger ?? "–"}</span>
                </div>
              ) : (
                <Empty msg="no run recorded this session" />
              )}
            </GlassCard>
          </section>

          {/* settings */}
          {form && (
            <section className="animate-fade-up">
              <SectionTitle title="Generation Settings" hint="persisted to data/settings.json" />
              <GlassCard className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Top N / run">
                    <input type="number" min={1} max={20} value={form.topN} onChange={(e) => setForm({ ...form, topN: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Interval (min)">
                    <input type="number" min={1} value={form.intervalMinutes} onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Base URL">
                    <input value={form.baseUrl} placeholder="(env default)" onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Auto-run">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, autoRun: !form.autoRun })}
                      className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11px]", form.autoRun ? "border-frost-green/30 bg-frost-green/10 text-frost-green" : "border-white/10 bg-white/5 text-white/50")}
                    >
                      <Bullet color={form.autoRun ? "green" : "gray"} /> {form.autoRun ? "enabled" : "disabled"}
                    </button>
                  </Field>
                </div>

                <Field label="Facebook auto-post">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, fbAutoPost: !form.fbAutoPost })}
                      className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11px]", form.fbAutoPost ? "border-frost-blue/30 bg-frost-blue/10 text-frost-blue" : "border-white/10 bg-white/5 text-white/50")}
                    >
                      <Bullet color={form.fbAutoPost ? "blue" : "gray"} /> {form.fbAutoPost ? "on publish" : "off"}
                    </button>
                    <span className={cn("font-mono text-[10px]", stats.facebook?.configured ? "text-frost-green/80" : "text-frost-orange/80")}>
                      {stats.facebook?.configured ? `page ${stats.facebook.pageId ?? ""}` : "token missing — set FB_PAGE_ACCESS_TOKEN"}
                    </span>
                  </div>
                </Field>

                <Field label="Sources">
                  <div className="flex flex-wrap gap-2">
                    {SOURCE_OPTIONS.map((s) => {
                      const on = form.sources.includes(s);
  async function testFb() {
    setBusy("fbtest");
    setMsg(null);
    try {
      const r = (await autoblogApi.facebookTest()) as {
        ok?: boolean;
        configured?: boolean;
        page?: { name?: string };
        error?: string;
      };
      if (r?.ok) {
        setMsg({ kind: "ok", text: `facebook ok · ${r.page?.name ?? stats?.facebook?.pageId ?? "page"}` });
      } else {
        setMsg({ kind: "err", text: r?.error === "not configured" ? "facebook token not configured" : r?.error ?? "facebook check failed" });
      }
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "request failed" });
    } finally {
      setBusy(null);
    }
  }

  async function postFb(p: AbPost) {
    if (!confirm(`Publish "${p.title}" to the Facebook page now?`)) return;
    setBusy("fb-" + p.id);
    setMsg(null);
    try {
      const r = (await autoblogApi.postToFacebook(p.id)) as { ok?: boolean; error?: string; url?: string };
      if (r?.ok) setMsg({ kind: "ok", text: "posted to facebook" });
      else setMsg({ kind: "err", text: r?.error ?? "facebook publish failed" });
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "request failed" });
    } finally {
      setBusy(null);
    }
  }

  return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm({ ...form, sources: on ? form.sources.filter((x) => x !== s) : [...form.sources, s] })}
                          className={cn("rounded-lg border px-3 py-1.5 font-mono text-[10px]", on ? "border-frost-blue/30 bg-frost-blue/15 text-frost-blue" : "border-white/10 bg-white/5 text-white/45")}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label={`Model chain (comma-separated)${stats.config?.models?.length ? ` · ${stats.config.models.length} resolved` : ""}`}>
                  <textarea
                    rows={2}
                    value={form.models}
                    placeholder="(use built-in / env default chain)"
                    onChange={(e) => setForm({ ...form, models: e.target.value })}
                    className={cn(inputCls, "resize-y leading-relaxed")}
                  />
                </Field>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() =>
                      act(
                        "settings",
                        () =>
                          autoblogApi.saveSettings({
                            topN: form.topN,
                            intervalMinutes: form.intervalMinutes,
                            sources: form.sources,
                            models: form.models.trim(),
                            baseUrl: form.baseUrl.trim() || null,
                            autoRun: form.autoRun,
                            facebook: { autoPost: form.fbAutoPost },
                          }),
                        "settings saved",
                      )
                    }
                    className={btn("blue")}
                  >
                    <Save className="size-3.5" /> {busy === "settings" ? "saving…" : "Save settings"}
                  </button>
                  <span className="font-mono text-[10px] text-white/30">empty model chain = built-in default</span>
                </div>
              </GlassCard>
            </section>
          )}

          {/* posts */}
          <section className="animate-fade-up">
            <SectionTitle title="Posts" hint={`${posts.length} total`} />
            <div className="space-y-2">
              {posts.map((p) => (
                <GlassCard key={p.id} className="p-3.5">
                  {editingId === p.id && draft ? (
                    <div className="space-y-2">
                      <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
                      <input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} className={inputCls} />
                      <textarea rows={10} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className={cn(inputCls, "resize-y leading-relaxed")} />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() =>
                            act("save-post", () => autoblogApi.updatePost({ id: p.id, ...draft }), "post updated").then(() => {
                              setEditingId(null);
                              setDraft(null);
                            })
                          }
                          className={btn("blue")}
                        >
                          <Save className="size-3.5" /> Save
                        </button>
                        <button type="button" onClick={() => { setEditingId(null); setDraft(null); }} className={btn("neutral")}>
                          <X className="size-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      {p.image ? (
                        <img src={`${base}${p.image}`} alt="" loading="lazy" className="hidden size-16 shrink-0 rounded-lg object-cover sm:block" />
                      ) : (
                        <div className="hidden size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 sm:flex">
                          <FileText className="size-4 text-white/25" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-white/90">{p.title}</p>
                        {p.summary && <p className="mt-0.5 line-clamp-2 text-[11px] text-white/45">{p.summary}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-white/35">
                          <span>{p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : "–"}</span>
                          <span>{p.sourceName || p.source || "hn"}</span>
                          <a href={`${base}/post/${p.id}`} target="_blank" rel="noopener" className="text-frost-blue/80 hover:text-frost-blue">view</a>
                          <a href={`${base}/post/${p.id}.md`} target="_blank" rel="noopener" className="text-frost-blue/80 hover:text-frost-blue">.md</a>
                          {p.sourceUrl && (
                            <a href={p.sourceUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-white/45 hover:text-white/70">
                              source <ExternalLink className="size-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {p.fb ? (
                          <a
                            href={`https://www.facebook.com/${p.fb.id}`}
                            target="_blank"
                            rel="noopener"
                            className={btn("blue", "icon")}
                            title="View on Facebook"
                          >
                            <Share2 className="size-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => postFb(p)}
                            className={btn("neutral", "icon")}
                            title="Post to Facebook"
                          >
                            <Share2 className={cn("size-3.5", busy === "fb-" + p.id && "animate-pulse")} />
                          </button>
                        )}
                        <button type="button" disabled={!!busy} onClick={() => startEdit(p)} className={btn("neutral", "icon")} title="Edit">
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => {
                            if (confirm(`Delete "${p.title}"? This removes the post and its image.`)) {
                              act("del-" + p.id, () => autoblogApi.deletePost(p.id), "post deleted");
                            }
                          }}
                          className={btn("red", "icon")}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              ))}
              {posts.length === 0 && <Empty msg="no posts yet — trigger a run" />}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-frost-blue/15 bg-black/30 px-3 py-2 font-mono text-[11px] text-white/85 outline-none transition focus:border-frost-blue/40";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-white/35">{label}</span>
      {children}
    </label>
  );
}

type BtnTone = "blue" | "violet" | "red" | "neutral";

function btn(tone: BtnTone, size: "sm" | "icon" = "sm") {
  const tones: Record<BtnTone, string> = {
    blue: "border-frost-blue/30 bg-frost-blue/15 text-frost-blue hover:bg-frost-blue/25",
    violet: "border-frost-violet/30 bg-frost-violet/15 text-frost-violet hover:bg-frost-violet/25",
    red: "border-frost-red/30 bg-frost-red/10 text-frost-red hover:bg-frost-red/20",
    neutral: "border-white/10 bg-white/5 text-white/65 hover:bg-white/10",
  };
  const dims = size === "icon" ? "size-8 justify-center" : "px-3 py-2";
  return cn(
    "inline-flex items-center gap-1.5 rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
    size === "icon" ? "text-[11px]" : "text-[11px]",
    dims,
    tones[tone],
  );
}
