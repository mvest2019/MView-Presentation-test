import { despace, matchToks, scoreText } from "@/lib/claim-search/scoring";
import type { LeaseAgg, MergedTx, ScoredOwner } from "@/lib/claim-search/types";

/**
 * CLIENT-SIDE view algebra for the Find Your Record page: how already-fetched
 * results are filtered, linked and aggregated as the user ticks and refines.
 * Pure and synchronous — every data fetch lives behind the API in
 * `lib/claim-search/api.ts`; nothing here touches the network.
 *
 * Ported from the handoff build's v90 engine. Membership between an owner and
 * a lease is always EXACT, via despaced name within the county; fuzzy scores
 * only rank and filter.
 */

/** A lease's exact-membership key: `county|despacedLeaseName`. */
export function lkey(county: string, lease: string): string {
  return county + "|" + despace(lease);
}

/** An owner record's identity: `county|despacedName|despacedAddress`. */
export function okey(o: ScoredOwner): string {
  return o.county + "|" + despace(o.r[0]) + "|" + despace((o.r[4] as string) || "");
}

/**
 * The universe both panels draw from: the search results — unless leases are
 * ticked, in which case it is exactly the ticked leases' full membership
 * (deduped), regardless of what the search matched.
 */
export function universe(
  owners: ScoredOwner[],
  selL: Record<string, boolean>,
  memb: Record<string, ScoredOwner[]>,
): ScoredOwner[] {
  const keys = Object.keys(selL).filter((k) => selL[k]);
  if (!keys.length) return owners;
  const seen: Record<string, 1> = {};
  const out: ScoredOwner[] = [];
  for (const k of keys) {
    for (const o of memb[k] ?? []) {
      const K = okey(o);
      if (seen[K]) continue;
      seen[K] = 1;
      out.push(o);
    }
  }
  return out;
}

export interface WorkingSetFilters {
  /** County chip ("*" = all counties in results). */
  cty: string;
  /** The committed owner-name query. */
  nameQ: string;
  /** Owner refine box. */
  refine: string;
  /** Lease refine box (an owner must hold a matching lease to stay). */
  refL: string;
  selO: Record<string, boolean>;
  anyLeaseTicked: boolean;
}

/**
 * Owners that survive the current filters, with their keys.
 *
 * Two locked behaviours from the prototype: an owner-name search term
 * persists after ticking a lease (v102 — it keeps filtering the lease's
 * membership), and a ticked owner is never hidden by it, otherwise a second
 * record could never be ticked for a multi-record claim.
 */
export function workingSet(
  U: ScoredOwner[],
  f: WorkingSetFilters,
): { o: ScoredOwner; key: string }[] {
  const out: { o: ScoredOwner; key: string }[] = [];
  for (const o of U) {
    const K = okey(o);
    if (f.cty !== "*" && o.county !== f.cty) continue;
    if (
      f.nameQ &&
      !f.selO[K] &&
      f.anyLeaseTicked &&
      scoreText(f.nameQ, o.r[0]) < 0.34
    )
      continue;
    if (
      f.refine &&
      !matchToks(f.refine, o.r[0] + " " + ((o.r[4] as string) || "") + " " + o.county)
    )
      continue;
    if (f.refL) {
      const ls = (o.r[3] as string[]) ?? [];
      if (!ls.some((l) => matchToks(f.refL, l + " " + o.county))) continue;
    }
    out.push({ o, key: K });
  }
  return out;
}

/**
 * The left panel: every lease held by the given owners, aggregated —
 * owner count and appraised total are real sums over the working set.
 * The lease refine keeps ticked leases visible even when they stop matching.
 */
export function leftLeases(
  W: { o: ScoredOwner; key: string }[],
  refL: string,
  selL: Record<string, boolean>,
): LeaseAgg[] {
  const agg: Record<string, LeaseAgg> = {};
  const order: string[] = [];
  for (const w of W) {
    const seen: Record<string, 1> = {};
    for (const l of (w.o.r[3] as string[]) ?? []) {
      const k = lkey(w.o.county, l);
      if (seen[k]) continue;
      seen[k] = 1;
      if (!agg[k]) {
        agg[k] = { n: l, c: w.o.county, cnt: 0, val: 0, key: k };
        order.push(k);
      }
      agg[k].cnt++;
      agg[k].val += +w.o.r[2] || 0;
    }
  }
  let arr = order.map((k) => agg[k]);
  if (refL) arr = arr.filter((l) => selL[l.key] || matchToks(refL, l.n + " " + l.c));
  arr.sort((a, b) => b.cnt - a.cnt || (a.n < b.n ? -1 : 1));
  return arr;
}

/** Distinct leases across the whole universe — the tally's denominator. */
export function totalLeaseCount(U: ScoredOwner[]): number {
  const u: Record<string, 1> = {};
  let n = 0;
  for (const o of U) {
    for (const l of (o.r[3] as string[]) ?? []) {
      const k = lkey(o.county, l);
      if (!u[k]) {
        u[k] = 1;
        n++;
      }
    }
  }
  return n;
}

/**
 * Same name at a different address inside the universe — the claim flow's
 * merge-ask candidates, deduped by county+address.
 */
export function sameNameOthers(base: ScoredOwner, U: ScoredOwner[]): ScoredOwner[] {
  const bn = despace(base.r[0]);
  const ba = despace((base.r[4] as string) || "");
  const out: ScoredOwner[] = [];
  const seen: Record<string, 1> = {};
  for (const o of U) {
    if (o === base) continue;
    if (despace(o.r[0]) !== bn) continue;
    const a = despace((o.r[4] as string) || "");
    if (a === ba) continue;
    const k = o.county + "|" + a;
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(o);
  }
  return out;
}

/** Fold the base + merged records into the one claimed-owner payload. */
export function buildMergedTx(base: ScoredOwner, merged: ScoredOwner[]): MergedTx {
  const rows = [base, ...merged];
  const addrs: string[] = [];
  const leases: string[] = [];
  const ctyOrder: string[] = [];
  const seenA: Record<string, 1> = {};
  const seenL: Record<string, 1> = {};
  const seenC: Record<string, 1> = {};
  let props = 0;
  let value = 0;
  for (const o of rows) {
    const a = ((o.r[4] as string) || "").trim();
    if (a && !seenA[despace(a)]) {
      seenA[despace(a)] = 1;
      addrs.push(a);
    }
    props += +o.r[1] || 0;
    value += +o.r[2] || 0;
    if (!seenC[o.county]) {
      seenC[o.county] = 1;
      ctyOrder.push(o.county);
    }
    for (const l of (o.r[3] as string[]) ?? []) {
      const k = lkey(o.county, l);
      if (!seenL[k]) {
        seenL[k] = 1;
        leases.push(l);
      }
    }
  }
  return {
    owner: base.r[0],
    county: ctyOrder.join(" · "),
    props,
    value,
    leases,
    addresses: addrs,
    merged: merged.length,
    when: new Date().toISOString().slice(0, 10),
  };
}

/** `$1,234,567` — appraised values throughout the page. */
export function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** Row type the row-level components share. */
export type WorkingRow = { o: ScoredOwner; key: string };
