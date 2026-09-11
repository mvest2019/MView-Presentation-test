import { PrototypeButton } from "../../../_components/ui/prototype-button";
import { leaseOwnerRecord } from "../_lib/lease-records";
import { portfolioSummary } from "../_lib/lease-totals";

/**
 * THE PAGE TITLE, THE RECORD IT BELONGS TO, AND THE TWO EXPORTS.
 *
 * THE SUBTITLE IS THE WHOLE SCOPE OF THE PAGE IN ONE LINE — how many leases,
 * whose record, how many wells and how many reservoirs. It is derived from the
 * records rather than written out, so it cannot drift from the table beneath it.
 *
 * BOTH BUTTONS ACKNOWLEDGE RATHER THAN PRETEND. Neither export is wired to a
 * generator yet, and a button that silently does nothing teaches a reader the
 * product is broken. `PrototypeButton` is the portal's own idiom for that — see
 * its note.
 */
export function LeasesHeader() {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[26px] leading-tight font-bold">My Leases</h1>
        <p className="mt-0.5 text-[12.5px] text-mv-muted">
          {portfolioSummary.leaseCount} leases on record {leaseOwnerRecord.name}{" "}
          · {portfolioSummary.wells} wells · {portfolioSummary.reservoirs}{" "}
          reservoirs
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <PrototypeButton
          title="Exports every figure on this page as JSON. Not connected yet."
          acknowledgement="Exported ✓ (prototype)"
        >
          Portfolio JSON
        </PrototypeButton>
        <PrototypeButton
          title="Produces a printable portfolio report. Not connected yet."
          acknowledgement="Prepared ✓ (prototype)"
        >
          Print / PDF
        </PrototypeButton>
      </div>
    </div>
  );
}
