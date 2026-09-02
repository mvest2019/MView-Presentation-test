import Link from "next/link";

import { PortalButtonLink } from "../../../_components/ui/button";
import { formatLeaseTitle } from "../../_lib/lease-format";
import { leaseReportPath } from "../../_lib/lease-routes";
import { leaseReportNeighbours } from "../_lib/lease-report-records";
import type { ReportTab } from "../_lib/lease-report-types";

/**
 * THE BREADCRUMB AND THE LEASE→LEASE PAGER.
 *
 * ── THE CRUMB'S LAST SEGMENT FOLLOWS THE OPEN TAB ──
 *
 * "My Leases › Smith Gas Unit (305892) › Lease report", and that third segment
 * changes to "Reservoir report" or "Wells report" as the reader moves between
 * the three tied reports. It is the only thing on the page that tells them which
 * of the three they are in besides the tab strip itself.
 *
 * ── THE PAGER PAGES IN THE LEASE TABLE'S ORDER ──
 *
 * `leaseReportNeighbours` sorts by value, high to low — the lease list's own
 * default — so "Lease report 3 of 10" means the same thing on both screens. The
 * prototype's pager wrapped at both ends and this one does too: from the last
 * lease, Next returns to the first. On a ten-item list a dead-ended arrow is
 * more annoying than a wrap.
 *
 * `scroll={false}` IS THE POINT OF THE COPY BESIDE IT. The design promises
 * "paging keeps your place on the page" — a reader comparing the same panel
 * across two leases should not be thrown back to the top on every step. Next's
 * default is to scroll to top on navigation, so this has to be opted out of.
 */
export function LeaseReportNav({
  leaseNumber,
  leaseTitle,
  tab,
}: {
  leaseNumber: string;
  leaseTitle: string;
  tab: ReportTab;
}) {
  const pager = leaseReportNeighbours(leaseNumber);
  const tabLabel =
    tab === "reservoir"
      ? "Reservoir report"
      : tab === "wells"
        ? "Wells report"
        : "Lease report";

  return (
    <>
      <nav
        aria-label="Report breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-[13px] text-mv-muted"
      >
        <Link href="/mineralownersite/leases" className="text-mv-green-deep">
          My Leases
        </Link>
        <span aria-hidden="true">›</span>
        <Link
          href={leaseReportPath(leaseNumber)}
          className="text-mv-green-deep"
        >
          {leaseTitle}
        </Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page" className="font-semibold text-mv-ink">
          {tabLabel}
        </span>
      </nav>

      {pager && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <PortalButtonLink
            size="sm"
            scroll={false}
            href={leaseReportPath(pager.previous.number)}
          >
            ← {formatLeaseTitle(pager.previous.name, pager.previous.number)}
          </PortalButtonLink>

          <span className="text-[11px] text-mv-muted">
            {tabLabel} {pager.position} of {pager.total} — paging keeps your
            place on the page
          </span>

          <PortalButtonLink
            size="sm"
            scroll={false}
            href={leaseReportPath(pager.next.number)}
          >
            {formatLeaseTitle(pager.next.name, pager.next.number)} →
          </PortalButtonLink>
        </div>
      )}
    </>
  );
}
