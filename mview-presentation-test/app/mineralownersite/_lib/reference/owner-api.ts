import 'server-only';

import type { Payload } from './payload';

/**
 * `mineralview-api` — the four endpoints behind Alerts and Activities.
 *
 * WHAT THIS FILE IS. A typed client for `OWNER-ALERTS-ACTIVITY-API.md`, and
 * nothing else. It fetches, it decodes the error envelope, and it hands back
 * four objects. It does no formatting, no filtering and no arithmetic — every
 * figure the screens print is already formatted `en-US` by the server, and
 * rule 2 of the contract's §13 says to render those strings verbatim (an
 * Indian-locale machine turned `$4,548,479` into `$45,48,479` when a client
 * re-formatted them).
 *
 * WHY THE RESPONSES ARE NOT MAPPED. They do not need to be. The API returns
 * the reference build's own four blocks under their own names:
 *
 *   GET /alerts            ->  Payload['alerts']     + filtered_count
 *   GET /activity          ->  Payload['timeline']   + truncated, filter
 *   GET /activity/summary  ->  Payload['activities']
 *   GET /activity/rings    ->  Payload['rings']
 *
 * so each response is assigned straight into the block it belongs to and `tsc`
 * checks the whole shape at that assignment. That is the contract test: if the
 * API adds a nullable where `Payload` promised a value, or renames a field the
 * two ported views read, this file stops compiling. There is no hand-written
 * mapper to drift.
 *
 * FOUR THINGS THE CONTRACT ASKS OF A CLIENT, all of them here:
 *
 *   1  ONE SNAPSHOT, FETCHED IN ORDER. "Alerts and Activity share one
 *      snapshot. Call either one first and the other is warm. Do not fire both
 *      in parallel on a cold owner: it is the same read twice." So `/alerts`
 *      goes first and alone; the three activity reads follow together, by
 *      which point the snapshot is built.
 *
 *   2  SIXTY SECONDS, NOT TEN. A cold owner is 23-28 seconds because the
 *      appraisal roll carries no index on the owner name. "A 10-second default
 *      will abort a request that was going to succeed." Node's fetch has no
 *      default timeout, so the deadline is explicit and generous.
 *
 *   3  NO UNKNOWN PARAMETERS. They are rejected with a 400, not ignored, so
 *      nothing is appended to these URLs.
 *
 *   4  NO `refresh=1` ON ORDINARY NAVIGATION. It pays the cold cost again. The
 *      parameter is not sent at all; the server's own 15-minute reuse window
 *      is the cache.
 *
 * AND ONE IT ASKS THAT THIS CLIENT DELIBERATELY DECLINES. §9 says "send `limit`
 * for the first paint" and §14 suggests re-requesting on every filter change.
 * `ActivitiesView` is the reference's, and it filters the whole list IN THE
 * BROWSER against the eight-character sort key — its kind cards, its month
 * chart and its summary line ("133 of 893 events") are all counted off
 * `timeline.events` itself. A `limit` would not shorten that page, it would
 * make its numbers wrong. So the full list is fetched once and the server's
 * `filter` and `truncated` fields go unread, which is why `limit`, `range`,
 * `miles`, `kind` and `q` are never sent either.
 */

/* ------------------------------------------------------------- the address */

/**
 * WHERE THE API IS, and it is ON BY DEFAULT.
 *
 * `next.config.ts` declares `MINERALVIEW_API_BASE_URL` with the dev host as its
 * default, exactly as it does for `OPERATOR_API_BASE_URL`, `MAP_BASE_URL`,
 * `AUTH_API_URL` and the rest. Next inlines that at build time, so the variable
 * is always set: a fresh checkout with no `.env.local` calls the service, and so
 * does a deployment with nothing configured. Setting the variable overrides the
 * host; it is not a switch that turns the backend on.
 *
 * IT USED TO BE A SWITCH, AND THAT WAS THE BUG. Reading `process.env` here with
 * no default made these two screens the only ones in the app that needed an
 * environment variable before they would call their backend. Unset, the seam
 * served the committed capture and said nothing — which is what the deployed
 * site did for days while looking perfectly healthy.
 *
 * `null` is still possible, because the variable can be set to an empty string
 * to force the capture deliberately (useful offline, and in tests). That is now
 * an explicit choice rather than the default state.
 *
 * NOT `NEXT_PUBLIC_`, and it must not become it: this is read here, in
 * `server-only` code, so the browser never learns the address and the CORS
 * allowlist the contract mentions never has to carry a browser origin. The
 * host is not itself a secret, but the rule at the top of `.env.example` is
 * that nothing in this app's server configuration crosses into the bundle.
 */
export function apiBase(): string | null {
  const raw = process.env.MINERALVIEW_API_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

/** the contract's §3: "at least 60 seconds" on the first call */
const TIMEOUT_MS = 60_000;

/* -------------------------------------------------------------- the errors */

/**
 * The contract's one error envelope, kept as a type rather than flattened to a
 * string, because `code` is what decides what the UI may say — §4 gives a
 * different sentence and a different retryability for each.
 */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  requestId?: string;
  details?: { path: string; message: string }[];
}

