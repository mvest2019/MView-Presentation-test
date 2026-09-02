import Link from "next/link";

import { PortalLink } from "../portal-link";
import { archive, monthly } from "../../_lib/portal-briefing-data";
import { AckButton } from "../proto-buttons";

/**
 * THE MONTHLY — "the keeper".
 *
 * A DIFFERENT DOCUMENT FROM THE WEEKLY, and the copy says which is which:
 * "the weekly report is a slice; the monthly is truth". The weekly reads a
 * week of filings against a model; the monthly closes a month, is generated as
 * a stored artifact with its source snapshot, and is the one that gets printed
 * and mailed. It is the issue owners file and forward to family — which is why
 * the provenance line names the artifact id, the close date, the generation
 * date, the email date and the print-vendor status.
 *
 * THE PRINT STATUS IS NOT DECORATION. "queued with the print vendor — status
 * tracked here" is a claim about a physical object in the post. Rendering it
 * as "mailed ✓" before it has been would be the kind of small lie that
 * eventually loses an owner who checks.
 *
 * `hide-s` — Essentials does not carry the monthly. Two long reports on one
 * screen is the "so much at the top that you bury everything below it" failure
 * the design records; the calm density gets this week, and the rail's Monthly
 * stop deepens to Detailed to reach it.
 */
export function ReportMonthly() {
  return (
    <div className="card wr-monthly wr-noprint hide-s" id="wrMonthly">
      <div className="wr-monthly-head">
        <div className="between" style={{ flexWrap: "wrap", gap: 8 }}>
          <div>
            <div className="section-label" style={{ color: "#7fd4ae" }}>
              {monthly.kicker}
            </div>
            <h3 style={{ color: "#fff", fontSize: 20, marginTop: 2 }}>
              {monthly.title}
            </h3>
            <p className="wr-monthly-find">{monthly.headline}</p>
            <p className="tiny wr-monthly-prov">
              {monthly.provenance}{" "}
              <strong>{monthly.provenanceStrong}</strong>{" "}
              {monthly.provenanceTail}
            </p>
          </div>

          <div className="flex" style={{ flexWrap: "wrap", gap: 6 }}>
            <span className="chip wr-chip-included">{monthly.chip}</span>
            <AckButton
              className="btn btn-primary btn-sm"
              label="✉ Email me this issue"
              done="Sent — summary + link ✓ (prototype)"
            />
            <AckButton
              className="btn btn-ghost btn-sm wr-btn-ondark"
              label="Mail a copy to family"
              done="Queued for the mailed copy ✓ (prototype)"
            />
          </div>
        </div>
      </div>

      <div className="card-pad">
        <div className="grid g4" style={{ gap: 10, marginBottom: 14 }}>
          {monthly.kpis.map((kpi) => (
            <div
              className="kpi"
              style={{
                boxShadow: "none",
                ...(kpi.accent === "amber"
                  ? { borderTop: "3px solid #b8892f" }
                  : {}),
              }}
              key={kpi.label}
            >
              <div className="k-label">{kpi.label}</div>
              <div className={`k-val num${kpi.locked ? " cl-lock" : ""}`}>
                {kpi.value}
              </div>
              <div className="k-sub">
                {kpi.sub}
                {kpi.chip ? (
                  <>
                    {" "}
                    <span className="chip chip-est" style={{ fontSize: 9 }}>
                      {kpi.chip}
                    </span>
                  </>
                ) : null}
                {kpi.link ? (
                  <>
                    {" · "}
                    <PortalLink href="/mineralownersite/audit">{kpi.link}</PortalLink>
                  </>
                ) : null}
                {kpi.hint ? (
                  <>
                    <br />
                    <span className="ctx-hint">{kpi.hint}</span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="grid g2" style={{ gap: 14, alignItems: "start" }}>
          <div>
            <h4 style={{ marginBottom: 8 }}>{monthly.tableHeading}</h4>
            <div className="tablewrap">
              <table style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    <th>Lease (no.)</th>
                    <th className="right">Actual (gas · oil)</th>
                    <th className="right">We expected · (±)</th>
                    <th>Read</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.rows.map((row) => (
                    <tr key={row.lease}>
                      <td>
                        <strong>
                          <PortalLink href="/mineralownersite/leases">{row.lease}</PortalLink>
                        </strong>
                      </td>
                      <td className="right num">{row.actual}</td>
                      <td className="right num">
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
                      </td>
                      <td className="tiny muted">{row.read}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {monthly.tableFoot}{" "}
              <span className="chip chip-est" style={{ fontSize: 9 }}>
                {monthly.tableFootChip}
              </span>{" "}
              {monthly.tableFootTail}
            </p>
          </div>

          <div className="stack" style={{ gap: 10 }}>
            {monthly.notices.map((notice) => (
              <div
                className={`notice ${notice.tone}`}
                style={{ margin: 0 }}
                key={notice.lead}
              >
                <span>{notice.glyph}</span>
                <div>
                  <strong>{notice.lead}</strong> {notice.body}
                </div>
              </div>
            ))}

            <div className="wr-plannote">
              <div className="between" style={{ flexWrap: "wrap" }}>
                <strong className="small">What each plan sees</strong>
                <span className="chip chip-slate" style={{ fontSize: 9 }}>
                  honest gating
                </span>
              </div>
              <p className="tiny muted" style={{ marginTop: 6 }}>
                {monthly.planNote}{" "}
                <Link href="/pricing">Compare plans →</Link>
              </p>
            </div>

            <p className="tiny muted" style={{ margin: 0 }}>
              {monthly.next}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The archive.
 *
 * THE FIRST ROW IS A QUIET WEEK, deliberately kept in the list. An archive
 * that only surfaced eventful issues would quietly re-teach the reader that a
 * quiet week is a missing week — the opposite of what every other line in this
 * product says.
 */
export function ReportArchive() {
  return (
    <div
      className="card card-pad wr-noprint hide-s"
      id="wrArchive"
      style={{ marginTop: 4 }}
    >
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>{archive.heading}</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {archive.chip}
        </span>
      </div>

      <div className="leaselist" style={{ marginTop: 8 }}>
        {archive.issues.map((issue) => (
          <div className="li" key={issue.week}>
            <span>
              <strong>{issue.week}</strong> · {issue.note}
            </span>
            <AckButton label="Open" done="Opens in production ✓" />
          </div>
        ))}
      </div>

      <p className="tiny muted" style={{ marginTop: 8 }}>
        {archive.foot}
      </p>
    </div>
  );
}
