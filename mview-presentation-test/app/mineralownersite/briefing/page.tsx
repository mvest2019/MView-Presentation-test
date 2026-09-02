import type { Metadata } from "next";

import { PortalLink } from "../_components/portal-link";
import { NextStatement } from "../_components/briefing/next-statement";
import { ReportAbout } from "../_components/briefing/report-about";
import {
  ReportArchive,
  ReportMonthly,
} from "../_components/briefing/report-monthly";
import {
  ReportPage1,
  ReportPage2,
  ReportPage3,
  ReportPage4,
  ReportPage5,
} from "../_components/briefing/report-pages";
import { ReportJumpOnLoad } from "../_components/briefing/report-jump";
import { ReportRail } from "../_components/briefing/report-rail";
import { UnclaimedBriefing } from "../_components/briefing/unclaimed-briefing";
import { AckButton, PrintButton } from "../_components/proto-buttons";
import { TierLink } from "../_components/tier-link";
import {
  briefingMeta,
  briefingUltra,
  closingDetailed,
  closingPro,
  closingSimple,
  simpleEvidence,
} from "../_lib/portal-briefing-data";

/**
 * THE WEEKLY MINERAL OWNER REPORT — `/mineralownersite/briefing`.
 *
 * A DOCUMENT, NOT A DASHBOARD, and that difference decides the whole module.
 * Every other portal route answers a question on demand; this one is written
 * once a week, printed, mailed, filed and forwarded to family. So it has
 * pages, page numbers, a masthead, back matter and a print stylesheet that
 * turns the five `.wr-page` blocks into five sheets of paper.
 *
 * WHAT RENDERS WHEN — the whole map in one place:
 *
 *   UNCLAIMED (guest)  the claim rail, then a COMPLETE sample issue about
 *                      J. T. Callahan — cover verdicts, the money table, all
 *                      five page summaries and the estimate. `.nc-swap`
 *                      replaces everything below. See the long note in
 *                      `unclaimed-briefing.tsx` on why the sample is the whole
 *                      report and not a blurred teaser.
 *
 *   ULTRA              the doorstep read: one verdict, next month's range, one
 *                      button. The estimate box is the one thing Ultra keeps
 *                      beyond the verdict, because it is the number people
 *                      open the report for at every density.
 *
 *   ESSENTIALS         the cover, the money chart, the one next action, and
 *                      the closing paragraph. Pages 2–5 exist in the markup
 *                      and are one deliberate click deeper — the rail does the
 *                      deepening (see `report-rail.tsx`).
 *
 *   DETAILED           all five pages, the per-lease build-up of the estimate,
 *                      the monthly and the archive.
 *
 *   PROFESSIONAL       Detailed plus the method notes, the signal table, the
 *                      data appendix and "what would change our mind".
 *
 *   CLAIMED / LAPSED   every dollar blurred by `cl-lock` — the estimate band,
 *                      the midpoint, the six-year shares in the money table.
 *                      The VOLUMES stay sharp: they are public record, and a
 *                      free owner is shown less of the product, never less of
 *                      their own record.
 *
 * THE COVER RENDERS IN ESSENTIALS TOO — `portal.css` exempts `#wrPage1` from
 * the `.hide-s` sweep. The cover IS the report for a reader who stops there,
 * and hiding it would leave Essentials with a chart and no verdict.
 */
export const metadata: Metadata = {
  title: "Weekly Report",
  description:
    "Your week in plain English — am I making money, is anyone drilling near me, what does it mean, and what did world prices do to my number.",
};

