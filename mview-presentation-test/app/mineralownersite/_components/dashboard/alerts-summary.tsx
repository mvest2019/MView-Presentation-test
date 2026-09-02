import Link from "next/link";

import { alertSummary, demoOwner } from "../../_lib/portal-demo-data";

/**
 * The alerts rollup — v43 · OW-33 + OW-32.
 *
 * "The dashboard gets an alerts summary box that clicks into the detailed
 * section", and OW-32: "alerts are the second-highest value".
 *
 * A ROLLUP, NOT A FOURTH COPY OF THE ALERT LIST. One count, the split by kind,
 * and the single item that asks something of you — every part of it a door into
 * the alerts inbox. The six-card strip below it and the alerts page itself are
 * the other two surfaces; a third full list on the dashboard is what this
 * replaced.
 *
 * THE "NEEDS YOU" LINE STATES A PRODUCTION FACT, NOT A PAYMENT ONE. The public
 * record shows that Ledbetter produced gas in months we can see; whether the
 * owner was paid for it is unknowable without their statements, and the Lease
 * Audit is how the two get compared. This distinction is the design's
 * most-repeated correction and the copy must not blur it.
 *
 * The category chips and the inbox link have no destination yet — the Alerts
 * module is not built — so they read as counts rather than offering a click into
 * nothing. Wiring them is one `href` each.
 */
export function AlertsSummary() {
  return (
    <div className="mv-alsum">
      <div className="as-head">
        <div>
          <span className="as-kicker">Alerts — the short version</span>
          <span className="as-line">
            <strong className="as-count num">{alertSummary.total}</strong> since
            your last visit ({demoOwner.lastVisit}) ·{" "}
            <strong>{alertSummary.needsYou} asks something of you</strong> ·{" "}
            {alertSummary.important} important · {alertSummary.context} for
            context
          </span>
        </div>
        {/* THE INBOX IS BUILT NOW, so this is a real link. It read "All 9
            alerts — soon" while the Alerts module did not exist; the rollup's
            whole purpose (OW-33) is that it "clicks into the detailed
            section", so it was the first thing to wire when that section
            landed. */}
        <Link href="/mineralownersite/alerts" className="btn btn-ghost btn-sm">
          All {alertSummary.total} alerts
        </Link>
      </div>

      <div className="as-cats">
        {alertSummary.categories.map((category) => (
          <span
            key={category.key}
            className={`as-cat${category.actionable ? " as-act" : ""}`}
            style={{ cursor: "default" }}
          >
            <b>{category.count}</b> {category.label}
          </span>
        ))}
      </div>

      <p className="as-top">
        <span className="as-act-tag">NEEDS YOU</span>
        <strong>Ledbetter produced gas in months we can see</strong> — only your
        check stubs show whether you were paid.{" "}
        {/* Both routes the reference offers off this line. Neither module is
            built, so both are labelled. */}
        <span className="ctx-hint">Open the alert →</span>{" "}
        <span className="ctx-hint">run your included Lease Audit →</span>
      </p>
    </div>
  );
}
