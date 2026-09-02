import Link from "next/link";

import { getSpotPrices } from "../_lib/spot-prices";
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
 * A SERVER COMPONENT. Every variant above is a CSS gate, so there is nothing
 * for the client to decide and this bar ships no JavaScript.
 */
export async function PinnedValueBar() {
  const spot = await getSpotPrices();

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
        <span className="pin-sub hide-s">{portfolio.estimateBasis}</span>
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

      {/* THE SPOT STRIP — real EIA settlements, and FAIL CLOSED.
          `getSpotPrices` returns null on a missing file, unreadable JSON or zero
          usable rows, and this renders NOTHING in that case: no spinner, no
          zeros, no last-known value. A missing strip is honest; a confident
          wrong one is the defect this replaced. See `spot-prices.ts` for the
          $15.50-wrong random walk that made the rule.

          No arrows and no percentages: one settlement is a value, not a change.

          The fourth slot is PROPANE (Mont Belvieu), not gasoline — EIA
          publishes no retail gasoline series at this cadence, and propane is
          the NGL anchor a mineral owner is actually paid on. */}
      {spot && (
        <div className="pin-spot">
          {spot.items.map((item) => (
            <span
              key={item.key}
              className={`pin-tk${
                // Ultra's contract is two prices, so Brent and propane fold
                // away there — the calm view does not carry four numbers.
                item.key === "brent" || item.key === "propane" ? " hide-u" : ""
              }`}
              data-mv-spot={item.key}
              title={item.title}
            >
              <span className="sym">{item.label}</span>
              <span className="num mv-spot-val">{item.display}</span>
            </span>
          ))}
          {/* NOT Professional-only. An earlier pass made this stamp
              Professional-density, which left Essentials readers seeing the
              prices with no provenance at all. It carries the settlement date
              and the "not live prices" basis, so it shows in every density —
              the values may never appear without the label that qualifies them.
              The series runs about eight days behind. */}
          <span className="pin-note" title={`${spot.stamp} · ${spot.basis}`}>
            <span className="pin-note-date">{spot.stamp}</span>
            <span className="pin-note-basis"> · {spot.basis}</span>
          </span>
        </div>
      )}
    </div>
  );
}
