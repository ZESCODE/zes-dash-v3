import { BrainCircuit, Share2, Clock, HardDrive } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { fmtBytes, timeAgo } from "@/lib/theme";
import { PageHeader } from "@/components/PageHeader";
import { Bullet } from "@/components/ui/Bullet";
import { agentIcon } from "@/components/ModuleCard";
import { Empty, SectionTitle } from "@/routes/Overview";

interface MemoryBank {
  id: string;
  file: string;
  updated: string | null;
  bytes: number | null;
  data: Record<string, unknown> | unknown[] | null;
}

function entryCount(data: MemoryBank["data"]): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  return Object.keys(data).length;
}

function preview(data: MemoryBank["data"]): string {
  if (!data) return "empty";
  try {
    return JSON.stringify(data).slice(0, 220);
  } catch {
    return "unreadable";
  }
}

export default function Memory() {
  const { data } = useFetch<{ banks?: MemoryBank[]; error?: string }>("/api/memory", 5000);
  const banks = data?.banks ?? [];
  const shared = banks.filter((b) => b.id === "shared" || b.id.startsWith("shared"));
  const agents = banks.filter((b) => !shared.includes(b));

  return (
    <div className="space-y-5">
      <PageHeader icon={BrainCircuit} title="Memory" subtitle="holographic shared memory · ~/.zes/memory" live={!data?.error} />

      {data?.error && <Empty msg={'memory dir unreachable — { error: "unreachable" }'} />}

      {/* shared memory — big holographic card */}
      {shared.length > 0 && (
        <section className="animate-fade-up">
          <SectionTitle title="Shared Memory" hint="all agents read/write" />
          {shared.map((b) => (
            <HoloCard key={b.id} bank={b} big />
          ))}
        </section>
      )}

      {/* per-agent memory banks */}
      <section className="animate-fade-up">
        <SectionTitle title="Agent Memory Banks" hint={`${agents.length} banks`} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((b) => (
            <HoloCard key={b.id} bank={b} />
          ))}
          {agents.length === 0 && !data?.error && <Empty msg="no agent memory banks found" />}
        </div>
      </section>
    </div>
  );
}

function HoloCard({ bank, big = false }: { bank: MemoryBank; big?: boolean }) {
  const Icon = bank.id.startsWith("shared") ? Share2 : agentIcon(bank.id);
  const entries = entryCount(bank.data);
  return (
    <div className={big ? "holo-card p-5 sm:p-6" : "holo-card p-4"}>
      <div className="holo-inner">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-frost-violet/30 bg-frost-violet/15">
              <Icon className="size-5 text-frost-violet" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className={big ? "font-display text-lg font-bold text-white" : "text-sm font-semibold text-white"}>
                {bank.id}
              </h3>
              <p className="font-mono text-[10px] text-white/40">{bank.file}</p>
            </div>
          </div>
          <Bullet color="violet" pulse />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px]">
          <Stat label="entries" value={String(entries)} />
          <Stat label="size" value={bank.bytes != null ? fmtBytes(bank.bytes) : "–"} icon={HardDrive} />
          <Stat label="updated" value={bank.updated ? timeAgo(bank.updated) : "–"} icon={Clock} />
        </div>

        <p className="mono mt-3 line-clamp-3 rounded-lg border border-white/8 bg-black/40 px-2.5 py-2 text-[9.5px] leading-relaxed text-white/45">
          {preview(bank.data)}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Clock }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-wide text-white/35">
        {Icon && <Icon className="size-2.5" />} {label}
      </div>
      <div className="mt-0.5 truncate text-white/80">{value}</div>
    </div>
  );
}
