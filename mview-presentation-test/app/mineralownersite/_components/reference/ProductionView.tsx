'use client';
/* eslint-disable react-hooks/set-state-in-effect --
 * THE EFFECT BELOW IS THE REFERENCE'S, AND IT SYNCHRONISES WITH SOMETHING
 * OUTSIDE REACT — a derived window: changing the lease re-derives the chart window from that
 * series' own length and seam, because a lease series is not the same length as
 * the portfolio's and keeping the old indices pointed the boundary at the wrong
 * year, which is what an effect is for. This rule fires on the
 * `setState` that carries the outside world's answer back in, and rewriting it
 * would make this file a fork of the reference rather than a copy — which is
 * the whole value of the port. The rule stays on everywhere else in the app.
 */
/**
 * Production & Forecast.
 *
 * The reference route (`app-production.html`) laid out the shape of this page
 * and one worked example lease with its numbers typed in. What it could not
 * do is the thing the page is actually for: put a public filing and a model
 * in the same frame and show exactly where one stops and the other starts.
 * So the markup and the `pf2-*` classes are the reference's, and everything
 * below is built on the live record instead:
 *
 * WHAT IS DIFFERENT FROM THE REFERENCE, AND WHY
 *
 * 1. THE BOUNDARY IS THE SPINE, not a caption. A strip at the top of the page
 *    shows posted months, the months already produced that nobody can see
 *    yet, and the projection — and clicking any part of it moves the chart
 *    window there. The reference mentioned the two-to-three-month lag in
 *    prose and left the reader to keep it in their head.
 *
 * 2. EVERY LEASE IS THE WORKED EXAMPLE. The reference had a demonstration
 *    lease and a footnote saying "open any of your own ten". Here the chart,
 *    the scorecard and the table are one selection: picking a lease anywhere
 *    moves all three.
 *
 * 3. THERE IS A DEDUCTION PANEL. The value model carries a gross volume and a
 *    net volume side by side and nothing anywhere explained the gap. The
 *    state's disposition filing does, it differs by lease, and that is the
 *    most useful thing on this page.
 *
 * 4. OIL HERE IS CONDENSATE, and it is labelled as such. Every lease on this
 *    record is a gas lease whose crude-oil column has been zero in every
 *    month ever filed; the liquid is condensate, in its own column, and the
 *    model's oil figures match it to the barrel.
 *
 * MCF AND BBL ARE NEVER ADDED. No BOE appears on this page in any form — two
 * axes, two colours, two columns everywhere the two products both appear.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { ForecastLease, ForecastMonth, ForecastStat } from '../../_lib/reference/forecast';
import { MCF, BBL, n0, n1, nShort, usd, usdShort, pctS, pct1, plural } from '../../_lib/reference/fmt';
import ForecastChart, { Brush, MEASURE, type Measure, type Products } from './ForecastChart';
import type { ViewProps } from './Dashboard';

/* --------------------------------------------------------------- the window
   Every preset is expressed against the SEAM rather than against an index,
   because the seam moves every time the state posts a month and a hardcoded
   "0 to 40" would quietly point at the wrong months a quarter later. */
type WinKey = 'all' | 'posted' | 'last24' | 'forecast' | 'next12' | 'custom';

const WIN_LABEL: Record<WinKey, string> = {
  all: 'All',
  posted: 'Posted only',
  last24: 'Last 24 posted',
  forecast: 'Forecast',
  next12: 'Next 12 months',
  custom: 'Custom',
};

function windowFor(key: WinKey, n: number, seam: number): [number, number] {
  const last = n - 1;
  /* `seam` is the index of the FIRST PROJECTED month, so the last posted one
     is `seam - 1`. Getting that wrong put July 2026 — a projection — inside a
     window labelled "Posted only". */
  const s = seam > 0 ? seam : last;
  const lastPosted = Math.max(2, s - 1);
  switch (key) {
    case 'posted': return [0, lastPosted];
    case 'last24': return [Math.max(0, s - 25), Math.min(last, s + 1)];
    case 'forecast': return [Math.max(0, s - 1), last];
    /* three months of context, then exactly twelve projected months */
    case 'next12': return [Math.max(0, s - 3), Math.min(last, s + 11)];
    default: return [0, last];
  }
}

/* ------------------------------------------------------------------ helpers */

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="pf2-u">{children}</span>;
}

/** One cell of the dark scorecard: a figure and its unit, or an em dash. */
function Cell(
  { v, unit, kind, share }:
  { v: number | null; unit: string; kind: 'gas' | 'oil'; share?: boolean },
) {
  if (v == null) {
    return <div className={`pf2-c${share ? ' sh' : ''}`}><span className="pf2-vs na">—</span></div>;
  }
  const cls = share
    ? `pf2-vs ${kind === 'gas' ? 'g' : 'o'}`
    : (kind === 'gas' ? 'pf2-vg' : 'pf2-vo');
  return (
    <div className={`pf2-c${share ? ' sh' : ''}`}>
      <span className={`${cls} num`}>
        {v >= 100000 ? nShort(v) : n0(Math.round(v))}
        <Unit>{unit}</Unit>
      </span>
    </div>
  );
}

/**
 * One figure, and the panel behind it.
 *
 * A card WITH a `key` is a real button that opens the explainer for that
 * figure; a card without one stays a plain div. That distinction is the whole
 * point — a card that looks pressable and does nothing is the "I clicked and
 * nothing happened" the activity cards were guilty of, so the affordance only
 * appears where there is something to open.
 */
