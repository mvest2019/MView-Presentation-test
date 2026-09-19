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
/* `alerts.silent` — the rules that found nothing — is newer than this capture,
   and the capture is served whole on three paths (no `member_id`, live off,
   the anonymous preview). The contract says the block is always there, so it
   is made true here rather than guarded at every reader: an empty list is the
   honest answer for a capture that never ran the rules. Same argument as
   `EMPTY_LEDGER` below, and the assignment is a no-op once the capture is
   retaken against the current API. */
FIXTURE.alerts.silent ??= [];
repairForecastNets(FIXTURE.forecast);

/**
 * A FILED MONTH'S NET CANNOT EQUAL ITS GROSS WHILE A REMOVAL IS FILED AGAINST
 * IT — and on a handful of months the service says exactly that.
 *
 * Measured on this record (and confirmed against the live Mongo by QA):
 * lease 02_290271 @ 202606 arrives `gas_gross 77,818 · gas_net 77,818 ·
 * removed 3,357`, while the disposition filing itself says 3,357 MCF of that
 * month never reached the sales meter — so the true net is gross − removed
 * (the DB's own figure, 74,464, differs only by the filing's sub-MCF
 * rounding). The same shape sits on ~15 portfolio months (202606, 202604,
 * 202407, 201911–202011). "After removal" is the measure a royalty is read
 * against, so an unreduced net is the one figure on the page that overstates
 * what the reader is paid on.
 *
 * REPAIRED AT THE SEAM, for both sources: the committed capture (above) and
 * the live `/production/forecast` response (in `buildMemberPayload`), because
 * both carry it — it is the service's own join that drops the deduction on
 * those months, and this module is the one place that knows where a figure
 * comes from. `gas_share` is `gas_net × interest` on every clean month, so it
 * is re-derived from the repaired net; the portfolio month's share comes down
 * by the sum of its leases' corrections, which is the same identity the clean
 * months already satisfy.
 *
 * NARROW ON PURPOSE: only a FILED month, only where `removed > 0`, and only
 * where net still equals gross — a month the service already reduced is left
 * exactly as it answered.
 */
function repairForecastNets(f: Payload['forecast']): void {
  /* per cycle, how much owner share the lease repairs removed */
  const shareDelta = new Map<string, number>();
  for (const l of f.leases) {
    for (const m of l.months) {
      if (m.forecast || m.removed == null || !(m.removed > 0)) continue;
      if (m.gas_net !== m.gas_gross) continue;
      m.gas_net = Math.max(0, m.gas_gross - m.removed);
      const before = m.gas_share;
      m.gas_share = m.gas_net * l.interest;
      shareDelta.set(m.cycle, (shareDelta.get(m.cycle) ?? 0) + (before - m.gas_share));
    }
  }
  for (const m of f.months) {
    if (m.forecast || m.removed == null || !(m.removed > 0)) continue;
    if (m.gas_net !== m.gas_gross) continue;
    m.gas_net = Math.max(0, m.gas_gross - m.removed);
    m.gas_share = Math.max(0, m.gas_share - (shareDelta.get(m.cycle) ?? 0));
  }
}

/**
 * THE ONE RECORD THE NOT-CLAIMED PREVIEW IS BUILT FROM, for every reader.
 *
 * `sampleize` rewrites a payload into a sample of itself, and it used to be
 * handed the READER'S OWN snapshot. Anonymised and scaled, so nothing of theirs
 * was published — but it meant the preview was a different record for every
 * visitor: different lease count, different counties, different volumes, and
 * for a member who had claimed something it was visibly their own portfolio
 * wearing invented names. "This is what your inbox looks like once you claim"
 * is a promise about the PRODUCT, and it cannot be made from the record of
 * somebody who has not claimed one.
 *
 * So the preview is drawn from the capture instead: one record, ten leases, one
 * county, a full timeline and every drawer key — the same shop window for
 * everybody, and the one the copy was written against.
 *
 * SERVER ONLY, DELIBERATELY. This module imports 2 MB of JSON. `Portal` is a
 * client component, so it fetches this through `/api/portfolio/sample` rather
 * than importing it — an import would put the whole capture in the browser
 * bundle of every portal route, claimed readers included.
 */
