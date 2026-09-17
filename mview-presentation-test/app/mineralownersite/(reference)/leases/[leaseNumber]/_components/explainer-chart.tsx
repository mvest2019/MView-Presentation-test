"use client";

import { useId, useState } from "react";

/**
 * THE EXPLAINER'S OWN MINI CHART — `dashboard-reference.css`'s `.lc` block.
 *
 * ── IT IS IN THE PANEL BECAUSE A TREND IS NOT A SENTENCE ──
 *
 * The section above it can say the value is a projection of what these wells
 * will produce; only a line can say whether that production is holding up or
 * falling away. The reference puts these inside its drawer for exactly that
 * reason and this is the same block: head, readout, area, axis, footnote.
 *
 * ── THE READOUT IS THE POINT, NOT THE PICTURE ──
 *
 * Hover — or arrow-key, once the chart has focus — and the row above the plot
 * names the period and prints its exact figure. A chart this small cannot be
 * read against an axis to any useful precision, so it does not pretend to have
 * one: there are no gridlines and no tick labels, and the only numbers on it
 * are the first period, the peak and the last. Everything else comes from the
 * readout, which is a real filed figure rather than an estimate off a scale.
 *
 * ── IT SNAPS, AND IT STARTS AT ZERO ──
 *
 * The cursor rounds to the nearest period because the line between two filings
 * is drawn, not measured. And the floor is zero because these are VOLUMES: half
 * as much gas is a real comparison, and a truncated axis would draw a cliff
 * where the record has a slope.
 *
 * ── ARROW KEYS, BECAUSE HOVER IS NOT AN INPUT EVERYONE HAS ──
 *
 * The svg is focusable and Left/Right move the cursor. Without it the exact
 * figures in here would be reachable with a mouse and by no other means, which
 * on a panel whose whole job is provenance is the wrong thing to make optional.
 */

const VIEW = { width: 600, height: 132 } as const;
const PAD = { left: 4, right: 4, top: 10, bottom: 6 } as const;

export interface ExplainerChart {
  title: string;
  /** The right-hand note on the head — "24 months to June 2026". */
  window: string;
  /** One label per point — "Jul 2024". Only the ends are printed. */
  labels: string[];
  values: number[];
  unit: string;
  tone: "gas" | "oil" | "cash";
  footnote?: string;
}

const INK = {
  gas: "var(--color-mv-green-deep)",
  oil: "var(--color-mv-oil)",
  cash: "var(--color-mv-cash)",
} as const;

