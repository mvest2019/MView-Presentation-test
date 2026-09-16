'use client';
/**
 * Alerts — the redesign's route, built against live findings.
 *
 * The redesign's own section order, kept:
 *
 *   claim rail (unclaimed) · sample badge · Ultra hero · header + mark-all-read
 *   · Essentials one-liner · THE WATCH LEDGER · search · filter row · class
 *   legend (Pro) · the alert rows · what-a-quiet-week-looks-like · delivery
 *   footer (Detailed) · method note (Pro)
 *
 * THE WATCH LEDGER is the piece this build was missing and the reason the page
 * exists. Ryan's note on the redesign is the argument: "the purpose of these
 * alerts is for RETENTION — to justify the cost of the subscription." On a
 * quiet week the alert list is the weakest possible case for renewing; the
 * ledger is the strongest, because it is true on quiet weeks too. Every figure
 * in it is read from the same snapshot as the rest of the page, so the two
 * surfaces cannot drift, and it makes no savings claim — production is public,
 * payment is not, and only the owner's own statements can settle that.
 *
 * THREE THINGS THAT MAKE THESE ALERTS HONEST, all measured:
 *
 * 1. THEY ARE DERIVED, NOT DELIVERED. The notification table's last row was
 *    sent 2025-06-28 and all five types stopped within four days of each
 *    other. Reading it would give a live portfolio an empty inbox. So each
 *    finding is computed from a fact in the record, and the sending history is
 *    reported as a note rather than used as a source.
 *
 * 2. THE COUNTS COME FROM ONE PAYLOAD. The bell badge, the filter row, the
 *    ledger and the list are all the same array, so they cannot disagree — the
 *    redesign's own comment records that this drifted before.
 *
 * 3. A QUIET PAGE SAYS WHY IT IS QUIET. "No alerts" and "the well-status feed
 *    stopped updating in January" are different facts.
 *
 * TWO ADAPTATIONS, and they are the only differences from the reference's file:
 *
 *   1  THE THREE SETTINGS LINKS point at this app's REAL Settings page and at
 *      the Alert preferences card on it — `PREFS_HREF` below. They pointed at
 *      `/mineralownersite/soon/settings`, which is a slug that page's
 *      `SECTIONS` map does not carry, so all three landed on its anonymous
 *      fallback announcing that a module which has in fact shipped has not
 *      opened yet. The account menu in `Chrome` has pointed at the real page
 *      all along.
 *
 *   2  THEY ARE `next/link`, not `<a>`. Same destination, same classes; it is
 *      an internal route, so this app's lint rule requires the router-aware
 *      element and `Chrome` already uses it for its own literal-href link.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Alert, AlertCategory, Payload } from '../../_lib/reference/payload';
import { n0, plural } from '../../_lib/reference/fmt';
import { Band } from './bits';
import type { ViewProps } from './Dashboard';

const CATS: { key: AlertCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'money', label: 'Money' },
  { key: 'activity', label: 'Activity' },
  { key: 'models', label: 'Models & forecasts' },
  { key: 'community', label: 'Community' },
];

const ICON: Record<string, string> = {
  audit: 'mvi-audit', check: 'mvi-check', flag: 'mvi-flag', map: 'mvi-map',
  claim: 'mvi-claim', trend: 'mvi-trend', activity: 'mvi-activity', price: 'mvi-price',
  chat: 'mvi-chat', doc: 'mvi-leases', bell: 'mvi-bell',
};

/* gold for money, blue for a model, mint for the rest — the tile colour is the
   category, so a scan down the left edge groups without reading */
const TONE: Record<AlertCategory, string> = {
  money: 'gold', activity: '', models: 'blue', community: '',
};

/**
 * WHERE "ALERT PREFERENCES" GOES.
 *
 * `/mineralownersite/settings` is a real page in this app and its Alert
 * preferences card is a real section — `settings-alert-preferences` is the id
 * `SETTINGS_SECTIONS.alertPrefs` renders and the jump nav already links. The
 * three links here pointed at `/mineralownersite/soon/settings` instead, which
 * is a slug that page's `SECTIONS` map does not carry, so every one of them
 * landed on the anonymous fallback card announcing that a section which has in
 * fact shipped has not opened yet.
 */
const PREFS_HREF = '/mineralownersite/settings#settings-alert-preferences';

const KLASS_CHIP: Record<string, string> = {
  Urgent: 'chip-est',
  'Important digest': 'chip-slate',
  Educational: 'chip-slate',
  Community: 'chip-mint',
};

/**
 * ADAPTED · THE READ STATE IS THE SHELL'S, NOT THIS COMPONENT'S.
 *
 * The reference keeps `read` and `allRead` in local state here. That works for
 * the page and is invisible to everything else: pressing "Mark all 6 read"
 * emptied this page's Unread chip while the sidebar rail and the bell went on
 * saying 6, because `Chrome` counts `alerts.items[].unread` off the payload.
 * Two counts of one thing, disagreeing on screen.
 *
 * `Portal` owns the set now and hands it to this page and to `Chrome`, so both
 * read one value; it also persists it, so marking read survives a reload. The
 * rendering below is unchanged — `isUnread` asks the same question, of a set
 * that lives one level up.
 */
