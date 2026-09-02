import type { Metadata } from "next";

/*
 * THE CLAIM RAIL IS SHARED ROUTE CHROME, not a dashboard component — the design
 * puts the identical block at the top of the Dashboard, Alerts, Activities and
 * this page, precisely "so it doesn't move from one page to the next". It still
 * lives in `_components/dashboard/` because the Dashboard was the first route
 * built; now that a second route renders it, it belongs one level up in
 * `_components/`. Left where it is rather than moving it as a side effect of
 * shipping this page — noted so it is a decision and not an oversight.
 */
import { ClaimRail } from "../_components/dashboard/unclaimed-dashboard";
import { portalGate } from "../_components/ui/portal-gating";
import { ChangesSinceCard } from "./_components/changes-since-card";
import { PortalActionFooter } from "../_components/ui/action-footer";
import { EstimateExplainer } from "./_components/estimate-explainer";
import { FinancialsPanel } from "./_components/financials/financials-panel";
import { LeasesHeader } from "./_components/leases-header";
import { LeasesTabs, type LeaseTab } from "./_components/leases-tabs";
import { PlainEnglishList } from "./_components/plain-english-list";
import { PortfolioValueBand } from "./_components/portfolio-value-band";
import { RecordsUpdateNotice } from "./_components/records-update-notice";
import { StatementsPanel } from "./_components/statements-panel";
import { StatusExplainer } from "./_components/status-explainer";
import { LeaseReportStackNotice } from "./_components/list/report-stack-notice";
import { UltraSummary } from "./_components/ultra-summary";
import { UnclaimedSample } from "./_components/unclaimed-sample";
import { leaseRecords } from "./_lib/lease-records";

/**
 * MY LEASES — `/mineralownersite/leases`.
 *
 * A SERVER COMPONENT that composes ten sections and decides nothing else. Every
 * figure it prints is derived in `_lib/` and every piece of markup lives in a
 * component under `_components/`; what this file owns is the ORDER, which is the
 * one thing no section can decide for itself.
 *
 * ── THE ORDER, AND WHY IT IS THIS ORDER ──
 *
 *  1  ClaimRail            the pinned claim box, identical on every route
 *  2  UnclaimedSample      replaces everything below while unclaimed
 *  3  UltraSummary         replaces everything else in the Ultra tier
 *  4  LeasesHeader         the title, the record, the exports
 *  5  PortfolioValueBand   the dollars, ABOVE the notices — deliberately
 *  6  EstimateExplainer    how that total is reached, lease by lease
 *  7  StatusExplainer      what "7 active · 3 inactive" means
 *  8  RecordsUpdateNotice  an event, dismissible
 *  9  ChangesSinceCard     the change feed, dismissible
 * 10  LeasesTabs           the list, the financials, the statements
 *
 * The value band sits above both notices because the notices are dismissible and
 * variable in height: with them first, the number an owner came for moved down
 * the page — or off it — depending on how much news there was that week.
 *
 * ── WHY THE TREE IS FLAT ──
 *
 * `portal.css` selects DIRECT CHILDREN of `.mv-dash-routes` for two of its
 * gates: while the record is unclaimed it hides every child that is not
 * `.nc-only`, and in the Ultra tier it hides every child that is not `.tier-u`.
 *
 * So a flat list of sections gets both behaviours for free — sections 4 to 10
 * carry no gate class of their own and still disappear correctly in both states,
 * because each one IS a gated child. Grouping them under a wrapper would work
 * too (the wrapper would be the hidden child), but it would need its own gate
 * classes to say so, and the Dashboard next door is flat for the same reason.
 * Adding a section means adding a line here and nothing else.
 *
 * ── WHAT SHIPS TO THE BROWSER ──
 *
 * Four components: the two dismissible notices, the tab strip, and the lease
 * list panel that owns sort/search/view. The header, the band, both explainers,
 * the plain-English list, the Ultra summary, the unclaimed sample, the
 * financials (two hand-built SVG charts and two tables) and the statements are
 * all server-rendered — including the two tab panels, which are passed into the
 * client tab shell as props precisely so they stay that way. See the note in
 * `_components/leases-tabs.tsx`.
 */
export const metadata: Metadata = {
  title: "My Leases",
  description:
    "Every lease on your owner record — status, wells, production, and what your share of each is worth.",
};

/** `?ltab=` deep links, the prototype's own contract. Anything else: the list. */
function resolveTab(value: string | string[] | undefined): LeaseTab {
  return value === "fin" || value === "mon" ? value : "main";
}

export default async function MyLeasesPage({
  searchParams,
}: PageProps<"/mineralownersite/leases">) {
  const { ltab } = await searchParams;

  return (
    <div className={portalGate.pageRoot}>
      <ClaimRail />

      <UnclaimedSample />

      <UltraSummary />

      <LeasesHeader />
      <PortfolioValueBand />
      <EstimateExplainer />
      <StatusExplainer />
      <RecordsUpdateNotice />
      <ChangesSinceCard />
      <PlainEnglishList />
      <LeasesTabs
        leases={leaseRecords}
        defaultTab={resolveTab(ltab)}
        financials={<FinancialsPanel />}
        statements={<StatementsPanel />}
      />

      {/* THE REPORT-STACK NOTICE SITS OUTSIDE THE TAB PANEL, and outside the
          Essentials gate. The design carries it on an ungated wrapper while the
          "two honest numbers" notice beside it takes `hide-s` — so a plain-English
          reader is still told that every lease opens a full report, and is spared
          the calibration-study paragraph. Nesting both inside the list panel hid
          this one from the tier it matters most to. */}
      <LeaseReportStackNotice />

      <PortalActionFooter setKey="app-leases" />
    </div>
  );
}
