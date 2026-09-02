import Link from "next/link";

import { Notice } from "../../../_components/ui/notice";
import { formatLeaseTitle } from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { leaseReportPath } from "../../_lib/lease-routes";

/**
 * "EVERY LEASE OPENS A FULL REPORT STACK" — and this notice is NOT tier-gated.
 *
 * ── WHY IT LIVES IN ITS OWN FILE ──
 *
 * It used to sit inside `lease-list-panel.tsx`, next to the "two honest numbers"
 * notice, under that panel's `hide-s` wrapper. But the design gates only ONE of
 * the two: the calibration-study paragraph carries `hide-s`, and this one carries
 * nothing. Nesting them together hid this notice from Essentials — the tier
 * whose reader is least likely to know a lease is clickable at all, and most in
 * need of being told.
 *
 * So it is a sibling of the tab strip rather than a child of the list panel, and
 * that structural difference IS the gating difference. Keeping it inside the
 * panel and adding an un-hide class would fight the parent's `display:none`,
 * which cannot be undone from a descendant.
 *
 * ── THE TWO CAPTURED LEASES ARE NAMED, AND LINKED ──
 *
 * Two of the ten have a captured curve and a digitized survey; the other eight
 * carry real record fields and an honest gap where the chart would be. Naming
 * the two and linking them is how a reader finds the full thing on their first
 * visit instead of opening a generic report and concluding the feature is thin.
 *
 * DERIVED, so the sentence cannot drift: the count comes from the record and the
 * two names come from `CAPTURED`, which is the same list the report module uses.
 */

/** The leases with a fully captured decline curve and reservoir narrative. */
const CAPTURED = ["74318", "305892"];

export function LeaseReportStackNotice() {
  const captured = CAPTURED.map(
    (number) => leaseRecords.find((lease) => lease.number === number)!,
  );
  const others = leaseRecords.length - captured.length;

  return (
    <div className="mt-3.5">
      <Notice glyph="▤">
        <strong>Every lease opens a full report stack</strong> — Lease ·
        Reservoir · Wells, three tied tabs.{" "}
        {captured.map((lease, index) => (
          <span key={lease.number}>
            {index > 0 && " and "}
            <Link
              href={leaseReportPath(lease.number)}
              className="font-semibold text-mv-green-deep"
            >
              {formatLeaseTitle(lease.name, lease.number)}
            </Link>
          </span>
        ))}{" "}
        carry fully captured data; the other {others} now carry their real well,
        operator, play, field, and first-production data from the live record
        (chart curve internals remain illustrative between real anchor points).
      </Notice>
    </div>
  );
}
