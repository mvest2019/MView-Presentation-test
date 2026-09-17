import Link from "next/link";

import { PinnedSpotStrip } from "./pinned-spot-strip";
import { formatLakhs } from "../_lib/format-lakhs";
import { portfolio } from "../_lib/portal-demo-data";

/**
 * The pinned value + spot bar  (v43 · OW-31 + OW-04).
 *
 * Ryan, in both audits: "We need to take the value, put it up top. Spot at the
 * top… so that when you go from one page to the next you're not losing track of
 * it… this is the highest value right here."
 *
 * WHERE IT SITS: inside `.app-main`, directly under the top bar and OUTSIDE the
 * page — so it renders on EVERY portal route rather than the Dashboard only,
 * and navigating between modules never tears it down. Sticky at `top: 58px`
 * (the top bar's height) on desktop; static on mobile, where a second sticky
 * band would eat the screen.
 *
 * OW-30 — "I don't want to have so much at the top that you bury everything
 * below it": ONE slim row, no second line, no card chrome.
 *
 * DENSITY, reusing the existing tier helpers rather than a new engine:
 *   ultra     the value, WTI and NAT GAS (Brent and propane carry `.hide-u`)
 *   others    the value and all four series
 *
 * FUNNEL STATES — the gates are respected, never defeated:
 *   unclaimed  the value is REPLACED by the claim line (`.nc-hide` / `.nc-only`)
 *   claimed    the value is covered up and the sub-line becomes the invitation
 *   lapsed     the value blurs, exactly like every other all-ten-lease figure
 *   trial/paid the value in full
 *
 * A SERVER COMPONENT, and every variant above is still a CSS gate. The ONE
 * piece that now ships JavaScript is the spot strip: it polls the same
 * `/api/prices` the Dashboard's top nav polls, so the two cannot disagree. See
 * `PinnedSpotStrip` for why the static file it used to read had to go — the
 * short version is that the two strips were showing WTI two months and $16.58
 * apart.
 */
export async function PinnedValueBar() {
  return (
    <div
      id="mvPinBar"
      role="group"
      aria-label="Your portfolio value and spot prices"
    >
      {/* The disclaimer rides the `title` AND the `aria-label` as well as the
          visible `.pin-sub`, because `.pin-sub` is the first thing the width
          ladder drops on a narrow window — and the figure must never be
          readable without the qualifier that bounds it. */}
      <div
        className="pin-val-wrap nc-hide"
        title="Your MVestimate — an estimate, not an appraisal"
        aria-label={`Your minerals, MVestimate ${portfolio.estimate} — an estimate, not an appraisal`}
      >
        <span className="pin-label">Your minerals</span>
        {/* `.cl-lock` is the opt-in that state 3 blurs. It is on this one figure
            and nothing else in the bar: the spot prices beside it stay sharp,
            because they are public market data, not the owner's. */}
        <span className="pin-val num cl-lock">
          {formatLakhs(portfolio.estimate)}
        </span>
        {/* "MVestimate · estimate, not an appraisal", beside the figure it
            qualifies (requested).

            IT CARRIED `.hide-s` AND SO WAS INVISIBLE BY DEFAULT. Essentials is
            the product default density, and `.hide-s` hides its element there —
            so the one disclaimer attached to a money figure never appeared for
            the owners most likely to need it. It now shows at every density.

            `.pin-sub-basis` replaces `.hide-s` as the hook rather than the class
            simply being deleted: the width ladder and the two state
            replacements below still have to target this span, and they should
            not be re-coupled to a density class. */}
        <span className="pin-sub pin-sub-basis">
          {portfolio.estimateBasis}
        </span>
        <span className="pin-sub lp-only">
          portfolio total on hold — Premium
        </span>
        {/* D-012 · the ONE thing a free claimed owner cannot see yet, said as an
            invitation rather than a lock. No price here: the ask is the trial,
            not the plan. */}
        <span className="pin-sub cl-only">
          what it&apos;s worth — free for 7 days
        </span>
      </div>

      <span className="nc-only nc-inline pin-claim">
        Claim your mineral owner record to see what it&apos;s worth —{" "}
        <Link href="/claim">Claim now →</Link>
      </span>

      {/* THE SPOT STRIP — the live settlements, and FAIL CLOSED.

          It renders nothing until the endpoint answers and nothing at all if it
          never does: no spinner, no zeros, no last-known value, and above all
          no stale seed painted first. A missing strip is honest; a confident
          wrong one is the defect this replaced. See `spot-prices.ts` for the
          $15.50-wrong random walk that made the rule, and `PinnedSpotStrip`
          for why the file that rule was written about is no longer the source.

          No arrows and no percentages here: one settlement is a value, not a
          change. */}
      <PinnedSpotStrip />
    </div>
  );
}
