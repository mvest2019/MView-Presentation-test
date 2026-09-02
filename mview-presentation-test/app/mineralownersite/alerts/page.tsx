import type { Metadata } from "next";

import { ClaimRail } from "../_components/dashboard/unclaimed-dashboard";
import { PortalActionFooter } from "../_components/ui/action-footer";
import { portalGate } from "../_components/ui/portal-gating";
import { AlertClassLegend } from "./_components/alert-class-legend";
import { AlertInbox, type AlertInboxItem } from "./_components/alert-inbox";
import { AlertRow } from "./_components/alert-row";
import { AlertsEssentialsHero } from "./_components/alerts-essentials-hero";
import { AlertsHeader } from "./_components/alerts-header";
import { AlertsReadProvider } from "./_components/alerts-read-state";
import { AlertsUltra } from "./_components/alerts-ultra";
import { DeliveryNote } from "./_components/delivery-note";
import { QuietWeekCard } from "./_components/quiet-week-card";
import { UnclaimedAlerts } from "./_components/unclaimed-alerts";
import { WatchLedgerPanel } from "./_components/watch-ledger-panel";
import { alertRecords } from "./_lib/alert-records";

/**
 * ALERTS — `/mineralownersite/alerts`.
 *
 * A SERVER COMPONENT that composes nine sections and decides nothing else, the
 * same arrangement as My Leases next door. Every figure it prints is derived in
 * `_lib/` and every piece of markup lives in `_components/`; what this file owns
 * is the ORDER, which is the one thing no section can decide for itself.
 *
 * ── THE ORDER, AND WHY IT IS THIS ORDER ──
 *
 *  1  ClaimRail             the pinned claim box, identical on every route
 *  2  UnclaimedAlerts       replaces everything below while unclaimed
 *  3  AlertsUltra           replaces everything else in the Ultra tier
 *  4  AlertsHeader          the title, Mark all read, Alert preferences
 *  5  AlertsEssentialsHero  the nine-in-one-line summary (Essentials only)
 *  6  WatchLedgerPanel      what the subscription actually buys
 *  7  AlertClassLegend      the delivery taxonomy (Professional only)
 *  8  AlertInbox            search, filter, and the nine alerts
 *  9  QuietWeekCard         what next week probably looks like
 * 10  DeliveryNote          delivery, dedup, retention
 * 11  PortalActionFooter    "what do you want to do next?"
 *
 * The ledger sits BELOW the summary and ABOVE the list because the alerts are
 * the product and the ledger is why the product costs money (OW-32). Opening
 * with a price justification is what an owner who came to read their alerts
 * least wants; burying it under nine rows means nobody reads it on the visit
 * where the renewal is decided.
 *
 * ── THE CLAIM RAIL IS FIRST, AND THAT IS THE DEFECT v43 · OW-02 FIXED ──
 *
 * This route is the one Ryan named: he liked the claim box on the Dashboard and
 * it was NOT here — the only claim CTA on Alerts sat at the very bottom of the
 * sample panel. Same block, same first position as Dashboard, My Leases and
 * Activities, "so it doesn't move from one page to the next."
 *
 * ── WHY THE TREE IS FLAT ──
 *
 * `portal.css` selects DIRECT CHILDREN of `.mv-dash-routes` for two gates: while
 * the record is unclaimed it hides every child that is not `.nc-only`, and in
 * the Ultra tier it hides every child that is not `.tier-u`. A flat list of
 * sections gets both behaviours for free.
 *
 * `AlertsReadProvider` does not break that, and it is the reason it is a context
 * rather than a wrapper element: a provider renders no DOM, so sections 4 to 11
 * remain direct children of the page root. See `_components/alerts-read-state.tsx`.
 *
 * ── WHAT SHIPS TO THE BROWSER ──
 *
 * The read-state provider, "Mark all read", the inbox shell (search + filter),
 * the `why?` tooltips and the prototype buttons. The nine alert ROWS are rendered
 * here, on the server, and handed to the inbox as nodes — see the note in
 * `_components/alert-inbox.tsx` for why that matters on a page whose text is
 * mostly nine four-heading explainers.
 */
export const metadata: Metadata = {
  title: "Alerts",
  description:
    "Everything that changed on your record since your last visit — and the one thing that asks something of you.",
};

export default function AlertsPage() {
  /*
   * THE ROWS ARE RENDERED HERE so they stay server components, and only the
   * four fields the filter needs travel with them. `AlertRecord` already has
   * those four fields, so this is a projection and not a second shape to keep in
   * step: adding a searchable field to the record adds it here by name only.
   */
  const items: AlertInboxItem[] = alertRecords.map((alert) => ({
    id: alert.id,
    category: alert.category,
    headline: alert.headline,
    meta: alert.meta,
    keywords: alert.keywords,
    row: <AlertRow alert={alert} />,
  }));

  return (
    <AlertsReadProvider>
      <div className={portalGate.pageRoot}>
        <ClaimRail />

        <UnclaimedAlerts />

        <AlertsUltra />

        <AlertsHeader />
        <AlertsEssentialsHero />
        <WatchLedgerPanel />
        <AlertClassLegend />
        <AlertInbox items={items} />
        <QuietWeekCard />
        <DeliveryNote />

        <PortalActionFooter setKey="app-alerts" />
      </div>
    </AlertsReadProvider>
  );
}
