import { Card, CardHeader } from "../../../../_components/ui/card";
import { formatCompactVolume } from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";
import { Donut, DonutDot, type DotShade } from "./donut";

/**
 * "HOW MUCH OF IT IS LEFT" — produced against the model's remainder.
 *
 * ── THE WORD "RESERVES" IS DOING SOMETHING DANGEROUS, SO EVERY CARD QUALIFIES IT ──
 *
 * A produced volume is a filing: it happened, the state has it, it can be
 * checked. A reserve is a model output — nobody filed it and nobody has
 * promised it. The two sit side by side here because the comparison is the
 * point, and the only thing that keeps that honest is saying "the model's
 * remainder, not a filing" on both of them rather than once in a footnote.
 *
 * ── GAS ON THE LEFT, OIL ON THE RIGHT, ONE RULE DOWN THE MIDDLE ──
 *
 * The same shape as the well and reservoir reports, which ask this question of
 * their own scopes. It was a four-column row of tiles above a two-column row of
 * rings, each with its own dividers, so the line between the two products broke
 * and restarted between the rows and the card read as two unrelated tables. A
 * reader compares gas with gas: the grouping should be the product, and the
 * rule should say so once.
 *
 * ── THE DOT IS A KEY, WHICH IS WHY RESERVES ARE PALE ──
 *
 * Each figure's dot is the shade of the ring segment it names — strong for what
 * has been produced, pale for what is still ahead. The tiles here carried no
 * dot at all, so nothing connected "gas reserves" to the pale arc beside it.
 *
 * ── THE RING IS SHARED WITH THE OTHER TWO REPORTS ──
 *
 * All three ask "how much of it is left" of different scopes, and the answer
 * has to look identical or they read as different measurements. See `donut.tsx`.
 */
export function ReservesCard({ report }: { report: LeaseReport }) {
  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={<h3 className="text-[15px] font-bold">How much of it is left</h3>}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-mv-line">
        <Half
          tone="gas"
          producedLabel="Gas produced"
          producedValue={`${formatCompactVolume(report.gasProduced)} MCF`}
          producedSub={`over ${report.postedMonths} posted months`}
          reservesLabel="Gas reserves"
          reservesValue={`${formatCompactVolume(report.gasReserves)} MCF`}
          unit="Gas · MCF"
          percent={report.gasProducedPercent}
          note={`${report.gasProducedPercent.toFixed(1)}% of the gas this lease is expected to make has already been posted.`}
          className="lg:pr-7"
        />
        <Half
          tone="oil"
          producedLabel="Oil produced"
          producedValue={`${formatCompactVolume(report.oilProduced)} BBL`}
          producedSub="oil and condensate together"
          reservesLabel="Oil reserves"
          reservesValue={`${formatCompactVolume(report.oilReserves)} BBL`}
          unit="Oil · BBL"
          percent={report.oilProducedPercent}
          note="Oil is oil and condensate together, as the state files them."
          className="lg:pl-7"
        />
      </div>
    </Card>
  );
}

/** One product: its two figures as cards, a rule, and the ring they add to. */
function Half({
  tone,
  producedLabel,
  producedValue,
  producedSub,
  reservesLabel,
  reservesValue,
  unit,
  percent,
  note,
  className = "",
}: {
  tone: "gas" | "oil";
  producedLabel: string;
  producedValue: string;
  producedSub: string;
  reservesLabel: string;
  reservesValue: string;
  unit: string;
  percent: number;
  note: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="grid gap-2 sm:grid-cols-2">
        <Stat
          tone={tone}
          label={producedLabel}
          value={producedValue}
          sub={producedSub}
        />
        <Stat
          tone={tone}
          shade="pale"
          label={reservesLabel}
          value={reservesValue}
          sub="the model's remainder, not a filing"
        />
      </div>

      <div className="mt-4 border-t border-mv-line pt-5">
        <Donut
          unit={unit}
          tone={tone}
          percent={percent}
          produced={producedValue}
          ahead={reservesValue}
          note={note}
        />
      </div>
    </div>
  );
}

function Stat({
  tone,
  shade,
  label,
  value,
  sub,
}: {
  tone: "gas" | "oil";
  shade?: DotShade;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-md border border-mv-line bg-mv-card px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        <DonutDot tone={tone} shade={shade} />
        {label}
      </p>
      <p className="mt-1 text-[18px] leading-tight font-bold tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[11.5px] text-mv-muted">{sub}</p>
    </div>
  );
}
