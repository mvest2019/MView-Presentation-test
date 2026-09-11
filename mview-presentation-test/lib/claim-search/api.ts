import { addressKey, despace } from "./scoring";
import type {
  BackendOwner,
  ClaimMeta,
  ClaimResult,
  LeaseOwnersResponse,
  SameNameResponse,
  ScoredOwner,
  SearchResponse,
} from "./types";

/**
 * The UI's ONLY data access for the Find Your Record page — typed fetchers
 * over the REAL backend (`/api/v1/owners/*` on the dev API host, live
 * 2026-08-25, CORS-open so the browser calls it directly). Each fetcher maps
 * the backend's named-field owners into the `ScoredOwner` shape the page's
 * view algebra consumes, so components see one contract regardless of who
 * serves it.
 *
 * The same-origin stand-in route handlers and the prebuilt index in
 * `public/owners/` retired when this arrived — the UI holds no search logic
 * and no data.
 */
const BASE =
  process.env.NEXT_PUBLIC_CLAIM_API_BASE_URL ||
  "https://mview-dev-api.mineralview.com";
const OWNERS = `${BASE}/api/v1/owners`;

/**
 * Where the two LIST endpoints are read from, which depends on who is asking.
 *
 * A MEMBER reads the backend directly, as the page always has: they are
 * entitled to the mailing address and the appraised value, and the direct
 * call saves a hop on a request that can take the better part of a minute.
 *
 * A SIGNED-OUT VISITOR reads them through `/api/claim/*`, which deletes those
 * fields server-side. The 🔒 bars over them used to be painted by a response
 * that carried the very values they covered; now the values never reach the
 * browser. See the route handler for what this does and does not close.
 */
function listBase(signedIn: boolean): string {
  return signedIn ? OWNERS : "/api/claim";
}

/**
 * How long one attempt may run before it is abandoned.
 *
 * THE DEV BACKEND IS SLOW ON PURPOSE-BUILT QUERIES and merely slow on others:
 * a lease like `SHAFTER LAKE /SAN ANDRES/ UNIT` has taken half a minute. With
 * no timeout at all a request that the server had already given up on left
 * the page spinning forever; with a short one, a query that WOULD have
 * answered gets killed. 45s is past the slowest measured answer and well
 * short of "the page is broken".
 */
const TIMEOUT_MS = 45_000;

/** A transport failure or a 5xx — worth one more go. A 4xx is not. */
class RetryableError extends Error {}

async function once<T>(url: string, signal?: AbortSignal): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  const onOuterAbort = () => ctl.abort();
  signal?.addEventListener("abort", onOuterAbort);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (res.status >= 500) throw new RetryableError(`${url} → ${res.status}`);
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    // An abort the CALLER asked for is not a failure to retry — it means a
    // newer search superseded this one.
    if (signal?.aborted) throw e;
    if (e instanceof RetryableError) throw e;
    if (e instanceof Error && e.name === "AbortError")
      throw new RetryableError(`${url} → timeout`);
    if (e instanceof TypeError) throw new RetryableError(`${url} → network`);
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

/**
 * ONE RETRY, THEN REPORT IT. "Search failed to load — try again." was showing
 * for single dropped connections and gateway hiccups on a backend that
 * answered perfectly on the next attempt, which read as the search being
 * broken for that lease. A 4xx is not retried: the answer will not change.
 */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  try {
    return await once<T>(url, signal);
  } catch (e) {
    if (signal?.aborted || !(e instanceof RetryableError)) throw e;
    return once<T>(url, signal);
  }
}

/** Backend owner → the positional row + score the view algebra works on. */
function mapOwner(o: BackendOwner): ScoredOwner {
  return {
    // `appraisedValue` and `address` are ABSENT for a signed-out visitor —
    // the proxy deletes them — so neither may be assumed present here. The
    // page renders the 🔒 bar in their place, never these fallbacks.
    r: [
      o.name,
      o.leaseCount,
      o.appraisedValue ?? 0,
      o.leases ?? [],
      o.address ?? "",
    ],
    county: o.county,
    s: o.score ?? 1,
    leaseValues: o.leaseValues ?? undefined,
    leaseNumbers: o.leaseNumbers ?? undefined,
    operators: o.operators ?? undefined,
    interestValues: o.interestValues ?? undefined,
    workingInterest: o.workingInterest,
    // The address when there is one, the proxy's stand-in when there is not.
    addrKey: o.address ? addressKey(o.address) : (o.addressKey ?? ""),
  };
}

/** Hero stats and the county dropdown — GET /owners/counties. */
export async function fetchClaimMeta(): Promise<ClaimMeta> {
  const data = await getJson<{
    total?: number;
    totalOwners?: number;
    counties: { county?: string; name?: string; owners: number }[];
  }>(`${OWNERS}/counties`);
  const counties = data.counties.map((c) => ({
    name: c.name ?? c.county ?? "",
    owners: c.owners,
  }));
  return {
    totalOwners:
      data.totalOwners ??
      data.total ??
      counties.reduce((sum, county) => sum + county.owners, 0),
    counties,
  };
}

