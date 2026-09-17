"use client";

import {
  CalendarDays,
  Droplet,
  Flame,
  Receipt,
  Ruler,
  TrendingUp,
} from "lucide-react";

import { useState } from "react";

import { Card, CardHeader } from "../../../../../_components/ui/card";
import { KpiTile } from "../../../../../_components/ui/kpi-tile";
import {
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
} from "../../../_lib/lease-format";
import {
  wellAheadExplainer,
  wellBestMonthExplainer,
  wellGasExplainer,
  wellOilExplainer,
  wellOpenExplainer,
  wellPaidExplainer,
} from "../../_lib/explainers-well";
import type { WellReport } from "../../_lib/well-report";
import { ExplainerDrawer, type Explainer } from "../explainer-drawer";
import { Donut, DonutDot, type DotShade } from "../donut";

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
 * ── THE GLYPHS NAME THE QUANTITY, NOT THE DESIGN'S PICTURE OF IT ──
 *
 * Five follow the mock exactly. The sixth does not: the design puts a clock on
 * "Open over", and that figure is 54 FEET OF PERFORATED HOLE — a length, with
 * no time in it anywhere. A clock there tells a scanning reader the opposite of
 * what the tile holds, so it is a ruler.
 *
 * ── "HOW MUCH IS LEFT" IS TWO HALVES, NOT TWO STACKED GRIDS ──
 *
 * Gas on the left, oil on the right, and ONE rule down the middle running the
 * whole height of the card. It used to be a four-column row of stats above a
 * two-column row of rings, each with its own dividers, so the line between gas
 * and oil broke and restarted between the two rows and the card read as two
 * unrelated tables. A reader compares gas with gas; the grouping should be the
 * product, and the rule should say so once.
 *
 * ── AND "OPEN OVER" IS THE PHYSICAL ONE ──
 *
 * Fifty-four feet. Everything else on this page is a consequence of how much
 * hole is actually connected to the rock, and it is the figure that makes "gas
 * per foot open" below mean something.
 */
export function WellTiles({ report }: { report: WellReport }) {
  const { well } = report;
  const [explainer, setExplainer] = useState<Explainer | null>(null);

  return (
    <>
      <div className="mt-4 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile
          size="sm"
          flat
          icon={<Flame className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(wellGasExplainer(report))}
          label="Gas filed, this well"
          value={`${formatCompactVolume(report.gasFiled)} MCF`}
          basis="all of its lease's allocated gas"
        />
        <KpiTile
          size="sm"
          flat
          icon={<Droplet className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(wellOilExplainer(report))}
          label="Oil filed"
          value={`${formatCompactVolume(report.oilFiled)} BBL`}
          basis={`newest filed month ${report.newestFiledMonth}`}
        />
        <KpiTile
          size="sm"
          flat
          locked
          icon={<Receipt className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(wellPaidExplainer(report))}
          label="Paid to you, filed"
          value={formatCompactDollars(report.paidYouFiled)}
          basis="its share of the lease's cash"
        />
        <KpiTile
          size="sm"
          flat
          locked
          icon={<TrendingUp className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(wellAheadExplainer(report))}
          label="Still ahead of it"
          value={formatCompactDollars(report.stillAheadCash)}
          basis={`${formatCompactVolume(report.stillAheadGas)} MCF the model still expects`}
        />
        <KpiTile
          size="sm"
          flat
          icon={<CalendarDays className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(wellBestMonthExplainer(report))}
          label="Best month it had"
          value={`${formatCompactVolume(report.bestMonthGas)} MCF`}
          basis={report.bestMonth}
        />
        <KpiTile
          size="sm"
          flat
          icon={<Ruler className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(wellOpenExplainer(report))}
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
        />

        <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-mv-line">
          <Half
            tone="gas"
            producedLabel="Gas produced"
            producedValue={`${formatCompactVolume(report.gasFiled)} MCF`}
            producedSub={`over ${report.allocatedMonths} allocated months`}
            reservesLabel="Gas reserves"
            reservesValue={`${formatCompactVolume(report.gasReserves)} MCF`}
            unit="Gas · MCF"
            percent={report.gasProducedPercent}
            note={`${report.gasProducedPercent.toFixed(1)}% of the gas the model expects from this wellbore is already filed.`}
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
            note={`It makes ${report.oilYield.toFixed(0)} BBL per thousand MCF of gas.`}
            className="lg:pl-7"
          />
        </div>
      </Card>

      <ExplainerDrawer
        explainer={explainer}
        onClose={() => setExplainer(null)}
      />
    </>
  );
}

/**
 * One product: its two figures side by side, a rule, and the ring they add up
 * to. The reserves figure and the ring's pale arc are the same quantity, which
 * is why they carry the same pale dot - see `DonutDot`.
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
      {/* CARDS, NOT COLUMNS DIVIDED BY A RULE. Produced and reserves are two
          separate quantities, not two readings of one — the card says so, and
          it matches the wellbore record below. */}
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
