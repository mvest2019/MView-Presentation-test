import { PortalLink } from "../portal-link";
import { JumpLink } from "./report-jump";
import Link from "next/link";

import {
  aboutIntro,
  coffeePromise,
  emailPreview,
  knowledgeLayers,
  layersWhy,
  planCoverage,
  planCoverageFoot,
  reportVersions,
  reportVersionsFoot,
} from "../../_lib/portal-briefing-data";
import { TierLink } from "../tier-link";

/**
 * BACK MATTER — "About this report".
 *
 * COLLAPSED, AND LABELLED "nothing about this week is in here". That label is
 * the useful part: it lets a reader skip the block with confidence instead of
 * scanning it for news they might be missing. Everything in here is about the
 * document rather than the week.
 *
 * IT CARRIES THE ONE DISTINCTION THE WHOLE PORTAL RESTS ON — the two axes.
 * "Four reports, one per view" is a DENSITY choice; "how much report your plan
 * includes" is a PLAN gate. They look similar and they are nothing alike, so
 * they sit next to each other with a paragraph between them saying so. The
 * reference records a defect where the trial called itself a "Pro trial" and
 * "Pro" came back as a plan name; this pairing is the correction.
 */
export function ReportAbout() {
  return (
    <details className="card wr-about wr-noprint">
      <summary>
        <span>ⓘ</span> About this report — the four written versions, what
        it&apos;s made of, what your plan includes, how it&apos;s delivered{" "}
        <span className="chip chip-slate" style={{ fontSize: 9.5 }}>
          back matter · nothing about this week is in here
        </span>
      </summary>

      <div style={{ padding: "2px 14px 14px" }}>
        <p className="tiny muted" style={{ margin: "6px 0 0" }}>
          {aboutIntro}
        </p>

        {/* AXIS 2 — how the report is WRITTEN. A view choice, never a plan. */}
        <div
          className="card card-pad"
          style={{ margin: "12px 0 6px", borderTop: "3px solid var(--green)" }}
        >
          <div className="between" style={{ flexWrap: "wrap" }}>
            <h4>Four reports, one per view — pick the one that fits your morning</h4>
            <span className="chip chip-mint" style={{ fontSize: 10 }}>
              Your view choice, not your plan
            </span>
          </div>

          <div className="grid g4" style={{ gap: 10, marginTop: 10 }}>
            {reportVersions.map((version) => (
              <div
                className="kpi"
                style={{ boxShadow: "none", borderTop: "3px solid var(--green)" }}
                key={version.tier}
              >
                <div className="k-label">{version.label}</div>
                <div className="k-val" style={{ fontSize: 15 }}>
                  {version.name}
                </div>
                <div className="k-sub">
                  {version.body}
                  <br />
                  <TierLink tier={version.tier} className="linklike tiny">
                    switch to {version.name === "The doorstep read"
                      ? "Ultra"
                      : version.label.split(" · ")[0]}{" "}
                    →
                  </TierLink>
                </div>
              </div>
            ))}
          </div>

          <p className="tiny muted" style={{ margin: "8px 0 0" }}>
            {reportVersionsFoot}
          </p>
        </div>

        {/* AXIS 1 — how much of it your PLAN includes. */}
        <div
          className="card card-pad hide-s"
          style={{ margin: "12px 0 6px", borderTop: "3px solid var(--green)" }}
        >
          <div className="between" style={{ flexWrap: "wrap" }}>
            <h4>How much report your plan includes — the other axis</h4>
            <Link className="btn btn-ghost btn-sm" href="/pricing">
              Compare plans →
            </Link>
          </div>

          <div className="grid g3" style={{ gap: 10, marginTop: 10 }}>
            {planCoverage.map((plan, index) => (
              <div
                className="kpi"
                style={{
                  boxShadow: "none",
                  ...(index === planCoverage.length - 1
                    ? { borderTop: "2px solid var(--green)" }
                    : {}),
                }}
                key={plan.plan}
              >
                <div className="k-label">{plan.plan}</div>
                <div className="k-val" style={{ fontSize: 15 }}>
                  {plan.covers}
                </div>
                <div className="k-sub">{plan.body}</div>
              </div>
            ))}
          </div>

          <p className="tiny muted" style={{ margin: "8px 0 0" }}>
            {planCoverageFoot}
          </p>
        </div>

        <KnowledgeLayers />

        <div className="notice slate wr-noprint hide-s" style={{ margin: "12px 0 18px" }}>
          <span>☕</span>
          <div>{coffeePromise}</div>
        </div>

        <EmailPreview />
      </div>
    </details>
  );
}

