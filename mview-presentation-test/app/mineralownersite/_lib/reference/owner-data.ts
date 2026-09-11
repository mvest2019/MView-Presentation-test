import { americanize } from './american';
import type { Alert, Drawer, Payload } from './payload';
import raw from './owner-payload.json';
import { apiBase, fetchOwnerLiveBlocks, OwnerApiError } from './owner-api';
import { getSessionUser } from '@/lib/session';

import {
  fetchDashboard, fetchDrawers, fetchForecast, fetchForecastDrawers, fetchWeekly,
  fetchWeeklyHistory, memberApiBase, searchRoll,
} from './member-api';
import { leaseAndWellDrawers } from './member-drawers';

/**
 * THE DATA SEAM — the only module in the Dashboard/Weekly Report tree that
 * knows where a figure comes from.
 *
 * WHY IT IS SHAPED LIKE THIS. Everything above it — the twelve ported
 * components, both routes, all four API handlers — takes `Payload` and nothing
 * else. No component imports the fixture, none of them fetches, and none of
 * them knows whether a number arrived from a JSON file or a database. So
 * replacing the temporary data with a backend is a change to THIS FILE and
 * nothing else:
 *
 *     export async function getOwnerPayload(sel) {
 *       const res = await fetch(`${API}/portfolio?${qs(sel)}`);
 *       return res.json() as Promise<Payload>;
 *     }
 *
 * Both functions are ALREADY ASYNC for exactly that reason. Nothing awaits a
 * synchronous value and then has to be rewritten when it stops being one — the
 * call sites are written against a promise from the start, and swapping the
 * body cannot ripple outwards.
 *
 * WHERE THE FIGURES COME FROM TODAY. `owner-payload.json` is one response of
 * the reference build's own `/api/portfolio`, captured once for the owner its
 * `config.json` names (Platis Sydney Kay, owner number 715109, district 02).
 * The reference assembles it from ten Mongo reads and ships no fixture of its
 * own — even its `selftest` and `leakcheck` open the database — so this is the
 * reference's own output, not a transcription of it. Every figure on every
 * route was computed by the reference: the six-year estimate and its band,
 * the June 2026 volumes, the nine findings, the ring counts, the price-deck
 * history, the well coordinates, the 261-month forecast and its 189-month
 * posted seam, the whole Saturday report and all fifty-two drawer explainers.
 *
 * WHAT WAS TRIMMED, and why it is invisible on the five routes. The captured
 * payload is 2.7 MB and this one is 2.0 MB. Two arrays that no route renders
 * were shortened; every key survives, because `sample.ts` maps over them
 * verbatim and a missing key would throw in the not-claimed state:
 *
 *   activities.nearby        the dashboard card slices at most 8
 *                            (Professional), and `ActivitiesView` reads only
 *                            `activities.compare_90` and `compare_180` from
 *                            this block — the feed it draws is
 *                            `timeline.events`. The figure the card prints is
 *                            `activities.counts.nearby`, its own field, which
 *                            still reads 709.
 *   leases[*].monthly        every view reads the aggregated `series.months`;
 *                            nothing reads the per-lease months. 24 kept, to
 *                            match that window.
 *
 * `timeline.events` IS KEPT IN FULL — all 893 rows, captured from the same
 * reference build and the same run day, its first twelve byte-identical to the
 * twelve an earlier pass kept. It was trimmed while Activities was out of
 * scope; now that the route renders it, a trim is not a smaller fixture but a
 * different page. The counts on screen are read from the array itself — "120
 * of 886 events", "133 on your leases" — so a short array does not show fewer
 * rows, it shows wrong numbers, and the page opens on the owner's own leases,
 * of which the trimmed capture held none.
 *
 * `nearby.rows` is kept IN FULL — all 149 of them. The weekly report's
 * five-mile map plots every single row at its own measured offset, so trimming
 * that array would quietly empty the map. An earlier fixture did trim it, and
 * that is the kind of mistake a text diff cannot see.
 *
 * `forecast` is kept IN FULL too — 707 KB, 555 KB of it in
 * `forecast.leases[*].months`. Production & Forecast IS that series: the chart
 * draws the portfolio's 261 months and, the moment a lease is picked from the
 * select, the table or a life bar, it draws that lease's own 102 to 279. There
 * is nothing to shorten there without changing what a click does. `my_leases`
 * (169 KB) is kept whole for the same reason `sample.ts` forces on everything
 * else: that transform walks every one of its arrays.
 */

/** what the caller may ask for — the reference's own `OwnerSelection` */
export interface OwnerSelection {
  owner?: string | null;
  num?: string | number | null;
  dist?: string | null;
  year?: string | number | null;
}

/**
 * `as unknown as Payload`: the JSON's inferred literal type is structurally
 * the same shape but far narrower — every number a literal, every array a
 * tuple — so it cannot be assigned to `Payload` directly. The shape is checked
 * the way that actually matters, by twelve components compiling against
 * `Payload` and reading this object.
 */