export function sampleFixture(): Payload {
  return FIXTURE;
}

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
  }, { nearbyLimit: NEARBY_ROWS }));

  /* `live` is five whole blocks, each already checked against its `Payload`
     member by `owner-api.ts`, so this is a replace and not a deep merge. A
     deep merge would be the bug: it would let a field the API stopped sending
     be back-filled from a capture taken on a different day. `series` lands
     here by the spread like the rest — it is a whole block by the time
     `owner-api.ts` hands it over. */
  /* THE ALERT PANELS ON THIS PATH CARRY NO MAP, and that is the honest state.
     A panel's geometry is served with it now — `/dashboard/drawers/{key}`
     carries `map` — and that endpoint is member-keyed. There is no owner-keyed
     equivalent and the backend's note says there will not be one: the
     anonymous `?owner=` path is a development and QA affordance, not a product
     surface. So these panels are rebuilt from the finding, which reproduces
     everything the service sends EXCEPT `source` and `map`, and `DrawerPanel`
     already renders correctly without either. */
  return {
    ...FIXTURE,
    ...live,
    alerts: withSilent(withLedger(live.alerts)),
    activities: live.activities,
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
 * ACTIVITY IS LIVE FOR A MEMBER TOO. `timeline`, `rings`, `activities` and
 * `series` are the owner-keyed half of the API (`OWNER-ALERTS-ACTIVITY-API.md`
 * §9-§11), and they used to be pinned to the capture here — a signed-in
 * member's Activities page showed the sample owner's 893 events under their
 * own name, which is the defect sheet's #3 and #7. The owner identity those
 * four reads need is exactly what `/dashboard` resolves (`dash.owner`), so
 * they ride the second round beside the drawers: `fetchOwnerLiveBlocks`
 * already fetches in the contract's order (`/alerts` alone to warm the
 * snapshot, then the three activity reads together) and a failure THROWS,
 * like `/weekly`'s does — patching Activities with the capture would put the
 * sample owner's feed under this member's name and say nothing.
 *
 * WHAT THIS STILL DOES NOT SERVE, and why the capture does: `my_leases` has
 * no endpoint at all. See `.env.example` for what that means for that route.
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

  /* the same net repair the capture gets at module load — see the note on
     `repairForecastNets`: the live service carries the identical fault */
  repairForecastNets(forecast);

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

  /* THE FOUR FAMILIES OF EXPLAINER, and two of them are fetched.
     `drawer_keys` advertises 2,308 keys: eleven flat, twelve or so `alert:*`,
     and `lease:*` + `well:*`, which are the other 2,287. The last two are built
     from the rows they describe rather than read, because the endpoint takes
     ONE key and 2,287 requests is not a page load.

     THE `alert:*` FAMILY IS READ NOW, and that is a change. It used to be
     rebuilt here from the live finding, for two reasons that have both expired:
     four of the nine 404'd, and the rebuild was provably identical to what the
     service sends — checked field for field across all ten, 0 differed. It is
     no longer identical, because the served panel now carries two things this
     app cannot produce: `source`, the line naming the collections behind the
     rule, and `map`, the panel's own geometry with the points it counted.
     Reading them is what deletes `ALERT_SOURCE` and `alert-maps.ts`. */
  const flatKeys = dash.drawer_keys.filter((k) => !k.includes(':'));
  const alertKeys = dash.drawer_keys.filter((k) => k.startsWith('alert:'));
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
  const [served, pfServed, live] = await Promise.all([
    fetchDrawers(base, member, dash.owner.ownername, [...flatKeys, ...alertKeys]),
    fetchForecastDrawers(base, member, forecast.drawer_keys),
    /* THE OWNER-KEYED ACTIVITY BLOCKS, for the owner `/dashboard` resolved.
       `num` and `dist` ride along where the dashboard carries them — §2 rule 2:
       an owner number is a county appraisal key and only pins the identity
       together with the name. The first read on a cold owner is 23-28 seconds;
       `owner-api.ts` already carries the contract's 60-second deadline. */
    fetchOwnerLiveBlocks(base, {
      owner: dash.owner.ownername,
      num: dash.owner.ownernumber ?? null,
      dist: dash.owner.districtcode ?? null,
    }, { nearbyLimit: NEARBY_ROWS }),
  ]);

  /* `ring_detail` IS DROPPED, AND NO LONGER READ AT ALL.
     It used to be read here to build the ring alerts' maps, because it is the
     only source for what those alerts counted. The service carries `map` on
     the panel now, with the same points and the band each was counted in, so
     there is nothing left to derive from it.

     It is still discarded rather than passed through: 1.4 MB that nothing under
     `Payload` declares, which carried along by `...dash` would be 1.4 MB of
     unread RSC flight data on every portal page — the shell holds ONE snapshot
     for all five owned routes. */
  const dashBlocks = { ...dash };
  delete dashBlocks.ring_detail;

  /* THE FIVE-MILE MAP HAS A SOURCE NOW. `/dashboard` carries `nearby` itself —
     measured on member 4785, 1,266 rows and every one of them with a finite
     lat/lon, byte-identical to `/dashboard/rings`'s own copy — so it rides the
     read the page already makes rather than costing a second request.
     `NO_NEARBY` stays for the deployment that predates the block, and its
     sentence is still the honest thing to render there. */
  const nearby = dash.nearby ?? NO_NEARBY;

  const alerts = withSilent({ ...dash.alerts, ledger: dash.alerts.ledger ?? EMPTY_LEDGER });

  return {
    /* explicit rather than `...FIXTURE, ...dash`: if `Payload` ever gains a
       block, this has to fail to compile rather than silently serve a capture
       of somebody else's minerals for it */
    ...dashBlocks,
    alerts,
    weekly: { ...weekly, archive },
    nearby,
    /* the four Activity blocks come from the owner-keyed API — one snapshot,
       the same one the anonymous owner path reads (see the header note).
       `activities.nearby` is paged by the endpoint itself now (`nearby_limit`),
       so the county feed is never put on the wire to be sliced here. */
    activities: live.activities,
    drawers: {
      /* ---- THE BUILT ALERT PANELS COME FIRST, SO THE SERVED ONES WIN.
         `withAlertDrawers` reproduces the service's own builder out of the
         finding, and it is kept for exactly one case: a finding whose key the
         endpoint does not serve. Every id measured today answers 200, so this
         fills nothing — but a rule added on the service before its drawer is
         wired would otherwise be a row whose "expand →" does nothing at all,
         silently, because `DrawerPanel` hides itself when its copy is null.
         A gap-filled panel has no `source` and no `map`; a served one has
         both, which is why it must be the one that wins. */
      ...withAlertDrawers({}, dash.alerts.items),
      ...served,
      /* the twelve Production & Forecast panels, from their own endpoint */
      ...pfServed,
      ...leaseAndWellDrawers(dash.leases, dash.totals, dash.as_of),
    },
    timeline: live.timeline,
    rings: live.rings,
    /* `series_months`, lifted out of `/activity/summary` by `owner-api.ts` —
       the only source for "Your own filed months" the contract names */
    series: live.series,
    /* THE ASSIGNMENT IS THE CONTRACT TEST — `ForecastResponse` is
       `ForecastPayload` plus the service's three self-report fields, so a
       renamed or newly-nullable field stops `tsc` here rather than reaching
       the chart. No mapper, for the same reason `/dashboard` needs none. */
    forecast,
    my_leases: FIXTURE.my_leases,
  };
}