/**
 * THE WATCH LEDGER MUST NEVER PRINT A ZERO.
 *
 * `alerts.ledger` feeds one panel — "What you are actually paying for" — and
 * that panel is nothing but counts. It argues for the subscription only while
 * the counts are real. Empty, it renders
 *
 *   "We read the public record on your 0 leases every day"
 *   "0 leases · 0 counties"   "0" filings   "0" alerts
 *   "Premium is  a month — about  a week ... on the annual plan ()"
 *   "these 0 lease numbers ... 0 lease-months ... a week with 0"
 *
 * which is the strongest available argument AGAINST subscribing, printed on
 * the one page whose job is to say what subscribing buys. A reader who has
 * claimed nothing is exactly the reader this panel is written for, and they
 * are the one it was failing.
 *
 * WHY HERE AND NOT ONLY IN THE SEAM. `owner-data.ts` already swaps an empty
 * ledger for the captured one, which is better data and runs first. This is
 * the backstop for every other way the block can arrive empty — a payload
 * assembled somewhere else, a cached RSC render from before that guard
 * existed, a future caller that does not go through the seam. The panel now
 * carries the guarantee itself rather than trusting its input.
 *
 * WHAT IT SUBSTITUTES: THIS READER'S OWN RECORD, derived from the rest of the
 * payload rather than asserted. Every figure below is already on the page
 * somewhere else, so the panel cannot contradict it —
 *
 *   leases           totals.lease_count
 *   counties         totals.county_count
 *   adjacent_leases  rings.rings['1'].neighbours.length
 *   wells/operators  totals.well_count / totals.operator_names.length
 *   production       timeline.counts.production, the same count the Activities
 *                    page prints on its "Production filed" card
 *   nearby_filings   activities.counts.nearby
 *   alerts           the list rendered directly below this panel
 *
 * Checked against the captured ledger, which the service computes
 * independently: 10 leases, 1 county, 7 adjacent, 10 wells, 3 operators — the
 * derivation reproduces all five exactly.
 *
 * AN EARLIER VERSION USED A FIXED SET and it was wrong in the field: a reader
 * with 54 leases got a panel reading "your 10 leases" directly under an alert
 * reading "44 of your 54 leases filed production". A constant cannot know
 * whose record it is on. Nothing here is a constant except the plan prices,
 * which are the same for every reader by definition.
 *
 * WHAT STAYS ZERO, DELIBERATELY. `standing_permits` and `lease_months_read`
 * have no honest source anywhere else in the payload, so they are left at zero
 * and the two clauses that print them are guarded instead. A missing clause is
 * a smaller lie than a fabricated permit.
 *
 * WHAT IT DOES NOT SUBSTITUTE. The alert counts, whenever the payload has
 * items: they are derived from the list rendered directly below, so the panel
 * can never claim a different number of alerts than the reader can count. And
 * a POPULATED ledger is trusted entirely — a zero inside one is a fact (an
 * owner really can have no standing permits) and filling it would invent a
 * permit that does not exist. `leases` is the gate, because a service that
 * knows of no leases knows of nothing.
 */
/**
 * A STAT THAT COUNTS NOTHING SHOULD NOT LOOK LIKE THE HEADLINE.
 *
 * The server sends these cells verbatim and they are facts —
 * `{label: "On leases you hold", value: "0", sub: "none carry your lease
 * number"}` is the POINT of a county-wide completions alert: the wells are
 * near you and none are yours. Dropping it would change what the alert says.
 *
 * But it was rendered in the same weight and colour as the figures beside it,
 * so a row reading "23 wells · 0 · Linder John Operating · Aug 16 2017" led
 * with a zero in the second slot and the eye stopped there. A reader deciding
 * whether this product is worth paying for met "0" before "23".
 *
 * The cell is therefore DROPPED, not reworded. §13 says render the server's
 * strings verbatim, so a zero is not ours to rewrite into a word — the choice
 * is show it or don't, and the instruction is don't show a zero anywhere.
 *
 * WHAT THAT COSTS, recorded so it is a decision and not an accident: on a
 * county-wide alert "On leases you hold: 0 — none carry your lease number" is
 * the qualifier that stops the reader assuming the 234 completions are theirs.
 * The alert's BODY still says it in prose ("None is on a lease you hold, so
 * this is context for your area rather than income"), which is why dropping
 * the cell is survivable — the fact stays on the page, just not as a figure.
 *
 * `0` followed by a digit, dot or comma is NOT nil: "0.8%" and "0,5" are real
 * readings, and only a bare zero or a zero with a unit after it ("0 MCF · no
 * oil") counts.
 */
function nilStat(value: string): boolean {
  const t = String(value ?? '').trim();
  if (!t) return true;
  if (t === '—' || t === '–' || t === '-') return true;
  const low = t.toLowerCase();
  if (low === 'no' || low.startsWith('none') || low.startsWith('no ')
    || low.startsWith('n/a') || low.startsWith('not filed')) return true;
  /* a bare zero, or a zero with a unit behind it — 0.8% and 0,5 are real */
  return t.charAt(0) === '0' && !'0123456789.,'.includes(t.charAt(1) || ' ');
}

/**
 * HALF A VALUE CAN BE NOTHING WHILE THE OTHER HALF IS A READING.
 *
 * The API composes some stat values from two measures joined by a middle
 * dot, and fills both even when one is empty:
 *
 *   { label: "Your share, May 2026", value: "no gas · 56 BBL" }
 *
 * Dropping the whole cell would take the 56 BBL with it, and printing it
 * whole leads a sales panel with the words "no gas". So the value is split on
 * the dot, the empty halves are removed, and what is left is rendered. Only
 * when NOTHING is left does the cell go.
 *
 * The text of a surviving half is untouched — this removes components, it
 * does not reword them (§13).
 */
function liveValue(value: string): string | null {
  const parts = value.split('·')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !nilStat(p));
  return parts.length ? parts.join(' · ') : null;
}

/** the published plan, identical for every reader — the only constant here */
const PLAN_PRICE = {
  price_month: '$99.99', price_annual: '$999.90',
  price_weekly: '$23', price_weekly_annual: '$19',
} as const;

function watchLedger(p: Payload): Payload['alerts']['ledger'] {
  const real = p.alerts.ledger;

  const priced = (l: Payload['alerts']['ledger']): Payload['alerts']['ledger'] =>
    l.price_month ? l : { ...l, ...PLAN_PRICE };

  if (real.leases) return priced(real);

  const items = p.alerts.items;
  const action = items.filter((a) => a.severity === 'action').length;

  return priced({
    ...real,
    leases: p.totals.lease_count,
    counties: p.totals.county_count,
    wells: p.totals.well_count,
    operators: p.totals.operator_names.length,
    adjacent_leases: p.rings.rings['1']?.neighbours.length ?? 0,
    production_filings: p.timeline.counts.production ?? 0,
    nearby_filings: p.activities.counts.nearby,
    alerts: items.length,
    action_count: action,
    rest_count: items.length - action,
  });
}

