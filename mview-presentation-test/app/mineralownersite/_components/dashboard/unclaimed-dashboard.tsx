import Link from "next/link";

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
      </div>

      <div className="smp-badge">
        <span className="smp-tag">SAMPLE</span>
        <p>
          Every figure below belongs to <strong>{sampleOwner.name}</strong>, a
          made-up owner in {sampleOwner.counties} — not to you, and not to any
          real person. Claim your record and this page fills with your own
          leases, watched every day.
        </p>
      </div>

      <div className="smp-wrap">
        <h3 style={{ fontSize: 20, marginBottom: 4 }}>
          Good morning, {sampleOwner.greetingName}
        </h3>
        <p className="tiny muted" style={{ margin: "0 0 14px" }}>
          {sampleOwner.counties} · 4 leases found automatically at claim
        </p>

        <div className="grid g4">
          {sampleOwner.kpis.map((kpi) => (
            <div className="kpi" style={{ boxShadow: "none" }} key={kpi.label}>
              <div className="k-label">{kpi.label}</div>
              <div className="k-val num">{kpi.value}</div>
              <div className="k-sub">
                {kpi.delta ? (
                  <>
                    <span className="delta-up">{kpi.sub.split(" vs ")[0]}</span>
                    {" vs "}
                    {kpi.sub.split(" vs ")[1]}{" "}
                  </>
                ) : (
                  <>
                    {kpi.sub}{" "}
                  </>
                )}
                <span className="smp-chip">sample</span>
              </div>
            </div>
          ))}
        </div>

        <ul className="timeline" style={{ margin: "16px 0 0" }}>
          <li>
            <strong>New production posted</strong> — Callahan Unit A: 4,180 mcf
            <span className="sub tiny muted">
              sample · this is the kind of filing we watch for daily
            </span>
          </li>
          <li>
            <strong>1 permit filed within a mile</strong> — neighbour tract
            <span className="sub tiny muted">
              sample · a signal about your area, not income by itself
            </span>
          </li>
          <li className="quiet">
            <strong>Weekly briefing</strong> — the coffee read, every Saturday
            <span className="sub tiny muted">
              sample · yours starts the week you claim
            </span>
          </li>
        </ul>

        {/* The second-chance claim block at the foot of the sample. It wears the
            SAME green as the rail at the top, so a claim CTA never appears in
            two different colours on one page (OW-05). */}
        <div className="smp-cta cr-foot">
          <span className="cr-foot-txt">
            <strong>This becomes yours in about two minutes.</strong> Claiming is
            free and never changes who owns your minerals — it only tells us
            which record to watch.
          </span>
          <Link className="btn btn-primary" href="/claim">
            Claim your record — free
          </Link>
        </div>
      </div>

      {/* Professional density gets the provenance note: every figure above is
          fixture data, and this says what replaces it in a claimed account. */}
      <p className="tiny muted tier-p" style={{ margin: "8px 0 0" }}>
        <strong>Professional note — where these sample figures come from:</strong>{" "}
        every value in this preview belongs to the wholly synthetic{" "}
        {sampleOwner.name} fixture (no real owner, lease, or decimal). In a
        claimed account this panel is replaced by your record&apos;s live
        figures: owner-share income from posted volumes × your recorded decimal,
        portfolio value from the estimate model, and activity from the public
        filing feeds — each figure citing its source table.
      </p>
    </div>
  );
}