/**
 * THE FIELDS `/dashboard` USED TO OMIT — and what is left of them.
 *
 * `tsc` cannot catch a missing field here. The response is parsed as JSON and
 * cast, so the `Omit<Payload, …>` on `DashboardResponse` checks that the
 * BLOCKS line up and says nothing about a field missing inside one of them.
 * These were found the only way they can be — by running the pages and reading
 * the exception.
 *
 * SIX OF THE SEVEN ARE SERVED NOW, measured on member 4785:
 *
 *   owner.districtcode          `null` — and that is an ANSWER, not a gap: the
 *                               backend returns null where the owner's leases
 *                               straddle more than one district, because
 *                               quoting "02" for such an owner is wrong on
 *                               half their record. The contract already types
 *                               it `string | null`.
 *   owner.identities_matched    1 — distinct owner-name spellings the roll
 *                               matched, not a row count. Filling this with a
 *                               constant 0 was the live defect this removal
 *                               fixes: the field arrives correct and was being
 *                               overwritten with a zero on its way to the page.
 *   activities.kpis_mine        all three arrive on `/activity/summary`, which
 *   activities.kpis_nearby      is the block `activities` is assigned from on
 *   activities.production       both paths, so `sample.ts` has its arrays.
 *   alerts.ledger               arrives populated, prices included — see
 *                               `withLedger`.
 *
 * `EMPTY_LEDGER` below is therefore the one thing kept, and only as a
 * STRUCTURAL guard: `AlertsView` does `const lg = al.ledger` and then reads
 * `lg.leases`, so a response that somehow omitted the block would throw the
 * route rather than render a thin panel. It is not reached on any measured
 * response.
 *
 * WHY EMPTIES AND NOT THE CAPTURE, still. Every one of these belongs to a
 * block that is otherwise LIVE, so borrowing the capture's value would put one
 * owner's figures inside another owner's block — the mixing this seam refuses
 * everywhere else, and harder to spot here because it would be a plausible
 * number in a real panel. An empty says "not served", which is true.
 */
