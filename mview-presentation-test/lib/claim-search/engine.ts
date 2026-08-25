import { despace, firstLettersOf, leaseScore, scoreText } from "./scoring";
import type {
  BucketRow,
  ClaimMeta,
  CountyChunk,
  Manifest,
  OwnerRow,
  ScoredOwner,
} from "./types";

/**
 * SERVER-SIDE search engine behind the `/api/claim/*` route handlers — the
 * stand-in for the real backend. The four strategies are the handoff build's
 * v90 engine, unchanged; only where the data lives differs: the routes read
 * the prebuilt index in `public/owners/` by fetching it from this deployment's
 * own static origin (works identically under `next dev` and on Vercel, where
 * route handlers cannot fs-read `public/`). When the backend team ships real
 * endpoints for the contract in `types.ts`, this whole file retires.
 *
 * Caches hold promises, not values, so concurrent requests for one county
 * fetch once per server instance; chunks are content-stable between builds.
 */

let manifestPromise: Promise<Manifest> | null = null;
const chunkCache = new Map<string, Promise<CountyChunk>>();
const bucketCache = new Map<string, Promise<BucketRow[]>>();

/** Cap every strategy shares: at most 500 owners reach the UI. */
const MAX_OWNERS = 500;

function loadManifest(origin: string): Promise<Manifest> {
  manifestPromise ??= fetch(`${origin}/owners/manifest.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`manifest ${r.status}`);
      return r.json();
    })
    .catch((e) => {
      manifestPromise = null; // don't cache the failure
      throw e;
    });
  return manifestPromise;
}

function loadCounty(origin: string, man: Manifest, county: string): Promise<CountyChunk> {
  let p = chunkCache.get(county);
  if (!p) {
    p = fetch(`${origin}/owners/${man[county].f}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`county ${county} ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        chunkCache.delete(county);
        throw e;
      });
    chunkCache.set(county, p);
  }
  return p;
}

/** At most four first-letter buckets; a missing bucket is empty, not fatal. */
function loadBuckets(
  origin: string,
  prefix: "name" | "lease",
  letters: string[],
): Promise<BucketRow[]> {
  const unique = [...new Set(letters)].slice(0, 4);
  return Promise.all(
    unique.map((l) => {
      const key = `${prefix}_${l}`;
      let p = bucketCache.get(key);
      if (!p) {
        p = fetch(`${origin}/owners/${key}.json`)
          .then((r) => (r.ok ? (r.json() as Promise<BucketRow[]>) : []))
          .catch(() => [] as BucketRow[]);
        bucketCache.set(key, p);
      }
      return p;
    }),
  ).then((lists) => lists.flat());
}

/* ---------- the four endpoints' implementations ---------- */

/** Hero stats + county dropdown. */
export async function getMeta(origin: string): Promise<ClaimMeta> {
  const man = await loadManifest(origin);
  const counties = Object.keys(man)
    .sort()
    .map((name) => ({ name, owners: man[name].n }));
  return {
    totalOwners: counties.reduce((t, c) => t + c.owners, 0),
    counties,
  };
}

export interface SearchQuery {
  name: string;
  lease: string;
  county: string; // "*" = statewide
}

/** Dispatch exactly as the prototype's `doSearch` does. */
export async function runSearch(origin: string, q: SearchQuery): Promise<ScoredOwner[]> {
  const man = await loadManifest(origin);
  if (q.lease) return leaseAnchored(origin, man, q);
  if (q.county !== "*") {
    return q.name ? countyOnly(origin, man, q) : countyBrowse(origin, man, q.county);
  }
  return nameStatewide(origin, man, q.name);
}

/** County picked with no name/lease — browse that county's roll, top first. */
async function countyBrowse(
  origin: string,
  man: Manifest,
  county: string,
): Promise<ScoredOwner[]> {
  if (!man[county]) return [];
  const d = await loadCounty(origin, man, county);
  return d.owners.slice(0, MAX_OWNERS).map((r) => ({ r, county: d.county, s: 0 }));
}

/** Name within one county — full chunk, fuzzy-scored, 0.34 floor. */
async function countyOnly(
  origin: string,
  man: Manifest,
  q: SearchQuery,
): Promise<ScoredOwner[]> {
  if (!man[q.county]) return [];
  const d = await loadCounty(origin, man, q.county);
  const owners: ScoredOwner[] = [];
  for (const r of d.owners) {
    const s = scoreText(q.name, r[0]);
    if (s >= 0.34) owners.push({ r, county: d.county, s });
  }
  owners.sort((a, b) => b.s - a.s);
  return owners.slice(0, MAX_OWNERS);
}

/**
 * Name statewide — score the first-letter buckets, keep the top 200 names at
 * a 0.42 floor, then load (at most 18) counties those names live in and pull
 * the exact rows.
 */
async function nameStatewide(
  origin: string,
  man: Manifest,
  name: string,
): Promise<ScoredOwner[]> {
  const rows = await loadBuckets(origin, "name", firstLettersOf(name));
  const scored = rows
    .map((p) => ({ n: p[0], c: p[1], s: scoreText(name, p[0]) }))
    .filter((x) => x.s >= 0.42)
    .sort((a, b) => b.s - a.s)
    .slice(0, 200);
  const byCounty: Record<string, Record<string, 1>> = {};
  for (const p of scored) (byCounty[p.c] ??= {})[p.n] = 1;
  const counties = Object.keys(byCounty).slice(0, 18);
  const chunks = await Promise.all(
    counties.map((c) => (man[c] ? loadCounty(origin, man, c) : Promise.resolve(null))),
  );
  const owners: ScoredOwner[] = [];
  for (const d of chunks) {
    if (!d) continue;
    const set = byCounty[d.county] ?? {};
    for (const r of d.owners) {
      if (set[r[0]]) owners.push({ r, county: d.county, s: scoreText(name, r[0]) });
    }
  }
  owners.sort((a, b) => b.s - a.s);
  return owners.slice(0, MAX_OWNERS);
}

/**
 * Lease word given — anchor on leases (county chunk or statewide lease
 * buckets, 0.5 floor, top 60), then rank every owner in those leases'
 * counties by 0.6·name + 0.4·lease. A name query filters at 0.34 as well.
 */
async function leaseAnchored(
  origin: string,
  man: Manifest,
  q: SearchQuery,
): Promise<ScoredOwner[]> {
  let leases: { n: string; c: string; s: number }[];
  if (q.county !== "*") {
    if (!man[q.county]) return [];
    const d = await loadCounty(origin, man, q.county);
    const seen: Record<string, 1> = {};
    leases = [];
    for (const r of d.owners) {
      for (const l of (r[3] as string[]) ?? []) {
        const k = despace(l);
        if (seen[k]) continue;
        const s = scoreText(q.lease, l);
        if (s >= 0.5) {
          seen[k] = 1;
          leases.push({ n: l, c: d.county, s });
        }
      }
    }
  } else {
    const rows = await loadBuckets(origin, "lease", firstLettersOf(q.lease));
    leases = rows
      .map((x) => ({ n: x[0], c: x[1], s: scoreText(q.lease, x[0]) }))
      .filter((x) => x.s >= 0.5);
  }
  leases.sort((a, b) => b.s - a.s);
  leases = leases.slice(0, 60);
  const counties = [...new Set(leases.map((l) => l.c))].slice(0, 18);
  const chunks = await Promise.all(
    counties.map((c) => (man[c] ? loadCounty(origin, man, c) : Promise.resolve(null))),
  );
  const owners: ScoredOwner[] = [];
  for (const d of chunks) {
    if (!d) continue;
    for (const r of d.owners) {
      const ls = leaseScore(r[3] as string[], q.lease);
      if (ls < 0.5 && !r[5]) continue;
      const ns = q.name ? scoreText(q.name, r[0]) : 0.6;
      if (q.name && ns < 0.34) continue;
      owners.push({ r, county: d.county, s: ns * 0.6 + ls * 0.4 });
    }
  }
  owners.sort((a, b) => b.s - a.s);
  return owners.slice(0, MAX_OWNERS);
}

/**
 * A lease's FULL membership from its county roll — exact despaced-name match
 * only (`lease` arrives already despaced); fuzzy scoring never links an owner
 * to a lease.
 */
export async function getLeaseOwners(
  origin: string,
  county: string,
  lease: string,
): Promise<ScoredOwner[]> {
  const man = await loadManifest(origin);
  if (!man[county]) return [];
  const d = await loadCounty(origin, man, county);
  const out: ScoredOwner[] = [];
  for (const r of d.owners) {
    const ls = (r[3] as string[]) ?? [];
    if (ls.some((l) => despace(l) === lease)) out.push({ r, county: d.county, s: 1 });
  }
  return out;
}

/**
 * Same despaced name at other addresses in one county's FULL roll, deduped by
 * address — the "Is this you?" popup's candidates. `address` is the picked
 * record's address, excluded from the result.
 */
export async function getSameName(
  origin: string,
  county: string,
  name: string,
  address: string,
): Promise<{ r: OwnerRow; county: string; key: string }[]> {
  const man = await loadManifest(origin);
  if (!man[county]) return [];
  const d = await loadCounty(origin, man, county);
  const bn = despace(name);
  const seen: Record<string, 1> = { [despace(address)]: 1 };
  const items: { r: OwnerRow; county: string; key: string }[] = [];
  for (const r of d.owners) {
    if (despace(r[0]) !== bn) continue;
    const a = despace((r[4] as string) || "");
    if (seen[a]) continue;
    seen[a] = 1;
    items.push({ r, county: d.county, key: `${d.county}|${bn}|${a}` });
  }
  return items;
}
