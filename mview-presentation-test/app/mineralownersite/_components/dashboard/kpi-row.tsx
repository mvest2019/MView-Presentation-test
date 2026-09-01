import { formatLakhs } from "../../_lib/format-lakhs";
import { dashboardKpis, type DashboardKpi } from "../../_lib/portal-demo-data";

/**
 * The four-tile KPI row.
 *
 * `.hide-s`, so Essentials and Ultra never see it — those densities get the
 * "what changed" card and the one-line hero instead. Detailed and Professional
 * get the numbers.
 *
 * EVERY TILE CARRIES ITS OWN QUALIFIER. The MVestimate tile prints "Estimate —
 * not an appraisal" and a glossary definition on the label; each tile carries a
 * freshness stamp. The design treats a number without its provenance as the
 * defect, not the verbosity.
 *
 * `.cl-lock` is on the MVestimate value ALONE. State 3 blurs it and prints
 * "What it's worth unlocks with your free 7-day trial" beneath the tile; the
 * lease count, the posting count and the adjacent-lease count all stay sharp,
 * because the owner claimed that record and seeing it in full is the payoff for
 * claiming. The lapsed state blurs all four values, because they are all
 * all-ten-lease figures.
 */
function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  // The trailing sparkline dot marks the latest reading, so a flat line still
  // says where "now" is. Its y comes from the last point in the polyline.
  const lastY = kpi.spark?.points.trim().split(/\s+/).at(-1)?.split(",")[1];

  return (
    <div className="kpi">
      <div className="k-label">
        {kpi.glossary ? (
          <span className="gloss" tabIndex={0} title={kpi.glossary}>
            {kpi.label}
          </span>
        ) : (
          kpi.label
        )}
      </div>

      <div className={`k-val num${kpi.locked ? " cl-lock" : ""}`}>
        {formatLakhs(kpi.value)}
        {kpi.valueSuffix && (
          <span style={{ fontSize: 15, color: "var(--muted)", marginLeft: 6 }}>
            {kpi.valueSuffix}
          </span>
        )}
      </div>

      {kpi.spark && (
        <svg
          className="spark"
          viewBox="0 0 90 20"
          width="90"
          height="20"
          aria-hidden="true"
        >
          <polyline
            fill="none"
            stroke={kpi.spark.stroke}
            strokeWidth="1.5"
            points={kpi.spark.points}
          />
          <circle cx="90" cy={lastY ?? "10"} r="2" fill={kpi.spark.dotFill} />
        </svg>
      )}

      {kpi.subs.map((sub) => (
        <div className="k-sub" key={sub}>
          {sub}
          {kpi.locked && (
            <>
              {" · "}
              <span className="chip chip-est" style={{ fontSize: 10 }}>
                Estimate — not an appraisal
              </span>
            </>
          )}
        </div>
      ))}

      <div className="freshness">{kpi.freshness}</div>
    </div>
  );
}

export function KpiRow() {
  return (
    <div className="grid g4 hide-s" style={{ margin: "14px 0" }}>
      {dashboardKpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
