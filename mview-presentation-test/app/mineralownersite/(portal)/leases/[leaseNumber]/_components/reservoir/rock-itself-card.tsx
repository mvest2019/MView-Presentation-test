import { Badge } from "../../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../../_components/ui/card";
import {
  formatAcres,
  formatCount,
  formatDollars,
} from "../../../_lib/lease-format";
import type { ReservoirReport } from "../../_lib/reservoir-report";

/**
 * "THE ROCK ITSELF" — the record on the left, the reading on the right.
 *
 * ── THE SPLIT IS THE POINT OF THE CARD ──
 *
 * Left is what the state holds: depth, perforated interval, how the wells were
 * drilled, when they came on. Right is what only a page that has joined those
 * records together can say — that the oil is further through than the gas, that
 * the remainder would take four years at the recent rate, that a figure per
 * foot cannot be compared across wells drilled differently. A reader can take
 * the left column and disagree with the right.
 *
 * ── SEVERAL BULLETS EXIST TO STOP A COMPARISON, NOT TO MAKE ONE ──
 *
 * Gas per foot open is on the page because it is the honest way to compare two
 * wells drilled the same way, and the bullet immediately says it is useless
 * across a horizontal and a vertical. Dollars per acre is there because it
 * does not reward whichever rock happens to hold more of the reader's acreage.
 * Ratios that look comparable and are not are the most reliable way to mislead
 * somebody with true numbers.
 */