export default function WeeklyReportPage() {
  return (
    <div className="mv-dash-routes">
      {/* STATE 1 — the guest issue. `.nc-swap` hides everything below. */}
      <UnclaimedBriefing />

      {/* ULTRA — the doorstep read. */}
      <div className="tier-u ultra-hero">
        <div className="u-dot" aria-hidden="true" />
        <p className="u-kicker">{briefingUltra.kicker}</p>
        <h2 className="u-headline">
          {briefingUltra.headline} <strong>{briefingUltra.headlineStrong}</strong>
        </h2>
        <p className="u-status">{briefingUltra.status}</p>

        <div className="wr-ultra-est">
          <div className="section-label">{briefingUltra.boxLabel}</div>
          <p className="num cl-lock wr-ultra-range">{briefingUltra.boxRange}</p>
          <p className="small" style={{ margin: 0 }}>
            {briefingUltra.boxBody}{" "}
            <strong className="num cl-lock">{briefingUltra.boxMid}</strong>
            {briefingUltra.boxTail}
          </p>
          <TierLink
            tier="simple"
            className="btn btn-ghost btn-sm"
          >
            {briefingUltra.boxCta}
          </TierLink>
        </div>

        <TierLink tier="simple" className="btn btn-primary btn-lg">
          {briefingUltra.cta}
        </TierLink>
        <p className="u-note">{briefingUltra.note}</p>
      </div>

      {/* The masthead row. Three read-time claims, one per density — a
          9-minute read and a 35-minute record of work are not the same
          document and must not claim the same length. */}
      <div
        className="between wr-noprint"
        style={{ flexWrap: "wrap", marginBottom: 4 }}
      >
        <div>
          <h2 style={{ fontSize: 24 }}>{briefingMeta.title}</h2>
          <p className="small muted">
            Week ending {briefingMeta.weekEnding} · {briefingMeta.record} ·{" "}
            {briefingMeta.delivery}
            <span className="tier-s">
              {" "}
              · <strong>{briefingMeta.readSimple}</strong>
            </span>
            <span className="tier-d"> · {briefingMeta.readDetailed}</span>
            <span className="tier-p"> · {briefingMeta.readPro}</span>
          </p>
        </div>

        <div className="flex" style={{ flexWrap: "wrap" }}>
          <PrintButton>Print / Save as PDF — opens print preview</PrintButton>
          <AckButton
            label="Email me this report"
            done="Sent — summary + link ✓ (prototype)"
          />
        </div>
      </div>

      {/* Handles a `?jump=` that arrived from outside — a bookmark, a link from
          another module, a shared URL. Clicks scroll themselves; this covers
          the parameter being present before anything was clicked. */}
      <ReportJumpOnLoad />

      <ReportRail />
      <NextStatement />
      <ReportAbout />

      {/* PAGE 1 — the cover. Shown at every density including Essentials. */}
      <ReportPage1 />

      {/* ESSENTIALS ONLY — the chart and the one action. A reader who stops at
          the cover gets evidence and a next step without the four pages. */}
      <div className="tier-s wr-noprint">
        <div className="card card-pad chartbox" style={{ marginBottom: 14 }}>
          <div className="between" style={{ flexWrap: "wrap" }}>
            <h4>{simpleEvidence.chartHeading}</h4>
            <span className="chip chip-est" style={{ fontSize: 10 }}>
              {simpleEvidence.chartChip}
            </span>
          </div>
          <p className="tiny muted" style={{ margin: "8px 0 0" }}>
            {simpleEvidence.chartFoot}
          </p>
        </div>

        <div
          className="card card-pad"
          style={{ marginBottom: 14, borderLeft: "4px solid var(--green)" }}
        >
          <h4 style={{ marginBottom: 6 }}>{simpleEvidence.actionHeading}</h4>
          <p className="small" style={{ margin: "0 0 8px" }}>
            {simpleEvidence.actionBody}
          </p>
          <PortalLink className="btn btn-primary btn-sm" href="/mineralownersite/audit">
            {simpleEvidence.actionCta}
          </PortalLink>
        </div>
      </div>

      <ReportPage2 />
      <ReportPage3 />
      <ReportPage4 />
      <ReportPage5 />

      {/* THE THREE CLOSINGS — same week, three lengths, one per density. */}
      <div
        className="card card-pad tier-s wr-noprint wr-closing"
      >
        <h4 style={{ marginBottom: 6 }}>{closingSimple.heading}</h4>
        <p className="small" style={{ margin: 0 }}>
          {closingSimple.body}
        </p>
      </div>

      <div className="card card-pad tier-d wr-noprint wr-closing">
        <h4 style={{ marginBottom: 6 }}>{closingDetailed.heading}</h4>
        <ol className="small wr-ordered">
          {closingDetailed.items.map((item) => (
            <li key={item.lead}>
              <strong>{item.lead}</strong> {item.body}
            </li>
          ))}
        </ol>
      </div>

      {/* The unusual one, and the point of the Professional tier: a forecast
          that cannot be wrong in a stated way is not a forecast, so the issue
          publishes the observations that would force a revision. */}
      <div className="card card-pad tier-p wr-noprint wr-closing">
        <h4 style={{ marginBottom: 6 }}>{closingPro.heading}</h4>
        <p className="small" style={{ margin: "0 0 8px" }}>
          {closingPro.intro}
        </p>
        <ul className="small wr-reasons">
          {closingPro.items.map((item) => (
            <li key={item.lead}>
              <strong>{item.lead}</strong> {item.body}
            </li>
          ))}
        </ul>
        <p className="tiny muted" style={{ margin: "9px 0 0" }}>
          {closingPro.foot}
        </p>
      </div>

      <ReportMonthly />
      <ReportArchive />
    </div>
  );
}
