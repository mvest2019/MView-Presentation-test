import 'server-only';

import type { Drawer, Payload } from './payload';
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
 *   GET /api/v1/weekly/email                            can this build send
 *   POST /api/v1/weekly/email {member_id,to}            send it
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
