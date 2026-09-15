import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { portalGate } from "../../../_components/ui/portal-gating";
import { findLeaseBySlug } from "../_lib/lease-routes";
import { CumulativeCard } from "./_components/cumulative-card";
import { FiguresPanel } from "./_components/figures-panel";
import { FindingsCard } from "./_components/findings-card";
import { LeaseFactsStrip } from "./_components/lease-facts-strip";
import { LeaseReportHeader } from "./_components/report-header";
import { MeasuresCard } from "./_components/measures-card";
import { PrecisionCard } from "./_components/precision-card";
import { ReportBand } from "./_components/report-band";
import { ReportTabs, type LeaseReportTab } from "./_components/report-tabs";
import { UltraNote } from "./_components/ultra-note";
import { ReservoirReportView } from "./_components/reservoir/reservoir-report-view";
import { WellReportView } from "./_components/well/well-report-view";
import { ReservesCard } from "./_components/reserves-card";
import { TwelveMonthsCard } from "./_components/twelve-months-card";
import { WellsMapCard } from "./_components/wells-map-card";
import { buildLeaseReport } from "./_lib/lease-report";

/**
 * THE LEASE REPORT — `/mineralownersite/leases/290827-mccabe-etal-gu`.
 *
 * ── THE URL CARRIES THE NUMBER AND THE NAME ──
 *
 * The number is the identity and the name is what makes the link readable in an
 * email, a browser history or a phone call. `findLeaseBySlug` reads the number
 * and tolerates a stale name, so a lease renamed on a later filing does not
 * break every link already out there. See its note.
 *
 * ── THE ORDER, AND WHY ──
 *
 *   header        where you are, which lease, how to reach the next
 *   band          what it is worth and what it is about to pay
 *   facts strip   the seven fields every figure below is read against
 *   tabs          lease · reservoir · wells
 *   figures       the tiles and the production chart, at either scope
 *   cumulative    how much has come out and how much is left
 *   reserves      the same thing as a proportion
 *   findings      the page summarising itself, AFTER the evidence
 *   twelve        filed on the left, projected on the right
 *   measures      against the record, and against itself
 *   precision     the fields unrounded, for quoting — Professional only
 *   map           where the wells actually are
 *
 * `?report=reservoir` and `?report=wells` swap the whole body for those two
 * reports — same header, same band, same facts strip, because those describe
 * the LEASE and are true on every one of its three reports. What changes below
 * them is the scope: the lease, the rock it produces from, and the hole it
 * produces through.
 *
 * Money first, method last. A reader who stops after the band has the answer; a
 * reader who reaches the map has the whole derivation, in the order the figures
 * were built.
 *
 * ── ULTRA COLLAPSES A REPORT, IT DOES NOT REPLACE IT ──
 *
 * `reportRoot` is what makes that difference: `portal.css` scopes a separate
 * rule to report routes that keeps anything marked `ultraKeep` instead of
 * sweeping every child away. A reader who asked for the calmest view of ONE
 * lease still needs to know which lease and what it is worth — so the header
 * and the value band stay, one sentence replaces the body, and the rest goes.
 *
 * ── WHAT EACH TIER SHOWS ──
 *
 * Ultra         identity, the money, one sentence.
 * Essentials    everything except the twelve-month panel, the comparisons and
 *               the precision table.
 * Detailed      the default.
 * Professional  adds the full-precision record.
 */
export async function generateMetadata({
  params,
}: PageProps<"/mineralownersite/leases/[leaseNumber]">): Promise<Metadata> {
  const { leaseNumber } = await params;
  const lease = findLeaseBySlug(leaseNumber);

  if (!lease) return { title: "Lease report" };

  return {
    title: lease.number ? `${lease.name} · Lease ${lease.number}` : lease.name,
    description: `What your interest in ${lease.name} is worth, what it has filed, and what the model expects next.`,
  };
}

/** `?report=` — the three reports on one lease. Anything else is the lease. */
function resolveTab(value: string | string[] | undefined): LeaseReportTab {
  return value === "reservoir" || value === "wells" ? value : "lease";
}

export default async function LeaseReportPage({
  params,
  searchParams,
}: PageProps<"/mineralownersite/leases/[leaseNumber]">) {
  const { leaseNumber } = await params;
  const { report: reportParam } = await searchParams;

  const lease = findLeaseBySlug(leaseNumber);
  /* A 404 rather than a guess: an unknown lease number in this URL means the
     link is wrong or the record changed, and either way showing somebody
     else's lease would be worse than showing nothing. */
  if (!lease) notFound();

  const tab = resolveTab(reportParam);
  const report = buildLeaseReport(lease);

  return (
    <div
      className={`${portalGate.pageRoot} ${portalGate.reportRoot} ${portalGate.wideColumn}`}
    >
      {/* THREE THINGS SURVIVE ULTRA, and each earns it: which lease, what it is
          worth, and one sentence in place of the body. Strip the first two and
          the remaining sentence is about an unnamed lease. `ultraKeep` is the
          portal's own exemption — see the rule in `portal.css`. */}
      <div className={portalGate.ultraKeep}>
        <LeaseReportHeader lease={lease} />
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
          <WellsMapCard report={report} />
        </>
      )}

      {tab === "reservoir" && <ReservoirReportView lease={lease} />}

      {tab === "wells" && <WellReportView lease={lease} />}
    </div>
  );
}
