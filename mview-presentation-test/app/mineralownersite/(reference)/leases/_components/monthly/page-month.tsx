import { KpiTile } from "../../../../_components/ui/kpi-tile";
import {
  formatCompactVolume,
  formatCount,
  formatDollars,
} from "../../_lib/lease-format";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { ReportList, ReportPageCard } from "./report-page";

/**
 * PAGE 2 · THE MONTH — the four figures, then what they say.
 *
 * THE BULLETS ARE WRITTEN FROM THE DATA, NOT CHOSEN FROM A LIST. Which lease
 * carried the month, which fell hardest, which rose and why a rise is usually a
 * late filing catching up rather than wells speeding up — each is the report
 * reading its own rows. That last point matters: a reader who sees +18% and
 * assumes new production will be disappointed next month, and the report is the
 * only thing in a position to warn them.
 *
 * THE LAST BULLET IS THE DISCLAIMER AND IT SITS INSIDE THE LIST rather than in
 * a footnote, because it is about the headline figure directly above it.
 */
export function PageMonth({ report }: { report: MonthlyReport }) {
  const missing = report.leaseCount - report.filedCount;
  const top = report.leases[0];

  return (
    <ReportPageCard
      number={2}
      id="the-month"
      title="The month"
      lead={`What ${report.month} was worth to you, and how it was made up.`}
    >
      <div className="mt-4 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          locked
          label="Your share of the month"
          value={formatDollars(report.yourShare)}
          basis={`across ${report.filedCount} reporting leases`}
        />
        <KpiTile
          label="Your gas"
          value={`${formatCount(Math.round(report.yourGas))} MCF`}
          basis={`of ${formatCompactVolume(report.wholeGas)} MCF filed on the whole leases`}
        />
        <KpiTile
          label="Your oil"
          value={`${formatCount(Math.round(report.yourOil))} BBL`}
          basis="net of what never reached the sales meter"
        />
        {/* The accent marks the tile that is a COUNT rather than a quantity —
            it is the one figure on the row that can make the other three
            misleading if it is not read. */}
        <KpiTile
          accent
          label="Leases reporting"
          value={`${report.filedCount} of ${report.leaseCount}`}
          basis={
            missing > 0 ? "the rest are behind, not stopped" : "all filed on time"
          }
        />
      </div>

      <h4 className="mt-5 text-[14px] font-bold">What the month says</h4>
      <ReportList
        items={[
          <>
            {report.filedCount} of your {report.leaseCount} leases filed
            production in {report.month}.{" "}
            {missing > 0
              ? `${missing} did not — a lease can file late, and a missing month is far more often the posting lag than a well that stopped.`
              : "Nothing is outstanding."}
          </>,
          top && (
            <>
              {top.title} carried the month:{" "}
              {formatCount(Math.round(top.yourGas))} MCF to you,{" "}
              {report.topLease.gasPercent.toFixed(1)}% of your gas.
            </>
          ),
          report.steepestFall?.changePercent != null && (
            <>
              {report.steepestFall.title} fell{" "}
              {report.steepestFall.changePercent.toFixed(1)}% against{" "}
              {report.priorMonth}. On a decline curve a fall is normal; a steep
              one is worth a question to the operator.
            </>
          ),
          report.steepestRise?.changePercent != null && (
            <>
              {report.steepestRise.title} rose +
              {report.steepestRise.changePercent.toFixed(1)}% — usually a lease
              that filed late catching up, rather than the wells speeding up.
            </>
          ),
          <>
            Your share of the month is {formatDollars(report.yourShare)} across{" "}
            {report.leaseCount} leases. That is the model&apos;s figure for the
            volumes filed, not an amount owed — deductions and the price your
            operator actually got are on the statement, not in the public record.
          </>,
        ].filter(Boolean)}
      />
    </ReportPageCard>
  );
}
