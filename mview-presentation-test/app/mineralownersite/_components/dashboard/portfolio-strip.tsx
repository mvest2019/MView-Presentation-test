import { formatLakhs } from "../../_lib/format-lakhs";
import { demoOwner, portfolio } from "../../_lib/portal-demo-data";

/**
 * The dark portfolio strip — v37 · C2+C6.
 *
 * THE NUMBERS THAT CHANGE, at the very top of the page. Rarely-changing facts
 * sit lower down. Five cells: the value, this week's change, gas posted this
 * week, the county's appraised value, and how many leases are producing.
 *
 * TWO DIFFERENT QUESTIONS, SIDE BY SIDE, and the labels keep them apart: the
 * MVestimate is a six-year owner-share cash-flow projection; the county
 * appraised figure is an annual tax value on all ten leases. Conflating them is
 * the mistake the two sub-lines exist to prevent.
 *
 * `.cl-lock` on the MVestimate value only. The county figure stays sharp even
 * in state 3, because it is public record — a free owner is not being shown
 * less of their own record, only less of the product.
 *
 * "No change — steady ✓" is a RESULT and is said as one (v42 · UTK-STEADY). A
 * blank or a 0.0% would read as missing data on the one figure an owner checks
 * first.
 */
export function PortfolioStrip() {
  return (
    <div className="pf-strip" style={{ marginBottom: 12 }}>
      <div className="pf-cell">
        <div className="pf-label">Your value · MVestimate</div>
        <div className="pf-val big num cl-lock">
          {formatLakhs(portfolio.estimate)}
        </div>
        <div className="pf-sub">
          six-year owner share · Estimate — not an appraisal
        </div>
      </div>

      <div className="pf-cell">
        <div className="pf-label">This week&apos;s change</div>
        <div className="pf-val">
          {portfolio.weekChange}{" "}
          <span className="pf-val-s" style={{ color: "#9fd7bd" }}>
            {portfolio.weekChangeNote}
          </span>
        </div>
        <div className="pf-sub">vs last week&apos;s value snapshot</div>
      </div>

      <div className="pf-cell">
        <div className="pf-label">Gas posted this week</div>
        <div className="pf-val num">
          {formatLakhs(portfolio.gasThisWeek)}{" "}
          <span className="pf-val-s">{portfolio.gasUnit}</span>
        </div>
        <div className="pf-sub">
          4 Smith units · Bluestem batch · oil: none new
        </div>
      </div>

      {/* `.hide-s` — the tax value is context, not the week's news, so the
          calmer densities do not carry it. */}
      <div className="pf-cell hide-s">
        <div className="pf-label">County appraised (2026)</div>
        <div className="pf-val num">
          {formatLakhs(portfolio.countyAppraised)}
        </div>
        <div className="pf-sub">
          the county&apos;s annual tax value, all {portfolio.leaseCount} leases
        </div>
      </div>

      <div className="pf-cell">
        <div className="pf-label">Producing</div>
        <div className="pf-val num">
          {portfolio.producing}{" "}
          <span className="pf-val-s">of {portfolio.leaseCount}</span>
        </div>
        <div className="pf-sub">
          {demoOwner.counties.replace(" counties", "")} — {portfolio.operators}
        </div>
      </div>
    </div>
  );
}
