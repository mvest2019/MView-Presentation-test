/**
 * THE CHART'S ARITHMETIC — no JSX, no React, no colours.
 *
 * Everything the financials chart needs to turn numbers into coordinates lives
 * here so the component is markup and state. It is also the only part of the
 * chart worth reading twice, because a scale that is subtly wrong draws a
 * plausible picture of the wrong data.
 *
 * ONE FIXED viewBox, SCALED TO THE CONTAINER. The SVG is authored at 1000 units
 * wide and displayed at whatever width the card gives it, so there is no
 * measuring, no resize observer and no re-render on a window drag — the browser
 * scales the whole drawing, text included.
 */

export const CHART = { width: 1000, height: 340 } as const;

/**
 * The drawing area inside the axes. `left` and `right` are inset far enough for
 * a five-character tick label on each side — the chart carries two value axes,
 * gas on the left and oil on the right, because one shared scale would flatten
 * the oil line onto the floor.
 */
export const PLOT = { left: 56, right: 944, top: 16, bottom: 264 } as const;

/** Where the month labels and the posted/forecast chips sit. */
export const AXIS_LABEL_Y = 290;
export const CHIP_Y = 306;

/** Five gridlines: the floor, the ceiling and three between. */
export const TICK_COUNT = 4;

/**
 * THE CEILING OF AN AXIS, ROUNDED UP TO SOMETHING READABLE.
 *
 * The unit is half an order of magnitude — 5,000 for a peak in the twenty
 * thousands, 500 for a peak in the low thousands — so a 20,918 MCF peak gives a
 * 25,000 ceiling and a 1,909 BBL peak gives 2,000. Rounding to a full order of
 * magnitude instead would put that first axis at 30,000 and waste a fifth of
 * the plot on empty air.
 */
export function axisMax(peak: number): number {
  if (peak <= 0) return 1;
  const unit = 10 ** Math.floor(Math.log10(peak)) / 2;
  return Math.ceil(peak / unit) * unit;
}

/** The tick VALUES for an axis — evenly spaced, floor to ceiling. */
export function axisTicks(max: number): number[] {
  return Array.from(
    { length: TICK_COUNT + 1 },
    (_, step) => (max / TICK_COUNT) * step,
  );
}

/**
 * `25K`, `500`, `$3.2M`.
 *
 * ROUNDED TO WHOLE THOUSANDS ABOVE A THOUSAND, WHICH IS WHY AN AXIS CAN PRINT
 * THE SAME LABEL TWICE. A 2,000-barrel axis ticks at 1,500 and 2,000 and both
 * read "2K". That is the design's own behaviour and it is the right trade: the
 * gridline positions carry the precision, and a label reading "1.5K" beside
 * "25K" on the other axis makes the two axes look like different instruments.
 */
export function formatTick(value: number, money: boolean): string {
  const prefix = money ? "$" : "";
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${prefix}${Math.round(value / 1000)}K`;
  return `${prefix}${Math.round(value)}`;
}

/** Horizontal position of a series index inside the visible window. */
export function xAt(index: number, from: number, to: number): number {
  const span = Math.max(to - from, 1);
  return PLOT.left + ((index - from) / span) * (PLOT.right - PLOT.left);
}

/** Vertical position of a value against an axis ceiling. */
export function yAt(value: number, max: number): number {
  const clamped = Math.max(0, Math.min(value, max));
  return PLOT.bottom - (clamped / max) * (PLOT.bottom - PLOT.top);
}

/**
 * A polyline through one slice of a series.
 *
 * `from`/`to` are inclusive and clamped, so a caller can ask for the forecast
 * half by passing the last posted index as `from` — which is what draws the
 * solid and dashed halves as two paths that MEET rather than two that leave a
 * gap at the join.
 */
export function linePath(
  values: number[],
  from: number,
  to: number,
  windowFrom: number,
  windowTo: number,
  max: number,
): string {
  const start = Math.max(from, 0);
  const end = Math.min(to, values.length - 1);
  let path = "";
  for (let index = start; index <= end; index += 1) {
    const x = xAt(index, windowFrom, windowTo).toFixed(1);
    const y = yAt(values[index], max).toFixed(1);
    path += `${path ? "L" : "M"}${x} ${y}`;
  }
  return path;
}

/** The largest value in a slice — what an axis ceiling is built from. */
export function peakIn(values: number[], from: number, to: number): number {
  let peak = 0;
  for (let index = Math.max(from, 0); index <= Math.min(to, values.length - 1); index += 1) {
    if (values[index] > peak) peak = values[index];
  }
  return peak;
}

/**
 * WHICH MONTHS GET A LABEL — evenly spaced across the window, ending on the
 * last month.
 *
 * `gaps` IS HOW MANY INTERVALS THE CALLER WANTS, not how many labels, because
 * that is the number the spacing is actually derived from. Seven suits the wide
 * Financials chart, where a 49-month window lands on a clean seven-month step;
 * five suits the narrower revenue chart, where seven would put a label every
 * four months and crowd the axis.
 *
 * THE LAST MONTH IS ALWAYS LABELLED. A chart whose final tick is three months
 * short of its right edge looks like it is missing data rather than rounding
 * its labels — so the final regular tick is REPLACED when it lands close to the
 * edge, and the edge appended when it does not. Replacing rather than always
 * appending is what stops two labels overprinting each other.
 */
export function labelIndices(from: number, to: number, gaps = 7): number[] {
  const span = to - from;
  const step = Math.max(1, Math.round(span / gaps));
  const out: number[] = [];
  for (let index = from; index <= to; index += step) out.push(index);

  const last = out[out.length - 1];
  if (last !== to) {
    if (to - last <= step / 2) out[out.length - 1] = to;
    else out.push(to);
  }
  return out;
}
