"use client";

import { ValueBand } from "../../../_components/ui/value-band";
import {
  formatCompactDollars,
  formatCompactVolume,
} from "../_lib/lease-format";
import { useLeasesData } from "./leases-data";

/**
 * THE DARK BAND — the five figures the page exists to give, above everything
 * that explains them.
 *
 * IT SITS ABOVE THE NOTICES, DELIBERATELY. The change feed below is dismissible
 * and varies in height with how much news there is that week; with it first, the
 * number an owner opened the page for moved down the screen — or off it —
 * depending on the news.
 *
 * ONLY THE FIRST FIGURE IS GREEN. It is the answer to "what is my record
 * worth"; the four beside it are the context that makes the answer readable. The
 * band's own component colours it rather than enlarging it — see `ValueBand`.
 *
 * EVERY CAPTION SAYS WHAT THE FIGURE IS NOT. "Estimate — not an appraisal" on
 * the money, "gross" on the gas, the roll year on the county column. A caption
 * is not optional on this band for the reason `KpiTile` gives: an unqualified
 * dollar figure on a minerals page gets read as an amount somebody will be paid.
 */
export function PortfolioValueBand({
  /** The Ultra block renders its own copy directly under the hero — see
      `ultra-summary.tsx` for why there are two. */
  className = "mb-3",
}: {
  className?: string;
} = {}) {
  /* THE RECORD'S OWN FIGURES, from the one read the page makes — see
     `leases-data.tsx`. Every one is the service's `totals` block rather than a
     sum of the rows on screen, so a filter narrowing the table below does not
     restate the headline above it.

     NOTHING IS DRAWN UNTIL THEY ARRIVE. The band is five large figures and it
     is the first thing a reader looks at; showing the fixture's $4.44M for a
     second and then the record's real number is worse than showing a blank
     band, because the first figure is the one that gets remembered. The band
     keeps its shape meanwhile so the page below does not jump. */
  const totals = useLeasesData()?.totals ?? null;

  const blank = "—";
  const countyCaption = totals
    ? `all ${totals.leaseCount} interest${totals.leaseCount === 1 ? "" : "s"}${totals.rollYear ? `, ${totals.rollYear} roll` : ""}`
    : "";

  return (
    <ValueBand
      className={className}
      stats={[
        {
          label: "Total · MVestimate",
          value: totals ? formatCompactDollars(totals.ownerValue) : blank,
          emphasis: true,
          /* The claimed-but-unpaid gate covers this one figure and no other on
             the band — the county roll is a public document and the counts are
             not money. See `portalGate.lockedValue`. */
          locked: true,
          caption: "Estimate — not an appraisal",
        },
        {
          label: "County appraised",
          value: totals ? formatCompactDollars(totals.appraisedValue) : blank,
          caption: countyCaption,
        },
        {
          label: "Wells · Reservoirs",
          value: totals
            ? `${totals.wellCount} · ${totals.reservoirCount}`
            : blank,
          caption: totals ? `${totals.deviatedCount} drilled sideways` : "",
        },
        {
          label: "Gas filed to date",
          value: totals ? formatCompactVolume(totals.gasToDate) : blank,
          caption: "MCF · all leases, gross",
        },
        {
          label: "Operators · Counties",
          value: totals ? `${totals.operators} · ${totals.counties}` : blank,
          caption: "named on the production filings",
        },
      ]}
    />
  );
}
