import type { Metadata } from "next";
import { cookies } from "next/headers";

import Portal from "../../_components/reference/Portal";
import { portalGate } from "../../_components/ui/portal-gating";
import { funnelStateFromCookie } from "../../_lib/funnel-state-store";
import { STORAGE_KEYS } from "../../_lib/portal-state";
import { ChangesSinceCard } from "./_components/changes-since-card";
import { EstimateExplainer } from "./_components/estimate-explainer";
import { LeasesHeader } from "./_components/leases-header";
import { LeasesPortalRoot } from "./_components/leases-portal-root";
import { LeasesTabs, type LeaseTab } from "./_components/leases-tabs";
import { PlainEnglishList } from "./_components/plain-english-list";
import { PortfolioValueBand } from "./_components/portfolio-value-band";
import { UltraSummary } from "./_components/ultra-summary";
import { FinancialsPanel } from "./_components/financials/financials-panel";
import { LeaseListPanel } from "./_components/list/lease-list-panel";
import { MonthlyPanel } from "./_components/monthly/monthly-panel";
import { leaseRecords } from "./_lib/lease-records";
import { loadShellPayload } from "./_lib/shell-payload";

/**
 * MY LEASES — `/mineralownersite/leases`.
 *
 * ── IT WEARS THE SAME CHROME AS EVERY OTHER PAGE ──
 *
 * This page is in the `(reference)` group and renders `Portal` with
 * `route="leases"`, which is exactly what `/mineralownersite`, Alerts,
 * Activities, the Weekly Report, the Production page and the Map do. Not a copy
 * of that header — the same `Chrome.tsx`, the same sidebar in the same order,
 * the same pinned value line, the same account-state button and the same avatar
 * menu with the four density tabs. The `My Leases` row lights up and the bar
 * reads "My Leases" because `ROUTE_TITLE` already carried it.
 *
 * The page itself arrives as `children`, which is the Map's arrangement and the
 * adaptation `Portal`'s `children` prop exists for. Its own styling starts
 * below the chrome, at `LeasesPortalRoot` — see that file for why `mv-portal`
 * is on a wrapper and not on the shell.
 *
 * ── A SERVER COMPONENT THAT DECIDES ONE THING: the order ──
 *
 * Every figure is derived in `_lib/` and every piece of markup lives in a
 * component under `_components/`; what this file owns is which section follows
 * which, because that is the one decision no section can make for itself.
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
 *
 * `force-dynamic` for the same reason as the other pages in this group: the
 * owner comes off the query string, so there is nothing correct to cache at the
 * page level.
 */
export const metadata: Metadata = {
  title: "My Leases",
  description:
    "Every lease on your owner record — what your share is worth, what the county says it is worth, and what each one has produced.",
};

export const dynamic = "force-dynamic";

/** `?ltab=` deep links. Anything else opens the list. */
function resolveTab(value: string | string[] | undefined): LeaseTab {
  return value === "fin" || value === "mon" ? value : "main";
}

export default async function MyLeasesPage({
  searchParams,
}: PageProps<"/mineralownersite/leases">) {
  const { ltab } = await searchParams;

  /* Two independent server reads. The payload is the shared chrome's; the
     cookie is this page's own copy of the funnel state, so the root below can
     tell whether the shell has since moved on. See `leases-portal-root.tsx`. */
  const [initial, store] = await Promise.all([
    loadShellPayload(searchParams),
    cookies(),
  ]);
  const serverFunnelState = funnelStateFromCookie(
    store.get(STORAGE_KEYS.funnelState)?.value,
  );

  return (
    <Portal route="leases" initial={initial} shellClass="mv-leases-shell">
      <LeasesPortalRoot serverFunnelState={serverFunnelState}>
        <div className={`${portalGate.pageRoot} ${portalGate.wideColumn}`}>
          <UltraSummary />

          <LeasesHeader />
          <PortfolioValueBand />
          <EstimateExplainer />
          <ChangesSinceCard />

          <PlainEnglishList />

          {/* HIDDEN AT ESSENTIALS, because at Essentials it is the SECOND list
              of the same leases on one screen.

              `PlainEnglishList` above is the Essentials view of this table —
              the same ten leases, one sentence each, no columns to compare. It
              renders at Essentials and only at Essentials (`tier-s`), so from
              Detailed up nothing here changes: the strip, the table, the
              financials and the statements are all present exactly as before.

              WHAT THIS COSTS AT ESSENTIALS is the Financials and the Monthly
              Reports along with the table, because the three share one strip
              and hiding the table alone would leave the strip opening on an
              empty panel. If those two should stay, the fix is to drop the
              "My Leases" tab from the strip at this tier rather than the strip
              itself — say the word.

              Ultra is unaffected either way: it replaces the page. */}
          <div className={portalGate.hideInEssentials}>
            <LeasesTabs
              defaultTab={resolveTab(ltab)}
              leases={<LeaseListPanel leases={leaseRecords} />}
              financials={<FinancialsPanel />}
              statements={<MonthlyPanel />}
            />
          </div>
        </div>
      </LeasesPortalRoot>
    </Portal>
  );
}
