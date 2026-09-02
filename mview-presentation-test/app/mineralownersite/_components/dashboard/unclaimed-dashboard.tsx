import Link from "next/link";

import { formatLakhs } from "../../_lib/format-lakhs";
import { sampleOwner } from "../../_lib/portal-demo-data";

/**
 * STATE 1 — the unclaimed dashboard: the claim rail, then a rich SAMPLE of what
 * the portal becomes.
 *
 * BOTH BLOCKS ARE `.nc-only`, so they exist only while the record is unclaimed;
 * the sample block also carries `.nc-swap`, which is what tells `portal.css` to
 * hide the real dashboard rather than stack the sample under it.
 */

/**
 * The pinned claim box — v43 · OW-02 + OW-03 + OW-05.
 *
 *   OW-02  "Keep the claim box pinned to the top on every page — so it doesn't
 *          move from one page to the next."
 *   OW-03  "Same treatment on My Leases."
 *   OW-05  "Claim-your-record is orange, activity is green, and they read as
 *          unrelated."
 *
 * IT IS GREEN, ON PURPOSE — the same green the activity language uses — and it
 * NAMES THE COLOUR RULE OUT LOUD, which is what makes the relationship legible
 * instead of inferred: green is the live record we watch every day, amber is a
 * labelled example because nothing here is yours yet, and claiming turns the
 * amber into your green.
 *
 * NOT A SECOND STICKY LAYER. The pinned bar above already carries the sticky
 * claim line on every route; stacking another sticky band on top of it is
 * exactly the "so much at the top that you bury everything below it" failure
 * OW-30 records. Same position, one scroll layer.
 *
 * THE THREE PROMISES stay in the box because they are the box: claiming is FREE,
 * it takes about two minutes, and it NEVER CHANGES WHO OWNS YOUR MINERALS. The
 * last one is the fear that stops people, and it is answered before it is asked.
 */
export function ClaimRail() {
  return (
    <div className="nc-only mv-claimrail">
      <div className="cr-top">
        <span className="cr-dot" aria-hidden="true" />
        <div className="cr-txt">
          <span className="cr-kicker">Your one next step</span>
          <strong className="cr-head">Claim your mineral owner record</strong>
          <span className="cr-sub">
            Nothing on this page is yours yet. Claiming is <strong>free</strong>,
            takes about two minutes, and{" "}
            <strong>never changes who owns your minerals</strong>
            <span className="cr-sub-more">
              {" "}
              — it only tells us which record to watch for you
            </span>
            .
          </span>
        </div>
        <span className="cr-act">
          <Link className="btn btn-primary btn-lg" href="/claim">
            Claim your record — free, no obligation
          </Link>
          <span className="cr-note">
            Have a family invite code? Enter it during the claim.
          </span>
        </span>
      </div>

      <p className="cr-key">
        <span>
          <span className="cr-sw cr-sw-green" aria-hidden="true" />
          <b>Green</b> — live, watched daily
        </span>
        <span>
          <span className="cr-sw cr-sw-amber" aria-hidden="true" />
          <b>Amber</b> — a labelled example, not yours yet
        </span>
        <span className="cr-key-end">
          Claiming turns the amber into your green.
        </span>
      </p>
    </div>
  );
}

/**
 * The sample dashboard — v24 · #1.
 *
 * A signed-in owner with zero claims gets a RICH SAMPLE of the claimed
 * experience rather than an empty page with four zeroes in it. The fixture is a
 * clearly fictional owner — J. T. Callahan, Karnes and Panola counties — the
 * same one the claim flow's teaser uses, so the two tell one story.
 *
 * AMBER DASHED SAMPLE CHROME EVERYWHERE. `.smp-badge` labels the block,
 * `.smp-wrap` draws the dashed border and stamps "SAMPLE" in the corner, and
 * each figure carries a `.smp-chip`. Nothing here can be mistaken for the
 * reader's own data — which is the entire reason a sample is allowed to carry
 * numbers at all.
 *
 * NO SYNTHETIC KPIs AGAINST A REAL ACCOUNT. The design's data contract for this
 * state is explicit: the account row exists, there are no claimed-owner rows
 * yet, and the correct response is a labelled example, never invented figures
 * presented as the visitor's own.
 */