/*
 * AMERICANIZED ONCE, HERE, and not per request. The capture is the reference
 * build's own output and it spells British — "Neighbours" as a card label,
 * "Neighbouring leases" as a stat, "neighbourhood" and "colour" in the prose.
 * `american.ts` records why that is fixed at this seam rather than in the
 * components or by rewriting the 2 MB file, and why it rewrites values but
 * never keys. This is a module-level constant, so the walk over 2 MB runs at
 * import and every request reads the result.
 */
const FIXTURE = americanize(raw as unknown as Payload);

/** what a caller is willing to wait for */
export interface PayloadOptions {
  /**
   * Read Alerts and Activity from `mineralview-api` when one is configured.
   *
   * `true` (the default) for anything that renders the chrome: `Chrome`
   * computes the sidebar badge and the bell from `p.alerts.items`, so a route
   * that skipped the live read would show a stale count beside a live page —
   * the one defect the contract's §13 and the reference's own comments both
   * single out.
   *
   * `false` for the two weekly endpoints. Neither `weekly.ts` nor
   * `weekly-render.ts` reads a single field of the four live blocks, so making
   * a CSV download fail because the alerts service is having a bad afternoon
   * would be a coupling with nothing on the other end of it.
   */
  live?: boolean;
}

/**
 * The owner record every surface renders.
 *
 * TWO SOURCES, ONE SEAM, AND THE JOIN IS DECLARED HERE — the whole reason this
 * module exists. `mineralview-api` serves five of the record's blocks and no
 * more (`OWNER-ALERTS-ACTIVITY-API.md`, §1), so:
 *
 *   alerts · timeline · activities · rings     the API, when configured
 *   series                                     the same, lifted out of
 *                                              `/activity/summary`
 *   everything else                            the committed capture
 *
 * `series` is the newest of them and the reason Activities is now dynamic to
 * the last figure: its "Your own filed months" chart was the one thing on
 * either screen still drawn from the capture, because no endpoint returned the
 * owner's monthly NET share until `series_months` was added.
 *
 * WHY THE FOUR ARE FETCHED TOGETHER even for a route that shows one of them:
 * they are one snapshot on the server and they must stay one here. The bell
 * badge, the alert list, the dashboard's rollup, the activity feed and the
 * mile panel are all counted off these four objects, and the redesign's own
 * note records that they drifted apart when they were not. `owner-api.ts`
 * fetches them in the order §3 asks for, so the four reads cost one cold build.
 *
 * WHY A FAILURE IS NOT PATCHED WITH THE CAPTURE. A page showing this owner's
 * chrome above last month's alerts, with nothing on screen saying so, is worse
 * than a page that says it could not load — and the shell already has somewhere
 * honest to put that: `Portal` retries once on mount and then renders the error
 * with the API's own message in it. So the error is thrown. The capture is the
 * source only when NO API is configured at all, which is the state this app
 * shipped in before the service existed.
 */
export async function getOwnerPayload(
  sel?: OwnerSelection, opts?: PayloadOptions,
): Promise<Payload> {
  const base = apiBase();
  if (!base || opts?.live === false) return FIXTURE;

  /* THE MEMBER-KEYED PATH TAKES PRECEDENCE, because it is the whole record and
     the owner-keyed path below is four blocks of it. For a signed-in member,
     `/dashboard` and `/weekly` serve the Dashboard and the Weekly Report
     outright and the capture is not read at all. */
  const member = await currentMemberTarget();
  if (member) return buildMemberPayload(member.base, member.member);

  /* THE CONTRACT HAS NO DEFAULT OWNER — "omitting `owner` is a 400" — but this
     app does, and it is the owner the capture holds. Entering
     `/mineralownersite/alerts` with no query string has to work, so the
     default is supplied here rather than left to fail at the API. Its number
     and district go with it: §2 rule 2 is that an owner number is a county
     appraisal key and is reused, so the identity is pinned with all three. */
  const owner = sel?.owner?.trim() || FIXTURE.owner.ownername;
  const isDefault = owner === FIXTURE.owner.ownername;

  /* NO MIXED RECORDS. Every block except the four is this one owner's, so
     asking for somebody else would print their alerts under this owner's name,
     value and lease count. Until the rest of the record has a source, that is
     refused rather than rendered. Nothing in the UI can reach this — the
     picker only ever returns the owner the capture holds — so it guards a
     hand-typed URL. */
  if (!isDefault) {
    throw new OwnerApiError('/alerts', 409, {
      statusCode: 409,
      code: 'OWNER_NOT_AVAILABLE',
      message: `Alerts and Activity can be read for any owner, but the rest of `
        + `this record — the portfolio, the leases and the weekly report — is `
        + `still the captured one for ${FIXTURE.owner.ownername}. Showing `
        + `"${owner}" would mix two people's figures on one page.`,
    });
  }

  /* THE LIVE BLOCKS GET THE SAME TREATMENT, and they have to: they come from
     `mineralview-api`, which is not ours to change, and they carry the same
     spellings the capture does. Four blocks rather than the whole 2 MB, so this
     is the only part of the normalization that costs anything per request. */
  const live = americanize(await fetchOwnerLiveBlocks(base, {
    owner,
    num: sel?.num ?? (isDefault ? FIXTURE.owner.ownernumber : null),
    dist: sel?.dist ?? (isDefault ? FIXTURE.owner.districtcode : null),
    year: sel?.year ?? null,
  }));

  /* `live` is five whole blocks, each already checked against its `Payload`
     member by `owner-api.ts`, so this is a replace and not a deep merge. A
     deep merge would be the bug: it would let a field the API stopped sending
     be back-filled from a capture taken on a different day. `series` lands
     here by the spread like the rest — it is a whole block by the time
     `owner-api.ts` hands it over. */
  return {
    ...FIXTURE,
    ...live,
    alerts: withLedger(live.alerts),
    activities: { ...live.activities, nearby: trimNearby(live.activities.nearby) },
    drawers: withAlertDrawers(FIXTURE.drawers, live.alerts.items),
  };
}

