import Link from "next/link";

import { leaseReportPath } from "../../_lib/lease-routes";
import type { MonthlyReport, ReportLeaseRow } from "../../_lib/monthly-report";
import { ReportFacts, ReportList, ReportPageCard } from "./report-page";
import { useReport } from "./report-context";

/**
 * PAGE 4 · LEASE ANALYSIS — each lease against its own last twelve filed months.
 *
 * ── "AGAINST ITS OWN" IS THE WHOLE METHOD ──
 *
 * Comparing a lease to the portfolio, or to last month, tells a reader almost
 * nothing: these leases differ by two orders of magnitude in size and every one
 * of them is on a decline curve, so "down on last month" is the normal state of
 * a healthy well. Measured against its OWN twelve-month range, a month is
 * either inside the band the lease has been running in or it is not — and only
 * the second case is worth a phone call.
 *
 * ── THE LAST BULLET IS THE MODEL MARKING ITS OWN HOMEWORK ──
 *
 * "Its last filing came in -11.6% against what the model expected." Nothing else
 * in the portal shows the projection being wrong, and a reader deciding how much
 * weight to put on the three-year outlook two pages later deserves to know how
 * far off the model has been on this particular lease. The line always ends the
 * same way: where the two disagree, the filing is the fact.
 */
export function PageLeaseAnalysis({ report }: { report: MonthlyReport }) {
  /* THE LEASES ON THIS REPORT, not the portfolio fixture's count. The chip read
     `summary.leaseCount` — the static figure — and said "10 leases" over a list
     of 782. */
  const leaseCount = report.leases.length || 0;
  const { fmt } = useReport();
  return (
    <ReportPageCard
      number={4}
      id="lease-analysis"
      title="Lease analysis"
      chip={`${fmt.num(leaseCount)} leases`}
      lead="Each lease against its own last twelve filed months."
    >
      <div className="mt-2 divide-y divide-mv-line">
        {report.leases.map((lease) => (
          <LeaseBlock key={lease.slug} lease={lease} report={report} />
        ))}
      </div>
    </ReportPageCard>
  );
}

function LeaseBlock({
  lease,
  report,
}: {
  lease: ReportLeaseRow;
  report: MonthlyReport;
}) {
  const { fmt } = useReport();
  return (
    <section className="py-5 first:pt-3">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <Link
            href={leaseReportPath(lease.slug)}
            className="text-[14px] font-bold text-mv-green-deep underline"
          >
            {lease.title}
          </Link>
          <span className="text-[11.5px] text-mv-muted">
            {lease.county} · {lease.operator}
          </span>
        </div>
        <span className="text-[16px] font-bold tabular-nums">
          {fmt.dollars(lease.yourShare)}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportFacts
          rows={[
            {
              label: "Acreage and wells",
              /* THE SERVICE'S `well_note` AND `completion_span` WHEN IT SENT
                 THEM — "4 wells, 4 drilled sideways" and "2020–2025". How the
                 holes were drilled and the years they came on are facts the
                 well count cannot carry, and this row was stating the count
                 twice instead. The composed version is the fixture's. */
              value: lease.wellNote
                ? `${fmt.acres(lease.acres)} acres, ${lease.wellNote}${lease.completionSpan ? `; completed ${lease.completionSpan}` : ""}`
                : `${fmt.acres(lease.acres)} acres, ${lease.wells} well${lease.wells === 1 ? "" : "s"}; first production ${lease.firstPosting}`,
            },
            { label: "Reservoir", value: lease.reservoir },
            {
              label: "This month",
              value: lease.filed
                ? `${lease.gasPerDay.toFixed(1)} MCF/d and ${lease.oilPerDay.toFixed(1)} BBL/d on the whole lease`
                : "not filed",
            },
            {
              label: "Lease revenue",
              value: fmt.dollars(lease.leaseRevenue),
            },
            {
              label: "Your revenue",
              value: (
                <>
                  <strong>{fmt.dollars(lease.yourShare)}</strong> at{" "}
                  {fmt.decimalInterest(lease.decimalInterest)}
                </>
              ),
            },
            {
              label: "Operators",
              /* EVERY company that has run it, with its dates — the service
                 sends the whole history and the row printed only the first. */
              value: lease.pastOperators.length
                ? lease.pastOperators.join(" · ")
                : lease.operatorRange,
            },
          ]}
        />

        <ReportList
          items={[
            <>
              Over the last 12 filed months this lease averaged{" "}
              {lease.trailing.avgGasPerDay.toFixed(1)} MCF and{" "}
              {lease.trailing.avgOilPerDay.toFixed(1)} BBL a day, ranging from{" "}
              {lease.trailing.lowGasPerDay.toFixed(1)} to{" "}
              {lease.trailing.highGasPerDay.toFixed(1)} MCF a day.
            </>,
            <>
              Its strongest month was {lease.trailing.bestMonth} at{" "}
              {lease.trailing.highGasPerDay.toFixed(1)} MCF a day; its weakest
              was {lease.trailing.worstMonth} at{" "}
              {lease.trailing.lowGasPerDay.toFixed(1)}.
            </>,
            <>
              Your best month on it was {lease.trailing.bestCashMonth} at{" "}
              {fmt.dollars(lease.trailing.bestCash)}, your thinnest{" "}
              {lease.trailing.thinCashMonth} at{" "}
              {fmt.dollars(lease.trailing.thinCash)}.
            </>,
            <>
              The stream yields {lease.barrelsPerMmcf.toFixed(1)} BBL of oil for
              every thousand MCF of gas — which product carries your money
              depends on that ratio and on where the two prices sit.
            </>,
            <>
              Its last filing came in {lease.modelMissPercent >= 0 ? "+" : ""}
              {lease.modelMissPercent.toFixed(1)}% against what the model
              expected. Where the two disagree the filing is the fact.
            </>,
            !lease.filed && (
              <>
                It did not file for {report.month}, so nothing on this page is
                measured for that month — the figures above end at its own last
                filing.
              </>
            ),
          ].filter(Boolean)}
        />
      </div>
    </section>
  );
}
