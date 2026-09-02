import type { Metadata } from "next";

import { PortalLink } from "../_components/portal-link";
import { ActivityKpis } from "../_components/activities/activity-kpis";
import { ActivityScope } from "../_components/activities/activity-scope";
import {
  CountyOperatorPanel,
  NearbyTrendPanel,
} from "../_components/activities/activity-tabs";
import { LeaseEventsPanel } from "../_components/activities/lease-events-panel";
import { UnclaimedActivities } from "../_components/activities/unclaimed-activities";
import { TierLink } from "../_components/tier-link";
import {
  activitiesMeta,
  activitiesSummary,
  activitiesUltra,
  toActivityRadius,
  toActivityTab,
  toActivityWindow,
} from "../_lib/portal-activities-data";

/**
 * ACTIVITIES — `/mineralownersite/activities`.
 *
 * A SERVER COMPONENT, like the Dashboard, and for the same reason: the page
 * renders every state and every density into the markup and `portal.css`
 * decides which of them the reader sees. Two small client islands ship JS —
 * the scope controls and the by-lease table's filter — and nothing else does.
 *
 * WHAT RENDERS WHEN — the whole map in one place:
 *
 *   UNCLAIMED (guest)  the claim rail, then the J. T. Callahan SAMPLE. The
 *                      sample carries `.nc-swap`, so it REPLACES everything
 *                      below rather than stacking on it: a visitor with no
 *                      record sees a labelled month of example events and
 *                      never a page of someone else's counts.
 *
 *   ULTRA              `ActivitiesUltra` alone — one verdict, one button. The
 *                      page-replacement rule in `portal.css` hides every
 *                      sibling.
 *
 *   ESSENTIALS         the year in one paragraph, and two buttons. No tabs, no
 *                      KPI grid, no filters, no tables — all `.hide-s`.
 *
 *   DETAILED           the scope controls, both KPI groups, the two
 *                      disclosures, and whichever tab is selected.
 *
 *   PROFESSIONAL       Detailed plus the adjacency ledger, which shows its own
 *                      deduplication arithmetic.
 *
 *   CLAIMED / LAPSED   unchanged. NOTHING ON THIS PAGE IS `cl-lock`, and that
 *                      is deliberate rather than an omission: every figure
 *                      here is a public-record count, not a modelled dollar. A
 *                      free owner is shown less of the PRODUCT, never less of
 *                      their own record — so the blur that hides the
 *                      MVestimate has no business on a permit count.
 *
 * THE THREE SCOPES ARE URL STATE — `?tab=`, `?win=`, `?mi=`. The KPI cards
 * link to `?tab=trend`, so the tab has to be reachable from a link; see the
 * note in `activity-scope.tsx`.
 */
export const metadata: Metadata = {
  title: "Activities",
  description:
    "Everything filed or posted on and around your claimed leases — production, permits, completions and status changes, with what each one means.",
};

export default async function ActivitiesPage({
  searchParams,
}: PageProps<"/mineralownersite/activities">) {
  const params = await searchParams;

  const first = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const tab = toActivityTab(first("tab"));
  const window = toActivityWindow(first("win"));
  const radius = toActivityRadius(first("mi"));

  return (
    <div className="mv-dash-routes">
      {/* STATE 1. Both blocks are `.nc-only`; the sample carries `.nc-swap`,
          which is what hides everything below it while unclaimed. */}
      <UnclaimedActivities />

      {/* ULTRA. One verdict, one status, one button — and the button is a
          density change, not a navigation, so the reader who wants more gets
          this same page at Essentials rather than a different screen. */}
      <div className="tier-u ultra-hero">
        <div className="u-dot" aria-hidden="true" />
        <p className="u-kicker">{activitiesUltra.kicker}</p>
        <h2 className="u-headline">
          {activitiesUltra.headline}{" "}
          <strong>{activitiesUltra.headlineStrong}</strong>
        </h2>
        <p className="u-status">{activitiesUltra.status}</p>
        <TierLink tier="simple" className="btn btn-primary btn-lg">
          {activitiesUltra.cta}
        </TierLink>
        <p className="u-note">{activitiesUltra.note}</p>
      </div>

      {/* The page head. */}
      <div className="between" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 24 }}>{activitiesMeta.title}</h2>
          <p className="small muted">{activitiesMeta.strapline}</p>
        </div>
        <span className="chip chip-slate">{activitiesMeta.coverage}</span>
      </div>

      {/* ESSENTIALS. The whole page, said once, for the reader who will never
          touch a filter — and the second sentence is the one that matters:
          posting production is not the same event as being paid. */}
      <div
        className="card card-pad tier-s simple-hero"
        style={{ marginBottom: 14 }}
      >
        <h3 style={{ marginBottom: 6 }}>{activitiesSummary.heading}</h3>
        <p style={{ fontSize: 15, margin: "0 0 8px" }}>
          <strong>
            {activitiesSummary.productionRecords} new-production records
          </strong>{" "}
          {activitiesSummary.body}
        </p>
        <p className="small muted" style={{ margin: "0 0 10px" }}>
          Your neighborhood: {activitiesSummary.neighbourhood}
        </p>
        <div className="flex" style={{ flexWrap: "wrap" }}>
          <PortalLink className="btn btn-primary btn-sm" href="/mineralownersite/map">
            See them on the map
          </PortalLink>
          <TierLink tier="detailed" className="btn btn-ghost btn-sm">
            See the details
          </TierLink>
        </div>
      </div>

      {/* DETAILED and above. */}
      <ActivityScope tab={tab} window={window} radius={radius} />
      <ActivityKpis window={window} radius={radius} />

      {tab === "lease" ? <LeaseEventsPanel /> : null}
      {tab === "trend" ? <NearbyTrendPanel /> : null}
      {tab === "county" ? <CountyOperatorPanel /> : null}
    </div>
  );
}
