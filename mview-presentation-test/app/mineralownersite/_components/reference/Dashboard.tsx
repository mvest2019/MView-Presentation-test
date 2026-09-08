'use client';
/**
 * The dashboard — v1's layout, ported.
 *
 * An earlier pass here re-composed the page: its own greeting, its own card
 * selection, its own two-rail split. Same class names, same stylesheets, but a
 * different product. This is v1's structure, section for section, in the same
 * order, with the same card anatomy:
 *
 *    ultra hero (tier-u) · claim rail (nc-only) · greeting + owner chip ·
 *    sample badge · pf-strip · alerts rollup · Essentials hero · what changed ·
 *    alert strip · KPI grid · #dashcols
 *      left   chart (switchable series) · monthly trend · what is going on
 *             around you · operators · wells · every lease (tier-p)
 *      right  what we watched · reserves · neighbours & permits · provenance
 *
 * WHAT IS DELIBERATELY DIFFERENT FROM v1, and only this:
 *
 * 1. "What is going on around you" now reads the ACTIVITY FEED. In v1 that card
 *    showed the value model's own price deck, which is not what is going on
 *    around you — it is the price path the estimate runs on. The deck moved to
 *    its own card underneath, correctly labelled, and this card carries the
 *    permits, completions and status changes filed near the acreage.
 *
 * 2. The affordance says what it opens. v1 printed "explain →" on every cell.
 *
 * 3. The neighbours card carries the feed's own filings, not just ring counts.
 */
import React, { useState } from 'react';
import type { Payload } from '../../_lib/reference/payload';
import {
  n0, n1, usd, usdShort, pctS, vol, volWords, plural, productWord, interest, nShort,
  MCF, BBL,
} from '../../_lib/reference/fmt';
import type { Tier } from './bits';
import { ProductPair } from './bits';
import { Essentials, ProdCols, Wells, ValueMix } from './panels';
import { StateCard } from './funnel';
import { Maturity } from './maturity';
import { Charts } from './LineChart';
import { productCharts } from '../../_lib/reference/chart';
import type { FunnelKey, Route } from './Portal';

export interface ViewProps {
  p: Payload;
  tier: Tier;
  funnel: FunnelKey;
  sample: boolean;
  open: (key: string) => void;
  go: (r: Route) => void;
}

/** the dashboard also drives the plan card, so it needs the two funnel props */
export interface DashProps extends ViewProps {
  trialStarted: string | null;
  setFunnel: (f: FunnelKey) => void;
}

/* the switchable lease chart, exactly v1's set */
type SeriesKey = 'value' | 'gas' | 'oil' | 'appraised' | 'reserves';
interface SeriesDef {
  key: keyof Payload['leases'][number];
  fmt: (v: number) => string;
  cls: string; name: string; title: string; note: string;
}