/**
 * WHO IS ASKING — read from the session, once, here.
 *
 * `member_id` IS THE SIGNED-IN MEMBER'S, AND NOTHING ELSE'S. The login
 * response carries it (`AuthUser.member_id`), `startSession` puts it in the
 * httpOnly `mv_user` cookie as `SessionUser.id`, and this reads it back. The
 * cookie is httpOnly on purpose, so the id never reaches page JavaScript —
 * which is also why this is the right layer to read it: the Dashboard and the
 * Weekly Report are built on the SERVER, so the identity is resolved where the
 * request already is and never has to travel to the browser and back.
 *
 * IT IS READ HERE AND NOWHERE ELSE, which is the same rule that makes this
 * module the data seam. One place knows where a figure comes from; one place
 * knows whose figure it is. The four call sites — both route pages,
 * `/api/portfolio` and the two `/api/weekly*` handlers — pass nothing and
 * cannot pass the wrong thing.
 *
 * NOT SIGNED IN IS NOT AN ERROR HERE. It falls through to the owner-keyed path
 * below and, with no API configured at all, to the capture — the state this app
 * shipped in. A page that needs to refuse an anonymous visitor should say so
 * itself; this function's job is to report the identity, not to police it.
 *
 * `getSessionUser` reads `cookies()`, so it needs a request scope. Every
 * caller is a server page or a route handler, which have one. The `try` is for
 * the case where that stops being true: a build-time or worker call gets
 * "nobody is signed in" rather than a thrown page.
 */
export async function currentMemberTarget(): Promise<
  { base: string; member: string } | null
> {
  const base = memberApiBase();
  if (!base) return null;
  try {
    const user = await getSessionUser();
    return user ? { base, member: String(user.id) } : null;
  } catch {
    return null;
  }
}

/**
 * THE DASHBOARD AND THE WEEKLY REPORT, FROM THE MEMBER-KEYED ENDPOINTS.
 *
 * WHAT COMES FROM WHERE. `/dashboard` carries seventeen of the record's
 * twenty-four blocks and the Dashboard reads fifteen of them, all present.
 * `/weekly` carries every one of `WeeklyReport`'s thirty-nine fields. Neither
 * needs a mapper: each response is assigned straight into the block it fills,
 * so `tsc` checks the shape at the assignment and a renamed field stops the
 * build instead of reaching a card.
 *
 * THE OWNER FOR THE DRAWERS IS TAKEN FROM THE DASHBOARD'S OWN ANSWER, and that
 * is not a detail. This member claims THREE roll owners — Bridwell Oil Co
 * (Wi), Hilcorp Energy Company, Jla Resources Company — and the drawer
 * endpoint's `owner` parameter picks between them:
 *
 *     /dashboard?member_id=4785                     Bridwell, 21 leases, $32,403,527
 *     /dashboard/drawers/value?...                  Bridwell, the same $32,403,527
 *     /dashboard/drawers/value?...&owner=Jla...     Jla,      12 leases, $51,832,044
 *     /dashboard/drawers/value?...&owner=Hilcorp... 502
 *
 * Pinning a name here would put one owner's figure on the strip and another
 * owner's inside the panel that explains that strip — $32.4M on the card,
 * $51.8M in its own explainer. Reading it off `dash.owner.ownername` makes the
 * card and its panel the same owner by construction, whichever owner the
 * member's dashboard resolves to.
 *
 * `forecast` HAS ITS OWN ENDPOINT NOW, and it is read here rather than on the
 * production route, because `Portal` shares one payload across the five
 * `OWNED` routes and reaches them by `pushState` — see the first round below.
 * `/production/forecast` carries every one of `ForecastPayload`'s eighteen
 * blocks and `/production/forecast/drawers/{key}` the twelve explainers its
 * cards open, so Production & Forecast is live for a signed-in member and the
 * capture is not read for it at all.
 *
 * WHAT THIS STILL DOES NOT SERVE, and why the capture does. `my_leases` has no
 * endpoint at all, and `timeline` and `rings` are the owner-keyed half of the
 * API rather than this one. None of the three is read by the Dashboard, the
 * Weekly Report or Production & Forecast — they belong to My Leases and
 * Activities, which are outside this work — so they are left exactly as they
 * were rather than being quietly re-pointed. See `.env.example` for what that
 * means for those routes.
 */
