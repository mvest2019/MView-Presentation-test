import { Card, CardHeader } from "../../../../../_components/ui/card";
import { formatCompactVolume } from "../../../_lib/lease-format";
import type { ReservoirReport } from "../../_lib/reservoir-report";
import { Donut, DonutDot, type DotShade } from "../donut";

/**
 * "HOW MUCH OF THIS ROCK IS LEFT" — the same question the lease report asks,
 * of the reservoir.
 *
 * ── THE FOOTNOTE UNDER THE OIL RING IS THE FINDING ──
 *
 * When the oil is further through than the gas, what remains is gassier than
 * what has come out — so the gas price matters more to the remainder than the
 * history suggests. That is a real conclusion about a real decision (which
 * price to watch), and it falls straight out of comparing the two rings, which
 * is why they sit side by side rather than in two cards.
 *
 * GAS ON THE LEFT, OIL ON THE RIGHT, one rule down the middle — the well
 * report's shape, applied here. It was a four-column stat row above a
 * two-column ring row, each with its own dividers, so the line between the two
 * products broke and restarted between the rows.
 */
export function RockLeftCard({ report }: { report: ReservoirReport }) {
  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">How much of this rock is left</h3>
        }
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-mv-line">
        <Half
          tone="gas"
          producedLabel="Gas produced"
          producedValue={`${formatCompactVolume(report.gasFiled)} MCF`}
          producedSub={`from ${report.wellCount} well${report.wellCount === 1 ? "" : "s"} in this rock`}
          reservesLabel="Gas reserves"
          reservesValue={`${formatCompactVolume(report.gasReserves)} MCF`}
          unit="Gas · MCF"
          percent={report.gasProducedPercent}
          note={`${report.gasProducedPercent.toFixed(1)}% of the gas expected from your wells here has already been posted.`}
          className="lg:pr-7"
        />
        <Half
          tone="oil"
          producedLabel="Oil produced"
          producedValue={`${formatCompactVolume(report.oilFiled)} BBL`}
          producedSub="oil and condensate together"
          reservesLabel="Oil reserves"
          reservesValue={`${formatCompactVolume(report.oilReserves)} BBL`}
          unit="Oil · BBL"
          percent={report.oilProducedPercent}
          note={`The stream carries ${report.oilYield.toFixed(0)} BBL per thousand MCF of gas.`}
          className="lg:pl-7"
        />
      </div>

    </Card>
  );
}

/**
 * One product: its two figures as cards, a rule, and the ring they add up to.
 * The same shape as the well report's — see `well/well-tiles.tsx` for why the
 * reserves figure carries the pale dot.
 */
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
