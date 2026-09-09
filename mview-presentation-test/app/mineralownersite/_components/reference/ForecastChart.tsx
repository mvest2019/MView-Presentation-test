'use client';
/**
 * The production & forecast chart — one picture, two kinds of claim.
 *
 * WHY THIS IS NOT `LineChart`. Every other chart in the app draws series that
 * are all the same kind of thing: four settlements, six months of gas. This
 * one draws a public filing and a model in the same frame, and it has to make
 * the difference visible without splitting them into two pictures the reader
 * has to align by eye. That needs three things `LineChart` does not have:
 *
 *   · a SEAM — solid to the boundary, dashed after it, shaded behind the
 *     dashed half, and labelled in the plot rather than only in a caption;
 *   · TWO AXES, because gas is in MCF and condensate in BBL. One axis either
 *     flattens the condensate to the floor (it is ~5% of the gas figure) or
 *     blows the gas off the top. They are never added;
 *   · a WINDOW, because the series is 261 months long. 24 months of detail
 *     and 72 months of projection cannot both be legible at once.
 *
 * INTERACTION, and what each part is for:
 *
 *   hover / arrow keys  moves a crosshair to a real month and reads it out
 *   click / Enter       PINS that month, so the readout survives the mouse
 *                       leaving the chart — which is what you need when the
 *                       number you want to compare is in the table below
 *   the brush           two handles over a context strip of the whole series
 *
 * A NULL IS A GAP, NEVER A ZERO. A month the state never filed is not a month
 * of no production, and joining across it draws a collapse that did not
 * happen. The seam month is the one point drawn twice — by design, so the
 * dashed line begins exactly where the solid one ends.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ForecastMonth } from '../../_lib/reference/forecast';
import { MCF, BBL, n0, pct1, usd } from '../../_lib/reference/fmt';

export type Measure = 'posted' | 'net' | 'share' | 'value';
export type Products = 'both' | 'gas' | 'oil';

const W = 760;
const H = 300;
const L = 66;
const R = 694;
const T = 22;
const B = 246;

const GAS = '#2e8f6d';
const GAS_FC = '#7cc3a6';
const OIL = '#b8892f';
const OIL_FC = '#d8bb84';
const VAL = '#3b5bdb';
const VAL_FC = '#93a7ea';

/** A clean axis top: 1 / 2 / 2.5 / 5 ladder, at most six divisions. */
function nice(max: number): { step: number; top: number } {
  if (!(max > 0)) return { step: 1, top: 1 };
  const steps = [1, 2, 2.5, 5];
  for (let p = 0.001; p <= 1e9; p *= 10) {
    for (const k of steps) {
      const st = k * p;
      if (Math.ceil(max / st) <= 6) return { step: st, top: Math.ceil(max / st) * st };
    }
  }
  return { step: max, top: max };
}

function short(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(v));
}

/** What each measure reads off a month, and how it is labelled. */
export const MEASURE: Record<Measure, {
  label: string;
  note: string;
  gas: (m: ForecastMonth) => number;
  oil: (m: ForecastMonth) => number;
  money: boolean;
}> = {
  posted: {
    label: 'At the lease',
    note: 'the whole lease month as the state posted it, before any deduction '
      + 'and before your interest',
    gas: (m) => m.gas_gross,
    oil: (m) => m.oil_gross,
    money: false,
  },
  net: {
    label: 'After removal',
    note: 'the same month less the volume that never reached the sales meter — '
      + 'this is what a royalty is calculated on',
    gas: (m) => m.gas_net,
    oil: (m) => m.oil_net,
    money: false,
  },
  share: {
    label: 'Your share',
    note: 'that net volume multiplied by your own decimal interest on each lease',
    gas: (m) => m.gas_share,
    oil: (m) => m.oil_share,
    money: false,
  },
  value: {
    label: 'Your share, in money',
    note: "the model's own monthly cash figure at your interest — the projected "
      + 'half carries a band, the filed half does not',
    gas: (m) => m.value_share,
    oil: () => 0,
    money: true,
  },
};

interface Props {
  months: ForecastMonth[];
  /** index of the first projected month in `months` */
  seam: number;
  measure: Measure;
  products: Products;
  /** inclusive window into `months` */
  a: number;
  b: number;
  pinned: number | null;
  onPin: (i: number | null) => void;
  /** the label for the boundary, e.g. "June 2026" */
  boundaryLabel: string | null;
}

