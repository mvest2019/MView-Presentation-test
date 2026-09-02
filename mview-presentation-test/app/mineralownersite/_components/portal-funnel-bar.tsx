import { ActiveLeasePicker } from "./active-lease-picker";
import { portfolio } from "../_lib/portal-demo-data";
import { TRIAL_DAY, TRIAL_LENGTH_DAYS } from "../_lib/portal-state";

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
 * THE ACTIVE-LEASE PICKER IS PART OF THE LAPSED MESSAGE, not an extra. The
 * copy says "pick which below", so the control has to be there or the sentence
 * points at nothing — see `active-lease-picker.tsx`. It needs no unbuilt route:
 * the choice is the owner's own and is stored on their device.
 *
 * THE TWO CTAs ARE INERT, and that is a build fact rather than a design one.
 * Each points at Billing & Plan, which is not built, so both render with the
 * reference's exact wording and styling but `aria-disabled` and a `title`
 * saying the module is not open yet — the same convention the top bar's bell
 * follows. They become real links when `billing/page.tsx` lands.
 */
/** Both CTAs point at the same unbuilt module, so they say so the same way. */
const UNBUILT =
  "Billing & Plan is not open yet — it arrives with its own module.";

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
        <b>One lease stays fully live</b> — pick which below. Your other {onHold}{" "}
        leases and their values are on hold, and nothing has been deleted.
      </span>

      {/* State 4B only — `portal.css` shows `#mvActiveLeaseWrap` in `lapsed`
          and hides it everywhere else, so it costs nothing on the other
          states. */}
      <ActiveLeasePicker />

      {/* The CTAs — a primary and a secondary per state, the reference's own
          pairs: trial / "What the trial includes", upgrade / "Compare plans",
          restore / "What I am missing". Both go to Billing & Plan, which is not
          built, so both are labelled non-actions rather than buttons into a
          404 — the message is the point of this bar, and it still lands. */}
      <span className="fb-act">
        <span className="fb-cta cl-only" aria-disabled="true" title={UNBUILT}>
          Start my {TRIAL_LENGTH_DAYS}-day free trial
        </span>
        <span className="fb-2nd cl-only" aria-disabled="true" title={UNBUILT}>
          What the trial includes
        </span>

        <span className="fb-cta tr-only" aria-disabled="true" title={UNBUILT}>
          Upgrade to Premium
        </span>
        <span className="fb-2nd tr-only" aria-disabled="true" title={UNBUILT}>
          Compare plans
        </span>

        <span className="fb-cta lp-only" aria-disabled="true" title={UNBUILT}>
          Restore full access
        </span>
        <span className="fb-2nd lp-only" aria-disabled="true" title={UNBUILT}>
          What I am missing
        </span>
      </span>
    </div>
  );
}
