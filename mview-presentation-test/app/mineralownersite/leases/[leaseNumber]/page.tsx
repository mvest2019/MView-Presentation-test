import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClaimRail } from "../../_components/dashboard/unclaimed-dashboard";
import { PortalButtonLink } from "../../_components/ui/button";
import { PortalActionFooter } from "../../_components/ui/action-footer";
import { Card } from "../../_components/ui/card";
import { gates, portalGate } from "../../_components/ui/portal-gating";
import { UltraHero } from "../../_components/ui/ultra-hero";
import { ViewTierLink } from "../../_components/ui/view-tier-link";
import { formatLeaseTitle } from "../_lib/lease-format";
import { LeaseBottomTiles } from "./_components/lease-bottom-tiles";
import { LeaseReportNav } from "./_components/lease-report-nav";
import { LeaseReportUnclaimed } from "./_components/lease-report-unclaimed";
import { LeaseTitleCard } from "./_components/lease-title-card";
import { NextPaymentCard } from "./_components/next-payment-card";
import { OwnerValueCard } from "./_components/owner-value-card";
import { ProductionChart } from "./_components/production-chart";
import { ReportTabs } from "./_components/report-tabs";
import { ReservoirPanel } from "./_components/reservoir-panel";
import { UnitOutlinePanel } from "./_components/unit-outline-panel";
import { WellsPanel } from "./_components/wells-panel";
import { WhatChangedCard } from "./_components/what-changed-card";
import { getLeaseReport } from "./_lib/lease-report-records";
import type { ReportTab } from "./_lib/lease-report-types";
import { crowA2HProduction } from "./_lib/production-series";

/**
 * ONE LEASE'S REPORT — `/mineralownersite/leases/[leaseNumber]`.
 *
 * ── THE URL CARRIES BOTH COORDINATES ──
 *
 *   /mineralownersite/leases/305892                    the lease report
 *   /mineralownersite/leases/305892?report=reservoir   the reservoir report
 *   /mineralownersite/leases/305892?report=wells       the wells report
 *
 * WHICH LEASE and WHICH OF ITS THREE REPORTS are both in the URL, because both
 * are things a reader shares, bookmarks, and reaches by the back button. The
 * prototype had neither: its lease pages were `#/app/lease/smith` (a hand-named
 * route per lease, so eight of the ten had no page at all) and its tabs toggled
 * `style.display`, so the reservoir report had no address. An alert about a
 * well-level change had nowhere to point.
 *
 * Here the route is parameterised on the lease NUMBER, which is the identifier
 * every other surface already uses — the table row, the derivation table, the
 * grid card and the change feed all link through `leaseReportPath()`.
 *
 * ── ONLY THE OPEN PANEL IS RENDERED ──
 *
 * `?report=` is read on the server, so the two closed reports are not in the
 * payload at all. That is the opposite trade from the My Leases tab strip, which
 * force-mounts all three panels — and it is right for opposite reasons: those
 * tabs are three views of ten rows the reader flips between, these are three
 * different documents, one of which carries a 21-well map and a 237-month chart.
 *
 * ── EVERY TIER AND EVERY FUNNEL STATE ──
 *
 * The sections below are DIRECT CHILDREN of `portalGate.pageRoot`, which is what
 * lets `portal.css` replace the page for an unclaimed record and for Ultra
 * without this component knowing either gate exists. See `portal-ui.md`.
 */

const REPORT_TABS: ReportTab[] = ["lease", "reservoir", "wells"];

function readTab(value: string | string[] | undefined): ReportTab {
  const first = Array.isArray(value) ? value[0] : value;
  return REPORT_TABS.includes(first as ReportTab)
    ? (first as ReportTab)
    : "lease";
}

export async function generateMetadata({
  params,
}: PageProps<"/mineralownersite/leases/[leaseNumber]">): Promise<Metadata> {
  const { leaseNumber } = await params;
  const report = getLeaseReport(leaseNumber);
  if (!report) return { title: "Lease not on this record" };

  const title = formatLeaseTitle(report.lease.name, report.lease.number);
  return {
    title: `${title} — lease report`,
    description: `${title} in ${report.lease.county} County, operated by ${report.lease.operator}. Your share, its production history, the unit outline, and the reservoir and wells behind it.`,
  };
}

/*
 * NO `generateStaticParams` HERE, and it is worth saying why rather than leaving
 * the next person to add one.
 *
 * It would have no effect. This page reads `?report=`, and the portal layout
 * above it awaits `getSessionUser()`, which reads cookies — so every route under
 * `/mineralownersite` renders dynamically no matter what params are declared.
 * `next build` confirms it: the route is listed `ƒ (Dynamic)`.
 *
 * An exported function that does nothing is worse than no function, because it
 * reads as a performance decision somebody made on purpose.
 */