async function buildMemberPayload(base: string, member: string): Promise<Payload> {
  /* `/dashboard` is the long read — 648 KB, eight seconds cold — so `/weekly`
     runs beside it rather than after it. The drawers cannot start until the
     dashboard names its owner, which is the whole reason for two rounds.

     `/production/forecast` JOINS THAT FIRST ROUND rather than waiting for the
     production route to ask, and it has to: `Portal` holds ONE payload for the
     five routes in `OWNED` and moves between them with `history.pushState`, so
     a reader who enters at the Dashboard and clicks Production & Forecast gets
     NO new request. Fetching it lazily would leave that reader on the capture —
     somebody else's ten leases under this member's name — which is the exact
     defect the drawer-scoping note below records and reverts.

     It is free in wall-clock: measured 0.7s for 1.0 MB against the 5.7s
     `/dashboard` it runs beside. And a failure THROWS, like `/weekly`'s
     already does, because the alternative is patching this member's page with
     the capture and saying nothing — the rule `getOwnerPayload` sets out
     above. `Portal` retries once on mount and then shows the API's own
     message. */
  /* THE ARCHIVE COMES FROM THE ENDPOINT THAT OWNS IT, and it rides this round
     rather than a lazy read for the same reason `/production/forecast` does:
     `Portal` holds ONE payload across the five routes in `OWNED` and moves
     between them with `history.pushState`, so a reader who enters at the
     Dashboard and clicks Weekly Report issues no new request. It is a 2 KB
     read beside a 648 KB one and costs nothing in wall-clock.

     IT IS THE ONE READ HERE THAT DOES NOT THROW. The other three ARE the page
     — without them there is no report to draw, and failing loudly is right.
     The archive is one section at the foot of it, and `/weekly` already
     carries an `archive` of its own, so a history endpoint that is down has a
     correct answer available: use what `/weekly` sent. Throwing instead would
     take the whole report down over its last section. */
  const [dash, weekly, forecast, history] = await Promise.all([
    fetchDashboard(base, member),
    fetchWeekly(base, member),
    fetchForecast(base, member),
    fetchWeeklyHistory(base, member).catch((e: unknown) => {
      console.warn('[mineralview-api] /weekly/history could not be read, keeping '
        + "/weekly's own archive:", e instanceof Error ? e.message : e);
      return null;
    }),
  ]);

  /* THE CURRENT ISSUE IS DROPPED, and that is the whole of the mapping.
     `/weekly/history` returns the issue this report IS alongside the ones
     before it (`current: true`, measured: seven rows where `/weekly.archive`
     sends six), and the archive's own heading counts "N issues before this
     one" — which stops being true the moment this one is in the list. Every
     other field the section draws is already named the same on both sides, so
     nothing else is translated. */
  const archive = history
    ? history.issues
      .filter((it) => !it.current)
      .map((it) => ({
        week_ending_iso: it.week_ending_iso,
        week_ending_label: it.week_ending_label,
        line: it.line,
        quiet: it.quiet,
      }))
    : weekly.archive;

  /* THE THREE FAMILIES OF EXPLAINER, and only one of them is fetched.
     `drawer_keys` advertises 205 keys; the endpoint serves the eleven flat ones
     and five of the nine `alert:*`. `lease:*` and `well:*` — 89 keys — all
     answer DASHBOARD_DRAWER_NOT_FOUND. Asking for a key that is known to 404
     costs a request to be told nothing, so the flat keys are read and the other
     two families are built from the rows they describe, which is what the
     reference does with them anyway. */
  const flatKeys = dash.drawer_keys.filter((k) => !k.includes(':'));
  /* ALL ELEVEN, ON EVERY SURFACE, AND THAT IS DELIBERATE — it was measured the
     other way round first. The Weekly Report opens exactly one of them
     (`identity`, from the claim button on its cover), so fetching one instead
     of eleven took a `/briefing` load from 12.5s to 2.6s. It also broke the
     Dashboard: `OWNED` holds both routes, so the sidebar switches between them
     WITHOUT a new request, and a reader who entered at `/briefing` and then
     clicked Dashboard got a page whose payload carried a single explainer —
     ten of its "expand →" controls did nothing at all, silently, because
     `DrawerPanel` hides itself when its copy is null.

     One shared payload is the reference's own arrangement and the reason a
     route change is instant; the price is that it has to be complete enough
     for every route sharing it. Ten saved requests against ten dead controls
     is not a trade worth making, so the scoping was reverted. */
  /* THE TWELVE `pf_*` EXPLAINERS COME FROM THE FORECAST'S OWN `drawer_keys`,
     not from a list written here — the service is what knows which panels it
     serves, and all twelve of the ones it advertises answer 200 (measured, on
     `member_id` alone). They ride in this second round beside the dashboard's
     eleven because they are the same kind of read and neither blocks the other.

     WHY ALL TWELVE AND NOT JUST `pf_removed`: every one of them is already
     wired to a control. `ProductionView` renders the six `insights` and the six
     `stats` as buttons and opens each synchronously out of `p.drawers[st.key]`,
     so a key missing from the payload is a card that looks clickable and does
     nothing — `DrawerPanel` hides itself when its copy is null. `pf_removed`
     is the fourth insight ("Removed before the sales meter"); the card in the
     reference that reads "What this is →" is `pf_blind`. Serving one and not
     the other eleven would leave eleven dead controls. */
  const [served, pfServed] = await Promise.all([
    fetchDrawers(base, member, dash.owner.ownername, flatKeys),
    fetchForecastDrawers(base, member, forecast.drawer_keys),
  ]);

  return {
    /* explicit rather than `...FIXTURE, ...dash`: if `Payload` ever gains a
       block, this has to fail to compile rather than silently serve a capture
       of somebody else's minerals for it */
    ...dash,
    owner: { ...dash.owner, ...OWNER_GAPS },
    alerts: { ...dash.alerts, ledger: dash.alerts.ledger ?? EMPTY_LEDGER },
    weekly: { ...weekly, archive },
    nearby: NO_NEARBY,
    activities: {
      ...dash.activities,
      ...ACTIVITY_GAPS,
      nearby: trimNearby(dash.activities.nearby),
      counts: { ...dash.activities.counts, production: dash.activities.counts.production ?? 0 },
    },
    drawers: {
      ...served,
      /* the twelve Production & Forecast panels, from their own endpoint */
      ...pfServed,
      ...leaseAndWellDrawers(dash.leases, dash.totals, dash.as_of),
      /* all nine, from the live findings — the same argument as the
         owner-keyed path below, and here it also covers the four the endpoint
         404s: filed-<YYYYMM>, handover-<lease>, trend-<lease> */
      ...withAlertDrawers({}, dash.alerts.items),
    },
    timeline: FIXTURE.timeline,
    rings: FIXTURE.rings,
    /* THE ASSIGNMENT IS THE CONTRACT TEST — `ForecastResponse` is
       `ForecastPayload` plus the service's three self-report fields, so a
       renamed or newly-nullable field stops `tsc` here rather than reaching
       the chart. No mapper, for the same reason `/dashboard` needs none. */
    forecast,
    my_leases: FIXTURE.my_leases,
  };
}

