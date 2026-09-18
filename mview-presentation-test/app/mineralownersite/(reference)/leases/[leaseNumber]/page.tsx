import type { Metadata } from "next";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import Portal from "../../../_components/reference/Portal";
import { portalGate } from "../../../_components/ui/portal-gating";
import { LeasesPortalRoot } from "../_components/leases-portal-root";
import { findLeaseBySlug, leaseIdFromSlug } from "../_lib/lease-routes";
import { sampleTwinOf } from "../_lib/sample-leases";
import { loadShellPayload } from "../_lib/shell-payload";
import { funnelStateFromCookie } from "../../../_lib/funnel-state-store";
import {
  normaliseStateParam,
  STORAGE_KEYS,
  toFunnelState,
} from "../../../_lib/portal-state";
import { LeaseReportBody } from "./_components/report-body";
import { ServedLeaseReport } from "./_components/served-lease-report";
import { type LeaseReportTab } from "./_components/report-tabs";
import { ReservoirReportView } from "./_components/reservoir/reservoir-report-view";
import { WellReportView } from "./_components/well/well-report-view";
import { buildLeaseReport } from "./_lib/lease-report";

/**
 * THE LEASE REPORT — `/mineralownersite/leases/290827-mccabe-etal-gu`.
 *
 * ── IT WEARS THE SAME CHROME AS EVERY OTHER PAGE ──
 *
 * Like the list it opens from, this renders `Portal` with `route="leases"` and
 * brings its own body through `children`. One header file for the whole portal;
 * see the note in `leases/page.tsx` and in `_components/leases-portal-root.tsx`.
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

export const dynamic = "force-dynamic";

/** `searchParams` hands back a string, an array, or nothing. */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
  const { report: reportParam, state: stateParam } = await searchParams;

  /*
   * ── AN UNCLAIMED VISITOR READS THE SAMPLE OF THIS LEASE, AT THIS URL ──
   *
   * The state reaches the server as a COOKIE — see `funnel-state-store.ts` — so
   * the whole swap is still one assignment, and the address bar is not involved
   * at any point. The shared shell keeps its own copy in `localStorage`, which
   * no server can read, so `LeasesPortalRoot` mirrors it into the cookie and
   * re-renders whenever the two disagree.
   *
   * THE PATH DOES NOT MOVE, and that is the point. Switching funnel state
   * changes no URL anywhere in the portal; a route that rewrote the path would
   * make the state menu behave differently here, and Back would step between
   * two different leases rather than between two states of one.
   *
   * The sample twin carries its own slug so its series and wells resolve — see
   * `sample-leases.ts`. Links go through `routeSlugFor`, which maps it back, so
   * that slug never reaches the address bar.
   */
  /* The chrome's owner snapshot and this page's own state read, in parallel.
     `?state=` still wins as a deep link — the same order the shell uses, so the
     two halves of one page never disagree about which state they are in. */
  const [initial, store] = await Promise.all([
    loadShellPayload(searchParams),
    cookies(),
  ]);
  const state = stateParam
    ? toFunnelState(normaliseStateParam(firstParam(stateParam)))
    : funnelStateFromCookie(store.get(STORAGE_KEYS.funnelState)?.value);
  const unclaimed = state === "unclaimed";
  const tab = resolveTab(reportParam);

  /*
   * ── WHERE THIS LEASE'S FIGURES COME FROM ──
   *
   * The URL decides, because the URL already carries the answer. A slug that
   * leads with the service's id — `08_46924-howard-glasscock-east-unit` — came
   * off the list or the picker and names a lease on the member's own record; a
   * slug that leads with a bare number is one of the ten fixture leases. See
   * `leaseIdFromSlug`.
   *
   * AN UNCLAIMED VISITOR IS NEVER SENT TO THE SERVICE. Their table and their
   * dropdown are the sample set, so they never hold a served slug; if one
   * reaches them by hand it resolves against the fixture like any other, and
   * failing that it is a 404. Reading a real owner's lease to decorate a sample
   * page would put the record in front of someone who has not claimed it.
   */
  const servedId = unclaimed ? null : leaseIdFromSlug(leaseNumber);

  /* ── A LEASE ON THE RECORD: FETCHED IN THE BROWSER ──
     The shell is server-rendered and the report arrives inside it, so the call
     shows up in the Network tab as `lease?id=02_269507` with its own status,
     size and timing. See `served-lease-report.tsx` for why that was worth a
     loading state. */
  if (servedId) {
    return (
      <Portal route="leases" initial={initial} shellClass="mv-leases-shell">
        <LeasesPortalRoot serverFunnelState={state}>
          <div
            className={`${portalGate.pageRoot} ${portalGate.reportRoot} ${portalGate.wideColumn}`}
          >
            <ServedLeaseReport id={servedId} tab={tab} />
          </div>
        </LeasesPortalRoot>
      </Portal>
    );
  }

  /* ── A FIXTURE LEASE: BUILT HERE, AS IT ALWAYS WAS ──
     A 404 rather than a guess: an unknown lease in this URL means the link is
     wrong or the record changed, and either way showing somebody else's lease
     would be worse than showing nothing. */
  const found = findLeaseBySlug(leaseNumber);
  if (!found) notFound();

  const report = buildLeaseReport(unclaimed ? sampleTwinOf(found) : found);
  const lease = report.lease;

  return (
    <Portal route="leases" initial={initial} shellClass="mv-leases-shell">
      <LeasesPortalRoot serverFunnelState={state}>
        <div
          className={`${portalGate.pageRoot} ${portalGate.reportRoot} ${portalGate.wideColumn}`}
        >
          <LeaseReportBody
            report={report}
            tab={tab}
            otherReport={
              tab === "reservoir" ? (
                <ReservoirReportView lease={lease} />
              ) : (
                <WellReportView lease={lease} />
              )
            }
          />
        </div>
      </LeasesPortalRoot>
    </Portal>
  );
}
