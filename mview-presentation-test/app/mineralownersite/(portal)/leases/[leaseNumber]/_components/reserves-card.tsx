import { Badge } from "../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../_components/ui/card";
import { KpiTile } from "../../../../_components/ui/kpi-tile";
import { formatCompactVolume } from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";
import { Donut } from "./donut";

/**
 * "HOW MUCH OF IT IS LEFT" — produced against the model's remainder.
 *
 * ── THE WORD "RESERVES" IS DOING SOMETHING DANGEROUS, SO EVERY TILE QUALIFIES IT ──
 *
 * A produced volume is a filing: it happened, the state has it, it can be
 * checked. A reserve is a model output — nobody filed it and nobody has
 * promised it. The two sit side by side here because the comparison is the
 * point, and the only thing that keeps that honest is saying "the model's
 * remainder, not a filing" on both of them rather than once in a footnote.
 *
 * ── THE RING IS SHARED WITH THE RESERVOIR REPORT ──
 *
 * Both pages ask "how much of it is left" of different scopes, and the answer
 * has to look identical or the two read as different measurements. See
 * `donut.tsx`.
 */
export function ReservesCard({ report }: { report: LeaseReport }) {
  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={<h3 className="text-[15px] font-bold">How much of it is left</h3>}
        action={
          <Badge tone="slate" size="xs">
            filed against what the model still expects
          </Badge>
        }
      />

      <div className="mt-4 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Gas produced"
          value={`${formatCompactVolume(report.gasProduced)} MCF`}
          basis={`over ${report.postedMonths} posted months`}
        />
        <KpiTile
          label="Gas reserves"
          value={`${formatCompactVolume(report.gasReserves)} MCF`}
          basis="the model's remainder, not a filing"
        />
        <KpiTile
          label="Oil produced"
          value={`${formatCompactVolume(report.oilProduced)} BBL`}
          basis="oil and condensate together"
        />
        <KpiTile
          label="Oil reserves"
          value={`${formatCompactVolume(report.oilReserves)} BBL`}
          basis="the model's remainder, not a filing"
        />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:divide-x lg:divide-mv-line">
        <Donut
          unit="Gas · MCF"
          tone="gas"
          percent={report.gasProducedPercent}
          produced={`${formatCompactVolume(report.gasProduced)} MCF`}
          ahead={`${formatCompactVolume(report.gasReserves)} MCF`}
          note={`${report.gasProducedPercent.toFixed(1)}% of the gas this lease is expected to make has already been posted.`}
        />
        <div className="lg:pl-6">
          <Donut
            unit="Oil · BBL"
            tone="oil"
            percent={report.oilProducedPercent}
            produced={`${formatCompactVolume(report.oilProduced)} BBL`}
            ahead={`${formatCompactVolume(report.oilReserves)} BBL`}
            note="Oil is oil and condensate together, as the state files them."
          />
        </div>
      </div>
    </Card>
  );
}
