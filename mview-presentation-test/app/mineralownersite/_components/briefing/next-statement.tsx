
import { PortalLink } from "../portal-link";
import {
  accuracyAsk,
  estimateByLease,
  estimateByLeaseFoot,
  nextStatement,
  rangeNotice,
  rangeReasons,
} from "../../_lib/portal-briefing-data";
import { AckButton } from "../proto-buttons";

/**
 * WHAT WE THINK YOUR NEXT STATEMENT HOLDS — v43 · OW-35/36.
 *
 * THE NUMBER PEOPLE OPEN THE REPORT FOR, and the single most dangerous element
 * in the portal, because it is the one an owner could mistake for a promise.
 * Four things guard against that, and none of them is optional:
 *
 *   1  IT IS A RANGE, never a midpoint alone. The midpoint is printed, but
 *      always inside the band and always as "most likely near the middle".
 *   2  THE FIVE REASONS ARE PART OF THE FIGURE, not a disclaimer below it.
 *      Flat prices, the differential, invisible deducts, posting lag, and
 *      volumes that move. A reader who has read those five cannot mistake the
 *      band for a forecast of their cheque.
 *   3  THE FAILURE CASE IS NAMED. "If your statement lands outside this range,
 *      the model was wrong — not your operator." That sentence is what keeps
 *      the estimate from becoming an accusation the next time a cheque is low.
 *   4  `cl-lock` ON EVERY DOLLAR. This is the figure Premium sells, so a Free
 *      or lapsed account sees that there IS a number without reading it. The
 *      blur is the ask.
 *
 * THE UPLOAD ASK IS FRAMED AS THE OWNER'S BENEFIT, and the Professional note
 * says why in the open: the accuracy layer only ever gets the volume it needs
 * if the owner is genuinely better off for uploading. "Narrow your own range"
 * is true; "help us improve our data" would be the same request told from the
 * wrong end.
 */
export function NextStatement() {
  return (
    <div className="wr-est wr-noprint">
      <div className="wr-est-head">
        <div className="section-label" style={{ color: "#7fd4ae" }}>
          What we think your next statement holds · {nextStatement.month}
        </div>
        <p className="wr-est-range num cl-lock">
          {nextStatement.low} – {nextStatement.high}
        </p>
        <p className="wr-est-mid num">
          <span className="cl-lock">{nextStatement.midLine}</span> ·{" "}
          <span style={{ color: "#ffe9c2" }}>{nextStatement.qualifier}</span>
        </p>
      </div>

      <div className="card-pad">
        {/* The band, drawn. Three ticks: low, most-likely, high. The middle
            tick is taller because the midpoint is the reading, not an
            endpoint. */}
        <div className="wr-est-bar" aria-hidden="true">
          <div className="wr-est-track" />
          <div className="wr-est-tick" style={{ left: "2%" }} />
          <div className="wr-est-cap cl-lock" style={{ left: "2%" }}>
            {nextStatement.low}
          </div>
          <div
            className="wr-est-tick"
            style={{ left: "50%", height: 36, top: 2 }}
          />
          <div
            className="wr-est-cap cl-lock"
            style={{ left: "50%", color: "var(--green-deep)" }}
          >
            {nextStatement.mid} · most likely
          </div>
          <div className="wr-est-tick" style={{ left: "98%" }} />
          <div className="wr-est-cap cl-lock" style={{ left: "98%" }}>
            {nextStatement.high}
          </div>
        </div>

        {/* Essentials gets the reason in one sentence. */}
        <p className="small tier-s" style={{ margin: "8px 0 10px" }}>
          {nextStatement.simpleBody}
        </p>

        {/* Detailed and above get all five. */}
        <div className="hide-s" style={{ marginTop: 10 }}>
          <h4 style={{ marginBottom: 6 }}>Why it&apos;s a range and not a number</h4>
          <ul className="small wr-reasons">
            {rangeReasons.map((reason) => (
              <li key={reason.lead}>
                <strong>{reason.lead}</strong> {reason.body}
              </li>
            ))}
          </ul>

          <div className="notice slate" style={{ margin: "0 0 12px" }}>
            <span>◳</span>
            <div>
              <strong>What this is:</strong> {rangeNotice.is}{" "}
              <strong>What it is not:</strong> {rangeNotice.isNot}
            </div>
          </div>
        </div>

        {/* Where the midpoint comes from, lease by lease. */}
        <div className="hide-s" style={{ marginBottom: 12 }}>
          <div className="between" style={{ flexWrap: "wrap" }}>
            <h4 style={{ marginBottom: 6 }}>
              Where the <span className="cl-lock">{nextStatement.mid}</span>{" "}
              comes from — lease by lease
            </h4>
            <span className="chip chip-est" style={{ fontSize: 10 }}>
              Modeled owner-share month · illustrative until the statement feed
              connects
            </span>
          </div>

          {/* `id` IS THE GATE'S HANDLE, not decoration: `portal.css` blurs this
              table's two money columns in the `claimed` state, because a
              per-lease dollar breakdown is exactly what Premium sells. Rename
              the id and a free account silently starts reading them. */}
          <div className="tablewrap">
            <table id="wrEstByLease" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Lease (no.)</th>
                  <th>Operator</th>
                  <th className="right">August · likely range</th>
                  <th className="right">Midpoint</th>
                </tr>
              </thead>
              <tbody>
                {estimateByLease.map((row) => (
                  <tr key={row.lease}>
                    <td>
                      <strong>
                        <PortalLink href="/mineralownersite/leases">{row.lease}</PortalLink>
                      </strong>
                      {row.county ? ` · ${row.county}` : null}
                    </td>
                    <td
                      className={row.aggregate ? "tiny muted" : undefined}
                    >
                      {row.operator}
                    </td>
                    <td className="right num">{row.range}</td>
                    <td className="right num">{row.mid}</td>
                  </tr>
                ))}
                <tr style={{ background: "#fafbfc" }}>
                  <td>
                    <strong>All 10 leases · {nextStatement.month}</strong>
                  </td>
                  <td className="tiny muted">4 operators · 3 counties</td>
                  <td className="right num">
                    <strong>
                      {nextStatement.low} – {nextStatement.high}
                    </strong>
                  </td>
                  <td className="right num">
                    <strong>{nextStatement.mid}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="tiny muted" style={{ marginTop: 6 }}>
            {estimateByLeaseFoot}
          </p>
        </div>

        <p className="small" style={{ margin: "0 0 12px" }}>
          <strong>{nextStatement.quarterLabel}</strong>{" "}
          <span className="num cl-lock">{nextStatement.quarterRange}</span>{" "}
          <span className="tiny muted">
            · <span className="cl-lock">{nextStatement.quarterMid}</span> ·{" "}
            {nextStatement.quarterNote} ·{" "}
            <span className="chip chip-est" style={{ fontSize: 9 }}>
              estimate with a range
            </span>
          </span>
        </p>

        <AccuracyAsk />
      </div>
    </div>
  );
}