/**
 * THE SEVEN FIELDS `/dashboard` OMITS, and why each one is filled here.
 *
 * `tsc` cannot catch these. The response is parsed as JSON and cast, so the
 * `Omit<Payload, …>` on `DashboardResponse` checks that the BLOCKS line up and
 * says nothing about a field missing inside one of them. Two of these were
 * found the only way they can be — by running the pages and reading the
 * exception:
 *
 *   activities.kpis_mine        `sample.ts` lines 479, 482 and 497 map over all
 *   activities.kpis_nearby      three, so the not-claimed state threw
 *   activities.production       "Cannot read properties of undefined (reading
 *                               'map')" the moment the funnel was set to
 *                               "Not claimed" — on EVERY route, because the
 *                               transform runs before any of them render.
 *   alerts.ledger               `AlertsView` line 83 does `const lg =
 *                               al.ledger` and then reads `lg.leases`, so the
 *                               Alerts route threw "reading 'leases'".
 *
 * The other three are quieter. `owner.districtcode` is read by `Chrome`'s owner
 * picker, `Portal` and the Weekly Report's own query string, and is
 * `string | null` in the contract — so `null` is not a stand-in, it is the
 * declared way to say the roll district is not known. `identities_matched` and
 * `activities.counts.production` have no reader in this build at all.
 *
 * WHY EMPTIES AND NOT THE CAPTURE. Every one of these belongs to a block that
 * is otherwise LIVE, so borrowing the capture's value would put one owner's
 * ledger figures inside another owner's alert block — the mixing this seam
 * refuses everywhere else, and harder to spot here because it would be a
 * plausible number in a real panel. An empty says "not served", which is true.
 *
 * WHAT IS AFFECTED, precisely: the Alerts page's watch-ledger panel reads zero,
 * and the not-claimed demo's activity KPI cards and production feed are empty.
 * Both are outside the Dashboard and the Weekly Report, and neither reads any
 * of these fields in a claimed state. If Alerts is brought onto this endpoint,
 * these are the fields to ask the service for.
 */
const OWNER_GAPS = {
  districtcode: null,
  identities_matched: 0,
} satisfies Partial<Payload['owner']>;

