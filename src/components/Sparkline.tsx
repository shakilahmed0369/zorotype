import { useState } from "react";
import type { MouseEvent } from "react";
import type { WpmSnapshot } from "@/lib/types";

const W = 1000;
const H = 260;
const PAD_LEFT = 70;
const PAD_RIGHT = 30;
const PAD_TOP = 30;
const PAD_BOTTOM = 46;

export function Sparkline({ points }: { points: WpmSnapshot[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) return null;

  const last = points[points.length - 1];
  const peak = Math.max(...points.map((p) => Math.max(p.wpm, p.raw)), 1);
  const yMax = Math.max(20, Math.ceil(peak / 20) * 20);
  const totalTime = Math.max(last.time, 1);

  const xAt = (time: number) => PAD_LEFT + (time / totalTime) * (W - PAD_LEFT - PAD_RIGHT);
  const yAt = (value: number) => PAD_TOP + (1 - value / yMax) * (H - PAD_TOP - PAD_BOTTOM);
  const path = (values: number[]) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(p.time)},${yAt(values[i])}`).join(" ");

  const wpms = points.map((p) => p.wpm);
  const raws = points.map((p) => p.raw);
  const errorTicks = points.map((p, i) => ({ ...p, i })).filter((p) => p.errors > 0);
  const yTicks = [0, yMax / 2, yMax];
  const xTicks = Array.from(new Set([0, Math.round(totalTime / 2), totalTime])).sort((a, b) => a - b);
  const hovered = hoverIndex === null ? null : points[hoverIndex];

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const time = ((ratio - PAD_LEFT / W) / ((W - PAD_LEFT - PAD_RIGHT) / W)) * totalTime;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.time - time) < Math.abs(points[nearest].time - time)) nearest = i;
    });
    setHoverIndex(nearest);
  };

  return (
    <div className="relative w-full max-w-[720px]">
      <div className="flex items-center gap-[18px] text-[11px] uppercase tracking-[1px] mb-[8px]">
        <span className="flex items-center gap-[6px] text-accent">
          <span className="inline-block w-[12px] h-[3px] rounded bg-accent" />
          wpm
        </span>
        <span className="flex items-center gap-[6px] text-muted">
          <span className="inline-block w-[12px] h-[3px] rounded bg-muted" />
          raw
        </span>
        <span className="flex items-center gap-[5px] text-error">
          <span className="text-[13px] leading-none">✕</span>
          errors
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((value) => (
          <g key={value}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={yAt(value)}
              y2={yAt(value)}
              className="stroke-edge [stroke-width:1]"
            />
            <text x={PAD_LEFT - 12} y={yAt(value) + 5} textAnchor="end" className="fill-muted [font-size:16px]">
              {value}
            </text>
          </g>
        ))}

        {xTicks.map((time) => (
          <text
            key={time}
            x={xAt(time)}
            y={H - 14}
            textAnchor={time === 0 ? "start" : time === totalTime ? "end" : "middle"}
            className="fill-muted [font-size:16px]"
          >
            {time}s
          </text>
        ))}

        <path
          d={path(raws)}
          className="fill-none stroke-muted opacity-40 [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]"
        />
        <path
          d={path(wpms)}
          className="fill-none stroke-accent [stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round]"
        />

        <line
          x1={PAD_LEFT}
          x2={W - PAD_RIGHT}
          y1={yAt(last.wpm)}
          y2={yAt(last.wpm)}
          className="stroke-accent opacity-50 [stroke-width:2] [stroke-dasharray:8_8]"
        />
        <text x={W - PAD_RIGHT} y={yAt(last.wpm) - 8} textAnchor="end" className="fill-muted [font-size:16px]">
          avg {last.wpm}
        </text>

        {errorTicks.map((p) => (
          <g key={`error-${p.i}`} className="stroke-error [stroke-width:3] [stroke-linecap:round]">
            <line x1={xAt(p.time) - 6} y1={yAt(p.wpm) - 6} x2={xAt(p.time) + 6} y2={yAt(p.wpm) + 6} />
            <line x1={xAt(p.time) - 6} y1={yAt(p.wpm) + 6} x2={xAt(p.time) + 6} y2={yAt(p.wpm) - 6} />
          </g>
        ))}

        {hovered && (
          <>
            <line
              x1={xAt(hovered.time)}
              x2={xAt(hovered.time)}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              className="stroke-edge [stroke-width:1]"
            />
            <circle cx={xAt(hovered.time)} cy={yAt(hovered.raw)} r={5} className="fill-muted" />
            <circle cx={xAt(hovered.time)} cy={yAt(hovered.wpm)} r={6} className="fill-accent" />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-[30px] z-10 flex flex-col gap-[2px] bg-bg border border-edge rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.35)]"
          style={{ left: `${Math.min(Math.max((xAt(hovered.time) / W) * 100, 4), 84)}%` }}
        >
          <span className="text-muted">{hovered.time}s</span>
          <span className="text-accent">{hovered.wpm} wpm</span>
          <span className="text-muted">{hovered.raw} raw</span>
          <span className={hovered.errors > 0 ? "text-error" : "text-muted"}>
            {hovered.errors} error{hovered.errors === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
