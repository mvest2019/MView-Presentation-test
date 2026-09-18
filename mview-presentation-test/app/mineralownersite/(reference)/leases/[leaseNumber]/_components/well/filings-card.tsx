import { ExternalLink, FileText } from "lucide-react";

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
import { PrototypeButton } from "../../../../../_components/ui/prototype-button";
import type { WellFiling, WellReport } from "../../_lib/well-report";

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
      />

      <TableScroll className="mt-3">
        <Table roomy minWidth={820}>
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
 * "ATTACHMENTS" — the scanned paper behind the filings above.
 *
 * ── ONE FULL-WIDTH ROW PER DOCUMENT, NOT A GRID OF TILES ──
 *
 * Each document is a packet with a form title, a tracking number and a date,
 * and a reader deciding whether to open one is choosing between those facts. A
 * bare underlined filename makes them open it to find out what it is.
 *
 * THEY ARE ROWS BECAUSE THERE ARE USUALLY ONE OR TWO. In a three-column grid a
 * lone document sits in a third of a very wide card with nothing beside it, and
 * the card reads as half-built — which is exactly what it looked like. A row
 * fills the width it is given whatever the count, and the facts line up in
 * columns down the list when there is more than one.
 *
 * ── THE FOOTNOTE IS WHAT SAYS WHICH KIND OF NOTHING THE GAPS ARE ──
 *
 * About half the rows in this collection carry a scan, so a filing with no
 * document is a gap in what was scanned rather than proof that no filing was
 * made. A reader who takes the second reading concludes the operator never
 * filed, which is a far stronger claim than the record supports — and it is the
 * reading a bare "1 of 2" invited, which is why the count is not in the heading.
 *
 * ── THE EMPTY STATE IS A SENTENCE, NOT AN EMPTY GRID ──
 *
 * A wellbore with no scans at all gets the paragraph instead. A card showing
 * "0 of 2" over blank space states the same fact by implication and makes the
 * reader do the work.
 */
export function AttachmentsCard({ report }: { report: WellReport }) {
  const withDocument = report.filings.filter((filing) => filing.document);

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      {/* No count beside the heading. The footnote below already says what a
          missing document means, which is the part worth stating; "1 of 2" on
          its own invited the reading that the other filing is unaccounted for
          rather than simply unscanned. */}
      <CardHeader
        title={<h3 className="text-[15px] font-bold">Attachments</h3>}
      />

      {withDocument.length === 0 ? (
        <p className="mt-3 text-[12.5px] leading-[1.6] text-mv-slate">
          The record carries no document for this wellbore&apos;s filings.
          Roughly half the rows in this collection have one, so an absence here
          is a gap in what was scanned rather than a filing that was never made.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {withDocument.map((filing) => (
            <li key={filing.name}>
              <DocumentRow filing={filing} />
            </li>
          ))}
        </ul>
      )}

      {/* ONE LINE. The long version explained why a dozen form names map to one
          file; that argument belongs in the reference list itself, not under a
          card with a single row in it. What survives is the part that stops a
          reader hunting for a missing W-2: it is a page inside this. */}
      <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
        Each link opens the filing as the Commission holds it — one document per
        filing, not one per form. The W-2, L-1 and P-4 are pages inside it.
      </p>
    </Card>
  );
}

/**
 * One document, as a row.
 *
 * THE ACTION IS A `PrototypeButton` BECAUSE THERE IS NOTHING BEHIND IT YET. An
 * `<a href>` that goes nowhere is the one thing this card must not have: it is
 * a card about documents that exist, and a dead link makes a reader doubt the
 * document rather than the build. The button says what it is when pressed.
 */
function DocumentRow({ filing }: { filing: WellFiling }) {
  const document = filing.document;
  if (!document) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-mv border border-mv-line bg-mv-card px-4 py-3.5">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-mv-mint text-mv-green-deep"
      >
        <FileText className="h-[19px] w-[19px]" />
      </span>

      {/* `basis` with `min-w-0` is what lets the title block take the slack in
          the row and still wrap rather than pushing the facts off the end. */}
      <div className="min-w-0 flex-1 basis-[220px]">
        <p className="text-[13px] leading-tight font-bold">{filing.name}</p>
        <p className="mt-1 text-[11.5px] leading-[1.5] text-mv-muted">
          {document.permitType}
        </p>
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        <RowFact label="Tracking" value={document.tracking} />
        <RowFact label="Drilled" value={document.filedOn} />
      </dl>

      <PrototypeButton
        icon={<ExternalLink aria-hidden="true" className="h-4 w-4" />}
        acknowledgement="Opened ✓ (prototype)"
        title="Opens the Commission's scan of this filing. Not connected yet."
      >
        Open document
      </PrototypeButton>
    </div>
  );
}

/** A label over its value, for the facts sitting mid-row. */
function RowFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[12.5px] font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

