import type { ReactNode } from "react";

import { portalGate } from "../../../../_components/ui/portal-gating";
import type { LeaseMapData } from "../_lib/lease-map-from-api";
import type { LeaseReport } from "../_lib/lease-report";
import { CumulativeCard } from "./cumulative-card";
import { FiguresPanel } from "./figures-panel";
import { FindingsCard } from "./findings-card";
import { LeaseFactsStrip } from "./lease-facts-strip";
import { MeasuresCard } from "./measures-card";
import { PrecisionCard } from "./precision-card";
import { ReportBand } from "./report-band";
import { LeaseReportHeader } from "./report-header";
import { ReportTabs, type LeaseReportTab } from "./report-tabs";
import { ReservesCard } from "./reserves-card";
import { TwelveMonthsCard } from "./twelve-months-card";
import { UltraNote } from "./ultra-note";
import { WellsMapCard } from "./wells-map-card";

/**
 * THE LEASE REPORT'S MARKUP, ONCE, FOR BOTH SOURCES.
 *
 * ── WHY IT LEFT `page.tsx` ──
 *
 * The page now draws a lease two ways: a fixture lease is built on the server
 * and arrives with the document, and a served lease is fetched in the browser
 * so the call is visible in the Network tab. Those are two different render
 * paths, and before this they would have been two copies of the same forty
 * lines of layout — the arrangement that lets a card be added to one and
 * forgotten in the other. The DATA differs between the two; the page does not.
 *
 * ── NO `"use client"` HERE, ON PURPOSE ──
 *
 * This module is neutral. Imported by the server page it renders on the server;
 * imported by `ServedLeaseReport` it is part of that client bundle. Marking it
 * would force the fixture path into the browser too, for no reason.
 *
 * ── THE OTHER TWO TABS ARRIVE AS A NODE ──
 *
 * `otherReport` is whatever belongs under the strip when the reader is not on
 * the lease tab — the real reservoir and well reports on the fixture path, a
 * short notice on the served one. It is a prop rather than a branch because the
 * fixture views reach `buildReservoirReport` and `buildWellReport`, and those
 * pull the whole local series in behind them: rendering them from here would
 * ship all of it to the browser to serve a path the browser never takes.
 */
export function LeaseReportBody({
  report,
  tab,
  otherReport,
  leaseMap,
}: {
  report: LeaseReport;
  tab: LeaseReportTab;
  /** What the reservoir and well tabs show — see the note above. */
  otherReport?: ReactNode;
  /**
   * Where this lease's wells are, when they were read from the service.
   *
   * It reaches only `WellsMapCard`, which is the only thing on the page that
   * asks where anything is. Absent on the fixture path.
   */
  leaseMap?: LeaseMapData;
}) {
  const { lease } = report;

  return (
    <>
      {/* THREE THINGS SURVIVE ULTRA, and each earns it: which lease, what it is
          worth, and one sentence in place of the body. Strip the first two and
          the remaining sentence is about an unnamed lease. `ultraKeep` is the
          portal's own exemption — see the rule in `portal.css`. */}
      <div className={portalGate.ultraKeep}>
        <LeaseReportHeader
          lease={lease}
          tab={tab}
          neighbours={report.neighbours}
        />
      </div>
      <div className={portalGate.ultraKeep}>
        <ReportBand report={report} />
      </div>
      <UltraNote report={report} />

      <LeaseFactsStrip report={report} />
      <ReportTabs
        slug={lease.slug}
        active={tab}
        reservoir={lease.reservoir}
        firstPosting={report.firstPosting}
        lastPosting={report.lastPosting}
      />

      {tab === "lease" && (
        <>
          <FiguresPanel report={report} />
          <CumulativeCard report={report} />
          <ReservesCard report={report} />
          <FindingsCard report={report} />
          {/* NO DENSITY GATES ON THESE THREE. The twelve-month panel and the
              ranking were hidden at Essentials, and the full-precision record
              was Professional-only. All three are on the page at every tier
              now — see the note in `leases/page.tsx`. */}
          <TwelveMonthsCard report={report} />
          <MeasuresCard report={report} />
          <PrecisionCard report={report} />
          <WellsMapCard report={report} served={leaseMap} />
        </>
      )}

      {tab !== "lease" && otherReport}
    </>
  );
}
