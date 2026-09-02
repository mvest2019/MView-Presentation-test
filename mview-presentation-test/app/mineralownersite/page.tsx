import type { Metadata } from "next";

import { AlertsSummary } from "./_components/dashboard/alerts-summary";
import {
  AlertStrip,
  ChangedSinceCard,
  EssentialsHero,
} from "./_components/dashboard/changed-since";
import { DashboardColumns } from "./_components/dashboard/dashboard-columns";
import { DataSources } from "./_components/dashboard/data-sources";
import { GettingStartedChecklist } from "./_components/dashboard/getting-started-checklist";
import { KpiRow } from "./_components/dashboard/kpi-row";
import { PortfolioStrip } from "./_components/dashboard/portfolio-strip";
import { StateCard } from "./_components/dashboard/state-card";
import { UltraHero } from "./_components/dashboard/ultra-hero";
import {
  ClaimRail,
  SampleDashboard,
} from "./_components/dashboard/unclaimed-dashboard";
import { demoOwner } from "./_lib/portal-demo-data";

/**
 * THE DASHBOARD — `/mineralownersite`.
 *
 * A SERVER COMPONENT, and every card under it is one. The page renders ALL of
 * its states and densities into the markup, and `portal.css` decides which of
 * them the reader sees from the two classes on the portal root. So switching
 * density or walking the funnel changes one class string and re-renders one
 * `<div>` — the cards never re-render, and none of this ships as JavaScript.
 *
 * That is not a shortcut around conditional rendering; it is the reference's own
 * mechanism, and it is what lets `body.state-claimed .cl-lock` blur one figure
 * in eleven places at once without eleven components each knowing about the
 * funnel.
 *
 * WHAT RENDERS WHEN — the whole map in one place:
 *
 *   UNCLAIMED     the claim rail, then the J. T. Callahan sample. `.nc-swap` on
 *                 the sample hides everything below it, so an unclaimed owner
 *                 sees a labelled example and never a page of someone else's
 *                 numbers.
 *
 *   ULTRA         `UltraHero` alone. The page-replacement rule hides every
 *                 sibling except the state card.
 *
 *   ESSENTIALS    the portfolio strip, the alerts rollup, the "what's changed"
 *                 card and the one-line hero. No KPI grid, no six-card strip, no
 *                 second column — those are `.hide-s`.
 *
 *   DETAILED      the above minus the Essentials-only cards, plus the KPI row,
 *                 the alert strip and both columns.
 *
 *   PROFESSIONAL  Detailed plus the raw lease table and the two reserved
 *                 banner slots.
 *
 *   CLAIMED       as the owner's density, with the MVestimate money figure
 *                 blurred wherever it appears and the state card explaining why.
 *
 *   TRIAL         full Premium. Nothing is withheld — the trial IS the plan.
 *
 *   LAPSED        every all-ten-lease figure blurred, one lease live, community
 *                 kept.
 *
 * `.mv-dash-routes` is the hook the Ultra page-replacement rule needs: it
 * targets this element's direct children, so a card added here is covered by
 * Ultra automatically instead of leaking onto the calm view.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "What your minerals are worth, what changed since your last visit, and the one thing that needs you.",
};

export default function MineralOwnerDashboard() {
  return (
    <div className="mv-dash-routes">
      {/* The state card is FIRST, so a claimed, trial or lapsed owner reads why
          the page looks the way it does before they read the page. It is also
          the one element Ultra keeps. */}
      <StateCard />

      {/* State 1. Both are `.nc-only`; the sample carries `.nc-swap`, which is
          what hides everything below in that state. */}
      <ClaimRail />
      <SampleDashboard />

      {/* Ultra's replacement page. `.tier-u`, so the other three densities never
          render it and Ultra renders nothing else. */}
      <UltraHero />

      <div className="between" style={{ flexWrap: "wrap", marginBottom: 4 }}>
        <div>
          {/* "Good morning" is the reference's own literal, on both this
              greeting and the sample owner's (app.html:133, :220). Its
              `setGreeting()` re-sets the word from the VISITOR'S clock, but
              that function is not in the reference bundle, so its afternoon and
              evening wordings are unknown — inventing them would put text on
              the page that the source of truth does not contain. The literal
              ships as written, which also makes this greeting and the sample's
              agree. */}
          <h2 style={{ fontSize: 26 }}>
            Good morning, {demoOwner.name.split(" ")[0]}
          </h2>
          <p className="small muted">
            {demoOwner.asOf} · {demoOwner.counties}
          </p>
        </div>

        {/* v33 · M38 — the owner chip names WHICH record fills every page. The
            switcher needs the other claimed records to switch between, so it is
            labelled and inert until that module lands. */}
        <div className="mv-row" style={{ flexWrap: "wrap" }}>
          <span className="owner-chip">
            Owner: {demoOwner.record}
            <span
              className="sw-btn"
              aria-disabled="true"
              style={{ opacity: 0.6 }}
              title="Swap which owner record fills every page — dashboard, leases, map and reports"
            >
              Switch Owner ▾
            </span>
          </span>
        </div>
      </div>

      {/* The numbers that change, at the very top (v37 · C2+C6). */}
      <PortfolioStrip />

      {/* Alerts are the second-highest value on the page (OW-32), so the rollup
          sits directly under the value. */}
      <AlertsSummary />

      {/* The week's story, once per density — see `changed-since.tsx`. */}
      <ChangedSinceCard />
      <AlertStrip />
      <EssentialsHero />

      {/* v37 · C8 — below the changing numbers, not above them: the checklist is
          onboarding, and onboarding should not be the first thing an owner who
          already claimed sees each visit. Dismissible, and it stays dismissed. */}
      <GettingStartedChecklist />

      <KpiRow />
      <DashboardColumns />

      {/* The reference's last block on this route — Professional density only,
          collapsed by default. See `data-sources.tsx` for the note on what it
          discloses. */}
      <DataSources />
    </div>
  );
}
