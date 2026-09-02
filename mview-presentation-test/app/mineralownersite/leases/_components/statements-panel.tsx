import { Badge } from "../../_components/ui/badge";
import { PortalButton } from "../../_components/ui/button";
import { Notice } from "../../_components/ui/notice";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../_components/ui/table";
import { formatDecimalInterest, formatDollars } from "../_lib/lease-format";
import { incomeBasis } from "../_lib/lease-financials";
import { statements } from "../_lib/lease-statements";

/**
 * THE MONTHLY REPORTS TAB — seven owner-share statements.
 *
 * "THE MONTHLY IS TRUTH" is the framing, and it is the honest hierarchy of this
 * product: the weekly report is a slice, the estimate is a projection, and the
 * statement is the document. Saying which one is which is the difference between
 * a portal an owner can act on and a dashboard of plausible numbers.
 *
 * ── THE OPEN BUTTONS ARE DISABLED, AND THAT IS THE ACCURATE STATE ──
 *
 * The prototype's `openStatement()` swapped in a rendered statement view. That
 * view is a route of its own and is not built here, so the buttons say what is
 * true — the statement is not viewable yet — via `disabled` and a `title`, rather
 * than being live controls that do nothing.
 *
 * A DISABLED BUTTON IS THE RIGHT SIGNAL HERE, unlike on the export buttons in
 * the page header. Export is a feature this account has that is not wired up; a
 * statement viewer is a screen that does not exist. The first is "not connected",
 * the second is "not built", and the two should not look the same.
 *
 * THE ROWS ARE NOT CLICKABLE FOR THE SAME REASON — a row-level click target
 * whose action is unavailable is a promise the page cannot keep.
 */
export function StatementsPanel() {
  return (
    <div>
      <Notice glyph="▤" className="mb-3.5">
        <strong>Monthly statements are the anchor.</strong> The weekly report is a
        slice; the monthly is truth. Each statement below is a compact
        owner-share summary for the month — mailed on paper with Premium.
      </Notice>

      <TableScroll>
        <Table minWidth={640}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Statement month</TableHeaderCell>
              <TableHeaderCell numeric>
                Owner-share income (derived)
              </TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">Open the statement</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {statements.map((statement) => (
              <TableRow key={statement.month}>
                <TableCell>
                  <strong>{statement.label}</strong>
                </TableCell>
                <TableCell numeric>
                  {formatDollars(statement.share)}
                </TableCell>
                <TableCell>
                  <Badge
                    tone={statement.status === "ready" ? "mint" : "slate"}
                    size="sm"
                  >
                    {statement.status === "ready" ? "Ready" : "Archived"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <PortalButton
                    size="sm"
                    disabled
                    title={`The ${statement.label} statement view is not built yet.`}
                  >
                    Open
                  </PortalButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>

      <p className="mt-2 text-[10px] text-mv-muted">
        Derived owner-share figures use the {incomeBasis.leaseTitle} report curve ×
        DI {formatDecimalInterest(incomeBasis.decimalInterest)}; the remaining
        leases wire to statement data in production.{" "}
        <Badge tone="estimate" size="xs">
          Derived / illustrative — not a payment ledger
        </Badge>
      </p>
    </div>
  );
}
