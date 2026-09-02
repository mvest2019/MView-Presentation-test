import Link from "next/link";

import { PortalLink } from "../portal-link";
import { sampleActivities } from "../../_lib/portal-activities-data";
import { ClaimRail } from "../dashboard/unclaimed-dashboard";

/**
 * STATE 1 — the guest Activities page.
 *
 * TWO BLOCKS, and the split is the same one the Dashboard uses: the pinned
 * claim rail, then a labelled SAMPLE that REPLACES the real page rather than
 * stacking beneath it. `.nc-only` puts both in state 1 alone; `.nc-swap` on
 * the sample is what tells `portal.css` to hide everything else in
 * `.mv-dash-routes`.
 *
 * THE RAIL IS THE DASHBOARD'S OWN COMPONENT, imported rather than copied. That
 * is v43 · OW-02 verbatim — "keep the claim box pinned to the top on every
 * page, so it doesn't move from one page to the next" — and a second copy of
 * it here is precisely how the two would drift into looking different on two
 * routes, which is the defect OW-02 records.
 *
 * WHY A MONTH OF EVENTS AND NOT A KPI GRID. The claimed page's argument is
 * made with counts across a year and two scoping controls; none of that means
 * anything to a visitor with no record. What a guest needs to learn is what
 * KIND of thing lands in this feed and that each one arrives with a
 * plain-English note attached — so the sample is five events, each with its
 * note, and no filters at all.
 *
 * NO SYNTHETIC FIGURES AGAINST A REAL ACCOUNT: J. T. Callahan is the same
 * fictional owner the claim flow and the Dashboard sample use, the block is
 * wrapped in the amber dashed sample chrome, and the badge names them as
 * fictional before the first number appears.
 */
export function UnclaimedActivities() {
  return (
    <>
      <ClaimRail />

      <div className="nc-only nc-swap">
        <h2 style={{ fontSize: 24, marginBottom: 4 }}>
          {sampleActivities.heading}
        </h2>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {sampleActivities.strapline}
        </p>

        <div className="smp-badge">
          <span className="smp-tag">SAMPLE PREVIEW</span>
          <p>
            <strong>{sampleActivities.badge}</strong> These events belong to{" "}
            <strong>{sampleActivities.badgeOwner}</strong>{" "}
            {sampleActivities.badgeTail}{" "}
            <strong>Free, no-obligation account.</strong>
          </p>
        </div>

        <div className="smp-wrap">
          <div
            className="between"
            style={{ flexWrap: "wrap", marginBottom: 8 }}
          >
            <h3 style={{ fontSize: 18 }}>
              {sampleActivities.panelHeading}{" "}
              <span className="smp-chip">FICTIONAL</span>
            </h3>
            <span className="tiny muted">{sampleActivities.panelNote}</span>
          </div>

          <ul className="timeline" style={{ margin: 0 }}>
            {sampleActivities.events.map((event) => (
              <li key={event.headline}>
                <strong>{event.headline}</strong>
                <span className="sub tiny muted">{event.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* The second-chance claim block, in the SAME green as the rail above —
            a claim CTA never appears in two colours on one page (OW-05). */}
        <div className="smp-cta cr-foot">
          <span className="cr-foot-txt">
            <strong>{sampleActivities.ctaLead}</strong> {sampleActivities.ctaBody}
          </span>
          <Link className="btn btn-primary" href="/claim">
            Claim your record — free, no obligation
          </Link>
          <PortalLink className="small" href="/mineralownersite/groups">
            or see what owners are discussing →
          </PortalLink>
        </div>
      </div>
    </>
  );
}
