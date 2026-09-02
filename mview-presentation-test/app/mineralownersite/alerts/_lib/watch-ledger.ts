import { portfolioSummary } from "../../leases/_lib/lease-totals";
import { alertCounts } from "./alert-counts";

/**
 * "WHAT YOU'RE ACTUALLY PAYING FOR" — the watch ledger's figures.
 *
 * ── WHY THIS PANEL EXISTS (v44 · OW-32) ──
 *
 * "Alerts are the second-highest value. The purpose of these alerts is for
 * RETENTION — not necessarily upgrading, but to justify the cost of the
 * subscription."
 *
 * The page already listed the alerts. What it never showed was the WORK, and the
 * work is what a subscription actually buys. On a quiet week an alert list is the
 * weakest possible argument for renewing; the ledger is the strongest, because it
 * is true on quiet weeks too — the sweep ran, and found nothing, and that is the
 * service working rather than asleep.
 *
 * ── THE HONESTY RULE, WHICH IS THE WHOLE PANEL ──
 *
 * We do NOT claim the watch has saved or recovered a dollar, and no figure here
 * may be turned into one. Production is public; payment is not. The only place an
 * underpayment can be proven is on the owner's own statements, which is the Lease
 * Audit's job — the panel says so in as many words rather than borrowing credit
 * for it.
 *
 * What the subscription promises instead is narrower and testable: the sweep runs
 * every morning, a quiet week gets a quiet page, and nothing was invented to look
 * busy.
 *
 * ── WHERE EACH NUMBER COMES FROM ──
 *
 * Four are DERIVED and cannot be edited here: the alert total, the
 * action-recommended count, the lease count and the county count all come from
 * `alertCounts` and the leases module. Four are still fixtures, because the feeds
 * behind them are not wired — each names the collection it will read on its own
 * line below, exactly as the reference's `MV_WATCH` does, so wiring them is
 * editing one object.
 */

/**
 * THE FOUR FIGURES THAT ARE NOT COMPUTED YET.
 *
 * Every one is a fixture from the demo record. When the notification and
 * activity feeds land, this object is the only thing that changes.
 */
export const watchFixtures = {
  /** Mongo.ProdMvestPortal.Adjacent_Lease_Activity — leases within ~1 mile. */
  adjacentLeases: 22,
  /** Mongo.GeoMapPortal.LeaseRadiusData — standing permits within ~1 mile. */
  standingPermits: 38,
  /** Mongo.ProdMvestPortal.Activity_Production — filings read since last visit. */
  productionFilings: 228,
  /** PG.member_session — the visit these nine alerts are measured from. */
  since: "Jul 01",
  /** The sweep's hour. The panel's central claim, so it is named once. */
  sweepTime: "6:00 AM",
  /** PG.notification_history retention. */
  historyMonths: 12,
} as const;

/**
 * THE PRICE ARITHMETIC — arithmetic on the published price and nothing else.
 *
 * $99.95 × 12 ÷ 52 = $23.07/wk · $999.50 ÷ 52 = $19.22/wk. The panel rounds both
 * to whole dollars because it is making a "about the price of…" argument, not
 * quoting a bill, and a bill to the cent invites the reader to check it against
 * an invoice that says something else.
 *
 * Computed rather than typed so a price change moves both weekly figures with it.
 */
const MONTHLY_PRICE = 99.95;
const ANNUAL_PRICE = 999.5;
const WEEKS_PER_YEAR = 52;

export const premiumPricing = {
  monthly: MONTHLY_PRICE,
  annual: ANNUAL_PRICE,
  weeklyOnMonthly: Math.round((MONTHLY_PRICE * 12) / WEEKS_PER_YEAR),
  weeklyOnAnnual: Math.round(ANNUAL_PRICE / WEEKS_PER_YEAR),
} as const;

/** What the panel prints, derived and fixture figures side by side. */
export const watchLedger = {
  leases: portfolioSummary.leaseCount,
  counties: portfolioSummary.countyCount,
  adjacentLeases: watchFixtures.adjacentLeases,
  standingPermits: watchFixtures.standingPermits,
  productionFilings: watchFixtures.productionFilings,
  alerts: alertCounts.total,
  action: alertCounts.action,
  rest: alertCounts.rest,
  since: watchFixtures.since,
  sweepTime: watchFixtures.sweepTime,
  historyMonths: watchFixtures.historyMonths,
} as const;