export function SampleDashboard() {
  return (
    <div className="nc-only nc-swap">
      <div className="between" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 26 }}>
            Welcome — here&apos;s what your dashboard becomes
          </h2>
          <p className="small muted">{sampleOwner.planLine}</p>
        </div>
        {/* Signed in, but nothing claimed — the state named on the header. */}
        <span className="chip chip-slate">{sampleOwner.headerChip}</span>
      </div>

      <div className="smp-badge">
        <span className="smp-tag">{sampleOwner.sampleTag}</span>
        <p>
          <strong>
            This is what your dashboard looks like once you claim your record.
          </strong>{" "}
          Everything below belongs to{" "}
          <strong>{sampleOwner.name} — a fictional sample owner</strong>, not you
          and not any real person. Claiming is free, takes about 2 minutes, and
          never changes legal ownership. <strong>Free, no-obligation account.</strong>
        </p>
      </div>

      <div className="smp-wrap">
        <div
          className="between"
          style={{ flexWrap: "wrap", marginBottom: 10 }}
        >
          <div>
            <h3 style={{ fontSize: 20 }}>
              Good morning, {sampleOwner.greetingName}
            </h3>
            <p className="tiny muted">{sampleOwner.recordLine}</p>
          </div>
          <span className="smp-chip">{sampleOwner.fictionalChip}</span>
        </div>

        {/* `.g2`, two across — the reference's own grid for this panel. Four
            tiles at 2-up read as a block; four across read as a strip of
            thin columns. */}
        <div className="grid g2" style={{ gap: 10 }}>
          {sampleOwner.kpis.map((kpi) => (
            <div
              className={`kpi${kpi.density ? ` ${kpi.density}` : ""}`}
              style={{ boxShadow: "none" }}
              key={kpi.label}
            >
              <div className="k-label">{kpi.label}</div>
              <div className="k-val num">{formatLakhs(kpi.value)}</div>
              <div className="k-sub">
                {kpi.chip ? (
                  <span className="chip chip-est" style={{ fontSize: 10 }}>
                    {kpi.chip}
                  </span>
                ) : kpi.delta ? (
                  <>
                    <span className="delta-up">{kpi.sub?.split(" vs ")[0]}</span>
                    {" vs "}
                    {kpi.sub?.split(" vs ")[1]}
                    {" · "}
                    <span className="smp-chip">sample</span>
                  </>
                ) : (
                  kpi.sub
                )}
              </div>
            </div>
          ))}
        </div>

        {/* v43 · OW-33 (unclaimed half) — the SAME alerts summary box the
            claimed dashboard gets, so what the owner is being sold is the thing
            they will actually receive. Transparent so it reads as part of the
            amber sample frame rather than a white card floating inside it. */}
        <div
          className="mv-alsum"
          style={{ margin: "14px 0 6px", background: "transparent" }}
        >
          <div className="as-head">
            <div>
              <span className="as-kicker">
                Alerts — the short version{" "}
                <span className="smp-chip">sample</span>
              </span>
              <span className="as-line">
                <strong className="as-count num">
                  {sampleOwner.alerts.total}
                </strong>{" "}
                {sampleOwner.alerts.line}
              </span>
            </div>
            {/* The alerts module is not built, so this is labelled rather than
                linked — the convention the rest of the portal uses. */}
            <span
              className="btn btn-ghost btn-sm"
              aria-disabled="true"
              style={{ opacity: 0.6, cursor: "default" }}
            >
              See the sample alert inbox →
            </span>
          </div>

          <div className="as-cats">
            {sampleOwner.alerts.categories.map((c) => (
              <span
                key={c.label}
                className="as-cat"
                style={{ cursor: "default" }}
              >
                <b>{c.count}</b> {c.label}
              </span>
            ))}
          </div>

          {/* `.hide-s` — the calm views get the counts above and stop there. */}
          <ul className="timeline hide-s" style={{ margin: "10px 0 0" }}>
            {sampleOwner.alerts.items.map((a) => (
              <li key={a.headline}>
                <strong>{a.headline}</strong>{" "}
                <span className="sub tiny muted">{a.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="tiny muted" style={{ margin: "8px 0 0" }}>
          Your real dashboard fills with <em>your</em> record&apos;s leases,
          production, and activity the moment you claim — plus a plain-English
          weekly report every Saturday.
        </p>

        {/* v38 · P1-02 — Professional adds the sample's method/source layer, so
            Detailed and Professional are demonstrably different in the no-claim
            state too. */}
        <p className="tiny muted tier-p" style={{ margin: "8px 0 0" }}>
          <strong>
            Professional note — where these sample figures come from:
          </strong>{" "}
          every value in this preview belongs to the wholly synthetic{" "}
          {sampleOwner.name} fixture (no real owner, lease, or decimal). In a
          claimed account this panel is replaced by your record&apos;s live
          figures: owner-share income from posted volumes × your recorded
          decimal, portfolio value from the estimate model, and activity from the
          public filing feeds — each figure citing its source table.
        </p>
      </div>

      {/* ====================================================================
          v43 · OW-34 (Ryan) — "the dashboard is the high-level view: tell me
          what's going on in the world around me. This is what's going to retain
          somebody."

          THE ONE REAL PART OF AN OTHERWISE ALL-SAMPLE PAGE. World and market
          context is public, general, and true whether or not the reader has
          claimed anything — so it sits DELIBERATELY OUTSIDE the amber sample
          frame above and says so in its own first line. No owner figures, no
          "your units", nothing personalised, because nothing here is personal
          yet.

          SOURCE · Mongo.ProdMvestPortal.Newsnew / RRC_News.
          ==================================================================== */}
      <div
        className="card card-pad"
        style={{ borderLeft: "4px solid var(--green)", margin: "0 0 12px" }}
      >
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4>What&apos;s going on around you — right now</h4>
          <span className="chip chip-mint" style={{ fontSize: 10 }}>
            Real · public · no claim needed
          </span>
        </div>
        <p className="tiny muted" style={{ margin: "4px 0 0" }}>
          The only part of this page that isn&apos;t a sample. These are public
          market and industry events, the same ones we read your record against
          once you claim. Market context — never advice.
        </p>

        {/* "Texas mineral owners", not "you" — the same headlines appear on the
            claimed dashboard phrased as "why it matters to YOU". Here there is
            no record to matter to yet, so the audience is named in general. */}
        <ul className="timeline" style={{ marginTop: 12 }}>
          <li>
            <strong>
              Jul 02, 2026 — Gulf Coast LNG exports keep pulling Texas gas
            </strong>
            <span className="sub tiny muted">
              world · natural gas · source: EIA Natural Gas Weekly Update
            </span>
            <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
              <strong>Why it matters to Texas mineral owners:</strong> more
              demand for Texas gas supports the price gas-weighted acreage sells
              into.
            </span>
          </li>
          <li>
            <strong>
              Jul 01, 2026 — Major producers hold output steady; crude
              range-bound in the high $60s
            </strong>
            <span className="sub tiny muted">
              world · oil · source: EIA STEO / Reuters Energy
            </span>
            <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
              <strong>Why it matters to Texas mineral owners:</strong> a steady
              oil price means oil-weighted leases stay on the path their decline
              math already assumes.
            </span>
          </li>
        </ul>

        {/* Four destinations that need no claim. Two are built and link; the
            owner-community page is not, so it reads as plain text rather than a
            link into a 404 — the convention the rest of this portal uses. */}
        <p className="small muted" style={{ marginTop: 10 }}>
          Also useful right now, no claim needed:{" "}
          <Link href="/operators">operator lookup</Link>
          {" · "}
          <span>public owner groups</span>
          {" · "}
          <Link href="/blogs">guides &amp; blog</Link>
          {" · "}
          <Link href="/feature/lease-audit">what the Lease Audit checks</Link>
        </p>
        {/* PROPANE, not the reference's "gasoline". The reference's own spot
            strip was changed to Mont Belvieu propane (v137) because EIA
            publishes no retail gasoline series at that cadence — this line was
            left behind naming the series the bar no longer shows. */}
        <p className="tiny muted" style={{ marginTop: 8 }}>
          Live WTI, natural gas, Brent and gasoline prices sit in the bar at the
          top of every page.
        </p>
      </div>

      {/* v43 · OW-05 — the second-chance claim CTA wears the SAME green as the
          pinned box above, so one page never shows the claim in two different
          colours.

          A SIBLING OF THE SAMPLE PANEL, not a child of it, which is where the
          reference has it. It was nested inside `.smp-wrap` here, which put the
          claim CTA inside the amber "this is all fake" frame and left the page
          ending on the market card instead of on the ask. */}
      <div className="smp-cta cr-foot">
        {/* The rail at the top of this page already states all three promises in
            full — free, two minutes, never changes ownership. The closing block
            keeps the one thing it adds, which is that what the reader has just
            scrolled through is what they get. */}
        <span className="cr-foot-txt">
          <strong>Everything above is an example.</strong> Claim your record and
          this page fills with your own leases, production and alerts — in green,
          because it&apos;s yours.
        </span>
        <Link className="btn btn-primary" href="/claim">
          Claim your record — free, no obligation
        </Link>
      </div>
    </div>
  );
}