/**
 * Ranked search — GET /owners/search. Statewide is the ABSENCE of the county
 * param: the backend 404s on a literal "*" rather than treating it as all.
 */
export async function fetchSearch(
  q: {
    name: string;
    lease: string;
    addr: string;
    county: string;
  },
  opts: { signedIn: boolean; signal?: AbortSignal },
): Promise<SearchResponse> {
  const p = new URLSearchParams();
  if (q.name) p.set("name", q.name);
  if (q.lease) p.set("lease", q.lease);
  if (q.county !== "*") p.set("county", q.county);
  // THE ADDRESS FILTER RUNS WHEREVER THE ADDRESS IS. A member's results carry
  // it, so their page filters locally and never re-queries for it. A
  // signed-out visitor's do not — the proxy strips it — so theirs is applied
  // by the proxy, before the strip. Same filter, one place each.
  if (!opts.signedIn && q.addr) p.set("addr", q.addr);
  const data = await getJson<{ owners: BackendOwner[] }>(
    `${listBase(opts.signedIn)}/search?${p}`,
    opts.signal,
  );
  return { owners: (data.owners ?? []).map(mapOwner) };
}

/** A lease's full membership; `lease` is the despaced lease name. */
export async function fetchLeaseOwners(
  county: string,
  lease: string,
  opts: { signedIn: boolean; signal?: AbortSignal },
): Promise<LeaseOwnersResponse> {
  const p = new URLSearchParams({ county, lease });
  const data = await getJson<{ owners: BackendOwner[] }>(
    `${listBase(opts.signedIn)}/lease-owners?${p}`,
    opts.signal,
  );
  return { owners: (data.owners ?? []).map(mapOwner) };
}

/**
 * Same-name records at other addresses in one county's full roll. The backend
 * excludes the passed `address`; the record key (`county|name|address`,
 * despaced) is built here because the view algebra owns that format.
 */
export async function fetchSameName(
  county: string,
  name: string,
  address: string,
): Promise<SameNameResponse> {
  const p = new URLSearchParams({ county, name, address });
  const data = await getJson<{ records: BackendOwner[] }>(
    `${OWNERS}/same-name?${p}`,
  );
  return {
    items: (data.records ?? []).map((rec) => {
      const o = mapOwner(rec);
      // Keyed exactly as `okey` keys a search result, so the popup can match
      // its own base record against this list — which is how a signed-out
      // visitor's record gets its address back for the "is this you?" check.
      return { ...o, key: `${o.county}|${despace(rec.name)}|${o.addrKey}` };
    }),
  };
}

/**
 * File a claim — POST /owners/claim.
 *
 * MEMBERS ONLY: the endpoint rejects a visitor id (400), so an anonymous
 * visitor must register first — the page keeps showing them the sign-up card
 * and stashes the claim for that flow instead of calling this.
 *
 * Owner NAMES are the unit of a claim; the backend resolves each name's
 * leases itself and reports per-owner outcomes, which is why this returns the
 * body rather than firing and forgetting.
 */
export async function postClaim(
  memberId: number,
  ownerNames: string[],
): Promise<ClaimResult> {
  const res = await fetch(`${OWNERS}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      member_id: memberId,
      mineralOwners: ownerNames.map((ownername) => ({ ownername })),
    }),
  });
  if (!res.ok) throw new Error(`claim → ${res.status}`);
  return res.json();
}

/**
 * Address correction from the record popup — POST /owners/address-correction.
 *
 * THE ENDPOINT WANTS EXACTLY ONE IDENTITY (backend contract, 2026-08-25):
 * `member_id` for a signed-in member, `visitorId` for an anonymous visitor.
 * Sending the visitor id for a member would file the correction against a
 * guest rather than the account, so the member id wins whenever there is one.
 *
 * `memberId` arrives as a prop from the server component: the session cookie
 * is httpOnly, so page JavaScript cannot read the id itself.
 *
 * Fire-and-forget, as the prototype's was.
 */
export function postAddressCorrection(
  body: {
    owner: string;
    county: string;
    oldAddress: string;
    newAddress: string;
  },
  memberId?: number | null,
): void {
  const identity =
    typeof memberId === "number" ? { member_id: memberId } : { visitorId: visitorId() };
  fetch(`${OWNERS}/address-correction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, ...identity }),
  }).catch(() => {});
}

/**
 * The anonymous visitor id: the site's `guestUserID` cookie (minted in
 * `proxy.ts`, shared with the news endpoints), with a local fallback for a
 * first-ever visit where that cookie has not been set yet.
 */
function visitorId(): string {
  const fromCookie = document.cookie.match(/(?:^|;\s*)guestUserID=([^;]+)/);
  if (fromCookie) return decodeURIComponent(fromCookie[1]);
  try {
    let v = localStorage.getItem("mvVisitorId");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("mvVisitorId", v);
    }
    return v;
  } catch {
    return "anonymous";
  }
}
