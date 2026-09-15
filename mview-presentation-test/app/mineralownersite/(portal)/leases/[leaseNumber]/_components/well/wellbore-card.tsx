import { Card, CardHeader } from "../../../../../_components/ui/card";
import { formatCount } from "../../../_lib/lease-format";
import type { WellReport } from "../../_lib/well-report";
import { HoleDiagram } from "./hole-diagram";

/**
 * "THE WELLBORE" — the state's record, the hole drawn to scale, and what the
 * two together say.
 *
 * ── "ON THE RECORD" IS FOUR GROUPS, NOT ONE LIST OF EIGHTEEN ──
 *
 * Eighteen label-and-value pairs in one undifferentiated column is a reference
 * table a reader has to read linearly to find anything in. They are not one
 * kind of fact: four say WHICH hole this is, five describe the hole itself,
 * three are its history, and six are how it has performed. A reader arrives
 * wanting one of those four things, and the headings let them skip the other
 * three.
 *
 * ── "TOTAL DEPTH" IS GONE BECAUSE IT WAS "TRUE VERTICAL" TWICE ──
 *
 * The row read `Total depth · TVD` and printed `report.trueVerticalFt` — the
 * same figure the row two below it prints under its own name. Two rows, one
 * number, and the one labelled "total" was the one that was not the total:
 * this hole is 10,688 ft of pipe and 10,561 ft of depth, and "total depth"
 * claiming the smaller of those is the wrong way round. The measured figure is
 * already on the list as "Measured", so nothing is lost by dropping it — and
 * losing it is what makes the count even.
 *
 * ── THE COMPARISONS ARE AGAINST THE RESERVOIR, NOT THE LEASE ──
 *
 * A completion is judged against the other wells in the same rock, whatever
 * lease each happens to sit on, because that is the set it is geologically
 * comparable with. And the first bullet says what a good number there means: a
 * completion doing better than the rock around it is a good WELL, not a better
 * piece of ground — which is the distinction that decides whether a reader
 * should expect the next well on their acreage to do the same.
 *
 * ── THE SHARE PAIR IS THE ONE MOST WORTH READING TWICE ──
 *
 * "15.6% of the open interval and 27.9% of the gas" is not a boast about size.
 * It says this hole produces more of the reservoir's gas than its share of the
 * perforated footage — a statement about where the completion was put, not how
 * much of it was perforated.
 */