export function ExplainerChartBlock({ chart }: { chart: ExplainerChart }) {
  const [cursor, setCursor] = useState<number | null>(null);
  const gradientId = useId();

  const count = chart.values.length;
  const last = count - 1;
  const peak = Math.max(...chart.values, 0);
  /* Zero floor — see the note above. The ceiling gets a little air so the peak
     is a point on the plot rather than a flat spot along its top edge. */
  const ceiling = peak > 0 ? peak * 1.08 : 1;

  const x = (index: number): number =>
    PAD.left +
    (count > 1 ? index / (count - 1) : 0) * (VIEW.width - PAD.left - PAD.right);
  const y = (value: number): number =>
    VIEW.height -
    PAD.bottom -
    (value / ceiling) * (VIEW.height - PAD.top - PAD.bottom);

  const line = chart.values
    .map(
      (value, index) =>
        `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`,
    )
    .join("");
  const area = `${line}L${x(last).toFixed(1)} ${VIEW.height - PAD.bottom}L${x(0).toFixed(1)} ${VIEW.height - PAD.bottom}Z`;

  /* With no pointer on it the readout shows the newest period, because that is
     the reading somebody opening the panel wants first. */
  const readIndex = cursor ?? last;
  const ink = INK[chart.tone];

  function track(event: React.PointerEvent<SVGSVGElement>): void {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const units = ((event.clientX - box.left) / box.width) * VIEW.width;
    const span = VIEW.width - PAD.left - PAD.right;
    const raw = ((units - PAD.left) / span) * (count - 1);
    setCursor(Math.min(last, Math.max(0, Math.round(raw))));
  }

  function key(event: React.KeyboardEvent<SVGSVGElement>): void {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    setCursor(Math.min(last, Math.max(0, readIndex + step)));
  }

  return (
    <section className="mb-2.5 rounded-[11px] border border-mv-line bg-[#fbfdfc] px-[13px] pt-3 pb-2.5 last:mb-0">
      <div className="mb-0.5 flex flex-wrap items-baseline justify-between gap-2.5">
        <strong className="text-[12.5px]">{chart.title}</strong>
        <span className="text-[10.5px] text-mv-muted">{chart.window}</span>
      </div>

      <div
        aria-live="polite"
        className="mb-1 flex min-h-[26px] flex-wrap items-baseline gap-x-3 gap-y-1.5 text-[11.5px]"
      >
        <span className="text-[11px] font-extrabold tracking-[0.03em] text-mv-green-deep uppercase">
          {chart.labels[readIndex]}
        </span>
        <span className="inline-flex items-baseline gap-[5px]">
          <i
            aria-hidden="true"
            style={{ background: ink }}
            className="h-2 w-2 flex-none rounded-[2px]"
          />
          <b className="text-[14px] font-extrabold tabular-nums">
            {Math.round(chart.values[readIndex]).toLocaleString("en-US")}
            <u className="ml-1 text-[10.5px] font-bold text-mv-muted no-underline">
              {chart.unit}
            </u>
          </b>
        </span>
        <span className="ml-auto text-[10px] text-mv-muted">
          {cursor === null
            ? "hover or arrow-key any period"
            : `${readIndex + 1} of ${count}`}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        preserveAspectRatio="none"
        tabIndex={0}
        role="img"
        aria-label={`${chart.title}, ${chart.window}. Peak ${Math.round(peak).toLocaleString("en-US")} ${chart.unit}; newest ${Math.round(chart.values[last]).toLocaleString("en-US")} ${chart.unit}.`}
        onPointerMove={track}
        onPointerLeave={() => setCursor(null)}
        onKeyDown={key}
        className="block h-[132px] w-full cursor-crosshair touch-pan-y overflow-visible focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green"
      >
        {/* A FADE, NOT A SLAB. A flat wash the full height of the plot reads
            as a filled shape whose top edge is the data; a gradient that
            thins toward the floor keeps the eye on the line and lets the
            dashed mean show through. `gradientId` is per chart because two of
            these share a panel and a duplicated id makes the second one
            inherit the first's stops. */}
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={ink} stopOpacity={0.22} />
            <stop offset="100%" stopColor={ink} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        {/* The mean, so the eye has something to read the shape against without
            a gridline making the card look like a full chart. */}
        <line
          x1={x(0)}
          x2={x(last)}
          y1={y(chart.values.reduce((sum, v) => sum + v, 0) / count)}
          y2={y(chart.values.reduce((sum, v) => sum + v, 0) / count)}
          stroke={ink}
          strokeOpacity={0.3}
          strokeWidth={1}
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line}
          fill="none"
          stroke={ink}
          strokeWidth={1.8}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {cursor !== null && (
          <line
            x1={x(readIndex)}
            x2={x(readIndex)}
            y1={PAD.top}
            y2={VIEW.height - PAD.bottom}
            stroke={ink}
            strokeOpacity={0.45}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {/* `r` in viewBox units would be an ellipse: this svg does not preserve
            its aspect ratio, so the dot is drawn as a tiny square path instead
            and the browser is never asked to scale a circle unevenly. */}
        <rect
          x={x(readIndex) - 3}
          y={y(chart.values[readIndex]) - 3}
          width={6}
          height={6}
          rx={3}
          fill={ink}
          stroke="#fff"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-[5px] flex items-baseline justify-between gap-2 text-[10px] text-mv-muted">
        <span>{chart.labels[0]}</span>
        <span className="tabular-nums">
          peak {Math.round(peak).toLocaleString("en-US")} {chart.unit}
        </span>
        <span>{chart.labels[last]}</span>
      </div>

      {chart.footnote && (
        <p className="mt-2 text-[10.5px] leading-[1.5] text-mv-muted">
          {chart.footnote}
        </p>
      )}
    </section>
  );
}
