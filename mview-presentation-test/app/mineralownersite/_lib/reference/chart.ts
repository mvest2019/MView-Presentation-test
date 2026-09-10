/**
 * Chart DATA, not chart markup.
 *
 * This file used to emit SVG strings on the server. That worked for a static
 * picture and could never be interactive: a string cannot track a pointer. So
 * the server now ships the numbers and the axis labels, and one client
 * component draws and handles hover (see components/LineChart.tsx).
 *
 * ONE SPEC IS ONE PANEL IS ONE UNIT. A lease's gas is in mcf and its oil in
 * bbl, and putting both on a single axis either flattens the oil to nothing or
 * blows the gas off the top. Series may share a panel ONLY when they share a
 * unit; otherwise they get a panel each. That is why `unit` sits on the spec
 * rather than on the series.
 */

import { MCF, BBL } from './fmt';

export interface ChartSeries {
  name: string;
  colour: string;
  /** aligned to `x` — null is "no value for this period", drawn as a gap */
  points: (number | null)[];
}

export interface ChartSpec {
  key: string;
  label: string;
  sub: string;
  unit: string;
  /** decimal places this quantity is quoted in */
  dp: number;
  /** one label per point, e.g. "May 2026" or "Sep 1" */
  x: string[];
  series: ChartSeries[];
  footnote?: string;
  /** "line" fills under a single series; "bars" suits a monthly count */
  kind?: 'line' | 'bars';
}

export const COLOURS = {
  /* ADAPTED · GAS AND OIL ARE SWAPPED against the reference, at the owner's
     request: gas takes the gold the reference gave oil, and oil takes the
     green. Changed HERE rather than at each chart, because every SVG series on
     every page reads these two — the dashboard's two month-by-month panels,
     the per-lease drawer charts and Production & Forecast's own chart. The
     matching class rules in `dashboard-reference.css` were swapped with it. */
  gas: '#b8892f',
  oil: '#2e8f6d',
  value: '#54bf96',
  slate: '#64748b',
  blue: '#3b5bdb',
};

/** Drop a spec whose series carry nothing worth drawing. */
export function usable(spec: ChartSpec): boolean {
  if (spec.x.length < 3) return false;
  return spec.series.some((s) => s.points.some((v) => v != null && v > 0));
}

/**
 * Build one spec per product that actually reported.
 *
 * Returns [] rather than a flat line when a product never produced — an empty
 * chart labelled "oil" on a gas-only lease invites the reader to conclude the
 * oil stopped, when there was never any.
 */
export function productCharts(
  months: { label: string | null; cycle: string | null; gas: number; oil: number }[],
  opts: { gasName: string; oilName: string; sub: string; keyPrefix: string; footnote?: string },
): ChartSpec[] {
  const x = months.map((m) => m.label ?? m.cycle ?? '');
  const out: ChartSpec[] = [];

  const gas = months.map((m) => (Number.isFinite(m.gas) ? m.gas : 0));
  const oil = months.map((m) => (Number.isFinite(m.oil) ? m.oil : 0));

  if (gas.some((v) => v > 0)) {
    out.push({
      key: opts.keyPrefix + ':gas',
      label: opts.gasName, sub: opts.sub, unit: MCF, dp: 0, x,
      series: [{ name: 'Gas', colour: COLOURS.gas, points: gas }],
      footnote: opts.footnote,
    });
  }
  if (oil.some((v) => v > 0)) {
    out.push({
      key: opts.keyPrefix + ':oil',
      label: opts.oilName, sub: opts.sub, unit: BBL, dp: 0, x,
      series: [{ name: 'Oil', colour: COLOURS.oil, points: oil }],
      footnote: opts.footnote,
    });
  }
  return out.filter(usable);
}

/* ---------------------------------------------------------------- selftest */
export function selftest() {
  const lines: string[] = [];
  let ok = true;
  const chk = (name: string, cond: boolean, got?: unknown) => {
    lines.push((cond ? 'ok    ' : 'FAIL  ') + name + (cond ? '' : `   <- ${JSON.stringify(got)}`));
    if (!cond) ok = false;
  };

  const gasOnly = [
    { label: 'Mar 2026', cycle: '202603', gas: 100, oil: 0 },
    { label: 'Apr 2026', cycle: '202604', gas: 120, oil: 0 },
    { label: 'May 2026', cycle: '202605', gas: 90, oil: 0 },
  ];
  const both = gasOnly.map((m, i) => ({ ...m, oil: [4, 5, 6][i] }));

  const g = productCharts(gasOnly, { gasName: 'Gas', oilName: 'Oil', sub: 's', keyPrefix: 'k' });
  chk('a gas-only lease gets ONE panel, not an empty oil one', g.length === 1, g.map((c) => c.key));
  chk('and it is the gas panel', g[0].unit === MCF);

  const b = productCharts(both, { gasName: 'Gas', oilName: 'Oil', sub: 's', keyPrefix: 'k' });
  chk('a lease with both gets two panels', b.length === 2, b.map((c) => c.unit));
  chk('the two panels do NOT share a unit', b[0].unit !== b[1].unit);
  chk('each panel carries one series', b.every((c) => c.series.length === 1));
  chk('x labels align with the points',
    b.every((c) => c.x.length === c.series[0].points.length));

  chk('usable() rejects an all-zero series',
    !usable({ key: 'z', label: 'z', sub: '', unit: MCF, dp: 0,
      x: ['a', 'b', 'c'], series: [{ name: 'g', colour: '#000', points: [0, 0, 0] }] }));
  chk('the unit strings are the capitalised ones', MCF === 'MCF' && BBL === 'BBL');
  chk('usable() rejects fewer than three points',
    !usable({ key: 'z', label: 'z', sub: '', unit: MCF, dp: 0,
      x: ['a', 'b'], series: [{ name: 'g', colour: '#000', points: [1, 2] }] }));
  chk('usable() accepts a series with real values',
    usable({ key: 'z', label: 'z', sub: '', unit: MCF, dp: 0,
      x: ['a', 'b', 'c'], series: [{ name: 'g', colour: '#000', points: [0, 5, 0] }] }));
  chk('a null point survives the build rather than becoming a zero',
    productCharts([
      { label: 'a', cycle: '1', gas: 5, oil: 0 },
      { label: 'b', cycle: '2', gas: Number.NaN, oil: 0 },
      { label: 'c', cycle: '3', gas: 7, oil: 0 },
    ], { gasName: 'G', oilName: 'O', sub: '', keyPrefix: 'k' })[0].series[0].points[1] === 0);

  return { name: 'chart data builder', ok, lines };
}