/**
 * "Make this estimate more accurate" — the upload ask.
 *
 * THE HONEST VERSION IS A `<details>` AND IT SAYS "we are not claiming a
 * figure today". That matters: the surrounding copy promises the band gets
 * narrower, and the obvious next question is "by how much?". The answer is
 * that the correction does not exist until the owner's own statements are in,
 * and inventing an example percentage — even a plausible one — would be the
 * exact failure this product is built against.
 */
function AccuracyAsk() {
  return (
    <div className="card card-pad wr-est-acc" id="wrEstAcc">
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4 style={{ marginBottom: 4 }}>{accuracyAsk.heading}</h4>
        <span className="chip chip-mint" style={{ fontSize: 10 }}>
          {accuracyAsk.chip}
        </span>
      </div>

      <p className="small" style={{ margin: "6px 0 10px" }}>
        {accuracyAsk.body}
      </p>

      <div className="grid g2" style={{ gap: 10 }}>
        {accuracyAsk.items.map((item) => (
          <div key={item.lead}>
            <strong className="small">{item.lead}</strong>
            <p className="tiny muted" style={{ marginTop: 3 }}>
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <div className="flex" style={{ flexWrap: "wrap", marginTop: 10 }}>
        <AckButton
          className="btn btn-primary btn-sm"
          label="⌲ Make this estimate more accurate"
          done="Upload opens here ✓ (prototype)"
        />
        <PortalLink className="btn btn-ghost btn-sm" href="/mineralownersite/audit">
          Or run your included Lease Audit →
        </PortalLink>
      </div>

      <details className="explain hide-s" style={{ marginTop: 10 }}>
        <summary>{accuracyAsk.honest.summary}</summary>
        <div className="ex-body">{accuracyAsk.honest.body}</div>
      </details>

      <div className="tier-p" style={{ marginTop: 10 }}>
        <p className="tiny muted" style={{ margin: 0 }}>
          <strong>Method, for the professional view:</strong>{" "}
          {accuracyAsk.method}
        </p>
      </div>
    </div>
  );
}
