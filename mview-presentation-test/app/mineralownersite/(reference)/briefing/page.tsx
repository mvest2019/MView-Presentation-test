import type { Metadata } from "next";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";

/**
 * THE WEEKLY REPORT — `/mineralownersite/briefing`, the server half.
 *
 * PORTED FROM the reference's `src/app/weekly/page.tsx`. It is the same page as
 * the Dashboard's server half with a different `route` prop, which is the
 * reference's own arrangement: both surfaces are views of ONE owner snapshot,
 * so they are loaded the same way and the client shell switches between them
 * without a second read.
 *
 * THE PATH IS THIS APP'S. The reference serves it at `/weekly`; this app's
 * sidebar, tab bar and `_lib/portal-nav.ts` have always pointed the Weekly
 * Report row at `/mineralownersite/briefing`, so that is where it stays.
 * Renaming the URL would have changed a link on pages outside this work.
 *
 * WHAT THE REPORT CONTAINS — every section the reference ships, in its order:
 *
 *   the claim rail            not-claimed only: "Claim your record to get this
 *                             every Saturday", with the whole report still
 *                             readable behind it
 *   the ultra hero            Ultra only: week ending, one verdict, one button
 *   title + four actions      Print / Save as PDF · Email me this report ·
 *                             Download the report · The filings (CSV)
 *   the page rail             seven real anchors — Cover, Money, Activity &
 *                             map, Prices, What to watch, Monthly, Archive —
 *                             each with its mark, subtitle and minute count
 *   the promise               the Saturday-with-coffee note
 *   the mailer                expands from "Email me this report": address,
 *                             transport-aware button, and on no transport the
 *                             rendered message with mailto / copy / download
 *   PAGE 1 · cover            the four answers as cards with Page N → links,
 *                             the two-things-first notice, three filing KPIs
 *   Essentials evidence card  where the five evidence pages live, shown only
 *                             in the Essentials view
 *   PAGE 2 · the money        four KPIs, all-leases table ranked by drift from
 *                             expected, the depth KPIs, the explainer, the
 *                             owner-share trend charts, the same months at
 *                             your interest, the posted-volume bar chart
 *   PAGE 3 · activity & map   four clickable KPIs, the explainer, the measured
 *                             five-mile map with its ring labels and key, two
 *                             more KPIs, every filing dated inside the week
 *   PAGE 4 · the prices       four price boxes with week-on-week moves, the
 *                             drivers each with a public source chip, the
 *                             where-your-estimate-lives bar chart
 *   PAGE 5 · what to watch    the next-statement estimate band with its range
 *                             bar, three things to watch, the dated calendar,
 *                             what would change this picture, the quiet-week
 *                             note, and where every figure came from
 *   the monthly keeper        the closed month, estimate against actual
 *   the archive               every issue kept, active or quiet
 *
 * `force-dynamic`: the owner comes off the query string, so there is nothing
 * correct to cache at the page level.
 */
export const metadata: Metadata = {
  title: "Weekly Report",
  description:
    "Your week in four answers — what you earned, what was drilled near you, what prices did, and what is coming.",
};

export const dynamic = "force-dynamic";

export default async function WeeklyReportPage({
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
  } catch (e) {
    /* THE REASON IS LOGGED, NOT DISCARDED. The client shell retries on mount
       when it receives no payload, so a failed read still shows the named
       loader rather than an error page — but a bare `catch` left the cause
       nowhere at all: not in the browser, because this read is server-side,
       and not in the terminal either. That is what made "the API call is not
       appearing" impossible to diagnose from the outside. */
    console.error('[weekly-report] the owner payload could not be read:',
      e instanceof Error ? e.message : e);
    initial = null;
  }

  return <Portal route="weekly" initial={initial} />;
}
