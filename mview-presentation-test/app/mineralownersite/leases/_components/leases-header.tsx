import { gates } from "../../_components/ui/portal-gating";
import { leaseOwnerRecord } from "../_lib/lease-records";
import { portfolioSummary } from "../_lib/lease-totals";
import { ExportActions } from "./export-actions";

/**
 * THE PAGE TITLE ROW — what this page is, whose record it is, and the exports.
 *
 * The subtitle is DERIVED from the record rather than written out, so a lease
 * added to the fixture changes "10 leases on record …" without anyone editing a
 * sentence. The prototype hard-coded the count here and in five other places,
 * which is how a page ends up saying 10 in one line and 9 in the next.
 *
 * The exports are `hide-s`: a reader on the plain-English tier is being shown
 * seven sentences about their leases, and a CSV export is not part of that
 * conversation.
 */
export function LeasesHeader() {
  return (
    <div className="mb-2.5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">My Leases</h2>
        <p className="text-[13px] text-mv-muted">
          {portfolioSummary.leaseCount} leases on record {leaseOwnerRecord.name}{" "}
          ({leaseOwnerRecord.id}) · all {portfolioSummary.leaseCount} visible on
          Premium
        </p>
      </div>
      <div className={gates("hideInEssentials")}>
        <ExportActions />
      </div>
    </div>
  );
}
