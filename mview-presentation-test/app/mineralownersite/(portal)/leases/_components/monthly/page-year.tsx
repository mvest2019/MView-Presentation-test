import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../../_components/ui/table";
import { formatCount, formatDollars } from "../../_lib/lease-format";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { ReportList, ReportPageCard } from "./report-page";

/**
 * PAGE 12 · THE YEAR SO FAR, AND WHERE THIS COMES FROM.
 *
 * ── THE LAST PAGE IS THE PROVENANCE, AND THAT IS THE RIGHT PLACE FOR IT ──
 *
 * A reader who accepts the figures never needs it. A reader who does not is at
 * the bottom of the report by the time they start looking, and what they want is
 * not a bibliography — it is the three steps between a state filing and the
 * number on page 2, and a plain statement of what the report is not.
 *
 * ── "WHAT THIS REPORT IS NOT" IS NOT BOILERPLATE ──
 *
 * Three specific things, each of which has caused a real misunderstanding: the
 * figures are revised after publication, the projections are a model at a fixed
 * price deck, and none of it is a statement of account. The last one carries the
 * rule the whole report defers to — where this and a cheque disagree, the cheque
 * is the document that governs.
 *
 * HOW MANY YEARS SHOW: only the ones ahead of and including the current one,
 * newest first. The record goes back to 2009, but the early years are one lease
 * on its own and reading them beside a ten-lease year invites a comparison that
 * is not there.
 */

/** Years printed on the page — enough to see a trend, few enough to read. */
const YEARS_SHOWN = 6;

export function PageYear({ report }: { report: MonthlyReport }) {
  const years = report.years.slice(0, YEARS_SHOWN);

  return (
    <ReportPageCard
      number={12}
      id="year-so-far"
      title="The year so far, and where this comes from"
      lead="Year by year, how the record is built, and what it cannot tell you."
    >
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-[14px] font-bold">Year by year</h4>
          <TableScroll>
            <Table minWidth={400}>
              <TableHead>
                <TableRow className="bg-mv-portal-wash">
                  <TableHeaderCell>Year</TableHeaderCell>
                  <TableHeaderCell numeric>Your gas</TableHeaderCell>
                  <TableHeaderCell numeric>Your oil</TableHeaderCell>
                  <TableHeaderCell numeric>Your share</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {years.map((year) => (
                  <TableRow key={year.year}>
                    <TableCell className="font-bold whitespace-nowrap">
                      {year.year}
                      {/* A part year cannot be compared with a whole one, so it
                          is labelled rather than left to look like a collapse. */}
                      {year.partial && (
                        <span className="ml-1 font-normal text-mv-muted">
                          (part)
                        </span>
                      )}
                    </TableCell>
                    <TableCell numeric>
                      {formatCount(Math.round(year.gas))}
                    </TableCell>
                    <TableCell numeric>
                      {formatCount(Math.round(year.oil))}
                    </TableCell>
                    <TableCell numeric>{formatDollars(year.share)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        </div>

        <div>
          <h4 className="mb-2 text-[14px] font-bold">Where this comes from</h4>
          <ol className="list-decimal space-y-2.5 pl-5 text-[13px] leading-[1.6] text-mv-slate">
            <li>
              <strong>Sourced from the public record.</strong> Every well, lease
              and volume here comes from Texas Railroad Commission filings and
              the county appraisal roll. Nothing is entered by hand and nothing
              is estimated where a filing exists.
            </li>
            <li>
              <strong>Joined to your own interest.</strong> The roll gives your
              decimal interest on each lease. Every &ldquo;your share&rdquo;
              figure is that lease&apos;s own filing at that lease&apos;s own
              interest — never a blended rate applied across the portfolio.
            </li>
            <li>
              <strong>Projected past the boundary.</strong> The state runs two to
              three months behind, so the filed record ends at {report.month}.
              Past that the decline model carries each lease forward at a fixed
              price deck, and every projected figure in this report is marked as
              one.
            </li>
          </ol>
        </div>
      </div>

      <h4 className="mt-5 text-[14px] font-bold">What this report is not</h4>
      <ReportList
        items={[
          "Figures are drawn from Texas Railroad Commission filings and county appraisal records. Both are revised: operators amend filings and the roll is restated each year, so a month can change after it is first published.",
          "Projections are produced by a decline model at a fixed price deck. They are estimates of what the filed months imply, not a forecast of the market and not a guarantee of future production.",
          "This report is not a statement of account and Mineral View is not a financial, legal or investment adviser. It carries no deductions, no differential and no post-production cost, because none of those are public. Where it disagrees with a cheque, the cheque is the document that governs.",
        ]}
      />
    </ReportPageCard>
  );
}