export function WellboreCard({ report }: { report: WellReport }) {
  const { well, lease } = report;

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">
            Well {well.name} — the wellbore
          </h3>
        }
      />

      {/* THE GUTTER IS ASYMMETRIC ON PURPOSE, and it took three goes to land.
          14px to the left of the rule, 28px to its right.

`divide-x` DRAWS THE RULE ON THE FIRST COLUMN'S OWN RIGHT BORDER, which is
          the thing to know here: the grid's `gap-x` therefore opens BEYOND the
          rule, not before it. Setting the gap to 14 moved the diagram right and
          left the cards still touching the line. The air on this side has to be
          `pr` on the first column, and it is. The gap stays zero.

          40px either side pushed the cards adrift; zero had them butting into
          it. 14 and 28 is the middle: the cards carry their own borders, so
          they need less air than the diagram, which has none.

          `gap-y` is separate because below `lg` there is no rule at all — the
          two sections stack, and that gap is the only thing between them. */}
      <div className="mt-4 grid gap-y-8 lg:grid-cols-2 lg:gap-x-0 lg:divide-x lg:divide-mv-line">
        <section className="lg:pr-[14px]">
          <h4 className="text-[13.5px] font-bold">On the record</h4>

          {/* FOUR GROUPS, NOT EIGHTEEN ROWS. See the note at the top of the
              file for why the list is broken up and how an odd group closes. */}
          <div className="mt-1">
            <FactGroup
              heading="Identity"
              facts={[
                {
                  label: "API number",
                  value: well.api,
                  sub: `wellbore ${report.wellboreApi}`,
                },
                {
                  label: "Lease",
                  value: lease.number ?? lease.name,
                  sub: "district 02",
                },
                {
                  label: "Reservoir",
                  value: lease.reservoir,
                  sub: "from the well roster field name",
                },
                { label: "Field", value: report.fieldLabel, sub: lease.county },
              ]}
            />

            <FactGroup
              heading="The hole"
              facts={[
                { label: "Type", value: well.type, sub: "approved" },
                {
                  label: "True vertical",
                  value: `${formatCount(report.trueVerticalFt)} ft`,
                  sub: "straight down from the surface",
                },
                {
                  label: "Measured",
                  value: `${formatCount(report.measuredFt)} ft`,
                  sub:
                    report.extraHoleFt > 0
                      ? `${formatCount(report.extraHoleFt)} ft of hole is not straight down`
                      : "the hole goes straight down",
                },
                {
                  label: "Open interval",
                  value: `${formatCount(well.openTopFt)}–${formatCount(well.openBottomFt)} ft`,
                  sub: `${formatCount(report.openFeet)} ft of hole, measured depth`,
                },
                {
                  label: "Lateral",
                  value: well.lateralFt
                    ? `${formatCount(well.lateralFt)} ft ${well.bearing ?? ""}`.trim()
                    : "none — a straight hole",
                  sub: report.bottomAngle
                    ? `bottom hole ${report.bottomAngle}° from the surface hole`
                    : "surface and bottom hole are the same point",
                },
              ]}
            />

            <FactGroup
              heading="Its history"
              facts={[
                {
                  label: "Spudded",
                  value: report.spudded,
                  sub: `${report.ageYears.toFixed(1)} years old`,
                },
                {
                  label: "First production",
                  value: report.firstProduction,
                  sub: `${report.allocatedMonths} filed months allocated`,
                },
                {
                  label: "Drilled by",
                  value: well.drilledBy,
                  sub: `${lease.operator} runs it now`,
                },
              ]}
            />

            <FactGroup
              heading="How it performs"
              facts={[
                {
                  label: "Gas per foot open",
                  value: `${formatCount(Math.round(report.gasPerFootOpen))} MCF`,
                  sub: `over ${formatCount(report.openFeet)} ft of open hole`,
                },
                {
                  label: "Oil yield",
                  value: `${report.oilYield.toFixed(0)} BBL`,
                  sub: "per thousand MCF of the stream",
                },
                {
                  label: "Decline",
                  value:
                    report.declinePerMonth === null
                      ? "not a clear curve"
                      : `${report.declinePerMonth.toFixed(1)}% a month`,
                  sub: "compounded across its filed record",
                },
                {
                  label: "Best month against now",
                  value: `${formatCount(Math.round(report.trailingAverageGas))} MCF`,
                  sub: `last twelve · peak was ${formatCount(Math.round(report.bestMonthGas))}`,
                },
                {
                  label: "How far through its gas",
                  value: `${report.gasProducedPercent.toFixed(1)}%`,
                  sub: "filed against filed plus projected",
                },
                {
                  label: "In its reservoir",
                  value: `#${report.rankByGas} of ${report.peerCount}`,
                  sub: "by filed gas, whatever lease each sits on",
                },
              ]}
            />
          </div>
        </section>

        <section className="lg:pl-7">
          <HoleDiagram report={report} />

          <h4 className="mt-5 text-[13.5px] font-bold">What this well says</h4>
          <ul className="mt-2 divide-y divide-mv-line">
            {[
              <>
                Per foot of open interval it does{" "}
                {formatCount(Math.round(report.gasPerFootOpen))} MCF against{" "}
                {formatCount(Math.round(report.peerGasPerFootOpen))} for the{" "}
                {report.peerCount} of your wells in this reservoir —{" "}
                {report.gasPerFootVsPeersPercent >= 0 ? "+" : ""}
                {report.gasPerFootVsPeersPercent.toFixed(1)}%. A completion doing
                better than the rock around it is a good one, not a better piece
                of ground.
              </>,
              <>
                It is {report.openIntervalSharePercent.toFixed(1)}% of the open
                interval your wells have in this reservoir and{" "}
                {report.gasSharePercent.toFixed(1)}% of the gas they have filed
                from it.{" "}
                {report.gasSharePercent > report.openIntervalSharePercent
                  ? "More of the production than of the completion — which is a statement about where it was put, not about how much of it was perforated."
                  : "Less of the production than of the completion, so the footage it has is not where the best of this rock sits."}
              </>,
              <>
                {report.oilProducedPercent.toFixed(1)}% of its oil is filed
                against {report.gasProducedPercent.toFixed(1)}% of its gas, so
                what is left in this wellbore is gassier than what has come out
                of it.
              </>,
              <>
                Among the {report.peerCount} of your wells in {report.reservoir}{" "}
                it is number {report.rankByGas} by filed gas — which is the set
                it is geologically comparable with, whatever lease each one sits
                on.
              </>,
              <>
                Its best month was {report.bestMonth} at{" "}
                {formatCount(Math.round(report.bestMonthGas))} MCF; the last
                twelve average {formatCount(Math.round(report.trailingAverageGas))}
                , which is{" "}
                {(
                  (report.trailingAverageGas / Math.max(report.bestMonthGas, 1) -
                    1) *
                  100
                ).toFixed(1)}
                % of that peak. Every well declines — the number is here so a
                quiet month can be read against it.
              </>,
              <>
                It has filed {formatCount(Math.round(report.gasPerFootOpen))} MCF
                for every foot it is open. Hold that against wells drilled the
                same way as this one: in a vertical the gas arrives from the
                whole drained radius rather than from the perforated length, so
                the figure is not comparable across a horizontal and a vertical.
              </>,
              <>
                The hole runs {formatCount(report.measuredFt)} ft measured
                against {formatCount(report.trueVerticalFt)} ft straight down —{" "}
                {formatCount(report.extraHoleFt)} ft of it is not vertical, and
                only {formatCount(report.openFeet)} ft of the whole thing is open
                to the rock.
              </>,
            ].map((item, position) => (
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

interface WellFact {
  label: string;
  value: string;
  sub: string;
}

/**
 * One labelled group of the record, two facts to a row.
 *
 * EACH FACT IS ITS OWN CARD. They were rows divided by hairlines, which reads
 * as a table and invites a reader to compare down the column — but these are
 * eighteen unrelated properties of one hole, not eighteen values of one thing.
 * A bordered card says "this is one fact" and stops the eye running down.
 *
 * AN ODD GROUP CLOSES ON A FULL-WIDTH CARD rather than leaving a hole. Two of
 * these four groups have an odd number of facts, and in a plain two-column grid
 * that leaves the last one sitting beside an empty cell — which reads as a fact
 * that failed to load rather than as the end of a list. Spanning it closes the
 * group cleanly, and it happens to suit the two that land there: "1,042 ft NNE"
 * and the operator's name are the longest values here.
 */
function FactGroup({
  heading,
  facts,
}: {
  heading: string;
  facts: WellFact[];
}) {
  const odd = facts.length % 2 === 1;

  return (
    <section className="mt-4 first:mt-3">
      <h5 className="text-[10px] font-bold tracking-[0.1em] text-mv-green-deep uppercase">
        {heading}
      </h5>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {facts.map((fact, position) => (
          <Fact
            key={fact.label}
            {...fact}
            wide={odd && position === facts.length - 1}
          />
        ))}
      </dl>
    </section>
  );
}

function Fact({
  label,
  value,
  sub,
  wide = false,
}: WellFact & { wide?: boolean }) {
  return (
    <div
      className={`rounded-md border border-mv-line bg-mv-card px-3.5 py-2.5 ${
        wide ? "sm:col-span-2" : ""
      }`.trim()}
    >
      <dt className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[14px] leading-[1.35] font-bold">{value}</dd>
      <dd className="text-[11px] text-mv-muted">{sub}</dd>
    </div>
  );
}
