import { Badge } from "../../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../../_components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../../../_components/ui/table";
import {
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
} from "../../../_lib/lease-format";
import type { ReservoirReport } from "../../_lib/reservoir-report";

/**
 * "EVERY WELL IN IT — BIGGEST FILER FIRST".
 *
 * ── THE FOOTNOTE IS WHERE THE ALLOCATION IS EXPLAINED ──
 *
 * A reservoir runs under more than one lease, so a reader who opens a second
 * lease sees this whole report move with it. And the money here is not a
 * separate calculation: it is each lease's own cash for the month, split
 * between its wells by what their volumes were worth at that month's deck —
 * which is why the wells add back to the lease exactly, and why a lease with
 * wells in two reservoirs cannot hand all of its money to one of them.
 *
 * Stating that under the table matters because "share 100.0%" invites the
 * reading that this well earned everything, when what it means is that this
 * lease has one well.
 */
export function WellsTableCard({ report }: { report: ReservoirReport }) {
  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">
            Every well in it — biggest filer first
          </h3>
        }
        action={
          <Badge tone="slate" size="xs">
            volumes allocated · money split
          </Badge>
        }
      />

      <TableScroll className="mt-3">
        <Table minWidth={880}>
          <TableHead>
            <TableRow className="bg-mv-portal-wash">
              <TableHeaderCell>Well</TableHeaderCell>
              <TableHeaderCell>API</TableHeaderCell>
              <TableHeaderCell>Lease</TableHeaderCell>
              <TableHeaderCell>Drilled</TableHeaderCell>
              <TableHeaderCell>Open interval</TableHeaderCell>
              <TableHeaderCell numeric>Gas filed</TableHeaderCell>
              <TableHeaderCell numeric>Share</TableHeaderCell>
              <TableHeaderCell numeric>Paid you</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.wells.map((well) => (
              <TableRow key={well.api}>
                <TableCell className="font-bold whitespace-nowrap">
                  Well {well.name}
                </TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">
                  {well.api}
                </TableCell>
                <TableCell className="tabular-nums">
                  {report.lease.number ?? report.lease.name}
                </TableCell>
                <TableCell className="whitespace-nowrap">{well.drilled}</TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">
                  {formatCount(well.openTopFt)}–{formatCount(well.openBottomFt)} ft
                </TableCell>
                <TableCell numeric>{formatCompactVolume(well.gasFiled)}</TableCell>
                <TableCell numeric>{well.sharePercent.toFixed(1)}%</TableCell>
                <TableCell numeric>{formatCompactDollars(well.paidYou)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>

      <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
        A reservoir runs under more than one lease, so opening a well on another
        lease moves the whole report with it. The money is each lease&apos;s own
        cash for the month split between its wells by what their volumes are
        worth at that month&apos;s deck — which is why the wells add back to the
        lease exactly.
      </p>
    </Card>
  );
}
