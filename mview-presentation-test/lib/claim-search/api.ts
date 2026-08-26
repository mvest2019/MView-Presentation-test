import { despace } from "./scoring";
import type {
  BackendOwner,
  ClaimMeta,
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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** Backend owner → the positional row + score the view algebra works on. */
function mapOwner(o: BackendOwner): ScoredOwner {
  return {
    r: [o.name, o.leaseCount, o.appraisedValue, o.leases ?? [], o.address ?? ""],
    county: o.county,
    s: o.score ?? 1,
    leaseValues: o.leaseValues ?? undefined,
  };
}

/** Hero stats and the county dropdown — GET /owners/counties. */
export async function fetchClaimMeta(): Promise<ClaimMeta> {
  const data = await getJson<{
    total: number;
    counties: { county: string; owners: number }[];
  }>(`${OWNERS}/counties`);
  return {
    totalOwners: data.total,
    counties: data.counties.map((c) => ({ name: c.county, owners: c.owners })),
  };
}

/**
 * Ranked search — GET /owners/search. Statewide is the ABSENCE of the county
 * param: the backend 404s on a literal "*" rather than treating it as all.
 */
export async function fetchSearch(q: {
  name: string;
  lease: string;
  county: string;
}): Promise<SearchResponse> {
  const p = new URLSearchParams();
  if (q.name) p.set("name", q.name);
  if (q.lease) p.set("lease", q.lease);
  if (q.county !== "*") p.set("county", q.county);
  const data = await getJson<{ owners: BackendOwner[] }>(
    `${OWNERS}/search?${p}`,
  );
  return { owners: (data.owners ?? []).map(mapOwner) };
}

/** A lease's full membership; `lease` is the despaced lease name. */
export async function fetchLeaseOwners(
  county: string,
  lease: string,
): Promise<LeaseOwnersResponse> {
  const p = new URLSearchParams({ county, lease });
  const data = await getJson<{ owners: BackendOwner[] }>(
    `${OWNERS}/lease-owners?${p}`,
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
      return {
        r: o.r,
        county: o.county,
        key: `${o.county}|${despace(rec.name)}|${despace(rec.address ?? "")}`,
      };
    }),
  };
}

/**
 * Address correction from the record popup — POST /owners/address-correction.
 * The backend requires an identity: `member_id` when signed in or `visitorId`
 * for anonymous visitors. The claim page runs signed-out by design, so it
 * sends the site's anonymous id (the `guestUserID` cookie `proxy.ts` mints,
 * shared with the news endpoints), minting a local fallback when the cookie
 * has not been set yet. Fire-and-forget, as the prototype's was.
 */
export function postAddressCorrection(body: {
  owner: string;
  county: string;
  oldAddress: string;
  newAddress: string;
}): void {
  fetch(`${OWNERS}/address-correction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, visitorId: visitorId() }),
  }).catch(() => {});
}

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