const EMPTY_LEDGER: Payload['alerts']['ledger'] = {
  leases: 0, counties: 0, adjacent_leases: 0, standing_permits: 0,
  production_filings: 0, lease_months_read: 0, alerts: 0, action_count: 0,
  rest_count: 0, operators: 0, wells: 0, nearby_filings: 0,
  since_label: null, last_read_label: null,
  price_month: '', price_annual: '', price_weekly: '', price_weekly_annual: '',
};

/**
 * THE FIVE-MILE MAP WHEN THE DEPLOYMENT PREDATES ITS BLOCK.
 *
 * `nearby` used to be the one block the Weekly Report reads that nothing
 * served, and it is served now: `/dashboard` carries it outright — measured on
 * member 4785, 1,266 rows with a finite `lat`/`lon` on every one, and
 * `/dashboard/rings` returns a byte-identical copy beside `rings`. So this
 * constant is no longer the member path's normal answer; it is what that path
 * falls to when the response arrives WITHOUT the block, which an API older
 * than the change does.
 *
 * IT IS ALSO STILL THE ANONYMOUS PATH'S ANSWER in effect: that path serves the
 * capture's own `nearby`, whose 149 rows carry no coordinates, so the map
 * draws nothing there either. There is no owner-keyed endpoint for it and the
 * backend's own note says there will not be one.
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
  unavailable: 'The five-mile map is not available for this account: the response that '
    + 'built this page carried no well coordinates for the wells around you. Every figure '
    + 'elsewhere in this report is live; this one panel is the only thing without a source.',
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
/**
 * THE SILENT RULES ARE A LIST, NEVER AN ABSENCE.
 *
 * `alerts.silent` says which of the fourteen rules ran and found nothing, and
 * the page renders it as a count. An API response predating the field — or a
 * capture — would otherwise reach `al.silent.length` as `undefined`, so the
 * block is normalised once here instead of being guarded at the reader.
 *
 * AN EMPTY LIST IS NOT A CLAIM. It renders nothing at all, which is the right
 * answer for a response that cannot say which rules were quiet; it is not the
 * same as "no rules were quiet", and nothing on the page says that it is.
 */
function withSilent(live: Payload['alerts']): Payload['alerts'] {
  return live.silent ? live : { ...live, silent: [] };
}

/**
 * THE PRICES ARE THE SERVICE'S, AND THERE IS NO SECOND COPY OF THEM HERE.
 *
 * This function used to back-fill the four price strings from the capture when
 * the live ledger arrived without them, and `AlertsView` held a third table of
 * its own on top of that. Three copies of one constant, in three files,
 * already disagreeing — `$99.99` in the component against `$99.95` on the
 * wire — and nothing could fail, because each copy was internally consistent.
 *
 * The backend now reads them from one place (`plan-prices.ts`, overridable per
 * deployment) and sends them on both paths: measured, `price_month "$99.95"`
 * and `price_annual "$999.50"` on `/dashboard` AND on `/alerts`. A fallback
 * that has never fired is a second price table that can only ever be wrong, so
 * it is gone from both files.
 *
 * THE COUNT FALLBACK STAYS, and it is a different argument. `alerts.ledger`
 * feeds one panel — "What you are actually paying for" — built entirely out of
 * counts, and empty it renders "We read the public record on your 0 leases
 * every day" on the one page whose job is to say what subscribing buys. Seen
 * in the field. `leases` is the headline and the gate: if the service knows of
 * no leases it knows of nothing, so the counts are swapped WHOLE and stay
 * internally consistent. If `leases` is set the live block is trusted
 * entirely — a zero inside a populated ledger is a FACT, and back-filling that
 * one would invent a permit that does not exist.
 *
 * THE CAPTURE'S COUNTS, THE SERVICE'S PRICES. `getOwnerPayload` refuses any
 * owner but the captured one a few hundred lines above (409
 * `OWNER_NOT_AVAILABLE`), so the substituted counts are the same person, read
 * on the day the capture was taken. Its PRICES are a different matter — they
 * are as old as the file — so they are not taken with it.
 */