export class OwnerApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: { path: string; message: string }[];
  /** §4 marks 503 and 504 retryable; a 400 or a 404 will not fix itself */
  readonly retryable: boolean;

  constructor(route: string, status: number, body?: ApiErrorBody) {
    super(body?.message ?? `${route} answered ${status}`);
    this.name = 'OwnerApiError';
    this.status = status;
    this.code = body?.code ?? (status === 0 ? 'NETWORK_ERROR' : 'HTTP_ERROR');
    this.requestId = body?.requestId;
    this.details = body?.details;
    this.retryable = status === 503 || status === 504 || status === 0;
  }
}

/* ------------------------------------------------------------- the request */

export interface OwnerQuery {
  /** the roll spelling, 3-160 chars. Required: there is no default owner. */
  owner: string;
  num?: string | number | null;
  dist?: string | null;
  /** the roll year. Accepted as a string because it arrives off a query
   *  string; anything that is not an integer is dropped rather than sent, so a
   *  typo returns the newest roll year instead of a 400. */
  year?: string | number | null;
}

/**
 * The owner parameters, and only those the contract declares.
 *
 * `owner` alone is legal and `num`/`dist` are optional, but §2 rule 2 is worth
 * repeating where the URL is built: an owner number is a county appraisal key
 * and is REUSED — `715109` is three different people in three districts — so a
 * caller that has them should always send all three. This function cannot
 * enforce that; `Chrome`'s picker supplies them from `/owners/search`.
 */
function ownerParams(q: OwnerQuery): URLSearchParams {
  const p = new URLSearchParams({ owner: q.owner });
  if (q.num != null && String(q.num).length) p.set('num', String(q.num));
  if (q.dist) p.set('dist', q.dist);
  const year = q.year == null ? NaN : Number(q.year);
  if (Number.isInteger(year)) p.set('year', String(year));
  return p;
}

async function get<T>(base: string, route: string, q: OwnerQuery): Promise<T> {
  const url = `${base}/api/v1${route}?${ownerParams(q).toString()}`;
  let res: Response;
  try {
    res = await fetch(url, {
      /* the owner comes off a query string and the server holds its own
         15-minute snapshot, so there is nothing correct for Next to cache */
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    /* a timeout, a DNS failure or a refused connection — status 0, retryable */
    throw new OwnerApiError(route, 0, {
      statusCode: 0,
      code: e instanceof Error && e.name === 'TimeoutError'
        ? 'CLIENT_TIMEOUT' : 'NETWORK_ERROR',
      message: e instanceof Error && e.name === 'TimeoutError'
        ? `${route} did not answer within ${TIMEOUT_MS / 1000}s`
        : `${route} could not be reached`,
    });
  }

  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = ((await res.json()) as { error?: ApiErrorBody }).error;
    } catch { /* a proxy's HTML 502 is not the envelope; the status carries it */ }
    throw new OwnerApiError(route, res.status, body);
  }
  return (await res.json()) as T;
}

/* ------------------------------------------------------------ the contract */

/**
 * `/alerts` is `Payload['alerts']` plus two fields this build does not read.
 *
 * `filtered_count` exists for a caller that filters SERVER-side with
 * `category`/`severity`. `AlertsView` filters in the browser off `items`, so
 * neither parameter is sent, `count === filtered_count`, and the filter chips
 * read `counts`, which is unfiltered either way.
 */
export type AlertsResponse = Payload['alerts'] & {
  filtered_count: number;
};

/** `/activity` is `Payload['timeline']` plus the server-side filter's report */
export type ActivityResponse = Payload['timeline'] & {
  truncated: boolean;
  filter: unknown;
};

/** `/activity/summary` is `Payload['activities']`, field for field */
export type ActivitySummaryResponse = Payload['activities'];

/** `/activity/rings` is `Payload['rings']`, field for field */
export type RingsResponse = Payload['rings'];

/** the four blocks, ready to merge into a `Payload` */
export interface OwnerLiveBlocks {
  alerts: Payload['alerts'];
  timeline: Payload['timeline'];
  activities: Payload['activities'];
  rings: Payload['rings'];
}

/**
 * Read one owner's Alerts and Activity blocks.
 *
 * THE ORDER IS THE CONTRACT'S, not an accident of writing. `/alerts` is
 * awaited alone so the snapshot is built once; the three activity reads then
 * go together against a warm snapshot, which is 0.2 to 0.6 seconds each.
 * Firing all four at once would start four cold builds of the same thing.
 *
 * Throws `OwnerApiError`. It does NOT fall back to anything — see the seam in
 * `owner-data.ts` for why a partial answer is refused rather than patched.
 */
export async function fetchOwnerLiveBlocks(
  base: string, q: OwnerQuery,
): Promise<OwnerLiveBlocks> {
  const alerts = await get<AlertsResponse>(base, '/alerts', q);

  const [timeline, activities, rings] = await Promise.all([
    get<ActivityResponse>(base, '/activity', q),
    get<ActivitySummaryResponse>(base, '/activity/summary', q),
    get<RingsResponse>(base, '/activity/rings', q),
  ]);

  /* Each assignment is checked against the `Payload` block it fills, which is
     the only contract test this client needs — see the header. */
  return { alerts, timeline, activities, rings };
}