export default async function LeaseReportPage({
  params,
  searchParams,
}: PageProps<"/mineralownersite/leases/[leaseNumber]">) {
  const { leaseNumber } = await params;
  const report = getLeaseReport(leaseNumber);
  /* A lease number that is not on this owner's record is a 404, not an empty
     report — the difference between "we have nothing to show you" and "this is
     not yours". */
  if (!report) notFound();

  const tab = readTab((await searchParams).report);
  const title = formatLeaseTitle(report.lease.name, report.lease.number);
  const eventCount = report.changes.filter((row) => row.tone === "event").length;

  return (
    <div className={portalGate.pageRoot}>
      <ClaimRail />
      <LeaseReportUnclaimed lease={report.lease} />

      {/* THE ULTRA TIER replaces the page: one headline, one sentence, one step
          back to the list. `UltraHero` is the shared primitive, so this report
          and the lease list read identically at that tier. */}
      <div className={gates("ultraOnly")}>
        <UltraHero
          kicker={title}
          headline={<>{report.ultra.headline}</>}
          status={<>{report.ultra.body}</>}
          action={
            <ViewTierLink tier="simple" variant="primary" size="lg">
              Read the plain-English report
            </ViewTierLink>
          }
          note="We check this lease against the public record daily and will tell you if anything changes."
        />
      </div>

      <div>
        <PortalButtonLink size="sm" href="/mineralownersite/leases">
          ← Back to My Leases
        </PortalButtonLink>
      </div>

      <div>
        <LeaseReportNav
          leaseNumber={report.lease.number}
          leaseTitle={title}
          tab={tab}
        />
      </div>

      <LeaseTitleCard report={report} />
      <OwnerValueCard report={report} />

      {/* THE ESSENTIALS TIER's plain-English answer, in four rows: what it is
          worth, where it sits in the total, what just happened, what to do. The
          fourth is usually "nothing", and saying so is the point. */}
      <Card className={`mb-3.5 ${gates("essentialsOnly")}`}>
        <h3 className="mb-1.5 text-lg font-bold">{report.essentials.title}</h3>
        <p className="mb-2.5 text-[15px]">{report.essentials.lede}</p>
        <div className="border-t border-mv-line">
          {report.essentials.rows.map((row) => (
            <div
              key={row.q}
              className="flex flex-col gap-0.5 border-b border-dashed border-mv-line py-2 text-sm min-[560px]:flex-row min-[560px]:items-baseline min-[560px]:gap-3.5"
            >
              <span className="flex-none text-[10.5px] font-extrabold tracking-[0.05em] text-mv-faint uppercase min-[560px]:w-[168px]">
                {row.q}
              </span>
              <span>{row.a}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5">
          <ViewTierLink tier="detailed">See the details</ViewTierLink>
        </div>
      </Card>

      <div>
        <ReportTabs
          leaseNumber={report.lease.number}
          active={tab}
          reservoirName={report.reservoir.name}
          wellsSummary={`${report.wells.length} well${
            report.wells.length === 1 ? "" : "s"
          } · ${report.wells.map((w) => w.name).join(", ")} ${report.wells[0].status.toLowerCase()}`}
        />
      </div>

      <div id="lease-report-panel" role="tabpanel">
        {tab === "lease" && (
          <>
            <WhatChangedCard
              level="lease"
              rows={report.changes}
              detail={report.changeDetail}
              eventCount={eventCount}
              eventDate={report.depth === "full" ? "Jul 02, 2026" : undefined}
            />

            {/* The map and the chart are the two panels that carry REAL
                geometry and a REAL 237-month record, both from the Karnes pilot
                unit and both labelled as such. They render only on the fully
                captured leases: on the other eight there is nothing measured to
                draw, and drawing something anyway is the one thing this module
                refuses to do. */}
            {report.depth === "full" && (
              <>
                <UnitOutlinePanel />
                <ProductionChart record={crowA2HProduction} />
              </>
            )}

            <NextPaymentCard report={report} />
            <LeaseBottomTiles report={report} />
          </>
        )}

        {tab === "reservoir" && <ReservoirPanel report={report} />}
        {tab === "wells" && <WellsPanel report={report} />}
      </div>

      {/* The design gives a captured report four actions and a generic one
          three — see `portalActionSets`. */}
      <PortalActionFooter
        setKey={report.depth === "full" ? "app-lease-detail" : "app-lease-generic"}
      />
    </div>
  );
}
