import { Badge } from "../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../_components/ui/card";
import {
  formatCompactDollars,
  formatCount,
  formatDollars,
} from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * "HOW IT MEASURES UP" — against the rest of the record, and against itself.
 *
 * ── TWO COMPARISONS, AND THEY ARE DIFFERENT QUESTIONS ──
 *
 * The left half asks how much of the reader's record rides on this one lease:
 * a rank is meaningless without the share behind it, so every rank here is
 * printed with the percentage that produced it. The right half asks how this
 * lease compares with itself — dollars per acre, realised prices, how far
 * through the gas it is — which is the only comparison available for a lease
 * that has no peer on the record.
 *
 * ── THE LAST BLOCK ON THE LEFT IS THE MODEL BEING MARKED ──
 *
 * Two bars, what the model wanted and what the state posted, for the last filed
 * month. It is the most useful thing on the page for deciding how much weight
 * to put on every projection above it, and the sentence under it settles the
 * argument the same way every time: the filing is the fact.
 */
export function MeasuresCard({ report }: { report: LeaseReport }) {
  const { lease } = report;
  const topThree = report.recordBars.slice(0, 3);
  const topThreeShare =
    report.recordTotal > 0
      ? (topThree.reduce((total, bar) => total + bar.value, 0) /
          report.recordTotal) *
        100
      : 0;

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={<h3 className="text-[15px] font-bold">How it measures up</h3>}
        action={
          <Badge tone="slate" size="xs">
            against your record, and against itself
          </Badge>
        }
      />

      <div className="mt-4 grid gap-7 lg:grid-cols-2">
        <section>
          <h4 className="text-[13.5px] font-bold">
            Where it sits among your {report.total} leases
          </h4>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <Rank rank={report.rankByValue} label="by value" share={report.shareOfRecordValue} suffix="of your record" />
            <Rank rank={report.rankLastMonth} label="last month" share={report.shareOfRecordLastMonth} suffix="of it" />
            <Rank rank={report.rankGasEver} label="gas ever" share={report.shareOfRecordGasEver} suffix="of all of it" />
          </div>

          <h5 className="mt-5 text-[12.5px] font-bold">
            How much of your record rides on it
          </h5>
          <ul className="mt-2 space-y-1.5">
            {report.recordBars.map((bar) => {
              const width =
                report.recordBars[0].value > 0
                  ? (bar.value / report.recordBars[0].value) * 100
                  : 0;
              const self = bar.slug === lease.slug;
              return (
                <li key={bar.slug} className="flex items-center gap-2.5 text-[11.5px]">
                  <span className={`w-[56px] flex-none tabular-nums ${self ? "font-bold" : "text-mv-muted"}`}>
                    {bar.label}
                  </span>
                  <span className="h-2.5 min-w-0 flex-1 rounded-full bg-mv-portal-wash">
                    <span
                      className={`block h-full rounded-full ${self ? "bg-mv-ink" : "bg-mv-line-strong"}`}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span className={`w-[62px] flex-none text-right tabular-nums ${self ? "font-bold" : "text-mv-muted"}`}>
                    {formatCompactDollars(bar.value)}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-2.5 text-[11.5px] leading-[1.55] text-mv-muted">
            This lease is {report.shareOfRecordValue.toFixed(1)}% of the{" "}
            {formatCompactDollars(report.recordTotal)} the record projects to you.
            The largest three carry {topThreeShare.toFixed(1)}% of it between
            them, so the other {report.total - 3} together are{" "}
            {(100 - topThreeShare).toFixed(1)}%.
          </p>

          <h5 className="mt-5 text-[12.5px] font-bold">
            Filed against what the model expected
          </h5>
          <div className="mt-2 space-y-2">
            <CompareBar
              label="The model wanted"
              value={report.modelWanted}
              peak={Math.max(report.modelWanted, report.statePosted)}
              tone="pale"
            />
            <CompareBar
              label="The state posted"
              value={report.statePosted}
              peak={Math.max(report.modelWanted, report.statePosted)}
              tone="dark"
            />
          </div>
          <p className="mt-2.5 text-[11.5px] leading-[1.55] text-mv-muted">
            {report.lastPosting} · MCF at your interest, and the filing is{" "}
            {report.modelMissPercent >= 0 ? "+" : ""}
            {report.modelMissPercent.toFixed(1)}% against what the model wanted.
            The filing is the fact.
          </p>
        </section>

        <section>
          <h4 className="text-[13.5px] font-bold">The ratios that compare it</h4>
          <Badge tone="slate" size="xs" className="mt-1">
            derived, not read
          </Badge>

          <dl className="mt-3 grid grid-cols-2 gap-x-5 sm:grid-cols-3">
            <Ratio label="Value per acre" value={formatDollars(report.valuePerAcre)} sub="your share" />
            <Ratio label="Realised gas" value={`$${report.realisedGas.toFixed(2)}`} sub="per MCF" />
            <Ratio label="Realised oil" value={`$${report.realisedOil.toFixed(2)}`} sub="per BBL" />
            <Ratio label="Half made by" value={report.halfMadeBy} sub={`${report.halfMadeInMonths} months out`} />
            <Ratio label="Acres per well" value={formatCount(Math.round(report.acresPerWell))} sub={`${lease.wells} on ${report.lease.acres} ac`} />
            <Ratio label="State is behind" value={`${report.stateBehindMonths} mo`} sub="measured" />
          </dl>

          <h5 className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-bold">
            How far through the gas it is
            <span className="text-[11px] font-normal text-mv-muted">
              posted against still expected
            </span>
          </h5>
          <SplitBar
            left={{ label: `Produced ${report.gasProducedPercent.toFixed(1)}%`, percent: report.gasProducedPercent, className: "bg-mv-ink text-white" }}
            right={{ label: `Ahead ${(100 - report.gasProducedPercent).toFixed(1)}%`, className: "bg-mv-portal-wash text-mv-slate" }}
          />
          <p className="mt-2 text-[11.5px] leading-[1.55] text-mv-muted">
            {report.gasProducedPercent.toFixed(1)}% of the gas this lease is
            expected to make has already been posted by the state over{" "}
            {report.postedMonths} months. The remainder is the model&apos;s, not
            a filing — and it is the part a sale would be pricing.
          </p>

          <h5 className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-bold">
            Where the projected money comes from
            <span className="text-[11px] font-normal text-mv-muted">
              across the whole projection
            </span>
          </h5>
          <SplitBar
            left={{ label: `Gas ${report.projectedGasPercent.toFixed(1)}%`, percent: report.projectedGasPercent, className: "bg-mv-green-deep text-white" }}
            right={{ label: `Oil ${report.projectedOilPercent.toFixed(1)}%`, className: "bg-mv-sand text-white" }}
          />
          <p className="mt-2 text-[11.5px] leading-[1.55] text-mv-muted">
            Oil is {report.projectedOilPercent.toFixed(1)}% of the money and{" "}
            {report.oilYield.toFixed(0)} BBL per thousand MCF of the stream —
            which is why both prices matter to you, not just the bigger number.
          </p>
          <p className="mt-2 text-[11.5px] leading-[1.55] text-mv-muted">
            Every figure here is two figures from this page divided by each
            other, so none of them can disagree with it. The two realised prices
            are the model&apos;s own cash for each product over that
            product&apos;s own volume — neither is the price your operator
            actually received: that is on a statement and is not public.
          </p>
        </section>
      </div>
    </Card>
  );
}

function Rank({
  rank,
  label,
  share,
  suffix,
}: {
  rank: number;
  label: string;
  share: number;
  suffix: string;
}) {
  return (
    <div className="border-l-[3px] border-l-mv-green pl-3">
      <p className="text-[22px] leading-tight font-bold">#{rank}</p>
      <p className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-[11.5px] text-mv-slate">
        {share.toFixed(1)}% {suffix}
      </p>
    </div>
  );
}

function CompareBar({
  label,
  value,
  peak,
  tone,
}: {
  label: string;
  value: number;
  peak: number;
  tone: "pale" | "dark";
}) {
  return (
    <div className="flex items-center gap-2.5 text-[11.5px]">
      <span className="w-[110px] flex-none text-mv-muted">{label}</span>
      <span className="h-2.5 min-w-0 flex-1 rounded-full bg-mv-portal-wash">
        <span
          className={`block h-full rounded-full ${tone === "dark" ? "bg-mv-ink" : "bg-mv-line-strong"}`}
          style={{ width: `${peak > 0 ? (value / peak) * 100 : 0}%` }}
        />
      </span>
      <span className="w-[56px] flex-none text-right font-bold tabular-nums">
        {formatCount(Math.round(value))}
      </span>
    </div>
  );
}

/** Two labelled halves of one bar — the proportion and both figures at once. */
function SplitBar({
  left,
  right,
}: {
  left: { label: string; percent: number; className: string };
  right: { label: string; className: string };
}) {
  return (
    <div className="mt-2 flex overflow-hidden rounded-[8px] text-[11.5px] font-bold">
      <span
        className={`px-3 py-1.5 text-center whitespace-nowrap ${left.className}`}
        style={{ width: `${left.percent}%` }}
      >
        {left.label}
      </span>
      <span className={`flex-1 px-3 py-1.5 text-center whitespace-nowrap ${right.className}`}>
        {right.label}
      </span>
    </div>
  );
}

function Ratio({
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
      <dd className="mt-0.5 text-[15px] font-bold tabular-nums">{value}</dd>
      <dd className="text-[11px] text-mv-muted">{sub}</dd>
    </div>
  );
}
