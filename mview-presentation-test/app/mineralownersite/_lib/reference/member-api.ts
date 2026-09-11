import 'server-only';

import type { Drawer, ForecastPayload, Payload } from './payload';
import type { WeeklyReport } from './weekly';
import { apiBase, OwnerApiError, type ApiErrorBody } from './owner-api';

/**
 * THE MEMBER-KEYED HALF OF `mineralview-api` — the Dashboard and the Weekly
 * Report.
 *
 * `owner-api.ts` beside this file reads the four Alerts/Activity blocks and
 * keys them on the ROLL OWNER NAME. These endpoints key on a `member_id`
 * instead, which is why they are a separate client rather than four more
 * functions in that one: the two halves take different identities, and pinning
 * that difference in the type is what stops a caller passing the wrong one.
 *
 *   GET /api/v1/dashboard?member_id                     17 of the 24 blocks
 *   GET /api/v1/dashboard/drawers/{key}?member_id&owner one explainer
 *   GET /api/v1/weekly?member_id                        the whole report
 *   GET /api/v1/weekly?member_id&format=html|csv|email  the three renderings
 *   GET /api/v1/weekly/history?member_id                every issue kept
 *   GET /api/v1/weekly/email                            can this build send
 *   POST /api/v1/weekly/email {member_id,to}            send it
 *   GET /api/v1/production/forecast?member_id            the whole forecast
 *   GET /api/v1/production/forecast/drawers/{key}?member_id  one explainer
 *
 * THE DRAWER PATH IS `/dashboard/drawers/{key}`, NOT `/drawers/{key}`. The
 * latter is what the task named and it answers
 * `Cannot GET /api/v1/drawers/value` — measured, not assumed.
 *
 * `server-only`: the address stays out of the bundle, exactly as
 * `owner-api.ts` explains at length. The error type is shared with that client
 * so a failure from either half reaches `Portal`'s error state by one path.
 */

/** the contract's §3 allowance, and the same 60s `owner-api.ts` uses */
const TIMEOUT_MS = 60_000;

/* ------------------------------------------------------------- the address */

/**
 * WHICH MEMBER IS NOT THIS MODULE'S BUSINESS, and it used to be.
 *
 * An earlier pass read the id from `MINERALVIEW_MEMBER_ID`. That was wrong in
 * the way that matters: an id in the environment is the SAME id for every
 * visitor, so whoever signed in saw member 4785's minerals under their own
 * name. Identity belongs to the request, not to the deployment.
 *
 * It now arrives as an argument on every call, and the only place that reads
 * it is `owner-data.ts`, from the session cookie the login flow set. This
 * module is left knowing the address and nothing about who is asking, which is
 * also what makes it testable: pass an id, get that member's record.
 */
export function memberApiBase(): string | null {
  return apiBase();
}

/* ------------------------------------------------------------- the request */

/**
 * WHY THESE CALLS ARE LOGGED, and why that is not noise.
 *
 * THEY ARE INVISIBLE IN THE BROWSER, BY DESIGN. The Dashboard and the Weekly
 * Report are server components: `getOwnerPayload` runs inside the Node
 * process, these reads are server-to-server, and the finished `Payload` is
 * serialised into the RSC flight data of the ONE document response. So the
 * Network tab shows the document and the static chunks, and no API request at
 * all — measured: zero XHR or fetch across a full Dashboard load, all four
 * personas and four detail panels. That is the reference build's own
 * arrangement too; its `page.tsx` calls `buildPayload()` the same way.
 *
 * Which left them invisible in BOTH places, because nothing logged them
 * either: the dev server printed `application-code: 5.9s` and never said what
 * the 5.9 seconds was. One line per call is what makes a server-side fetch
 * observable, and the terminal is where you look for it.
 */
function logCall(route: string, status: number | string, ms: number): void {
  /* an outbound dependency call is exactly what a server log is for, and this
     is the only record of it anywhere */
  console.info(`[mineralview-api] GET /api/v1${route} ${status} ${ms}ms`);
}

