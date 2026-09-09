'use client';
/**
 * Activities — one timeline of six event kinds, under two controls.
 *
 * WHAT WAS WRONG WITH THE LAST PASS, and what each fix is:
 *
 * 1. THE KIND CARDS LOOKED DEAD. They did filter the timeline, but the timeline
 *    sits a full screen below them behind two charts, so a click changed
 *    nothing the reader could see and the cards read as decoration. They also
 *    had no accessible name: the browser reported six unnamed buttons. Now a
 *    card carries its own affordance line, an aria-label, a pressed state that
 *    is visible without scrolling, and clicking one MOVES the page to the
 *    timeline it just filtered — plus a filter summary bar that names the
 *    active filter and can clear it.
 *
 * 2. THERE WAS NO WAY TO NARROW A DATE. 886 events with no date control is a
 *    list, not an answer. So: 30 / 60 / 90 days, twelve months, since January
 *    2025 — the production spec's own floor — all dates, and a custom month
 *    range whose options begin at January 2025.
 *
 * 3. THERE WAS NO DISTANCE, only "nearby". The mile buttons are backed by
 *    measured distance from `WellGeoData` (sources/nearby) and by the ring
 *    counts from `LeaseRadiusData` (lib/rings). Both are real, and the two
 *    answer different halves of the question, so the row says which it is:
 *    a row with a measured distance carries it; a row matched only by county
 *    says so instead of implying a mile it cannot prove.
 *
 * EVERY FILTER IS A STRING COMPARISON against the eight-character sort key the
 * ordering already uses — see the reference's lib/timeline.ts, rule 3. No date
 * parsing happens in the browser at all.
 *
 * PORTED FROM `src/components/ActivitiesView.tsx` in the reference build, and
 * the ONLY change is where four imports point: `fmt`, `chart` and `bits` at
 * this app's paths, and the two row types at the payload seam
 * (`_lib/reference/payload`) instead of at `lib/timeline`, which also builds
 * the rows out of Mongo and so could not come across. No markup, no class, no
 * copy and no arithmetic is this build's.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { EventKind, TimelineEvent, RingKey } from '../../_lib/reference/payload';
import { n0, nShort, plural, pctS, MCF, BBL } from '../../_lib/reference/fmt';
import { Band, Spark, ProductPair } from './bits';
import { Charts } from './LineChart';
import { type ChartSpec } from '../../_lib/reference/chart';
import type { ViewProps } from './Dashboard';

const KIND_ICON: Record<EventKind, string> = {
  permit: 'mvi-flag',
  completion: 'mvi-check',
  production: 'mvi-leases',
  adjacent: 'mvi-map',
  status: 'mvi-activity',
  operator: 'mvi-claim',
};

/* ------------------------------------------------------------- the ranges */
type RangeKey = '30' | '60' | '90' | '365' | 'jan25' | 'all' | 'custom';

const RANGE_LABEL: Record<RangeKey, string> = {
  30: '30 days',
  60: '60 days',
  90: '90 days',
  365: '12 months',
  jan25: 'Since Jan 2025',
  all: 'All dates',
  custom: 'Custom range',
};

/** the four the brief asks for, then the two wider ones, then custom */
const RANGE_ORDER: RangeKey[] = ['30', '60', '90', '365', 'jan25', 'all', 'custom'];

type MileKey = '1' | '3' | '5' | 'all';
const MILE_ORDER: MileKey[] = ['1', '3', '5', 'all'];

