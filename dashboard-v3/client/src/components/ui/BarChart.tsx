/* Archify-inspired mini bar chart — JetBrains Mono labels, precise grid,
   frost accent bars on dark mask. https://github.com/tt-a1i/archify */

export function BarChart({
  data,
  color = "rgb(34,211,238)",
  height = 120,
  label,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  label?: string;
}) {
  if (!data.length) return <p className="font-mono text-[10px] text-white/30">no data</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const gridLines = 4;

  return (
    <div>
      {label && (
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</p>
      )}
      <div className="relative w-full rounded-lg border border-frost-blue/8 bg-[#0f172a]/40 p-3" style={{ height }}>
        {/* grid */}
        {Array.from({ length: gridLines }, (_, i) => (
          <div
            key={i}
            className="pointer-events-none absolute inset-x-3 border-t border-dashed border-frost-blue/6"
            style={{ top: `${12 + ((height - 36) / gridLines) * i}px` }}
          />
        ))}
        {/* bars */}
        <div className="flex h-full items-end gap-[3px]">
          {data.map((d, i) => (
            <div key={i} className="group relative flex-1" style={{ height: "100%" }}>
              <div
                className="absolute bottom-0 w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: `${(d.value / max) * 82}%`,
                  background: `linear-gradient(180deg, ${color}, transparent 160%)`,
                  boxShadow: `0 0 12px -4px ${color}`,
                  opacity: 0.85,
                }}
              />
              <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border border-frost-blue/15 bg-black/90 px-1.5 py-0.5 font-mono text-[9px] text-white group-hover:block">
                {d.label}: {d.value}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[8px] text-white/25">
        <span>{data[0]?.label}</span>
        <span>max {max}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
