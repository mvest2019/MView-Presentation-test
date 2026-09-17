import { formatCompactDollars, formatCompactVolume, formatCount, formatDollars } from "../../_lib/lease-format";
import { portfolioSummary } from "../../_lib/lease-totals";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { threeYearOutlook } from "../../_lib/report-outlook";
import { ReportHeading, ReportList, ReportPageCard } from "./report-page";

/**
 * PAGE 1 · EXECUTIVE SUMMARY — the month in three readings.
 *
 * THE THIRD COLUMN IS THE REASON THE PAGE EXISTS. "Portfolio" and "This month"
 * are facts a reader could assemble from the pages below; "Risks and what to
 * do" is the only place the report commits to an interpretation — and it commits
 * in both directions, naming the decline as ordinary rather than alarming and
 * the missing filing as a lag rather than a stoppage. A summary that only
 * flagged things would train a reader to dread the page.
 *
 * The last bullet is the standing one: this is the public record, not a
 * statement, and where the two disagree the cheque governs. It is repeated at
 * the foot of the report because a reader who only ever opens page 1 still has
 * to be told.
 */
export function PageExecutive({ report }: { report: MonthlyReport }) {
  const fall = report.vsYearAgoPercent;

  return (
    <ReportPageCard
      number={1}
      id="executive-summary"
      title="Executive summary"
      lead={`Where ${report.month} leaves this portfolio, in three readings.`}
    >
      <div className="mt-4 grid gap-6 lg:grid-cols-3 lg:divide-x lg:divide-mv-line">
        <section className="lg:pr-6">
          <ReportHeading>Portfolio</ReportHeading>
          <ReportList
            items={[
              `${portfolioSummary.leaseCount} leases across ${portfolioSummary.counties} county, run by ${portfolioSummary.operators} operators, with ${portfolioSummary.wells} wells on the roster.`,
              `${portfolioSummary.leaseCount} of them were producing at the last posted month, and ${report.filedCount} filed for ${report.month} itself.`,
              <>
                Your modelled value across the whole record is{" "}
                {formatCompactDollars(portfolioSummary.mvestimate)}, held at your
                own decimal interest on every lease rather than one blended rate.
              </>,
            ]}
          />
        </section>

        <section className="lg:px-6">
          <ReportHeading>This month</ReportHeading>
          <ReportList
            items={[
              <>
                {formatDollars(report.yourShare)} to you:{" "}
                {formatCount(Math.round(report.yourGas))} MCF of gas and{" "}
                {formatCount(Math.round(report.yourOil))} BBL of oil, off{" "}
                {formatCompactVolume(report.wholeGas)} MCF filed on the whole
                leases.
              </>,
              <>
                That is {signed(fall)} against {report.yearAgoMonth}, a year
                earlier — the honest comparison on a decline curve, because it
                takes seasonality out of it.
              </>,
              <>
                {report.topLease.title} alone is{" "}
                {report.topLease.sharePercent.toFixed(1)}% of the month.{" "}
                {report.topLease.sharePercent > 50
                  ? "One lease carries most of it, so its operator's decisions carry most of your income."
                  : "No single lease dominates the month."}
              </>,
            ]}
          />
        </section>

        <section className="lg:pl-6">
          <ReportHeading>Risks and what to do</ReportHeading>
          <ReportList
            items={[
              <>
                The three-year projection has your monthly share falling{" "}
                {Math.abs(threeYearOutlook.shareChangePercent).toFixed(1)}% by{" "}
                {threeYearOutlook.toMonth}. That is ordinary decline, not
                distress — plan around a shrinking cheque rather than a steady
                one.
              </>,
              <>
                {report.leaseCount - report.filedCount} lease
                {report.leaseCount - report.filedCount === 1 ? " did" : "s did"}{" "}
                not file this month. Give it two more cycles before treating a
                gap as a stoppage; the state posts late far more often than a
                well stops.
              </>,
              "None of this is a statement. The public record carries volumes, not the price your operator actually received or the deductions they applied — if a cheque disagrees with this report, the cheque is the document to ask about.",
            ]}
          />
        </section>
      </div>
    </ReportPageCard>
  );
}

/** "-20.2%" or "+4.1%", or a dash where there is no year-ago month to compare. */
function signed(percent: number | null): string {
  if (percent === null) return "no comparable month";
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}
