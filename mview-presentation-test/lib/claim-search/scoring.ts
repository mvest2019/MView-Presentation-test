/**
 * The prototype's v89/v90 fuzzy scorer, ported verbatim from the Find Your
 * Record handoff build: bigram (Dice) similarity blended 55/45 with query-token
 * coverage, floored at 0.85 for a substring hit and 0.9 for a prefix hit.
 * Typo-tolerant, word-order and punctuation independent. The blend weights and
 * every threshold that callers apply (0.5 lease, 0.42 statewide name, 0.34
 * county name) are the tested ones — do not tune casually.
 */

/** Uppercase with everything but A–Z0–9 removed — the exact-membership key. */
export function despace(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * The lease name without the roll's duplicate marker.
 *
 * ONE LEASE, MANY ROLL ROWS. A county roll splits a single lease across an
 * account per tract, and the export names them `SHAFTER LAKE /SAN ANDRES/
 * UNIT (1 of 17)` … `(17 of 17)`. Read literally those are seventeen leases:
 * the panel listed the same lease seventeen times, the tally counted it
 * seventeen times, and `DEANN (1 of 1)` beside `DEANN (1 of 2)` read as two
 * different leases. The marker is presentation, not identity — this strips it
 * so the panel can group the rows back into the lease they came from.
 *
 * The RAW name is still what membership is fetched by (`lkey`): the backend
 * knows the rows under their full names.
 */
export function baseLeaseName(s: string): string {
  const stripped = s.replace(/\s*\(\s*\d+\s*of\s*\d+\s*\)\s*$/i, "").trim();
  return stripped || s.trim();
}

/**
 * A record's ADDRESS IDENTITY — a short, stable, one-way token for a mailing
 * address (FNV-1a over the despaced form). `""` for no address at all.
 *
 * WHY A HASH AND NOT THE ADDRESS. A record is identified by
 * `county|name|address`, and a signed-out visitor's search no longer carries
 * the address — the proxy deletes it. Without a stand-in, two same-name
 * records in one county became the same record: React saw duplicate keys,
 * ticking one ticked both, and the merge flow could not tell them apart. The
 * proxy sends this token in the address's place, so identity survives the
 * redaction while the address itself does not.
 *
 * It is an identifier, not a secret and not a lookup: you cannot read an
 * address out of it, and the page never tries to.
 */
export function addressKey(address: string): string {
  const s = despace(address);
  if (!s) return "";
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Does this query carry anything to search for?
 *
 * `.` matched every record on the roll — punctuation alone reaches the
 * backend as a wildcard-ish pattern and comes back with the whole county.
 * A query with no letter or digit is not a query.
 */
export function hasSearchableChars(q: string): boolean {
  return /[a-z0-9]/i.test(q);
}

function toks(s: string): string[] {
  return s
    .toUpperCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);
}

function grams(s: string): Set<string> {
  const g = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2));
  return g;
}

function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return 0;
  const ga = grams(a);
  const gb = grams(b);
  let inter = 0;
  for (const k of ga) if (gb.has(k)) inter++;
  return (2 * inter) / (ga.size + gb.size);
}

/** Similarity of a query against one candidate string, 0..1. */
export function scoreText(q: string, cand: string): number {
  const Q = despace(q);
  const C = despace(cand);
  if (!Q || !C) return 0;
  let s = dice(Q, C);
  const T = toks(q);
  let cov = 0;
  for (const t of T) if (C.includes(t)) cov++;
  if (T.length) s = s * 0.55 + 0.45 * (cov / T.length);
  if (C.includes(Q)) s = Math.max(s, 0.85);
  if (C.slice(0, Q.length) === Q) s = Math.max(s, 0.9);
  return s;
}

/** Best score of a lease query against any of an owner's leases. */
export function leaseScore(leases: string[] | undefined, leaseQ: string): number {
  if (!leaseQ) return 1;
  let best = 0;
  for (const l of leases ?? []) best = Math.max(best, scoreText(leaseQ, l));
  return best;
}

/**
 * Refine-box matching: every query token must appear in the haystack, either
 * as typed or despaced (so "gasunit" still hits "Gas Unit"). Exact substring,
 * not fuzzy — refines narrow, they never guess.
 */
export function matchToks(q: string, raw: string): boolean {
  const Q = q.trim().toUpperCase();
  if (!Q) return true;
  const hay = raw.toUpperCase();
  const dhay = despace(raw);
  return Q.split(/\s+/).every((t) => {
    const dt = t.replace(/[^A-Z0-9]/g, "");
    return hay.includes(t) || (!!dt && dhay.includes(dt));
  });
}

/**
 * Which first-letter buckets a statewide query needs: the initial of each
 * alphabetic token, `"0"` when none (the build's non-letter bucket).
 */
export function firstLettersOf(q: string): string[] {
  const out: string[] = [];
  for (const t of toks(q)) {
    if (t && /[A-Z]/.test(t[0])) out.push(t[0].toLowerCase());
  }
  if (!out.length) out.push("0");
  return out;
}
