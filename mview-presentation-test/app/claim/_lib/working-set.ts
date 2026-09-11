import {
  baseLeaseName,
  despace,
  matchToks,
  scoreText,
} from "@/lib/claim-search/scoring";
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

/**
 * A lease's identity: `county|despacedBaseLeaseName` — the name with the
 * roll's `(3 of 17)` marker stripped.
 *
 * THE MARKER IS NOT PART OF THE NAME, AND THE BACKEND AGREES (verified
 * 2026-09-11). `GET /owners/lease-owners?county=Andrews&lease=` answers
 * `SHAFTERLAKESANANDRESUNIT` with all 508 owners and
 * `SHAFTERLAKESANANDRESUNIT1OF11` with **zero**. Keying on the raw name
 * therefore did two things at once: it listed one lease as eighteen rows, and
 * ticking any of them fetched an empty membership — which is what put "No
 * leases in this set" in one panel and "No owner matches these filters" in
 * the other. One key, on the base name, fixes both: the panel groups the rows
 * and the tick asks for a lease the backend knows.
 */
export function lkey(county: string, lease: string): string {
  return county + "|" + despace(baseLeaseName(lease));
}

/**
 * An owner record's identity: `county|despacedName|addressKey`.
 *
 * THE THIRD PART IS THE ADDRESS'S TOKEN, NOT THE ADDRESS (2026-09-11). A
 * signed-out visitor's results carry no address — the proxy withholds it — so
 * keying on the address directly turned every same-name record in a county
 * into one record: duplicate React keys, one tick selecting several rows, and
 * a merge flow with nothing to merge. `addrKey` is derived from the address
 * when there is one and served by the proxy when there is not, so one format
 * covers both.
 */
export function okey(o: ScoredOwner): string {
  return o.county + "|" + despace(o.r[0]) + "|" + o.addrKey;
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
  // A ticked lease whose membership has not arrived contributes nothing, and
  // if NONE of them have arrived the universe stays the search results.
  // Emptying it instead put "No leases in this set" in one panel and "No
  // owner matches these filters" in the other the moment a lease was ticked —
  // two "nothing found" messages for a set that was merely still loading.
  const keys = Object.keys(selL).filter((k) => selL[k] && memb[k]);
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
  /**
   * The committed ADDRESS query — its own filter, not the refine box.
   *
   * The backend's `/owners/search` takes no address parameter, so the filter
   * has to run here. It used to be poured into the refine box instead, which
   * had two costs: it overwrote whatever the visitor had typed there (so
   * refining by "kenedy" and then touching any filter silently dropped it),
   * and an address on its own filtered nothing at all because the box also
   * matches the name and the county.
   */
  addrQ: string;
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
    // The address filter reads the ADDRESS COLUMN ONLY. Widened to the name
    // and county (as the refine box is) a ZIP would match a lease number in a
    // name and "po box" would match nothing it should, which is why an
    // address appeared to do nothing at all.
    if (f.addrQ && !f.selO[K] && !matchToks(f.addrQ, (o.r[4] as string) || ""))
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
  const rollNames: Record<string, Set<string>> = {};
  for (const w of W) {
    const leases = (w.o.r[3] as string[]) ?? [];
    // An owner counts ONCE per lease, however many roll rows that lease has
    // under them — `(1 of 17)` … `(17 of 17)` is one lease, one owner.
    const countedHere: Record<string, 1> = {};
    leases.forEach((l, i) => {
      const g = lkey(w.o.county, l);
      if (!agg[g]) {
        agg[g] = {
          n: baseLeaseName(l),
          c: w.o.county,
          cnt: 0,
          val: 0,
          partial: false,
          rolls: 0,
          key: g,
        };
        order.push(g);
        rollNames[g] = new Set();
      }
      rollNames[g].add(l);
      if (!countedHere[g]) {
        countedHere[g] = 1;
        agg[g].cnt++;
      }
      // THIS LEASE'S value, from the API's index-aligned `leaseValues`. The
      // record total is only right for a single-lease owner; for anyone else
      // adding it here counted their whole portfolio against every lease
      // they hold, which is exactly the figure that disagreed with the lease
      // details modal.
      const per = w.o.leaseValues?.[i];
      if (typeof per === "number") agg[g].val += per;
      else if (leases.length === 1) agg[g].val += +w.o.r[2] || 0;
      else agg[g].partial = true;
    });
  }
  for (const k of order) agg[k].rolls = rollNames[k].size;
  let arr = order.map((k) => agg[k]);
  if (refL)
    arr = arr.filter((l) => selL[l.key] || matchToks(refL, l.n + " " + l.c));
  arr.sort((a, b) => b.cnt - a.cnt || (a.n < b.n ? -1 : 1));
  return arr;
}

/**
 * Distinct leases across the whole universe — the tally's denominator.
 * Counted by GROUP, like the panel, so the two numbers agree: counting raw
 * roll rows here while the panel showed groups was one half of the "41 leases
 * listed, 42 properties" mismatch.
 */
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
 * How many leases a record actually holds.
 *
 * DERIVED, NOT READ OFF `leaseCount` (2026-09-11). The backend's count is a
 * count of ROLL ROWS, and the two endpoints disagree about what a row is:
 * `/owners/search` sent 42 for a record whose lease list held 41 distinct
 * leases, and ticking a lease — which re-reads the same owner through
 * `/owners/lease-owners` — turned "1 property" into "10". Both endpoints send
 * the lease list itself, so counting that gives one number that matches the
 * lease panel beside it and does not move when the record is re-fetched.
 *
 * The served count is still the fallback for a record that arrives with no
 * lease list at all.
 */
