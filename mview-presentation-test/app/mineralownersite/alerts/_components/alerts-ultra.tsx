import { PortalButtonLink } from "../../_components/ui/button";
import { gates } from "../../_components/ui/portal-gating";
import { UltraHero } from "../../_components/ui/ultra-hero";
import { watchLedger } from "../_lib/watch-ledger";

/**
 * THE ULTRA TIER — v38 · P1-02: "one status, one action, one reassurance".
 *
 * `tier-u`, and `portal.css` hides every sibling of it, so this IS the Alerts
 * page for a reader who has chosen the calmest view.
 *
 * ── THE HEADLINE IS "NOTHING NEEDS YOU TODAY" ON A PAGE WITH NINE ALERTS ──
 *
 * That is not a contradiction and it is the most important judgement on this
 * screen. Nine things changed; one of them is worth doing something about, and
 * it is not urgent. The honest Ultra summary of that is not "9 alerts" — a
 * number that reads as a backlog — it is that today is fine, followed by the one
 * thing to do when there is a minute.
 *
 * ── THE STATUS LINE STATES A PRODUCTION FACT, NOT A PAYMENT ONE ──
 *
 * "Ledbetter produced gas in months we can see" — and the audit is what checks
 * whether it was paid. At Ultra length this is the only sentence on the page, and
 * it does not get to become an accusation just because it is alone. The same
 * correction the dashboard's Ultra hero carries.
 *
 * ── THE SECOND NOTE IS THE RETENTION ARGUMENT, IN ONE LINE ──
 *
 * v44 · OW-32, and it is the honest form of it: you are paying for the looking,
 * not for there being something to find. "That quiet is the service working, not
 * the service asleep" is ported verbatim — it is the sentence that makes a quiet
 * week feel like value instead of like nothing happened.
 */
export function AlertsUltra() {
  return (
    <div className={gates("ultraOnly")}>
      <UltraHero
        kicker="Your alerts"
        headline={
          <>
            Nothing needs you <strong>today</strong>
          </>
        }
        status={
          <>
            One thing when you have a minute: Ledbetter produced gas in months we
            can see — the Lease Audit included with your plan checks whether you
            were paid.
          </>
        }
        action={
          <PortalButtonLink variant="primary" size="lg" href="/lease-audit">
            Run the included check
          </PortalButtonLink>
        }
        note={
          <>
            Included with your 12-month Premium · prefer not to subscribe? $500
            covers every lease once · you get a plain-English report.
            <br />
            <br />
            We read the public record on your {watchLedger.leases} leases every
            day. Most days there is nothing to tell you — and we will still have
            looked. That quiet is the service working, not the service asleep.
          </>
        }
      />
    </div>
  );
}
