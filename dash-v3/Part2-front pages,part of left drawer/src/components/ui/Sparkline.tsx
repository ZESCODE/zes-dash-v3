import { useId } from "react";
import type { FrostColor } from "@/lib/types";
import { FROST_HEX } from "@/lib/theme";

/** Lightweight SVG sparkline used in agent cards & metric tiles. */
export function Sparkline({
  data,
  color = "blue",
  height = 34,
  className,
}: {
  data: number[];
  color?: Exclude<FrostColor, "gray">;
  height?: number;
  className?: string;
}) {
  const id = useId();
  const w = 100;
  const h = height;
  const max = Math.max(100, ...data);
  const min = Math.min(0, ...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const stroke = FROST_HEX[color];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={stroke} />
    </svg>
  );
}
