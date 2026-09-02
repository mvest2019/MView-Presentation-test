import Link from "next/link";

import { ExplainPanel } from "../../_components/ui/explain-panel";
import { portalGate } from "../../_components/ui/portal-gating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../_components/ui/table";
import {
  formatDecimalInterest,
  formatDollars,
  formatList,
  formatOperatorShortName,
  spellOut,
} from "../_lib/lease-format";
import {
  derivationReconciles,
  derivationRows,
  derivationTotal,
} from "../_lib/lease-derivation";
import { leaseOwnerRecord } from "../_lib/lease-records";
import { leaseReportPath } from "../_lib/lease-routes";
import {
  counties,
  operators,
  portfolioSummary,
} from "../_lib/lease-totals";

/**
 * "EXPLAIN THIS ESTIMATE" — the derivation of $26,340, lease by lease.
 *
 * THE MOST IMPORTANT PANEL ON THE PAGE. It is the difference between a number
 * somebody is asked to trust and a number they can check, and it is why the
 * MVestimate can be shown at all: an unexplained six-figure-adjacent projection
 * against someone's inheritance is not a feature.
 *
 * `id` IS LOAD-BEARING. The dashboard's MVestimate stat deep-links here
 * (`?explain=est` in the prototype, `#ls-explain-estimate` now), so clicking the
 * total on one page opens its derivation on this one.
 *
 * THE "MULTIPLY ANY ROW YOURSELF" INVITATION IS CONDITIONAL, and that is not
 * defensive coding — see the warning at the top of `lease-derivation.ts`. The
 * prototype's gross column does not multiply out to its own product column, so
 * inviting a reader to check the arithmetic would invite them to find it broken.
 * The table still shows every input either way; only the claim is withheld, and
 * it returns by itself once the gross figures are fixed.
 */
export function EstimateExplainer() {
  return (
    <ExplainPanel
      id="ls-explain-estimate"
      className="mb-3.5"
      summary={`Explain this estimate — how the ${formatDollars(
        derivationTotal,
      )} is derived, lease by lease`}
    >
      <p className="mb-2">
        Each lease&apos;s <strong>gross six-year projection</strong> (its decline
        curve × the price outlook, computed to the dollar) is multiplied by{" "}
        <strong>your decimal interest</strong> on that lease, then rounded to the
        nearest $100.
        {derivationReconciles
          ? " The math below reproduces exactly — multiply any row yourself."
          : " Every input is below."}
      </p>

      <TableScroll>
        <Table minWidth={560}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Lease (no.)</TableHeaderCell>
              <TableHeaderCell numeric>
                {/* The design's header is "Gross model input (exact $)". The
                    "(exact $)" claim is withheld on the same condition as the
                    "multiply any row yourself" invitation below — see
                    `lease-derivation.ts`. Both return together when the source
                    column is fixed. */}
                Gross model input{derivationReconciles ? " (exact $)" : ""}
              </TableHeaderCell>
              <TableHeaderCell numeric>
                <abbr
                  title="Your ownership share of a lease, written as a decimal — e.g. 0.00538700. Multiply gross lease dollars by it to get your share."
                  className="cursor-help border-b-[1.5px] border-dotted border-mv-green-deep no-underline"
                >
                  × your DI
                </abbr>
              </TableHeaderCell>
              <TableHeaderCell numeric>= unrounded</TableHeaderCell>
              <TableHeaderCell numeric>
                = your share (nearest $100)
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {derivationRows.map((row) => (
              <TableRow key={row.label}>
                <TableCell>
                  {row.lease ? (
                    <Link
                      href={leaseReportPath(row.lease.number)}
                      className="font-semibold text-mv-green-deep"
                    >
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </TableCell>
                {/*
                  THE CLAIMED GATE, COLUMNS 2 · 4 · 5 — the design's own
                  `#lsExplainEst tbody td:nth-child(2),(4),(5)`. Three of the
                  five columns are money and blur; column 3 is the DECIMAL
                  INTEREST and stays sharp, deliberately. That figure is the
                  owner's own division-order share, not the product: a free
                  owner who claimed their record is shown less of what Premium
                  sells, never less of their own paperwork.
                */}
                <TableCell numeric className={portalGate.lockedValue}>
                  {row.grossDisplay}
                </TableCell>
                <TableCell numeric>
                  {row.decimalInterest === null
                    ? "—"
                    : formatDecimalInterest(row.decimalInterest)}
                </TableCell>
                <TableCell numeric className={portalGate.lockedValue}>
                  {row.unroundedDisplay}
                </TableCell>
                <TableCell numeric className={portalGate.lockedValue}>
                  <strong>{formatDollars(row.rounded)}</strong>
                  {row.note && (
                    <span className="block text-[10px] font-normal text-mv-muted">
                      ({row.note})
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow tone="highlight">
              <TableCell>
                <strong>Total — your owner share</strong>
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              {/* Column 5 on the totals row is gated like the rows above it —
                  the design's selector is scoped to the whole `tbody`, and this
                  cell holds the all-ten-lease figure. */}
              <TableCell numeric className={portalGate.lockedValue}>
                <strong>{formatDollars(derivationTotal)}</strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableScroll>

      <p className="mt-2 text-[10px] text-mv-muted">
        Calculation record: model run{" "}
        <span className="tabular-nums">as of {leaseOwnerRecord.modelRun.asOf}</span>{" "}
        ·
        price deck{" "}
        <span className="tabular-nums">
          {leaseOwnerRecord.modelRun.priceDeck}
        </span>{" "}
        · decline model{" "}
        <span className="tabular-nums">
          {leaseOwnerRecord.modelRun.declineModel}
        </span>{" "}
        · DI source{" "}
        <span className="tabular-nums">{leaseOwnerRecord.modelRun.diSource}</span>{" "}
        — confirm against your division order if you have one. Forward-looking —{" "}
        <strong>
          an estimate, not an appraisal, not a payment ledger
        </strong>
        .
      </p>

      {/* The other four figures on the band, demoted here rather than crowding
          the band itself with a paragraph per stat (OWNER-49). */}
      <p className="mt-2.5 text-[13px]">
        <strong>The other four figures on the band.</strong>{" "}
        <strong>
          County appraised (~
          {formatDollars(portfolioSummary.countyAppraisedTotal)})
        </strong>{" "}
        is the county&apos;s conservative annual tax value across all{" "}
        {portfolioSummary.leaseCount} leases — a different method than the
        MVestimate, and both are real. <strong>This week&apos;s change</strong>{" "}
        compares today against the daily value snapshot taken 7 days ago —
        illustrative here; the snapshot service wires in production.{" "}
        <strong>
          Producing {portfolioSummary.producingCount} of{" "}
          {portfolioSummary.leaseCount}
        </strong>{" "}
        — the {spellOut(portfolioSummary.inactiveCount)} inactive leases project
        $0 forward (see &quot;What {portfolioSummary.producingCount} active ·{" "}
        {portfolioSummary.inactiveCount} inactive means for you&quot;, below).
        The leases sit in <strong>{formatList(counties)}</strong> counties and are
        operated by{" "}
        <strong>{formatList(operators.map(formatOperatorShortName))}</strong> —
        each lease&apos;s operator is on its row in the table below.
      </p>
    </ExplainPanel>
  );
}
