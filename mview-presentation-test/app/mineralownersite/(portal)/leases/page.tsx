import type { Metadata } from "next";

import { gates, portalGate } from "../../_components/ui/portal-gating";
import { ChangesSinceCard } from "./_components/changes-since-card";
import { EstimateExplainer } from "./_components/estimate-explainer";
import { LeasesHeader } from "./_components/leases-header";
import { LeasesTabs, type LeaseTab } from "./_components/leases-tabs";
import { PlainEnglishList } from "./_components/plain-english-list";
import { PortfolioValueBand } from "./_components/portfolio-value-band";
import { UltraSummary } from "./_components/ultra-summary";
import { FinancialsPanel } from "./_components/financials/financials-panel";
import { LeaseListPanel } from "./_components/list/lease-list-panel";
import { MonthlyPanel } from "./_components/monthly/monthly-panel";
import { leaseRecords } from "./_lib/lease-records";

/**
 * MY LEASES — `/mineralownersite/leases`.
 *
 * A SERVER COMPONENT THAT DECIDES ONE THING: the order. Every figure is derived
 * in `_lib/` and every piece of markup lives in a component under
 * `_components/`; what this file owns is which section follows which, because
 * that is the one decision no section can make for itself.
 *
 * ── THE ORDER, AND WHY ──
 *
 *  0  UltraSummary          replaces everything else in the Ultra tier
 *  1  LeasesHeader          the title, whose record it is, the two exports
 *  2  PortfolioValueBand    the five figures — ABOVE the change feed, deliberately
 *  3  EstimateExplainer     how the two money columns differ, folded away
 *  4  ChangesSinceCard      what moved since last time, dismissible
 *  5  PlainEnglishList      what Essentials shows in place of the tab strip
 *  6  LeasesTabs            the list, the financials and the monthly report
 *
 * The band sits above the change feed because the feed is dismissible and varies
 * in height with how much news there is: with it first, the number an owner
 * opened the page for moved down the screen — or off it — depending on the week.
 *
 * THE PROVENANCE CARD ("Where each figure comes from") USED TO CLOSE THE PAGE
 * and has been removed. Its content is not lost: the lease report each row opens
 * carries the same sourcing against the one lease a reader is actually asking
 * about, which is where a question about a figure gets asked. Recoverable from
 * git history if it is wanted back here.
 *
 * ── WHAT SHIPS TO THE BROWSER ──
 *
 * The dismissible change feed, the tab strip, the list panel that owns sort,
 * page size, search and layout, the financials panel and the monthly report.
 * The header, the band, the explainer and the provenance card are
 * server-rendered — they are passed into the client tab shell as nodes
 * precisely so they stay that way.
 *
 * ── THE TREE IS FLAT BECAUSE THE DENSITY GATE SELECTS DIRECT CHILDREN ──
 *
 * `portalGate.pageRoot` is what lets `portal.css` replace the page in Ultra: it
 * hides every direct child of this element that is not `.tier-u`, which is why
 * `UltraSummary` is a sibling of the sections rather than nested inside one.
 * Carrying that class WITHOUT an Ultra variant renders a blank page, which is
 * why the two arrived together.
 *
 * The unclaimed swap is guarded differently — its rule is scoped by
 * `:has(> .nc-swap)` — so a root with no unclaimed panel simply renders in
 * full, which is the behaviour this module wants until one exists.
 *
 * ── WHAT EACH TIER SHOWS ──
 *
 * Ultra         the summary card, the value band, and nothing else.
 * Essentials    the plain-English list INSTEAD of the tab strip and the table.
 * Detailed      the default — the tabs, the table, the financials, the report.
 * Professional  adds the provenance card under the table.
 *
 * THE TABLE ITSELF IS THE SAME WHEREVER IT APPEARS. Four columns were briefly
 * gated by density and that was reverted: a reader changing how densely they
 * read should not find columns gone from a table they are using. The density
 * decides WHETHER the table is the right instrument at all — at Essentials it
 * is not, and the plain list stands in for it — not which of its columns
 * survive.
 */
export const metadata: Metadata = {
  title: "My Leases",
  description:
    "Every lease on your owner record — what your share is worth, what the county says it is worth, and what each one has produced.",
};

/** `?ltab=` deep links. Anything else opens the list. */
function resolveTab(value: string | string[] | undefined): LeaseTab {
  return value === "fin" || value === "mon" ? value : "main";
}

export default async function MyLeasesPage({
  searchParams,
}: PageProps<"/mineralownersite/leases">) {
  const { ltab } = await searchParams;

  return (
    <div className={`${portalGate.pageRoot} ${portalGate.wideColumn}`}>
      <UltraSummary />

      <LeasesHeader />
      <PortfolioValueBand />
      <EstimateExplainer />
      <ChangesSinceCard />

      <PlainEnglishList />

      <div className={gates("hideInEssentials")}>
        <LeasesTabs
          defaultTab={resolveTab(ltab)}
          leases={<LeaseListPanel leases={leaseRecords} />}
          financials={<FinancialsPanel />}
          statements={<MonthlyPanel />}
        />
      </div>
    </div>
  );
}
