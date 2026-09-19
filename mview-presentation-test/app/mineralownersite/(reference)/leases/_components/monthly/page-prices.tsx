import { PRICE_SETTLEMENTS } from "../../_lib/report-fixtures";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { ReportFootnote, ReportPageCard } from "./report-page";

/**
 * PAGE 10 · PRICES THIS MONTH — the settlements the income is priced against.
 *
 * ── FOUR BENCHMARKS, AND ONLY TWO OF THEM PRICE ANYTHING HERE ──
 *
 * WTI prices the oil and Henry Hub prices the gas. Brent and propane are on the
 * page because readers see them quoted everywhere and reasonably wonder whether
 * they matter — so each card says exactly what its benchmark does and does not
 * do for this record. A price list with no explanation invites the reader to
 * multiply the wrong number by their volume.
 *
 * ── THE FIGURES ARE THE MONTH'S, NOT TODAY'S ──
 *
 * The pinned bar at the top of the portal moves daily. A report about one month
 * must not: a document whose figures change between two readings makes every
 * other figure in it suspect. See the note on the fixture.
 */
export function PagePrices({ report }: { report: MonthlyReport }) {
  /* The service's four contracts when the report came from it, the fixture's
     when it did not. `display` is rendered as sent — see `ServedMonthly`. */
  const prices = report.served?.commodities ?? PRICE_SETTLEMENTS;

  return (
    <ReportPageCard
      number={10}
      id="prices"
      title="Prices this month"
      chip="published settlements"
      lead="The settlements your income is priced against."
    >
      <div className="mt-4 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {prices.map((price) => (
          <div
            key={price.label}
            className="rounded-mv border border-mv-line bg-mv-card px-[18px] py-4 shadow-mv"
          >
            <p className="text-[11px] font-bold tracking-[0.08em] text-mv-muted uppercase">
              {price.label} · {price.unit}
            </p>
            <p className="mt-1 text-[26px] leading-tight font-bold tabular-nums">
              {price.display}
            </p>
            <p className="mt-0.5 text-[11.5px] font-semibold tabular-nums">
              <span
                className={
                  price.changePercent >= 0
                    ? "text-mv-green-deep"
                    : "text-mv-down"
                }
              >
                {price.changePercent >= 0 ? "+" : ""}
                {price.changePercent.toFixed(1)}%
              </span>{" "}
              <span className="font-normal text-mv-muted">· {price.stamp}</span>
            </p>
            <p className="mt-2 text-[12px] leading-[1.55] text-mv-slate">
              {price.note}
            </p>
          </div>
        ))}
      </div>

      {/* THE SERVICE'S OWN CAPTION when it sent one — it explains what the
          block above means for THIS record, where the sentence below is a
          general statement written once. The fixture path keeps the general
          one, which is all it has. */}
      <ReportFootnote>
        {report.served?.commodityNote || (
          <>
            Published settlements from the U.S. Energy Information
            Administration, not the price your operator actually received. A
            statement carries that, and the gap between the two is the
            differential and the deducts.
          </>
        )}
      </ReportFootnote>
    </ReportPageCard>
  );
}
