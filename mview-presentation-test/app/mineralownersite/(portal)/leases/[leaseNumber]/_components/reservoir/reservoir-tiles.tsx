import {
  CalendarRange,
  Droplet,
  Flame,
  Layers,
  Receipt,
  TrendingUp,
} from "lucide-react";

import { KpiTile } from "../../../../../_components/ui/kpi-tile";
import {
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
} from "../../../_lib/lease-format";
import { portfolioSummary } from "../../../_lib/lease-totals";
import type { ReservoirReport } from "../../_lib/reservoir-report";

/**
 * THE SIX HEADLINES OF A RESERVOIR — what is in it, what has come out, what is
 * left, and how much hole it is coming through.
 *
 * ── THE LAST TILE IS THE ONE NOBODY EXPECTS AND THE ONE THAT EXPLAINS THE REST ──
 *
 * "Open between 10,457–10,511 ft" is the perforated interval: the only part of
 * the hole the rock is actually being drained through. Fifty-four feet of open
 * hole is why this reservoir produces what it does, and it is the figure that
 * makes "gas per foot open" further down the page mean anything.
 *
 * THE GLYPHS AND THE FLAT FACE MATCH THE WELL REPORT, because these two tabs
 * are read one after the other and a reader moving between them should not have
 * to work out whether the page changed or only the subject did. `flat` is the
 * important half: everything under these tiles is a plain bordered card, and a
 * shadowed row above them reads as a different kind of object over the page.
 *
 * ── VOLUMES ARE THE ROCK'S, MONEY IS YOURS ──
 *
 * Gas and oil filed are whole-lease: a volume is a physical fact and belongs to
 * nobody. The two cash tiles are at the reader's own decimal. Mixing the two
 * scopes without saying which is which is how a reader concludes they are owed
 * a gross figure.
 */
export function ReservoirTiles({ report }: { report: ReservoirReport }) {
  return (
    <div className="mt-4 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
      <KpiTile
        size="sm"
        flat
        icon={<Layers className="h-[18px] w-[18px]" />}
        label="Wells in this rock"
        value={formatCount(report.wellCount)}
        basis={`on ${report.leasesWithWells} of your ${portfolioSummary.leaseCount} leases`}
      />
      <KpiTile
        size="sm"
        flat
        icon={<Flame className="h-[18px] w-[18px]" />}
        label="Gas filed from it"
        value={`${formatCompactVolume(report.gasFiled)} MCF`}
        basis={`${report.gasFiledPercentOfRecord.toFixed(1)}% of all your allocated gas`}
      />
      <KpiTile
        size="sm"
        flat
        icon={<Droplet className="h-[18px] w-[18px]" />}
        label="Oil filed from it"
        value={`${formatCompactVolume(report.oilFiled)} BBL`}
        basis={`newest filed month ${report.newestFiledMonth}`}
      />
      <KpiTile
        locked
        size="sm"
        flat
        icon={<Receipt className="h-[18px] w-[18px]" />}
        label="Paid to you, filed"
        value={formatCompactDollars(report.paidYouFiled)}
        basis="this rock's share of each lease's cash"
      />
      <KpiTile
        locked
        size="sm"
        flat
        icon={<TrendingUp className="h-[18px] w-[18px]" />}
        label="Still ahead of it"
        value={formatCompactDollars(report.stillAheadCash)}
        basis={`${formatCompactVolume(report.stillAheadGas)} MCF the model still expects`}
      />
      <KpiTile
        size="sm"
        flat
        icon={<CalendarRange className="h-[18px] w-[18px]" />}
        label="Open between"
        value={`${formatCount(report.openTopFt)}–${formatCount(report.openBottomFt)} ft`}
        basis="measured depth · where the wells are perforated"
      />
    </div>
  );
}
