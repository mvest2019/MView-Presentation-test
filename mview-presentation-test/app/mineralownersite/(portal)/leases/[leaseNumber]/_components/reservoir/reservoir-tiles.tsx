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
        label="Wells in this rock"
        value={formatCount(report.wellCount)}
        basis={`on ${report.leasesWithWells} of your ${portfolioSummary.leaseCount} leases`}
      />
      <KpiTile
        label="Gas filed from it"
        value={`${formatCompactVolume(report.gasFiled)} MCF`}
        basis={`${report.gasFiledPercentOfRecord.toFixed(1)}% of all your allocated gas`}
      />
      <KpiTile
        label="Oil filed from it"
        value={`${formatCompactVolume(report.oilFiled)} BBL`}
        basis={`newest filed month ${report.newestFiledMonth}`}
      />
      <KpiTile
        locked
        label="Paid to you, filed"
        value={formatCompactDollars(report.paidYouFiled)}
        basis="this rock's share of each lease's cash"
      />
      <KpiTile
        locked
        label="Still ahead of it"
        value={formatCompactDollars(report.stillAheadCash)}
        basis={`${formatCompactVolume(report.stillAheadGas)} MCF the model still expects`}
      />
      <KpiTile
        label="Open between"
        value={`${formatCount(report.openTopFt)}–${formatCount(report.openBottomFt)} ft`}
        basis="measured depth · where the wells are perforated"
      />
    </div>
  );
}