async function req(
  base: string, route: string, params: Record<string, string>,
  init?: RequestInit & { accept?: string },
): Promise<Response> {
  const qs = new URLSearchParams(params).toString();
  const url = `${base}/api/v1${route}${qs ? '?' + qs : ''}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      /* the service holds its own 15-minute snapshot, so there is nothing
         correct for Next to cache on this side of it */
      cache: 'no-store',
      headers: { accept: init?.accept ?? 'application/json', ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...init,
    });
    logCall(route, res.status, Date.now() - t0);
    return res;
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'TimeoutError';
    logCall(route, timedOut ? 'TIMEOUT' : 'UNREACHABLE', Date.now() - t0);
    /* THE CAUSE IS KEPT. `owner-api.ts` reports "could not be reached" and
       stops there; the first thing this client hit in practice was a DNS
       failure that looked identical to a refused connection, and the sentence
       alone could not tell them apart. `cause` is what `undici` puts the real
       reason in, and it is what makes the difference visible in the log and in
       `Portal`'s error state. */
    const cause = e instanceof Error
      ? (e.cause instanceof Error ? `${e.name}: ${e.cause.message}` : `${e.name}: ${e.message}`)
      : String(e);
    throw new OwnerApiError(route, 0, {
      statusCode: 0,
      code: timedOut ? 'CLIENT_TIMEOUT' : 'NETWORK_ERROR',
      message: timedOut
        ? `${route} did not answer within ${TIMEOUT_MS / 1000}s`
        : `${route} could not be reached — ${cause}`,
    });
  }
}

async function fail(route: string, res: Response): Promise<never> {
  let body: ApiErrorBody | undefined;
  try {
    body = ((await res.json()) as { error?: ApiErrorBody }).error;
  } catch { /* a proxy's HTML 502 is not the envelope; the status carries it */ }
  throw new OwnerApiError(route, res.status, body);
}

async function getJson<T>(
  base: string, route: string, params: Record<string, string>,
): Promise<T> {
  const res = await req(base, route, params);
  if (!res.ok) await fail(route, res);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------ the contract */

/**
 * `/dashboard` IS `Payload`, less the seven blocks it does not carry.
 *
 * Writing it as an `Omit` rather than a fresh interface is the contract test:
 * the response is assigned straight into the payload with no mapper, so a
 * renamed or newly-nullable field on either side stops `tsc` instead of
 * reaching a card. The seven it omits are not oversights —
 *
 *   drawers                 served per key, by the endpoint below
 *   weekly                  served by `/weekly`
 *   nearby                  NO ENDPOINT — see the seam
 *   rings, timeline         the owner-keyed half, for Alerts and Activities
 *   forecast, my_leases     Production & Forecast and My Leases
 *
 * — and the two it adds are the service's own report on itself.
 */
export type DashboardResponse = Omit<
  Payload,
  'drawers' | 'weekly' | 'nearby' | 'rings' | 'timeline' | 'forecast' | 'my_leases'
> & {
  /** sources that answered late or not at all; `[]` on a clean build */
  degraded_sources: unknown[];
  /** every explainer key the service believes it has — see the seam for the
   *  three families this splits into and why only one of them is fetched */
  drawer_keys: string[];
};

/** `{key, drawer}` — the envelope one explainer arrives in */
interface DrawerResponse {
  key: string;
  drawer: Drawer;
}

/** `?format=email` — the subject and body, and the size of the HTML it would attach */
export interface WeeklyEmailPreview {
  subject: string;
  text: string;
  html_bytes: number;
}

/** `GET /weekly/email` — whether this deployment can actually put it on the wire */
export interface WeeklyEmailCapability {
  transport: string;
  can_send: boolean;
  note: string;
}

/**
 * `GET /weekly/history` — the archive, from the endpoint that owns it.
 *
 * `/weekly` carries an `archive` of its own and it is a SHORTER LIST: measured
 * on member 4785, six rows against this endpoint's seven. The difference is
 * the current issue, which `/history` includes and flags (`current: true`)
 * while `/weekly.archive` leaves it out — so the two are the same history
 * counted from different ends, and the seam drops the current row rather than
 * letting "N issues before this one" start counting this one.
 *
 * THREE FIELDS BEYOND `WeeklyArchiveItem`, and they are typed here even though
 * the report does not draw them yet, because they are the answer to a question
 * the archive will eventually be asked: `stored` and `frozen` say whether a row
 * is the copy that was published at the time or a rebuild of that week from
 * today's record, and operators file late, so the two can differ. `note` is the
 * service's own paragraph explaining exactly that.
 */
export interface WeeklyHistoryIssue {
  week_ending_iso: string;
  week_ending_label: string;
  window_label: string;
  line: string;
  quiet: boolean;
  /** the issue this report IS — not one of the past briefings */
  current: boolean;
  /** kept as it was published, rather than rebuilt from the record now */
  stored: boolean;
  /** a stored issue that is never rewritten */
  frozen: boolean;
}

export interface WeeklyHistoryResponse {
  owner_name: string;
  weeks_kept: number;
  issues: WeeklyHistoryIssue[];
  note: string;
  built_at?: string;
}

/* ------------------------------------------------------------- the reads */

export function fetchDashboard(base: string, member: string): Promise<DashboardResponse> {
  return getJson<DashboardResponse>(base, '/dashboard', { member_id: member });
}

/**
 * One explainer, or `null` when the service has none.
 *
 * A 404 is ANSWERED, not thrown, and that distinction is the whole point of
 * this function. `DASHBOARD_DRAWER_NOT_FOUND` is a normal answer here — the
 * service advertises `lease:*` and `well:*` in `drawer_keys` and serves
 * neither, and four of the nine `alert:*` keys it advertises 404 as well. The
 * seam fills those families itself. Every other failure still throws, because
 * a timeout is not the same fact as "there is no explainer with that key".
 */
export async function fetchDrawer(
  base: string, member: string, owner: string, key: string,
): Promise<Drawer | null> {
  const route = `/dashboard/drawers/${key}`;
  const res = await req(base, route, { member_id: member, owner });
  if (res.status === 404) return null;
  if (!res.ok) await fail(route, res);
  return ((await res.json()) as DrawerResponse).drawer;
}

/**
 * The explainers the service actually serves, fetched together.
 *
 * IN PARALLEL, AND MEASURED: twenty keys took 3.0 seconds against a warm
 * snapshot, against 20 x 0.4s serially. They are prefetched rather than
 * fetched when a panel opens because `Portal` opens a drawer synchronously out
 * of `p.drawers[key]` — the reference's own arrangement — and keeping that is
 * what keeps `Portal` and `DrawerPanel` unmodified copies.
 */
export async function fetchDrawers(
  base: string, member: string, owner: string, keys: string[],
): Promise<Record<string, Drawer>> {
  const got = await Promise.all(
    keys.map(async (k) => [k, await fetchDrawer(base, member, owner, k)] as const),
  );
  const out: Record<string, Drawer> = {};
  for (const [k, d] of got) if (d) out[k] = d;
  return out;
}

/**
 * `/weekly` IS `WeeklyReport`, all thirty-nine fields of it.
 *
 * Checked against the reference's own declaration: nothing the type requires is
 * missing, and the response carries one field beyond it (`prices_note`) which
 * the report does not read. So this too is an assignment rather than a mapping.
 */
export type WeeklyResponse = WeeklyReport & { prices_note?: string };

export function fetchWeekly(base: string, member: string): Promise<WeeklyResponse> {
  return getJson<WeeklyResponse>(base, '/weekly', { member_id: member });
}

export function fetchWeeklyHistory(
  base: string, member: string,
): Promise<WeeklyHistoryResponse> {
  return getJson<WeeklyHistoryResponse>(base, '/weekly/history', { member_id: member });
}

export function fetchWeeklyEmailPreview(
  base: string, member: string,
): Promise<WeeklyEmailPreview> {
  return getJson<WeeklyEmailPreview>(base, '/weekly', { member_id: member, format: 'email' });
}

export function fetchWeeklyEmailCapability(base: string): Promise<WeeklyEmailCapability> {
  return getJson<WeeklyEmailCapability>(base, '/weekly/email', {});
}

/**
 * The two downloads, passed through as bytes.
 *
 * The body is returned untouched with the service's own `content-type` and
 * `content-disposition`, because the point of a download is that the file is
 * the service's file. Re-rendering it here would be a second implementation of
 * the report with nothing keeping the two in step.
 */
export async function fetchWeeklyFile(
  base: string, member: string, format: 'html' | 'csv', dl: boolean,
): Promise<Response> {
  const params: Record<string, string> = { member_id: member, format };
  if (dl) params.dl = '1';
  const res = await req(base, '/weekly', params, { accept: '*/*' });
  if (!res.ok) await fail('/weekly', res);
  return res;
}

/* -------------------------------------------------- production & forecast */

/**
 * `/production/forecast` IS `ForecastPayload`, all eighteen blocks of it.
 *
 * The same arrangement as `/dashboard` above, and for the same reason: the
 * response is assigned straight into `Payload.forecast` with no mapper, so the
 * intersection below is the contract test. A renamed or newly-nullable field
 * on either side stops `tsc` at the assignment in `owner-data.ts` instead of
 * reaching the chart.
 *
 * CHECKED AGAINST THE CAPTURE, BLOCK BY BLOCK, rather than assumed: every one
 * of `ForecastPayload`'s keys is present, none is extra, and the only shape
 * differences across all 202 months and 13 leases are `removed`/`removed_pct`
 * arriving `null` on unfiled months — which the type already declares nullable
 * — and a `tone` on `insights`/`stats`, which `ForecastStat` already declares
 * optional. So this needed no widening anywhere.
 *
 * The three fields it adds beyond the payload are the service's own report on
 * itself, exactly as `DashboardResponse` carries them.
 */
export type ForecastResponse = ForecastPayload & {
  /** sources that answered late or not at all; `[]` on a clean build */
  degraded_sources: unknown[];
  /** the twelve `pf_*` explainer keys this page's cards open */
  drawer_keys: string[];
  built_at: string;
};

export function fetchForecast(base: string, member: string): Promise<ForecastResponse> {
  return getJson<ForecastResponse>(base, '/production/forecast', { member_id: member });
}

/**
 * One Production & Forecast explainer, or `null` when the service has none.
 *
 * A SEPARATE FUNCTION FROM `fetchDrawer` ABOVE, because it is a different
 * endpoint with a different parameter list — `/production/forecast/drawers/…`
 * rather than `/dashboard/drawers/…`, and it takes NO `owner`. That is not a
 * guess: all twelve keys answer 200 on `member_id` alone, and the forecast is
 * the whole member's record rather than one of the roll owners the dashboard
 * picks between, so there is no owner for it to disambiguate.
 *
 * The 404 is answered rather than thrown for the same reason it is on the
 * dashboard half: "there is no explainer with that key" is a normal answer and
 * a timeout is not.
 */
export async function fetchForecastDrawer(
  base: string, member: string, key: string,
): Promise<Drawer | null> {
  const route = `/production/forecast/drawers/${key}`;
  const res = await req(base, route, { member_id: member });
  if (res.status === 404) return null;
  if (!res.ok) await fail(route, res);
  return ((await res.json()) as DrawerResponse).drawer;
}

/**
 * All twelve, in parallel, and prefetched for the same reason the dashboard's
 * eleven are: `ProductionView` opens a panel synchronously out of
 * `p.drawers[key]` — six insight cards and six figures in the life-of-the-record
 * row, each `onClick={() => open(st.key)}` — so a key that is not already in
 * the payload is a control that does nothing at all, silently, because
 * `DrawerPanel` hides itself when its copy is null.
 *
 * Measured: twelve keys in 0.6s against a warm snapshot, which is inside the
 * `/dashboard` read they run beside.
 */
export async function fetchForecastDrawers(
  base: string, member: string, keys: string[],
): Promise<Record<string, Drawer>> {
  const got = await Promise.all(
    keys.map(async (k) => [k, await fetchForecastDrawer(base, member, k)] as const),
  );
  const out: Record<string, Drawer> = {};
  for (const [k, d] of got) if (d) out[k] = d;
  return out;
}

/**
 * THE ROLL SEARCH BEHIND THE CHROME'S OWNER PICKER.
 *
 * `GET /api/v1/owners/search?q=` — 111 rows for "bridwell", so this is the
 * whole appraisal roll rather than the one owner the committed capture holds.
 *
 * WHAT IT DOES NOT RETURN, and it matters to the caller: there is no
 * `ownernumber`, no `districtcode` and no roll `year` on a row. The reference's
 * picker prints "owner N · district D" under each name and hands all three to
 * the payload read, because — as `owner-api.ts` sets out at length — an owner
 * number is a county appraisal key and is REUSED across districts. Name alone
 * is therefore an ambiguous identity, and the seam is what decides what to do
 * about that. This function reports what the service sends and invents nothing.
 */
export interface OwnerSearchRow {
  name: string;
  county: string | null;
  leaseCount: number | null;
  appraisedValue: number | null;
  address: string | null;
  workingInterest: boolean | null;
}

export interface OwnerSearchResponse {
  view: string;
  total: number;
  truncated: boolean;
  page?: number;
  limit?: number;
  owners: OwnerSearchRow[];
}

export function searchRoll(
  base: string, q: string, limit: number,
): Promise<OwnerSearchResponse> {
  return getJson<OwnerSearchResponse>(base, '/owners/search', {
    q, limit: String(limit),
  });
}

/** `POST /weekly/email {member_id, to}` */
export async function sendWeeklyEmail(
  base: string, member: string, to: string,
): Promise<unknown> {
  const res = await req(base, '/weekly/email', {}, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ member_id: Number(member), to }),
  });
  if (!res.ok) await fail('/weekly/email', res);
  return await res.json();
}
