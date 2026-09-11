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
import type { WellReport } from "../../_lib/well-report";

/**
 * "EVERY FILING ON THIS WELLBORE" — the documents, newest first.
 *
 * ── THE FOOTNOTE IS THE WHOLE REASON THE TABLE IS NOT COLLAPSED ──
 *
 * Two rows with the same dates look like a duplicate and are not. Each is a
 * separate DOCUMENT filed on the same hole: a completion report and the well
 * record beside it, and a recompletion years later would add a third. The
 * newest row is what the wellbore is today; the ones behind it are what was
 * done to get there. De-duplicating them would throw away the history the
 * table exists to show.
 *
 * Only the completion report records a perforated interval, so the other row
 * carries a dash rather than a repeat of it — printing the same interval twice
 * would imply the state recorded it twice.
 */
export function FilingsCard({ report }: { report: WellReport }) {
  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">
            Every filing on this wellbore — {report.filings.length} filings
          </h3>
        }
        action={
          <Badge tone="slate" size="xs">
            newest first
          </Badge>
        }
      />

      <TableScroll className="mt-3">
        <Table minWidth={820}>
          <TableHead>
            <TableRow className="bg-mv-portal-wash">
              <TableHeaderCell>Filing</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Drilled</TableHeaderCell>
              <TableHeaderCell>Recompleted</TableHeaderCell>
              <TableHeaderCell>Perforated</TableHeaderCell>
              <TableHeaderCell numeric>Fracced</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.filings.map((filing) => (
              <TableRow key={filing.name}>
                <TableCell className="font-bold whitespace-nowrap">
                  {filing.name}
                </TableCell>
                <TableCell>{filing.type}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {filing.drilled}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {filing.recompleted}
                </TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">
                  {filing.perforated ?? (
                    <span className="text-mv-muted">—</span>
                  )}
                </TableCell>
                <TableCell numeric>{filing.fracced ? "yes" : "no"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>

      <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
        Each row is a separate filing rather than a duplicate of the one above
        it: a recompletion is a new document on the same hole. The newest is what
        the wellbore is today, and the ones behind it are what was done to get
        there.
      </p>
    </Card>
  );
}

/**
 * "ATTACHMENTS" — and on this wellbore, the absence of them.
 *
 * IT SAYS WHICH KIND OF NOTHING IT IS, which is the only reason the card is
 * worth shipping. About half the rows in this collection carry a scanned
 * document, so an empty one here is a gap in what was scanned rather than proof
 * that no filing was made. A reader who takes the second reading concludes the
 * operator never filed — which is a much stronger claim than the record
 * supports.
 */
export function AttachmentsCard() {
  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={<h3 className="text-[15px] font-bold">Attachments</h3>}
        action={
          <Badge tone="slate" size="xs">
            no document filed against this wellbore
          </Badge>
        }
      />
      <p className="mt-3 text-[12.5px] leading-[1.6] text-mv-slate">
        The record carries no document for this wellbore&apos;s filings. Roughly
        half the rows in this collection have one, so an absence here is a gap in
        what was scanned rather than a filing that was never made.
      </p>
    </Card>
  );
}