const ACTIVITY_GAPS = {
  kpis_mine: [],
  kpis_nearby: [],
  production: [],
} satisfies Partial<Payload['activities']>;

const EMPTY_LEDGER: Payload['alerts']['ledger'] = {
  leases: 0, counties: 0, adjacent_leases: 0, standing_permits: 0,
  production_filings: 0, lease_months_read: 0, alerts: 0, action_count: 0,
  rest_count: 0, operators: 0, wells: 0, nearby_filings: 0,
  since_label: null, last_read_label: null,
  price_month: '', price_annual: '', price_weekly: '', price_weekly_annual: '',
};

/**
 * THE FIVE-MILE MAP HAS NO SOURCE, AND SAYS SO IN THE REFERENCE'S OWN WORDS.
 *
 * `nearby` is the one block the Weekly Report reads that nothing serves.
 * Searched for, not assumed: `dashboard/nearby`, `nearby`, `weekly/nearby` and
 * `activity/nearby` all 404; `/dashboard` carries `activities.nearby`, which is
 * 232 rows of the county filing feed with no coordinates on them, and `radius`,
 * which is counts per band; `/activity/rings` carries `neighbours` with no
 * coordinates either. The map plots `dx_mi`/`dy_mi` per row, and no endpoint
 * returns them.
 *
 * `NearMap` already has a path for exactly this: with no rows it renders a
 * `notice` carrying `nearby.unavailable`, and falls back to its own sentence
 * when that is null. So the honest bind is an empty `rows` and a truthful
 * `unavailable`, which produces the reference's own component in the reference's
 * own state — not a redesign, not an invented neighbour, and not another owner's
 * map borrowed from the capture.
 *
 * `bands`, `anchors` and `read_rows` are zeroed because nothing reads them once
 * `rows` is empty, and a count copied from a different source would be the
 * beginning of exactly the mixing this seam refuses everywhere else.
 */
const NO_NEARBY: Payload['nearby'] = {
  rows: [],
  bands: {
    '1': band(1), '3': band(3), '5': band(5),
  },
  anchors: 0,
  unavailable: 'The five-mile map is not available for this account yet: the service that '
    + 'serves this dashboard has no endpoint carrying the well coordinates the map is drawn '
    + 'from. Every figure elsewhere in this report is live; this one panel is the only thing '
    + 'waiting on a source.',
  note: 'Distance is measured from the nearest of your own well surface locations to the row '
    + 'itself, as a straight line.',
  read_rows: 0,
  capped: false,
};

function band(n: 1 | 3 | 5): Payload['nearby']['bands']['1'] {
  return {
    band: n,
    rows: 0, permits: 0, completions: 0, wellbores: 0, producing: 0, operators: 0,
    nearest_mi: null, nearest_name: null, newest_iso: null, newest_label: null,
    last_month_gas: 0, last_month_oil: 0,
  };
}

/**
 * THE WATCH LEDGER MUST NEVER PRINT A ZERO.
 *
 * `alerts.ledger` feeds one panel — "What you are actually paying for" — and
 * that panel is built entirely out of counts. It reads as an argument for the
 * subscription only while the counts are real. Empty, it renders
 *
 *   "We read the public record on your 0 leases every day"
 *   "0 leases · 0 counties"   "0" filings   "0" alerts
 *   "Premium is  a month — about  a week ... on the annual plan ()"
 *   "these 0 lease numbers ... 0 lease-months ... a week with 0"
 *
 * which is the strongest available argument AGAINST subscribing, printed on the
 * one page whose job is to say what subscribing buys. Seen in the field: the
 * live block came back with an empty ledger while the same response's `counts`
 * were correct, so the page showed nine alerts above a panel claiming to watch
 * nothing.
 *
 * THE FALLBACK IS THIS OWNER'S OWN CAPTURED FIGURES, not another owner's and
 * not an invented set. `getOwnerPayload` refuses any owner but the captured
 * one a few lines above (409 `OWNER_NOT_AVAILABLE`), so `FIXTURE.alerts.ledger`
 * is the same person, read on the day the capture was taken. Substituting it
 * cannot attribute one owner's leases to another; the worst case is a figure a
 * few weeks stale in a panel whose whole point is "this is the shape of what
 * you get".
 *
 * ALL OR NOTHING ON THE COUNTS. `leases` is the headline and the gate: if the
 * service knows of no leases it knows of nothing, and every other count is zero
 * for the same reason, so the block is swapped whole and stays internally
 * consistent. If `leases` is set, the live block is trusted entirely — a zero
 * inside a populated ledger is a FACT (an owner really can have no standing
 * permits), and back-filling that one from the capture would invent a permit
 * that does not exist.
 *
 * THE PRICES ARE SEPARATE, because they are not facts about this owner at all —
 * they are the plan's, identical for everybody, and an owner the service has no
 * plan row for returns them blank while the counts are fine. So they fall back
 * on their own, independently of the counts.
 */