export default function ForecastChart(
  { months, seam, measure, products, a, b, pinned, onPin, boundaryLabel }: Props,
) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const M = MEASURE[measure];
  const money = M.money;
  const showGas = money || products !== 'oil';
  const showOil = !money && products !== 'gas';

  const geom = useMemo(() => {
    const lo = Math.max(0, Math.min(a, months.length - 1));
    const hi = Math.max(lo + 1, Math.min(b, months.length - 1));
    const win = months.slice(lo, hi + 1);
    if (win.length < 2) return null;

    const gasVals = showGas ? win.map(M.gas) : [];
    const oilVals = showOil ? win.map(M.oil) : [];
    const gAxis = nice(Math.max(0, ...gasVals));
    const oAxis = nice(Math.max(0, ...oilVals));

    const span = hi - lo;
    const X = (i: number) => L + ((i - lo) * (R - L)) / span;
    const YG = (v: number) => B - (v / gAxis.top) * (B - T);
    const YO = (v: number) => B - (v / oAxis.top) * (B - T);

    /* the seam in window coordinates; -1 when the boundary is outside it */
    const s = seam >= 0 && seam > lo && seam <= hi ? seam : -1;

    /**
     * ONE OVERLAP POINT AT THE SEAM.
     *
     * `filed` runs to the last posted month; `proj` starts at that same month
     * so the dashed line begins where the solid one ends. Without it the two
     * halves sat a month apart and read as two unrelated charts.
     */
    const path = (f: (m: ForecastMonth) => number, Y: (v: number) => number, want: boolean) => {
      const pts: string[] = [];
      let started = false;
      for (let i = lo; i <= hi; i += 1) {
        const m = months[i];
        const inHalf = m.forecast === want || (want && s > 0 && i === s - 1);
        const v = f(m);
        if (!inHalf || !(v > 0)) { started = false; continue; }
        pts.push(`${started ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`);
        started = true;
      }
      return pts.join(' ');
    };

    /**
     * At most eight x labels, always including the first and the last.
     *
     * THE LAST ONE REPLACES ITS NEIGHBOUR RATHER THAN JOINING IT. Appending
     * `hi` unconditionally put a tick at index 70 and another at 72 on a
     * 73-month window, and "Apr 2032" was drawn straight through "Jun 2032".
     * A label needs roughly half a step of clearance to stand on its own.
     */
    const ticks: number[] = [];
    const every = Math.max(1, Math.ceil(win.length / 8));
    for (let i = lo; i <= hi; i += every) ticks.push(i);
    const last = ticks[ticks.length - 1];
    if (last !== hi) {
      if (hi - last < every / 2 && ticks.length > 1) ticks[ticks.length - 1] = hi;
      else ticks.push(hi);
    }

    return { lo, hi, span, X, YG, YO, gAxis, oAxis, s, path, ticks };
  }, [months, a, b, seam, M, showGas, showOil]);

  const at = useCallback((clientX: number): number | null => {
    const svg = svgRef.current;
    if (!svg || !geom) return null;
    const r = svg.getBoundingClientRect();
    if (!r.width) return null;
    const x = ((clientX - r.left) / r.width) * W;
    const t = (x - L) / (R - L);
    const i = Math.round(geom.lo + t * geom.span);
    return Math.max(geom.lo, Math.min(geom.hi, i));
  }, [geom]);

  if (!geom) {
    return (
      <p className="pf2-note">
        The window is too narrow to draw. Widen it with the handles below.
      </p>
    );
  }

  const cur = pinned != null && pinned >= geom.lo && pinned <= geom.hi
    ? pinned : hover;
  const curMonth = cur != null ? months[cur] : null;

  const move = (e: React.PointerEvent<SVGSVGElement>) => setHover(at(e.clientX));
  const click = (e: React.PointerEvent<SVGSVGElement>) => {
    const i = at(e.clientX);
    onPin(i != null && i === pinned ? null : i);
  };
  const key = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const from = cur ?? geom.hi;
      const next = Math.max(geom.lo, Math.min(geom.hi, from + (e.key === 'ArrowRight' ? 1 : -1)));
      setHover(next);
      if (pinned != null) onPin(next);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPin(cur != null && cur === pinned ? null : cur);
    } else if (e.key === 'Escape') {
      onPin(null);
      setHover(null);
    }
  };

  const gasName = money ? 'Your share' : 'Gas';
  const readout = (v: number, m: boolean) => (m ? usd(v) ?? '—' : n0(v) ?? '—');

  return (
    <>
      <svg
        ref={svgRef}
        id="pf2Svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        tabIndex={0}
        aria-label={
          `Monthly ${money ? 'owner-share value' : 'production'}, `
          + `${months[geom.lo].label} to ${months[geom.hi].label}. `
          + `Solid to ${boundaryLabel ?? 'the boundary'} is what the state posted; `
          + 'dashed after it is the model. Arrow keys move a readout, Enter pins it.'
        }
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
        onPointerDown={click}
        onKeyDown={key}
      >
        {/* the projected half, shaded, so the eye sees the change of claim
            before it reads the caption */}
        {geom.s > 0 ? (() => {
          const sx = geom.X(geom.s - 0.5);
          /* A LABEL IS ONLY DRAWN WHERE IT FITS INSIDE THE PLOT.
             Both were anchored to the seam and drawn wherever it fell, so on
             the Forecast preset - seam at the left edge - the end-anchored
             "POSTED" ran out of the plot and over the y-axis numbers. ~62
             units is the width of the longer of the two at this size. */
          const ROOM = 62;
          return (
            <>
              <rect
                x={sx} y={T - 8} width={Math.max(0, R - sx)} height={B - T + 8}
                fill="#f4fbf8"
              />
              <line
                x1={sx} x2={sx} y1={T - 8} y2={B}
                stroke="#b9cfc6" strokeWidth="1" strokeDasharray="3 3"
              />
              {R - sx >= ROOM ? (
                <text
                  x={sx + 6} y={T - 1}
                  fontSize="9.5" fontWeight="700" fill="#5c7a6e" letterSpacing=".06em"
                >
                  FORECAST →
                </text>
              ) : null}
              {sx - L >= ROOM ? (
                <text
                  x={sx - 6} y={T - 1}
                  fontSize="9.5" fontWeight="700" fill="#8fa3ad" letterSpacing=".06em"
                  textAnchor="end"
                >
                  ← POSTED
                </text>
              ) : null}
            </>
          );
        })() : null}

        {/* the gas / money axis, on the left */}
        {showGas ? Array.from({ length: 5 }, (_, k) => {
          const v = (geom.gAxis.top * k) / 4;
          const y = geom.YG(v);
          return (
            <g key={`gy${k}`}>
              <line x1={L} x2={R} y1={y} y2={y} stroke="#eef2f1" strokeWidth="1" />
              <text x={L - 7} y={y + 3.5} fontSize="10" fill="#64748b" textAnchor="end">
                {money ? `$${short(v)}` : short(v)}
              </text>
            </g>
          );
        }) : null}

        {/* the oil axis, on the right, with its own scale — the two are never
            added, so they never share one */}
        {showOil ? Array.from({ length: 5 }, (_, k) => {
          const v = (geom.oAxis.top * k) / 4;
          return (
            <text
              key={`cy${k}`} x={R + 7} y={geom.YO(v) + 3.5}
              fontSize="10" fill="#a07a2c" textAnchor="start"
            >
              {short(v)}
            </text>
          );
        }) : null}

        <line x1={L} x2={R} y1={B} y2={B} stroke="#cfd8d5" strokeWidth="1" />

        {geom.ticks.map((i) => (
          <text
            key={`x${i}`} x={geom.X(i)} y={B + 15}
            fontSize="10" fill="#64748b" textAnchor="middle"
          >
            {months[i].short}
          </text>
        ))}

        {/* posted first, projected over it — so the dashes read as an
            extension of the solid line rather than a separate series */}
        {showGas ? (
          <>
            <path
              d={geom.path(M.gas, geom.YG, false)} fill="none"
              stroke={money ? VAL : GAS} strokeWidth="2.1" strokeLinejoin="round"
            />
            <path
              d={geom.path(M.gas, geom.YG, true)} fill="none"
              stroke={money ? VAL_FC : GAS_FC} strokeWidth="2.1"
              strokeDasharray="5 4" strokeLinejoin="round"
            />
          </>
        ) : null}
        {showOil ? (
          <>
            <path
              d={geom.path(M.oil, geom.YO, false)} fill="none"
              stroke={OIL} strokeWidth="1.8" strokeLinejoin="round"
            />
            <path
              d={geom.path(M.oil, geom.YO, true)} fill="none"
              stroke={OIL_FC} strokeWidth="1.8" strokeDasharray="5 4" strokeLinejoin="round"
            />
          </>
        ) : null}

        {/* axis titles, only where that axis is drawn */}
        {showGas ? (
          <text
            x={16} y={(T + B) / 2} fontSize="10.5" fontWeight="700"
            fill={money ? VAL : GAS} textAnchor="middle"
            transform={`rotate(-90 16 ${(T + B) / 2})`}
          >
            {money ? 'YOUR SHARE · $ / month' : `GAS · ${MCF} / month`}
          </text>
        ) : null}
        {showOil ? (
          <text
            x={746} y={(T + B) / 2} fontSize="10.5" fontWeight="700"
            fill="#a07a2c" textAnchor="middle"
            transform={`rotate(90 746 ${(T + B) / 2})`}
          >
            {`OIL · ${BBL} / month`}
          </text>
        ) : null}

        {/* the crosshair and its readout */}
        {cur != null && curMonth ? (
          <g pointerEvents="none">
            <line
              x1={geom.X(cur)} x2={geom.X(cur)} y1={T - 8} y2={B}
              stroke={pinned != null ? '#0f172a' : '#9aa8b2'} strokeWidth="1"
            />
            {showGas && M.gas(curMonth) > 0 ? (
              <circle
                cx={geom.X(cur)} cy={geom.YG(M.gas(curMonth))} r="3.6"
                fill="#fff" stroke={money ? VAL : GAS} strokeWidth="2"
              />
            ) : null}
            {showOil && M.oil(curMonth) > 0 ? (
              <circle
                cx={geom.X(cur)} cy={geom.YO(M.oil(curMonth))} r="3.2"
                fill="#fff" stroke={OIL} strokeWidth="2"
              />
            ) : null}
            {(() => {
              const lines: string[] = [curMonth.label ?? curMonth.cycle];
              if (showGas) lines.push(`${gasName} ${readout(M.gas(curMonth), money)}`
                + (money ? '' : ` ${MCF}`));
              if (showOil) lines.push(`Oil ${readout(M.oil(curMonth), false)} ${BBL}`);
              lines.push(curMonth.forecast ? 'projected — model' : 'posted — state filing');
              const wBox = 152;
              const hBox = 15 * lines.length + 10;
              const x = Math.min(R - wBox, Math.max(L, geom.X(cur) + 10));
              return (
                <g>
                  <rect
                    x={x} y={T} width={wBox} height={hBox} rx="7"
                    fill="#0f172a" opacity=".93"
                  />
                  {lines.map((ln, k) => (
                    <text
                      key={ln + k} x={x + 10} y={T + 18 + k * 15}
                      fontSize={k === 0 ? '11' : '10.5'}
                      fontWeight={k === 0 ? 800 : 600}
                      fill={k === 0 ? '#fff' : k === lines.length - 1 ? '#8fa3ad' : '#dfeae4'}
                    >
                      {ln}
                    </text>
                  ))}
                </g>
              );
            })()}
          </g>
        ) : null}
      </svg>

      <p className="pf2-note">
        {pinned != null && months[pinned]
          ? (
            <>
              <strong>{months[pinned].label} is pinned.</strong>{' '}
              {months[pinned].forecast
                ? 'This month is the model, not a filing.'
                : 'This month is the state\'s own posting.'}{' '}
              {months[pinned].removed != null && months[pinned].gas_gross > 0 ? (
                <>
                  {n0(months[pinned].removed ?? 0)} {MCF} of it —{' '}
                  {pct1(months[pinned].removed_pct)} — never reached the sales meter.{' '}
                </>
              ) : null}
              <button
                type="button" className="pf2-preset"
                onClick={() => onPin(null)}
              >
                Unpin
              </button>
            </>
          )
          : (
            <>
              <strong>Hover or use the arrow keys</strong> to read a month exactly; click or press
              Enter to pin it so the readout stays while you look at the table below.{' '}
              {M.note}.
            </>
          )}
      </p>
    </>
  );
}

