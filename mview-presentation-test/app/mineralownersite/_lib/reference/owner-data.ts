import type { Alert, Drawer, Payload } from './payload';
import raw from './owner-payload.json';
import { apiBase, fetchOwnerLiveBlocks, OwnerApiError } from './owner-api';

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
const FIXTURE = raw as unknown as Payload;

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
 * module exists. `mineralview-api` serves four of the record's blocks and no
 * more (`OWNER-ALERTS-ACTIVITY-API.md`, §1), so:
 *
 *   alerts · timeline · activities · rings     the API, when configured
 *   everything else                            the committed capture
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

  const live = await fetchOwnerLiveBlocks(base, {
    owner,
    num: sel?.num ?? (isDefault ? FIXTURE.owner.ownernumber : null),
    dist: sel?.dist ?? (isDefault ? FIXTURE.owner.districtcode : null),
    year: sel?.year ?? null,
  });

  /* `live` is four whole blocks, each already checked against its `Payload`
     member by `owner-api.ts`, so this is a replace and not a deep merge. A
     deep merge would be the bug: it would let a field the API stopped sending
     be back-filled from a capture taken on a different day. */
  return {
    ...FIXTURE,
    ...live,
    activities: { ...live.activities, nearby: trimNearby(live.activities.nearby) },
    drawers: withAlertDrawers(FIXTURE.drawers, live.alerts.items),
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
 * What differs is only the corpus: the reference scans 4.5M appraisal-roll rows
 * and this holds one owner, so a query either matches that owner or misses.
 * The MATCHING RULE is the reference's — exact on the whole name first, then
 * the prefix widen.
 */
export async function searchOwners(
  query: string, limit = 25,
): Promise<OwnerSearchResult> {
  const q = query.trim();
  const o = FIXTURE.owner;
  const year = o.roll_year;

  if (q.length < 3) {
    return {
      query: q, mode: 'exact', widened_to_prefix: false, year, count: 0, results: [],
      note: 'Type at least three characters — a name search reads the whole roll.',
    };
  }

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
  /* the reference's single widen: an exact miss retries as a prefix and the
     note says that is what happened */
  if (name.startsWith(needle)) {
    return {
      query: q, mode: 'starts', widened_to_prefix: true, year, count: 1,
      results: [hit].slice(0, limit),
    };
  }
  return { query: q, mode: 'exact', widened_to_prefix: false, year, count: 0, results: [] };
}
