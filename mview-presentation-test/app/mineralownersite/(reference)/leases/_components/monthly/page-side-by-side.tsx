import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../../_components/ui/table";
import {
  formatCount,
  formatDecimalInterest,
  formatDollars,
} from "../../_lib/lease-format";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { STEEP_DROP_PERCENT } from "../../_lib/monthly-rows";
import { ReportFootnote, ReportPageCard } from "./report-page";

/**
 * PAGE 5 · EVERY LEASE, SIDE BY SIDE — the same month across the whole record.
 *
 * ── ORDERED BY WHAT IT PAID YOU, NOT BY SIZE OR BY NAME ──
 *
 * The largest lease by acreage is not the one that pays most, and a reader
 * scanning for where their money came from should not have to hunt. Ordering by
 * your own share puts the answer in the first row every month and makes the
 * shape of the concentration visible without a chart.
 *
 * ── THE NON-FILER IS A ROW, NOT AN OMISSION ──
 *
 * It sits at the bottom reading "not filed" with a dash for the change and $0
 * for the share. Dropping it would make the table disagree with the header's
 * "9 of 10", and printing 0 MCF would claim the wells produced nothing. The
 * totals row counts ten leases and sums nine, which is the honest arithmetic.
 */
export function PageSideBySide({ report }: { report: MonthlyReport }) {
  return (
    <ReportPageCard
      number={5}
      id="side-by-side"
      title="Every lease, side by side"
      chip="ordered by what it paid you"
      lead="The same month for every lease you hold, ordered by what it paid you."
    >
      <TableScroll className="mt-4">
        <Table minWidth={980}>
          <TableHead>
            <TableRow className="bg-mv-portal-wash">
              <TableHeaderCell>Lease</TableHeaderCell>
              <TableHeaderCell>Reservoir</TableHeaderCell>
              <TableHeaderCell>Interest</TableHeaderCell>
              <TableHeaderCell numeric>Gas, whole lease</TableHeaderCell>
              <TableHeaderCell numeric>Your gas</TableHeaderCell>
              <TableHeaderCell numeric>Your oil</TableHeaderCell>
              <TableHeaderCell numeric>Your share</TableHeaderCell>
              <TableHeaderCell numeric>Vs {report.priorMonth}</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {report.leases.map((lease) => (
              <TableRow key={lease.slug}>
                <TableCell>
                  <span className="block text-[13px] font-bold">
                    {lease.title}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-mv-muted">
                    {lease.county} · {lease.operator}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {lease.reservoir}
                </TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">
                  {formatDecimalInterest(lease.decimalInterest)}
                </TableCell>

                {lease.filed ? (
                  <>
                    <TableCell numeric>
                      {formatCount(Math.round(lease.wholeGas))} MCF
                    </TableCell>
                    <TableCell numeric>
                      {formatCount(Math.round(lease.yourGas))} MCF
                    </TableCell>
                    <TableCell numeric>
                      {formatCount(Math.round(lease.yourOil))} BBL
                    </TableCell>
                  </>
                ) : (
                  /* One cell across the three volume columns: a row of dashes
                     reads as three separate missing measurements rather than
                     one missing filing. */
                  <TableCell numeric colSpan={3} className="text-mv-muted">
                    not filed
                  </TableCell>
                )}

                <TableCell numeric>{formatDollars(lease.yourShare)}</TableCell>
                <TableCell numeric>
                  <ChangeFigure percent={lease.changePercent} />
                </TableCell>
              </TableRow>
            ))}

            <TableRow tone="total">
              <TableCell>Total — {report.leaseCount} leases</TableCell>
              <TableCell />
              <TableCell />
              <TableCell numeric>
                {formatCount(Math.round(report.wholeGas))} MCF
              </TableCell>
              <TableCell numeric>
                {formatCount(Math.round(report.yourGas))} MCF
              </TableCell>
              <TableCell numeric>
                {formatCount(Math.round(report.yourOil))} BBL
              </TableCell>
              <TableCell numeric>{formatDollars(report.yourShare)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableScroll>

      <ReportFootnote>
        This is the public record for the month, at your decimal interest — the
        closest the filings can get to a statement. A statement is a different
        document: it carries the price your operator actually received and the
        deductions they applied, and neither is public.
      </ReportFootnote>
    </ReportPageCard>
  );
}

function ChangeFigure({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-mv-muted">—</span>;

  const steep = percent <= STEEP_DROP_PERCENT;
  return (
    <span
      className={`tabular-nums whitespace-nowrap ${
        steep ? "font-bold text-mv-down" : "text-mv-slate"
      }`}
    >
      {percent >= 0 ? "+" : ""}
      {percent.toFixed(1)}%
    </span>
  );
}
