import Link from "next/link";

import { sampleIssue } from "../../_lib/portal-briefing-data";

/**
 * STATE 1 — the guest Weekly Report: a COMPLETE sample issue.
 *
 * NO CLAIM RAIL ON THIS ROUTE, and that is the reference's own arrangement
 * rather than an omission — verified against it: the Dashboard and Activities
 * both carry `.mv-claimrail`, the report does not, and its only unclaimed child
 * is this sample.
 *
 * The reason follows from what the report IS. A visitor already meets the claim
 * ask twice on this screen — the pinned bar's sticky "Claim your mineral owner
 * record to see what it's worth" line, and this sample's own closing CTA — and
 * a third one above the masthead would push the document itself below the fold.
 * That is precisely the "so much at the top that you bury everything below it"
 * failure OW-30 records, and it costs more here than anywhere else: the whole
 * argument of this page is that the writing is good, which cannot be made if
 * the reader never reaches the writing.
 *
 * THE WHOLE REPORT, NOT A TEASER, and the badge says so in its first four
 * words. This is the design's most deliberate gating decision on the portal,
 * and it runs the opposite way to instinct:
 *
 *   A BLURRED SAMPLE WOULD BE THE WRONG GATE. There is nothing here to
 *   protect. Every figure belongs to J. T. Callahan, who does not exist.
 *   Blurring a fictional owner's numbers would teach the visitor that the
 *   product's job is to withhold, when its actual pitch is that it explains —
 *   and it would hide the only thing that could convince them, which is how
 *   good the writing is when it has real numbers to work with.
 *
 *   WHAT THE GUEST IS MISSING IS NOT ACCESS. It is a record of their own. So
 *   the sample withholds exactly one thing: the claim.
 *
 * `cl-lock` DOES appear once, on the estimate figure, and that is not a
 * contradiction — it is the same class the claimed page puts on the same
 * figure, kept so the sample demonstrates the real gating rather than
 * pretending there is none. In state 1 the blur is inert; a visitor who claims
 * and lands on Free meets it for real, having already been shown it.
 */
export function UnclaimedBriefing() {
  return (
    <div className="nc-only nc-swap">
      <h2 style={{ fontSize: 24, marginBottom: 4 }}>{sampleIssue.heading}</h2>
      <p className="small muted" style={{ marginBottom: 12 }}>
        {sampleIssue.strapline}
      </p>

      <div className="smp-badge">
        <span className="smp-tag">SAMPLE PREVIEW</span>
        <p>
          <strong>{sampleIssue.badgeLead}</strong> Every number below belongs to{" "}
          <strong>{sampleIssue.badgeOwner}</strong> {sampleIssue.badgeBody}{" "}
          <strong>Free, no-obligation account.</strong>
        </p>
      </div>

      <div className="smp-wrap" style={{ padding: 0, overflow: "hidden" }}>
        {/* The masthead — the same dark green the real issue's page 1 uses,
              so the sample looks like the document it is previewing. */}
        <div className="wr-sample-head">
          <div className="section-label" style={{ color: "#7fd4ae" }}>
            {sampleIssue.masthead}
          </div>
          <h3 style={{ color: "#fff", fontSize: 20, marginTop: 2 }}>
            {sampleIssue.greeting}
          </h3>
          <p className="tiny" style={{ color: "#9fd7bd", marginTop: 4 }}>
            {sampleIssue.meta} <strong>{sampleIssue.metaStrong}</strong>{" "}
            <span className="smp-chip" style={{ marginLeft: 6 }}>
              {sampleIssue.metaChip}
            </span>
          </p>
        </div>

        {/* PAGE 1 — the four answers, exactly as the real cover carries
              them. A sample that showed only headings would prove nothing. */}
        <div className="card-pad">
          <h4 style={{ marginBottom: 6 }}>{sampleIssue.page1Heading}</h4>
          <ul className="wr-bullets">
            {sampleIssue.page1.map((item) => (
              <li key={item.lead}>
                <strong
                  className={item.up ? "delta-up" : undefined}
                  style={item.amber ? { color: "#8a6320" } : undefined}
                >
                  {item.lead}
                </strong>{" "}
                {item.body}
              </li>
            ))}
          </ul>
        </div>

        {/* PAGE 2 — the money table, ranked by drift, with the watch item in
              it. This is the page that makes the case; a preview that skipped
              it would be the teaser the badge says this is not. */}
        <div
          className="card-pad"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <h4 style={{ marginBottom: 6 }}>{sampleIssue.page2Heading}</h4>
          <div className="tablewrap">
            <table style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Lease (no.)</th>
                  <th className="right">Posted this month</th>
                  <th className="right">We expected · (±)</th>
                  <th>What it means</th>
                </tr>
              </thead>
              <tbody>
                {sampleIssue.page2Rows.map((row) => (
                  <tr
                    key={row.lease}
                    style={row.total ? { background: "#fafbfc" } : undefined}
                  >
                    <td>
                      <strong>{row.lease}</strong>
                      {row.county ? ` · ${row.county}` : null}
                    </td>
                    <td className="right num">
                      {row.total ? <strong>{row.posted}</strong> : row.posted}
                    </td>
                    <td className="right num">
                      {row.total ? (
                        <>
                          <strong>{row.expected}</strong> {row.drift}
                        </>
                      ) : (
                        <>
                          {row.expected}{" "}
                          <span
                            className={
                              row.driftDirection === "up"
                                ? "delta-up"
                                : row.driftDirection === "down"
                                  ? "delta-down"
                                  : "tiny muted"
                            }
                          >
                            {row.drift}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="tiny muted">{row.means}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tiny muted" style={{ margin: "6px 0 0" }}>
            {sampleIssue.page2Foot}
          </p>
        </div>

        {/* PAGES 3–5, summarised. Three full pages of a fictional owner's
              maps and world context would pad the preview without adding an
              argument — these three cards say what each page contains. */}
        <div className="card-pad wr-sample-pages">
          {sampleIssue.pageCards.map((card) => (
            <div key={card.label}>
              <div className="section-label">{card.label}</div>
              <p className="small" style={{ marginTop: 6 }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>

        {/* The number people open it for. */}
        <div className="card-pad wr-sample-est">
          <div className="between" style={{ flexWrap: "wrap" }}>
            <h4 style={{ marginBottom: 4 }}>{sampleIssue.estimateHeading}</h4>
            <span className="smp-chip">FICTIONAL OWNER</span>
          </div>
          <p className="num cl-lock wr-sample-range">
            {sampleIssue.estimateRange}{" "}
            <span className="wr-sample-mid">{sampleIssue.estimateMid}</span>
          </p>
          <p className="tiny muted" style={{ margin: 0 }}>
            {sampleIssue.estimateNote}
          </p>
        </div>
      </div>

      <div className="smp-cta">
        <Link className="btn btn-primary" href="/claim">
          Claim your record — free, no obligation
        </Link>
        <Link className="small" href="/blogs">
          or read public news &amp; guides meanwhile →
        </Link>
      </div>

      <p className="tiny muted" style={{ marginTop: 10 }}>
        {sampleIssue.foot}
      </p>
    </div>
  );
}
