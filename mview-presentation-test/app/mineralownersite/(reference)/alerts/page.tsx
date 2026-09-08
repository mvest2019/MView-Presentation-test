import type { Metadata } from "next";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";

/**
 * ALERTS — `/mineralownersite/alerts`, the server half.
 *
 * PORTED FROM the reference's `src/app/alerts/page.tsx`, and the same page as
 * the Dashboard's server half with a different `route` prop. That is the
 * reference's own arrangement and its own reason: all four surfaces are views
 * of ONE owner snapshot, so they are loaded the same way and the client shell
 * switches between them without a second read. A real server page per route is
 * what makes a cold entry or a shared link work.
 *
 * THIS REPLACES the portal's own Alerts page. The two were different products
 * wearing the same sidebar: this app's version read `_lib/portal-demo-data`, a
 * hand-written record, while the bell badge beside it counted something else.
 * The reference's version reads `p.alerts`, the same array the Dashboard's
 * rollup and the Weekly Report count, so the badge, the filter row, the watch
 * ledger and the list cannot disagree — the reference's own note records that
 * they had drifted before.
 *
 * WHAT RENDERS WHEN — decided in REACT, by `Band`, not in CSS, for the reason
 * `bits.tsx` gives: the prototype's density rule needs a direct child of the
 * route section, which a component tree cannot promise.
 *
 *   ULTRA         one dot, one kicker, one headline — "one thing needs a look"
 *                 or "nothing needs you today" — the lead alert's own sentence,
 *                 one button, and the retention line: we read the record every
 *                 day, and most days there is nothing to tell you.
 *
 *   ESSENTIALS    the header with mark-all-read, the alerts-in-one-line card,
 *                 and the rows. No ledger, no search, no filters.
 *
 *   DETAILED      adds THE WATCH LEDGER — what the subscription actually buys,
 *                 counted from the same snapshot: leases and counties swept,
 *                 neighbouring leases and standing permits inside a mile,
 *                 production filings read, alerts raised, and the price said
 *                 plainly — then the search box, the category filter row, the
 *                 evidence and the delivery footer.
 *
 *   PROFESSIONAL  adds the class legend, the method note under the ledger, and
 *                 the per-row delivery class.
 *
 *   NOT CLAIMED   the claim rail and the sample badge above the whole page.
 *
 * `force-dynamic`: the owner comes off the query string, so there is nothing
 * correct to cache at the page level.
 */
export const metadata: Metadata = {
  title: "Alerts",
  description:
    "Everything that changed on your record — each alert opens the evidence behind it.",
};

export const dynamic = "force-dynamic";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const one = (k: string): string | undefined => {
    const v = q[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sel: OwnerSelection = {
    owner: one("owner") ?? null,
    num: one("num") ?? null,
    dist: one("dist") ?? null,
    year: one("year") ? Number(one("year")) : null,
  };

  let initial: Payload | null = null;
  try {
    initial = await getOwnerPayload(sel);
  } catch {
    /* the client shell retries on mount when it receives no payload, so a
       failed read shows the named loader rather than an error page */
    initial = null;
  }

  return <Portal route="alerts" initial={initial} />;
}
