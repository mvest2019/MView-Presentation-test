import { formatCount, formatDollars } from "../../_lib/lease-format";
import type { MonthlyReport, ReportLeaseRow } from "../../_lib/monthly-report";
import { ReportList, ReportPageCard } from "./report-page";

/**
 * PAGE 9 · WHAT THIS MEANS FOR YOUR CASH FLOW — lease by lease, in plain terms.
 *
 * ── IT SAYS WHAT THE NEXT STATEMENT WILL LOOK LIKE, WHICH NO OTHER PAGE DOES ──
 *
 * Every page above reports what happened. This one turns each lease into the
 * only sentence most readers want: is the next cheque going to look like the
 * last few, or thinner, or fatter. The test is the lease against its own
 * twelve-month average, for the reason page 4 gives — these leases differ by two
 * orders of magnitude and are all declining, so nothing else is a fair baseline.
 *
 * ── AND IT WARNS WHERE THE MODEL HAS BEEN WRONG ON THAT SPECIFIC LEASE ──
 *
 * A lease whose last filing missed the model badly gets a second sentence
 * telling the reader to treat its projection as the looser of the two numbers.
 * The threshold is deliberately wide: flagging every small miss would bury the
 * ones that matter.
 */

/** A month within this band of its own average is "much like the last few". */
const STEADY_BAND_PERCENT = 10;

/** A model miss wider than this is worth warning about on the lease itself. */
const NOTABLE_MISS_PERCENT = 20;

export function PageCashFlow({ report }: { report: MonthlyReport }) {
  return (
    <ReportPageCard
      number={9}
      id="cash-flow"
      title="What this means for your cash flow"
      lead="Lease by lease, in plain terms."
    >
      <ReportList
        items={report.leases.map((lease) => (
          <LeaseSentence key={lease.slug} lease={lease} />
        ))}
      />
    </ReportPageCard>
  );
}

function LeaseSentence({ lease }: { lease: ReportLeaseRow }) {
  if (!lease.filed) {
    return (
      <>
        {lease.title}: did not file this month, so nothing here is measured for
        it — that is the posting lag far more often than a well that stopped.
      </>
    );
  }

  const gap = lease.trailing.vsAveragePercent;
  const steady = Math.abs(gap) <= STEADY_BAND_PERCENT;
  const missWide = Math.abs(lease.modelMissPercent) >= NOTABLE_MISS_PERCENT;

  return (
    <>
      {lease.title}: filed {formatCount(Math.round(lease.yourGas))} MCF and{" "}
      {formatCount(Math.round(lease.yourOil))} BBL to you this month, worth{" "}
      {formatDollars(lease.yourShare)}.{" "}
      {steady ? (
        <>
          It is sitting close to its own twelve-month average, so the next
          statements should look much like the last few.
        </>
      ) : gap < 0 ? (
        <>
          It is running {Math.abs(gap).toFixed(1)}% below its own twelve-month
          average, so expect the next statements to be thinner than the last year
          has been.
        </>
      ) : (
        <>
          It is running {gap.toFixed(1)}% above its own twelve-month average —
          welcome, but a single strong month on a decline curve is usually a
          catch-up rather than a new level.
        </>
      )}
      {missWide && (
        <>
          {" "}
          The model was {lease.modelMissPercent >= 0 ? "+" : ""}
          {lease.modelMissPercent.toFixed(1)}% out on its last filed month here;
          treat its projection for this lease as the looser of the two numbers.
        </>
      )}
    </>
  );
}
