import {
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
  formatDollars,
} from "../../_lib/lease-format";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { operatorMonth, operatorRollups } from "../../_lib/operator-rollup";
import { ReportFacts, ReportPageCard } from "./report-page";

/**
 * PAGE 8 · OPERATOR ANALYSIS — who runs these leases, and how much sits behind
 * each of them.
 *
 * ── THE PAGE EXISTS TO SHOW A CONCENTRATION THAT LOOKS LIKE DIVERSIFICATION ──
 *
 * Ten leases sounds spread out. On this record one company runs eight of them
 * and carries 98% of the modelled value, so that single operator's decisions —
 * when to work a well over, when to shut one in, how promptly to file — move
 * more of the reader's income than any individual well does. Nothing else in
 * the portal groups the record this way, and the grouping is the finding.
 *
 * THE GREEN PARAGRAPH IS THE READING, the grey one above it the facts. Splitting
 * them means a reader can take the numbers and disagree with the interpretation,
 * which is the right relationship to offer for a judgement this consequential.
 */
export function PageOperators({ report }: { report: MonthlyReport }) {
  const rollups = operatorRollups();

  return (
    <ReportPageCard
      number={8}
      id="operator-analysis"
      title="Operator analysis"
      chip={`${rollups.length} operators`}
      lead="The companies running your leases, and how much of you sits behind each."
    >
      <div className="mt-2 divide-y divide-mv-line">
        {rollups.map((operator) => {
          const month = operatorMonth(operator.name, report.index);

          return (
            <section key={operator.name} className="py-5 first:pt-3">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <h4 className="text-[14px] font-bold">{operator.name}</h4>
                  <span className="text-[11.5px] text-mv-muted">
                    operator {operator.number}
                  </span>
                </div>
                <span className="text-[16px] font-bold tabular-nums">
                  {formatCompactDollars(operator.value)}
                </span>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <ReportFacts
                  rows={[
                    {
                      label: "Your leases with them",
                      value: `${operator.leaseCount} — ${operator.unitNames.join(", ")}`,
                    },
                    { label: "Counties", value: operator.counties.join(", ") },
                    { label: "Running since", value: operator.runningSince },
                    {
                      label: "Filed to date on your leases",
                      value: `${formatCompactVolume(operator.filedGas)} MCF gas, ${formatCompactVolume(operator.filedOil)} BBL oil`,
                    },
                    {
                      label: "Your value behind them",
                      value: (
                        <>
                          <strong>{formatDollars(operator.value)}</strong> ·{" "}
                          {operator.valuePercent.toFixed(1)}% of your record
                        </>
                      ),
                    },
                  ]}
                />

                <div className="space-y-3 text-[13px] leading-[1.6]">
                  <p className="text-mv-slate">
                    {operator.name} runs {operator.leaseCount} of your leases
                    across {operator.counties.length} county and {operator.wells}{" "}
                    well{operator.wells === 1 ? "" : "s"}. Those leases have
                    filed {formatCompactVolume(operator.filedGas)} MCF of gas and{" "}
                    {formatCompactVolume(operator.filedOil)} BBL of oil since they
                    started
                    {operator.runningSince === "not recorded"
                      ? "."
                      : `, the earliest in ${operator.runningSince}.`}
                  </p>

                  <p className="font-semibold text-mv-green-deep">
                    {operator.valuePercent.toFixed(1)}% of your modelled value
                    sits behind this operator, and they carry {month.filed} of{" "}
                    {month.total} filings for {report.month}, worth{" "}
                    {formatCount(Math.round(month.gas))} MCF and{" "}
                    {formatCount(Math.round(month.oil))} BBL to you.{" "}
                    {operator.leaseCount > 1
                      ? "Several leases behind one operator means one company's decisions move more of your income than any single well does."
                      : "A single lease with a single operator: your exposure here is to one company's choices about one piece of acreage."}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </ReportPageCard>
  );
}
