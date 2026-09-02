/**
 * THE PRODUCTION CHART'S GEOMETRY — ported function for function from the
 * reference's own inline script (`owner/src/routes/app-production.html`).
 *
 * WHY IT IS A SEPARATE, PURE MODULE. The interactive chart is a client
 * component, and the temptation with an SVG this involved is to build a string
 * and hand it to `innerHTML`, which is what the reference does. Doing that here
 * would mean the chart could only be drawn in the browser, so the page would
 * ship with an EMPTY plot until JavaScript arrived — the reference's own
 * behaviour, and its one genuine defect on this route: `<g id="pf2Plot">` is
 * empty in the markup and stays empty until `render()` runs.
 *
 * Keeping the maths here and rendering declaratively in JSX means the server
 * already emits the full chart at the default window, and hydration only adds
 * the interactions. Same geometry, same output, no blank first paint.
 *
 * THE VIEWBOX IS FIXED AND NEVER MEASURED FROM THE DOM — the reference's own
 * comment says so, and it is what lets the same numbers be computed on the
 * server and in the browser and agree exactly.
 */

import { CASPER_SEAM, casperSeries } from "./portal-production-data";

/* ----------------------------------------------------------------------------
   The plot box, in viewBox units. `L`/`R` are the axis gutters; `T`/`B` the
   plot's top and baseline.
   ---------------------------------------------------------------------------- */
export const CHART = {
  W: 760,
  H: 300,
  L: 68,
  R: 692,
  T: 26,
  B: 250,
} as const;

/** The narrowest window the brush allows, in months. */
export const MIN_WINDOW = 5;

/** Total months in the series. */
export const MONTHS = casperSeries.labels.length;

/** The last selectable index. */
export const LAST = MONTHS - 1;

/**
 * Pick a clean axis top: a step from the 1 / 2 / 2.5 / 5 ladder, at most six
 * divisions. Ported exactly — the ladder and the six-division cap are what
 * keep the axis labels round as the brush rescales.
 */
export function niceAxis(max: number): { step: number; top: number } {
  const steps = [1, 2, 2.5, 5];
  if (max <= 0) return { step: 1, top: 1 };
  for (let p = 1; p <= 1e8; p *= 10) {
    for (let i = 0; i < 4; i++) {
      const st = steps[i] * p;
      if (Math.ceil(max / st) <= 6) {
        return { step: st, top: Math.ceil(max / st) * st };
      }
    }
  }
  return { step: max, top: max };
}

/** en-US grouping, matching the reference's `toLocaleString('en-US')`. */
export function fmt(v: number): string {
  return v.toLocaleString("en-US");
}

/**
 * Everything the detailed chart needs for one window, computed once.
 *
 * `a` and `b` are inclusive month indexes. The caller has already clamped them;
 * this does not re-clamp, so a bad window shows up as a bad chart rather than
 * being silently corrected into a different one.
 */
export interface ChartFrame {
  a: number;
  b: number;
  /** Axis tops for the two independent scales. */
  oilTop: number;
  oilStep: number;
  gasTop: number;
  gasStep: number;
  x: (i: number) => number;
  yOil: (v: number) => number;
  yGas: (v: number) => number;
  /** The gridline / label values, oil scale. */
  oilTicks: number[];
  gasTicks: number[];
  /** Month indexes to label on the x-axis. */
  xTicks: number[];
}

