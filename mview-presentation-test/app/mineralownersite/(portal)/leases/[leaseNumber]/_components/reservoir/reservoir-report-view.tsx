import type { LeaseRecord } from "../../../_lib/lease-types";
import { buildReservoirReport } from "../../_lib/reservoir-report";
import { ReservoirChartCard } from "./reservoir-chart-card";
import { ReservoirMapCard } from "./reservoir-map-card";
import { ReservoirTiles } from "./reservoir-tiles";
import { RockItselfCard } from "./rock-itself-card";
import { RockLeftCard } from "./rock-left-card";
import { WellsTableCard } from "./wells-table-card";

/**
 * THE RESERVOIR REPORT — one rock, seen through this lease's wells.
 *
 * ── THE ORDER ──
 *
 *   tiles       what is in it, what came out, what is left, how much open hole
 *   how much    the same question as two rings
 *   the rock    the state's record on the left, the reading on the right
 *   chart       every well in it summed, filed then modelled
 *   wells       each well, biggest filer first, with the money split
 *   map         where those holes actually are
 *
 * Same shape as the lease report next door — figures, then evidence, then the
 * record, then the ground — because a reader moving between the two tabs should
 * not have to relearn where anything is.
 *
 * A SERVER COMPONENT. Only the chart and the map are interactive and both carry
 * their own boundary, so the four static cards — which are most of the page —
 * never reach the browser as JavaScript.
 */
export function ReservoirReportView({ lease }: { lease: LeaseRecord }) {
  const report = buildReservoirReport(lease);

  return (
    <div>
      <ReservoirTiles report={report} />
      <RockLeftCard report={report} />
      <RockItselfCard report={report} />
      <ReservoirChartCard report={report} />
      <WellsTableCard report={report} />
      <ReservoirMapCard report={report} />
    </div>
  );
}
