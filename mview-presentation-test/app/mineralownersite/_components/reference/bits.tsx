'use client';
/**
 * The small pieces every surface reuses.
 *
 * They exist so the Dashboard, Alerts and Activities cannot disagree about how a
 * KPI, a bar or an empty state looks — and, more importantly, so a figure can
 * only ever be rendered through a formatter. Reaching for `String(n)` anywhere
 * in a view is how "$45,48,479" happened once already.
 */
import React, { useState } from 'react';
import { n0, usd, usdShort, pctS, nShort, MCF, BBL } from '../../_lib/reference/fmt';
import LineChart from './LineChart';
import { productCharts } from '../../_lib/reference/chart';

/* --------------------------------------------------------------- density */
/** ultra → pro. A block declares the range it belongs in. */
/* ================================================================ pager
   LIVES HERE, not beside its first caller. It started in `Dashboard.tsx` for
   the operators card and the lease table; "Where your value sits" is in
   `panels.tsx`, which `Dashboard` imports, so keeping it there would have
   meant a cycle. `bits` is where the shared primitives already are. */
/**
 * TEN ROWS A PAGE, on the two lists that a real portfolio makes unreadable.
 *
 * "Your operators" printed all fifty-seven and "Every lease, every field" all
 * 1,659 — a card taller than eleven screens and a table taller than three
 * hundred. Neither is a list anyone reads; both are a scroll the reader has to
 * get past to reach the next card.
 *
 * A PAGE, NOT A "SHOW MORE". The reader of these two is auditing — checking
 * one operator's share, finding one lease — and a growing list makes the
 * document longer every time they look. Ten rows keeps every card the same
 * height whatever the account holds, which is the property the strip and the
 * rails already have.
 */
const PAGE_SIZE = 10;

/**
 * The current page's slice, clamped.
 *
 * CLAMPED IN RENDER rather than reset from an effect. The lists change under
 * this — the funnel switch swaps the whole payload for its sample, and the
 * sample holds a different number of rows — and a page index left pointing
 * past the end would render an empty card. `Math.min` costs nothing and needs
 * no effect, which also keeps this clear of the `set-state-in-effect` rule the
 * shell had to disable.
 */
export function usePaged<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safe = Math.min(page, pages);
  const start = (safe - 1) * PAGE_SIZE;
  return { page: safe, pages, setPage, start, rows: items.slice(start, start + PAGE_SIZE) };
}

/**
 * Which page numbers to draw: first, last, the current one and its neighbours.
 *
 * 1,659 leases is 166 pages, and 166 buttons is a worse control than no
 * control. The gaps are rendered as text, never as buttons — an ellipsis you
 * can click is a guess about where it takes you.
 */
function pageWindow(cur: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const from = Math.max(2, cur - 1);
  const to = Math.min(pages - 1, cur + 1);
  if (from > 2) out.push('…');
  for (let n = from; n <= to; n += 1) out.push(n);
  if (to < pages - 1) out.push('…');
  out.push(pages);
  return out;
}

