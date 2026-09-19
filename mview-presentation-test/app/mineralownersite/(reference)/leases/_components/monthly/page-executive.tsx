import type { MonthlyReport } from "../../_lib/monthly-report";
import { threeYearOutlook } from "../../_lib/report-outlook";
import { ReportHeading, ReportList, ReportPageCard } from "./report-page";
import { useReport } from "./report-context";

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
  const { fmt, summary } = useReport();
  const fall = report.vsYearAgoPercent;

  /* ── THE SERVICE WRITES THESE THREE COLUMNS ──
     Nine sentences, and it writes all nine. They were composed here instead,
     out of `useReport().summary` — which is the STATIC portfolio fixture, not
     the record on screen. The header said "3 of 4 leases filed" off the served
     totals while the column beneath it said "10 leases … run by 3 operators,
     with 10 wells", because the two were reading different sources. The
     service's own sentence for that record is "4 leases across 1 county, run by
     1 operator".

     Rendered VERBATIM. They arrive with the figures already in them and already
     formatted; re-deriving any of them here is what produced the disagreement
     in the first place. The composed versions stay as the fixture path's, which
     is the only path that has no served sentences to print. */
  const served = report.served?.summary;
  const column = (index: number, fallback: (string | React.ReactNode)[]) =>
    served?.[index]?.bullets.length ? served[index].bullets : fallback;
  const heading = (index: number, fallback: string) =>
    served?.[index]?.heading || fallback;

  return (
    <ReportPageCard
      number={1}
      id="executive-summary"
      title="Executive summary"
      lead={`Where ${report.month} leaves this portfolio, in three readings.`}
    >
      <div className="mt-4 grid gap-6 lg:grid-cols-3 lg:divide-x lg:divide-mv-line">
        <section className="lg:pr-6">
          <ReportHeading>{heading(0, "Portfolio")}</ReportHeading>
          <ReportList
            items={column(0, [
              `${fmt.num(summary.leaseCount)} leases across ${fmt.num(summary.counties)} county, run by ${fmt.num(summary.operators)} operators, with ${fmt.num(summary.wells)} wells on the roster.`,
              `${fmt.num(summary.leaseCount)} of them were producing at the last posted month, and ${fmt.num(report.filedCount)} filed for ${report.month} itself.`,
              <>
                Your modelled value across the whole record is{" "}
                {fmt.compactDollars(summary.mvestimate)}, held at your own
                decimal interest on every lease rather than one blended rate.
              </>,
            ])}
          />
        </section>

        <section className="lg:px-6">
          <ReportHeading>{heading(1, "This month")}</ReportHeading>
          <ReportList
            items={column(1, [
              <>
                {fmt.dollars(report.yourShare)} to you:{" "}
                {fmt.count(Math.round(report.yourGas))} MCF of gas and{" "}
                {fmt.count(Math.round(report.yourOil))} BBL of oil, off{" "}
                {fmt.compactVolume(report.wholeGas)} MCF filed on the whole
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
            ])}
          />
        </section>

        <section className="lg:pl-6">
          <ReportHeading>{heading(2, "Risks and what to do")}</ReportHeading>
          <ReportList
            items={column(2, [
              <>
                The three-year projection has your monthly share falling{" "}
                {Math.abs(threeYearOutlook.shareChangePercent).toFixed(1)}% by{" "}
                {threeYearOutlook.toMonth}. That is ordinary decline, not
                distress — plan around a shrinking cheque rather than a steady
                one.
              </>,
              <>
                {fmt.num(report.leaseCount - report.filedCount)} lease
                {report.leaseCount - report.filedCount === 1
                  ? " did"
                  : "s did"}{" "}
                not file this month. Give it two more cycles before treating a
                gap as a stoppage; the state posts late far more often than a
                well stops.
              </>,
              "None of this is a statement. The public record carries volumes, not the price your operator actually received or the deductions they applied — if a cheque disagrees with this report, the cheque is the document to ask about.",
            ])}
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