/**
 * The four layers — and the reason the report says out loud that it does not
 * have the fourth one.
 *
 * WHY ADMIT A GAP IN YOUR OWN PRODUCT PAGE. Because layer 4 is the honest
 * reason August is a range and not a number, and because it is the only layer
 * the owner can help build. Claiming it would be both false and
 * self-defeating: the statement-upload ask only works if the owner believes
 * the reason for it, and "we already know your operator's deducts" would make
 * the ask incoherent.
 */
function KnowledgeLayers() {
  return (
    <div
      id="wrLayers"
      className="card card-pad wr-noprint"
      style={{ margin: "12px 0 6px", borderTop: "3px solid var(--green)" }}
    >
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>
          What this report is made of — four layers, and only two of them are
          free
        </h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          Where the knowledge comes from
        </span>
      </div>

      <p className="small tier-s" style={{ margin: "8px 0 0" }}>
        Two of the four layers under this report are public — hard to assemble,
        but public. The third we build ourselves: the decline curves, your
        estimate, the produced-versus-paid signal. The fourth — what a barrel
        out of your area really sells for, and what your operator really
        deducts — nobody has yet, and it is the reason next month is a range and
        not a number.
      </p>

      <div className="grid g4 hide-s" style={{ gap: 10, marginTop: 10 }}>
        {knowledgeLayers.map((layer) => (
          <div
            className="kpi"
            style={{
              boxShadow: "none",
              borderTop:
                layer.accent === "green"
                  ? "3px solid var(--green)"
                  : layer.accent === "amber"
                    ? "3px dashed #b8892f"
                    : "3px solid #cbd5e1",
            }}
            key={layer.label}
          >
            <div className="k-label">
              {layer.label}
              {layer.chip ? (
                <>
                  {" "}
                  <span className="chip chip-blue" style={{ fontSize: 9 }}>
                    {layer.chip}
                  </span>
                </>
              ) : null}
            </div>
            <div className="k-val" style={{ fontSize: 15 }}>
              {layer.name}
            </div>
            <div className="k-sub">{layer.body}</div>
          </div>
        ))}
      </div>

      {/* THE TWO POINTERS ARE REAL CONTROLS. This sentence is the one that
          justifies the upload ask — "the widest part of that band is the part
          only paperwork can close" — so naming the upload panel without
          linking to it leaves the reader to hunt for it. `?jump=wrEstAcc` is
          the reference's own target; the group link degrades until Community
          ships. */}
      <p className="tiny muted hide-s" style={{ margin: "9px 0 0" }}>
        <strong>{layersWhy.lead}</strong> {layersWhy.before}
        <span className="num cl-lock">{layersWhy.locked}</span>
        {layersWhy.afterBeforeUpload}
        <JumpLink target="wrEstAcc">{layersWhy.uploadLink}</JumpLink>
        {layersWhy.afterUpload}
        <PortalLink href="/mineralownersite/groups">
          {layersWhy.groupsLink}
        </PortalLink>
        {layersWhy.afterGroups}
      </p>

      <p className="tiny muted tier-p" style={{ margin: "8px 0 0" }}>
        <strong>Professional note.</strong> {layersWhy.pro}
      </p>
    </div>
  );
}

/**
 * What the email actually contains.
 *
 * THREE LINES AND A LINK, NEVER THE REPORT. The closing sentence is the
 * commitment: "we never put your full report in an inbox." An owner's figures,
 * decimals and lease numbers travelling through mail servers in plain text
 * would undo every other protection on this page, so the email is a
 * notification and the report stays behind the sign-in.
 */
function EmailPreview() {
  return (
    <details className="card wr-about wr-noprint" style={{ margin: "0 0 18px" }}>
      <summary>
        <span>✉</span> {emailPreview.summary}
      </summary>

      <div className="card-pad" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="wr-email">
          <div className="wr-email-head">
            <strong>Mineral View</strong> · {emailPreview.subject}
          </div>
          <div className="wr-email-body">
            <p className="small" style={{ margin: "0 0 8px" }}>
              <strong>{emailPreview.greeting}</strong> {emailPreview.lead}
            </p>
            <ul className="small wr-email-lines">
              {emailPreview.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <span
              className="btn btn-primary btn-sm"
              style={{ pointerEvents: "none" }}
            >
              {emailPreview.cta}
            </span>
            <p className="tiny muted" style={{ margin: "10px 0 0" }}>
              {emailPreview.foot}
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}
