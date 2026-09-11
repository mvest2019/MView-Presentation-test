import { Badge } from "../../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../../_components/ui/card";
import { formatCompactVolume } from "../../../_lib/lease-format";
import type { ReservoirReport } from "../../_lib/reservoir-report";
import { Donut, DonutDot } from "../donut";

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
 * The four stats are plain rows rather than tiles: they are the rings' own
 * numbers, and boxing them would make them look like separate findings.
 */
export function RockLeftCard({ report }: { report: ReservoirReport }) {
  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">How much of this rock is left</h3>
        }
        action={
          <Badge tone="slate" size="xs">
            every well in it, summed
          </Badge>
        }
      />

      <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-mv-line">
        <Stat
          tone="gas"
          label="Gas produced"
          value={`${formatCompactVolume(report.gasFiled)} MCF`}
          sub={`from ${report.wellCount} well${report.wellCount === 1 ? "" : "s"} in this rock`}
        />
        <Stat
          tone="gas"
          label="Gas reserves"
          value={`${formatCompactVolume(report.gasReserves)} MCF`}
          sub="the model's remainder, not a filing"
        />
        <Stat
          tone="oil"
          label="Oil produced"
          value={`${formatCompactVolume(report.oilFiled)} BBL`}
          sub="oil and condensate together"
        />
        <Stat
          tone="oil"
          label="Oil reserves"
          value={`${formatCompactVolume(report.oilReserves)} BBL`}
          sub="the model's remainder, not a filing"
        />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:divide-x lg:divide-mv-line">
        <Donut
          unit="Gas · MCF"
          tone="gas"
          percent={report.gasProducedPercent}
          produced={`${formatCompactVolume(report.gasFiled)} MCF`}
          ahead={`${formatCompactVolume(report.gasReserves)} MCF`}
          note={`${report.gasProducedPercent.toFixed(1)}% of the gas expected from your wells here has already been posted.`}
        />
        <div className="lg:pl-6">
          <Donut
            unit="Oil · BBL"
            tone="oil"
            percent={report.oilProducedPercent}
            produced={`${formatCompactVolume(report.oilFiled)} BBL`}
            ahead={`${formatCompactVolume(report.oilReserves)} BBL`}
            note={`The stream carries ${report.oilYield.toFixed(0)} BBL per thousand MCF of gas.`}
          />
        </div>
      </div>
    </Card>
  );
}

function Stat({
  tone,
  label,
  value,
  sub,
}: {
  tone: "gas" | "oil";
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="xl:not-first:pl-5">
      <p className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        <DonutDot tone={tone} />
        {label}
      </p>
      <p className="mt-1 text-[20px] leading-tight font-bold tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[11.5px] text-mv-muted">{sub}</p>
    </div>
  );
}
