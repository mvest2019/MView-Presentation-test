import { Badge } from "../../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../../_components/ui/card";
import { KpiTile } from "../../../../../_components/ui/kpi-tile";
import {
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
} from "../../../_lib/lease-format";
import type { WellReport } from "../../_lib/well-report";
import { Donut, DonutDot } from "../donut";

/**
 * THE WELL'S HEADLINES, AND HOW MUCH OF IT IS LEFT.
 *
 * ── "BEST MONTH IT HAD" IS ON THE ROW FOR A REASON ──
 *
 * Five of these six tiles are totals. The sixth is the single best month the
 * hole ever filed, and it is there because it is the only figure that says what
 * the well was capable of when it was new — which is the number a reader needs
 * before deciding whether today's rate is a disappointment or a decline curve
 * doing exactly what decline curves do.
 *
 * ── AND "OPEN OVER" IS THE PHYSICAL ONE ──
 *
 * Fifty-four feet. Everything else on this page is a consequence of how much
 * hole is actually connected to the rock, and it is the figure that makes "gas
 * per foot open" below mean something.
 */
export function WellTiles({ report }: { report: WellReport }) {
  const { well } = report;

  return (
    <>
      <div className="mt-4 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile
          label="Gas filed, this well"
          value={`${formatCompactVolume(report.gasFiled)} MCF`}
          basis="all of its lease's allocated gas"
        />
        <KpiTile
          label="Oil filed"
          value={`${formatCompactVolume(report.oilFiled)} BBL`}
          basis={`newest filed month ${report.newestFiledMonth}`}
        />
        <KpiTile
          locked
          label="Paid to you, filed"
          value={formatCompactDollars(report.paidYouFiled)}
          basis="its share of the lease's cash"
        />
        <KpiTile
          locked
          label="Still ahead of it"
          value={formatCompactDollars(report.stillAheadCash)}
          basis={`${formatCompactVolume(report.stillAheadGas)} MCF the model still expects`}
        />
        <KpiTile
          label="Best month it had"
          value={`${formatCompactVolume(report.bestMonthGas)} MCF`}
          basis={report.bestMonth}
        />
        <KpiTile
          label="Open over"
          value={`${formatCount(report.openFeet)} ft`}
          basis={`${formatCount(well.openTopFt)}–${formatCount(well.openBottomFt)} ft measured`}
        />
      </div>

      <Card padded={false} className="mt-4 px-[22px] py-[18px]">
        <CardHeader
          title={
            <h3 className="text-[15px] font-bold">
              How much of this well is left
            </h3>
          }
          action={
            <Badge tone="slate" size="xs">
              allocated to this wellbore
            </Badge>
          }
        />

        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-mv-line">
          <Stat
            tone="gas"
            label="Gas produced"
            value={`${formatCompactVolume(report.gasFiled)} MCF`}
            sub={`over ${report.allocatedMonths} allocated months`}
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
            note={`${report.gasProducedPercent.toFixed(1)}% of the gas the model expects from this wellbore is already filed.`}
          />
          <div className="lg:pl-6">
            <Donut
              unit="Oil · BBL"
              tone="oil"
              percent={report.oilProducedPercent}
              produced={`${formatCompactVolume(report.oilFiled)} BBL`}
              ahead={`${formatCompactVolume(report.oilReserves)} BBL`}
              note={`It makes ${report.oilYield.toFixed(0)} BBL per thousand MCF of gas.`}
            />
          </div>
        </div>
      </Card>
    </>
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
