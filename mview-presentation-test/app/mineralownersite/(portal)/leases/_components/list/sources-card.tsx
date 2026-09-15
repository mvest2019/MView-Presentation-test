import { Badge } from "../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../_components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../../_components/ui/table";
import { leaseSourceRows } from "../../_lib/lease-sources";

/**
 * "WHERE EACH FIGURE COMES FROM" — the provenance of the table above it.
 *
 * ── IT SITS INSIDE THE LIST PANEL, NOT UNDER THE TAB STRIP ──
 *
 * Its four rows describe the LEASE TABLE's columns — which wells belong to each
 * lease, the decimal interest behind every owner-share figure. Below the tabs it
 * would also appear under the Financials chart and the monthly report, where
 * none of those rows answers anything on screen. Inside the panel it stays
 * attached to the thing it explains.
 *
 * ── PROFESSIONAL ONLY ──
 *
 * Provenance is the densest thing on the page and the least often wanted: it
 * answers "which record says so", which is a question the tier that reads raw
 * decimal interests asks and the plain-language tier does not. Ultra,
 * Essentials and Detailed never see it. Nothing is lost — the same sourcing is
 * repeated on each lease report against the one lease a reader is questioning.
 *
 * ── LAST ON THE PANEL, WHICH IS THE RIGHT PLACE FOR IT ──
 *
 * A reader who accepts the numbers never needs it; a reader who does not is at
 * the bottom of the table by the time they start looking.
 *
 * THE "ONE FILING PER CLAIM" CHIP is the scope of the whole card: every figure
 * comes off a single filing per claimed interest, not an average across several.
 * It sits in the header because it qualifies all four rows.
 */
export function SourcesCard() {
  return (
    <Card padded={false} className="mt-4 px-[18px] py-[14px]">
      <CardHeader
        className="mb-3"
        title={
          <h3 className="text-[14px] font-bold">
            Where each figure comes from
          </h3>
        }
        action={
          <Badge tone="slate" size="sm">
            one filing per claim
          </Badge>
        }
      />

      <TableScroll>
        <Table minWidth={640}>
          <TableHead>
            <TableRow className="bg-mv-portal-wash">
              <TableHeaderCell>Source</TableHeaderCell>
              <TableHeaderCell>What it answers here</TableHeaderCell>
              {/* Right-aligned against the card's edge: it is the column a
                  reader scans down rather than reads across, and pinning it to
                  the margin is what makes four different answers line up. */}
              <TableHeaderCell className="text-right">As of</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaseSourceRows.map((row) => (
              <TableRow key={row.source}>
                <TableCell className="font-bold whitespace-nowrap">
                  {row.source}
                </TableCell>
                <TableCell>{row.answers}</TableCell>
                <TableCell className="text-right whitespace-nowrap text-mv-muted">
                  {row.asOf}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>
    </Card>
  );
}
