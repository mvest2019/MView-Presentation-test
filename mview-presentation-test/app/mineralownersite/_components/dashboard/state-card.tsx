import { portfolio } from "../../_lib/portal-demo-data";
import {
  LEASE_LOCK_DAYS,
  TRIAL_DAY,
  TRIAL_LENGTH_DAYS,
} from "../../_lib/portal-state";

/**
 * The dashboard state card — the funnel bar's message, on the route its CTA
 * lands on.
 *
 * WHY IT EXISTS SEPARATELY FROM THE BAR: the state has to be visible on the page
 * the link actually opens. A bar that says "start your trial" and a dashboard
 * that says nothing about it leaves the owner on a page of blurred numbers with
 * no explanation of why.
 *
 * VISIBLE IN ULTRA TOO (v50 · BG-06). It was hidden there by the page-replacement
 * rule, which left a trial or lapsed owner looking at one blurred number and no
 * reason for it. Ultra's contract is one status and one action, so the supporting
 * sentences carry `.hide-u`: the state still READS, at Ultra length, instead of
 * dropping a five-sentence card onto a one-number page.
 *
 * `#mvStateCard` is exempted from the Ultra rule by id rather than given
 * `.tier-u` — that class is hidden in the other three views, and this card has
 * to show in all four.
 *
 * THE CLAIMED CARD LEADS WITH WHAT THE OWNER ALREADY HAS. D-012: they claimed
 * it; never ask them to claim again. Then it names the one thing held back and
 * why the trial is how they see it.
 */
/**
 * The card's action row. The reference styles `#mvStateCard .sc-row a`, and
 * both destinations here (Billing, My Leases) are unbuilt modules — so these
 * are inert spans, and `portal.css` carries the same rule for `.sc-row > span`.
 * The secondary link is `.ghost hide-u`: Ultra's contract is ONE status and ONE
 * action, so only the primary survives there.
 */
function StateCardRow({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string;
}) {
  return (
    <div className="sc-row">
      <span aria-disabled="true">{primary}</span>
      <span className="ghost hide-u" aria-disabled="true">
        {secondary}
      </span>
    </div>
  );
}

export function StateCard() {
  const daysLeft = TRIAL_LENGTH_DAYS - TRIAL_DAY;
  const onHold = Math.max(0, portfolio.leaseCount - 1);

  return (
    <div id="mvStateCard">
      {/* --- state 3 · free, claimed, never trialed ------------------------- */}
      <div className="cl-only">
        <h4>
          Your record is claimed — all {portfolio.leaseCount} leases are yours
        </h4>
        <span className="hide-u">
          Everything on your record is open: every lease, its wells, whether it
          is producing, and the permits and completions happening around it. We
          watch all of it for you on the free plan and nothing here expires.{" "}
        </span>
        <b>What each lease is worth to you</b> — your MVestimate — is the one
        figure still covered up, together with your weekly report, the owner
        community and the monthly production report printed and mailed. Those are
        Premium, and you can have all of them free for {TRIAL_LENGTH_DAYS} days.
        <StateCardRow
          primary={`Start my ${TRIAL_LENGTH_DAYS}-day free trial`}
          secondary={`See all ${portfolio.leaseCount} of my leases →`}
        />
      </div>

      {/* --- state 4A · in trial -------------------------------------------- */}
      <div className="tr-only">
        <h4>
          Day {TRIAL_DAY} of your {TRIAL_LENGTH_DAYS}-day <b>Premium</b> trial ·{" "}
          {daysLeft} days left
        </h4>
        You are on the full Premium plan, not a cut-down one — all{" "}
        {portfolio.leaseCount} leases, MVestimate values on each, the owner
        community, your weekly report, and the monthly production report printed
        and mailed. <span className="hide-u">Nothing on this screen is a preview. </span>
        When the trial ends, one lease stays live and the rest go on hold.
        <StateCardRow
          primary="Upgrade to Premium — $99.95/mo"
          secondary="See everything you have →"
        />
      </div>

      {/* --- state 4B · trial ended ----------------------------------------- */}
      <div className="lp-only">
        <h4>Your trial has ended — one lease stays live</h4>
        Nothing has been deleted. {onHold} of your {portfolio.leaseCount} leases
        and your portfolio totals are on hold, and the figures below are hidden
        for that reason.{" "}
        <span className="hide-u">
          You can change which lease is live once every {LEASE_LOCK_DAYS} days.
        </span>
        <StateCardRow
          primary="Restore full access"
          secondary="Choose my live lease →"
        />
      </div>
    </div>
  );
}
