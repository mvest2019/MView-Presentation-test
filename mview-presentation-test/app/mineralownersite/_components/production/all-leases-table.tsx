import { PortalLink } from "../portal-link";
import {
  productionLeases,
  productionTableMeta,
  productionTotals,
} from "../../_lib/portal-production-data";

/**
 * ALL TEN LEASES — v43 · OW-45 · OW-06/07/08.
 *
 * Ryan: "currently one lease — need every lease, plus a report on each lease."
 * This table is that answer, and it is the part of the page that is entirely
 * the owner's own record rather than a worked example.
 *
 * THE TABLE STAYS WHOLE IN ALL FOUR VIEWS. There is no `.hide-s` on it, which
 * is deliberate and recorded: "the tables are good… the tables were the part
 * that already worked". The chart below gains lighter readings per density; the
 * table is never cut down.
 *
 * EVERY NAME IS A DOOR — the lease, its county, its operator (OW-06/07/08).
 * None of those three modules is built, so each renders through `PortalLink`,
 * which keeps the words and the arrow's meaning while saying, on hover, that
 * the destination is not open yet. A live `<a>` here would ship ten rows of
 * 404s and teach the reader the product is broken rather than unfinished.
 *
 * THE $0 ROWS ARE THE HONEST PART. Three leases project nothing forward, and
 * the design refuses to let that read as lost ownership: each shows the
 * county's own appraised figure beside the zero, and the footnote says outright
 * that a $0 forecast is a forecast.
 */
export function AllLeasesTable() {
  /* NOT `.cl-lock`. The reference carries exactly five locked figures on this
     route and all five are in the cards above — the three headline values and
     two midpoints. Every column in this table, dollars included, stays sharp
     for a free claimed owner. That is the same rule the dashboard follows: the
     gate covers the PRODUCT (the MVestimate headline), never a per-lease
     figure the owner could read off their own record. */
  const moneyClass = "right num";

  return (
    <div className="chartbox" style={{ marginBottom: 16 }}>
      <div
        className="between"
        style={{ flexWrap: "wrap", padding: "2px 2px 10px" }}
      >
        <h4>{productionTableMeta.heading}</h4>
        <span className="chip chip-est" style={{ fontSize: 10 }}>
          {productionTableMeta.chip}
        </span>
      </div>

      <div className="tablewrap">
        <table id="pf2AllLeases" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              {productionTableMeta.columns.map((column, i) => (
                <th key={column} className={i >= 3 ? "right" : undefined}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productionLeases.map((row) => (
              <tr key={row.lease}>
                <td>
                  <strong>
                    <PortalLink href={row.href}>{row.lease}</PortalLink>
                  </strong>
                  {row.inactive ? (
                    <>
                      {" "}
                      <span className="chip chip-slate" style={{ fontSize: 9 }}>
                        Inactive
                      </span>
                    </>
                  ) : null}
                </td>
                <td>
                  <PortalLink href={row.countyHref}>{row.county}</PortalLink>
                </td>
                <td>
                  <PortalLink href={row.operatorHref}>
                    {row.operator}
                  </PortalLink>
                </td>
                <td className="right num">{row.posted}</td>
                <td className={moneyClass}>{row.nextMonth}</td>
                <td className={moneyClass}>{row.nextQuarter}</td>
                <td className={moneyClass}>
                  {row.sixYears}
                  {row.countyValue ? (
                    <>
                      {" "}
                      <span className="tiny muted">{row.countyValue}</span>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}

            <tr style={{ background: "#fafbfc" }}>
              <td>
                <strong>{productionTotals.lease}</strong>
              </td>
              <td>{productionTotals.county}</td>
              <td>{productionTotals.operator}</td>
              <td className="right num">
                <strong>{productionTotals.posted}</strong>
              </td>
              <td className={moneyClass}>
                <strong>{productionTotals.nextMonth}</strong>
              </td>
              <td className={moneyClass}>
                <strong>{productionTotals.nextQuarter}</strong>
              </td>
              <td className={moneyClass}>
                <strong>{productionTotals.sixYears}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="tiny muted" style={{ padding: "8px 2px 2px" }}>
        <strong>{productionTableMeta.footLead}</strong>
        {productionTableMeta.foot}
        <em>{productionTableMeta.footEm}</em>
        {productionTableMeta.footTail}
      </p>
    </div>
  );
}
