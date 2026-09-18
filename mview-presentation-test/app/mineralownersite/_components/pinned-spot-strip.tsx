"use client";

import { useEffect, useState } from "react";

/**
 * The spot strip in the portal shell's pinned bar — THE SAME PRICES THE TOP NAV
 * SHOWS, FROM THE SAME PLACE, ON THE SAME CLOCK.
 *
 * WHAT THIS REPLACED, AND WHY IT HAD TO GO. This strip used to be server-
 * rendered from `getSpotPrices()`, which reads `public/data/prices.json` — a
 * file the ticker build refreshes out of band. The reference shell's own strip
 * was moved onto the live endpoint, and the two then disagreed in the way a
 * reader could see in one click: the Dashboard's top nav read WTI $100.96 while
 * My Leases — reached from the Dashboard's own sidebar — read $84.38, settled
 * 20 Jul 2026. Two months stale and $16.58 out, inside one product, on a site
 * that sells data accuracy.
 *
 * THE SHARED THING IS THE SOURCE, NOT A REACT STATE, and it cannot be anything
 * else: this bar lives in the `(portal)` route group and the top nav lives in
 * `(reference)`, so moving between them is a document navigation and there is
 * no component tree, context or store spanning both. What CAN be shared is the
 * one endpoint and the one interval — `/api/prices` every 10s — which is what
 * makes the two strips agree on any given tick. Within the reference shell the
 * chrome and the prices drawer already share an actual state, in `Portal`.
 *
 * NO SEED, AND THAT IS DELIBERATE. Painting the static file first and swapping
 * it for the live figures a moment later would put a two-month-old WTI on
 * screen as though it were the price — briefly, confidently, and wrongly. The
 * rule this strip was built under is written at the top of `spot-prices.ts`:
 * FAIL CLOSED, because what it replaced was a hardcoded seed pushed through a
 * random walk that ran $15.50 wrong. A strip that is not there yet is honest; a
 * strip showing the wrong number is the defect. So nothing renders until the
 * first answer, and nothing renders at all if it never comes.
 *
 * The markup, the class names, the `data-mv-spot` hooks and the `hide-u` gate
 * are the ones this bar already had, so `portal.css` styles it exactly as
 * before — including the responsive rules that fold Brent away.
 */

/** Only the fields the strip prints; the endpoint sends more. */
type Quote = {
  key: string;
  label: string;
  display: string;
  unit: string;
  desc: string;
  as_of: string;
  as_of_iso?: string;
};

type Payload = { items?: Quote[]; basis?: string };

/** the same interval the top nav polls on — see `Portal`'s `SPOT_POLL_MS` */
const SPOT_POLL_MS = 10_000;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "2026-09-17" -> "17 Sep 2026".
 *
 * Regex-parsed rather than `new Date()`, so the date cannot slip a day for a
 * reader in a negative-offset timezone — the same reasoning, and the same
 * shape, as `formatSettlementDay` in `spot-prices.ts`.
 */
function day(iso: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return "";
  const mon = MONTHS[Number.parseInt(m[2], 10) - 1];
  return mon ? `${Number.parseInt(m[3], 10)} ${mon} ${m[1]}` : "";
}

export function PinnedSpotStrip() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let mounted = true;
    let busy = false;
    const ac = new AbortController();

    const read = async () => {
      /* NO OVERLAPPING REQUESTS, and the guard is a local so a re-run starts
         with its own clear flag — a ref outlives the effect, which breaks the
         immediate first read under React's development double-invoke. The same
         note stands over the poll in `Portal`. */
      if (busy) return;
      busy = true;
      try {
        const res = await fetch("/api/prices", {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as Payload;
        if (mounted && body?.items?.length) setData(body);
      } catch {
        /* aborted, offline or unparseable — the last good values stand, and
           if there are none yet the strip simply stays absent */
      } finally {
        busy = false;
      }
    };

    void read();
    const timer = setInterval(() => { void read(); }, SPOT_POLL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
      ac.abort();
    };
  }, []);

  const items = data?.items ?? [];
  if (!items.length) return null;

  const stamp = day(items[0].as_of);
  const basis = data?.basis ?? "";

  return (
    <div className="pin-spot">
      {items.map((q) => (
        <span
          key={q.key}
          /* Ultra's contract is two prices, so Brent folds away there — the
             calm view does not carry four numbers. Propane is not in this
             feed at all, so only Brent needs the gate now. */
          className={`pin-tk${q.key === "brent" || q.key === "propane" ? " hide-u" : ""}`}
          data-mv-spot={q.key}
          title={`${q.label} ${q.display} ${q.unit} — ${q.desc}, last trade ${q.as_of_iso ?? q.as_of}`}
        >
          <span className="sym">{q.label}</span>
          <span className="num mv-spot-val">{q.display}</span>
        </span>
      ))}
      {/* NOT Professional-only. This stamp carries the provenance, and the
          values may never appear without the label that qualifies them — so it
          shows in every density, exactly as it did before. */}
      <span className="pin-note" title={`${stamp}${basis ? ` · ${basis}` : ""}`}>
        <span className="pin-note-date">{stamp}</span>
        {basis ? <span className="pin-note-basis"> · {basis}</span> : null}
      </span>
    </div>
  );
}
