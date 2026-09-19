import { Card, CardHeader } from "../../../../../_components/ui/card";
import { formatCount } from "../../../_lib/lease-format";
import type { ReservoirReport } from "../../_lib/reservoir-report";

/**
 * "THE ROCK ITSELF" — the record on the left, what it says on the right.
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
  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">
            {report.name} — the rock itself
          </h3>
        }
      />

      {/* `divide-x` draws the rule on the FIRST column's own right border, so
          the air before it is that column's `pr` and not the grid's `gap-x` —
          see the same note in `well/wellbore-card.tsx`. */}
      {/* TWO COLUMNS, THE RECORD AND WHAT IT SAYS — but the right-hand side is
          the SERVICE'S sentences now, not ones composed here. See the note by
          the list itself.

          The air before the second column is that column's own `pl` and not the
          grid's `gap-x`, so the divider sits midway between the two rather than
          hard against the right-hand one. */}
      <div className="mt-4 grid gap-y-8 lg:grid-cols-2 lg:gap-x-0 lg:divide-x lg:divide-mv-line">
        <section className="lg:pr-[14px]">
          <h4 className="text-[13.5px] font-bold">On the record</h4>

          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <Fact
              label="Reservoir"
              value={report.name}
              sub="as the state files it"
            />
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
              sub={
                report.wellCount === 1
                  ? "the only well here"
                  : "all in the same month"
              }
            />
          </dl>

          {/* HOW THE SERVICE KNOWS WHICH ROCK THIS IS, in its own words.
              This was a fixed sentence — "read from the bracket in the field
              name, because the reservoir field itself is blank" — which is one
              of several ways the rock gets identified and was simply untrue on
              a lease identified another way. The service names its own basis
              per reservoir, and on this lease it says the opposite: "named
              outright in the lease well roster's own reservoir field". A
              provenance line that states the wrong provenance is worse than
              none.

              The fixed sentence survives as the fallback, for the fixture path,
              where the bracket IS how those ten leases were read. */}
          <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
            {report.basisNote ??
              "Read from the bracket in the field name — because the reservoir field itself is blank on these records. Measured on this record: where both a field and a bracket exist they agree exactly, and the roster and the well master agree with each other, which is what makes the bracket safe to read."}
          </p>
        </section>

        {/* ── THE PROSE COLUMN THAT USED TO SIT HERE IS GONE ──
            "What only this page can say" composed seven sentences in the
            browser out of the fields on the left. The service now sends its own
            — `reservoirs[].insights`, rendered by `ServedReservoirReport` — and
            they were the SAME SENTENCES, near enough word for word, printed
            twice on one screen four inches apart.

            Running both cost more than the repetition. The two disagreed: this
            column divided only the FILED cash by the acreage and printed $120
            an acre beside the service's $128, and it wrote "63.9% of that peak"
            for a figure that is the FALL from the peak, not the proportion of
            it — the proportion was 36.1%. Two texts saying one thing is two
            chances to say it wrong.

            The service's list is also the fuller one: twelve bullets against
            seven on a lease with several wells, including the spread between
            the best and weakest well, the interval every well shares, how
            concentrated the filing is, and how many wells in the same rock the
            reader holds on OTHER leases. None of those are fields, so this
            column could never have said them.

            WHAT STAYS IS THE COLUMN ON THE LEFT. The tile grid is not
            duplicated anywhere and is the only place the depths, the
            perforated interval, the operators and the filed range are stated
            as figures. Recoverable from git history if the prose is wanted
            back. */}
        {report.insights && report.insights.length > 0 && (
          <section className="lg:pl-7">
            <h4 className="text-[13.5px] font-bold">What the record says</h4>

            <ul className="mt-2 divide-y divide-mv-line">
              {report.insights.map((line, position) => (
                <li
                  key={position}
                  className="flex items-start gap-3 py-2.5 text-[13px] leading-[1.6] text-mv-slate"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-mv-green"
                  />
                  <span className="min-w-0">{line}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
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
    <div className="rounded-md border border-mv-line bg-mv-card px-3.5 py-2.5">
      <dt className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[14px] leading-[1.35] font-bold">{value}</dd>
      <dd className="text-[11px] text-mv-muted">{sub}</dd>
    </div>
  );
}