function Stat(
  { st, open }: { st: ForecastStat; open: (k: string) => void },
) {
  const cls = `pf2-in${st.tone ? ` t-${st.tone}` : ''}`;
  const body = (
    <>
      <span className="pf2-inl">{st.label}</span>
      <span className="pf2-inv num">{st.value}</span>
      {st.sub ? <span className="pf2-ins2">{st.sub}</span> : null}
    </>
  );
  if (!st.key) return <div className={cls}>{body}</div>;
  return (
    <button
      type="button"
      className={`${cls} pf2-inbtn`}
      onClick={() => open(st.key as string)}
      aria-label={`${st.label}: ${st.value}. Open the explanation.`}
    >
      {body}
      <span className="pf2-inmore" aria-hidden="true">What this is →</span>
    </button>
  );
}

/* ==================================================================== view */

export default function ProductionView(
  { p, tier, sample, open }: ViewProps,
) {
  const f = p.forecast;
  const n = f.months.length;
  /* THREE GATES, not one.
     `simple` decides the opening window only. `dense` gates the disposition
     route table and the month-by-month bars, which are the two things on this
     page that genuinely need a reader who wants detail. `ultra` gates the
     reading block. The six insights and both tables stay in every view —
     hiding the plainest-English figures from the plainest view was backwards. */
  const simple = tier === 'ultra' || tier === 'simple';
  const dense = tier === 'detailed' || tier === 'pro';
  const ultra = tier === 'ultra';

  const [leaseId, setLeaseId] = useState<string>('all');
  const [measure, setMeasure] = useState<Measure>('posted');
  const [products, setProducts] = useState<Products>('both');
  const [winKey, setWinKey] = useState<WinKey>(simple ? 'last24' : 'all');
  const [win, setWin] = useState<[number, number]>(
    () => windowFor(simple ? 'last24' : 'all', n, f.seam),
  );
  const [pinned, setPinned] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  /** the series the chart draws: the portfolio, or one lease */
  const picked: ForecastLease | null = leaseId === 'all'
    ? null : (f.leases.find((l) => l.lease_id === leaseId) ?? null);

  /* THE SERIES AND ITS SEAM MOVE TOGETHER. A lease series is not the same
     length as the portfolio series — the portfolio is trimmed to the first
     month anything produced — so reusing the portfolio's seam index against
     a lease's months put the boundary in the wrong year. */
  const series: ForecastMonth[] = picked ? picked.months : f.months;
  const seam = picked ? picked.seam : f.seam;

  /* a change of series re-derives the window rather than keeping an index
     that now points at a different month */
  useEffect(() => {
    setWin(windowFor(winKey === 'custom' ? 'all' : winKey, series.length, seam));
    setPinned(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  const setPreset = (k: WinKey) => {
    setWinKey(k);
    setWin(windowFor(k, series.length, seam));
  };

  /* the scorecard always has a lease: the largest by value when none is
     picked, so the panel is never an empty frame */
  const card = picked ?? f.leases[0] ?? null;

  const jump = (k: WinKey) => {
    setPreset(k);
    chartRef.current?.scrollIntoView({ block: 'center' });
  };

  const t = f.totals;
  const b = f.boundary;
  const d = f.depletion;

  /* the strip: posted · blind · projected, in months, as three proportional
     segments of one bar */
  const postedMonths = seam > 0 ? seam : series.length;
  const blindMonths = b.blind_months.length;
  const projMonths = Math.max(0, b.forecast_months - blindMonths);
  const stripTotal = Math.max(1, postedMonths + projMonths + blindMonths);

  return (
    /* `active` IS LOAD-BEARING. The inherited stylesheet is
       `section[data-route]{display:none}` with `section[data-route].active`
       showing it — a single-page prototype's router. Without the class the
       whole page rendered into the DOM and was invisible. */
    <section data-route="app-production" className="active">
      <div className="between" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 24 }}>Production &amp; Forecast</h2>
          <p className="small muted">
            What <strong>every one of your {t.lease_count} leases</strong> has produced — and
            where the model says it is heading
          </p>
        </div>
        <span className="chip chip-mint">
          Posted volumes real · Texas state filings
        </span>
      </div>

      <div className="notice mint" style={{ marginBottom: 14 }}>
        <span>✦</span>
        <div>
          <strong>What this page is for:</strong> what your leases have produced — gas and
          oil and gas always kept apart, in their own units — and where the model says they are
          heading. Production is what the operator reported to the state of Texas, not what you
          were paid; a payment still only shows on a statement.
        </div>
      </div>

      {/* ULTRA · the sentence the rest of the page is trying to say. The
          reference does the same thing here, and for the same reason: the one
          thing a reader on this tier needs is that the last three months
          being blank is the state, not the wells. */}
      {ultra ? (
        <div
          className="card card-pad"
          style={{ boxShadow: 'none', borderLeft: '4px solid var(--green)', margin: '0 0 14px' }}
        >
          <h4 style={{ marginBottom: 6 }}>
            {b.lag_expected
              ? 'Your wells are running. The last few months just have not been published yet.'
              : 'The state is further behind on these leases than usual.'}
          </h4>
          <p style={{ fontSize: 15, margin: 0 }}>
            Texas has published up to <strong>{b.history_end_label}</strong>. The{' '}
            {b.blind_months.length} {plural(b.blind_months.length, 'month')} since then have been
            produced and sold — they are simply not on the public record yet, which is normal and
            happens to every owner in the state. Everything after{' '}
            <strong>{b.forecast_start_label}</strong> on this page is an estimate, and it gets
            re-drawn every time a new month is published.
          </p>
        </div>
      ) : null}

      {/* ============================================== THE BOUNDARY STRIP
          The page's spine. Every figure below sits on one side of this line
          or the other, and the strip is a control: each segment moves the
          chart window to itself. */}
      <div className="chartbox pf2-seamcard" style={{ marginBottom: 14 }}>
        <div className="between" style={{ flexWrap: 'wrap', padding: '2px 2px 10px' }}>
          <h4>Where the record stops and the model starts</h4>
          <span className={`chip ${b.lag_expected ? 'chip-mint' : 'chip-est'}`}
            style={{ fontSize: 10 }}
          >
            {b.lag_months == null ? 'no posted month'
              : `${b.lag_months} ${plural(b.lag_months, 'month')} behind ${b.this_month_label}`}
          </span>
        </div>

        <div className="pf2-strip" role="group" aria-label="The record in three parts">
          <button
            type="button"
            className="pf2-seg posted"
            style={{ flexGrow: postedMonths / stripTotal }}
            onClick={() => jump('posted')}
            aria-label={`${postedMonths} posted months. Show them in the chart.`}
          >
            <span className="pf2-segn">{postedMonths}</span>
            <span className="pf2-segl">months posted</span>
            <span className="pf2-segd">through {b.history_end_label}</span>
          </button>
          {blindMonths ? (
            <button
              type="button"
              className="pf2-seg blind"
              style={{ flexGrow: Math.max(0.5, (blindMonths / stripTotal) * 3) }}
              onClick={() => jump('next12')}
              aria-label={`${blindMonths} months produced but not yet posted. Show them.`}
            >
              <span className="pf2-segn">{blindMonths}</span>
              <span className="pf2-segl">already produced</span>
              <span className="pf2-segd">{b.blind_labels.join(' · ')}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="pf2-seg proj"
            style={{ flexGrow: projMonths / stripTotal }}
            onClick={() => jump('forecast')}
            aria-label={`${projMonths} projected months. Show them in the chart.`}
          >
            <span className="pf2-segn">{b.forecast_months}</span>
            <span className="pf2-segl">months projected</span>
            <span className="pf2-segd">to {b.forecast_end_label}</span>
          </button>
        </div>

        <p className="pf2-note" style={{ paddingTop: 10 }}>{b.note}</p>
        {blindMonths ? (
          <div className="notice slate" style={{ margin: '4px 0 0' }}>
            <span>◷</span>
            <div>
              <strong>{b.blind_labels.join(', ')} {blindMonths === 1 ? 'is' : 'are'} missing from
              every figure on this page that says &ldquo;posted&rdquo;.</strong>{' '}
              {b.blind_note} A quiet month is far more often a month the state has not published
              than a month the wells did not run.
            </div>
          </div>
        ) : null}
      </div>

      {/* ================================================ THE THREE ESTIMATES */}
      <div className="pf2-topvals">
        {f.cards.map((c) => (
          <div
            key={c.key}
            className="pf2-tv"
            style={c.key === 'six_year' ? { borderColor: '#cfe3da' } : undefined}
          >
            <span className="tvl">{c.label}</span>
            <span className={`tvv num${sample ? '' : ' cl-lock'}`}>{c.value}</span>
            <span className="tvs">{c.sub}</span>
          </div>
        ))}
      </div>

      <p className="small muted" style={{ margin: '-6px 0 14px' }}>
        <strong>Why the first two are ranges:</strong> the price path is held flat at the deck the
        model was run on, the discount off the benchmark moves with quality and with the area,
        gathering and compression deducts differ lease by lease, and the state posts two to three
        months behind. The band is the model&apos;s own stated uncertainty — never a measured
        error.{' '}
        <button type="button" className="linklike" onClick={() => open('value')}>
          What sits behind the estimate →
        </button>
      </p>

      <div className="pf2-ins">
        {f.insights.map((st) => <Stat key={st.label} st={st} open={open} />)}
      </div>

      {/* ============================== THE LIFE OF THE RECORD
          Six figures about the whole thing rather than about next month, and
          the two visuals that carry them. Everything here is measured off the
          same two series the chart draws. */}
      {/* SHOWN AT ESSENTIALS TOO. These are the plainest figures on the page —
          how much is left, when half of it arrives, the best month there has
          ever been. Hiding them from the plainest view was the same mistake
          as hiding the first six. Ultra keeps only its one sentence. */}
      {!ultra ? (
        <div className="pf2-ins pf2-ins2row">
          {f.stats.map((st) => <Stat key={st.label} st={st} open={open} />)}
        </div>
      ) : null}

      {/* ---------------------------------------------- HOW FAR THROUGH IT IS
          A life bar, not a number. Produced against remaining, per product,
          then the same split on every lease — which is where it earns its
          space: the portfolio figure hides a lease at 96% next to one at 40%. */}
      <div className="chartbox" style={{ marginBottom: 14 }}>
        <div className="between" style={{ flexWrap: 'wrap', padding: '2px 2px 12px' }}>
          <h4>How much is already out of the ground</h4>
          <span className="chip chip-est" style={{ fontSize: 10 }}>
            Produced is real · remaining is modelled
          </span>
        </div>

        {/* TWO GAUGES, NOT TWO SLABS. A 14px bar across 1300px of page stops
            being a measure and becomes a block of colour — the eye reads the
            green before it reads the 69%, and the figures it exists to carry
            sat off at the far right with nothing connecting them to the fill.
            An arc puts the percentage inside its own picture. */}
        <div className="pf2-gauges">
          {(['gas', 'oil'] as const).map((k) => {
            const produced = k === 'gas' ? d.gas_produced : d.oil_produced;
            const remaining = k === 'gas' ? d.gas_remaining : d.oil_remaining;
            const pct = k === 'gas' ? d.gas_pct : d.oil_pct;
            const unit = k === 'gas' ? MCF : BBL;
            if (!(produced > 0 || remaining > 0)) return null;
            /* a 180° arc of radius 52 on a 130×74 box: length is π·r, and the
               dash offset is the part NOT yet produced */
            const LEN = Math.PI * 52;
            const done = (Math.min(100, Math.max(0, pct ?? 0)) / 100) * LEN;
            return (
              <div key={k} className="pf2-gauge">
                <svg viewBox="0 0 130 78" role="img"
                  aria-label={`${k === 'gas' ? 'Gas' : 'Oil'}: ${pct ?? 0}% of the total `
                    + `expected volume has been produced.`}
                >
                  <path
                    d="M 13 65 A 52 52 0 0 1 117 65" fill="none"
                    stroke="#eef2f1" strokeWidth="10" strokeLinecap="round"
                  />
                  <path
                    d="M 13 65 A 52 52 0 0 1 117 65" fill="none"
                    stroke={k === 'gas' ? 'var(--green-deep)' : '#b8892f'}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${done} ${LEN}`}
                  />
                  <text
                    x="65" y="57" textAnchor="middle"
                    fontSize="25" fontWeight="800" fill="var(--ink)"
                  >
                    {pct == null ? '—' : `${Math.round(pct)}%`}
                  </text>
                  <text
                    x="65" y="72" textAnchor="middle"
                    fontSize="9.5" fontWeight="800" fill="#8fa3ad" letterSpacing=".08em"
                  >
                    PRODUCED
                  </text>
                </svg>
                <div className="pf2-gaugefacts">
                  <span className={`pf2-gk ${k}`}>{k === 'gas' ? 'Gas' : 'Oil'}</span>
                  <span className="pf2-gr">
                    <em>{nShort(produced)}</em> {unit} out of the ground
                  </span>
                  <span className="pf2-gr">
                    <em>{nShort(remaining)}</em> {unit} still to come
                  </span>
                  {k === 'gas' && d.half_by_label ? (
                    <span className="pf2-gr half">
                      half of the rest by <em>{d.half_by_label}</em>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <p className="pf2-note">{d.note}</p>

        {!simple ? (
          <div className="pf2-lifegrid">
            {/* SORTED BY DEPLETION, not by value. The row order is information
                here: nearest the end of its life first, so the list itself
                answers "which of mine are nearly done". */}
            {[...f.leases]
              .sort((a, b2) => (b2.pct_produced ?? -1) - (a.pct_produced ?? -1))
              .map((l) => (
              <button
                key={l.lease_id}
                type="button"
                className={`pf2-lifeone${leaseId === l.lease_id ? ' on' : ''}`}
                onClick={() => {
                  setLeaseId(l.lease_id);
                  chartRef.current?.scrollIntoView({ block: 'start' });
                }}
                aria-label={`${l.label}: ${l.pct_produced ?? 0}% of its gas produced. Show it in the chart.`}
              >
                <span className="pf2-lifename">{l.label}</span>
                <span className="pf2-lifeminibar">
                  <i
                    className={(l.pct_produced ?? 0) >= 88 ? 'late' : undefined}
                    style={{ width: `${Math.min(100, Math.max(0, l.pct_produced ?? 0))}%` }}
                  />
                </span>
                <span className="pf2-lifeval num">
                  {l.pct_produced == null ? '—' : `${l.pct_produced}%`}
                </span>
              </button>
              ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------- WHAT ARRIVES, BY YEAR
          The one question the three cards at the top cannot answer: not "next
          month" but "each year until it runs out", and which product pays it.
          Stacked columns, because the split IS the point. */}
      {f.annual.length > 1 ? (
        <div className="chartbox" style={{ marginBottom: 14 }}>
          <div className="between" style={{ flexWrap: 'wrap', padding: '2px 2px 6px' }}>
            <h4>Your share, year by year</h4>
            <div className="pf2-legend" role="list" aria-label="Legend">
              <span><span className="pf2-dotk gas" />Gas</span>
              <span><span className="pf2-dotk oil" />Oil</span>
            </div>
          </div>
          {f.mix ? <p className="pf2-sub" style={{ margin: '0 0 10px' }}>{f.mix.note}</p> : null}
          <div className="pf2-years" role="img"
            aria-label={`Projected owner share by year: ${f.annual.map((y) =>
              `${y.year} ${usd(y.value_share)}`).join(', ')}`}
          >
            {f.annual.map((y) => {
              const top = Math.max(...f.annual.map((a) => a.value_share)) || 1;
              const h = Math.max(2, (y.value_share / top) * 100);
              const gasPart = y.value_share > 0 ? (y.gas_value_share / y.value_share) * 100 : 0;
              return (
                <div key={y.year} className="pf2-yr">
                  <span className="pf2-yrv num">{usdShort(y.value_share)}</span>
                  {/* THE COLUMN NEEDS ITS OWN BOX. Its height is a percentage,
                      and with the two labels as flex siblings that percentage
                      resolved against the whole row and was then clamped by
                      flex-shrink — so every year above about 72% drew at the
                      same height. */}
                  <span className="pf2-yrbox">
                    <span className="pf2-yrcol" style={{ height: `${h}%` }}>
                      <i className="gas" style={{ height: `${gasPart}%` }} />
                      <i className="oil" style={{ height: `${100 - gasPart}%` }} />
                    </span>
                  </span>
                  <span className="pf2-yrl">
                    {y.year}
                    {!y.whole ? (
                      <em title={`${y.months} projected months, not a full year`}>
                        {y.months}m
                      </em>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="pf2-note">
            Owner share at your own decimal interest, on the model&apos;s price deck
            {f.deck ? (
              <> — gas at <strong>${f.deck.gas_first.toFixed(2)}</strong> in{' '}
              {f.deck.first_label} to <strong>${f.deck.gas_last.toFixed(2)}</strong> by{' '}
              {f.deck.last_label}</>
            ) : null}
            . A year marked <em>7m</em> is a part year, because the projection starts mid-year —
            it is short for that reason and not because the wells slow down.
          </p>
        </div>
      ) : null}

      {/* ============================================================ THE CHART */}
      <div className="chartbox" ref={chartRef}>
        <div className="pf2-chead">
          <div>
            <h4>
              {picked ? picked.label : `All ${t.lease_count} leases`} — monthly{' '}
              {measure === 'value' ? 'value to you' : 'oil and gas'}, posted then projected
            </h4>
            <p className="pf2-sub">
              {picked ? (
                <>
                  <strong style={{ color: 'var(--ink)', fontWeight: 800 }}>
                    {picked.operator_name ?? 'operator not named'}
                  </strong>
                  <span className="pf2-dot">·</span>{picked.field_name ?? 'field not named'}
                  <span className="pf2-dot">·</span>{picked.county ?? '—'} County, TX
                  <span className="pf2-dot">·</span>
                  <span className="num">{picked.well_count} {plural(picked.well_count, 'well')}</span>
                  {picked.acres ? (
                    <><span className="pf2-dot">·</span><span className="num">{n1(picked.acres)} acres</span></>
                  ) : null}
                  <span className="pf2-dot">·</span>
                  <span className="num">interest {picked.interest_label}</span>
                </>
              ) : (
                <>
                  {t.counties} {plural(t.counties, 'county', 'counties')}
                  <span className="pf2-dot">·</span>{t.operators}{' '}
                  {plural(t.operators, 'operator')}
                  <span className="pf2-dot">·</span>
                  <span className="num">{nShort(t.gas_to_date)} {MCF}</span> and{' '}
                  <span className="num">{nShort(t.oil_to_date)} {BBL}</span> filed to date
                </>
              )}
            </p>
            <p className="pf2-sub">
              {MEASURE[measure].label} — {MEASURE[measure].note}.
            </p>
          </div>
          <div className="pf2-legend" role="list" aria-label="Chart legend">
            <span>
              <span className="pf2-sw" />
              {measure === 'value' ? 'Your share · $/mo' : `Gas · ${MCF}/mo`}
            </span>
            {measure !== 'value' && products !== 'gas' ? (
              <span><span className="pf2-sw oil" />Oil · {BBL}/mo</span>
            ) : null}
            <span className="pf2-lgnote">
              solid = posted to the state&ensp;·&ensp;dashed = model
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------- the controls */}
        <div className="pf2-ctrls">
          <label className="pf2-sel">
            <span>Lease</span>
            <select
              value={leaseId}
              onChange={(e) => setLeaseId(e.target.value)}
              aria-label="Which lease the chart and scorecard show"
            >
              <option value="all">All {t.lease_count} leases together</option>
              {f.leases.map((l) => (
                <option key={l.lease_id} value={l.lease_id}>
                  {l.label}{l.active ? '' : ' · nothing projected'}
                </option>
              ))}
            </select>
          </label>

          <div className="pf2-presets" role="group" aria-label="What the line measures">
            {(['posted', 'net', 'share', 'value'] as Measure[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`pf2-preset${measure === m ? ' on' : ''}`}
                aria-pressed={measure === m}
                onClick={() => { setMeasure(m); setPinned(null); }}
              >
                {MEASURE[m].label}
              </button>
            ))}
          </div>

          {measure !== 'value' ? (
            <div className="pf2-presets" role="group" aria-label="Which products to draw">
              {(['both', 'gas', 'oil'] as Products[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`pf2-preset${products === k ? ' on' : ''}`}
                  aria-pressed={products === k}
                  onClick={() => setProducts(k)}
                >
                  {k === 'both' ? 'Gas + oil' : k === 'gas' ? 'Gas only' : 'Oil only'}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <ForecastChart
          months={series}
          seam={seam}
          measure={measure}
          products={products}
          a={win[0]}
          b={win[1]}
          pinned={pinned}
          onPin={setPinned}
          boundaryLabel={picked ? picked.history_end_label : b.history_end_label}
        />

        <div className="pf2-brushrow">
          <div className="pf2-presets" role="group" aria-label="Time window presets">
            {(['all', 'posted', 'last24', 'next12', 'forecast'] as WinKey[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`pf2-preset${winKey === k ? ' on' : ''}`}
                aria-pressed={winKey === k}
                onClick={() => setPreset(k)}
              >
                {WIN_LABEL[k]}
              </button>
            ))}
          </div>
          <span className="tiny muted pf2-winlab">
            {series[win[0]]?.label} – {series[win[1]]?.label}
            {' · '}{win[1] - win[0] + 1} months of {series.length}
          </span>
        </div>

        <Brush
          months={series}
          seam={seam}
          measure={measure}
          a={win[0]}
          b={win[1]}
          onChange={(x, y) => { setWin([x, y]); setWinKey('custom'); }}
        />

        {f.charts[0]?.footnote ? (
          <p className="pf2-note">{f.charts[0].footnote}</p>
        ) : null}
      </div>

      {/* ================================================== THE ALL-LEASES TABLE */}
      <div className="chartbox" style={{ marginTop: 16 }}>
        <div className="between" style={{ flexWrap: 'wrap', padding: '2px 2px 10px' }}>
          <h4>
            All {t.lease_count} of your leases — what each posted, and what each is set to pay
          </h4>
          <span className="chip chip-est" style={{ fontSize: 10 }}>
            Posted volumes real · owner-share ranges modelled
          </span>
        </div>
        <div className="tablewrap">
          <table className="pf2-tbl2" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Lease</th>
                <th>County · operator</th>
                <th className="right">Last posted month</th>
                <th className="right">Removed</th>
                <th className="right">Next month · your share</th>
                <th className="right">Next quarter</th>
                <th className="right">Through {b.forecast_end_label}</th>
              </tr>
            </thead>
            <tbody>
              {f.leases.map((l) => (
                <tr
                  key={l.lease_id}
                  className={leaseId === l.lease_id ? 'on' : undefined}
                  onClick={() => { setLeaseId(l.lease_id); chartRef.current?.scrollIntoView({ block: 'start' }); }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={leaseId === l.lease_id}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLeaseId(l.lease_id);
                      chartRef.current?.scrollIntoView({ block: 'start' });
                    }
                  }}
                >
                  <td>
                    <strong>{l.label}</strong>
                    {!l.active ? (
                      <span className="chip chip-slate" style={{ fontSize: 9, marginLeft: 6 }}>
                        Nothing projected
                      </span>
                    ) : null}
                    {l.history_end !== b.history_end ? (
                      <span className="chip chip-est" style={{ fontSize: 9, marginLeft: 6 }}>
                        posted to {l.history_end_label}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {l.county ?? '—'}
                    <span className="tiny muted" style={{ display: 'block' }}>
                      {l.operator_name ?? 'operator not named'}
                    </span>
                  </td>
                  <td className="right num">
                    {n0(l.last_gas)} {MCF}
                    <span className="tiny muted" style={{ display: 'block' }}>
                      {l.last_oil > 0 ? `${n0(l.last_oil)} ${BBL}` : `no ${BBL} that month`}
                    </span>
                  </td>
                  <td className="right num">
                    {l.removed_pct == null ? '—' : pct1(l.removed_pct)}
                    {l.route_code ? (
                      <span className="tiny muted" style={{ display: 'block' }}>
                        code {l.route_code}
                      </span>
                    ) : null}
                  </td>
                  <td className="right num">
                    {l.next_month_low != null && l.next_month_low > 0
                      ? `${usd(l.next_month_low)} – ${usd(l.next_month_high)}`
                      : '$0'}
                  </td>
                  <td className="right num">
                    {l.quarter_low != null && l.quarter_low > 0
                      ? `${usd(l.quarter_low)} – ${usd(l.quarter_high)}`
                      : '$0'}
                  </td>
                  <td className="right num">
                    {usdShort(l.six_year)}
                    {l.six_year <= 0 ? (
                      <span className="tiny muted" style={{ display: 'block' }}>
                        a forecast, not lost ownership
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#fafbfc' }}>
                <td><strong>All {t.lease_count} leases</strong></td>
                <td>
                  {t.counties} {plural(t.counties, 'county', 'counties')} · {t.operators}{' '}
                  {plural(t.operators, 'operator')}
                </td>
                <td className="right num">
                  <strong>{n0(t.last_gas)} {MCF}</strong>
                  <span className="tiny muted" style={{ display: 'block' }}>
                    {n0(t.last_oil)} {BBL}
                  </span>
                </td>
                <td className="right num">
                  <strong>{f.disposition.removed_pct == null ? '—' : pct1(f.disposition.removed_pct)}</strong>
                </td>
                <td className="right num">
                  <strong>{usd(t.next_month_low)} – {usd(t.next_month_high)}</strong>
                </td>
                <td className="right num">
                  <strong>{usd(t.quarter_low)} – {usd(t.quarter_high)}</strong>
                </td>
                <td className="right num"><strong>{usdShort(t.six_year)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ padding: '8px 2px 2px' }}>
          <strong>Click any row</strong> to put that lease into the chart and the scorecard below.
          Posted volumes are the gross lease month as filed with the state; the dollar columns are
          <em> your share</em> after your own decimal interest. Ranges are rounded, so the rows
          will not add to the totals to the dollar. A lease projecting $0 forward is a forecast
          about the wells and never a statement about ownership — the interest on the appraisal
          roll is unchanged.
        </p>
      </div>

      {/* ======================================================= THE SCORECARD */}
      {card ? (
        <div className="pf2-duo">
          <div className="chartbox pf2-mapcard">
            <h4>What this lease is</h4>
            <dl className="pf2-facts">
              <div><dt>Operator</dt><dd>{card.operator_name ?? 'not named'}</dd></div>
              <div><dt>Field</dt><dd>{card.field_name ?? 'not named'}</dd></div>
              <div><dt>County</dt><dd>{card.county ?? '—'}</dd></div>
              <div><dt>Wells</dt><dd className="num">{card.well_count}</dd></div>
              {card.acres ? <div><dt>Acres</dt><dd className="num">{n1(card.acres)}</dd></div> : null}
              <div><dt>First posting</dt><dd>{card.first_posting_label ?? '—'}</dd></div>
              <div><dt>Months posted</dt><dd className="num">{card.months_posted}</dd></div>
              <div><dt>Last posted</dt><dd>{card.history_end_label ?? '—'}</dd></div>
              <div><dt>Projection starts</dt><dd>{card.forecast_start_label ?? '—'}</dd></div>
              <div>
                <dt>Gas route</dt>
                <dd>
                  {card.route_code ? `code ${card.route_code}` : 'no filing'}
                  {card.route_share != null ? ` · ${pct1(card.route_share)} of its gas` : ''}
                </dd>
              </div>
            </dl>
            <p className="pf2-mapsub">
              {card.step_pct != null ? (
                <>
                  The model&apos;s first projected month sits <strong>{pctS(card.step_pct)}</strong>{' '}
                  against the last month posted. A step that size is the curve, not a surprise; a
                  large one is worth a question to the operator.
                </>
              ) : (
                'There is no posted month to compare the projection against on this lease.'
              )}
            </p>
          </div>

          <div className="pf2-kband">
            <div className="pf2-kt">
              <h4>Lease scorecard — {card.label}</h4>
              <span className="pf2-int">
                Your interest · {card.interest_label}
                {picked ? null : <em>largest by value</em>}
              </span>
            </div>
            <div className="pf2-tbl">
              <div className="pf2-c gh" />
              <div className="pf2-c gh g">Gas · {MCF}</div>
              <div className="pf2-c gh g sh" />
              <div className="pf2-c gh o">Oil · {BBL}</div>
              <div className="pf2-c gh o sh" />

              <div className="pf2-c shh" />
              <div className="pf2-c shh">Lease</div>
              <div className="pf2-c shh sh">Your share</div>
              <div className="pf2-c shh">Lease</div>
              <div className="pf2-c shh sh">Your share</div>

              <div className="pf2-c"><span className="pf2-l">Produced to date</span></div>
              <Cell v={card.gas_to_date} unit={MCF} kind="gas" />
              <Cell v={card.gas_to_date_share} unit={MCF} kind="gas" share />
              <Cell v={card.oil_to_date} unit={BBL} kind="oil" />
              <Cell v={card.oil_to_date_share} unit={BBL} kind="oil" share />

              <div className="pf2-c">
                <span className="pf2-l">
                  Last month posted · {card.history_end_label ?? '—'}
                </span>
              </div>
              <Cell v={card.last_gas} unit={MCF} kind="gas" />
              <Cell v={card.last_gas_share} unit={MCF} kind="gas" share />
              <Cell v={card.last_oil} unit={BBL} kind="oil" />
              <Cell v={card.last_oil_share} unit={BBL} kind="oil" share />

              <div className="pf2-c">
                <span className="pf2-l">
                  Current monthly rate · decline-anchored
                  <span className="pf2-est">model, first projected month</span>
                </span>
              </div>
              <Cell v={card.rate_gas} unit={MCF} kind="gas" />
              <Cell v={card.rate_gas_share} unit={MCF} kind="gas" share />
              <Cell v={card.rate_oil} unit={BBL} kind="oil" />
              <Cell v={card.rate_oil_share} unit={BBL} kind="oil" share />

              <div className="pf2-c"><span className="pf2-l">Decline rate · compounded</span></div>
              <div className="pf2-c">
                <span className="pf2-vg num">
                  {card.decline_gas_pct == null ? '—' : card.decline_gas_pct}
                  <Unit>%/mo</Unit>
                </span>
              </div>
              <div className="pf2-c sh"><span className="pf2-vs na">—</span></div>
              <div className="pf2-c">
                <span className="pf2-vo num">
                  {card.decline_oil_pct == null ? '—' : card.decline_oil_pct}
                  <Unit>%/mo</Unit>
                </span>
              </div>
              <div className="pf2-c sh"><span className="pf2-vs na">—</span></div>

              <div className="pf2-c">
                <span className="pf2-l">
                  Projected · next 12 months
                  <span className="pf2-est">estimate — not an appraisal</span>
                </span>
              </div>
              <Cell v={card.year_gas} unit={MCF} kind="gas" />
              <Cell v={card.year_gas_share} unit={MCF} kind="gas" share />
              <Cell v={card.year_oil} unit={BBL} kind="oil" />
              <Cell v={card.year_oil_share} unit={BBL} kind="oil" share />

              <div className="pf2-c">
                <span className="pf2-l">
                  Remaining, to {card.forecast_start ? b.forecast_end_label : '—'}
                  <span className="pf2-est">estimate — not an appraisal</span>
                </span>
              </div>
              <Cell v={card.reserves_gas} unit={MCF} kind="gas" />
              <Cell v={card.reserves_gas_share} unit={MCF} kind="gas" share />
              <Cell v={card.reserves_oil} unit={BBL} kind="oil" />
              <Cell v={card.reserves_oil_share} unit={BBL} kind="oil" share />

              <div className="pf2-c">
                <span className="pf2-l">
                  EUR · produced plus remaining
                  <span className="pf2-est">estimate — not an appraisal</span>
                </span>
              </div>
              <Cell v={card.eur_gas} unit={MCF} kind="gas" />
              <Cell v={null} unit={MCF} kind="gas" share />
              <Cell v={card.eur_oil} unit={BBL} kind="oil" />
              <Cell v={null} unit={BBL} kind="oil" share />
            </div>
            <div className="pf2-kstrip">
              <span>
                <strong className="num">
                  {card.next_month_mid != null ? usd(card.next_month_mid) : '$0'}
                </strong>
                next month, midpoint
              </span>
              <span>
                <strong className="num">
                  {card.year_value_share != null ? usd(card.year_value_share) : '$0'}
                </strong>
                next twelve months
              </span>
              <span><strong className="num">{usdShort(card.six_year)}</strong>through {b.forecast_end_label}</span>
              {card.eur_gas_model ? (
                <span>
                  <strong className="num">{nShort(card.eur_gas_model)}</strong>
                  {MCF} EUR, second model
                </span>
              ) : null}
            </div>
            <p className="pf2-kfoot">
              &ldquo;Your share&rdquo; is the lease volume multiplied by your own decimal
              interest of <span className="num">{card.interest_label}</span> — taken from the
              appraisal roll, not an example. Oil and gas are always shown separately in
              their own units and are never combined into one figure. Where the second column of
              a row is an em dash, the quantity is a rate or a lifetime total that an interest
              does not divide.
              {card.eur_gas_model && card.eur_gas ? (
                <>
                  {' '}The reserves and decline model puts this lease&apos;s gas EUR at{' '}
                  {nShort(card.eur_gas_model)} {MCF} against the {nShort(card.eur_gas)} {MCF} the
                  value model implies; both are shown rather than one being picked silently.
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {/* ====================================================== THE DEDUCTION */}
      {f.disposition.available ? (
        <div className="chartbox" style={{ marginTop: 16 }}>
          <div className="between" style={{ flexWrap: 'wrap', padding: '2px 2px 10px' }}>
            <h4>What came out of the ground, and what reached a meter</h4>
            <span className="chip chip-slate" style={{ fontSize: 10 }}>
              State disposition filing · every posted month
            </span>
          </div>

          <div className="pf2-flow">
            <div className="pf2-fl">
              <span className="pf2-fll">Produced at the lease</span>
              <span className="pf2-flv num">{nShort(f.disposition.accounted)} {MCF}</span>
              <span className="pf2-fls">the whole filed record, all {t.lease_count} leases</span>
              <div className="pf2-flbar"><i style={{ width: '100%' }} /></div>
            </div>
            <div className="pf2-flarrow" aria-hidden="true">−</div>
            <div className="pf2-fl warn">
              <span className="pf2-fll">Removed before the meter</span>
              <span className="pf2-flv num">{nShort(f.disposition.removed)} {MCF}</span>
              <span className="pf2-fls">
                {pct1(f.disposition.removed_pct)} of it · the model carries{' '}
                {pct1(f.disposition.forward_pct)} forward
              </span>
              <div className="pf2-flbar warn">
                <i style={{ width: `${Math.min(100, f.disposition.removed_pct ?? 0)}%` }} />
              </div>
            </div>
            <div className="pf2-flarrow" aria-hidden="true">=</div>
            <div className="pf2-fl good">
              <span className="pf2-fll">Reached the sales meter</span>
              <span className="pf2-flv num">{nShort(f.disposition.net)} {MCF}</span>
              <span className="pf2-fls">this is the volume a royalty is calculated on</span>
              <div className="pf2-flbar good">
                <i style={{
                  width: `${Math.max(0, 100 - (f.disposition.removed_pct ?? 0))}%`,
                }}
                />
              </div>
            </div>
          </div>

          <p className="pf2-note">{f.disposition.note}</p>
          <p className="pf2-note">{f.disposition.why}</p>

          {dense ? (
            <>
              <div className="tablewrap" style={{ marginTop: 8 }}>
                <table className="pf2-tbl2" style={{ minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th className="right">Gas moved</th>
                      <th className="right">Share of the record</th>
                      <th className="right">Leases routed this way</th>
                      <th className="right">Removed on that route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.disposition.routes.map((r) => (
                      <tr key={r.code}>
                        <td><strong>Code {r.code}</strong></td>
                        <td className="right num">{nShort(r.volume)} {MCF}</td>
                        <td className="right num">{pct1(r.share)}</td>
                        <td className="right num">
                          {r.leases || '—'}
                          {!r.leases ? (
                            <span className="tiny muted" style={{ display: 'block' }}>
                              never a lease&apos;s main route
                            </span>
                          ) : null}
                        </td>
                        <td className="right num">
                          {r.leases ? pct1(r.removed_pct) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="tiny muted" style={{ padding: '8px 2px 2px' }}>
                The state&apos;s filing splits each month between disposition codes and records
                the removed volume separately, so the deduction is attributed to the code carrying
                the most of that lease&apos;s gas rather than split across all of them. Across
                this record the three codes add to the posted volume in every filed month but one,
                which is out by a single unit of rounding.
              </p>

              <div className="pf2-mini">
                <span className="pf2-minil">
                  Removed, month by month · last {f.disposition.months.length} posted months
                </span>
                <div className="pf2-minibars">
                  {f.disposition.months.map((m) => (
                    <span
                      key={m.cycle}
                      className="pf2-minib"
                      style={{ height: `${Math.min(100, ((m.removed_pct ?? 0) / 20) * 100)}%` }}
                      title={`${m.label}: ${pct1(m.removed_pct)} of ${n0(m.accounted)} ${MCF} removed`}
                    />
                  ))}
                </div>
                <span className="pf2-minis">
                  {f.disposition.months[0]?.label} → {' '}
                  {f.disposition.months[f.disposition.months.length - 1]?.label} · the scale runs
                  to 20%. A month reading zero is a month with no removal filed against it, not a
                  month with none produced.
                </span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* ====================================================== READING IT */}
      {!ultra ? (
        <div className="chartbox pf2-read" style={{ marginTop: 16 }}>
          <div className="between" style={{ flexWrap: 'wrap', padding: '2px 2px 10px' }}>
            <h4>What to take from this page</h4>
            <span className="chip chip-slate" style={{ fontSize: 10 }}>
              {f.findings.length} things worth knowing
            </span>
          </div>
          {/* WAS FIVE LONG PARAGRAPHS. Each one explained a figure that is now
              on the page as a figure, so what is left is only the part a
              number cannot say — one or two sentences, in a grid rather than
              a wall. */}
          <ul className="pf2-finds">
            {f.findings.map((fd) => (
              <li key={fd.label}>
                <strong>{fd.label}</strong>
                <span>{fd.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* =========================================================== THE UNITS */}
      <div className="notice slate" style={{ margin: '14px 0 0' }}>
        <span>▤</span>
        <div>
          <strong>The two units on this page, in plain English.</strong>{' '}
          {f.units.map((u) => (
            <span key={u.unit}>
              <strong> {u.unit}</strong> — {u.body}{' '}
            </span>
          ))}
        </div>
      </div>

      {/* ====================================================== PROVENANCE */}
      {tier === 'pro' ? (
        <div className="chartbox" style={{ marginTop: 16 }}>
          <div className="between" style={{ flexWrap: 'wrap', padding: '2px 2px 10px' }}>
            <h4>Where each figure comes from</h4>
            <span className="chip chip-slate" style={{ fontSize: 10 }}>one filing per claim</span>
          </div>
          <div className="tablewrap">
            <table className="pf2-tbl2" style={{ minWidth: 560 }}>
              <thead>
                <tr><th>Filing</th><th>What it answers here</th><th className="right">As of</th></tr>
              </thead>
              <tbody>
                {f.provenance.map((s) => (
                  <tr key={s.name}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.gives}</td>
                    <td className="right">{s.fresh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
