import { PortalButtonLink } from "../../../_components/ui/button";
import { TierCopy } from "../../../_components/ui/tier-copy";
import { Card } from "../../../_components/ui/card";
import { gates } from "../../../_components/ui/portal-gating";
import { formatLeaseTitle } from "../../_lib/lease-format";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE UNCLAIMED VARIANT OF A LEASE REPORT.
 *
 * ── WHY A ROUTE NEEDS THESE, AND WHAT HAPPENS WITHOUT THEM ──
 *
 * `portal.css` replaces a page wholesale in two states. In the Ultra tier it
 * hides every child of `.mv-dash-routes` that is not `.tier-u`; while the record
 * is unclaimed it hides every child that is not `.nc-only`. A route that offers
 * no variant for either therefore renders a COMPLETELY BLANK PAGE in that state
 * — measured, not theorised: this page did exactly that on `?view=ultra` before
 * these two components existed, because its three sections were all ordinary
 * children.
 *
 * That is the trap in the page-replacement gates, and it is invisible in the
 * default state. Every portal route needs a `tier-u` variant and an `nc-only`
 * variant, or it needs to stay out of `.mv-dash-routes` altogether.
 *
 * THE ULTRA VARIANT LIVES IN `page.tsx`, not here: it prints the report record's
 * own one-line summary, which differs per lease, so it belongs where the record
 * is already in scope. This file holds the unclaimed one, which does not.
 */

/** The panel that REPLACES this page while no record is claimed. */
export function LeaseReportUnclaimed({ lease }: { lease: LeaseRecord }) {
  return (
    <div className={gates("unclaimedOnly", "unclaimedSwap")}>
      <h2 className="mb-1 text-2xl font-bold">
        {formatLeaseTitle(lease.name, lease.number)}
      </h2>
      <p className="mb-3 text-[13px] text-mv-muted">
        {lease.county} County · operated by {lease.operator}
      </p>

      <Card className="max-w-[560px]">
        <p className="mb-4 text-[13px]">
          <strong>This lease sits on an owner record you have not claimed.</strong>{" "}
          Claim your own record and every lease on it arrives with its produced
          volumes, your decimal interest and a plain-English report — free, and it
          never changes who owns your minerals.
        </p>
        <div className="flex flex-wrap gap-2">
          <PortalButtonLink variant="primary" size="sm" href="/claim">
            <TierCopy copyKey="claim.cta" />
          </PortalButtonLink>
          <PortalButtonLink size="sm" href="/mineralownersite/leases">
            See the sample lease list
          </PortalButtonLink>
        </div>
      </Card>
    </div>
  );
}