function withLedger(live: Payload['alerts']): Payload['alerts'] {
  const cap = FIXTURE.alerts.ledger;
  const lg = live.ledger?.leases ? live.ledger : cap;
  if (lg.price_month) return lg === live.ledger ? live : { ...live, ledger: lg };
  return {
    ...live,
    ledger: {
      ...lg,
      price_month: cap.price_month,
      price_annual: cap.price_annual,
      price_weekly: cap.price_weekly,
      price_weekly_annual: cap.price_weekly_annual,
    },
  };
}

/**
 * 709 ROWS TO RENDER AT MOST EIGHT.
 *
 * `activities.nearby` is the county's raw filing feed and the service returns
 * all of it — 720 KB on this owner. Exactly one thing reads it: the dashboard's
 * "what is going on around you" card, which does
 * `ac.nearby.slice(0, tier === 'pro' ? 8 : 5)`. The figure printed beside that
 * list is `activities.counts.nearby`, a field of its own, so it still says 709
 * however few rows are kept.
 *
 * Every one of those rows would otherwise be serialised into the RSC payload of
 * every portal page, because the shell holds one snapshot for all four
 * surfaces. Twelve is the capture's own trim, kept so the two sources produce
 * the same record — see the note at the top of this file.
 *
 * The API has no parameter for this, which is why it is done here and not in
 * the query. If `nearby` ever gains a real consumer — a "see all filings" page
 * — this is the line to remove, and the endpoint is the place to page it.
 */
function trimNearby(
  rows: Payload['activities']['nearby'],
): Payload['activities']['nearby'] {
  return rows.length > 12 ? rows.slice(0, 12) : rows;
}

/**
 * THE EXPLAINER FOR A FINDING THE CAPTURE HAS NEVER SEEN.
 *
 * `drawers` has no endpoint, so it stays the capture's — but the findings no
 * longer do, and two of the ten ids the contract lists are DATED or keyed on a
 * lease: `filed-<YYYYMM>` rolls every month, and `handover-<lease_id>` /
 * `trend-<lease_id>` name a lease. The moment the service anchors on a month
 * the capture was not taken in, `drawers['alert:filed-202607']` is absent —
 * and a missing key is not a blank panel, it is a DEAD CONTROL: `DrawerPanel`
 * puts `display:none` on both the panel and the scrim when its `copy` is null,
 * so the row's "expand →" would do nothing at all, with no error and nothing
 * on screen to explain it. Every other row would keep working, which is what
 * makes it the kind of fault nobody reports for a month.
 *
 * IT IS REBUILT RATHER THAN STUBBED, because it can be exactly. The reference's
 * `drawers.ts` derives an alert's panel from the alert and nothing else, and
 * the API sends every field it uses. Checked against all nine of the capture's
 * alert drawers, field for field: `title`, `what`, `means`, `evidence`,
 * `next`, `chips`, `stats`, `spark`, `spark_label` and the composed `sub` all
 * reproduce identically. So this is the reference's own panel, not a
 * placeholder apologising for a missing one.
 *
 * EVERY `alert:` PANEL IS REBUILT, not just the absent ones, and that is the
 * second half of the same fault. Keeping the capture's copy where it exists
 * would leave the panel describing one snapshot and the row above it another:
 * measured on this owner, the live `permit-ring` finding has already moved its
 * `evidence` and `next_step` since the capture was taken, so the row and its
 * own explainer disagree today. Since the reconstruction is what the
 * reference's builder produces, deriving all nine from the live rows costs
 * nothing and makes that disagreement impossible.
 *
 * The other 31 keys — `permits`, `production`, `value`, `lease:<id>`,
 * `well:<api14>` — are NOT derivable from an alert and are left exactly as the
 * capture has them.
 */
function withAlertDrawers(
  base: Record<string, Drawer>, items: Alert[],
): Record<string, Drawer> {
  let out = base;
  for (const a of items) {
    const key = 'alert:' + a.id;
    if (out === base) out = { ...base };
    out[key] = {
      title: a.title,
      /* the reference's own composition, verbatim: class, then the event date,
         then the date it was detected, each dropped when the alert has none */
      sub: [
        a.klass,
        a.event_label ? `event ${a.event_label}` : null,
        a.detected_label ? `detected ${a.detected_label}` : null,
      ].filter(Boolean).join(' · '),
      what: a.body,
      means: a.why,
      evidence: a.evidence,
      next: a.next_step,
      chips: [a.klass],
      stats: a.stats,
      /* `community` has no drawer tone of its own in the reference; `record`
         is the neutral one it falls to */
      tone: a.category === 'community' ? 'record' : a.category,
      spark: a.spark,
      spark_label: a.spark_label,
    };
  }
  return out;
}

/** the reference's `selectionFrom(url)`, reading the same four parameters */
export function selectionFrom(url: URL): OwnerSelection {
  const q = url.searchParams;
  return {
    owner: q.get('owner'),
    num: q.get('num'),
    dist: q.get('dist'),
    year: q.get('year') ? Number(q.get('year')) : null,
  };
}