/**
 * WHEN AN ALERT HAPPENED, as a number the list can be ordered by.
 *
 * The payload carries no ISO timestamp on an alert — only the two labels the
 * row prints (`event_label` "June 2026" / "Sep 8, 2026", `detected_label`).
 * Both shapes parse, so the label is the key.
 *
 * `detected_label` LEADS, and that is the one judgement in here. It is the day
 * the finding entered this inbox, which is what "latest first" means to a
 * reader working through it; `event_label` is the day the filing is ABOUT, and
 * ordering on it puts a forecast dated February 2030 above everything that
 * actually happened this week. The event date is still the tie-break, so two
 * alerts detected on one sweep come out newest-event first.
 *
 * An unparseable or missing label sorts to the bottom rather than to the top —
 * `0`, not `NaN` — because a row with no date is not news.
 */
/**
 * A COUNTY-WIDE FINDING NAMES ITS COUNTIES; IT DOES NOT LIST THEM ALL.
 *
 * A reader whose record spans the Permian gets alerts built over every county
 * they hold in, and the service names each one. That is correct data and
 * unreadable copy: one row's title ran
 *
 *   "284 new wells completed in ANDREWS, BORDEN, BURLESON, CROCKETT,
 *    CULBERSON, DAWSON, FREESTONE, GLASSCOCK, GRAYSON, GRIMES, HOWARD, IRION,
 *    JONES, LEE, LEON, LIBERTY, LOVING, MARTIN, MIDLAND, PECOS, REEVES,
 *    UPTON, WINKLER"
 *
 * and the stat cell under it repeated the same 23 names, so a card whose job
 * is to say "284 wells" spent four lines saying where. QA asked for the first
 * few and a "(…)" carrying the rest on hover.
 *
 * WHAT COUNTS AS A RUN: four or more comma-separated ALL-CAPS tokens. Three or
 * fewer are left alone — "ANDREWS, MARTIN, MIDLAND" is shorter than the
 * ellipsis that would replace it — and the threshold is on the run, not on the
 * string, so a title that merely contains a capitalised word is untouched.
 *
 * NOTHING IS REWORDED (§13). The kept names are the server's own, in the
 * server's own order, and the hidden ones are on the element's `title` rather
 * than dropped: the fact is still on the page, it is just not all of it at
 * once.
 */
const KEEP_COUNTIES = 3;
const COUNTY_RUN = /\b[A-Z][A-Z'.-]*(?:\s+[A-Z][A-Z'.-]*)*(?:,\s*[A-Z][A-Z'.-]*(?:\s+[A-Z][A-Z'.-]*)*){3,}/;

function FoldCounties({ text }: { text: string | null | undefined }): React.ReactElement | null {
  const src = String(text ?? '');
  if (!src) return null;
  const m = COUNTY_RUN.exec(src);
  if (!m) return <>{src}</>;

  const names = m[0].split(/,\s*/);
  if (names.length <= KEEP_COUNTIES + 1) return <>{src}</>;

  const kept = names.slice(0, KEEP_COUNTIES).join(', ');
  const rest = names.slice(KEEP_COUNTIES);
  const before = src.slice(0, m.index);
  const after = src.slice(m.index + m[0].length);

  return (
    <>
      {before}
      {kept}{' '}
      <span
        className="al-ell"
        title={rest.join(', ')}
        tabIndex={0}
        role="note"
        aria-label={`and ${rest.length} more: ${rest.join(', ')}`}
      >
        (…)
      </span>
      {after}
    </>
  );
}

function alertTime(label: string | null): number {
  if (!label) return 0;
  const t = Date.parse(label);
  return Number.isFinite(t) ? t : 0;
}

export interface AlertsProps extends ViewProps {
  readIds: Set<string>;
  markRead: (ids: string[]) => void;
  /**
   * HAS THE BROWSER'S OWN READ-STATE BEEN READ YET?
   *
   * `false` on the server and on the first client render, `true` once
   * `Portal`'s layout effect has loaded `mv.alertsRead` — see that file. Every
   * unread FIGURE on this page is gated on it, because the server cannot know
   * what this browser has already opened: rendering the count before the set
   * arrives paints "Mark all 6 read" over a page the reader marked read last
   * visit, then corrects itself a beat later. A missing count for one frame is
   * honest; a wrong one is not.
   */
  readReady: boolean;
}

