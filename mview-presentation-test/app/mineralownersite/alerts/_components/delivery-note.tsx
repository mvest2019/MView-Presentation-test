import { gates } from "../../_components/ui/portal-gating";
import { watchLedger } from "../_lib/watch-ledger";

/**
 * THE FOOT OF THE PAGE — how alerts are delivered, and what is promised about
 * them.
 *
 * ── TWO PARAGRAPHS, TWO TIERS (v38 · P1-02) ──
 *
 * Detailed gets the short line: delivery is your call, and alerts fire on real
 * events. Professional gets the mechanics — what an alert email contains, the
 * two dates every alert carries, the deduplication rule, and the retention
 * period. Delivery mechanics are METHOD, and method is the densest tier.
 *
 * ── THE FOUR PROMISES IN THE PROFESSIONAL LINE ARE COMMITMENTS ──
 *
 *   · An alert email is a SUMMARY WITH A LINK BACK, never the full content —
 *     which is a privacy position, not a formatting preference: an owner's
 *     figures should not sit in an inbox that may be shared or forwarded.
 *   · Every alert carries its EVENT date and its DETECTION date, so an old
 *     filing newly matched to the record says so rather than looking like news.
 *   · One event never repeats across dashboard, alerts and email unless the
 *     underlying fact changes.
 *   · History is kept {watchLedger.historyMonths} months.
 *
 * Settings is named rather than linked — it is not built, and the portal does not
 * point an affordance at nothing.
 */
export function DeliveryNote() {
  return (
    <>
      <p
        className={`mt-3.5 text-[11px] leading-[1.6] text-mv-muted ${gates(
          "hideInEssentials",
        )}`}
      >
        Delivery is your call — email, push, or in-app per alert type in Settings.
        Quiet by design: alerts fire on real events, never to look busy.
      </p>

      <p
        className={`mt-1.5 text-[11px] leading-[1.6] text-mv-muted ${gates(
          "professionalOnly",
        )}`}
      >
        Alert emails are a{" "}
        <strong>
          short summary with a link back here — never the full content
        </strong>
        . Every alert carries its{" "}
        <strong>event date and the date we detected it</strong> — an old filing
        newly matched to your record says so, and one event never repeats across
        dashboard, alerts, and email unless it changes. History kept{" "}
        {watchLedger.historyMonths} months.
      </p>
    </>
  );
}