function withLedger(live: Payload['alerts']): Payload['alerts'] {
  const lg = live.ledger ?? EMPTY_LEDGER;
  if (lg.leases) return live;
  return {
    ...live,
    ledger: {
      ...FIXTURE.alerts.ledger,
      price_month: lg.price_month,
      price_annual: lg.price_annual,
      price_weekly: lg.price_weekly,
      price_weekly_annual: lg.price_weekly_annual,
    },
  };
}

/**
 * 218 ROWS TO RENDER AT MOST EIGHT — PAGED AT THE ENDPOINT NOW.
 *
 * `activities.nearby` is the county's raw filing feed and the service used to
 * return all of it, 388 KB on this owner. Exactly one thing reads it: the
 * dashboard's "what is going on around you" card, which does
 * `ac.nearby.slice(0, tier === 'pro' ? 8 : 5)`. Every other row would
 * otherwise be serialised into the RSC payload of every portal page, because
 * the shell holds one snapshot for all four surfaces.
 *
 * It used to be sliced HERE, after the whole array had crossed the wire.
 * `/activity/summary` takes `nearby_limit` now, so the rows are never sent —
 * measured, 33 KB against 411 KB for the same response. `counts.nearby` is a
 * field of its own and stays the true total either way (218 both ways,
 * measured), so capping the rows moves no figure on screen.
 *
 * TWELVE, because that is the capture's own trim and the two sources have to
 * produce the same record — see the note at the top of this file. If `nearby`
 * ever gains a real consumer — a "see all filings" page — this is the number
 * to raise, and it is now the only place it is written down.
 */
const NEARBY_ROWS = 12;

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
      /* ---- NO `source`, AND THAT IS THE POINT OF THE CHANGE.
         This used to be filled from `ALERT_SOURCE`, a ten-rule table naming
         the service's own collections and columns — in a browser bundle, where
         a renamed collection would go on being printed to customers with
         nothing failing. The service stamps `source` on every drawer it serves
         now, so the table is deleted and a panel rebuilt here simply has none.
         `DrawerPanel` falls back to the global source note, which is exactly
         what it does for every other panel without one. */
    };
  }
  return out;
}

/**
 * THE NOT-CLAIMED PREVIEW'S BASE RECORD — one record, the same for everybody.
 *
 * WHY THIS EXISTS. `sampleize` rewrites a payload into a sample of itself, and
 * until now the payload it rewrote was the READER'S OWN — whichever record the
 * page had loaded for that member. It renames and it scales, but it maps over
 * the live arrays, so the shape underneath stayed the reader's: a member with
 * ten leases previewed ten, a member with 1,555 previewed 1,555, and every
 * figure was that member's own multiplied by a thousand. Two not-claimed
 * readers therefore saw two different products, and the "sample" was a
 * derivative of private data rather than a fixed illustration. Defect sheet
 * rows 51 and 54.
 *
 * WHAT IT RETURNS. The committed capture, and nothing else — no session read,
 * no `member_id`, no live blocks, no owner from the query string. `FIXTURE` is
 * a constant in the bundle, so the preview cannot vary by user, by request or
 * by what the upstream service is doing; a second reader gets byte-identical
 * content.
 *
 * WHY THE CAPTURE RATHER THAN A HAND-WRITTEN RECORD. `Payload` is forty-odd
 * blocks and every surface under the shell reads some of them; a literal would
 * be thousands of lines to maintain and would drift out of the type the moment
 * the contract moved. The capture is already static, already committed,
 * already type-checked against `Payload`, and is already what this app serves
 * when no API is configured. `sampleize` then renames and scales it exactly as
 * before, so the preview looks the way it always did — it simply no longer
 * looks different to each reader.
 *
 * IT IS NOT A CLAIMED READER'S PATH. Nothing here is reachable from the
 * claimed states: `Portal` asks for this only while the funnel is `unclaimed`,
 * and a claimed reader's own payload is untouched.
 */
export async function getSamplePayload(): Promise<Payload> {
  return FIXTURE;
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
