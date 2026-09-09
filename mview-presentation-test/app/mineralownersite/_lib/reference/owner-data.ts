import type { Payload } from './payload';
import raw from './owner-payload.json';

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

/**
 * The owner record both routes render.
 *
 * The selection is accepted and currently ignored, because the fixture holds
 * one owner. It is in the signature rather than added later so the call sites
 * — the two pages and three of the four API handlers — already pass what a
 * real backend needs. When they stop being ignored, no caller changes.
 */
export async function getOwnerPayload(_sel?: OwnerSelection): Promise<Payload> {
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