export default function Dashboard(
  { p, tier, funnel, sample, open, go, trialStarted, setFunnel }: DashProps,
) {
  const t = p.totals;
  const a = p.as_of;
  const al = p.alerts;
  const [series, setSeries] = useState<SeriesKey>('value');

  const unclaimed = funnel === 'unclaimed';
  const pw = productWord(t.has_gas, t.has_oil);
  const top = al.items[0] ?? null;

  return (
    /* `.active` is REQUIRED, not decorative: the prototype ships
       `section[data-route]{display:none}` and only `section[data-route].active`
       is shown. Without it the whole dashboard renders into a hidden element
       and the page comes up empty below the pinned bar. */
    <section data-route="app" id="routeApp" className="active">

      {/* ---------- the plan card: what this account state means ---------- */}
      <StateCard
        p={p} funnel={funnel} trialStarted={trialStarted}
        setFunnel={setFunnel} go={go} open={open}
      />

      {/* ---------- ULTRA: one headline, one status, one action ---------- */}
      {tier === 'ultra' ? <UltraHero p={p} funnel={funnel} open={open} /> : null}

      {/* ---------- the claim rail: UNCLAIMED only ---------- */}
      {unclaimed
        ? (
          <div className="mv-claimrail" id="claimRail">
            <div className="cr-top">
              <span className="cr-dot" aria-hidden="true" />
              <span className="cr-txt">
                <span className="cr-kicker">On file under this name</span>
                <span className="cr-head">
                  {t.lease_count} {plural(t.lease_count, 'lease')} in {t.counties.join(', ')}{' '}
                  {plural(t.county_count, 'County', 'Counties')} are on file under this name
                </span>
                <span className="cr-sub">
                  The {p.owner.roll_year} appraisal roll lists {t.lease_count}{' '}
                  {plural(t.lease_count, 'lease')} here, appraised at {usd(t.appraised_value)}.
                  Claiming is free, takes about two minutes, and never changes who owns your
                  minerals.
                </span>
              </span>
              <span className="cr-act">
                <button className="btn btn-primary btn-lg" type="button" onClick={() => open('identity')}>
                  Claim your record — free, no obligation
                </button>
                <span className="cr-note">Nothing below is your own figure until you do.</span>
              </span>
            </div>
            <div className="cr-key">
              <span><i className="cr-sw cr-sw-green" />Green is activity we watch for you</span>
              <span><i className="cr-sw cr-sw-amber" />Amber is a sample figure, not yours</span>
              <span className="cr-key-end">Dates below are real · amounts are illustrative</span>
            </div>
          </div>
        )
        : null}

      {tier === 'ultra' ? null : (
        <>
          {/* ---------- greeting + page head ---------- */}
          <div className="mv-greet">
            <div>
              <p className="greet-line">{greetLine(p, unclaimed)}</p>
              <h2 className="greet-head">
                {unclaimed
                  ? 'Here is what your dashboard becomes'
                  : `Your minerals, through ${a.data_month_label ?? 'the latest filing'}`}
              </h2>
              <p className="small muted" style={{ margin: '3px 0 0' }}>
                {t.lease_count} {plural(t.lease_count, 'lease')} · {t.producing_count} producing ·{' '}
                {t.reporting_count} filed for {a.data_month_label ?? '—'} · {t.counties.join(', ')} ·{' '}
                {t.operator_count} {plural(t.operator_count, 'operator')}
                {t.plays.length ? ' · ' + t.plays.join(', ') : ''}
              </p>
            </div>
            <span className="owner-chip">
              Owner: <strong>{p.owner.ownername}</strong>
              {p.owner.city ? ' · ' + p.owner.city : ''}{' '}
              <button type="button" className="sw-btn" onClick={() => open('identity')}>
                How we matched this
              </button>
            </span>
          </div>

          {/* ---------- sample badge ---------- */}
          {unclaimed
            ? (
              <div className="smp-badge" id="sampleBadge">
                <strong>This is a preview of a record nobody has claimed.</strong> The dates below
                are real — the {p.owner.roll_year} appraisal roll, state {pw} filings through{' '}
                {a.data_month_label}, and the value model re-run on {a.estimate_run_label}. The
                names and amounts are illustrative. Claiming attaches the real record to your
                account and starts the watch.
              </div>
            )
            : null}

          {/* ---------- pf-strip: the numbers that change ---------- */}
          <PfStrip p={p} sample={sample} open={open} />

          {/* ---------- alerts rollup ---------- */}
          {al.count
            ? (
              <div className="mv-alsum" id="dashAlSum">
                <div className="as-top">
                  <div style={{ minWidth: 0 }}>
                    <span className="as-kicker">What moved — the short version</span>
                    <span className="as-line">
                      <strong className="as-count num">{al.count}</strong>{' '}
                      {plural(al.count, 'finding')} {al.window_label} — {al.window_note}
                      {al.action_count
                        ? <> · <strong>{al.action_count} {al.action_count === 1 ? 'asks' : 'ask'} something of you</strong></>
                        : null}
                      {al.important_count ? ` · ${al.important_count} important` : ''}
                      {al.context_count ? ` · ${al.context_count} for context` : ''}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => go('alerts')}>
                    Open all alerts →
                  </button>
                </div>
                <div className="as-cats">
                  {(Object.keys(al.counts) as (keyof typeof al.counts)[])
                    .filter((k) => k !== 'all' && al.counts[k])
                    .map((k) => (
                      <button
                        key={k} className={'as-cat' + (k === 'money' ? ' as-act' : '')}
                        type="button" onClick={() => go('alerts')}
                      >
                        <b>{al.counts[k]}</b> {CAT_NAME[k] ?? k}
                      </button>
                    ))}
                </div>
                {top
                  ? (
                    <p className="as-top">
                      {top.severity === 'action' ? <span className="as-act-tag">NEEDS YOU</span> : null}
                      <strong>{top.title}</strong> — {top.body}
                    </p>
                  )
                  : null}
              </div>
            )
            : null}

          {/* ---------- ESSENTIALS hero ---------- */}
          {tier === 'simple'
            ? (
              <div className="card card-pad simple-hero" style={{ margin: '14px 0' }}>
                <h3 style={{ marginBottom: 6 }}>Your minerals, in one line</h3>
                <p style={{ fontSize: 16, margin: '0 0 10px' }}>
                  {top
                    ? <><strong>{top.title}</strong> — {top.body}</>
                    : (
                      <>
                        <strong>
                          {t.reporting_count} of your {t.lease_count} {plural(t.lease_count, 'lease')}{' '}
                          filed {pw} in {a.data_month_label}
                        </strong>{' '}
                        — {volWords(t.anchor_gas_net, t.anchor_oil_net)} to you.
                      </>
                    )}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm" type="button"
                    onClick={() => open(top ? topKey(top) : 'value')}
                  >
                    {top ? 'Expand' : 'How your value is built'}
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => go('activities')}>
                    What happened around you
                  </button>
                </div>
              </div>
            )
            : null}

          {/* ---------- ESSENTIALS: the plain-English read ---------- */}
          {tier === 'simple'
            ? <Essentials p={p} sample={sample} open={open} go={go} />
            : null}

          {/* ---------- what changed ---------- */}
          {al.count && tier !== 'simple'
            ? (
              <div
                className="card card-pad" id="changedCard"
                style={{ margin: '12px 0', borderLeft: '4px solid var(--green)' }}
              >
                <div className="between" style={{ flexWrap: 'wrap' }}>
                  <h4>
                    <svg className="mvi-inline" aria-hidden="true"><use href="#mvi-activity" /></svg>{' '}
                    What changed {al.window_label}
                  </h4>
                  <span className="small muted">{al.window_note}</span>
                </div>
                <ul className="timeline" style={{ marginTop: 10 }}>
                  {al.items.slice(0, 5).map((it) => (
                    <li
                      key={it.id} role="button" tabIndex={0}
                      onClick={() => open('alert:' + it.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') open('alert:' + it.id); }}
                    >
                      <strong>{it.title}</strong>
                      <span className="sub tiny muted">{it.body}</span>
                      <span className="sub tiny">
                        {[it.lead_lease, it.event_label].filter(Boolean).join(' · ')}{' '}
                        <span className="ctx-hint">expand →</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
            : null}

          {/* ---------- the alert strip ---------- */}
          {tier === 'detailed' || tier === 'pro'
            ? (
              <div className="al-strip" id="alStrip">
                {al.items.map((it) => (
                  <button
                    key={it.id} type="button"
                    className={'al-mini' + (it.severity === 'action' ? ' gold' : '')}
                    onClick={() => open('alert:' + it.id)}
                  >
                    <span className="al-k">{GLYPH[it.category] ?? '▤'} {it.title}</span>
                    <span className="al-s">
                      {[it.lead_lease, it.event_label, metricText(it)].filter(Boolean).join(' · ')}{' '}
                      <span className="ctx-hint">expand →</span>
                    </span>
                  </button>
                ))}
              </div>
            )
            : null}

          {/* ---------- KPI grid ---------- */}
          {tier === 'detailed' || tier === 'pro'
            ? <KpiGrid p={p} sample={sample} open={open} />
            : null}

          {/* ---------- two columns ---------- */}
          {tier === 'detailed' || tier === 'pro'
            ? (
              <div
                className="grid" id="dashcols"
                style={{ gridTemplateColumns: 'minmax(0,1.42fr) minmax(0,1fr)', gap: 18 }}
              >
                {/* =============================================== LEFT */}
                {/* BALANCE IS BY CONTENT, NOT BY CSS.
                    The rails are measured: with the price deck on the left and
                    the Pro lease table under it, the left ran 3291px against
                    the right's 2745 — a 17% gap, which is the empty rectangle
                    at the bottom of the shorter rail. The price deck is
                    reference material like everything in the right rail, so it
                    moved there, and Maturity (a read nothing was showing) came
                    in on the left. */}
                <div className="stack">
                  <LeaseChart p={p} series={series} setSeries={setSeries} open={open} />
                  <ProdSeries p={p} />
                  <AroundYou p={p} tier={tier} open={open} go={go} />
                  <Maturity p={p} open={open} />
                  <Operators p={p} open={open} />
                  {/* The price deck sits on whichever rail needs the height.
                      Pro adds the every-lease table below, which makes the left
                      rail the long one, so the deck belongs on the right there;
                      Detailed has no table and the right rail is longer, so the
                      deck comes back over. Measured both ways: it takes a 15%
                      and a 17% mismatch down to 3% and 9%. */}
                  {tier === 'pro' ? null : <PriceDeck p={p} open={open} />}
                  {tier === 'pro' ? <RawTable p={p} open={open} /> : null}
                </div>

                {/* ============================================== RIGHT */}
                {/* Six panels, not four. The rail ran out of content well
                    above the left one and left a rectangle of empty page at the
                    bottom; Wells and ValueMix are both reads already in the
                    payload that nothing was showing. */}
                <div className="stack">
                  <Watched p={p} open={open} />
                  {tier === 'pro' ? <PriceDeck p={p} open={open} /> : null}
                  <Reserves p={p} open={open} />
                  <Neighbours p={p} open={open} go={go} />
                  <Wells p={p} open={open} />
                  <ValueMix p={p} open={open} />
                  <Provenance p={p} open={open} />
                </div>
              </div>
            )
            : null}
        </>
      )}
    </section>
  );
}

/* ============================================================ ultra hero */
function UltraHero(
  { p, funnel, open }: { p: Payload; funnel: FunnelKey; open: (k: string) => void },
) {
  const t = p.totals;
  const a = p.as_of;
  const top = p.alerts.items[0] ?? null;
  const unclaimed = funnel === 'unclaimed';

  return (
    /* `.tier-u` is what the prototype's density rule keeps visible in
       view-ultra; `.nc-keep` is what keeps it visible in no-claim, where bare
       .tier-u blocks are hidden. Both are load-bearing. */
    <div className="ultra-hero tier-u nc-keep" id="ultraHero">
      <div className="u-kicker">
        {unclaimed ? 'Your record is on file' : `Your minerals · ${a.data_month_label ?? ''}`}
      </div>
      <h1 className={'u-headline' + (unclaimed ? '' : ' cl-lock')}>
        {unclaimed
          ? `${t.lease_count} ${plural(t.lease_count, 'lease')} are yours to claim`
          : usd(t.owner_value)}
      </h1>
      <p className="u-status">
        {unclaimed
          ? `Appraised at ${usd(t.appraised_value)} on the ${t.appraised_year} roll. Claiming is free.`
          : `Your share across ${t.lease_count} ${plural(t.lease_count, 'lease')}. ` +
            `${t.reporting_count} filed ${productWord(t.has_gas, t.has_oil)} in ${a.data_month_label} — ` +
            `${volWords(t.anchor_gas_net, t.anchor_oil_net)} to you.`}
      </p>
      <div>
        <button
          className="btn btn-primary btn-lg" type="button"
          onClick={() => open(top ? topKey(top) : 'value')}
        >
          {unclaimed ? 'What is on the record' : top ? 'See what changed' : 'See the details'}
        </button>
      </div>
      <p className="u-note">
        Estimate, not an appraisal · re-run {a.estimate_run_label} ·{' '}
        {productWord(t.has_gas, t.has_oil)} through {a.data_month_label}
      </p>
    </div>
  );
}

/* ============================================================= pf-strip */
function PfStrip(
  { p, sample, open }: { p: Payload; sample: boolean; open: (k: string) => void },
) {
  const t = p.totals;
  const a = p.as_of;

  const cells: React.ReactNode[] = [];
  const cell = (
    label: string, val: React.ReactNode, sub: React.ReactNode,
    ctx: string, hint: string, big?: string,
  ) => (
    <div
      className="pf-cell" key={label} role="button" tabIndex={0}
      onClick={() => open(ctx)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(ctx); } }}
    >
      <div className="pf-label">{label}</div>
      <div className={'pf-val num ' + (big ?? '')}>{val}</div>
      <div className="pf-sub">{sub} <span className="ctx-hint">{hint} →</span></div>
    </div>
  );

  /* `.cl-lock` is the prototype's own money gate: it blurs in state-claimed and
     state-lapsed and is untouched in trial and paid. Only the VALUE figures carry
     it — a claimed owner keeps every lease, volume and permit, because they
     claimed them. What Premium adds is what they are worth. */
  cells.push(cell('Your value', usd(t.owner_value),
    <>your share of {usdShort(t.gross_value)} · range {usdShort(t.owner_value_low)}–{usdShort(t.owner_value_high)}</>,
    'value', 'How it is built', 'big cl-lock'));

  /* BOTH PRODUCTS, ALWAYS. These two cells were each conditional on the
     portfolio having that product, so a gas-only owner saw one figure with
     nothing to say whether oil was absent from the record or merely absent
     from the strip — and those are different facts. The missing one now names
     itself, and points at the reserves, where oil can exist even when no
     barrel has ever been filed. */
  if (t.has_gas || t.has_oil) {
    cells.push(cell(`Gas filed in ${a.data_month_label ?? '—'}`,
      t.has_gas
        ? <>{n0(t.anchor_gas_net)}<span className="pf-val-s"> {MCF}</span></>
        : <span className="nodata">none</span>,
      t.has_gas
        ? (t.gas_change_pct == null
          ? 'no earlier filed month to compare'
          : `${pctS(t.gas_change_pct)} against ${a.prev_month_label}`)
        : (t.reserves_gas_net > 0
          ? `no gas has ever been filed — the model still forecasts ${nShort(t.reserves_gas_net)} ${MCF}`
          : 'no gas has ever been filed on these leases'),
      'production', 'Why this is not a cheque'));

    cells.push(cell(`Oil filed in ${a.data_month_label ?? '—'}`,
      t.has_oil
        ? <>{n0(t.anchor_oil_net)}<span className="pf-val-s"> {BBL}</span></>
        : <span className="nodata">none</span>,
      t.has_oil
        ? (t.oil_change_pct == null
          ? 'no earlier filed month to compare'
          : `${pctS(t.oil_change_pct)} against ${a.prev_month_label}`)
        : (t.reserves_oil_net > 0
          ? `no oil has ever been filed — the model still forecasts ${nShort(t.reserves_oil_net)} ${BBL}`
          : 'no oil has ever been filed on these leases'),
      'production', 'Why this is not a cheque'));
  }
  if (!t.has_gas && !t.has_oil) {
    cells.push(cell(`Filed in ${a.data_month_label ?? '—'}`,
      <span className="nodata">nothing filed</span>,
      'no volume on the record for that month', 'production', 'What that means'));
  }

  cells.push(cell('County appraised', usd(t.appraised_value),
    `roll year ${t.appraised_year} · all ${t.lease_count} ${plural(t.lease_count, 'lease')}`,
    'appraised', 'Why it differs'));

  cells.push(cell('Producing',
    <>{t.producing_count}<span className="pf-val-s"> of {t.lease_count}</span></>,
    <>
      {t.behind_count
        ? `${t.reporting_count} filed ${a.data_month_label}, ${t.behind_count} still behind`
        : `all filed ${a.data_month_label}`}
      {' · '}{t.operator_names.join(' · ')}
    </>,
    'producing', 'What paused means'));

  return (
    <div className="pf-strip" id="pfStrip">
      {cells}
      {sample
        ? (
          <div className="pf-cell" style={{ flex: '0 0 auto', minWidth: 120 }}>
            <div className="pf-label">Sample</div>
            <div className="pf-val num" style={{ fontSize: 15 }}>illustrative</div>
            <div className="pf-sub">dates real, amounts are not</div>
          </div>
        )
        : null}
    </div>
  );
}

/* ============================================================= KPI grid */
function KpiGrid({ p, sample, open }: { p: Payload; sample: boolean; open: (k: string) => void }) {
  const t = p.totals;
  const a = p.as_of;
  const r = p.reserves;
  const rad = p.radius['1'];
  const trend = (p.series.months ?? []).map((m) => (t.has_gas ? m.gas_net : m.oil_net));

  const kpi = (
    label: string, val: React.ReactNode, sub: React.ReactNode, chip: string | null,
    fresh: string, ctx: string, hint: string, showSpark: boolean, lock?: string,
  ) => (
    <div
      className="kpi kpi-click" key={label} role="button" tabIndex={0}
      onClick={() => open(ctx)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(ctx); } }}
    >
      <div className="k-label">{label}{sample && lock ? <span className="samp-tag">sample</span> : null}</div>
      <div className={'k-val num ' + (lock ?? '')}>{val}</div>
      {showSpark ? <Spark vals={trend} /> : null}
      <div className="k-sub">
        {sub}
        {chip ? <> <span className="chip chip-est" style={{ fontSize: 10 }}>{chip}</span></> : null}
      </div>
      <div className="k-sub"><span className="ctx-hint">{hint} →</span></div>
      <div className="freshness">{fresh}</div>
    </div>
  );

  return (
    <div className="grid g4" style={{ margin: '14px 0' }} id="kpiGrid">
      {kpi('Your value', usd(t.owner_value),
        'your interest applied to the six-year projection',
        'Estimate — not an appraisal', `re-run ${a.estimate_run_label}`,
        'value', 'How it is built', true, 'cl-lock')}

      {kpi('Leases earning', `${t.producing_count} of ${t.lease_count}`,
        <>
          {t.paused_count
            ? `${t.paused_count} ${plural(t.paused_count, 'lease has', 'leases have')} never filed volume`
            : 'every lease has filed volume'}
          {t.behind_count ? ` · ${t.behind_count} not yet filed for ${a.data_month_label}` : ''}
        </>,
        null, `through ${a.data_month_label}`, 'producing', 'What paused means', false)}

      {kpi('Still to come, your share', vol(t.reserves_gas_net, t.reserves_oil_net, true),
        <>
          remaining reserves
          {r.unmodelled_leases
            ? ` · ${r.unmodelled_leases} ${plural(r.unmodelled_leases, 'lease')} not modelled`
            : ''}
        </>,
        null, `model run ${a.decline_run_label ?? '—'}`, 'reserves', 'What a reserve is', false, 'cl-lock')}

      {kpi('Permits within 1 mile', n0(rad?.permit_count) ?? '0',
        `${rad?.neighbour_lease_count ?? 0} neighbouring ${plural(rad?.neighbour_lease_count ?? 0, 'lease')} inside the ring`,
        null, `survey rebuilt ${a.radius_rebuild_label ?? '—'}`, 'permits', 'Why neighbours matter', false)}
    </div>
  );
}

