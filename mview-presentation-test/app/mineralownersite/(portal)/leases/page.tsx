import type { Metadata } from "next";

import { ChangesSinceCard } from "./_components/changes-since-card";
import { EstimateExplainer } from "./_components/estimate-explainer";
import { LeasesHeader } from "./_components/leases-header";
import { LeasesTabs, type LeaseTab } from "./_components/leases-tabs";
import { PortfolioValueBand } from "./_components/portfolio-value-band";
import { SourcesCard } from "./_components/sources-card";
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
 *  1  LeasesHeader          the title, whose record it is, the two exports
 *  2  PortfolioValueBand    the five figures — ABOVE the change feed, deliberately
 *  3  EstimateExplainer     how the two money columns differ, folded away
 *  4  ChangesSinceCard      what moved since last time, dismissible
 *  5  LeasesTabs            the list, the financials and the monthly report
 *  6  SourcesCard           which record each figure came off
 *
 * The band sits above the change feed because the feed is dismissible and varies
 * in height with how much news there is: with it first, the number an owner
 * opened the page for moved down the screen — or off it — depending on the week.
 * The provenance card sits last because a reader who accepts the figures never
 * needs it and a reader who does not is already at the bottom looking for it.
 *
 * ── WHAT SHIPS TO THE BROWSER ──
 *
 * The dismissible change feed, the tab strip, the list panel that owns sort,
 * page size, search and layout, the financials panel and the monthly report.
 * The header, the band, the explainer and the provenance card are
 * server-rendered — they are passed into the client tab shell as nodes
 * precisely so they stay that way.
 *
 * ── NO `portalGate.pageRoot`, AND THAT IS A DECISION ──
 *
 * That class exists so `portal.css` can replace a module's top-level sections in
 * the unclaimed and Ultra states: while unclaimed it hides every direct child
 * that is not `.nc-only`, and in Ultra every child that is not `.tier-u`. This
 * module ships neither variant yet, so carrying the class would render a
 * completely blank page in both states rather than a gated one. The page reads
 * the same in every state until those two panels exist — see the warning in
 * `_components/ui/portal-ui.md`.
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
    <div>
      <LeasesHeader />
      <PortfolioValueBand />
      <EstimateExplainer />
      <ChangesSinceCard />

      <LeasesTabs
        defaultTab={resolveTab(ltab)}
        leases={<LeaseListPanel leases={leaseRecords} />}
        financials={<FinancialsPanel />}
        statements={<MonthlyPanel />}
      />

      <SourcesCard />
    </div>
  );
}
