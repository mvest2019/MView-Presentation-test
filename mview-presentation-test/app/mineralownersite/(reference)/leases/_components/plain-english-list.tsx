import Link from "next/link";

import { Card } from "../../../_components/ui/card";
import { gates } from "../../../_components/ui/portal-gating";
import { formatCompactDollars, formatLeaseTitle } from "../_lib/lease-format";
import { leaseRecords } from "../_lib/lease-records";
import { leaseReportPath } from "../_lib/lease-routes";
import { portfolioSummary } from "../_lib/lease-totals";
import { ReportStackNotice } from "./list/report-stack-notice";

/**
 * YOUR LEASES, IN PLAIN ENGLISH — what Essentials shows instead of the table.
 *
 * ── IT REPLACES THE TABLE RATHER THAN SIMPLIFYING IT ──
 *
 * The eleven-column table is a comparison instrument: it exists so a reader can
 * scan down a column and rank things. Essentials is for a reader who is not
 * comparing — they want to know what they own, whether it is paying, and
 * roughly how much. That is three facts per lease in a sentence, and no amount
 * of hiding columns turns a table into that. So the tab strip and the table go,
 * and this takes their place.
 *
 * ── "PAUSED" IS EXPLAINED IN THE SAME BREATH IT IS USED ──
 *
 * A lease with no projected income has not been taken away and nothing has gone
 * wrong with it, and a plain-language reader has no other page to learn that on.
 * The parenthesis is not padding: without it "paused" is the most alarming word
 * on the screen.
 *
 * ── "ABOUT $1.36M" ──
 *
 * The word is doing work. At this density the figure is a projection quoted to
 * three significant figures, and "about" is what stops it reading as a balance.
 * The same number appears unqualified in the table at the other tiers, where it
 * sits under a column heading and beside its own basis line.
 *
 * ── THE FOOTNOTE IS RENDERED HERE TOO ──
 *
 * It normally lives under the table, inside the tab panel that Essentials
 * hides — so without a copy here the one sentence explaining where the
 * well-level facts live would vanish for the readers most likely to go looking
 * for them. Exactly one copy is ever visible, the same arrangement the Ultra
 * block uses for the value band.
 */
export function PlainEnglishList() {
  const earning = leaseRecords.filter((lease) => lease.mvestimate > 0);
  const paused = leaseRecords.length - earning.length;

  return (
    <div className={gates("essentialsOnly")}>
      <Card accent padded={false} className="px-[22px] py-[18px]">
        <h3 className="text-[15px] font-bold">
          Your {portfolioSummary.leaseCount} leases, in plain English
        </h3>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-mv-muted">
          {earning.length} are earning · {paused} are paused (paused means
          little future income is projected — you still own them). Together:{" "}
          <strong className="text-mv-ink">
            about {formatCompactDollars(portfolioSummary.mvestimate)}
          </strong>{" "}
          projected.
        </p>

        {/* A RULE BETWEEN THE ROWS AS WELL AS THE TINT. Ten rows of the same
            shape, each ending in a right-aligned figure, need a horizontal
            anchor for the eye to carry a name across to its money — the zebra
            tint alone is too faint to do that work at this row height.

            THE ROUNDING CAME OFF WITH IT. A rounded tinted row sitting on a
            full-width rule leaves a sliver of card showing at each corner,
            which reads as the line being broken rather than as a corner. */}
        <ul className="mt-3 divide-y divide-mv-line border-y border-mv-line">
          {leaseRecords.map((lease) => (
            <li
              key={lease.slug}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2.5 py-2.5 text-[13px] odd:bg-mv-portal-row-tint"
            >
              <span className="min-w-0">
                <strong>{formatLeaseTitle(lease.name, lease.number)}</strong>
                <span className="text-mv-muted">
                  {" "}
                  · {lease.county} —{" "}
                  {lease.mvestimate > 0 ? "earning" : "paused"} ·{" "}
                </span>
                <Link
                  href={leaseReportPath(lease.slug)}
                  className="font-semibold whitespace-nowrap text-mv-green-deep underline"
                >
                  what it means →
                </Link>
              </span>
              <span className="whitespace-nowrap tabular-nums">
                about {formatCompactDollars(lease.mvestimate)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <ReportStackNotice />
    </div>
  );
}
