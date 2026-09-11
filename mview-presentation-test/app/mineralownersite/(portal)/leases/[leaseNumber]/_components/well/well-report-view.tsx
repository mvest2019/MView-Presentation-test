import type { LeaseRecord } from "../../../_lib/lease-types";
import { buildWellReport } from "../../_lib/well-report";
import { AttachmentsCard, FilingsCard } from "./filings-card";
import { WellChartCard } from "./well-chart-card";
import { WellMapCard } from "./well-map-card";
import { WellTiles } from "./well-tiles";
import { WellboreCard } from "./wellbore-card";

/**
 * THE WELL REPORT — one hole in the ground, and what the record holds on it.
 *
 * ── THE ORDER ──
 *
 *   tiles        what it filed, what it paid, what is left, how much is open
 *   how much     the same question as two rings
 *   the wellbore the state's record, the hole drawn to scale, the readings
 *   chart        its allocated production, filed then modelled
 *   filings      every document on the hole, newest first
 *   map          where it actually is
 *   attachments  and which kind of nothing the document record holds
 *
 * Same rhythm as the lease and reservoir reports — figures, evidence, record,
 * ground — so a reader moving between the three tabs never has to relearn the
 * page.
 *
 * A SERVER COMPONENT: only the chart and the map carry a client boundary, so
 * the facts, the hole diagram, the filings and the attachments never reach the
 * browser as JavaScript.
 */
export function WellReportView({ lease }: { lease: LeaseRecord }) {
  const report = buildWellReport(lease);

  return (
    <div>
      <WellTiles report={report} />
      <WellboreCard report={report} />
      <WellChartCard report={report} />
      <FilingsCard report={report} />
      <WellMapCard report={report} />
      <AttachmentsCard />
    </div>
  );
}