export function RockItselfCard({ report }: { report: ReservoirReport }) {
  const { lease } = report;

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">{report.name} — the rock itself</h3>
        }
        action={
          <Badge tone="slate" size="xs">
            named from the well roster field name
          </Badge>
        }
      />

      <div className="mt-4 grid gap-7 lg:grid-cols-2 lg:divide-x lg:divide-mv-line">
        <section>
          <h4 className="text-[13.5px] font-bold">On the record</h4>

          <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
            <Fact label="Reservoir" value={report.name} sub="as the state files it" />
            <Fact
              label="Your wells in it"
              value={formatCount(report.wellCount)}
              sub={`${report.leasesWithWells} of your leases`}
            />
            <Fact
              label="Depth found at"
              value={`${formatCount(report.depthFt)} ft`}
              sub={`average ${formatCount(report.depthFt)} ft`}
            />
            <Fact
              label="Perforated interval"
              value={`${formatCount(report.openTopFt)}–${formatCount(report.openBottomFt)} ft`}
              sub="measured depth, across every well"
            />
            <Fact
              label="How they are drilled"
              value={`${report.directionalCount} directional`}
              sub={`${report.directionalCount} well${report.directionalCount === 1 ? "" : "s"} go${report.directionalCount === 1 ? "es" : ""} sideways`}
            />
            <Fact
              label="Average lateral"
              value={
                report.averageLateralFt
                  ? `${formatCount(report.averageLateralFt)} ft`
                  : "none recorded"
              }
              sub="across the wells that have one"
            />
            <Fact
              label="Operators in it"
              value={formatCount(report.operators.length)}
              sub={report.operators.join(", ").toUpperCase()}
            />
            <Fact
              label="Filed record runs"
              value={`${report.filedFrom} →`}
              sub={report.filedTo}
            />
            <Fact
              label="Gas per foot open"
              value={`${formatCount(Math.round(report.gasPerFootOpen))} MCF`}
              sub={`over ${formatCount(report.openFeet)} ft in ${report.wellCount} well${report.wellCount === 1 ? "" : "s"}`}
            />
            <Fact
              label="Oil yield"
              value={`${report.oilYield.toFixed(0)} BBL`}
              sub="per thousand MCF of the stream"
            />
            <Fact
              label="Decline"
              value={
                report.declinePerMonth === null
                  ? "not a clear curve"
                  : `${report.declinePerMonth.toFixed(1)}% a month`
              }
              sub="compounded across the filed record"
            />
            <Fact
              label="Best month"
              value={report.bestMonth}
              sub={`${formatCount(Math.round(report.bestMonthGas))} MCF · last twelve average ${formatCount(Math.round(report.trailingAverageGas))}`}
            />
            <Fact
              label="How far through the gas"
              value={`${report.gasProducedPercent.toFixed(1)}%`}
              sub="filed against filed plus projected"
            />
            <Fact
              label="Wells came on"
              value={report.wellsCameOn}
              sub={report.wellCount === 1 ? "the only well here" : "all in the same month"}
            />
          </dl>

          <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
            Read from the bracket in the field name — because the reservoir field
            itself is blank on these records. Measured on this record: where both
            a field and a bracket exist they agree exactly, and the roster and the
            well master agree with each other, which is what makes the bracket
            safe to read.
          </p>
        </section>

        <section className="lg:pl-7">
          <h4 className="text-[13.5px] font-bold">What only this page can say</h4>

          <ul className="mt-2 divide-y divide-mv-line">
            {[
              <>
                {report.oilProducedPercent.toFixed(1)}% of the oil is already
                filed against {report.gasProducedPercent.toFixed(1)}% of the gas,
                so what is left in this rock is gassier than what has come out of
                it — the gas price matters more to the remainder than the history
                suggests.
              </>,
              <>
                At the rate of the last twelve filed months the gas the model
                still expects would take about{" "}
                {report.yearsLeftAtRecentRate.toFixed(1)} years to come out. That
                is the model&apos;s own remainder divided by the recent rate, not
                a second forecast — and a decline means the real tail is longer
                and thinner than a flat division suggests.
              </>,
              <>
                Its best month was {report.bestMonth} at{" "}
                {formatCount(Math.round(report.bestMonthGas))} MCF; the last
                twelve average {formatCount(Math.round(report.trailingAverageGas))},
                which is {report.bestMonthGapPercent.toFixed(1)}% of that peak.{" "}
                {report.declinePerMonth === null
                  ? "Its filed record does not fall cleanly enough to state a rate."
                  : `It is falling about ${report.declinePerMonth.toFixed(1)}% a month across the filed record.`}
              </>,
              <>
                Over the {formatAcres(lease.acres)} acres of yours that sit in it,
                this rock is worth {formatDollars(report.valuePerAcre)} an acre to
                you, filed and projected together. That is the figure that
                compares one reservoir with another: unlike a total it does not
                reward whichever rock happens to have more of your acreage, and
                unlike a rate per foot it does not depend on how the wells were
                drilled.
              </>,
              <>
                It has paid you {formatDollars(report.paidYouFiled)} on the filed
                months and the model has {formatDollars(report.stillAheadCash)}{" "}
                still ahead of it. Both are this reservoir&apos;s share of each
                lease&apos;s cash, split by what its wells&apos; volumes are worth
                — a lease with wells in two reservoirs cannot hand all of its
                money to one of them.
              </>,
              <>
                Across {formatCount(report.openFeet)} ft of open interval in{" "}
                {report.wellCount} well{report.wellCount === 1 ? "" : "s"} it has
                filed {formatCount(Math.round(report.gasPerFootOpen))} MCF of gas
                for every foot the wells are open. It compares wells drilled the
                same way as each other. A horizontal open over thousands of feet
                and a vertical open over tens are not comparable per foot, so it
                is not a figure to hold a differently drilled reservoir against.
              </>,
              <>
                The {report.wellCount === 1 ? "one well" : `${report.wellCount} wells`}{" "}
                here {report.wellCount === 1 ? "is" : "are"} open from{" "}
                {formatCount(report.openTopFt)} to {formatCount(report.openBottomFt)}{" "}
                ft of measured depth — {formatCount(report.openFeet)} ft of hole,
                which is what this reservoir is being drained through.
              </>,
              report.otherLeasesInRock > 0 && (
                <>
                  Beyond this lease you hold {report.otherWellsInRock} more well
                  {report.otherWellsInRock === 1 ? "" : "s"} in {report.name}, on{" "}
                  {report.otherLeasesInRock} other lease
                  {report.otherLeasesInRock === 1 ? "" : "s"}. This report is
                  about this lease&apos;s wells in it; open another lease to see
                  its own. What an operator learns in this rock on one lease
                  usually shows up on the others.
                </>
              ),
            ]
              .filter(Boolean)
              .map((item, position) => (
                <li
                  key={position}
                  className="flex items-start gap-3 py-2.5 text-[13px] leading-[1.6] text-mv-slate"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-mv-green"
                  />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </Card>
  );
}

function Fact({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border-b border-mv-portal-hairline py-2.5">
      <dt className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[14px] leading-[1.35] font-bold">{value}</dd>
      <dd className="text-[11px] text-mv-muted">{sub}</dd>
    </div>
  );
}