/* ============================================================ owner search */
/** one row of the owner picker's result list — the reference's `OwnerHit` */
export interface OwnerHit {
  ownername: string;
  ownernumber: string | number;
  districtcode: string;
  city: string | null;
  lease_count: number;
  appraised_total: number;
  year: number;
}

export interface OwnerSearchResult {
  query: string;
  mode: 'exact' | 'starts';
  widened_to_prefix: boolean;
  year: number;
  count: number;
  results: OwnerHit[];
  note?: string;
}

/**
 * Search the roll by name.
 *
 * THE COPY IS THE REFERENCE'S, INCLUDING THE MISS. Its route answers a
 * sub-three-character query with "Type at least three characters — a name
 * search reads the whole roll", widens an exact miss to a prefix ONCE and says
 * so, and explains a true miss by telling the reader the roll carries the name
 * surname-first. The picker renders those sentences, so they are produced here
 * verbatim rather than reworded.
 *
 * THE CORPUS IS NOW THE REAL ROLL. This used to search the committed capture,
 * which held exactly one owner — so the picker could only ever find Platis
 * Sydney Kay, whoever was signed in. `GET /api/v1/owners/search` answers with
 * the whole roll (111 rows for "bridwell"), and that is what it reads now. The
 * capture is still the corpus when no API is configured, which keeps this app
 * working offline exactly as it did.
 *
 * TWO FIELDS THE SERVICE DOES NOT SEND, and the picker prints both.
 *
 * A row carries `name`, `county`, `leaseCount`, `appraisedValue`, `address` and
 * `workingInterest` — and no `ownernumber`, no `districtcode`, no roll `year`.
 * The reference's picker renders "owner N · district D" beneath each name and
 * hands all three to the payload read, because an owner number is a county
 * appraisal key and is REUSED — `owner-api.ts` sets out why name alone is an
 * ambiguous identity.
 *
 * So they are sent as EMPTY rather than guessed, and the row prints without
 * them. Guessing either one would be worse than leaving it blank: the wrong
 * district is a different person's minerals, and this seam refuses a mixed
 * record everywhere else. `county` fills `city` because it is the only place
 * the row's location can go and it is labelled by the picker, not by this
 * function.
 *
 * WHAT SELECTING A ROW DOES TODAY. On the member-keyed path the record is the
 * signed-in member's, so `getOwnerPayload` will not load a different owner over
 * it — it answers `OWNER_NOT_AVAILABLE` and the shell says so. Making the
 * picker switch between the member's OWN claimed owners is the next piece of
 * work, and `/dashboard` already returns them in `owner.claimed_owners`.
 */
export async function searchOwners(
  query: string, limit = 25,
): Promise<OwnerSearchResult> {
  const q = query.trim();
  const base = memberApiBase();
  const year = FIXTURE.owner.roll_year;

  if (q.length < 3) {
    return {
      query: q, mode: 'exact', widened_to_prefix: false, year, count: 0, results: [],
      note: 'Type at least three characters — a name search reads the whole roll.',
    };
  }

  if (base) {
    const res = await searchRoll(base, q, limit);
    const results: OwnerHit[] = res.owners.map((r) => ({
      ownername: r.name,
      /* not sent by the service — see the note above */
      ownernumber: '',
      districtcode: '',
      city: r.county,
      lease_count: r.leaseCount ?? 0,
      appraised_total: r.appraisedValue ?? 0,
      year,
    }));
    return {
      query: q,
      /* the service ranks by its own `score` rather than reporting an exact/
         prefix mode, and it does not widen; saying "exact" would be a claim
         about a matching rule this endpoint does not describe */
      mode: 'starts',
      widened_to_prefix: false,
      year,
      count: res.total,
      results,
      ...(res.truncated
        ? { note: `Showing ${results.length} of ${res.total} — narrow the name to see the rest.` }
        : {}),
    };
  }

  /* NO API CONFIGURED: the capture's single owner, matched the reference's own
     way — exact on the whole name first, then the one prefix widen. */
  const o = FIXTURE.owner;
  const hit: OwnerHit = {
    ownername: o.ownername,
    ownernumber: o.ownernumber ?? '',
    districtcode: o.districtcode ?? '',
    city: o.city,
    lease_count: FIXTURE.totals.lease_count,
    appraised_total: FIXTURE.totals.appraised_value,
    year,
  };
  const name = o.ownername.toLowerCase();
  const needle = q.toLowerCase();

  if (name === needle) {
    return { query: q, mode: 'exact', widened_to_prefix: false, year, count: 1, results: [hit] };
  }
  if (name.startsWith(needle)) {
    return {
      query: q, mode: 'starts', widened_to_prefix: true, year, count: 1,
      results: [hit].slice(0, limit),
    };
  }
  return { query: q, mode: 'exact', widened_to_prefix: false, year, count: 0, results: [] };
}
