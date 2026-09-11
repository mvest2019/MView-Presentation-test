import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
 *   precision     the fields unrounded, for quoting
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
 * ── NO `portalGate.pageRoot` / `reportRoot` ──
 *
 * Same call as the list page next door: those classes let `portal.css` replace
 * a module's top-level sections in the unclaimed and Ultra states, and this
 * module ships neither variant yet — carrying them would render a blank page
 * for those readers rather than a gated one.
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
    <div>
      <LeaseReportHeader lease={lease} />
      <ReportBand report={report} />
      <LeaseFactsStrip report={report} />
      <ReportTabs slug={lease.slug} active={tab} />

      {tab === "lease" && (
        <>
          <FiguresPanel report={report} />
          <CumulativeCard report={report} />
          <ReservesCard report={report} />
          <FindingsCard report={report} />
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