function Spark({ vals }: { vals: number[] }) {
  const v = vals.filter((x) => x != null);
  if (v.length < 3) return null;
  const max = Math.max(...v) || 1;
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * 90).toFixed(1)},${(18 - (x / max) * 16).toFixed(1)}`);
  const lastY = (18 - (v[v.length - 1] / max) * 16).toFixed(1);
  return (
    <svg className="spark" viewBox="0 0 90 20" width="90" height="20" aria-hidden="true">
      <polyline fill="none" stroke="#54bf96" strokeWidth="1.5" points={pts.join(' ')} />
      <circle cx="90" cy={lastY} r="2" fill="#2e8f6d" />
    </svg>
  );
}

/* ========================================================== lease chart */
function LeaseChart(
  { p, series, setSeries, open }:
  { p: Payload; series: SeriesKey; setSeries: (s: SeriesKey) => void; open: (k: string) => void },
) {
  const t = p.totals;
  const defs = seriesDefs(t);
  const order: SeriesKey[] = ['value'];
  if (t.has_gas) order.push('gas');
  if (t.has_oil) order.push('oil');
  order.push('appraised');
  if (t.reserves_gas_net > 0 || t.reserves_oil_net > 0) order.push('reserves');
  const active = order.includes(series) ? series : 'value';
  const conf = defs[active];

  const leases = [...p.leases].sort(
    (x, y) => (num(y[conf.key]) - num(x[conf.key])));
  const total = leases.reduce((s, l) => s + num(l[conf.key]), 0);
  const max = Math.max(0, ...leases.map((l) => num(l[conf.key])));

  const withVal = leases.filter((l) => num(l[conf.key]) > 0);
  let need = 0;
  let run = 0;
  for (const l of withVal) { run += num(l[conf.key]); need++; if (run >= total / 2) break; }

  return (
    <div className="card card-pad" id="chartCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>{conf.title}</h4>
        <span className="chartbtns">
          {order.map((k) => (
            <button
              key={k} type="button"
              className={'btn btn-ghost btn-sm' + (k === active ? ' on' : '')}
              onClick={() => setSeries(k)}
            >
              {defs[k].name}
            </button>
          ))}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 10px' }}>
        {conf.note} · {leases.length} {plural(leases.length, 'lease')}
        {total > 0 ? ` · total ${conf.fmt(total)}` : ''}
      </p>

      <div id="leaseChart">
        {leases.map((l) => {
          const v = num(l[conf.key]);
          const w = max > 0 ? Math.max((v / max) * 100, v > 0 ? 1.5 : 0) : 0;
          return (
            <div
              className="lbar" key={l.lease_id + String(l.interest_type)}
              role="button" tabIndex={0}
              onClick={() => open('lease:' + l.lease_id)}
              onKeyDown={(e) => { if (e.key === 'Enter') open('lease:' + l.lease_id); }}
              title={`${l.lease_name} — ${conf.fmt(v)}${total > 0 ? ` · ${((v / total) * 100).toFixed(1)}% of the total` : ''} · your interest ${interest(l.interest_value)}`}
            >
              <span className="lb-name">{l.lease_name ?? l.lease_id}</span>
              <span className="lb-track">
                <span className={'lb-fill ' + conf.cls} style={{ width: w.toFixed(2) + '%' }} />
              </span>
              {v > 0
                ? <span className="lb-val">{conf.fmt(v)}</span>
                : <span className="lb-zero">none</span>}
            </div>
          );
        })}
      </div>

      {/* the insight line: CONCENTRATION, which is what a bar chart of ten
          leases actually tells an owner and which no single bar says */}
      {withVal.length && total > 0
        ? (
          <div className="chart-insight">
            <span className="ci-dot" aria-hidden="true" />
            <strong>{withVal[0].lease_name}</strong> alone is{' '}
            <strong>{((num(withVal[0][conf.key]) / total) * 100).toFixed(0)}%</strong> of this
            total, and <strong>{need} of {withVal.length}</strong> {plural(need, 'lease')}{' '}
            {need === 1 ? 'accounts' : 'account'} for half of it.{' '}
            {withVal.length < leases.length
              ? `${leases.length - withVal.length} ${plural(leases.length - withVal.length, 'lease')} contributes nothing here.`
              : 'Every lease contributes something.'}
          </div>
        )
        : null}
    </div>
  );
}

function seriesDefs(t: Payload['totals']): Record<SeriesKey, SeriesDef> {
  const gasReserves = t.reserves_gas_net > 0;
  return {
    value: { key: 'owner_value', fmt: (v) => usd(v) ?? '—', cls: '', name: 'Value',
      title: 'Your value by lease',
      note: 'your interest applied to each lease’s six-year projection' },
    gas: { key: 'anchor_gas_net', fmt: (v) => `${n0(v)} ${MCF}`, cls: 'gas', name: 'Gas',
      title: 'Gas filed to you, by lease',
      note: 'your share of the last month each lease filed' },
    oil: { key: 'anchor_oil_net', fmt: (v) => `${n0(v)} ${BBL}`, cls: 'oil', name: 'Oil',
      title: 'Oil filed to you, by lease',
      note: 'your share of the last month each lease filed' },
    appraised: { key: 'appraised_value', fmt: (v) => usd(v) ?? '—', cls: 'amber',
      name: 'Appraised', title: 'County appraised value, by lease',
      note: 'the appraisal roll’s own figure' },
    reserves: gasReserves
      ? { key: 'reserves_gas_net', fmt: (v) => `${nShort(v)} ${MCF}`, cls: 'slate',
          name: 'Reserves', title: 'Gas still to come, by lease',
          note: 'remaining reserves, your share, from the decline model' }
      : { key: 'reserves_oil_net', fmt: (v) => `${nShort(v)} ${BBL}`, cls: 'slate',
          name: 'Reserves', title: 'Oil still to come, by lease',
          note: 'remaining reserves, your share, from the decline model' },
  };
}

/* ======================================================= monthly trend */
function ProdSeries({ p }: { p: Payload }) {
  const s = p.series;
  const t = p.totals;
  if (!s.months?.length) return null;
  const gas = t.has_gas;
  const key = gas ? 'gas_net' : 'oil_net';
  const unit = gas ? MCF : BBL;
  const filed = s.months.filter((m) => m[key] > 0);
  const max = Math.max(1, ...s.months.map((m) => m[key]));

  let insight: React.ReactNode;
  if (filed.length >= 6) {
    const last3 = filed.slice(-3).reduce((a, m) => a + m[key], 0) / 3;
    const prev3 = filed.slice(-6, -3).reduce((a, m) => a + m[key], 0) / 3;
    const chg = prev3 ? ((last3 - prev3) / prev3) * 100 : null;
    const best = filed.reduce((a, m) => (m[key] > a[key] ? m : a), filed[0]);
    insight = (
      <>
        The last three filed months averaged <strong>{n0(last3)} {unit}</strong> to you,{' '}
        {chg == null
          ? 'with no earlier window to compare'
          : <><strong>{pctS(chg)}</strong> against the three before</>}
        . Best month on record: <strong>{best.label}</strong> at {n0(best[key])} {unit}. Decline is
        normal in a well — a slow taper is the curve doing what it does; a steep one-month drop is
        the thing worth asking about.
      </>
    );
  } else {
    insight = (
      <>Only {filed.length} {plural(filed.length, 'month')} in this window carries a filing — too
        few to read a trend from.</>
    );
  }

  return (
    <div className="card card-pad" id="seriesCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>Your {productWord(t.has_gas, t.has_oil)}, month by month</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {filed.length} of {s.months.length} months filed
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 10px' }}>
        Your share of {productWord(t.has_gas, t.has_oil)} by month, ending{' '}
        {p.as_of.data_month_label}. Months the
        state has not filed yet are drawn grey rather than as a fall to zero — the record carries{' '}
        {p.as_of.unreported_tail_months} such {plural(p.as_of.unreported_tail_months, 'month')}{' '}
        beyond {p.as_of.data_month_label}.
      </p>
      {/* The interactive chart, not the static bars this card used to draw.
          Hover or arrow-key any month for the exact figure the state holds for
          it, instead of estimating it against an axis. */}
      <div id="prodSeries">
        <ProductPair
          subject="your leases"
          months={s.months.map((m) => ({
            label: m.label, cycle: m.cycle,
            /* `leases` is how many of the owner's leases filed that
               month. Zero means nothing was filed, which must draw as a GAP
               rather than as a month of no production — the portfolio series
               carries no per-month `reported` flag, and this is the same
               fact stated by the data it does carry. */
            gas: m.leases === 0 ? Number.NaN : m.gas_net,
            oil: m.leases === 0 ? Number.NaN : m.oil_net,
          }))}
          opts={{
            gasName: 'Gas to you, by month',
            oilName: 'Oil to you, by month',
            sub: `${filed.length} of ${s.months.length} months filed`,
            keyPrefix: 'dash',
          }}
        />
      </div>
      <div className="chart-insight"><span className="ci-dot" aria-hidden="true" />{insight}</div>
    </div>
  );
}

/* ============================================ what is going on around you */
/**
 * v1's card of this name showed the value model's price deck, which is not what
 * is going on around you — it is the price path the estimate is calculated on.
 * This reads the ACTIVITY FEED: the permits, completions and status changes
 * filed in the owner's own counties, with the owner's own rows flagged.
 *
 * The county fold matters here. One collection spells the same county "DEWITT"
 * and another "DE WITT"; matching exactly loses 57% of the permits. The fold is
 * in the feed, and this card shows what it returns.
 */
function AroundYou(
  { p, tier, open, go }:
  { p: Payload; tier: Tier; open: (k: string) => void; go: (r: Route) => void },
) {
  const ac = p.activities;
  const cmp = ac.compare_90;
  const rows = ac.nearby.slice(0, tier === 'pro' ? 8 : 5);

  return (
    <div className="card card-pad" id="marketCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>What’s going on around you</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {ac.counties.join(', ') || 'your counties'}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        Permits, completions and well-status changes filed near your acreage in the last{' '}
        {ac.window_months} months
        {ac.newest_label ? ` · newest filing ${ac.newest_label}` : ''}. Public record, as filed.
      </p>

      <div id="marketBody">
        {ac.counts.nearby
          ? (
            <>
              {([
                ['Permits filed', ac.counts.permits, 'intent to drill — not a well yet', 'permits'],
                ['Wells completed', ac.counts.completions, 'finished and reported — production usually follows', 'completions'],
                ['Standing permits within 1 mile', p.radius['1']?.permit_count ?? 0,
                  `${p.radius['1']?.neighbour_lease_count ?? 0} neighbouring ${plural(p.radius['1']?.neighbour_lease_count ?? 0, 'lease')}`, 'permits'],
                ['On leases you hold', ac.counts.mine,
                  ac.counts.mine ? 'filed against one of your own lease numbers'
                    : 'a permit carries no lease number, so only completions can be matched to you',
                  'completions'],
              ] as const).map(([label, val, why, ctx]) => (
                <div
                  className="setrow" key={label} role="button" tabIndex={0}
                  onClick={() => open(ctx)}
                  onKeyDown={(e) => { if (e.key === 'Enter') open(ctx); }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong className="small">{label}</strong>
                    <div className="tiny muted">{why}</div>
                  </div>
                  <span className="num small" style={{ fontWeight: 800 }}>{n0(val)}</span>
                </div>
              ))}

              {/* the neighbouring filings themselves */}
              <div className="act-list" style={{ marginTop: 10 }}>
                {rows.map((i) => (
                  <div
                    className={'act-item' + (i.is_mine ? ' mine' : '')} key={i.id}
                    role="button" tabIndex={0}
                    onClick={() => open(ctxForKind(i.kind))}
                    onKeyDown={(e) => { if (e.key === 'Enter') open(ctxForKind(i.kind)); }}
                  >
                    <span className={'act-kind ' + i.kind}>{i.type_label}</span>
                    <span className="act-main">
                      <span className="act-name">
                        {i.lease_name ?? 'unnamed lease'}
                        {i.well_number ? ` · well ${i.well_number}` : ''}
                        {i.is_mine
                          ? <span className="samp-tag" style={{ background: 'var(--green)' }}>yours</span>
                          : null}
                      </span>
                      <span className="act-sub">
                        {[i.operator_name, i.county ? i.county + ' Co.' : null, i.field_name,
                          i.profile, i.purpose, i.well_status].filter(Boolean).join(' · ')
                          || 'no further detail on the filing'}
                      </span>
                    </span>
                    <span className="act-when">{i.event_label ?? i.seen_label ?? '—'}</span>
                  </div>
                ))}
              </div>

              <div className="chart-insight">
                <span className="ci-dot" aria-hidden="true" />
                {cmp.change_pct != null
                  ? (
                    <>
                      <strong>{cmp.recent} {plural(cmp.recent, 'filing')} in the last 90 days</strong>{' '}
                      against {cmp.prior} in the 90 before — {cmp.change_pct > 0 ? 'up' : cmp.change_pct < 0 ? 'down' : 'level at'}{' '}
                      {pctS(Math.abs(cmp.change_pct))}. {aroundMeaning(cmp)}
                    </>
                  )
                  : (
                    <>
                      <strong>{cmp.recent} {plural(cmp.recent, 'filing')} in the last 90 days.</strong>{' '}
                      There is no earlier 90-day window in the feed to compare it with, so the
                      direction is not stated rather than guessed.
                    </>
                  )}
              </div>

              <p className="small" style={{ margin: '10px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                A permit next door means somebody intends to drill nearby — it proves the rock, it
                is not your well and it does not pay you.{' '}
                <button type="button" className="linklike" onClick={() => go('activities')}>
                  See all {n0(ac.counts.nearby)} filings →
                </button>
              </p>
            </>
          )
          : (
            <p className="small" style={{ margin: 0 }}>
              No permit, completion or status change has been filed in{' '}
              {ac.counties.join(', ') || 'these counties'} in the last {ac.window_months} months.
              That is the record as it stands, not a gap in the feed
              {ac.newest_label ? ` — the newest filing anywhere in it is ${ac.newest_label}` : ''}.
            </p>
          )}

        {ac.status_note
          ? (
            <p className="tiny muted" style={{ margin: '9px 0 0' }}>
              <strong>One feed is behind.</strong> {ac.status_note} Said out loud rather than shown
              as a zero — “nothing happened” and “we could not see” are different facts.
            </p>
          )
          : null}
      </div>
    </div>
  );
}

/* ========================================================== price deck */
/* v1 had this inside "What's going on around you". It is a different thing —
   the price path the value model runs on, not a market quote and not activity —
   so it is its own card, and it says how it differs from the live settlements
   in the bar at the top of the page. */
function PriceDeck({ p, open }: { p: Payload; open: (k: string) => void }) {
  const d = p.model_deck;
  const t = p.totals;
  if (!d) return null;
  const hist = d.history ?? [];
  const pk: 'gas' | 'oil' = t.has_gas && !t.has_oil ? 'gas' : t.has_oil && !t.has_gas ? 'oil' : 'gas';

  const row = (sym: string, v: string, chg: number | null, why: string) => (
    <div
      className="setrow" key={sym} role="button" tabIndex={0}
      onClick={() => open('prices')}
      onKeyDown={(e) => { if (e.key === 'Enter') open('prices'); }}
    >
      <div style={{ minWidth: 0 }}>
        <strong className="small">{sym} · {v}</strong>
        <div className="tiny muted">{why}</div>
      </div>
      <span
        className="small"
        style={{ fontWeight: 800, color: chg == null ? 'var(--muted)' : chg >= 0 ? 'var(--green-deep)' : '#b3261e' }}
      >
        {chg == null ? 'no prior month' : pctS(chg, 2)}
      </span>
    </div>
  );

  return (
    <div className="card card-pad">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>The price path behind your value</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>{d.label}</span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>{d.basis}</p>

      {(t.has_gas || !t.has_oil)
        ? row('Gas', `$${d.gas.toFixed(3)} /MMBtu`, d.gas_change_pct,
          `the gas price your value is calculated on for ${d.label}`)
        : null}
      {(t.has_oil || !t.has_gas)
        ? row('Oil', `$${d.oil.toFixed(2)} /${BBL}`, d.oil_change_pct,
          `the oil price your value is calculated on for ${d.label}`)
        : null}

      {hist.length > 2 ? <PriceSpark hist={hist} k={pk} /> : null}

      <p className="small" style={{ margin: '10px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
        {t.has_gas && !t.has_oil
          ? `Your leases filed gas and no oil in ${p.as_of.data_month_label}, so the gas line is the one that moves your value.`
          : t.has_oil && !t.has_gas
            ? `Your leases filed oil and no gas in ${p.as_of.data_month_label}, so the oil line is the one that moves your value.`
            : 'Your leases filed both oil and gas, so both lines move your value.'}
        {p.ticker?.items.length
          ? ' The four prices in the bar at the top of the page are a different number — those are published market settlements.'
          : ''}{' '}
        <button type="button" className="linklike" onClick={() => open('prices')}>
          How the two differ →
        </button>
      </p>
    </div>
  );
}

function PriceSpark({ hist, k }: { hist: { label: string | null; gas: number; oil: number }[]; k: 'gas' | 'oil' }) {
  const vals = hist.map((h) => h[k]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = (max - min) || 1;
  const pts = vals.map((v, i) =>
    `${((i / (vals.length - 1)) * 300).toFixed(1)},${(44 - ((v - min) / span) * 38).toFixed(1)}`);
  const dp = k === 'gas' ? 3 : 2;
  return (
    <div className="price-spark">
      <div className="ps-head">
        <strong className="small">
          {k === 'gas' ? 'Gas' : 'Oil'} across the last {hist.length} months
        </strong>
        <span className="tiny muted">{hist[0].label} → {hist[hist.length - 1].label}</span>
      </div>
      <svg viewBox="0 0 300 48" className="ps-svg" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          fill="none" stroke={k === 'gas' ? '#54bf96' : '#b8892f'} strokeWidth="2"
          points={pts.join(' ')}
        />
        <circle
          cx="300" cy={(44 - ((vals[vals.length - 1] - min) / span) * 38).toFixed(1)} r="3"
          fill={k === 'gas' ? '#2e8f6d' : '#8a6420'}
        />
      </svg>
      <div className="ps-ax">
        <span>low ${min.toFixed(dp)}</span>
        <span>high ${max.toFixed(dp)}</span>
      </div>
    </div>
  );
}

/* =========================================================== operators */
function Operators({ p, open }: { p: Payload; open: (k: string) => void }) {
  const o = p.operators;
  const t = p.totals;
  if (!o.operators.length) return null;
  const maxVal = Math.max(1, ...o.operators.map((x) => x.owner_share_value));

  return (
    <div className="card card-pad" id="opCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>Your operators</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {o.operator_count} {plural(o.operator_count, 'operator')}
        </span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        {o.operator_count} {plural(o.operator_count, 'operator')}{' '}
        {o.operator_count === 1 ? 'runs' : 'run'} your {t.lease_count}{' '}
        {plural(t.lease_count, 'lease')}
        {o.latest_handover
          ? `. The most recent handover was ${o.latest_handover.cycle_label}.`
          : '. No handover is recorded on these leases.'}
      </p>
      <div id="opBody">
        {o.operators.map((op) => (
          <div
            className="opscore" key={op.operator_name} role="button" tabIndex={0}
            onClick={() => open('operators')}
            onKeyDown={(e) => { if (e.key === 'Enter') open('operators'); }}
          >
            <div style={{ minWidth: 0 }}>
              <strong className="small">{op.operator_name}</strong>
              <div className="tiny muted">
                {op.lease_count} of your {plural(op.lease_count, 'lease')} · {op.producing} producing ·{' '}
                {vol(op.last_month_gas_net, op.last_month_oil_net, true)} to you last filed month
              </div>
              <div className="op-bar">
                <i style={{ width: ((op.owner_share_value / maxVal) * 100).toFixed(1) + '%' }} />
              </div>
            </div>
            <span
              className="small cl-lock"
              style={{ fontWeight: 800, textAlign: 'right', flex: 'none' }}
            >
              {usdShort(op.owner_share_value)}
              <div className="tiny muted" style={{ fontWeight: 400 }}>
                {((op.owner_share_value / (t.owner_value || 1)) * 100).toFixed(0)}% of your value
              </div>
            </span>
          </div>
        ))}
        {o.handovers.length
          ? (
            <p className="tiny muted" style={{ margin: '9px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              Handovers on record:{' '}
              {o.handovers.slice(0, 3).map((h) => `${h.from_operator} → ${h.to_operator} (${h.cycle_label})`).join(' · ')}
              {' '}— <button type="button" className="linklike" onClick={() => open('operators')}>
                why a handover matters →
              </button>
            </p>
          )
          : null}
      </div>
    </div>
  );
}

/* ============================================================ raw table */
function RawTable({ p, open }: { p: Payload; open: (k: string) => void }) {
  return (
    <div className="card card-pad" id="rawCard">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <h4>Every lease, every field</h4>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        {p.leases.length} {plural(p.leases.length, 'holding')} · one row per interest, because an
        owner can hold one lease under two of them
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Lease</th><th>County</th><th>Operator</th><th>Interest</th>
              <th style={{ textAlign: 'right' }}>Your value</th>
              <th style={{ textAlign: 'right' }}>Appraised</th>
              <th>Last filed</th>
              <th style={{ textAlign: 'right' }}>Your share</th>
              {/* reserves per lease, not the new-well probability. The
                  probability is a model output about acreage; what an owner
                  reads across a table of their own leases is how much is
                  still to come from each one. It also keeps the column in the
                  units they are paid in rather than as a bare percentage. */}
              <th style={{ textAlign: 'right' }}>Gas left</th>
              <th style={{ textAlign: 'right' }}>Oil left</th>
            </tr>
          </thead>
          <tbody>
            {[...p.leases].sort((x, y) => y.owner_value - x.owner_value).map((l) => (
              <tr
                key={l.lease_id + String(l.interest_type)} style={{ cursor: 'pointer' }}
                onClick={() => open('lease:' + l.lease_id)}
              >
                <td><b>{l.lease_name ?? l.lease_id}</b></td>
                <td>{l.county ?? '—'}</td>
                <td>{l.operator_name ?? '—'}</td>
                <td>{interest(l.interest_value)}</td>
                <td style={{ textAlign: 'right' }} className="num">{usdShort(l.owner_value)}</td>
                <td style={{ textAlign: 'right' }} className="num">{usdShort(l.appraised_value)}</td>
                <td>
                  {l.anchor_label ?? 'never'}
                  {l.months_behind ? <span className="tiny muted"> · {l.months_behind}m behind</span> : null}
                </td>
                <td style={{ textAlign: 'right' }} className="num">
                  {vol(l.anchor_gas_net, l.anchor_oil_net, true)}
                </td>
                <td style={{ textAlign: 'right' }} className="num">
                  {l.reserves_gas_net > 0
                    ? `${nShort(l.reserves_gas_net)} ${MCF}`
                    : <em className="muted">none</em>}
                </td>
                <td style={{ textAlign: 'right' }} className="num">
                  {l.reserves_oil_net > 0
                    ? `${nShort(l.reserves_oil_net)} ${BBL}`
                    : <em className="muted">none</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted" style={{ margin: '8px 0 0' }}>
        “Gas left” and “Oil left” are the decline model’s remaining reserves with your interest
        already applied — your share, not the whole lease. A lease showing “none” either has no
        model run or has nothing left in the one it has; the two are different, and the lease’s own
        panel says which.
      </p>
    </div>
  );
}

/* ============================================== what we watched for you */
function Watched({ p, open }: { p: Payload; open: (k: string) => void }) {
  const t = p.totals;
  const a = p.as_of;
  const r = p.reserves;
  const rad = p.radius;
  const rows: [string, string, string, string][] = [
    ['Lease-months read', n0(p.leases.reduce((s, l) => s + l.months_reported, 0)) ?? '0',
      `across ${t.lease_count} ${plural(t.lease_count, 'lease')}, through ${a.data_month_label}`,
      'production'],
    ['Permits tracked',
      `${n0(rad['1']?.permit_count)} / ${n0(rad['3']?.permit_count)} / ${n0(rad['5']?.permit_count)}`,
      `inside 1 / 3 / 5 miles · survey rebuilt ${a.radius_rebuild_label ?? '—'}`, 'permits'],
    ['Leases re-valued', n0(t.valued_count) ?? '0',
      `the model re-ran on ${a.estimate_run_label}`, 'value'],
    ['Decline models', `${n0(r.modelled_leases)} of ${n0(t.lease_count)}`,
      r.unmodelled_leases
        ? `${r.unmodelled_leases} not modelled — shown as such, never as 0%`
        : 'every lease carries a model', 'reserves'],
    ['Wells located', n0(t.well_count) ?? '0', 'with coordinates, status and depth', 'value'],
    ['Filings near you', n0(p.activities.counts.nearby) ?? '0',
      `permits, completions and status changes in the last ${p.activities.window_months} months`,
      'permits'],
  ];
  return (
    <div className="card card-pad" style={{ borderTop: '3px solid var(--green)' }} id="watchCard">
      <div className="between" style={{ flexWrap: 'wrap' }}><h4>✦ What we watched for you</h4></div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        What was actually read for this owner, and when. Each line is a count from the source, not
        a claim about it.
      </p>
      <div id="watchBody">
        {rows.map(([k, v, sub, ctx]) => (
          <div
            className="setrow" key={k} role="button" tabIndex={0}
            onClick={() => open(ctx)} onKeyDown={(e) => { if (e.key === 'Enter') open(ctx); }}
          >
            <div style={{ minWidth: 0 }}>
              <strong className="small">{k}</strong>
              <div className="tiny muted">{sub}</div>
            </div>
            <span className="num small" style={{ fontWeight: 800 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ reserves */
function Reserves({ p, open }: { p: Payload; open: (k: string) => void }) {
  const r = p.reserves;
  const t = p.totals;
  const best = r.probability_best;

  const line = (k: string, v: React.ReactNode, sub: string, ctx: string) => (
    <div
      className="setrow" key={k} role="button" tabIndex={0}
      onClick={() => open(ctx)} onKeyDown={(e) => { if (e.key === 'Enter') open(ctx); }}
    >
      <div style={{ minWidth: 0 }}>
        <strong className="small">{k}</strong>
        <div className="tiny muted">{sub}</div>
      </div>
      <span className="num small" style={{ fontWeight: 800 }}>{v}</span>
    </div>
  );

  return (
    <div className="card card-pad" id="resCard">
      <div className="between" style={{ flexWrap: 'wrap' }}><h4>Reserves &amp; new-well outlook</h4></div>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        From the decline model{r.updated_label ? `, run ${r.updated_label}` : ''}
        {r.forecast_to_label ? `, forecast to ${r.forecast_to_label}` : ''}.
      </p>
      <div id="resBody">
        {line('Still to come, your share', vol(t.reserves_gas_net, t.reserves_oil_net, true),
          `the whole lease holds ${vol(r.reserves_gas, r.reserves_oil, true)} across the ${t.lease_count} ${plural(t.lease_count, 'lease')}`,
          'reserves')}
        {line('Produced so far', vol(t.life_gas_gross, t.life_oil_gross, true),
          'life of lease, on a 100% basis', 'reserves')}
        {line('New-well chance',
          r.probability_avg == null ? 'not modelled' : `${r.probability_avg.toFixed(0)}%`,
          r.probability_avg == null
            ? 'no lease here carries a model — that is not the same as 0%'
            : `average across the ${r.modelled_leases} modelled ${plural(r.modelled_leases, 'lease')}` +
              (r.unmodelled_leases ? ` · ${r.unmodelled_leases} excluded as not modelled` : ''),
          'reserves')}
        {best
          ? line('Best-placed lease', `${(best.probability ?? 0).toFixed(0)}%`,
            `${best.lease_name}${best.probability_category ? ' · ' + best.probability_category : ''}`,
            'lease:' + best.lease_id)
          : null}
        {r.unmodelled_leases
          ? (
            <p className="tiny muted" style={{ margin: '9px 0 0' }}>
              A lease with no model is shown as “not modelled”, never as 0% — printing zero would
              tell you your acreage has no chance of a new well when the truth is nobody modelled it.
            </p>
          )
          : null}
      </div>
    </div>
  );
}

/* ========================================================== neighbours */
function Neighbours(
  { p, open, go }: { p: Payload; open: (k: string) => void; go: (r: Route) => void },
) {
  const rad = p.radius;
  const ac = p.activities;
  return (
    <div className="card card-pad" id="radCard">
      <h4>Neighbours &amp; standing permits</h4>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        These are STANDING permits. The survey behind them was rebuilt {p.radius_stamp ?? '—'}, and
        that date stamps the survey, not any one filing.
      </p>
      <div id="radBody">
        {(['1', '3', '5'] as const).map((b) => {
          const r = rad[b];
          if (!r) return null;
          return (
            <div
              className="setrow" key={b} role="button" tabIndex={0}
              onClick={() => open('permits')}
              onKeyDown={(e) => { if (e.key === 'Enter') open('permits'); }}
            >
              <div style={{ minWidth: 0 }}>
                <strong className="small">Within {b} {plural(Number(b), 'mile')}</strong>
                <div className="tiny muted">
                  {r.neighbour_lease_count} neighbouring {plural(r.neighbour_lease_count, 'lease')}{' '}
                  — your own {plural(p.totals.lease_count, 'lease')} excluded
                </div>
              </div>
              <span className="num small" style={{ fontWeight: 800 }}>
                {n0(r.permit_count)}
                <div className="tiny muted" style={{ fontWeight: 400 }}>
                  {plural(r.permit_count, 'permit')}
                </div>
              </span>
            </div>
          );
        })}
        {ac.operators.length
          ? (
            <p className="tiny muted" style={{ margin: '9px 0 0', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              Busiest nearby:{' '}
              {ac.operators.slice(0, 2).map((o) => `${o.operator_name} (${o.total})`).join(' · ')}
              {' '}— <button type="button" className="linklike" onClick={() => go('activities')}>
                the whole feed →
              </button>
            </p>
          )
          : null}
      </div>
    </div>
  );
}

/* ========================================================== provenance */
function Provenance({ p, open }: { p: Payload; open: (k: string) => void }) {
  const o = p.owner;
  const cov = p.coverage;
  return (
    <div className="card card-pad" id="provCard">
      <h4>Where every number came from</h4>
      <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
        Every read is keyed on this owner’s own leases. Freshness is the source’s, not this page’s.
      </p>
      <div id="provBody">
        {p.sources.map((s) => (
          <div className="srcrow" key={s.name}>
            <span className="s-name">{s.name}</span>
            <span className="s-gives">{s.gives}</span>
            <span className="s-fresh">{s.fresh}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
        <strong className="small">How this owner was identified</strong>
        <p className="tiny muted" style={{ margin: '4px 0 6px' }}>
          {o.identity_note}{' '}
          <button type="button" className="linklike" onClick={() => open('identity')}>
            what was matched →
          </button>
        </p>
        {o.other_identities?.length
          ? (
            <p className="tiny" style={{ margin: '0 0 8px' }}>
              That owner number is also used by <strong>{o.other_identities.length}</strong> other{' '}
              {plural(o.other_identities.length, 'owner')} on this roll — matching on the number
              alone would have pulled in leases that are not this owner’s.
            </p>
          )
          : null}
        {o.collapsed_rows
          ? <p className="tiny muted" style={{ margin: '0 0 8px' }}>{o.collapse_note}</p>
          : null}
        <strong className="small">
          Source coverage of the {p.totals.lease_count} {plural(p.totals.lease_count, 'lease')}
        </strong>
        <p className="tiny muted" style={{ margin: '4px 0 0' }}>
          {Object.entries(cov).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v.have}/${v.of}`).join(' · ')}
        </p>
      </div>
    </div>
  );
}

