import { ValueBand, type ValueBandStat } from "../../_components/ui/value-band";
import { formatDollars } from "../_lib/lease-format";
import { leaseOwnerRecord } from "../_lib/lease-records";
import {
  counties,
  operators,
  portfolioSummary,
} from "../_lib/lease-totals";

/**
 * THE FIVE PORTFOLIO FIGURES, pinned under the page title in every density.
 *
 * ALL FIVE ARE DERIVED (see `lease-totals.ts`) except the county roll total and
 * the week-over-week delta, which are not computable from the ten rows and are
 * carried on `leaseOwnerRecord` with their reasons.
 *
 * EVERY CAPTION EARNS ITS PLACE:
 *
 *   · "Estimate — not an appraisal" is a legal distinction, not modesty. An
 *     MVestimate is a forward cash-flow projection; an appraisal is a regulated
 *     valuation somebody signs.
 *   · The county figure says "different method, both real" because a reader
 *     seeing $26,340 above $11,532 will otherwise assume one of them is wrong.
 *   · The week delta says "illustrative" because the snapshot service is not
 *     connected. It is the one figure here nobody measured, and it says so.
 *   · "3 inactive — projected $0 forward" is the whole story of the three
 *     leases whose money column shows a county value instead of a projection.
 *
 * ONLY THE TWO MVESTIMATE-DERIVED FIGURES ARE `locked`. The county roll is
 * public record and the lease and county counts are not money, so blurring them
 * for a claimed-but-unpaid reader would hide facts the paywall does not cover.
 */
export function PortfolioValueBand() {
  const stats: ValueBandStat[] = [
    {
      label: "Total · MVestimate",
      value: formatDollars(portfolioSummary.mvestimateTotal),
      caption: "Estimate — not an appraisal",
      emphasis: true,
      locked: true,
    },
    {
      label: "County appraised · 2026",
      value: `~${formatDollars(portfolioSummary.countyAppraisedTotal)}`,
      caption: "county tax value — different method, both real",
    },
    {
      label: "This week's change",
      value: `+${formatDollars(leaseOwnerRecord.weekChange.amount)}`,
      qualifier: `(+${leaseOwnerRecord.weekChange.percent}%)`,
      caption: "vs last week's snapshot · illustrative",
      locked: true,
    },
    {
      label: "Producing",
      value: portfolioSummary.producingCount,
      qualifier: `of ${portfolioSummary.leaseCount}`,
      caption: `${portfolioSummary.inactiveCount} inactive — projected $0 forward`,
    },
    {
      label: "Counties · operators",
      value: portfolioSummary.countyCount,
      qualifier: `· ${portfolioSummary.operatorCount}`,
      caption: `${counties.join(" · ")} · ${operators.length} operators`,
    },
  ];

  return <ValueBand stats={stats} className="mb-4" />;
}
