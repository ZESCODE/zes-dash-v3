import { Settings as SettingsIcon, FolderCheck, FolderX, Globe, Cpu, Info } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { SectionTitle } from "@/routes/Overview";

interface SettingsData {
  node?: { home: string; platform: string; nodeVersion: string; hostname: string };
  sources?: Record<string, { path: string; ok: boolean }>;
  endpoints?: { name: string; url: string }[];
  dashboard?: { port: number; version: string; pollMs: number };
}

export default function Settings() {
  const { data } = useFetch<SettingsData>("/api/settings", 10000);

  return (
    <div className="space-y-5">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="configuration endpoints · read-only" live={false} />

      {/* dashboard info */}
      <GlassCard frost="blue" className="animate-fade-up">
        <div className="flex items-center gap-2 text-[12px] text-white/70">
          <Info className="size-4 text-frost-blue" /> Dashboard
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
          <KV k="Version" v={data?.dashboard?.version ?? "–"} />
          <KV k="Port" v={data?.dashboard ? String(data.dashboard.port) : "–"} />
          <KV k="Poll interval" v={data?.dashboard ? `${data.dashboard.pollMs}ms` : "–"} />
          <KV k="Host" v={data?.node?.hostname ?? "–"} />
        </div>
      </GlassCard>

      {/* data sources */}
      <section className="animate-fade-up">
        <SectionTitle title="Live Data Sources" hint="files on the Termux node" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(data?.sources ?? {}).map(([name, s]) => (
            <GlassCard key={name} frost={s.ok ? "green" : "red"} className="p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {s.ok ? <FolderCheck className="size-4 text-frost-green" /> : <FolderX className="size-4 text-frost-red" />}
                  <span className="text-[12px] font-semibold capitalize text-white">{name}</span>
                </div>
                <span className={cn("flex items-center gap-1.5 font-mono text-[10px]", s.ok ? "text-frost-green" : "text-frost-red")}>
                  <Bullet color={s.ok ? "green" : "red"} pulse={s.ok} /> {s.ok ? "found" : "missing"}
                </span>
              </div>
              <p className="mono mt-2 truncate text-[10px] text-white/45">{s.path}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* endpoints */}
      <section className="animate-fade-up">
        <SectionTitle title="Configuration Endpoints" />
        <div className="space-y-2">
          {(data?.endpoints ?? []).map((e) => (
            <GlassCard key={e.name} className="flex items-center gap-3 p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-frost-blue/25 bg-frost-blue/10">
                <Globe className="size-4 text-frost-blue" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white/85">{e.name}</p>
                <p className="mono truncate text-[10px] text-white/45">{e.url}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* runtime */}
      <section className="animate-fade-up">
        <SectionTitle title="Runtime" />
        <GlassCard className="p-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
            <KV k="Platform" v={data?.node?.platform ?? "–"} icon={Cpu} />
            <KV k="Node.js" v={data?.node?.nodeVersion ?? "–"} />
            <KV k="Home" v={data?.node?.home ?? "–"} />
            <KV k="Hostname" v={data?.node?.hostname ?? "–"} />
          </div>
        </GlassCard>
      </section>
    </div>
  );
}

function KV({ k, v, icon: Icon }: { k: string; v: string; icon?: typeof Cpu }) {
  return (
    <div className="rounded-lg border border-frost-blue/5 bg-black/20 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-wide text-white/35">
        {Icon && <Icon className="size-2.5" />} {k}
      </div>
      <div className="mt-0.5 truncate text-white/80">{v}</div>
    </div>
  );
}
