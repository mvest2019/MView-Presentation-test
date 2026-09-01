import { portfolio } from "../_lib/portal-demo-data";
import {
  LEASE_LOCK_DAYS,
  TRIAL_DAY,
  TRIAL_LENGTH_DAYS,
} from "../_lib/portal-state";

/**
 * The funnel bar — states 3, 4A and 4B, under the pinned value bar on every
 * portal route.
 *
 * THE THREE MESSAGES IT CARRIES, and what each one is for:
 *
 *   CLAIMED (state 3 · D-012, binding). "This is the funnel to try and encourage
 *   people to upgrade from a FREE account and claimed lease. It is just the
 *   first step, which focuses on the 7 day free Premium trial." ONE ask: start
 *   the trial. Deliberately NO price, no plan comparison, no annual term —
 *   paid conversion is the NEXT step of the funnel and putting it here competes
 *   with this one. Success metric: trial starts.
 *
 *   TRIAL (4A · v49 · OW-23/24/25). The trial IS FULL PREMIUM, not a cut-down
 *   tier — "give them the full premium… the only difference is these banners."
 *   So the CTA is an UPGRADE at $99.95/mo, not a retention save. It said "Pro
 *   trial" at $49.95 once; both were wrong, and "Pro" is a view density that
 *   must never come back as a plan name.
 *
 *   LAPSED (4B). Ryan's rule: keep ONE lease live, changeable once a week, and
 *   KEEP the community section. A dead account converts nobody; a
 *   useful-but-narrow one does. Nothing is deleted, and the copy says so.
 *
 * ALL THREE ARE IN THE MARKUP AND CSS PICKS ONE. The reference builds this
 * string in JavaScript on every state change; rendering all three and letting
 * `portal.css` choose gives the same output with no client bundle and no chance
 * of the wrong message painting first. Nothing shows for `unclaimed` (the claim
 * rail on the page is that state's message) or for `paid` (nothing to say).
 *
 * The active-lease picker the lapsed state carries is deliberately absent: it
 * chooses among the ten leases on the My Leases module, which is not built. A
 * picker with nothing to pick would be worse than the sentence that explains
 * the rule.
 */
export function PortalFunnelBar() {
  const daysLeft = TRIAL_LENGTH_DAYS - TRIAL_DAY;
  const onHold = Math.max(0, portfolio.leaseCount - 1);

  return (
    <div id="mvFunnelBar" role="status" aria-live="polite">
      {/* --- state 3 · free, claimed, never trialed ------------------------- */}
      <span className="fb-tag cl-only">Free plan</span>
      <span className="fb-msg cl-only">
        Your record is claimed —{" "}
        <b>all {portfolio.leaseCount} of your leases</b> are here and stay here.
        What each one is <b>worth to you</b> is the part Premium adds, along with
        your weekly report, the owner community and the monthly production report
        printed and mailed.{" "}
        <b>Try all of it free for {TRIAL_LENGTH_DAYS} days.</b>
      </span>

      {/* --- state 4A · in trial -------------------------------------------- */}
      <span className="fb-tag tr-only">Premium trial</span>
      <span className="fb-msg tr-only">
        <b>{daysLeft} days left</b>{" "}
        <span className="fb-pips" aria-hidden="true">
          {Array.from({ length: TRIAL_LENGTH_DAYS }, (_, day) => (
            <i key={day} className={day < TRIAL_DAY ? "spent" : undefined} />
          ))}
        </span>{" "}
        — this is <b>the full Premium plan</b>: all {portfolio.leaseCount} of
        your leases, MVestimate values, the owner community, your weekly report
        and the monthly mailed report. Keep it for <b>$99.95/mo</b>.
      </span>

      {/* --- state 4B · trial ended ----------------------------------------- */}
      <span className="fb-tag lp-only">Trial ended</span>
      <span className="fb-msg lp-only">
        Your <b>Premium</b> trial has ended, so your account is on the free plan.{" "}
        <b>One lease stays fully live</b> — you can change which one once every{" "}
        {LEASE_LOCK_DAYS} days. Your other {onHold} leases and their values are
        on hold, and <b>nothing has been deleted</b>.
      </span>

      {/* The CTAs. Billing & Plan is not built, so each is a labelled
          non-action rather than a button into a 404 — the message is the point
          of this bar, and it still lands. */}
      <span className="fb-act">
        <span className="fb-cta cl-only" aria-disabled="true">
          Start my {TRIAL_LENGTH_DAYS}-day free trial — soon
        </span>
        <span className="fb-cta tr-only" aria-disabled="true">
          Upgrade to Premium — soon
        </span>
        <span className="fb-cta lp-only" aria-disabled="true">
          Restore full access — soon
        </span>
      </span>
    </div>
  );
}