export function chartFrame(a: number, b: number): ChartFrame {
  const { L, R, T, B } = CHART;
  const { oil, gas } = casperSeries;

  let oMax = 0;
  let gMax = 0;
  for (let i = a; i <= b; i++) {
    if (oil[i] > oMax) oMax = oil[i];
    if (gas[i] > gMax) gMax = gas[i];
  }
  const so = niceAxis(oMax);
  const sg = niceAxis(gMax);

  const x = (i: number) => L + ((i - a) * (R - L)) / (b - a);
  const yOil = (v: number) => B - (v / so.top) * (B - T);
  const yGas = (v: number) => B - (v / sg.top) * (B - T);

  const ticksFor = (step: number, top: number) => {
    const out: number[] = [];
    for (let v = step; v <= top; v += step) out.push(v);
    return out;
  };

  /* The x-axis picks at most eight labels and always pins the last one to the
     window's end, so the right edge is never an unlabelled month. */
  const kstep = Math.max(1, Math.ceil((b - a) / 7));
  const xTicks: number[] = [];
  for (let i = a; i <= b; i += kstep) xTicks.push(i);
  if (xTicks[xTicks.length - 1] < b - kstep * 0.4) xTicks.push(b);
  else xTicks[xTicks.length - 1] = b;

  return {
    a,
    b,
    oilTop: so.top,
    oilStep: so.step,
    gasTop: sg.top,
    gasStep: sg.step,
    x,
    yOil,
    yGas,
    oilTicks: ticksFor(so.step, so.top),
    gasTicks: ticksFor(sg.step, sg.top),
    xTicks,
  };
}

/** A polyline `points` string over an inclusive index range. */
export function points(
  arr: readonly number[],
  from: number,
  to: number,
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  const out: string[] = [];
  for (let i = from; i <= to; i++) {
    out.push(`${x(i).toFixed(1)},${y(arr[i]).toFixed(1)}`);
  }
  return out.join(" ");
}

/** Keep a centred label inside the plot box. */
export function clampLabel(x: number, margin: number): number {
  return Math.max(CHART.L + margin, Math.min(CHART.R - margin, x));
}

/* ----------------------------------------------------------------------------
   THE BRUSH'S CONTEXT SPARKLINES

   A fixed 0..111 x 0..28 viewBox stretched to fit with
   `preserveAspectRatio="none"`, so these are computed once at module scope
   rather than per render — they never change with the window.
   ---------------------------------------------------------------------------- */
function contextPoints(arr: readonly number[], max: number): string {
  const out: string[] = [];
  for (let i = 0; i < MONTHS; i++) {
    out.push(`${i},${(26.5 - (arr[i] / max) * 24).toFixed(1)}`);
  }
  return out.join(" ");
}

export const CONTEXT_OIL = contextPoints(
  casperSeries.oil,
  casperSeries.oilMax,
);
export const CONTEXT_GAS = contextPoints(
  casperSeries.gas,
  casperSeries.gasMax,
);

/* ----------------------------------------------------------------------------
   THE ESSENTIALS CHART

   One line, no second axis, no brush, no tooltip. Deterministic, so it is
   computed here and rendered by a SERVER component — it ships no JavaScript at
   all. Its own geometry, which is not the detailed chart's.
   ---------------------------------------------------------------------------- */
export const SIMPLE = {
  W: 760,
  H: 230,
  L: 58,
  R: 724,
  T: 34,
  B: 176,
} as const;

export function simpleX(i: number): number {
  return SIMPLE.L + (i * (SIMPLE.R - SIMPLE.L)) / LAST;
}

export function simpleY(v: number): number {
  return SIMPLE.B - (v / casperSeries.oilMax) * (SIMPLE.B - SIMPLE.T);
}

/** Solid half — the posted actuals, index 0 through the seam. */
export const SIMPLE_ACTUAL = (() => {
  const out: string[] = [];
  for (let i = 0; i <= CASPER_SEAM; i++) {
    out.push(`${simpleX(i).toFixed(1)},${simpleY(casperSeries.oil[i]).toFixed(1)}`);
  }
  return out.join(" ");
})();

/** Dashed half — the projection. Starts AT the seam so the two lines meet. */
export const SIMPLE_FORECAST = (() => {
  const out: string[] = [];
  for (let i = CASPER_SEAM; i < MONTHS; i++) {
    out.push(`${simpleX(i).toFixed(1)},${simpleY(casperSeries.oil[i]).toFixed(1)}`);
  }
  return out.join(" ");
})();
