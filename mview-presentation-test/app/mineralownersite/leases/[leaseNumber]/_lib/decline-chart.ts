import type { MonthlySeries } from "./lease-report-types";

/**
 * THE DECLINE CHART'S MATHS — axis ticks, scales, paths. No React, no DOM.
 *
 * Kept apart from the component because two of these decisions are the kind that
 * get quietly wrong and stay wrong: the axis tick rounding, and what a log scale
 * does with a zero. Both are testable as functions and neither is testable
 * through a chart.
 */

export const CHART = { width: 740, gasHeight: 250, oilHeight: 160 } as const;
export const PLOT = { left: 52, right: 726, top: 14 } as const;

/** `"2012-10"` + 39 → `"Jan 2016"`. Index 0 is the first posted month. */
export function monthLabel(firstMonth: string, index: number): string {
  const NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const [year, month] = firstMonth.split("-").map(Number);
  const total = (year * 12 + (month - 1)) + index;
  return `${NAMES[total % 12]} ${Math.floor(total / 12)}`;
}

/**
 * NICE, EVEN AXIS TICKS — 0 / 20 / 40 / 60 / 80, never 0 / 39 / 78.
 *
 * The design's rule, and the reason it needs stating: the obvious
 * implementation is `max / 4`, which on a max of 157 gives ticks at 39.25. A
 * reader cannot hold 39.25 in their head, so the step is snapped UP to the next
 * 1/2/5 × 10^n and the axis is allowed to overshoot the data instead.
 */
export function axisTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

export interface Scale {
  x: (index: number) => number;
  y: (value: number) => number;
  ticks: number[];
  max: number;
}

/**
 * Build the scale for a window of months.
 *
 * ── WHY THE LOG SCALE HAS A FLOOR ──
 *
 * Engineers judge a decline fit on a log rate axis, which is why the toggle
 * exists. But this well posted several genuine ZERO months (shut in), and
 * `log10(0)` is `-Infinity` — it would take the axis and every path with it. So
 * log mode maps anything at or below 1 to the axis floor. That is a drawing
 * decision, not a data one: the zero is still a zero in the series, the CSV and
 * the tooltip.
 */
export function buildScale({
  values,
  from,
  to,
  height,
  log,
}: {
  values: number[];
  from: number;
  to: number;
  height: number;
  log: boolean;
}): Scale {
  const bottom = height - 26;
  const max = Math.max(...values, 1);
  const ticks = log ? [] : axisTicks(max);
  const axisMax = log ? max : (ticks[ticks.length - 1] ?? max);
  const span = Math.max(to - from, 1);

  const logFloor = 1;
  const toLog = (v: number) => Math.log10(Math.max(v, logFloor));
  const logTop = toLog(axisMax);

  return {
    x: (index) =>
      PLOT.left + ((index - from) / span) * (PLOT.right - PLOT.left),
    y: (value) => {
      if (log) {
        const t = logTop === 0 ? 0 : toLog(value) / logTop;
        return bottom - t * (bottom - PLOT.top);
      }
      return bottom - (value / axisMax) * (bottom - PLOT.top);
    },
    ticks: log ? logTicks(axisMax) : ticks,
    max: axisMax,
  };
}

/** Decade ticks for a log axis — 1, 10, 100, 1000 up to the max. */
function logTicks(max: number): number[] {
  const out: number[] = [];
  for (let power = 0; 10 ** power <= max * 1.0001; power += 1) {
    out.push(10 ** power);
  }
  return out;
}

/**
 * A polyline through a series, BROKEN AT EVERY GAP.
 *
 * Returns one `d` string with a fresh `M` after each null, so a month with no
 * posting leaves a hole rather than a straight line drawn across it. A line that
 * bridges missing months is a claim that production continued through them,
 * which for this well would be false eleven times over.
 */
export function seriesPath(
  series: MonthlySeries,
  scale: Scale,
  from: number,
  to: number,
): string {
  let d = "";
  let open = false;
  for (let i = from; i <= to && i < series.length; i += 1) {
    const value = series[i];
    if (value === null || value === undefined) {
      open = false;
      continue;
    }
    d += `${open ? "L" : "M"}${scale.x(i).toFixed(1)} ${scale.y(value).toFixed(1)}`;
    open = true;
  }
  return d;
}

/** The filled band between two series, or `""` where either has no data. */
export function bandPath(
  low: MonthlySeries,
  high: MonthlySeries,
  scale: Scale,
  from: number,
  to: number,
): string {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = from; i <= to && i < high.length; i += 1) {
    const hi = high[i];
    const lo = low[i];
    if (hi === null || lo === null || hi === undefined || lo === undefined) continue;
    top.push(`${scale.x(i).toFixed(1)},${scale.y(hi).toFixed(1)}`);
    bottom.unshift(`${scale.x(i).toFixed(1)},${scale.y(lo).toFixed(1)}`);
  }
  if (!top.length) return "";
  return `M${top.join("L")}L${bottom.join("L")}Z`;
}

/** Every non-null value inside the window — what the scale is built from. */
export function windowValues(
  serieses: MonthlySeries[],
  from: number,
  to: number,
): number[] {
  const out: number[] = [];
  for (const series of serieses) {
    for (let i = from; i <= to && i < series.length; i += 1) {
      const v = series[i];
      if (v !== null && v !== undefined) out.push(v);
    }
  }
  return out;
}
