'use client';
/**
 * The interactive chart.
 *
 * One client component draws every chart in the app. Hover (or arrow keys)
 * moves a crosshair to the nearest real point and reads out its date and value
 * — so the reader gets the exact number instead of estimating it against an
 * axis, which is the whole reason a chart needs to be interactive at all.
 *
 * DESIGN DECISIONS, each with a reason:
 *
 * · THE Y-AXIS DOES NOT START AT ZERO for a price. A $91.48 oil price plotted
 *   from zero is a flat line that says nothing. Both bounds are labelled so the
 *   scale cannot be misread. A VOLUME chart does start at zero, because "half
 *   as much gas" is a real comparison and a truncated axis would exaggerate it.
 *
 * · NO SMOOTHING. A smoothed line invents readings between the real ones.
 *
 * · A NULL POINT IS A GAP, not a zero. A month the state never filed is not a
 *   month of no production, and joining across it would draw a decline that
 *   did not happen.
 *
 * · THE POINTER IS SNAPPED to the nearest index rather than interpolated, so
 *   the readout is always a settlement that actually exists.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ChartSpec } from '../../_lib/reference/chart';

const VB_W = 600;
const VB_H = 150;
const PAD = { l: 6, r: 6, t: 10, b: 4 };

function fmt(v: number, dp: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/**
 * `onPick` makes a period CLICKABLE.
 *
 * A bar chart of monthly counts invites a click on a month, and nothing
 * happened — the chart read as a picture rather than as a control. Where a
 * caller passes `onPick`, clicking or pressing Enter on a period reports its
 * index, and the chart says so in its own hint line rather than leaving the
 * reader to discover it.
 */
