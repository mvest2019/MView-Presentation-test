import { formatLakhs } from "../../_lib/format-lakhs";
import { portfolio } from "../../_lib/portal-demo-data";

/**
 * The Ultra view of the Dashboard.
 *
 * v18 · Ryan's spec: almost no numbers, almost no words. ONE rounded headline,
 * ONE status line, one green indicator, ONE button. Everything else on the page
 * is hidden by the `view-ultra` page-replacement rule in `portal.css` — Ultra
 * REPLACES the dashboard rather than trimming it.
 *
 * WHO IT IS FOR: owners who want just the essentials — the design names
 * overwhelmed, older and low-engagement owners. Assigned rather than chosen by
 * default, and never the product default.
 *
 * THE STATUS LINE IS THE WHOLE PAGE, so it has to be honest at Ultra length.
 * The public record shows Ledbetter produced gas in months we can see; whether
 * the owner was paid is unknowable without their statements. No dollar amount is
 * claimed, and the sentence does not become an accusation just because it is the
 * only sentence on screen.
 *
 * `.cl-only` leaves an ASK behind the gate rather than a blank: Ultra's whole
 * page is one number, so state 3 covering that number cannot simply leave a
 * blur with nothing beside it.
 */
export function UltraHero() {
  return (
    <div className="tier-u ultra-hero">
      <div className="u-dot" aria-hidden="true" />
      <p className="u-kicker">Your minerals</p>

      <h2 className="u-headline">
        Worth about{" "}
        <strong className="cl-lock">{formatLakhs(portfolio.estimate)}</strong>
      </h2>

      <p className="u-kicker cl-only" style={{ margin: "-8px 0 14px" }}>
        yours to see — free for 7 days
      </p>

      <p className="u-status">
        One thing when you have a minute: your Ledbetter lease{" "}
        <strong>produced gas in months we can see</strong> — only your check
        stubs show if you were paid for it. The Lease Audit included with your
        plan can check.
        <br />
        Everything else is fine: your wells are producing normally, and nothing
        needs you today.
      </p>

      {/* ONE button. The Weekly Report module is not built, so it names itself
          honestly rather than being a button into a 404 — but it stays the one
          action, because two would break Ultra's contract. */}
      <span
        className="btn btn-primary btn-lg"
        aria-disabled="true"
        style={{ opacity: 0.6, cursor: "default" }}
      >
        See my report — soon
      </span>

      <p className="u-note">
        We watch your leases every day and will tell you if anything changes.
        <br />
        <span
          className="chip chip-est"
          style={{ fontSize: 10, marginTop: 6, display: "inline-block" }}
        >
          Estimate — not an appraisal
        </span>
      </p>
    </div>
  );
}