/* ================================================================ bits */
const CAT_NAME: Record<string, string> = {
  money: 'Money', activity: 'Activity', models: 'Models & forecasts', community: 'Community',
};
const GLYPH: Record<string, string> = {
  money: '✓', activity: '⚑', models: '◔', community: '◉',
};

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function ctxForKind(k: string): string {
  return k === 'completion' ? 'completions' : k === 'status' ? 'status' : 'permits';
}

export function topKey(ev: { category: string }): string {
  return ev.category === 'money' ? 'production'
    : ev.category === 'models' ? 'reserves'
      : ev.category === 'activity' ? 'permits' : 'value';
}

function metricText(it: { metric: number | null; metric_unit: string | null }): string | null {
  if (it.metric == null) return null;
  return `${n1(it.metric)}${it.metric_unit ? ' ' + it.metric_unit : ''}`;
}

/* the greeting reads the VIEWER's clock — the only "now" on this page, and the
   only thing here that legitimately is one */
function greetLine(p: Payload, unclaimed: boolean): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('en-US',
    { weekday: 'long', day: 'numeric', month: 'long' });
  return part + (unclaimed ? '' : ', ' + p.owner.first_name) + ' · ' + day;
}

function aroundMeaning(cmp: Payload['activities']['compare_90']): string {
  if (cmp.recent_completions > cmp.prior_completions) {
    return 'The rise is in completions rather than permits, which is the stronger signal: a ' +
      'completed well usually starts filing production within weeks.';
  }
  if (cmp.recent_permits > cmp.prior_permits) {
    return 'The rise is in permits — intent to drill rather than a well yet. Worth watching, ' +
      'not yet worth expecting.';
  }
  if ((cmp.change_pct ?? 0) < -20) {
    return 'A quieter quarter nearby says nothing about your own leases, which file on their own ' +
      'schedule.';
  }
  return 'Neither permits nor completions moved much, so nothing has changed around this acreage.';
}