export default function LineChart(
  { spec, onPick }: { spec: ChartSpec; onPick?: (index: number) => void },
) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const geom = useMemo(() => {
    const all = spec.series.flatMap((s) => s.points).filter((v): v is number => v != null);
    if (!all.length) return null;
    const lo = Math.min(...all);
    const hi = Math.max(...all);

    /* a volume starts at zero; a price uses its own band with a small skirt.
       Compared case-insensitively: the unit strings are MCF and BBL now, and
       an exact lower-case test silently turned every volume chart into a
       price chart with a truncated axis. */
    const u = spec.unit.toLowerCase();
    const isVolume = u === 'mcf' || u === 'bbl' || u === 'boe' || u === '';
    const span = (hi - lo) || Math.max(Math.abs(hi) * 0.02, 0.01);
    const y0 = isVolume ? 0 : lo - span * 0.06;
    const y1 = isVolume ? hi * 1.06 || 1 : hi + span * 0.06;

    const innerW = VB_W - PAD.l - PAD.r;
    const innerH = VB_H - PAD.t - PAD.b;
    const n = spec.x.length;
    const x = (i: number) => PAD.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0 || 1)) * innerH;
    /* FIXED · A BAR OWNS A BAND, A POINT OWNS A POSITION.
       `x()` above is the LINE scale: it puts point 0 exactly on the left edge
       and point n-1 exactly on the right, which is right for a line and wrong
       for a bar, because a bar is drawn AROUND its x rather than at it. The
       bars were centred on `x(i)` and so hung half a slot over both ends. At
       24 months that is ~2px and invisible; at two months the slot is 182px
       wide and the first bar was drawn at x=-85 in a 600-wide viewBox — off
       the canvas entirely, which is what a 30-day range showed.
       `band()` gives each period an equal slice and centres it, so the first
       and last bars sit inside the plot at every n. Used by the bars, the
       highlight and the pointer, and by nothing a line chart draws. */
    const band = innerW / Math.max(n, 1);
    const bandC = (i: number) => PAD.l + (i + 0.5) * band;
    return { lo, hi, y0, y1, x, y, band, bandC, innerW, innerH, isVolume };
  }, [spec]);

  /* Snap to the nearest real index — never interpolate a reading.
     The width guard is not defensive padding: the drawer animates in, so a
     mousemove can arrive while the SVG still measures 0px wide. Dividing by
     that produced NaN, and `NaN ?? lastIdx` is NaN — nullish coalescing does
     not catch it — so the readout rendered "not filed" and "NaN of 24". */
  /* FIXED · the pointer has to read the same scale the marks are drawn on, or
     the highlight lands on the neighbour of the bar under the cursor. */
  const indexAt = useCallback((clientX: number): number | null => {
    const el = svgRef.current;
    const n = spec.x.length;
    if (!el || n < 2) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0)) return null;
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    /* invert the viewBox padding, so the ends of the plot map to the ends */
    const inner = (frac * VB_W - PAD.l) / (VB_W - PAD.l - PAD.r);
    const idx = spec.kind === 'bars'
      ? Math.floor(inner * n)          // which band the cursor is over
      : Math.round(inner * (n - 1));   // which point it is nearest
    if (!Number.isFinite(idx)) return null;
    return Math.min(n - 1, Math.max(0, idx));
  }, [spec.x.length, spec.kind]);

  const onMove = useCallback((clientX: number) => {
    const idx = indexAt(clientX);
    if (idx != null) setHover(idx);
  }, [indexAt]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onPick) {
      e.preventDefault();
      setHover((h) => { if (h != null) onPick(h); return h; });
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const last = spec.x.length - 1;
    setHover((h) => {
      const cur = h ?? last;
      if (e.key === 'Home') return 0;
      if (e.key === 'End') return last;
      return Math.min(last, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)));
    });
  }, [spec.x.length, onPick]);

  if (!geom) return null;
  const { x, y, lo, hi } = geom;
  const n = spec.x.length;
  const cursor = hover;

  /* the label for the whole chart when nothing is hovered: the latest reading */
  const lastIdx = (() => {
    for (let i = n - 1; i >= 0; i--) {
      if (spec.series.some((s) => s.points[i] != null)) return i;
    }
    return n - 1;
  })();
  /* an integer in range, or the latest reading. Guards against any stray
     state as well as against the NaN above. */
  const readIdx = Number.isInteger(cursor) && (cursor as number) >= 0 && (cursor as number) < n
    ? (cursor as number)
    : lastIdx;
  const showCursor = readIdx === cursor;

  return (
    <div className="lc">
      <div className="lc-head">
        <strong>{spec.label}</strong>
        <span>{spec.sub}</span>
      </div>

      {/* the readout: the exact figures for whatever the pointer is on */}
      <div className="lc-read" aria-live="polite">
        <span className="lc-when">{spec.x[readIdx]}</span>
        {spec.series.map((s) => {
          const v = s.points[readIdx];
          return (
            <span className="lc-val" key={s.name}>
              <i style={{ background: s.colour }} />
              {spec.series.length > 1 ? <em>{s.name}</em> : null}
              {v == null
                ? <b className="lc-none">not filed</b>
                : <b>{fmt(v, spec.dp)}<u>{spec.unit ? ' ' + spec.unit : ''}</u></b>}
            </span>
          );
        })}
        {showCursor
          ? (
            <span className="lc-hint">
              {readIdx + 1} of {n}{onPick ? ' · click to filter' : ''}
            </span>
          )
          : (
            <span className="lc-hint">
              {onPick ? 'click any month to filter the timeline to it' : 'hover or arrow-key any period'}
            </span>
          )}
      </div>

      <svg
        ref={svgRef}
        className="lc-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        role="img"
        tabIndex={0}
        aria-label={
          `${spec.label}. ${spec.series.map((s) => {
            const v = s.points[lastIdx];
            return `${s.name} ${v == null ? 'not filed' : fmt(v, spec.dp) + ' ' + spec.unit}`;
          }).join(', ')} at ${spec.x[lastIdx]}. Range ${fmt(lo, spec.dp)} to ${fmt(hi, spec.dp)} `
          + `${spec.unit} across ${n} periods. Use the left and right arrow keys to read each one.`
        }
        style={onPick ? { cursor: 'pointer' } : undefined}
        onClick={onPick
          ? (e) => {
            onMove(e.clientX);
            const i = indexAt(e.clientX);
            if (i != null) onPick(i);
          }
          : undefined}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onKeyDown={onKey}
        onFocus={() => setHover((h) => h ?? lastIdx)}
        onBlur={() => setHover(null)}
      >
        <defs>
          {spec.series.map((s) => (
            <linearGradient key={s.name} id={`lg-${spec.key}-${s.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.colour} stopOpacity="0.26" />
              <stop offset="100%" stopColor={s.colour} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* one mid gridline: a reference without turning 150px into graph paper */}
        <line
          x1={PAD.l} x2={VB_W - PAD.r}
          y1={y((geom.y0 + geom.y1) / 2)} y2={y((geom.y0 + geom.y1) / 2)}
          stroke="#e2e9e6" strokeWidth="1" strokeDasharray="3 3"
        />

        {spec.kind === 'bars' && showCursor
          ? (
            <rect
              x={PAD.l + readIdx * geom.band} y={PAD.t}
              width={geom.band} height={VB_H - PAD.t - PAD.b}
              fill="#0d1a15" opacity="0.05"
            />
          )
          : null}

        {/* BARS, FOR A COUNT.
             `kind: 'bars'` was on the spec from the start and nothing drew it.
             A monthly count is a bar: two months of a line is a slope between
             two numbers, which is what the filings chart looked like as soon
             as a 30-day range left it with two points. Bars are grouped per
             period, one per series, so three permits and no completions reads
             as three and none rather than as a descent. */}
        {spec.kind === 'bars'
          ? spec.series.map((s, si) => {
            const groups = spec.series.length;
            /* the slot each period owns, then the share of it this series
               takes; 0.62 leaves a real gap between one month and the next */
            const slot = geom.band * 0.62;
            const bw = Math.max(1.4, slot / groups);
            return (
              <g key={s.name}>
                {s.points.map((v, i) => {
                  if (v == null || !(v > 0)) return null;
                  const cx = geom.bandC(i) - slot / 2 + si * bw;
                  const top = y(v);
                  return (
                    <rect
                      key={i} x={cx} y={top} width={bw}
                      height={Math.max(0.8, y(geom.y0) - top)}
                      fill={s.colour} opacity={readIdx === i ? 1 : 0.82}
                      rx={Math.min(1.5, bw / 3)}
                    />
                  );
                })}
              </g>
            );
          })
          : null}

        {spec.kind === 'bars' ? null : spec.series.map((s) => {
          /* split into runs at every null, so a gap stays a gap */
          const runs: { i: number; v: number }[][] = [];
          let run: { i: number; v: number }[] = [];
          s.points.forEach((v, i) => {
            if (v == null) { if (run.length) runs.push(run); run = []; }
            else run.push({ i, v });
          });
          if (run.length) runs.push(run);

          return (
            <g key={s.name}>
              {spec.series.length === 1
                ? runs.filter((r) => r.length > 1).map((r, k) => (
                  <polygon
                    key={'a' + k}
                    points={
                      `${x(r[0].i)},${y(geom.isVolume ? 0 : geom.y0)} `
                      + r.map((pt) => `${x(pt.i)},${y(pt.v)}`).join(' ')
                      + ` ${x(r[r.length - 1].i)},${y(geom.isVolume ? 0 : geom.y0)}`
                    }
                    fill={`url(#lg-${spec.key}-${s.name})`}
                  />
                ))
                : null}
              {runs.map((r, k) => (
                r.length > 1
                  ? (
                    <polyline
                      key={'l' + k} fill="none" stroke={s.colour} strokeWidth="2"
                      strokeLinejoin="round" strokeLinecap="round"
                      points={r.map((pt) => `${x(pt.i)},${y(pt.v)}`).join(' ')}
                    />
                  )
                  : <circle key={'d' + k} cx={x(r[0].i)} cy={y(r[0].v)} r="2.5" fill={s.colour} />
              ))}
            </g>
          );
        })}

        {/* THE HIGHLIGHT BAND on bars: a whole month is the target, not the
             2px bar inside it, so a click near a short bar still lands. */}
        {/* the crosshair. On bars the highlighted bar IS the readout, so only
             the guide line is drawn and the dots are skipped. */}
        {showCursor && spec.kind === 'bars'
          ? (
            <line
              x1={geom.bandC(readIdx)} x2={geom.bandC(readIdx)}
              y1={PAD.t} y2={VB_H - PAD.b}
              stroke="#8a94a6" strokeWidth="1" strokeDasharray="2 2"
            />
          )
          : null}
        {spec.kind === 'bars' ? null : showCursor
          ? (
            <>
              <line
                x1={x(readIdx)} x2={x(readIdx)} y1={PAD.t} y2={VB_H - PAD.b}
                stroke="#8a94a6" strokeWidth="1" strokeDasharray="2 2"
              />
              {spec.series.map((s) => {
                const v = s.points[readIdx];
                if (v == null) return null;
                return (
                  <circle
                    key={s.name} cx={x(readIdx)} cy={y(v)} r="4"
                    fill={s.colour} stroke="#fff" strokeWidth="1.75"
                  />
                );
              })}
            </>
          )
          : spec.series.map((s) => {
            const v = s.points[lastIdx];
            if (v == null) return null;
            return (
              <circle
                key={s.name} cx={x(lastIdx)} cy={y(v)} r="3.5"
                fill={s.colour} stroke="#fff" strokeWidth="1.5"
              />
            );
          })}
      </svg>

      <div className="lc-ax">
        <span>{spec.x[0]}</span>
        <span className="lc-range">
          {geom.isVolume ? 'peak' : 'low'} {fmt(geom.isVolume ? hi : lo, spec.dp)}
          {geom.isVolume ? '' : ` · high ${fmt(hi, spec.dp)}`} {spec.unit}
        </span>
        <span>{spec.x[n - 1]}</span>
      </div>

      {spec.footnote ? <p className="lc-foot">{spec.footnote}</p> : null}
    </div>
  );
}

/** several panels, stacked */
export function Charts(
  { specs, onPick }: { specs: ChartSpec[]; onPick?: (index: number) => void },
) {
  if (!specs?.length) return null;
  return (
    <div className="lc-set">
      {specs.map((s) => <LineChart key={s.key} spec={s} onPick={onPick} />)}
    </div>
  );
}
