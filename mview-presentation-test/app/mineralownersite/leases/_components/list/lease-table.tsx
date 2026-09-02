import { EstimateBadge } from "../../../_components/ui/badge";
import { gates, portalGate } from "../../../_components/ui/portal-gating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../_components/ui/table";
import { formatDollars } from "../../_lib/lease-format";
import {
  countyPlaceholderTotal,
  mvestimateTotal,
  portfolioSummary,
} from "../../_lib/lease-totals";
import type { LeaseRecord } from "../../_lib/lease-types";
import { LeaseTableRow } from "./lease-table-row";

/**
 * THE FULL LEASE TABLE.
 *
 * PRESENTATIONAL AND SERVER-SAFE — it takes a list and renders it. Sorting,
 * searching and the list/grid choice all live one level up in
 * `lease-list-panel.tsx`, so this component has no idea any of that exists and
 * can be reasoned about as "given these leases, this is the table".
 *
 * THE TOTALS ROW IS HIDDEN WHILE SEARCHING. A footer reading "Total — 10 leases ·
 * $26,340" under four filtered rows is simply false, and re-totalling the
 * visible subset would be worse: it would put a number on screen that means
 * nothing (the value of an arbitrary search result) in the place where the
 * portfolio total belongs. The prototype hid the row too; `showTotals` makes
 * that decision explicit and passes the reason with it.
 *
 * THE FOOTER SAYS THE $940 OUT LOUD. Three leases show a county value in the
 * money column and those dollars are not in the $26,340 above them. Somebody
 * adding the column up by hand will get a different number, so the footer tells
 * them why before they wonder.
 */
export function LeaseTable({
  leases,
  showTotals,
  picker,
}: {
  leases: LeaseRecord[];
  showTotals: boolean;
  /** The lapsed lease picker, passed straight through to each row. */
  picker?: {
    activeLease: string;
    onPick: (leaseNumber: string) => void;
  };
}) {
  return (
    <TableScroll id="ls-main-table">
      <Table minWidth={1120} freezeFirstColumn>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Lease (no.)</TableHeaderCell>
            <TableHeaderCell numeric>MVestimate</TableHeaderCell>
            <TableHeaderCell numeric>County appraised (2026)</TableHeaderCell>
            <TableHeaderCell numeric className={gates("professionalOnly")}>
              Wk Δ
            </TableHeaderCell>
            <TableHeaderCell>County (acres)</TableHeaderCell>
            <TableHeaderCell>Operator</TableHeaderCell>
            <TableHeaderCell>Play</TableHeaderCell>
            <TableHeaderCell className={gates("professionalOnly")}>
              Field
            </TableHeaderCell>
            <TableHeaderCell numeric className={gates("professionalOnly")}>
              API
            </TableHeaderCell>
            <TableHeaderCell numeric className={gates("professionalOnly")}>
              RRC dist.
            </TableHeaderCell>
            <TableHeaderCell numeric>Wells</TableHeaderCell>
            <TableHeaderCell numeric>
              <abbr
                title="Your ownership share of a lease, written as a decimal — e.g. 0.00538700. Multiply gross lease dollars by it to get your share."
                className="cursor-help border-b-[1.5px] border-dotted border-mv-green-deep no-underline"
              >
                Decimal interest
              </abbr>
            </TableHeaderCell>
            <TableHeaderCell numeric>Gas (mcf)</TableHeaderCell>
            <TableHeaderCell numeric>Oil (bbl)</TableHeaderCell>
            <TableHeaderCell numeric>3-mo BOE</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Open the lease report</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {leases.map((lease) => (
            <LeaseTableRow
              key={lease.number}
              lease={lease}
              picker={
                picker
                  ? {
                      active: lease.number === picker.activeLease,
                      onPick: picker.onPick,
                    }
                  : undefined
              }
            />
          ))}

          {leases.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={16}
                className="py-8 text-center text-mv-muted"
              >
                No lease on this record matches that search. Try a lease name, a
                lease number, a county or an operator.
              </TableCell>
            </TableRow>
          )}

          {/* `lp-totalrow`: not a lease, but an all-ten-lease figure, so the
              lapsed state blurs it — the design's own comment on this row. Its
              first cell stays legible like every other first cell. */}
          {showTotals && leases.length > 0 && (
            <TableRow
              tone="total"
              className={picker ? "lp-totalrow" : undefined}
            >
              <TableCell>
                Total — {portfolioSummary.leaseCount} leases
              </TableCell>
              {/* The totals row is inside the gated column too — the design's
                    rule is `tbody td.mv-cell`, and its own comment records why:
                    "the KPI strip and the table total are ALL-TEN-LEASE figures.
                    Leaving them sharp hands back exactly what the gate
                    withholds." */}
              <TableCell numeric className={portalGate.lockedValue}>
                {formatDollars(mvestimateTotal)}
                <span className="mt-0.5 block text-[10px] font-normal text-mv-muted">
                  {/* No line break between "(" and the figure: JSX collapses
                        it to a space and the text rendered "( $875)". */}
                  MVestimate total · county placeholders{" "}
                  {`(${formatDollars(countyPlaceholderTotal)})`} shown above are
                  display-only, never summed
                </span>
              </TableCell>
              <TableCell numeric>
                ~{formatDollars(portfolioSummary.countyAppraisedTotal)}
              </TableCell>
              <TableCell
                numeric
                className={`text-[10px] text-mv-muted ${gates("professionalOnly")}`}
              >
                0.0%
              </TableCell>
              <TableCell colSpan={3}>
                <EstimateBadge />
              </TableCell>
              {/* 4 single cells + 3 + 3 + 6 = the header's 16 columns. The
                    tier-p group is its own span so the row still totals 12 when
                    those four Professional columns are hidden. */}
              <TableCell colSpan={3} className={gates("professionalOnly")} />
              <TableCell colSpan={6} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableScroll>
  );
}
