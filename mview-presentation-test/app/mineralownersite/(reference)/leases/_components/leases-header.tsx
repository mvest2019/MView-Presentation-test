import { PrototypeButton } from "../../../_components/ui/prototype-button";
import { portfolioSummary } from "../_lib/lease-totals";

/**
 * THE PAGE TITLE, THE RECORD'S SCOPE, AND THE TWO EXPORTS.
 *
 * THE SUBTITLE IS THE WHOLE SCOPE OF THE PAGE IN ONE LINE — how many leases,
 * how many wells and how many reservoirs. It is derived from the records rather
 * than written out, so it cannot drift from the table beneath it.
 *
 * NO OWNER NAME IN IT ANY MORE (Pragati, 2026-09-17: remove the hard-coded
 * account). It used to read "… on record Platis Sydney Kay", the fixture's
 * owner, and the portal now sits behind sign-in — so that line printed one
 * person's name over another person's session. The leases themselves are still
 * the committed fixture (no endpoint serves `my_leases` yet — see
 * `.env.example`), so the honest line is "on your record" with no name at all:
 * printing the signed-in member's name over fixture rows would claim these
 * leases are theirs, and keeping the fixture's name claims the session is
 * somebody else. When a live leases endpoint lands, print the name it answers
 * with, the way the Dashboard reads `dash.owner.ownername`.
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
          {portfolioSummary.leaseCount} leases on your record ·{" "}
          {portfolioSummary.wells} wells · {portfolioSummary.reservoirs}{" "}
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
