import { ValueBand } from "../../../_components/ui/value-band";
import {
  formatCompactDollars,
  formatCompactVolume,
} from "../_lib/lease-format";
import { portfolioSummary } from "../_lib/lease-totals";

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
export function PortfolioValueBand() {
  const summary = portfolioSummary;

  return (
    <ValueBand
      className="mb-3"
      stats={[
        {
          label: "Total · MVestimate",
          value: formatCompactDollars(summary.mvestimate),
          emphasis: true,
          /* The claimed-but-unpaid gate covers this one figure and no other on
             the band — the county roll is a public document and the counts are
             not money. See `portalGate.lockedValue`. */
          locked: true,
          caption: "Estimate — not an appraisal",
        },
        {
          label: "County appraised",
          value: formatCompactDollars(summary.countyAppraised),
          caption: `all ${summary.leaseCount} interests, ${summary.rollYear} roll`,
        },
        {
          label: "Wells · Reservoirs",
          value: `${summary.wells} · ${summary.reservoirs}`,
          caption: `${summary.horizontalWells} drilled sideways`,
        },
        {
          label: "Gas filed to date",
          value: formatCompactVolume(summary.gasMcf),
          caption: "MCF · all leases, gross",
        },
        {
          label: "Operators · Counties",
          value: `${summary.operators} · ${summary.counties}`,
          caption: "named on the production filings",
        },
      ]}
    />
  );
}