export default function ActivitiesView({ p, tier, funnel, sample, open, go }: ViewProps) {
  const tl = p.timeline;
  const ac = p.activities;
  const rg = p.rings;

  /* THE PAGE OPENS ON HER OWN LEASES.
     It used to open on 'all', and for this owner that is 890 rows of which
     133 are hers — so the first screen was her neighbors' permits and her own
     production was pages down. The neighborhood still matters and is one
     click away, but a page about your minerals should lead with your
     minerals. */
  const [kind, setKind] = useState<EventKind | 'all' | 'mine'>('mine');
  const [range, setRange] = useState<RangeKey>('all');
  const [from, setFrom] = useState<string>(tl.range.floor_month);
  const [to, setTo] = useState<string>(tl.range.months[0]?.value ?? tl.range.floor_month);
  const [mi, setMi] = useState<MileKey>('all');
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  /* the click on a kind card has to LAND somewhere, or it looks like nothing
     happened — see note 1 at the top of this file */
  const feed = useRef<HTMLDivElement | null>(null);
  const [jump, setJump] = useState(0);

  const unclaimed = funnel === 'unclaimed';
  const ring = rg.rings[(mi === 'all' ? '1' : mi) as RingKey];

  useEffect(() => {
    if (!jump || !feed.current) return;
    feed.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [jump]);

  /* --------------------------------------------------- the two range bounds
     Both are eight characters, like every sort key, so the filter is a string
     comparison. A custom "to" month is padded to 99 rather than 00 so the
     whole of that month is inside the range. */
  const [lo, hi] = useMemo((): [string, string] => {
    const c = tl.range.cutoffs;
    switch (range) {
      case '30': return [c.d30, '99999999'];
      case '60': return [c.d60, '99999999'];
      case '90': return [c.d90, '99999999'];
      case '365': return [c.m12, '99999999'];
      case 'jan25': return [tl.range.floor_key, '99999999'];
      case 'custom': {
        const a = from <= to ? from : to;
        const b = from <= to ? to : from;
        return [a + '00', b + '99'];
      }
      default: return ['', '99999999'];
    }
  }, [range, from, to, tl.range]);

  const inRange = (e: TimelineEvent) => {
    /* A STANDING FACT IS NEVER REMOVED BY A DATE FILTER. It carries no date, so
       a date filter cannot include or exclude it honestly. It stays, pinned
       below the dated rows by the ordering, and the summary line says so. */
    if (!e.sort_key) return true;
    return e.sort_key >= lo && e.sort_key <= hi;
  };

  const inMiles = (e: TimelineEvent) => {
    if (mi === 'all') return true;
    /* the neighbour rows ARE the rings — they carry their figures at every
       band, so a mile button changes what they say rather than whether they
       are there */
    if (e.kind === 'adjacent') return true;
    if (e.ring == null) return false;
    return e.ring <= Number(mi);
  };

  const matches = (e: TimelineEvent, needle: string) => {
    if (!needle) return true;
    return [e.title, e.body, e.lease_name, e.county, e.operator_name, e.when_label,
      e.distance_mi != null ? `${e.distance_mi} mi` : null,
      ...e.stats.map((s) => `${s.label} ${s.value}`)]
      .filter(Boolean).join(' ').toLowerCase().includes(needle);
  };

  /* what survives the two scope filters but NOT the kind filter — the counts
     the kind cards show, so a card's number is the number it would give you */
  const scoped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tl.events.filter((e) => inRange(e) && inMiles(e) && matches(e, needle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tl.events, lo, hi, mi, q]);

  const rows = useMemo(() => scoped.filter((e) => {
    if (kind === 'mine') return e.is_mine;
    if (kind === 'all') return true;
    return e.kind === kind;
  }), [scoped, kind]);

  const scopedCount = (k: EventKind) => scoped.filter((e) => e.kind === k).length;
  /* counted on `rows`, the list actually on screen. Counted on `scoped` — the
     list before the kind filter — the summary read "120 of 886 events" above
     "133 on your leases", and no reader can tell which list either number is
     about. */
  const shownMine = rows.filter((e) => e.is_mine).length;
  const shownStanding = rows.filter((e) => e.standing).length;
  const shownRing = rows.filter((e) => e.scope === 'ring').length;
  const scopedMine = scoped.filter((e) => e.is_mine).length;

  const cap = tier === 'pro' ? 40 : 20;
  const shown = showAll ? rows : rows.slice(0, cap);
  const filtered = kind !== 'all' || range !== 'all' || mi !== 'all' || q.trim() !== '';

  /* WHY A DAY WINDOW EMPTIES THE PRODUCTION CARD, said out loud where the
     reader presses the button rather than left as a zero to interpret. A
     production filing lands months after the month it covers, so "last 30
     days" legitimately contains none of them while the permit feed runs to
     within days of today. Measured on this owner: the newest filed month is
     June 2026 against a newest permit of September 3, 2026. */
  const prodKind = tl.kinds.find((k) => k.kind === 'production');
  const dayWindow = range === '30' || range === '60' || range === '90';
  const lagHint = dayWindow && prodKind && prodKind.count > 0 && !scopedCount('production')
    ? `No month of production falls inside ${RANGE_LABEL[range].toLowerCase()}. The newest month `
      + `the state has filed for your leases is ${prodKind.newest} — a production filing arrives `
      + 'months after the month it covers, while the permit and completion feeds run to within '
      + 'days of today. Widen the range to see your own months.'
    : null;

  /* ------------------------------------------------------ the month chart
     Built from the FILTERED rows rather than from a fixed server window, so
     narrowing the range or the distance visibly redraws it. */
  const monthSpecs = useMemo((): ChartSpec[] => {
    /* TWO SERIES, AND TWENTY-FOUR MONTHS.
       Three series over thirty-six months was about a hundred bars in three
       hues, and the third — status changes — is zero in most months, so it
       spent a whole colour on nothing. Permits and completions are the pair
       the question is actually about, in the two colours those kinds already
       carry on the cards and the timeline dots. */
    const dated = scoped.filter((e) => e.cycle
      && (e.kind === 'permit' || e.kind === 'completion'));
    if (dated.length < 3) return [];
    const cycles = [...new Set(dated.map((e) => e.cycle as string))].sort().slice(-24);
    const idx = new Map(cycles.map((c, i) => [c, i]));
    const zero = () => new Array(cycles.length).fill(0) as number[];
    const perm = zero(); const comp = zero();
    for (const e of dated) {
      const i = idx.get(e.cycle as string);
      if (i == null) continue;
      if (e.kind === 'permit') perm[i] += 1;
      else comp[i] += 1;
    }
    const label = (c: string) => {
      const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${m[Number(c.slice(4, 6)) - 1] ?? c.slice(4, 6)} ${c.slice(0, 4)}`;
    };
    const series = [
      { name: 'Permits', colour: FILINGS_COLOUR.permit, points: perm },
      { name: 'Completions', colour: FILINGS_COLOUR.completion, points: comp },
    ];
    return [{
      key: 'act:filings',
      label: 'Permits and completions, by month',
      sub: `${cycles.length} ${plural(cycles.length, 'month')} in this filter`
        + (mi === 'all' ? '' : ` · within ${mi} ${mi === '1' ? 'mile' : 'miles'}`),
      unit: '', dp: 0,
      x: cycles.map(label),
      series,
      /* BARS, NOT A LINE. A count per month is a bar. As a line it drew a
         slope between one month and the next, which says "the trend fell"
         about two numbers that are simply two numbers — and with a 30-day
         range it was a single straight segment between two points. */
      kind: 'bars',
      footnote: 'Permits are intent to drill; completions are wells finished and reported. When '
        + 'the green bars grow against the amber, wells are being finished rather than planned — '
        + 'which is the point at which production usually follows. This chart follows the filters '
        + 'above, so it redraws when you change the range or the distance.',
    }];
  }, [scoped, mi]);

  /* the months the chart drew, in the same order, so a click on bar `i` maps
     back to the month it is a bar of */
  const monthCycles = useMemo(() => {
    const dated = scoped.filter((e) => e.cycle
      && (e.kind === 'permit' || e.kind === 'completion'));
    return [...new Set(dated.map((e) => e.cycle as string))].sort().slice(-24);
  }, [scoped]);

  /* the owner's own filed months — BOTH products, always */
  const prodMonths = useMemo(() => p.series.months.map((m) => ({
    label: m.label, cycle: m.cycle,
    gas: m.leases === 0 ? Number.NaN : m.gas_net,
    oil: m.leases === 0 ? Number.NaN : m.oil_net,
  })), [p.series.months]);

  /* the neighbourhood curve — what the leases inside the ring produce */
  /* THE NEIGHBOURHOOD CURVE, ONE PANEL PER PRODUCT.
     This was a single BOE line. BOE is a blend nobody is paid in, and it
     hides which product the neighborhood actually makes — so it goes through
     the same builder the owner's own months use, which gives gas its MCF
     panel and oil its BBL panel and drops a product that never produced
     rather than drawing it as a flat zero. */
  const ringMonths = useMemo(
    () => ring.series.map((x) => ({ label: x.label, cycle: x.cycle, gas: x.gas, oil: x.oil })),
    [ring],
  );

  const reset = () => {
    setKind('all'); setRange('all'); setMi('all'); setQ(''); setShowAll(false);
  };

  const pickKind = (k: EventKind) => {
    setKind((cur) => (cur === k ? 'all' : k));
    setShowAll(false);
    setJump((j) => j + 1);
  };

  return (
    <section data-route="app-activities" className="active">

      {/* ---------- the claim rail: UNCLAIMED only ---------- */}
      {unclaimed
        ? (
          <div className="mv-claimrail">
            <div className="cr-top">
              <span className="cr-dot" aria-hidden="true" />
              <div className="cr-txt">
                <span className="cr-kicker">Your one next step</span>
                <strong className="cr-head">Claim your mineral owner record</strong>
                <span className="cr-sub">
                  The neighboring filings below are the real public record. What is missing is
                  the half that is <strong>yours</strong> — your own production, your operator
                  changes, your rings. Claiming is <strong>free</strong> and never changes who
                  owns your minerals.
                </span>
              </div>
              <span className="cr-act">
                <button className="btn btn-primary btn-lg" type="button" onClick={() => open('identity')}>
                  Claim your record — free, no obligation
                </button>
                <span className="cr-note">Have a family invite code? Enter it during the claim.</span>
              </span>
            </div>
            <p className="cr-key">
              <span><span className="cr-sw cr-sw-green" aria-hidden="true" /><b>Green</b> — live, watched daily</span>
              <span><span className="cr-sw cr-sw-amber" aria-hidden="true" /><b>Amber</b> — a labeled example, not yours yet</span>
              <span className="cr-key-end">Claiming turns the amber into your green.</span>
            </p>
          </div>
        )
        : null}

      {/* ==================================== ULTRA: one number, one action */}
      <Band tier={tier} to="ultra">
        <div className="ultra-hero tier-u nc-keep">
          <div className="u-dot" aria-hidden="true" />
          <p className="u-kicker">Around your minerals</p>
          <h2 className="u-headline">
            {n0(tl.events.filter((e) => !e.standing).length)} <strong>things happened</strong>
          </h2>
          <p className="u-status">
            {tl.counts.production} production {plural(tl.counts.production, 'filing')} on your
            leases, {tl.counts.completion} {plural(tl.counts.completion, 'completion')} and{' '}
            {tl.counts.permit} {plural(tl.counts.permit, 'permit')} around you
            {tl.counts.operator ? `, and ${tl.counts.operator} operator change` : ''}
            {tl.counts.operator > 1 ? 's' : ''}.
            {ring.neighbour_leases
              ? ` Inside a mile of your wells sit ${ring.neighbour_leases} other `
                + `${plural(ring.neighbour_leases, 'lease')}, ${ring.producing} of them producing.`
              : ''}
          </p>
          <div>
            <button className="btn btn-primary btn-lg" type="button" onClick={() => open('permits')}>
              Why neighbors matter
            </button>
          </div>
          <p className="u-note">
            We read the state record every day. Most days it says nothing about your acreage — and
            we will still have looked.
          </p>
        </div>
      </Band>

      <Band tier={tier} from="simple">
        {/* ---------- header ---------- */}
        <div className="between" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 24, margin: 0 }}>Activities</h2>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              {unclaimed ? 'This record' : 'Your leases'} first — production filed, operator
              changes and your rings — then everything filed around{' '}
              {unclaimed ? 'it' : 'you'}: permits, completions and well-status changes in your{' '}
              {plural(p.totals.counties.length, 'county', 'counties')}
            </p>
          </div>
          <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => go('alerts')}>
              What needs me →
            </button>
          </div>
        </div>

        {unclaimed
          ? (
            <div className="smp-badge">
              <span className="smp-tag">Sample preview</span>
              <p>
                <strong>The neighboring filings here are real.</strong> Permits, completions,
                well-status changes and the measured distances are public record and shown as
                filed. The rows marked as yours — production, operator changes and your rings —
                belong to a sample owner until you claim.{' '}
                <strong>Free, no-obligation account.</strong>
              </p>
            </div>
          )
          : null}

        {/* ============================================== THE CONTROL BAR */}
        <div className="act-ctl">
          <div className="ac-row">
            <span className="ac-lab">Date range</span>
            <div className="ac-seg" role="group" aria-label="Filter by date">
              {RANGE_ORDER.map((r) => (
                <button
                  key={r} type="button"
                  className={range === r ? 'on' : ''}
                  aria-pressed={range === r}
                  onClick={() => { setRange(r); setShowAll(false); }}
                >
                  {RANGE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {range === 'custom'
            ? (
              <div className="ac-row ac-custom">
                <span className="ac-lab">Months</span>
                <label className="ac-sel">
                  <span>From</span>
                  <select value={from} onChange={(e) => setFrom(e.target.value)}>
                    {tl.range.months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </label>
                <label className="ac-sel">
                  <span>To</span>
                  <select value={to} onChange={(e) => setTo(e.target.value)}>
                    {tl.range.months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </label>
                <span className="ac-note">
                  The month list starts at <strong>January 2025</strong> — the floor the production
                  record itself uses. Anything filed before that is reachable with{' '}
                  <em>All dates</em>.
                </span>
              </div>
            )
            : null}

          <div className="ac-row">
            <span className="ac-lab">Distance</span>
            <div className="ac-seg" role="group" aria-label="Filter by distance">
              {MILE_ORDER.map((m) => (
                <button
                  key={m} type="button"
                  className={mi === m ? 'on' : ''}
                  aria-pressed={mi === m}
                  onClick={() => { setMi(m); setShowAll(false); }}
                  title={m === 'all'
                    ? 'Everything, including the rows that carry no location'
                    : `Only rows measured within ${m} ${m === '1' ? 'mile' : 'miles'} of your wells`}
                >
                  {m === 'all' ? 'County-wide' : `${m} mi`}
                </button>
              ))}
            </div>
            <span className="ac-note">
              {mi === 'all'
                ? (
                  <>
                    Every row, including the {n0(tl.county_count)} matched to you by county alone.
                    A mile button keeps only the {n0(tl.ring_count)} whose location the record
                    actually carries.
                  </>
                )
                : (
                  <>
                    Measured from your nearest well surface location — {' '}
                    <strong>{ring.measured.rows}</strong>{' '}
                    {plural(ring.measured.rows, 'record')} inside {mi}{' '}
                    {mi === '1' ? 'mile' : 'miles'}
                    {ring.measured.nearest_mi != null
                      ? <>, the closest <strong>{ring.measured.nearest_mi.toFixed(2)} mi</strong> away</>
                      : null}.
                  </>
                )}
            </span>
          </div>

          <div className="ac-row">
            <span className="ac-lab">Search</span>
            <input
              className="ac-search"
              type="search" value={q} onChange={(e) => { setQ(e.target.value); setShowAll(false); }}
              placeholder="Lease, operator, county, field, or any word…"
              aria-label="Search the timeline"
            />
          </div>

          <div className="ac-sum">
            <strong>
              {n0(rows.length)} of {n0(tl.events.length)}{' '}
              {plural(tl.events.length, 'event')}
            </strong>
            <span>
              {shownMine ? `${n0(shownMine)} on your leases` : 'none on your leases'}
              {shownRing ? ` · ${n0(shownRing)} measured in miles` : ''}
              {shownStanding
                ? ` · ${shownStanding} standing ${plural(shownStanding, 'fact')}, which carry no `
                  + 'date and so are never removed by the range'
                : ''}
            </span>
            {filtered
              ? (
                <button type="button" className="ac-clear" onClick={reset}>
                  Clear all filters
                </button>
              )
              : null}
          </div>

          {lagHint ? <p className="ac-lag">{lagHint}</p> : null}
        </div>

        {/* ================================================= THE PULSE STRIP */}
        <div className="act-pulse">
          <Pulse
            label="In this filter"
            value={n0(rows.length) ?? '0'}
            sub={range === 'all' ? 'all dates on record' : RANGE_LABEL[range].toLowerCase()}
          />
          <Pulse
            label="On your leases"
            value={n0(shownMine) ?? '0'}
            sub={`of ${n0(tl.mine_count)} the record proves are yours`}
          />
          <Pulse
            label="Newest dated event"
            value={tl.newest_label ?? '—'}
            sub={tl.range.today_iso ? `read through ${tl.range.today_iso}` : 'from the state record'}
          />
          <Pulse
            label={`Within ${ring.radius_mi} ${ring.radius_mi === 1 ? 'mile' : 'miles'}`}
            value={n0(ring.neighbour_leases) ?? '0'}
            sub={`neighboring ${plural(ring.neighbour_leases, 'lease')} · `
              + `${ring.producing} producing`}
          />
        </div>

        {/* =============================================== the six kind cards */}
        <div className="act-band">
          What the record produced{unclaimed ? ' — sample figures, real dates' : ''}
          <span className="ab-hint">click a card to filter the timeline</span>
        </div>
        <div className="mv-kinds">
          {tl.kinds.map((k) => {
            const now = scopedCount(k.kind);
            const on = kind === k.kind;
            return (
              <button
                key={k.kind} type="button"
                className={'mv-kind' + (on ? ' on' : '') + (now ? '' : ' empty')}
                onClick={() => pickKind(k.kind)}
                aria-pressed={on}
                aria-label={`${k.label}: ${now} in this filter, ${k.count} in total. `
                  + `${on ? 'Filtering by this kind. Click to clear.' : k.action + '.'}`}
              >
                <span className="mk-top">
                  <span className={'mk-ico k-' + k.kind} aria-hidden="true">
                    <svg className="mvi-inline"><use href={'#' + KIND_ICON[k.kind]} /></svg>
                  </span>
                  <span className="mk-nwrap">
                    <span className="mk-n">{n0(now)}</span>
                    {now !== k.count
                      ? <span className="mk-of">of {n0(k.count)}</span>
                      : null}
                  </span>
                </span>
                <span className="mk-label">{k.label}</span>
                {k.spark.some((v) => v > 0)
                  ? (
                    <span className="mk-spark" aria-hidden="true">
                      <Spark points={k.spark} color={SPARK_COLOUR[k.kind]} />
                    </span>
                  )
                  : null}
                <span className="mk-sub">
                  {k.count
                    ? (
                      <>
                        {k.mine
                          ? <>{k.mine === k.count ? 'all' : k.mine} on your leases</>
                          : <>none on your leases</>}
                        {k.ring ? <> · {k.ring} measured in miles</> : null}
                        {k.newest ? <> · newest {k.newest}</> : null}
                      </>
                    )
                    : 'nothing on record'}
                </span>
                <Band tier={tier} from="detailed">
                  <span className="mk-mean">{k.meaning}</span>
                </Band>
                <span className="mk-act">{on ? 'Filtering — click to clear' : k.action} →</span>
              </button>
            );
          })}
        </div>

        {/* ==================================================== the charts */}
        <Band tier={tier} from="detailed">
          <div className="act-band">Is the area getting busier?</div>
          <div className="mv-cols">
            <section className="card card-pad">
              <h3 style={{ margin: '0 0 3px' }}>Is the area getting busier?</h3>
              <p className="tiny muted" style={{ margin: '0 0 10px' }}>
                Permits and completions share an axis because both are counts.{' '}
                <strong>Click any month</strong> to filter the whole timeline to it.
              </p>
              {monthSpecs.length
                ? (
                  <Charts
                    specs={monthSpecs}
                    /* CLICKING A MONTH FILTERS TO IT. The chart looked like a
                       control and behaved like a picture. */
                    onPick={(i) => {
                      const c = monthCycles[i];
                      if (!c) return;
                      setFrom(c); setTo(c); setRange('custom'); setShowAll(false);
                      setJump((j) => j + 1);
                    }}
                  />
                )
                : (
                  <p className="nodata">
                    Fewer than three months carry a dated filing in this filter — widen the range
                    or the distance and the chart returns.
                  </p>
                )}
              {/* `.mv-cards` was used here and is shared with Alerts and the
                  Dashboard — and has no CSS at all, so the two cells simply
                  stacked. Defining it would change those other two routes, so
                  this route gets its own class. */}
              <div className="act-windows">
                <Window label="Last 90 days" c={ac.compare_90} />
                <Window label="Last 180 days" c={ac.compare_180} />
              </div>

            </section>

            <div className="mv-stack">
              <section className="card card-pad">
                <h3 style={{ margin: '0 0 3px' }}>Your own filed months</h3>
                <p className="tiny muted" style={{ margin: '0 0 10px' }}>
                  Computed from the monthly production store on demand, your interest applied.
                </p>
                <ProductPair
                  months={prodMonths}
                  subject="your leases"
                  opts={{
                    gasName: 'Gas filed to you, by month',
                    oilName: 'Oil filed to you, by month',
                    sub: `your interest applied · ${p.series.months.length} months`,
                    keyPrefix: 'actprod',
                    footnote: 'A gap is a month the state has not filed, drawn as a gap rather '
                      + 'than as a fall to zero — an unfiled month is not a month without '
                      + 'production.',
                  }}
                />
              </section>

            </div>
          </div>
        </Band>

        {/* ========================================= WHAT IS WITHIN N MILES */}
        <Band tier={tier} from="simple">
          <div className="act-band">
            Within {ring.radius_mi} {ring.radius_mi === 1 ? 'mile' : 'miles'} of your wells
            <span className="ab-hint">the distance buttons above change this ring</span>
          </div>
          <section className="ring-panel">
            <p className="rp-head">{ring.headline}</p>

            <div className="rp-kpis">
              <RingKpi
                label="Neighboring leases" value={n0(ring.neighbour_leases) ?? '0'}
                sub={ring.in_production_record
                  ? `${ring.in_production_record} of them are in the production record`
                  : 'none of them are in the production record'}
              />
              <RingKpi
                label="Of those, producing" value={n0(ring.producing) ?? '0'}
                sub={ring.not_producing
                  ? `${ring.not_producing} not producing`
                  : 'every one is producing'}
                tone={ring.producing ? 'up' : undefined}
              />
              <RingKpi
                label="Standing permits" value={n0(ring.standing_permits) ?? '0'}
                sub={rg.stamp ? `radius survey rebuilt ${rg.stamp}` : 'from the radius survey'}
              />
              <RingKpi
                label="Nearest record" value={ring.measured.nearest_mi != null
                  ? `${ring.measured.nearest_mi.toFixed(2)} mi` : '—'}
                sub={ring.measured.nearest_name ?? 'no measured record in this ring'}
              />
              <RingKpi
                label={`Their gas, ${ring.last_label ?? 'last month'}`}
                value={ring.last_gas ? `${nShort(ring.last_gas)} ${MCF}` : 'none filed'}
                sub="whole-lease volume next door — never your share"
              />
              <RingKpi
                label={`Their oil, ${ring.last_label ?? 'last month'}`}
                value={ring.last_oil ? `${nShort(ring.last_oil)} ${BBL}` : 'none filed'}
                sub={ring.last_oil
                  ? 'whole-lease volume next door — never your share'
                  : 'these neighbors file gas only'}
              />
              <RingKpi
                label="Operators in the ring" value={n0(ring.measured.operators) ?? '0'}
                sub={`${ring.measured.completions} `
                  + `${plural(ring.measured.completions, 'completion')}, `
                  + `${ring.measured.permits} ${plural(ring.measured.permits, 'permit')} measured`}
              />
            </div>

            <Band tier={tier} from="detailed">
              {ringMonths.length >= 3
                ? (
                  <div className="rp-chart">
                    <ProductPair
                      months={ringMonths}
                      subject={`the leases within ${ring.radius_mi} `
                        + `${ring.radius_mi === 1 ? 'mile' : 'miles'}`}
                      opts={{
                        gasName: `Gas the neighbors within ${ring.radius_mi} `
                          + `${ring.radius_mi === 1 ? 'mile' : 'miles'} filed`,
                        oilName: `Oil the neighbors within ${ring.radius_mi} `
                          + `${ring.radius_mi === 1 ? 'mile' : 'miles'} filed`,
                        sub: `${ring.in_production_record} neighboring `
                          + `${plural(ring.in_production_record, 'lease')} · whole-lease volume, `
                          + 'never your share',
                        keyPrefix: 'ring' + ring.key,
                        footnote: rg.note,
                      }}
                    />
                  </div>
                )
                : null}
            </Band>

            {ring.neighbours.length
              ? (
                <div className="rp-tbl-wrap">
                  <table className="rp-tbl">
                    <thead>
                      <tr>
                        <th>Neighboring lease</th>
                        <th className="hide-s">Operator</th>
                        <th>Status</th>
                        <th className="num">Last filed month</th>
                        <th className="num">Gas that month</th>
                        <th className="num">Oil that month</th>
                        <th className="num hide-s">Months filed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ring.neighbours.slice(0, tier === 'pro' ? 20 : 8).map((nb) => (
                        <tr key={nb.lease_id}>
                          <td>
                            <strong>{nb.lease_name ?? nb.lease_id}</strong>
                            {/* the lease id is shown because four of this owner's
                                neighbors genuinely share one name */}
                            <span className="rp-id">{nb.lease_id}</span>
                          </td>
                          <td className="hide-s">{nb.operator_name ?? '—'}</td>
                          <td>
                            <span className={'rp-st' + (nb.producing ? ' on' : '')}>
                              {nb.status ?? 'not recorded'}
                            </span>
                          </td>
                          <td className="num">{nb.last_label ?? 'no month filed'}</td>
                          <td className="num">
                            {nb.last_gas ? `${nShort(nb.last_gas)} ${MCF}` : '—'}
                          </td>
                          <td className="num">
                            {nb.last_oil ? `${nShort(nb.last_oil)} ${BBL}` : '—'}
                          </td>
                          <td className="num hide-s">{n0(nb.months_reported)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ring.neighbours.length > (tier === 'pro' ? 20 : 8)
                    ? (
                      <p className="tiny muted" style={{ margin: '8px 0 0' }}>
                        {ring.neighbours.length - (tier === 'pro' ? 20 : 8)} more neighboring{' '}
                        {plural(ring.neighbours.length - (tier === 'pro' ? 20 : 8), 'lease')} in
                        this ring, ordered by the month they last filed.
                      </p>
                    )
                    : null}
                </div>
              )
              : (
                <p className="al-note">
                  {rg.rings[ring.key].neighbour_leases
                    ? 'The radius survey names neighboring leases in this ring, but none of them '
                      + 'is in the production record — so there is nothing to say about what they '
                      + 'produce. A lease with no production record is usually one that never '
                      + 'produced.'
                    : 'No neighboring lease sits in this ring. Widen the distance and the ones '
                      + 'further out appear.'}
                </p>
              )}

            <Band tier={tier} from="detailed">
              <p className="rp-note">{rg.distance_note}</p>
              <p className="rp-note">{rg.note}</p>
              {rg.capped
                ? (
                  <p className="rp-note">
                    The rings name more neighboring leases than are looked up in the production
                    record: the first {rg.looked_up} are read, in a fixed order, so the figures do
                    not change between builds.
                  </p>
                )
                : null}
            </Band>
          </section>
        </Band>

        {/* ================================================ filters + timeline */}
        <div className="act-band" ref={feed}>
          The timeline
          <span className="ab-hint">
            {kind === 'all'
              ? 'your leases and your neighbors together, newest first'
              : kind === 'mine'
                ? 'your leases only — press “everything” for the neighborhood'
                : `filtered to ${tl.kinds.find((k) => k.kind === kind)?.label.toLowerCase()}`}
          </span>
        </div>

        <div className="al-filter" role="group" aria-label="Filter the timeline">
          {/* HERS FIRST, and it is the one that is on when the page opens */}
          <button
            type="button" className={kind === 'mine' ? 'on' : ''} onClick={() => setKind('mine')}
            aria-pressed={kind === 'mine'}
            title="Only the rows the record proves are on a lease you hold"
          >
            On your leases · <span className="alf-n">{n0(scopedMine)}</span>
          </button>
          <button
            type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}
            aria-pressed={kind === 'all'}
            title="Your rows plus everything filed around you in the same counties"
          >
            Everything, including your neighbors ·{' '}
            <span className="alf-n">{n0(scoped.length)}</span>
          </button>
          {tl.kinds.filter((k) => scopedCount(k.kind)).map((k) => (
            <button
              key={k.kind} type="button" className={kind === k.kind ? 'on' : ''}
              onClick={() => setKind(k.kind)} aria-pressed={kind === k.kind}
            >
              {k.label} · <span className="alf-n">{n0(scopedCount(k.kind))}</span>
            </button>
          ))}
        </div>

        {/* ===================================================== the timeline */}
        {shown.length
          ? (
            <>
              <div className="mv-tl">
                {shown.map((e, i) => (
                  <React.Fragment key={e.id}>
                    {monthBreak(shown, i)
                      ? <p className="tl-sep"><span>{monthBreak(shown, i)}</span></p>
                      : null}
                    <Row e={e} tier={tier} mi={mi} open={open} />
                  </React.Fragment>
                ))}
              </div>
              {rows.length > shown.length
                ? (
                  <p style={{ margin: '14px 0 0', textAlign: 'center' }}>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowAll(true)}>
                      Show the other {n0(rows.length - shown.length)}
                    </button>
                  </p>
                )
                : null}
            </>
          )
          : (
            <div className="act-empty">
              <h4>Nothing matches these filters</h4>
              <p>
                {q.trim() ? <>No event matches “{q.trim()}”. </> : null}
                {kind === 'mine'
                  ? (
                    <>
                      Nothing on a lease you hold matches these filters. Your own rows are
                      production filings, operator changes and your rings — and a{' '}
                      <strong>date range narrower than a few months</strong> will usually contain
                      none of them, because production is filed monthly.{' '}
                    </>
                  )
                  : null}
                {mi !== 'all'
                  ? (
                    <>
                      Nothing carries a measured location inside {mi}{' '}
                      {mi === '1' ? 'mile' : 'miles'} in this date range. The measured records run
                      back further than the dated feed does — try <em>All dates</em>, or{' '}
                      <em>County-wide</em>, which also keeps the {n0(tl.county_count)} rows the
                      feed can only place by county.{' '}
                    </>
                  )
                  : null}
                {range !== 'all' && mi === 'all'
                  ? <>Nothing of this kind falls inside {RANGE_LABEL[range].toLowerCase()}. </>
                  : null}
                <button type="button" className="linklike" onClick={reset}>
                  clear the filters and show all {n0(tl.events.length)} →
                </button>
              </p>
            </div>
          )}

        {/* --------------------------------- what the record could not say */}
        {tl.notes.length
          ? (
            <section style={{ marginTop: 18 }}>
              <div className="act-band">What the record could not tell us</div>
              <div className="act-notes">
                {tl.notes.map((nt, i) => <p className="al-note" key={i}>{nt}</p>)}
              </div>
            </section>
          )
          : null}

        <Band tier={tier} from="detailed">
          <p className="tiny muted" style={{ marginTop: 14 }}>
            A permit in the dated feed carries no lease number and no coordinates, so it is matched
            to your area by county, is never labeled as being on a lease you hold, and can never
            answer a mile button — only the rows from the well map carry a location. The neighbor
            rows come from the standing radius survey, so they are dated by that survey rather
            than by an event, and a date range therefore never removes them.
          </p>
        </Band>
      </Band>
    </section>
  );
}

/**
 * THE FILINGS CHART'S OWN TWO COLOURS — one hue, two depths.
 *
 * WHY IT DOES NOT USE `SPARK_COLOUR`. It used to, and before that it used
 * `COLOURS.oil`/`COLOURS.gas` — the OIL and GAS COMMODITY colours, which is
 * what the reference shipped and which meant the permit bar was drawn in the
 * colour "oil" everywhere else in this app. Matching the kind palette instead
 * (gold #d9a441 against green) was correct by consistency and wrong by eye:
 * two saturated, similarly-dark hues fighting for the same axis.
 *
 * These two are a SEQUENTIAL pair, not a categorical one, which is the right
 * choice for what this chart actually compares — the same measure (a monthly
 * count of filings) at two stages of the same process. Depth carries the
 * reading: the pale bar is intent to drill, the deep one is a well finished.
 * That is the caption's own argument — "when the green bars grow against the
 * [other], wells are being finished rather than planned" — and it survives
 * greyscale and every common form of colour blindness, which gold-on-green
 * did not.
 *
 * THE COST, ACCEPTED: the permit bar no longer matches the gold permit card
 * and timeline chip. The kind palette below is unchanged and still governs
 * every other permit mark on the page; only this one chart departs from it.
 * The legend swatches in `.lc-head` follow automatically — they render from
 * `series[].colour`.
 */
const FILINGS_COLOUR = { permit: '#9fd8c0', completion: '#1f7f60' };

const SPARK_COLOUR: Record<EventKind, string> = {
  permit: '#d9a441',
  completion: '#2e8f6d',
  production: '#1f7f60',
  adjacent: '#3b5bdb',
  status: '#6034c9',
  operator: '#b3261e',
};

/** the month heading that separates one month of the timeline from the next */
function monthBreak(list: TimelineEvent[], i: number): string | null {
  const e = list[i];
  if (e.standing) {
    const prev = list[i - 1];
    return prev && prev.standing ? null : 'Standing facts — no date attached';
  }
  if (!e.cycle) return i === 0 ? 'Date not recorded' : null;
  const prev = list[i - 1];
  if (prev && !prev.standing && prev.cycle === e.cycle) return null;
  const m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];
  return `${m[Number(e.cycle.slice(4, 6)) - 1] ?? ''} ${e.cycle.slice(0, 4)}`.trim();
}

/* ------------------------------------------------------------------ a row */
function Row(
  { e, tier, mi, open }: {
    e: TimelineEvent; tier: ViewProps['tier']; mi: MileKey; open: (k: string) => void;
  },
) {
  /* a neighbour row states the ring the reader has selected, not always the
     first one — that is what makes a mile button change the row rather than
     only the list */
  const stats = e.ring_stats
    ? (e.ring_stats[(mi === 'all' ? '1' : mi) as RingKey] ?? e.stats)
    : e.stats;

  return (
    <article
      className={'tl-row k-' + e.kind + (e.is_mine ? ' mine' : '') + (e.standing ? ' standing' : '')}
      role="button" tabIndex={0}
      onClick={() => open(e.ctx)}
      onKeyDown={(k) => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); open(e.ctx); } }}
      aria-label={`${e.kind_label}. ${e.title}. Opens the detail.`}
    >
      <span className="tl-rail" aria-hidden="true">
        <span className="tl-dot">
          <svg className="mvi-inline"><use href={'#' + KIND_ICON[e.kind]} /></svg>
        </span>
      </span>

      <div className="tl-body">
        <div className="tl-head">
          <span className={'tl-kind k-' + e.kind}>{e.kind_label}</span>
          {e.is_mine ? <span className="tl-mine">on your lease</span> : null}
          {e.scope === 'ring' && e.distance_mi != null
            ? (
              <span className="tl-dist" title="measured from your nearest well surface location">
                {e.distance_mi.toFixed(2)} mi away
              </span>
            )
            : null}
          {e.scope === 'county'
            ? (
              <span
                className="tl-scope"
                title="the feed carries no coordinates for this row, so it is matched to your area
                       by county and cannot answer a mile button"
              >
                county-scope
              </span>
            )
            : null}
          {e.standing ? <span className="tl-standing">standing fact</span> : null}
          <span className="tl-when">{e.when_label ?? 'date not recorded'}</span>
        </div>

        <h4 className="tl-title">{e.title}</h4>

        {stats.length
          ? (
            <div className="tl-stats">
              {stats.slice(0, tier === 'pro' ? 4 : 3).map((s) => (
                <div className="tl-stat" key={s.label}>
                  <span className="tl-k">{s.label}</span>
                  <span className={'tl-v' + (s.tone ? ' t-' + s.tone : '')}>
                    {s.tone === 'up' ? '▲ ' : s.tone === 'down' ? '▼ ' : ''}
                    {s.tone === 'up' || s.tone === 'down' ? s.value.replace(/^[+-]/, '') : s.value}
                  </span>
                  {s.sub ? <span className="tl-s">{s.sub}</span> : null}
                </div>
              ))}
            </div>
          )
          : null}

        <Band tier={tier} from="detailed">
          <p className="tl-body-t">{e.body} <span className="ctx-hint">expand →</span></p>
        </Band>
      </div>
    </article>
  );
}

/* -------------------------------------------------------- small components */
function Pulse({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="ap-cell">
      <span className="ap-k">{label}</span>
      <span className="ap-v">{value}</span>
      <span className="ap-s">{sub}</span>
    </div>
  );
}

function RingKpi(
  { label, value, sub, tone }:
  { label: string; value: string; sub: string; tone?: 'up' | 'warn' },
) {
  return (
    <div className="rp-kpi">
      <span className="rk-k">{label}</span>
      <span className={'rk-v' + (tone ? ' t-' + tone : '')}>{value}</span>
      <span className="rk-s">{sub}</span>
    </div>
  );
}

function Window(
  { label, c }: { label: string; c: ViewProps['p']['activities']['compare_90'] },
) {
  return (
    <div className="setrow" style={{ display: 'block' }}>
      <div className="tiny muted" style={{ marginBottom: 2 }}>{label}</div>
      <div className="num" style={{ fontWeight: 800, fontSize: 17 }}>
        {n0(c.recent)}{' '}
        <span className="tiny muted" style={{ fontWeight: 400 }}>vs {n0(c.prior)} before</span>
      </div>
      <div className="tiny">
        {c.change_pct != null
          ? (
            <span className={c.change_pct >= 0 ? 'delta-up' : 'delta-down'}>
              {c.change_pct >= 0 ? '▲' : '▼'} {pctS(Math.abs(c.change_pct))}
            </span>
          )
          : <span className="muted">no earlier window to compare</span>}
      </div>
    </div>
  );
}