export function propCount(o: Pick<ScoredOwner, "r" | "county">): number {
  const leases = (o.r[3] as string[]) ?? [];
  if (!leases.length) return +o.r[1] || 0;
  const seen: Record<string, 1> = {};
  let n = 0;
  for (const l of leases) {
    const k = lkey(o.county, l);
    if (!seen[k]) {
      seen[k] = 1;
      n++;
    }
  }
  return n;
}

/**
 * Best fuzzy score of a lease query against any lease an owner holds, on the
 * BASE names — `MABEE 240A` should not score against the marker digits in
 * `MABEE 240 (3 of 9)`.
 */
export function ownerLeaseScore(o: ScoredOwner, leaseQ: string): number {
  if (!leaseQ) return 1;
  let best = 0;
  for (const l of (o.r[3] as string[]) ?? [])
    best = Math.max(best, scoreText(leaseQ, baseLeaseName(l)));
  return best;
}

/**
 * Put the closest matches first.
 *
 * THE BACKEND RANKS LOOSELY. `MABEE 240A` came back with the same 801 owners
 * as `MABEE` — the extra token narrowed nothing — and `TITAN GAS UNIT` pushed
 * leases matching only `TITAN` above the unit that was typed in full. Both
 * halves of the fix live here: owners whose best lease is not a real match
 * for a MULTI-TOKEN lease query are dropped (a single token stays loose, so
 * `HALL` still browses), and what survives is ordered by how well it matches
 * rather than by the order it arrived in.
 *
 * Ticked owners are never dropped — a ticked record must stay tickable.
 */
export function rankOwners(
  W: WorkingRow[],
  q: { name: string; lease: string },
  selO: Record<string, boolean>,
): WorkingRow[] {
  if (!q.lease && !q.name) return W;
  const leaseToks = q.lease.trim().split(/\s+/).filter(Boolean);
  const strictLease = leaseToks.length > 1;
  const scored = W.map((w) => {
    const ls = ownerLeaseScore(w.o, q.lease);
    const ns = q.name ? scoreText(q.name, w.o.r[0]) : 1;
    // EVERY TYPED WORD HAS TO APPEAR SOMEWHERE. A fuzzy threshold is not
    // enough for this: `TITAN GAS UNIT` scores 0.6 against `DINO GAS UNIT` on
    // the shared words alone, which is how a search for one named unit came
    // back with every gas unit in the county. Token coverage asks the
    // question the visitor asked — is this the lease I typed?
    const hasAll = ((w.o.r[3] as string[]) ?? []).some((l) =>
      matchToks(q.lease, baseLeaseName(l)),
    );
    return { w, rank: Math.min(ls, ns), hasAll };
  });
  const kept = strictLease
    ? scored.filter((s) => selO[s.w.key] || s.hasAll)
    : scored;
  // Never filter the panel down to nothing on a judgement call: if the strict
  // pass rejected everything, the loose ranking is still better than an empty
  // page telling the visitor there are no records when the API sent some.
  const base = kept.length ? kept : scored;
  return base
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => b.rank - a.rank || a.i - b.i)
    .map((s) => s.w);
}

/**
 * Same name at a different address inside the universe — the claim flow's
 * merge-ask candidates, deduped by county+address.
 */
export function sameNameOthers(base: ScoredOwner, U: ScoredOwner[]): ScoredOwner[] {
  const bn = despace(base.r[0]);
  const ba = base.addrKey;
  const out: ScoredOwner[] = [];
  const seen: Record<string, 1> = {};
  for (const o of U) {
    if (o === base) continue;
    if (despace(o.r[0]) !== bn) continue;
    // Compared by address TOKEN, for the reason `okey` gives.
    const a = o.addrKey;
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
  const names: string[] = [];
  const seenN: Record<string, 1> = {};
  const seenA: Record<string, 1> = {};
  const seenL: Record<string, 1> = {};
  const seenC: Record<string, 1> = {};
  let props = 0;
  let value = 0;
  for (const o of rows) {
    if (!seenN[despace(o.r[0])]) {
      seenN[despace(o.r[0])] = 1;
      names.push(o.r[0]);
    }
    const a = ((o.r[4] as string) || "").trim();
    if (a && !seenA[despace(a)]) {
      seenA[despace(a)] = 1;
      addrs.push(a);
    }
    // Derived, like the table — see `propCount`.
    props += propCount(o);
    value += +o.r[2] || 0;
    if (!seenC[o.county]) {
      seenC[o.county] = 1;
      ctyOrder.push(o.county);
    }
    for (const l of (o.r[3] as string[]) ?? []) {
      // Grouped, so a lease split into seventeen roll rows is one lease in
      // the claim summary rather than seventeen near-identical lines.
      const k = lkey(o.county, l);
      if (!seenL[k]) {
        seenL[k] = 1;
        leases.push(baseLeaseName(l));
      }
    }
  }
  return {
    owner: base.r[0],
    owners: names,
    records: rows.length,
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
