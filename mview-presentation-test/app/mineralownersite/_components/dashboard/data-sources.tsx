/**
 * "Data sources (dev) — where this dashboard is wired" — the reference's last
 * block on the route, and the last one this build was missing.
 *
 * PROFESSIONAL DENSITY ONLY (`.tier-p`) and collapsed by default, exactly as
 * the reference has it: a `<details>` a reader opens deliberately rather than a
 * panel that greets them.
 *
 * IT NAMES INTERNAL TABLES, which is worth knowing before this ships to real
 * owners rather than to a design review. The reference is a `noindex` mockup
 * built for exactly that review, so the disclosure is intentional there; on a
 * production portal it puts Postgres and Mongo collection names in front of
 * anyone who switches to Professional. The portal is already `noindex,
 * nofollow` (see `layout.tsx`), so nothing here is indexable — but if the
 * portal ever serves real accounts, this block is the first thing to gate or
 * drop, and it is deliberately isolated in its own file so that is a one-line
 * change at the call site.
 *
 * The eight rows are the reference's, verbatim, including the honest last-mile
 * notes: the spot feed is not in either database, and the decline data is keyed
 * by api14.
 */

/** One row: what the figure is, and the table it comes from. */
const SOURCES: { label: string; code: string[]; tail?: string }[] = [
  {
    label: "Portfolio MVestimate + today's delta",
    code: [
      "PG.membersclaimedleases.mvestimate",
      "Mongo.ProdMvestPortal.MVestimateCalculations",
    ],
    tail: "(sum) · (total_cashflow_mean/high/down + yesterday's value)",
  },
  {
    label: "Claimed owner + leases",
    code: ["PG.claimed_owners", "PG.membersclaimedleases"],
    tail: "(decimal_interest, county, lease_number, lease_switch_count)",
  },
  {
    label:
      "Production / activity counts (228 records · 22 adjacent leases · 38 permits)",
    code: [
      "Mongo.ProdMvestPortal.Activity_Production",
      "Adjacent_Lease_Activity",
      "GeoMapPortal.LeaseRadiusData.Near_Permit_List",
    ],
  },
  {
    label: '"Since you last visited"',
    code: [
      "PG.notification_history",
      "PG.member_session",
      "PG.user_notification_settings",
    ],
  },
  {
    label: "World & operator events",
    code: ["Mongo.ProdMvestPortal.Newsnew", "RRC_News"],
    tail: "(11,638 rows)",
  },
  {
    label:
      "Spot prices (WTI/gas/Brent) — external market feed (not in these DBs; wire an API)",
    code: [],
  },
  {
    label: "EUR / decline behind lease cards",
    code: ["Mongo.Decline_data_to_web.Data_to_web"],
    tail: "(keyed by api14)",
  },
  { label: "Referral credits", code: ["PG.referral_bonus"] },
];

export function DataSources() {
  return (
    <details
      className="devsources tier-p card card-pad"
      style={{ marginTop: 18 }}
    >
      <summary>Data sources (dev) — where this dashboard is wired</summary>
      <ul
        className="tiny muted"
        style={{
          margin: "10px 0 0 18px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {SOURCES.map((row) => (
          <li key={row.label}>
            {row.label}
            {row.code.length > 0 && " — "}
            {row.code.map((c, i) => (
              <span key={c}>
                {i > 0 && " · "}
                <code>{c}</code>
              </span>
            ))}
            {row.tail && ` ${row.tail}`}
          </li>
        ))}
      </ul>
    </details>
  );
}