export function Pager(
  { page, pages, setPage, start, shown, total, label }:
  { page: number; pages: number; setPage: (n: number) => void;
    start: number; shown: number; total: number; label: string },
) {
  if (pages <= 1) return null;
  return (
    <nav className="mv-pager" aria-label={label}>
      <span className="pg-count">
        {start + 1}–{start + shown} of {total}
      </span>
      <span className="pg-btns">
        <button
          type="button" onClick={() => setPage(page - 1)}
          disabled={page === 1} aria-label="Previous page"
        >
          ‹
        </button>
        {pageWindow(page, pages).map((n, i) => (n === '…'
          ? <span className="pg-gap" key={`gap${i}`}>…</span>
          : (
            <button
              type="button" key={n} className={n === page ? 'on' : undefined}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Page ${n}`} onClick={() => setPage(n)}
            >
              {n}
            </button>
          )))}
        <button
          type="button" onClick={() => setPage(page + 1)}
          disabled={page === pages} aria-label="Next page"
        >
          ›
        </button>
      </span>
    </nav>
  );
}


export type Tier = 'ultra' | 'simple' | 'detailed' | 'pro';
export const TIERS: Tier[] = ['ultra', 'simple', 'detailed', 'pro'];
export const rank = (t: Tier) => TIERS.indexOf(t);

/**
 * Show children only inside a density band.
 *
 * The prototype does this in CSS with `section > :not(.tier-u)`, which depends
 * on the child being a DIRECT descendant of the route section. In a component
 * tree that is not reliably true, and a wrong depth silently hides the whole
 * page — so the gate is explicit here and the CSS classes are kept only for the
 * element-level helpers (.hide-u, .hide-s) that do not care about depth.
 */
export function Band(
  { tier, from = 'ultra', to = 'pro', children }:
  { tier: Tier; from?: Tier; to?: Tier; children: React.ReactNode },
) {
  const r = rank(tier);
  if (r < rank(from) || r > rank(to)) return null;
  return <>{children}</>;
}

/* ------------------------------------------------------------------ chips */
/* the prototype's own affordance chip, restyled in app.css: filled rather than
   pale-green-on-white, and the WORDING varies with what it opens instead of
   repeating "explain" down the page */
export function Hint({ children }: { children: React.ReactNode }) {
  return <span className="ctx-hint">{children} →</span>;
}

export function SampleTag({ on }: { on: boolean }) {
  return on ? <span className="samp-tag">sample</span> : null;
}

/* -------------------------------------------------------------------- KPI */
export interface KpiProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  sub2?: React.ReactNode;
  /** the wording on the affordance chip — varied per card on purpose */
  hint?: string;
  fresh?: string | null;
  spark?: number[] | null;
  sparkColor?: string;
  chip?: string | null;
  onOpen?: () => void;
  className?: string;
  sample?: boolean;
}

/**
 * One headline figure.
 *
 * `onOpen` makes the whole card the affordance rather than a link inside it —
 * a 224px card with an 80px link is a tap target that misses on a phone.
 */
export function Kpi(p: KpiProps) {
  const clickable = Boolean(p.onOpen);
  return (
    <div
      className={'kpi' + (clickable ? ' kpi-click' : '') + (p.className ? ' ' + p.className : '')}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={p.onOpen}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); p.onOpen!(); }
      }}
    >
      <div className="k-label">{p.label}<SampleTag on={Boolean(p.sample)} /></div>
      <div className="k-val num">{p.value}</div>
      {p.spark && p.spark.length > 1
        ? <Spark points={p.spark} color={p.sparkColor ?? '#54bf96'} /> : null}
      {p.sub ? <div className="k-sub">{p.sub}</div> : null}
      {p.sub2 ? <div className="k-sub">{p.sub2}</div> : null}
      {p.chip
        ? <div className="k-sub"><span className="chip chip-est" style={{ fontSize: 10 }}>{p.chip}</span></div>
        : null}
      {p.hint ? <div className="k-sub"><Hint>{p.hint}</Hint></div> : null}
      {p.fresh ? <div className="freshness">{p.fresh}</div> : null}
    </div>
  );
}

/** the prototype's 90x20 sparkline, drawn from real values */
export function Spark({ points, color = '#54bf96' }: { points: number[]; color?: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? 90 / (points.length - 1) : 90;
  const pts = points.map((v, i) => `${(i * step).toFixed(1)},${(18 - ((v - min) / span) * 16).toFixed(1)}`);
  const last = pts[pts.length - 1].split(',');
  return (
    <svg className="spark" viewBox="0 0 90 20" width="90" height="20" aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts.join(' ')} />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------- bars */
export function LBar(
  { name, value, max, label, cls = '', zero, onOpen }:
  { name: string; value: number; max: number; label: string; cls?: string;
    zero?: string; onOpen?: () => void },
) {
  const pctW = max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0;
  return (
    <div
      className="lbar"
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); }
      }}
      title={onOpen ? `${name} — open the detail` : name}
    >
      <span className="lb-name">{name}</span>
      <span className="lb-track">
        {/* live.css sets display:block on .lb-fill — a span inside a
            non-flex track stays inline and ignores width and height */}
        <span className={'lb-fill ' + cls} style={{ width: pctW.toFixed(2) + '%' }} />
      </span>
      {value > 0
        ? <span className="lb-val">{label}</span>
        : <span className="lb-zero">{zero ?? 'none filed'}</span>}
    </div>
  );
}

/** a month-by-month column chart */
export function MonthCols(
  { rows, valueOf, labelOf, onPick, altIf }:
  { rows: { label: string | null; cycle: string }[];
    valueOf: (i: number) => number; labelOf: (i: number) => string;
    onPick?: (i: number) => void; altIf?: (i: number) => boolean },
) {
  const vals = rows.map((_, i) => valueOf(i));
  const peak = Math.max(0, ...vals);
  return (
    <>
      <div className="mcols">
        {rows.map((r, i) => {
          const v = vals[i];
          const h = peak > 0 ? Math.max(v > 0 ? 3 : 1, (v / peak) * 100) : 1;
          return (
            <span
              key={r.cycle}
              className={'mc' + (v <= 0 ? ' dim' : altIf?.(i) ? ' alt' : '')}
              style={{ height: h.toFixed(1) + '%' }}
              title={`${r.label ?? r.cycle} — ${labelOf(i)}`}
              onClick={onPick ? () => onPick(i) : undefined}
            />
          );
        })}
      </div>
      <div className="mcax">
        <span>{rows[0]?.label ?? ''}</span>
        <span>{rows[rows.length - 1]?.label ?? ''}</span>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- prose */
/** the one line a chart cannot say about itself — v1's `.chart-insight` */
export function Insight({ children }: { children: React.ReactNode }) {
  return <div className="chart-insight"><span className="ci-dot" aria-hidden="true" />{children}</div>;
}

/** trusted server-built HTML (the drawer copy carries <strong> and <em>) */
export function Html({ html, as = 'p', className }:
{ html: string; as?: 'p' | 'div' | 'span' | 'li'; className?: string }) {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Empty(
  { title, children }: { title: string; children: React.ReactNode },
) {
  return (
    <div className="act-empty">
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  );
}

export function Delta({ pct }: { pct: number | null | undefined }) {
  if (pct == null || !Number.isFinite(pct)) return <span className="muted">no comparison</span>;
  if (Math.abs(pct) < 0.05) return <span className="muted">level</span>;
  const up = pct > 0;
  return (
    <span className={up ? 'delta-up' : 'delta-down'}>
      {up ? '▲' : '▼'} {pctS(Math.abs(pct))}
    </span>
  );
}

/** the section header used above every band of cards */
export function Band9({ children }: { children: React.ReactNode }) {
  return <div className="act-band">{children}</div>;
}

/** a wrapping row of equal cards whose LAST row fills, rather than an auto-fit
 *  grid that leaves the trailing tracks of a short row empty */
export function Cards({ children }: { children: React.ReactNode }) {
  return <div className="mv-cards">{children}</div>;
}

/**
 * GAS AND OIL AT THE SAME TIME.
 *
 * `productCharts` drops the product that never produced, so a gas-only owner
 * got one panel and no answer about the other. Both slots are now always
 * drawn: the product with a record gets its chart, and the one without gets a
 * panel of the same shape saying so. MCF and BBL still never share an axis —
 * they are different quantities, and one line for both either flattens the oil
 * to nothing or blows the gas off the top.
 *
 * The grid is `auto-fit` at 300px, so this is one column inside the dashboard's
 * narrow rail and two side by side in a full-width panel, with no breakpoint to
 * keep in step by hand.
 */
export function ProductPair(
  { months, opts, subject, onPick }: {
    months: { label: string | null; cycle: string | null; gas: number; oil: number }[];
    opts: Parameters<typeof productCharts>[1];
    subject: string;
    onPick?: (index: number) => void;
  },
) {
  const specs = productCharts(months, opts);
  const gas = specs.find((x) => x.unit === MCF) ?? null;
  const oil = specs.find((x) => x.unit === BBL) ?? null;
  return (
    <div className="prod-pair">
      <div className="pp-slot">
        {gas
          ? <LineChart spec={gas} onPick={onPick} />
          : <NoProduct product="gas" other="oil" subject={subject} />}
      </div>
      <div className="pp-slot">
        {oil
          ? <LineChart spec={oil} onPick={onPick} />
          : <NoProduct product="oil" other="gas" subject={subject} />}
      </div>
    </div>
  );
}

/** the slot for a product the record has never carried */
function NoProduct(
  { product, other, subject }: { product: string; other: string; subject: string },
) {
  const unit = product === 'gas' ? MCF : BBL;
  return (
    <div className="pp-none">
      <strong>No {product} on record</strong>
      <p>
        Not one {unit} of {product} has ever been filed for {subject}, so there is no{' '}
        {product} chart rather than a flat line at zero — {other} and no {product} is a
        different fact from {product} that fell to nothing.
      </p>
      <span className="pp-tag">nothing withheld — nothing filed</span>
    </div>
  );
}

export const F = { n0, usd, usdShort, pctS, nShort };
