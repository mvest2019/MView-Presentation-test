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
import { OWNER_SHARE, type FinancialsScope } from "../../_lib/financials-record";
import { formatCount, formatDollars } from "../../_lib/lease-format";
import {
  monthlyRows,
  MONTHLY_WINDOW_COPY,
  STEEP_DROP_PERCENT,
} from "../../_lib/monthly-rows";

/**
 * "MONTH BY MONTH" — the chart above it, as figures.
 *
 * ── IT IS NOT A DUPLICATE OF THE CHART ──
 *
 * The chart answers "what shape is this in"; the table answers "what exactly
 * did February do". Those are different questions and neither format answers
 * the other one well — a reader who wants to check a statement against a month
 * cannot read a value off a polyline, and a reader who wants to see a decline
 * cannot see one in sixty rows.
 *
 * ── THE LAST COLUMN IS THE ONLY ONE THAT IS NOT A MEASUREMENT ──
 *
 * Month-on-month change is arithmetic on the two columns beside it, and it is
 * there because production is lumpy: a reader who sees a smaller number than
 * last month needs to know whether that is the ordinary two or three percent or
 * something that warrants opening a statement. Only falls steeper than 15% are
 * coloured — colouring every negative month would paint about half the table
 * red and teach the reader to ignore it.
 *
 * ── AND "projected" IS ON EVERY MODELLED ROW, NOT JUST THE FIRST ──
 *
 * The chip repeats on all twelve forecast rows rather than sitting once in a
 * header. A reader scrolled halfway into the table sees no header, and a
 * modelled month that looks like a filed one is the same failure the chart's
 * dashed line exists to prevent.
 */
export function MonthTable({ scope }: { scope: FinancialsScope }) {
  const rows = monthlyRows(scope === "share" ? OWNER_SHARE : 1);

  return (
    <Card padded={false} className="mt-4 px-[18px] py-[14px]">
      <CardHeader
        className="mb-3"
        title={<h3 className="text-[14px] font-bold">Month by month</h3>}
        action={
          <Badge tone="slate" size="sm">
            {MONTHLY_WINDOW_COPY}
          </Badge>
        }
      />

      <TableScroll>
        <Table minWidth={720}>
          <TableHead>
            <TableRow className="bg-mv-portal-wash">
              <TableHeaderCell>Month</TableHeaderCell>
              <TableHeaderCell numeric>Gas (MCF)</TableHeaderCell>
              <TableHeaderCell numeric>Oil (BBL)</TableHeaderCell>
              <TableHeaderCell numeric>Cash flow</TableHeaderCell>
              <TableHeaderCell numeric>Vs prior month</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.index}>
                <TableCell className="font-bold whitespace-nowrap">
                  {row.month}
                </TableCell>
                <TableCell numeric>{formatCount(Math.round(row.gas))}</TableCell>
                <TableCell numeric>{formatCount(Math.round(row.oil))}</TableCell>
                <TableCell numeric>{formatDollars(row.cash)}</TableCell>
                <TableCell numeric>
                  <span className="inline-flex items-center justify-end gap-2">
                    <ChangeFigure percent={row.changePercent} />
                    {row.projected && (
                      <Badge tone="estimate" size="xs">
                        projected
                      </Badge>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>
    </Card>
  );
}

/**
 * The signed percentage. `+` is written explicitly because a bare "2.6" beside
 * a "-2.4" reads as a missing sign rather than a rise, and both are rounded to
 * one decimal — the second one would be false precision on a figure derived
 * from a monthly filing.
 */
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
