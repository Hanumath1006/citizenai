import * as React from "react";
import { cn } from "@/lib/utils";
import { axisDate, compactNumber } from "@/lib/admin/format";
import type { SeriesPoint, RankedItem } from "@/lib/admin/queries";

/* ──────────────────────────────────────────────────────────────
   Charts, drawn as plain SVG.

   A charting library would add ~50KB and force these panels to become
   client components purely to render a static picture. The shapes here are
   simple enough to compute directly, so the whole admin dashboard stays
   server-rendered with no client JS.
   ────────────────────────────────────────────────────────────── */

/** Round an axis maximum up to a clean 1/2/5 × 10ⁿ so gridlines read well. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function AreaChart({
  id,
  data,
  color = "#6d5efc",
  formatValue = (n: number) => compactNumber(n),
  className,
}: {
  /** Unique per chart on the page — namespaces the SVG gradient. */
  id: string;
  data: SeriesPoint[];
  color?: string;
  formatValue?: (n: number) => string;
  className?: string;
}) {
  if (!data.length) return null;

  const W = 720;
  const H = 240;
  const padL = 52;
  const padR = 16;
  const padT = 18;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const rawMax = Math.max(...data.map((d) => d.value));
  const max = niceCeil(rawMax || 1);

  const x = (i: number) =>
    data.length === 1
      ? padL + innerW / 2
      : padL + (i / (data.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  // Thin the x labels so they never collide on a narrow viewport.
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const peakIndex = data.reduce(
    (best, d, i) => (d.value > data[best].value ? i : best),
    0
  );
  const gradientId = `area-gradient-${id}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full", className)}
      role="img"
      aria-label={`Trend from ${data[0].date} to ${data[data.length - 1].date}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke="#e7e7ea"
            strokeWidth="1"
          />
          <text
            x={padL - 10}
            y={y(t) + 4}
            textAnchor="end"
            className="fill-[#9a9aa3] text-[11px]"
          >
            {formatValue(t)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {data.map((d, i) => (
        <circle
          key={d.date}
          cx={x(i)}
          cy={y(d.value)}
          r={i === peakIndex ? 4 : 2.5}
          fill={i === peakIndex ? color : "#ffffff"}
          stroke={color}
          strokeWidth="2"
        />
      ))}

      {data.map((d, i) =>
        i % labelEvery === 0 || i === data.length - 1 ? (
          <text
            key={d.date}
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            className="fill-[#9a9aa3] text-[11px]"
          >
            {axisDate(d.date)}
          </text>
        ) : null
      )}

      {rawMax > 0 && (
        <g>
          <rect
            x={x(peakIndex) - 22}
            y={y(data[peakIndex].value) - 30}
            width="44"
            height="20"
            rx="6"
            fill={color}
          />
          <text
            x={x(peakIndex)}
            y={y(data[peakIndex].value) - 16}
            textAnchor="middle"
            className="fill-white text-[11px] font-semibold"
          >
            {formatValue(data[peakIndex].value)}
          </text>
        </g>
      )}
    </svg>
  );
}

/** Compact trend line with no axes — for tucking beside a headline number. */
export function Sparkline({
  data,
  color = "#6d5efc",
  className,
}: {
  data: SeriesPoint[];
  color?: string;
  className?: string;
}) {
  if (data.length < 2) return null;
  const W = 240;
  const H = 44;
  const max = Math.max(1, ...data.map((d) => d.value));
  const path = data
    .map((d, i) => {
      const px = (i / (data.length - 1)) * W;
      const py = H - (d.value / max) * (H - 6) - 3;
      return `${i === 0 ? "M" : "L"}${px},${py}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} aria-hidden>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Ranked horizontal bars. Bars are scaled against the top item rather than
 * the total, so the shape of the ranking stays readable when one entry
 * dominates or when everything is bunched together.
 */
export function BarList({
  items,
  color = "#6d5efc",
  showRank = false,
  valueMode = "count",
  icons,
}: {
  items: RankedItem[];
  color?: string;
  showRank?: boolean;
  /** "count" shows the raw number, "share" shows the percentage. */
  valueMode?: "count" | "share";
  icons?: Record<string, React.ReactNode>;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ol className="space-y-3">
      {items.map((item, index) => {
        const width = `${Math.max(3, (item.value / max) * 100)}%`;
        const display =
          valueMode === "share" && item.share != null
            ? `${Math.round(item.share * 100)}%`
            : compactNumber(item.value);

        return (
          <li key={item.label} className="flex items-center gap-3">
            {showRank && (
              <span className="w-4 shrink-0 text-xs tabular-nums text-faint">
                {index + 1}
              </span>
            )}
            {icons?.[item.label] && (
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-line-soft">
                {icons[item.label]}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-ink-soft">
                  {item.label}
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {display}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div
                  className="h-full rounded-full"
                  style={{ width, backgroundColor: color }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Segmented single bar — for a distribution that sums to a whole. */
export function StackedBar({
  items,
  colors,
}: {
  items: RankedItem[];
  colors: string[];
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-line-soft">
        {items.map((item, i) => (
          <div
            key={item.label}
            style={{
              width: `${(item.value / total) * 100}%`,
              backgroundColor: colors[i % colors.length],
            }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="flex-1 capitalize text-ink-soft">{item.label}</span>
            <span className="font-medium tabular-nums">
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