/**
 * The brush — two handles over a context strip of the WHOLE series.
 *
 * Two native range inputs stacked on the same strip, which is what makes it
 * work with a keyboard and a screen reader for free. The strip behind them is
 * the entire series at a glance, so a reader can see where the window they
 * are dragging sits in the record rather than only what it contains.
 */
export function Brush(
  { months, seam, measure, a, b, onChange }:
  { months: ForecastMonth[]; seam: number; measure: Measure;
    a: number; b: number; onChange: (a: number, b: number) => void },
) {
  const n = months.length - 1;
  const M = MEASURE[measure];
  const max = Math.max(1, ...months.map(M.gas));
  const pts = months.map((m, i) =>
    `${((i / Math.max(1, n)) * 100).toFixed(2)},${(28 - (M.gas(m) / max) * 26).toFixed(2)}`,
  ).join(' ');
  const pctA = (a / Math.max(1, n)) * 100;
  const pctB = (b / Math.max(1, n)) * 100;

  return (
    <div className="pf2-brush">
      <svg className="pf2-ctx" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
        {seam > 0 ? (
          <rect
            x={(seam / Math.max(1, n)) * 100} y="0"
            width={100 - (seam / Math.max(1, n)) * 100} height="28" fill="#f4fbf8"
          />
        ) : null}
        <polyline
          points={pts} fill="none" stroke="#9fcab7" strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="pf2-win" style={{ left: `${pctA}%`, width: `${Math.max(1, pctB - pctA)}%` }} />
      <input
        type="range" min={0} max={n} step={1} value={a}
        aria-label="Window start month"
        onChange={(e) => onChange(Math.min(Number(e.target.value), b - 2), b)}
      />
      <input
        type="range" min={0} max={n} step={1} value={b}
        aria-label="Window end month"
        onChange={(e) => onChange(a, Math.max(Number(e.target.value), a + 2))}
      />
    </div>
  );
}
