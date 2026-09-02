import { PortalIcon } from "../portal-icon";
import Link from "next/link";

import {
  alertStrip,
  alsoSinceLastVisit,
  changedSinceLastVisit,
  demoOwner,
} from "../../_lib/portal-demo-data";

/**
 * The three "since your last visit" surfaces, one per density.
 *
 * WHY THREE AND NOT ONE. The six-card strip is `.hide-s`, which used to leave
 * the least technical owner with nothing — the strongest "why come back"
 * element was hidden exactly for her (v17R · RETENTION). So the week's story is
 * told once per density, at that density's length:
 *
 *   ESSENTIALS   a card with the top three items in plain language
 *   ESSENTIALS   a one-line hero: the single thing worth a look
 *   DETAILED+    the six-card deep-linked strip
 *
 * The two `Coming soon` cards are Professional-only. They are dev honesty about
 * reserved banner slots; to an owner they read as a broken promise, which is
 * why the calmer densities never see them.
 */

/** Essentials · the top three, plain language. */
export function ChangedSinceCard() {
  return (
    <div
      className="card card-pad tier-s"
      style={{ margin: "12px 0", borderLeft: "4px solid var(--green)" }}
    >
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>
          <PortalIcon name="activity" className="mvi mvi-inline" /> What&apos;s
          changed since your last visit ({demoOwner.lastVisit})
        </h4>
        {/* The reference links this to the alerts inbox, which is not built —
            labelled rather than pointed at a 404. */}
        <span className="small muted">all 9 alerts →</span>
      </div>

      <p className="tiny muted" style={{ margin: "4px 0 0" }}>
        Tap any item — the detail opens on the right.
      </p>

      <ul className="timeline" style={{ marginTop: 10 }}>
        {changedSinceLastVisit.map((item) => (
          <li key={item.headline}>
            <strong>{item.headline}</strong>{" "}
            <span className="sub tiny muted">
              {item.detail} <span className="ctx-hint">{item.hint}</span>
            </span>
            <span className="sub tiny">{item.secondary}</span>
          </li>
        ))}
      </ul>

      {/* The three quieter events, under the headline items, with the
          reference's own lead-in. Each is a link into the explainer drawer
          there; the drawer is not part of this build, so they render as the
          text they are — but the lead-in is the source's, not a rewrite. */}
      <p
        className="small"
        style={{
          margin: "10px 0 0",
          paddingTop: 8,
          borderTop: "1px solid var(--line)",
        }}
      >
        Also since {demoOwner.lastVisit} — tap to have it explained:{" "}
        {alsoSinceLastVisit.map((event, i) => (
          <span key={event}>
            {i > 0 && " · "}
            {event}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * Essentials · the one-line hero.
 *
 * ONE thing worth a look, and the honest version of it: we see production in
 * the public record, never payment. So this is a signal plus the path to
 * checking it — never a computed dollar claim about money owed.
 */
export function EssentialsHero() {
  return (
    <div
      className="card card-pad tier-s simple-hero"
      style={{ margin: "14px 0" }}
    >
      <h3 style={{ marginBottom: 6 }}>Your minerals, in one line</h3>
      <p style={{ fontSize: 16, margin: "0 0 10px" }}>
        <strong>
          One thing worth a look: Ledbetter produced gas in months we can see
        </strong>{" "}
        — only your check stubs show if you were paid.{" "}
        <span className="ctx-hint">Check it free →</span>
      </p>
      <div className="flex" style={{ flexWrap: "wrap" }}>
        {/* Lease Audit and the weekly briefing are not built, so the first is
            labelled. The second IS faithful: the reference's button calls
            `setViewTier('detailed')`, and density here is a URL parameter, so
            this is the same action as a link. */}
        <span
          className="btn btn-primary btn-sm"
          aria-disabled="true"
          style={{ opacity: 0.6, cursor: "default" }}
        >
          Read this week&apos;s briefing
        </span>
        <Link className="btn btn-ghost btn-sm" href="?view=detailed" scroll={false}>
          See the details
        </Link>
      </div>
    </div>
  );
}

/** Detailed and Professional · the six-card strip. */
export function AlertStrip() {
  return (
    <div className="al-strip hide-s">
      {alertStrip.map((alert) => (
        <span
          key={alert.headline}
          className={`al-mini${alert.tone === "gold" ? " gold" : ""}`}
          style={{ cursor: "default" }}
        >
          <span className="al-k">
            <span aria-hidden="true">{alert.kind}</span> {alert.headline}
          </span>
          <span className="al-s">
            {alert.detail} <span className="ctx-hint">{alert.hint}</span>
          </span>
        </span>
      ))}

      {/* Professional only — see the note at the top of this file. */}
      <span
        className="al-mini tier-p"
        style={{ borderStyle: "dashed", opacity: 0.85, cursor: "default" }}
      >
        <span className="al-k">
          <span aria-hidden="true">◔</span> Decline inflection watch{" "}
          <span
            className="chip chip-blue"
            style={{ fontSize: 8.5, verticalAlign: 1 }}
          >
            Coming soon
          </span>
        </span>
        <span className="al-s">
          worked example on Ledbetter{" "}
          <span className="ctx-hint">See the example →</span>
        </span>
      </span>
      <span
        className="al-mini tier-p"
        style={{ borderStyle: "dashed", opacity: 0.85, cursor: "default" }}
      >
        <span className="al-k">
          <span aria-hidden="true">◔</span> Operator payment anomaly{" "}
          <span
            className="chip chip-blue"
            style={{ fontSize: 8.5, verticalAlign: 1 }}
          >
            Coming soon
          </span>
        </span>
        <span className="al-s">
          produced-vs-paid drift{" "}
          <span className="ctx-hint">See the drift →</span>
        </span>
      </span>
    </div>
  );
}