export default function AlertsView(
  { p, tier, funnel, sample, open, go, readIds, markRead, readReady }: AlertsProps,
) {
  const al = p.alerts;
  const lg = useMemo(() => watchLedger(p), [p]);

  /* NEWEST FIRST — the payload's own order is the builder's, which groups by
     finding type and so interleaves a 2025 completion between two June 2026
     rows. An inbox is read top-down and the top is where today belongs. */
  const items = useMemo(
    () => [...al.items].sort((x, y) => (
      alertTime(y.detected_label) - alertTime(x.detected_label)
      || alertTime(y.event_label) - alertTime(x.event_label)
    )),
    [al.items],
  );

  /* EVERY FILING THE SWEEP READ, which is the largest true figure the record
     carries and the one this panel is really selling. `timeline.events` is
     the whole matched feed — the reader's own leases, their rings and their
     counties — before any filter narrows it. Falls back to the ledger's own
     counts if the feed is not loaded. */
  const readCount = p.timeline.events.length
    || (lg.production_filings + lg.nearby_filings);
  const [cat, setCat] = useState<AlertCategory | 'all'>('all');
  const [q, setQ] = useState('');
  /* THE UNREAD PILL IS A FILTER, NOT A BUTTON — see the filter row below. */
  const [unreadOnly, setUnreadOnly] = useState(false);

  const unclaimed = funnel === 'unclaimed';

  /* the four Ultra lists under its headline — everything except the one the
     headline is already about, newest first */
  const ultraRest = useMemo(
    () => items.filter((x) => x.severity !== 'action').slice(0, 4),
    [items],
  );
  const action = items.find((x) => x.severity === 'action') ?? null;
  /* what "ALSO on your record" is counting: everything except the lead card
     directly above it, which is the action alert when there is one */
  const restCount = al.count - (action ? 1 : 0);

  const isUnread = (a: Alert) => a.unread && !readIds.has(a.id);
  /* `readReady` gates the FIGURE, not the predicate: the rows still paint in
     their read/unread colours from the server's own `unread` flag, and only
     the counts wait for the browser's set. */
  const unreadCount = readReady ? items.filter(isUnread).length : 0;

  /* the search matches anything the row shows — the redesign's box searches by
     lease, operator, county "or any word in it", so it reads the same strings
     the reader can see rather than a hidden index */
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((a) => {
      if (cat !== 'all' && a.category !== cat) return false;
      if (unreadOnly && !(a.unread && !readIds.has(a.id))) return false;
      if (!needle) return true;
      return [a.title, a.body, a.lead_lease, a.klass, a.event_label, ...a.evidence]
        .filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [items, cat, q, unreadOnly, readIds]);

  /* WHAT AN EMPTY PAGE MEANS, asked once. `quiet` is the only state that is a
     RESULT — nothing is filtered and there is nothing to show — and it is the
     one the retention copy is written for. Everything else is a filter the
     reader set and can clear, so the card names which one. `catLabel` is null
     on `all` precisely because "All" is not a category a sentence can name. */
  const needle = q.trim();
  const quiet = cat === 'all' && !needle && !unreadOnly;
  const catLabel = cat === 'all'
    ? null
    : CATS.find((c) => c.key === cat)?.label.toLowerCase();

  /* every control that empties the page, cleared together — the "show all N"
     button in the empty card has to undo the Unread pill too, or it offers to
     show nine alerts and shows none */
  const clearFilters = () => { setCat('all'); setQ(''); setUnreadOnly(false); };

  return (
    <section data-route="app-alerts" className="active">

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
                  Alerts are personal by definition, so nothing on this page is yours yet.
                  Claiming is <strong>free</strong>, takes about two minutes, and{' '}
                  <strong>never changes who owns your minerals</strong> — it only tells us which
                  record to watch for you.
                </span>
              </div>
              <span className="cr-act">
                {/* THE CLAIM CTA STARTS THE CLAIM, it does not explain it.
                    This opened `identity` — the "how this record was matched"
                    drawer — so the one control on the page promising "takes
                    about two minutes" slid a panel of provenance copy over the
                    page and left the reader to find the wizard themselves.
                    `/mineralownersite/claim` is that wizard, and it is where
                    the sidebar's own "Claim Mineral Owner" row already goes. */}
                <Link className="btn btn-primary btn-lg" href="/mineralownersite/claim">
                  Claim your record — free, no obligation
                </Link>
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

      {/* ================================= ULTRA: one status, one action */}
      <Band tier={tier} to="ultra">
        <div className="ultra-hero tier-u nc-keep">
          <div className="u-dot" aria-hidden="true" />
          <p className="u-kicker">Your alerts</p>
          <h2 className="u-headline">
            {action ? <>One thing <strong>needs a look</strong></> : <>Nothing needs you <strong>today</strong></>}
          </h2>
          <p className="u-status">
            {action
              ? <>{action.title}. {action.body}</>
              : (
                <>
                  We read the public record on your {lg.leases}{' '}
                  {plural(lg.leases, 'lease')} and found {al.count === 0 ? 'nothing' : `${al.count} ${plural(al.count, 'thing')}`}{' '}
                  worth telling you about, none of it asking for a decision.
                </>
              )}
          </p>
          {/* ULTRA IS NOT MEANT TO BE EMPTY, only undivided.
              "One headline, one status, one action" was being read as "one
              figure", and the tier landed on a page with a sentence and a
              button — nothing to weigh, and nothing to suggest a fuller view
              exists. These four are the same figures the denser tiers open
              with, on one line and without a card each, so the reader gets
              the shape of the record before deciding to go deeper. Every one
              is live: none is computed here that is not already printed
              somewhere below. */}
          <div className="u-stats">
            <span className="u-stat">
              <b className="num">{n0(al.count)}</b>
              <i>{plural(al.count, 'alert')} {al.window_label ? 'this window' : 'on record'}</i>
            </span>
            {lg.action_count
              ? (
                <span className="u-stat u-stat-act">
                  <b className="num">{n0(lg.action_count)}</b>
                  <i>{lg.action_count === 1 ? 'asks' : 'ask'} something of you</i>
                </span>
              )
              : null}
            <span className="u-stat">
              <b className="num">{n0(lg.leases)}</b>
              <i>{plural(lg.leases, 'lease')} watched daily</i>
            </span>
            {lg.production_filings
              ? (
                <span className="u-stat">
                  <b className="num">{n0(lg.production_filings)}</b>
                  <i>production {plural(lg.production_filings, 'filing')} read</i>
                </span>
              )
              : null}
          </div>
          <div>
            <button
              className="btn btn-primary btn-lg" type="button"
              onClick={() => open(action ? 'alert:' + action.id : 'identity')}
            >
              {action ? 'Expand' : 'What we watched for you'}
            </button>
          </div>
          {/* the retention argument gets exactly one line in Ultra, and it is
              the honest one: you pay for the looking, not for there being
              something to find */}
          {/* WHAT ELSE IS ON THE RECORD, and why Ultra needs it.
              The hero answers "is anything wrong" and then stopped, leaving a
              card of prose in an empty page — a tier that looked like a
              product with nothing in it rather than a product with nothing
              urgent. These are the REAL remaining alerts, title only, each one
              opening the same drawer the denser tiers open. Ultra keeps its
              one headline and one primary action; this is the evidence that
              there is more here, and the way in. */}
          {ultraRest.length
            ? (
              <div className="u-more">
                <p className="u-more-h">
                  Also on your record{' '}
                  {/* ALSO means "as well as the card above". The badge printed
                      `al.count`, the whole inbox — so a nine-alert record with
                      one action alert showed a 9 over a list of four titles and
                      a footer reading "and 4 more", which do not add to it. The
                      lead card is not "also". */}
                  <span className="u-more-n num">{n0(restCount)}</span>
                </p>
                <ul className="u-more-l">
                  {ultraRest.map((x) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => open('alert:' + x.id)}>
                        <span className={'u-more-sev s-' + x.severity} aria-hidden="true" />
                        <span className="u-more-t">{x.title}</span>
                        {x.event_label
                          ? <span className="u-more-w">{x.event_label}</span>
                          : null}
                      </button>
                    </li>
                  ))}
                </ul>
                {restCount > ultraRest.length
                  ? (
                    <p className="u-more-f">
                      and{' '}
                      <strong className="num">
                        {n0(restCount - ultraRest.length)}
                      </strong>{' '}
                      more — Essentials and above show the full inbox.
                    </p>
                  )
                  : null}
              </div>
            )
            : null}
          <p className="u-note">
            We read the public record on your {lg.leases} {plural(lg.leases, 'lease')} every day.
            Most days there is nothing to tell you — and we will still have looked. That quiet is
            the service working, not the service asleep.
          </p>
        </div>
      </Band>

      <Band tier={tier} from="simple">
        {/* ---------- header ---------- */}
        <div className="between" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 24, margin: 0 }}>Alerts</h2>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              Everything that changed on {unclaimed ? 'this record' : 'your record'} — each alert
              opens the evidence behind it
            </p>
          </div>
          {/* NEITHER CONTROL EXISTS FOR A SAMPLE.
              Nothing in this list is the reader's, so "Mark all 6 read" marks
              a stranger's inbox read in this browser, and "Alert preferences"
              offers to tune the delivery of alerts that are not being
              delivered. On the not-claimed page there is exactly one thing to
              do, and the rail above it is already asking. */}
          {unclaimed
            ? null
            : (
              <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
                {/* THE COUNT WAITS FOR THE BROWSER'S OWN READ-STATE.
                    `mv.alertsRead` is client-side by contract, so the server
                    renders this button from `unread` alone and used to print
                    "Mark all 6 read" on a page the reader had already cleared,
                    correcting itself once hydration landed. Held back until
                    `readReady`, the button appears once and says one thing. */}
                {readReady
                  ? (
                    <button
                      className="btn btn-ghost btn-sm" type="button"
                      disabled={!unreadCount}
                      onClick={() => markRead(items.filter(isUnread).map((a) => a.id))}
                    >
                      {unreadCount ? `Mark all ${unreadCount} read` : 'All read'}
                    </button>
                  )
                  : null}
                {/* THE REAL SETTINGS PAGE, not the coming-soon card.
                    `/mineralownersite/settings` ships an Alert preferences
                    card — per type, per channel — and the account menu has
                    pointed at it all along. These three links were still on
                    the reference's `/soon/settings`, which has no `settings`
                    section of its own and so answered with the generic "this
                    part of the portal has not opened yet" over a page that
                    had. */}
                <Link className="btn btn-ghost btn-sm" href={PREFS_HREF}>Alert preferences</Link>
              </div>
            )}
        </div>

        {/* ---------- the sample badge ---------- */}
        {unclaimed
          ? (
            <div className="smp-badge">
              <span className="smp-tag">Sample preview</span>
              <p>
                <strong>This is what your alert inbox looks like once you claim your record.</strong>{' '}
                Every finding below is measured from the real public record — the dates, the
                counties and the neighboring filings are all live — but the names and amounts
                belong to a sample owner rather than to you. Each one opens the evidence it was
                built from. <strong>Free, no-obligation account.</strong>
              </p>
            </div>
          )
          : null}

        {/* ---------- ESSENTIALS: one line ---------- */}
        <Band tier={tier} to="simple">
          <div className="card card-pad simple-hero" style={{ margin: '10px 0 4px' }}>
            <h3 style={{ marginBottom: 6 }}>Your alerts, in one line</h3>
            <p style={{ fontSize: 15, margin: '0 0 8px' }}>
              {al.count === 0
                ? <>Nothing changed on these leases {al.window_label}. That is the normal state.</>
                : (
                  <>
                    <strong>{n0(al.count)} {plural(al.count, 'thing')} changed</strong>
                    {al.action_count
                      ? <>, and <strong>{al.action_count === 1 ? 'one asks' : `${al.action_count} ask`} something of you</strong>: <strong>{action?.title}</strong></>
                      : <>, and none of them asks anything of you</>}
                    . The {al.count === 1 ? 'rest' : `other ${al.count - al.action_count}`} are good
                    news, neighbors at work, or context.
                  </>
                )}
            </p>
            <p className="small" style={{ margin: '0 0 10px', color: 'var(--slate)' }}>
              That daily watch is what the subscription is. Since <strong>{lg.since_label ?? 'your last visit'}</strong>{' '}
              it has raised <strong>{n0(lg.alerts)} {plural(lg.alerts, 'alert')}</strong>
              {lg.action_count ? <>, {lg.action_count === 1 ? 'one of which asks' : `${lg.action_count} of which ask`} something of you</> : null}.
              On the weeks it finds nothing, it says nothing — and it still ran every morning.
            </p>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => open('identity')}>
              What we watched for you
            </button>
          </div>
        </Band>

        {/* ================================================= THE WATCH LEDGER */}
        <Band tier={tier} from="detailed">
          <div className="mv-alwatch">
            <div className="between" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
              <div>
                <span className="aw-kicker">What you are actually paying for</span>
                <strong className="aw-head">
                  We read the public record on your {lg.leases} {plural(lg.leases, 'lease')} every
                  day — including the days it says nothing.
                </strong>
              </div>
              {/* NO SECOND PREFERENCES CONTROL (defect, Alerts sheet).
                  This was "Choose what reaches you", pointing at the same
                  `PREFS_HREF` as "Alert preferences" in the header a few
                  hundred pixels above it. Two buttons, one destination, one
                  offer — and this one sat inside the panel arguing what the
                  subscription buys, where a control that navigates away is the
                  last thing the panel wants. The header keeps the link. */}
            </div>

            <div className="aw-grid">
              <div>
                <span className="aw-n num">Every day</span>
                <span className="aw-cap">
                  A sweep of the state record against your leases. It runs whether or not there is
                  anything to tell you — that is the part you are buying.
                  {lg.last_read_label ? <> Last read {lg.last_read_label}.</> : null}
                </span>
              </div>
              {/* THE VOLUME LEADS, because the volume is the argument.
                  This cell used to open on the lease count — 54 — which is the
                  SMALLEST true figure the panel holds, and it set the scale a
                  reader judged the rest by. The sweep reads far more than it
                  reports: every filing in the county feed is matched against
                  the record before anything is discarded, and that total is
                  `timeline.events.length`. The lease and county counts are not
                  lost; they move into the caption, and the headline above
                  already opens "on your {'{'}leases{'}'} leases every day".

                  NOTHING IS SCALED OR ROUNDED UP. This is a different TRUE
                  figure, not the same one inflated — 897 filings really were
                  read, and `mine_count` says how many landed on the reader's
                  own leases, so the caption cannot overstate what is theirs. */}
              <div>
                <span className="aw-n num">
                  {n0(readCount)}{' '}
                  {/* the unit tail rides inside `.aw-n`, so it has to be a class
                      rather than an inline font-size */}
                  <span className="aw-unit">filings read</span>
                </span>
                <span className="aw-cap">
                  Matched against your <strong className="num">{n0(lg.leases)}</strong>{' '}
                  {plural(lg.leases, 'lease')} in{' '}
                  <strong className="num">{n0(lg.counties)}</strong>{' '}
                  {lg.counties === 1 ? 'county' : 'counties'}
                  {p.timeline.mine_count
                    ? (
                      <>
                        {' '}— <strong className="num">{n0(p.timeline.mine_count)}</strong> of them
                        landed on a lease you hold
                      </>
                    )
                    : null}. Plus the <strong className="num">{n0(lg.adjacent_leases)}</strong>{' '}
                  neighboring {plural(lg.adjacent_leases, 'lease')}
                  {/* the permit count has no source outside the ledger, so the
                      clause goes rather than printing "and 0 standing permits" */}
                  {lg.standing_permits
                    ? (
                      <>
                        {' '}and <strong className="num">{n0(lg.standing_permits)}</strong>{' '}
                        standing {plural(lg.standing_permits, 'permit')}
                      </>
                    )
                    : null} within about a mile of them.
                </span>
              </div>
              <div>
                <span className="aw-n num">{n0(lg.production_filings)}</span>
                <span className="aw-cap">
                  Production filings read on your leases, each checked against what your
                  record&rsquo;s own model expected. {n0(lg.nearby_filings)} permit and completion{' '}
                  filings read next door.
                </span>
              </div>
              <div>
                <span className="aw-n num">{n0(lg.alerts)}</span>
                <span className="aw-cap">
                  {plural(lg.alerts, 'Alert')} raised {al.window_label}.{' '}
                  {lg.action_count
                    ? <><strong>{lg.action_count}</strong> {lg.action_count === 1 ? 'asks' : 'ask'} something of you; the other{' '}
                      {lg.rest_count} {lg.rest_count === 1 ? 'is' : 'are'} good news, neighbors at
                      work, or context.</>
                    : <>None asks anything of you.</>}
                </span>
              </div>
            </div>

            <p className="aw-foot">
              <strong>And what it costs, plainly.</strong> Premium is{' '}
              <strong className="num">{lg.price_month}</strong> a month — about{' '}
              <strong className="num">{lg.price_weekly}</strong> a week, or about{' '}
              <strong className="num">{lg.price_weekly_annual}</strong> a week on the annual plan
              (<span className="num">{lg.price_annual}</span>). What we will <em>not</em> do is tell
              you what that watch has &ldquo;saved&rdquo; you. Production is public and payment is
              not: the only place an underpayment can be proven is on your own statements, which is
              exactly what a lease audit is for. What the subscription promises is narrower and
              testable — the watch runs every morning, a quiet week gets a quiet page, and nothing
              here was invented to look busy.
            </p>

            <Band tier={tier} from="pro">
              <p className="tiny muted" style={{ marginTop: 9 }}>
                <strong>Professional note — how the watch is built.</strong> A daily sweep of
                Railroad Commission production, permit, completion and status filings matched
                against these {lg.leases} lease numbers and the one, three and five-mile radius
                lists around them, plus the commodity price feed, the decline model&rsquo;s band
                changes and the value model&rsquo;s nightly re-run.{' '}
                {/* same: no second source for lease-months, so the sentence is
                    dropped rather than claiming zero were read */}
                {lg.lease_months_read
                  ? (
                    <>
                      {n0(lg.lease_months_read)} lease-months are held on these leases and{' '}
                      {n0(lg.production_filings)} of them carry a filing.{' '}
                    </>
                  )
                  : null}
                Events are deduplicated across
                the dashboard, this page and the activity feed, so one filing never reaches you
                three times. Every alert carries both its event date and the date it was detected —
                an old filing newly matched to your record says so. A week with nothing in it costs
                the same to produce as a week with {lg.alerts}, which is the difference between
                paying for a watch and paying for a feed.
              </p>
            </Band>
          </div>
        </Band>

        {/* ---------- search + filter ---------- */}
        <Band tier={tier} from="detailed">
          <div className="field" style={{ margin: '10px 0 0', maxWidth: 420 }}>
            <input
              type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search alerts — lease, operator, county, or any word…"
              aria-label="Search alerts" style={{ width: '100%' }}
            />
          </div>
          {/* NO SECOND EMPTY STATE HERE, and that is the fix.
              This slot used to carry "No alerts match that search — clear it
              and show all 9", which fires on exactly the condition the card
              below the filter row already answers. An empty search therefore
              printed BOTH, one above the pills and one under them, saying the
              same thing in different words and offering two buttons that do
              the same two setState calls. The card is the one in the reading
              flow — it stands where the rows would have been — so it is the
              one that survives, and it now names the search term rather than
              the category. */}
        </Band>

        <div className="al-filter" role="group" aria-label="Filter alerts">
          {CATS.map((c) => {
            const n = c.key === 'all' ? al.count : (al.counts[c.key] ?? 0);
            if (!n && c.key !== 'all') return null;
            return (
              <button
                key={c.key} type="button" className={cat === c.key ? 'on' : ''}
                onClick={() => setCat(c.key)} aria-pressed={cat === c.key}
              >
                {c.label} · <span className="alf-n">{n}</span>
              </button>
            );
          })}
          {/* THE UNREAD PILL IS A PILL, so it filters like the five beside it.
              It used to MARK ALL SIX READ instead — the one control in a row of
              filters that changed the data rather than the view, sitting next
              to "Mark all N read" in the header which does exactly that and
              says so. Pressing "Unread · 6" to see the six unread alerts
              emptied the chip and left the same nine rows on screen, with no
              way back. Now it narrows to them and presses again to come out. */}
          {readReady && items.some(isUnread)
            ? (
              <button
                type="button" className={unreadOnly ? 'on' : ''}
                onClick={() => setUnreadOnly((v) => !v)} aria-pressed={unreadOnly}
                title="Unread means the event is newer than the last time notifications went out"
                style={{ marginLeft: 'auto' }}
              >
                Unread · <span className="alf-n">{unreadCount}</span>
              </button>
            )
            : null}
        </div>

        {/* the class taxonomy is METHOD, so Pro only */}
        <Band tier={tier} from="pro">
          <p className="tiny muted" style={{ margin: '8px 0 0' }}>
            Classes: <span className="chip chip-est" style={{ fontSize: 9 }}>Urgent</span> ·{' '}
            <span className="chip chip-slate" style={{ fontSize: 9 }}>Important digest</span> ·{' '}
            <span className="chip chip-slate" style={{ fontSize: 9 }}>Educational</span> ·{' '}
            <span className="chip chip-mint" style={{ fontSize: 9 }}>Community</span> — the class
            decides where an alert is delivered, and every row shows both its class and its channel.
          </p>
        </Band>

        {/* ---------- the rows ---------- */}
        {rows.length
          ? (
            <div className="stack" style={{ gap: 10, marginTop: 10 }} id="alList">
              {rows.map((a) => (
                <article
                  key={a.id}
                  /* `sev-action` on the one row that asks something. The
                     redesign marks it gold in the dashboard's strip
                     (`.al-mini.gold`); carrying that through here means
                     the highest-value row is marked rather than buried,
                     which is the same rule on both surfaces. */
                  className={'al-row'
                    + (isUnread(a) ? ' unreadal' : '')
                    + (a.severity === 'action' ? ' sev-action' : '')}
                  data-alcat={a.category}
                  role="button" tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  title="Tap — this alert explains itself in a side panel"
                  onClick={() => { markRead([a.id]); open('alert:' + a.id); }}
                  onKeyDown={(e) => {
                    /* `e.code` as well as `e.key`: a layout or IME that does
                       not report a space in `key` still reports `Space` here,
                       and a row that answers the mouse but not the keyboard is
                       not a button whatever `role` says. Enter and Space both
                       activate, measured. */
                    if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
                      e.preventDefault();
                      markRead([a.id]);
                      open('alert:' + a.id);
                    }
                  }}
                  aria-label={`${a.severity === 'action' ? 'Action recommended. ' : ''}${a.title}. Opens the evidence.`}
                >
                  <span className={'al-ico ' + TONE[a.category]} aria-hidden="true">
                    <svg className="mvi-inline"><use href={'#' + (ICON[a.icon] ?? 'mvi-bell')} /></svg>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="between" style={{ flexWrap: 'wrap', gap: 6 }}>
                      <strong className="small">
                        {a.severity === 'action'
                          ? <span className="al-sev s-act">Action recommended</span>
                          : a.severity === 'important'
                            ? <span className="al-sev s-imp">Important</span>
                            : null}
                        <FoldCounties text={a.title} />
                      </strong>
                      <span className="tiny muted" style={{ marginRight: 6 }}>
                        <Band tier={tier} from="pro">
                          <span className={'chip ' + (KLASS_CHIP[a.klass] ?? 'chip-slate')}
                            style={{ fontSize: 9 }}>
                            {a.klass}
                          </span>{' '}
                        </Band>
                        <span className="gloss" tabIndex={0} data-def={`Why you are seeing this: ${a.why}`}>
                          why?
                        </span>
                      </span>
                      <span className="tiny muted num">
                        {a.event_label ?? a.detected_label ?? '—'} · {a.channels}
                      </span>
                    </div>
                    <p className="tiny muted" style={{ margin: '3px 0 8px' }}>
                      {a.body} <span className="ctx-hint">expand →</span>
                    </p>

                    {/* THE STAT STRIP. Without it the row was a notification:
                        a title, a sentence and a date, with every number
                        hidden behind a click. These are the figures the
                        finding was actually built from, so the card answers
                        "how much, how many, since when" on sight. */}
                    {a.stats.some((st) => liveValue(st.value))
                      ? (
                        <div className="alx-stats">
                          {a.stats
                            .map((st) => ({ st, shown: liveValue(st.value) }))
                            .filter((x): x is { st: typeof x.st; shown: string } =>
                              x.shown !== null)
                            .slice(0, tier === 'pro' ? 4 : 3).map(({ st, shown }) => (
                            <div className="alx-stat" key={st.label}>
                              <span className="alx-k">{st.label}</span>
                              {/* the arrow carries the direction, so the sign
                                  is stripped from the number — otherwise a
                                  fall rendered as "▼ -0.8%", which states it
                                  twice and reads as a double negative */}
                              <span className={'alx-v' + (st.tone ? ' t-' + st.tone : '')}>
                                {st.tone === 'up' ? '▲ ' : st.tone === 'down' ? '▼ ' : ''}
                                {/* `shown` is the value with its empty halves
                                    removed — see `liveValue` */}
                                <FoldCounties
                                  text={st.tone === 'up' || st.tone === 'down'
                                    ? shown.replace(/^[+-]/, '')
                                    : shown}
                                />
                              </span>
                              {st.sub
                                ? <span className="alx-s"><FoldCounties text={st.sub} /></span>
                                : null}
                            </div>
                          ))}
                          {/* the series beside the figures, only where one
                              genuinely exists — an invented line would be
                              worse than no line */}
                          {a.spark && a.spark.filter((v) => v > 0).length > 2
                            ? (
                              <div className="alx-spark" title={a.spark_label ?? undefined}>
                                <AlertSpark values={a.spark} tone={a.category} />
                                {a.spark_label
                                  ? <span className="alx-sparkcap">{a.spark_label}</span>
                                  : null}
                              </div>
                            )
                            : null}
                        </div>
                      )
                      : null}

                    <div className="al-meta">
                      {a.lead_lease ? <span><b>{a.lead_lease}</b></span> : null}
                      {a.detected_label && a.detected_label !== a.event_label
                        ? <span>detected {a.detected_label}</span>
                        : null}
                      <Band tier={tier} from="pro">
                        {a.evidence.length
                          ? <span>{a.evidence.length} {plural(a.evidence.length, 'line')} behind it</span>
                          : null}
                      </Band>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
          : (
            <div
              className="card card-pad"
              style={{ marginTop: 14, border: '2px dashed var(--line)', textAlign: 'center' }}
            >
              <strong className="small">
                {quiet ? 'What a quiet week looks like' : 'Nothing matches these filters'}
              </strong>
              <p className="tiny muted" style={{ margin: '6px auto 0', maxWidth: 560 }}>
                {quiet
                  ? (al.quiet_reason
                    ?? `Nothing new on or near these leases ${al.window_label}. We checked production `
                      + 'filings, permits, completions, status changes and the model flags. Quiet is a '
                      + 'result, not a failure — we never invent activity to look busy.')
                  : (
                    <>
                      {/* THE REASON, NOT THE CATEGORY. This read "No {label}
                          alert matches", and `CATS` carries `all` with the
                          label "All" — so the commonest empty case of all, a
                          search with no hits and no category chosen, printed
                          "No all alert matches." Naming the term instead is
                          both grammatical and more use: it tells the reader
                          WHICH of the two controls emptied the page, the way
                          the Activities feed's empty state already does. */}
                      {needle
                        ? (
                          <>
                            No alert matches &ldquo;{q.trim()}&rdquo;
                            {catLabel ? <> in {catLabel}</> : null}
                            {unreadOnly ? <> among the unread</> : null}.{' '}
                          </>
                        )
                        : unreadOnly && !catLabel
                          ? <>Nothing is unread.{' '}</>
                          : (
                            <>
                              No {unreadOnly ? 'unread ' : ''}{catLabel} alert matches.{' '}
                            </>
                          )}
                      <button type="button" className="linklike" onClick={clearFilters}>
                        show all {al.count} →
                      </button>
                    </>
                  )}
              </p>
            </div>
          )}

        {/* ---------- the quiet-week card, even when there ARE alerts ---------- */}
        {rows.length
          ? (
            <Band tier={tier} from="detailed">
              <div
                className="card card-pad"
                style={{ marginTop: 14, border: '2px dashed var(--line)', textAlign: 'center' }}
              >
                <strong className="small">What a quiet week looks like</strong>
                <p className="tiny muted" style={{ margin: '6px auto 0', maxWidth: 560 }}>
                  &ldquo;Nothing new near your leases. We checked production filings, permits,
                  completions, status changes and the model flags — next sweep tonight.&rdquo; Quiet
                  is a result, not a failure. This page will look like that on most weeks, and the
                  watch will have run every morning of them.
                </p>
              </div>
            </Band>
          )
          : null}

        {/* ---------- what the record could not tell us ---------- */}
        {al.notes.length
          ? (
            <section style={{ marginTop: 18 }}>
              <div className="act-band">What the record could not tell us</div>
              <div className="mv-cards">
                {al.notes.map((nt, i) => <p className="al-note" key={i}>{nt}</p>)}
              </div>
              <p className="tiny muted" style={{ margin: '10px 0 0' }}>
                These are stated rather than hidden. A finding that cannot be measured is not shown
                as a zero, because &ldquo;nothing happened&rdquo; and &ldquo;we could not see&rdquo;
                are different answers.
              </p>
            </section>
          )
          : null}

        {/* ---------- the claim CTA at the foot of the sample ---------- */}
        {unclaimed
          ? (
            <div className="smp-cta cr-foot" style={{ marginTop: 14 }}>
              <span className="cr-foot-txt">
                <strong>Every alert above belongs to a sample owner.</strong> Claim your record and
                this inbox starts filling with findings about your own leases — production filed,
                permits nearby, operator handovers, and anything that looks like a payment gap.
              </span>
              {/* same destination as the rail at the top — see its note */}
              <Link className="btn btn-primary" href="/mineralownersite/claim">
                Claim your record — free, no obligation
              </Link>
              <button className="small linklike" type="button" onClick={() => go('activities')}>
                or explore the public activity meanwhile →
              </button>
            </div>
          )
          : null}

        {/* ---------- delivery ---------- */}
        <Band tier={tier} from="detailed">
          <p className="tiny muted" style={{ marginTop: 14 }}>
            Delivery is your call — email, push, or in-app per alert type in{' '}
            <Link href={PREFS_HREF}>Settings</Link>. Quiet by design: alerts fire on real events,
            never to look busy. {al.window_note}.
          </p>
        </Band>
        <Band tier={tier} from="pro">
          <p className="tiny muted" style={{ marginTop: 6 }}>
            Alert emails are a <strong>short summary with a link back here — never the full
            content</strong>. Every alert carries its <strong>event date and the date it was
            detected</strong>, so an old filing newly matched to your record says so, and one event
            never repeats across the dashboard, this page and the activity feed unless the
            underlying fact changes.
          </p>
        </Band>
      </Band>
    </section>
  );
}

/* ------------------------------------------------------------- the spark */
/**
 * A 20px bar strip for the alert cards.
 *
 * Bars rather than a line, and no axis: at this size a line is noise and an
 * axis is unreadable, but the SHAPE — rising, tailing off, one spike — is
 * legible and is the only thing being claimed. The exact figures are in the
 * stat strip beside it and in the drawer behind it, so nothing depends on
 * reading this precisely.
 *
 * The last bar is highlighted because it is the one the sentence above is
 * about; the rest are context.
 */
function AlertSpark({ values, tone }: { values: number[]; tone: string }) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 3) return null;
  const max = Math.max(...v) || 1;
  const colour = tone === 'money' ? '#b8892f' : tone === 'models' ? '#3b5bdb' : '#2e8f6d';
  return (
    <svg
      className="alx-svg" viewBox={`0 0 ${v.length * 4} 20`} preserveAspectRatio="none"
      role="img" aria-label={`${v.length} periods, highest ${Math.round(max)}, latest ${Math.round(v[v.length - 1])}`}
    >
      {v.map((x, i) => {
        const h = Math.max((x / max) * 18, x > 0 ? 1.5 : 0.5);
        return (
          <rect
            key={i} x={i * 4} y={20 - h} width="2.6" height={h} rx="0.8"
            fill={colour} opacity={i === v.length - 1 ? 1 : 0.42}
          />
        );
      })}
    </svg>
  );
}
