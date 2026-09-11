import { Badge } from "../../../_components/ui/badge";
import { Card, CardHeader } from "../../../_components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../_components/ui/table";
import { leaseSourceRows } from "../_lib/lease-sources";

/**
 * "WHERE EACH FIGURE COMES FROM" — the provenance of the table above it.
 *
 * THE LAST SECTION ON THE PAGE, AND THAT IS THE RIGHT PLACE FOR IT. A reader who
 * accepts the numbers never needs it; a reader who does not is looking for it by
 * the time they reach the bottom, and it answers the question they are actually
 * asking — not "where did you get this" but "which record says so, and how old
 * is that record".
 *
 * THE "ONE FILING PER CLAIM" CHIP is the scope of the whole card: every figure
 * on this page comes off a single filing per claimed interest, not an average
 * across several. It sits in the header because it qualifies all four rows.
 */
export function SourcesCard() {
  return (
    <Card padded={false} className="mt-4 px-[18px] py-[14px]">
      <CardHeader
        className="mb-3"
        title={
          <h2 className="text-[14px] font-bold">Where each figure comes from</h2>
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
              <TableHeaderCell>As of</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaseSourceRows.map((row) => (
              <TableRow key={row.source}>
                <TableCell className="font-semibold whitespace-nowrap">
                  {row.source}
                </TableCell>
                <TableCell>{row.answers}</TableCell>
                <TableCell className="whitespace-nowrap text-mv-muted">
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
