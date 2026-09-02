import Link from "next/link";

import { EstimateBadge } from "../../_components/ui/badge";
import { Card } from "../../_components/ui/card";
import { gates } from "../../_components/ui/portal-gating";
import { ViewTierLink } from "../../_components/ui/view-tier-link";
import { formatDollars, formatLeaseTitle } from "../_lib/lease-format";
import { leaseRecords } from "../_lib/lease-records";
import { leaseReportPath } from "../_lib/lease-routes";
import { mvestimateTotal, portfolioSummary } from "../_lib/lease-totals";
import type { LeaseRecord } from "../_lib/lease-types";

/**
 * THE ESSENTIALS TIER — ten leases as ten sentences.
 *
 * `tier-s`, SO IT REPLACES THE WHOLE LIST RATHER THAN INTRODUCING IT. A reader
 * on the plain-English tier gets this card and no table: no decimal interests,
 * no API numbers, no RRC districts, no sixteen columns. That is the tier's whole
 * proposition, and hedging it by showing this card *and* the table would defeat
 * it.
 *
 * "PAUSED", NOT "INACTIVE". Same three leases, a word that does not sound like
 * loss — and the line above the list defines it in the same breath ("paused
 * means little future income is projected — you still own them"), because a
 * softer word that is never explained is just a vaguer word.
 *
 * THE PAUSED LEASES SHOW THEIR COUNTY VALUE, labelled, instead of $0 — the
 * $0-fallback rule, and the one place on the page where it appears without a
 * chip to explain it, so the label is spelled out under the figure.
 */

function statusPhrase(lease: LeaseRecord, isStrongest: boolean): string {
  if (lease.status === "inactive") return "paused";
  if (isStrongest) return "your strongest lease";
  /* Ledbetter is the one lease with a captured decline curve, so it is the only
     one we can honestly say is easing rather than merely earning. */
  if (lease.number === "74318") return "slowing normally";
  return "earning";
}

export function PlainEnglishList() {
  const strongest = leaseRecords.reduce((best, lease) =>
    lease.mvestimate > best.mvestimate ? lease : best,
  );

  return (
    <Card accent className={`mb-3.5 ${gates("essentialsOnly")}`}>
      <h3 className="mb-1.5 text-base font-bold">
        Your {portfolioSummary.leaseCount} leases, in plain English
      </h3>
      <p className="mb-2.5 text-[13px] text-mv-muted">
        {portfolioSummary.producingCount} are earning ·{" "}
        {portfolioSummary.inactiveCount} are paused (paused means little future
        income is projected — you still own them). Together:{" "}
        <strong className="tabular-nums">
          about {formatDollars(mvestimateTotal)}
        </strong>{" "}
        projected over six years. <EstimateBadge size="sm" />
      </p>

      <ul>
        {leaseRecords.map((lease) => (
          <li
            key={lease.number}
            className="flex items-start justify-between gap-2 border-b border-mv-portal-hairline px-1 py-2.5 text-[12.5px] last:border-b-0 hover:bg-mv-row-hover"
          >
            <span>
              <strong>{formatLeaseTitle(lease.name, lease.number)}</strong> ·{" "}
              {lease.county} — {statusPhrase(lease, lease === strongest)} ·{" "}
              <Link
                href={leaseReportPath(lease.number)}
                className="font-semibold text-mv-green-deep"
              >
                what it means →
              </Link>
            </span>
            <span className="flex-none text-right tabular-nums">
              {lease.mvestimate > 0 ? (
                `about ${formatDollars(lease.mvestimate)}`
              ) : (
                <>
                  <strong className="text-mv-green-deep">
                    {formatDollars(lease.countyAppraised)}
                  </strong>
                  <span className="block text-[10px] font-normal text-mv-muted">
                    county appraised value
                  </span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* THE TIER'S ONE STEP FORWARD — the design's own "See the details". */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <ViewTierLink tier="detailed">See the details</ViewTierLink>
      </div>
    </Card>
  );
}
