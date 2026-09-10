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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Payload } from '../../_lib/reference/payload';
import { formatLakhs } from '../../_lib/format-lakhs';
import { usePortalMember } from '../portal-session';
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
  /* WHO IS READING, for the greeting. The context is filled on the SERVER in
     the group's layout from the httpOnly `mv_user` cookie, so the name is in
     the first HTML and no signed-in identity is ever requested from the
     browser. `null` when nobody is signed in, which `greetLine` handles. */
  const member = usePortalMember();
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

      {/* ---------- SAMPLE PREVIEW: UNCLAIMED only ----------

           ONE BANNER, AND THE PAGE BELOW IT IS THE PAID PAGE. This replaced a
           claim rail whose own headline, sub-copy, CTA and two-swatch legend
           re-arranged the top of the dashboard, so the state a visitor is
           being shown looked like a different product rather than like the
           thing they get by claiming — which is the one job this state has.
           The rail's facts are not lost: the lease count, the counties and the
           appraised figure are all on the greeting line and the strip
           immediately below, and the sidebar carries "Claim Mineral Owner"
           throughout this state.

           `.smp-badge` / `.smp-tag` ARE THE EXISTING PAIR, not new styling —
           the amber dashed box at `dashboard-reference.css:387`, its pill at
           388 and its paragraph at 389. The same markup already carries this
           message on My Leases and on the Weekly Report, so the sample state
           reads identically wherever a visitor meets it.

           TWO LINES, AND THE SENTENCE RUNS THE FULL WIDTH. The shared rule is
           a `flex` row, so the pill took a column and the copy wrapped in what
           was left of it — five short lines in a box as wide as the page. The
           column direction is set HERE, inline on this one banner, and not in
           `.smp-badge`: that class is also My Leases' and the Weekly Report's,
           and re-flowing their banners is not this change. The copy is cut to
           the two facts a reader needs before they look at a figure — whose
           record this is, and that the amounts are not real. The roll year,
           the filing month and the model run date left with it; all three are
           already printed on the strip and the cards below. */}
      {unclaimed
        ? (
          <div
            className="smp-badge" id="sampleBadge"
            style={{ flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap', gap: 6 }}
          >
            <span className="smp-tag" style={{ alignSelf: 'flex-start' }}>SAMPLE PREVIEW</span>
            {/* `stretch` on the box and `flex-start` on the pill, rather than a
                width on this paragraph. The shared rule grows it along a ROW
                (`flex: 1`); turned into a column that sizes it to its content
                instead — 615px of a 1114px box — and a percentage width did
                not fix it, because the shared `flex-wrap: wrap` puts a
                column-direction item on a flex line whose cross size is its
                own. Stretching the line is what actually widens it, and the
                pill opts out so it keeps hugging its label.

                `maxWidth: none` LIFTS A DELIBERATE CAP, and only here. The
                reference measures this paragraph at `78ch`
                (`dashboard-reference.css`, the rule it shares with
                `.simple-hero > p`, `#mvStateCard` and `.act-empty p`) — a
                readability limit, not an oversight. At 13px that is 615px, so
                in a 1114px box the banner ran three short lines with half its
                width empty. The brief is two lines across the full width, and
                the copy above was cut to suit it. The cap is untouched for
                every other element that shares the rule. */}
            <p style={{ maxWidth: 'none' }}>
              <strong>This is what your dashboard looks like once you claim your record.</strong>{' '}
              Every figure below belongs to <strong>{p.owner.ownername}, a fictional sample
              owner</strong> — the dates are real, the amounts are illustrative. Claiming is
              free, takes about two minutes, and never changes legal ownership.
            </p>
          </div>
        )
        : null}

      {tier === 'ultra' ? null : (
        <>
          {/* ---------- greeting + page head ---------- */}
          <div className="mv-greet">
            <div>
              <p className="greet-line">{greetLine(p, member?.firstName)}</p>
              {/* THE PAID HEADLINE, IN EVERY STATE. "Here is what your dashboard
                  becomes" was the unclaimed variant, and it described the page
                  instead of naming the record on it — the banner above now does
                  the describing, so this can go back to being the same sentence
                  a claimed owner reads. */}
              <h2 className="greet-head">
                Your minerals, through {a.data_month_label ?? 'the latest filing'}
              </h2>
              <p className="small muted" style={{ margin: '3px 0 0' }}>
                {t.lease_count} {plural(t.lease_count, 'lease')} · {t.producing_count} producing ·{' '}
                {t.reporting_count} filed for {a.data_month_label ?? '—'} ·{' '}
                {/* THE COUNTIES COLLAPSE TO A COUNT once there are more than
                    five of them. Twenty names is not a fact anyone reads — it
                    is a wall the eye skips, and it pushed this line to three
                    rows. The names are kept on the `title`, so hovering still
                    answers "which ones", and the map and the leases table both
                    list them properly. */}
                {t.counties.length > MAX_COUNTY_NAMES
                  ? (
                    <span title={t.counties.join(', ')}>
                      {t.counties.length} {plural(t.counties.length, 'county', 'counties')}
                    </span>
                  )
                  : t.counties.join(', ')} ·{' '}
                {t.operator_count} {plural(t.operator_count, 'operator')}
                {t.plays.length ? ' · ' + t.plays.join(', ') : ''}
              </p>
            </div>
            {/* ADAPTED · the reference says "Owner:"; this build says
                "Mineral Owner:", which is the term the rest of this app uses
                for the same thing — the sidebar heading, the owner search and
                the claim flow all say mineral owner.

                THE CITY AND "HOW WE MATCHED THIS" LEFT THIS CHIP. The city was
                a second, quieter answer to the question the name already
                answers, and the identity drawer it sat beside is still one
                click away from the account menu ("How this record was
                identified") and from the "what was matched →" hint in the
                sources card. What the chip lacked was the thing an account
                with more than one claimed record actually needs: a way to see
                which of them is filling the page. */}
            <OwnerSwitch p={p} />
          </div>

          {/* the sample badge moved to the top of the page — see SAMPLE
              PREVIEW above, which is the only place this state announces
              itself now. */}

          {/* ---------- pf-strip: the numbers that change ---------- */}
          <PfStrip p={p} sample={sample} open={open} />

          {/* ---------- alerts rollup ---------- */}
          {al.count
            ? (
              <div className="mv-alsum" id="dashAlSum">
                <div className="as-top">
                  <div style={{ minWidth: 0 }}>
                    {/* THE SAMPLE MARKER IS NOT PLACED HERE ANY MORE. It belongs
                        beside EVERY card title on the not-claimed page, not
                        just this one, so it is drawn from a single rule in
                        `dashboard-reference.css` keyed on `.no-claim` — see
                        "the sample marker" there. Hand-placing it per card
                        meant fourteen edits and a fifteenth card that quietly
                        went unmarked. */}
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
                  <Neighbors p={p} open={open} go={go} />
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

  /* LAKHS, ON THE SAMPLE PAGE ONLY.

     The brief is that the not-claimed dashboard reads its MVestimate and its
     production figures in lakhs. It is a presentation step and nothing else:
     `formatLakhs` takes the already-formatted string and hands one back, so no
     value is restated and a figure it cannot parse comes through untouched
     rather than as `NaN`. Its own threshold means a figure under one lakh is
     returned as it was — "17,306" stays "17,306", because "0.17 L" is harder to
     read and throws away two digits.

     GATED ON `sample`, deliberately. A claimed owner's own money keeps the
     format their statements and the rest of the product use; only the
     illustrative record is re-expressed. */
  const lakhs = (display: string | null) =>
    (sample && display != null ? formatLakhs(display) : display);

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
  cells.push(cell('Your value', lakhs(usd(t.owner_value)),
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
        ? <>{lakhs(n0(t.anchor_gas_net))}<span className="pf-val-s"> {MCF}</span></>
        : <span className="nodata">none</span>,
      t.has_gas
        ? (t.gas_change_pct == null
          ? 'no earlier filed month to compare'
          : `${pctS(t.gas_change_pct)} against ${a.prev_month_label}`)
        : (t.reserves_gas_net > 0
          ? `no gas has ever been filed — the model still forecasts ${nShort(t.reserves_gas_net)} ${MCF}`
          : 'no gas has ever been filed on these leases'),
      'production', 'Why this is not a cheque'));

    /* THE FIGURE IS THE FIX HERE, not the wording. This cell read
       "no oil has ever been filed" for a record holding 1.9M barrels of it,
       because the volume was being taken from a column the state leaves empty
       on a gas lease. `rules.liquid` reads whichever column it was filed in;
       the label is just "Oil", which is what an owner's statement calls it. */
    cells.push(cell(`Oil filed in ${a.data_month_label ?? '—'}`,
      t.has_oil
        ? <>{lakhs(n0(t.anchor_oil_net))}<span className="pf-val-s"> {BBL}</span></>
        : <span className="nodata">none</span>,
      t.has_oil
        ? (t.oil_change_pct == null
          ? 'no earlier filed month to compare'
          : `${pctS(t.oil_change_pct)} against ${a.prev_month_label}`)
        : (t.reserves_oil_net > 0
          ? `nothing filed that month — the model forecasts `
            + `${nShort(t.reserves_oil_net)} ${BBL} ahead`
          : 'no oil on the record for that month'),
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
      {' · '}{t.operator_names.slice(0, MAX_OPERATOR_NAMES).join(' · ')}
      {/* AND THE REST BEHIND ONE CONTROL. Fifty-seven names ran the cell down
          past the fold and stretched every tile in the strip to match. The
          overflow opens the `operators` explainer, which is not a new panel:
          it is the drawer this page already fetches for every payload, and it
          lists every operator with its lease count, its volume and its share
          of the value — more than the names ever said.

          `stopPropagation` on BOTH handlers. The tile around this is itself a
          `role="button"` that opens the `producing` drawer, so without it a
          click here opens the wrong panel, and Enter on the focused control
          opens both. */}
      {t.operator_names.length > MAX_OPERATOR_NAMES
        ? (
          <>
            {' · '}
            <button
              type="button" className="pf-more"
              onClick={(e) => { e.stopPropagation(); open('operators'); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
              }}
            >
              +{t.operator_names.length - MAX_OPERATOR_NAMES} more
            </button>
          </>
        )
        : null}
    </>,
    'producing', 'What paused means'));

  return (
    <div className="pf-strip" id="pfStrip">
      {/* NO SIXTH CELL WHILE SAMPLING. A cell reading "Sample / illustrative"
          sat in the strip beside the five figures, so the sample state laid
          out differently from the paid one — five cells became six, and every
          cell narrowed. The banner at the top of the page says the same thing
          once, and the strip keeps the amber ring `.no-claim` already puts
          round it (`dashboard-reference.css:1351`). */}
      {cells}
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

  /* LAKHS, ON THE SAMPLE PAGE ONLY.

     The brief is that the not-claimed dashboard reads its MVestimate and its
     production figures in lakhs. It is a presentation step and nothing else:
     `formatLakhs` takes the already-formatted string and hands one back, so no
     value is restated and a figure it cannot parse comes through untouched
     rather than as `NaN`. Its own threshold means a figure under one lakh is
     returned as it was — "17,306" stays "17,306", because "0.17 L" is harder to
     read and throws away two digits.

     GATED ON `sample`, deliberately. A claimed owner's own money keeps the
     format their statements and the rest of the product use; only the
     illustrative record is re-expressed. */
  const lakhs = (display: string | null) =>
    (sample && display != null ? formatLakhs(display) : display);

  const kpi = (
    label: string, val: React.ReactNode, sub: React.ReactNode, chip: string | null,
    fresh: string, ctx: string, hint: string, showSpark: boolean, lock?: string,
  ) => (
    <div
      className="kpi kpi-click" key={label} role="button" tabIndex={0}
      onClick={() => open(ctx)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(ctx); } }}
    >
      {/* NO PER-CARD TAG. It repeated the page banner on four cards and
          pushed the labels onto a second line at Detailed width, which the
          paid page does not do. */}
      <div className="k-label">{label}</div>
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
      {kpi('Your value', lakhs(usd(t.owner_value)),
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
        `${rad?.neighbour_lease_count ?? 0} neighboring ${plural(rad?.neighbour_lease_count ?? 0, 'lease')} inside the ring`,
        null, `survey rebuilt ${a.radius_rebuild_label ?? '—'}`, 'permits', 'Why neighbors matter', false)}
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
        {/* ADAPTED · TOP TEN ONLY. The reference draws a bar for every lease the
            record holds; a live account can carry far more than fits the card,
            so the render is capped at ten. `leases` itself is NOT capped — the
            total, the maximum and the "half your value" count above are facts
            about the whole portfolio and are still computed over all of it. */}
        {leases.slice(0, 10).map((l) => {
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
                  `${p.radius['1']?.neighbour_lease_count ?? 0} neighboring ${plural(p.radius['1']?.neighbour_lease_count ?? 0, 'lease')}`, 'permits'],
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

              {/* ADAPTED · THE PER-FILING LIST IS NOT RENDERED. The reference
                  prints the neighbouring permits and completions one by one
                  here. It was removed at the owner's request: the counts above
                  and the 90-day comparison below already say what the card is
                  for, and the row-by-row feed repeated on the Activities page,
                  which is where the whole list belongs. Nothing else in the
                  card changed, and `activities.nearby` is still read for
                  `counts.nearby` and the "See all N filings" link.

                  `ctxForKind` and this component's `tier` prop fed only that
                  list and are now unreferenced. They are LEFT IN PLACE, beside
                  the reference's own unused declarations, so restoring the list
                  is a matter of putting the block back rather than rebuilding
                  its plumbing. ESLint reports them as two warnings, not
                  errors. */}
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
  /* BEFORE THE EARLY RETURN, because it is a hook. An owner whose operator
     list arrives empty on one render and filled on the next would change the
     hook order between them, which React treats as a different component and
     throws on. `eslint react-hooks/rules-of-hooks` caught this. */
  const pg = usePaged(o.operators);
  if (!o.operators.length) return null;
  /* THE BAR SCALE IS THE WHOLE LIST'S, not the page's. Scaling to the page
     would make the largest operator on page six look like the largest overall
     — every page would end in a full bar and the comparison the bars exist
     for would be gone. */
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
        {pg.rows.map((op) => (
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
        <Pager
          page={pg.page} pages={pg.pages} setPage={pg.setPage} start={pg.start}
          shown={pg.rows.length} total={o.operators.length} label="Operators pages"
        />
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
  /* SORTED ONCE, not on every page turn. 1,659 rows re-sorted on each click of
     the pager is work with nothing to show for it — the order never changes. */
  const sorted = useMemo(
    () => [...p.leases].sort((x, y) => y.owner_value - x.owner_value), [p.leases],
  );
  const pg = usePaged(sorted);
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
            {pg.rows.map((l) => (
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
      <Pager
        page={pg.page} pages={pg.pages} setPage={pg.setPage} start={pg.start}
        shown={pg.rows.length} total={sorted.length} label="Lease table pages"
      />
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
function Neighbors(
  { p, open, go }: { p: Payload; open: (k: string) => void; go: (r: Route) => void },
) {
  const rad = p.radius;
  const ac = p.activities;
  return (
    <div className="card card-pad" id="radCard">
      <h4>Neighbors &amp; standing permits</h4>
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
                  {r.neighbour_lease_count} neighboring {plural(r.neighbour_lease_count, 'lease')}{' '}
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

/* ================================================================ pager */
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
function usePaged<T>(items: T[]) {
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

function Pager(
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

/**
 * HOW MANY NAMES A LIST PRINTS BEFORE IT COLLAPSES TO A COUNT.
 *
 * Both numbers are the point where a list stops informing and starts pushing
 * the page around. A portfolio with 1,659 leases across 20 counties and 57
 * operators wrapped the greeting onto three lines and grew the Producing cell
 * to eight times the height of the four beside it — the strip is a row of
 * equal tiles, so one tall cell stretches all five.
 *
 * FIVE AND THREE, not one rule for both. The counties sit in a sentence that
 * already carries five other facts, so five names is as much as it can hold
 * without becoming the line's subject. The operators sit under a figure in a
 * narrow tile, where three is a sample and anything more is a wall.
 */
const MAX_COUNTY_NAMES = 5;
const MAX_OPERATOR_NAMES = 3;

/* ============================================================ owner switch */
/**
 * WHICH CLAIMED RECORD IS FILLING THIS PAGE — the chip, and the panel behind it.
 *
 * WHY IT EXISTS. One account can hold several owner records: a spouse, a family
 * trust, an inherited interest. `/api/v1/dashboard` answers with the one it
 * resolved (`owner.ownername`) and lists the rest in `owner.claimed_owners`,
 * and until now the page named the active one and said nothing about the
 * others — so an owner with three records had no way to tell which of the
 * three every figure on the page belonged to, or that the other two existed.
 *
 * EVERY FIGURE IN HERE IS THE PAYLOAD'S. The name, the roll number, the lease
 * count, the counties and the list of other records are all read off the same
 * answer the strip is drawn from, so the panel cannot disagree with the page it
 * explains — the failure the drawer endpoint's `owner` parameter is documented
 * against in `owner-data.ts`.
 *
 * SWITCHING IS NOT WIRED, AND NO CONTROL PRETENDS IT IS. There is no endpoint:
 * `/api/v1/dashboard?member_id=&owner=` answers 502, so the active record
 * cannot be changed from here yet. The other records are therefore LISTED —
 * which is honest and is itself the missing information — and not given a
 * button that would do nothing. The one action in the panel is the claim flow,
 * which does exist. When the API can take an owner, each row becomes the
 * control; nothing else here has to change.
 */
function OwnerSwitch({ p }: { p: Payload }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  /* A click anywhere else, or Escape, closes it — the same contract the
     account menu and the demo state menu in `Chrome` already keep. */
  useEffect(() => {
    if (!open) return undefined;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const active = p.owner.ownername;
  /* The active record is in this list too — it is filtered out rather than
     assumed to be first, because the endpoint does not promise an order. */
  const others = (p.owner.claimed_owners ?? []).filter((o) => o !== active);
  const counties = p.totals.counties ?? [];

  return (
    <span className="owner-chip mv-ownersw" ref={box}>
      Mineral Owner: <strong>{active}</strong>
      <button
        type="button" className="sw-btn" aria-expanded={open} aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        Switch Owner ▾
      </button>

      {open ? (
        <div className="ownersw-pop" role="dialog" aria-label="Switch the active owner record">
          <h4>Switch the active owner record</h4>
          <p className="ownersw-lede">
            One account can hold several owner records — a spouse, a family trust,
            an inherited interest. Switching swaps <strong>which record fills every
            page</strong>: dashboard, leases, map, alerts and reports.
          </p>

          {/* THE LIST SCROLLS, THE PANEL DOES NOT. This account holds eight
              claimed records and the panel grew to 802px against a 720px
              viewport, which put the claim button — the only working control
              in here — below the fold with no scrollbar to suggest it was
              there. Capping the list keeps the heading, the button and the
              seven-day note on screen whatever the account holds. */}
          <div className="ownersw-list">
          <div className="ownersw-rec is-active">
            <div className="ownersw-name">
              {active}
              <span className="ownersw-now">✓ Active now</span>
            </div>
            <div className="ownersw-meta">
              {p.owner.ownernumber ? <>{p.owner.ownernumber} · </> : null}
              {p.totals.lease_count} {plural(p.totals.lease_count, 'lease')}
              {counties.length ? <> · {counties.join(', ')}</> : null}
            </div>
          </div>

          {others.length
            ? others.map((o) => (
              <div className="ownersw-rec" key={o}>
                <div className="ownersw-name">{o}</div>
                {/* NOT A BUTTON. See the header: there is no endpoint to switch
                    to this record yet, and a row that looks clickable and is
                    not is worse than a row that plainly waits. */}
                <div className="ownersw-meta">Claimed · waiting its turn</div>
              </div>
            ))
            : (
              <p className="ownersw-empty">
                No other owner records on this account yet — claim one below and it
                appears here, ready to switch to.
              </p>
            )}
          </div>

          <Link className="ownersw-cta" href="/mineralownersite/claim">
            + Claim another owner record — free
          </Link>

          <p className="ownersw-foot">
            You can change the active record <strong>once every 7 days</strong>.
            Claimed records are never removed by switching — they just wait their
            turn.
          </p>
        </div>
      ) : null}
    </span>
  );
}

/* the greeting reads the VIEWER's clock — the only "now" on this page, and the
   only thing here that legitimately is one */
function greetLine(p: Payload, memberFirstName?: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('en-US',
    { weekday: 'long', day: 'numeric', month: 'long' });
  /* THE READER, NOT THE RECORD.

     This greeted `owner.first_name` — the name on the appraisal roll — which
     is a different person from the one reading the page whenever a member
     claims a record filed under a relative's name, a trust or a company. It
     also read "Good morning, there" in the sample state, because that is what
     `sample.ts` substitutes into the record. The signed-in member's own first
     name comes from the session (`portal-member.ts`, via the context the
     group's layout fills on the server), so the greeting is right in every
     state — including the sample one, where the banner above has already said
     the figures are not theirs.

     THE RECORD IS STILL THE FALLBACK. Nobody is signed in on a shared link or
     a cold visit, and greeting the record is better than greeting no one. */
  const who = memberFirstName || p.owner.first_name;
  return part + (who ? ', ' + who : '') + ' · ' + day;
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
