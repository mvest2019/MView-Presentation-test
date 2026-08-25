import type {
  ClaimMeta,
  LeaseOwnersResponse,
  SameNameResponse,
  SearchResponse,
} from "./types";

/**
 * The UI's ONLY data access for the Find Your Record page — four typed
 * fetchers over the contract in `types.ts`. Components never touch the index
 * or the engine; when the backend team ships the real endpoints, set
 * `NEXT_PUBLIC_CLAIM_API_BASE_URL` to their host and the page is served by
 * them with no component changes.
 *
 * Empty default = same-origin: the stand-in Next route handlers under
 * `app/api/claim/`.
 */
const BASE = process.env.NEXT_PUBLIC_CLAIM_API_BASE_URL || "";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

/** Hero stats and the county dropdown. */
export function fetchClaimMeta(): Promise<ClaimMeta> {
  return getJson<ClaimMeta>("/api/claim/meta");
}

/** Ranked search — statewide or county-scoped, name- or lease-anchored. */
export function fetchSearch(q: {
  name: string;
  lease: string;
  county: string;
}): Promise<SearchResponse> {
  const p = new URLSearchParams();
  if (q.name) p.set("name", q.name);
  if (q.lease) p.set("lease", q.lease);
  if (q.county !== "*") p.set("county", q.county);
  else p.set("county", "*");
  return getJson<SearchResponse>(`/api/claim/search?${p}`);
}

/** A lease's full membership; `lease` is the despaced lease name. */
export function fetchLeaseOwners(
  county: string,
  lease: string,
): Promise<LeaseOwnersResponse> {
  const p = new URLSearchParams({ county, lease });
  return getJson<LeaseOwnersResponse>(`/api/claim/lease-owners?${p}`);
}

/** Same-name records at other addresses in one county's full roll. */
export function fetchSameName(
  county: string,
  name: string,
  address: string,
): Promise<SameNameResponse> {
  const p = new URLSearchParams({ county, name, address });
  return getJson<SameNameResponse>(`/api/claim/same-name?${p}`);
}

/** Fire-and-forget address correction from the record popup. */
export function postAddressCorrection(body: {
  owner: string;
  county: string;
  oldAddress: string;
  newAddress: string;
}): void {
  fetch(`${BASE}/api/address-correction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
