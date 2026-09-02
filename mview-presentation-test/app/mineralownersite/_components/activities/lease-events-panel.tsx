"use client";

import Link from "next/link";

import { PortalLink } from "../portal-link";
import { useMemo, useState } from "react";

import {
  activityDateRanges,
  activityTypes,
  latestPostedByLease,
  postedProductionFoot,
  typePanels,
  type ActivityType,
} from "../../_lib/portal-activities-data";

/**
 * TAB 1 · the by-lease production table, its type filter and its search.
 *
 * THE ONE CLIENT-STATE ISLAND ON THIS PAGE, and the boundary is drawn where it
 * is for a reason. Tab, window and radius are URL state (`ActivityScope`)
 * because they are shareable scopes that other parts of the page link to.
 * Type and search are NOT: nothing links to "the payments panel", and a
 * search box that pushed a history entry per keystroke would make the back
 * button useless. So those two live here, in the smallest component that can
 * hold them.
 *
 * SEARCH FILTERS ROWS, IT DOES NOT REQUERY. Ten leases is the whole record —
 * the honest interaction is to hide the rows that do not match and say how
 * many did, which is exactly what the reference does. The count line is the
 * part that matters: a filtered table with no "3 of 10 match" reads as a
 * shorter record rather than a filtered one.
 */
export function LeaseEventsPanel() {
  const [type, setType] = useState<ActivityType>("all");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<string>(activityDateRanges[0]);

  const needle = query.trim().toLowerCase();

  const rows = useMemo(
    () =>
      latestPostedByLease.filter(
        (row) =>
          !needle ||
          `${row.lease} ${row.operator} ${row.county}`
            .toLowerCase()
            .includes(needle),
      ),
    [needle],
  );

  const panel = typePanels[type];

  return (
    <>
      {/* --------------------------------------------------------------------
          THE TOOLBAR. Detailed and above — an Essentials reader is not given
          six filter chips and an export menu for a ten-row record.
          -------------------------------------------------------------------- */}
      <div
        className="v33-acttools hide-s"
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          margin: "0 0 12px",
        }}
      >
        <span className="tiny muted" style={{ fontWeight: 700 }}>
          Type:
        </span>
        <span
          className="layerchips"
          style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}
          role="group"
          aria-label="Filter activities by type"
        >
          {activityTypes.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`btn btn-ghost btn-sm${item.key === type ? " on" : ""}`}
              aria-pressed={item.key === type}
              onClick={() => setType(item.key)}
            >
              {item.label}
            </button>
          ))}
        </span>

        <label className="tiny muted" style={{ fontWeight: 700 }} htmlFor="actDateRange">
          Date range:
        </label>
        <select
          id="actDateRange"
          value={dateRange}
          onChange={(event) => setDateRange(event.target.value)}
          aria-label="Filter activities by date range"
        >
          {activityDateRanges.map((range) => (
            <option key={range}>{range}</option>
          ))}
        </select>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search activities… (lease, operator, county)"
          aria-label="Search activities"
          style={{ flex: 1, minWidth: 220 }}
        />
        <span className="tiny muted" role="status">
          {needle
            ? `${rows.length} of ${latestPostedByLease.length} leases match`
            : ""}
        </span>
      </div>

      <p className="tiny muted hide-s" style={{ margin: "-6px 0 12px" }}>
        Showing {dateRange.toLowerCase()} · counts update with the range.
      </p>

      {/* --------------------------------------------------------------------
          THE TYPE PANEL. `all` and `production` show nothing extra, because
          the table below already IS the production view.
          -------------------------------------------------------------------- */}
      {panel ? (
        <div
          className="card card-pad"
          style={{
            borderLeft: `4px solid ${
              panel.accent === "amber" ? "#b8892f" : "var(--green)"
            }`,
            marginBottom: 12,
          }}
        >
          <div className="between" style={{ flexWrap: "wrap" }}>
            <h4>{panel.heading}</h4>
            <span className="tiny muted">{panel.note}</span>
          </div>

          {panel.body ? (
            <p className="small" style={{ margin: "8px 0" }}>
              {panel.body}{" "}
              {panel.bodyLink ? (
                <Link href={panel.bodyLink.href}>{panel.bodyLink.text}</Link>
              ) : null}
            </p>
          ) : null}

          {panel.events ? (
            <ul className="timeline" style={{ marginTop: 10 }}>
              {panel.events.map((event) => (
                <li key={event.headline}>
                  <strong>{event.headline}</strong>
                  <span className="sub tiny muted">{event.detail}</span>
                  {event.link ? (
                    <span className="sub tiny">
                      <Link href={event.link.href}>{event.link.text}</Link>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {panel.foot ? (
            <p className="tiny muted" style={{ margin: "8px 0 0" }}>
              {panel.foot}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* --------------------------------------------------------------------
          THE TABLE. GROSS LEASE VOLUMES — the header and the foot both say
          so, because a reader who takes 58,580 mcf as their own share has
          misread the most important number on the page.
          -------------------------------------------------------------------- */}
      <div className="hide-s">
        <h4 style={{ marginBottom: 10 }}>
          Latest posted production — by lease
        </h4>
        <div className="tablewrap">
          <table style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Lease (no.)</th>
                <th>Operator</th>
                <th>County</th>
                <th className="right">Gas (mcf)</th>
                <th className="right">Oil (bbl)</th>
                <th className="right">3-mo BOE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.lease}>
                  <td>
                    <strong>
                      <PortalLink href="/mineralownersite/leases">{row.lease}</PortalLink>
                    </strong>
                  </td>
                  <td>{row.operator}</td>
                  <td>{row.county}</td>
                  <td className="right num">{row.gas}</td>
                  <td className="right num">{row.oil}</td>
                  <td className="right num">{row.boe3mo}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="small muted">
                    No lease on this record matches &ldquo;{query.trim()}
                    &rdquo;. Clear the search to see all{" "}
                    {latestPostedByLease.length}.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          {postedProductionFoot}
        </p>
      </div>
    </>
  );
}
