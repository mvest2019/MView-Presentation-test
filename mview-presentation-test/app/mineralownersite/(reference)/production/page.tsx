import type { Metadata } from "next";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";

/**
 * PRODUCTION & FORECAST — `/mineralownersite/production`, the server half.
 *
 * PORTED FROM the reference's `src/app/production/page.tsx`. Its shape and its
 * reasoning are the reference's: the payload is loaded on the SERVER for the
 * first paint, so the page arrives with real figures in the HTML rather than a
 * spinner that then fetches, and after that the client shell owns navigation —
 * moving between the Dashboard, this page and the Weekly Report re-uses the
 * one snapshot. Each route still has a real server page, which is what makes a
 * cold entry or a shared link work.
 *
 * WHAT THE PAGE CONTAINS — every section the reference ships, in its order:
 *
 *   the header                what the page is for, and the state-filings chip
 *   ULTRA only                one sentence: the wells are running, the last
 *                             few months just are not published yet
 *   the boundary strip        the page's spine — posted · already produced ·
 *                             projected, as three proportional segments, each
 *                             a button that moves the chart window to itself
 *   the three estimates       next month, next quarter, six years, with the
 *                             note on why the first two are ranges
 *   six insight cards         each one a button that opens its own explainer
 *   the life of the record    six more figures (not at Ultra)
 *   two arc gauges            how much gas and oil is already out of the
 *                             ground, then the same split per lease as a
 *                             sorted list of buttons that pick that lease
 *   your share, year by year  stacked columns, gas against oil
 *   THE CHART                 lease select · four measures (at the lease ·
 *                             after removal · your share · in money) · three
 *                             product filters · five window presets · a
 *                             two-handle brush · hover, arrow-key and click to
 *                             pin a month
 *   the all-leases table      one row per lease, clickable to drive the chart
 *                             and the scorecard, with a totals row
 *   the scorecard             what this lease is, and the gas/oil grid at both
 *                             the lease and your own interest
 *   the deduction            produced → removed → reached the meter, with the
 *                             disposition-route table and the month-by-month
 *                             removal bars (Detailed and Professional)
 *   what to take from it      the findings (not at Ultra)
 *   the two units             MCF and BBL in plain English
 *   provenance                one filing per claim (Professional only)
 *
 * `force-dynamic`: the owner comes off the query string, so there is nothing
 * correct to cache at the page level.
 */
export const metadata: Metadata = {
  title: "Production & Forecast",
  description:
    "What every one of your leases has produced — and where the model says it is heading.",
};

export const dynamic = "force-dynamic";

export default async function ProductionForecastPage({
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

  return <Portal route="production" initial={initial} />;
}
