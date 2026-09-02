import type { Metadata } from "next";

import { AllLeasesTable } from "../_components/production/all-leases-table";
import { CasperChartCard } from "../_components/production/casper-chart-card";
import { LeaseMapCard } from "../_components/production/lease-map-card";
import { LeaseScorecard } from "../_components/production/lease-scorecard";
import { ProductionTopValues } from "../_components/production/production-top-values";
import {
  productionMeta,
  unitNoteSimple,
  unitNoteUltra,
} from "../_lib/portal-production-data";

/**
 * PRODUCTION & FORECAST — `/mineralownersite/production`.
 *
 * A SERVER COMPONENT, like the Dashboard, Activities and the Weekly Report. One
 * client island ships JavaScript — the deep-dive chart's brush and hover — and
 * nothing else on the page does.
 *
 * THE PAGE IN ORDER, which is the reference's order and matters:
 *
 *   1  the head, and what the page is for
 *   2  next month · next quarter · next six years        every view
 *   3  ALL TEN LEASES, each row a door into its report    every view
 *   4  the CASPER A2 worked example — chart per density
 *   5  where that lease sits, beside its scorecard        every view
 *   6  what bbl and mcf mean                              lighter views only
 *
 * Values first, then the owner's whole record, then one fully-wired example of
 * what a single lease's report contains. A reader who stops after the table has
 * still had the answer.
 *
 * WHAT THE DENSITIES CHANGE, AND WHAT THEY NEVER TOUCH. Only the chart and the
 * two unit notes vary. The top values, the ten-lease table, the map and the
 * scorecard are identical in all four views — recorded in the reference as
 * "nothing is removed from any tier… the tables were the part that already
 * worked". So Essentials and Ultra get a gentler CHART, never a smaller page.
 *
 * ULTRA DOES NOT REPLACE THIS PAGE, and that is a deliberate exception rather
 * than an oversight. The reference lists the routes Ultra collapses to a single
 * hero — dashboard, leases, briefing, activities, alerts, groups, dossier — and
 * `app-production` is NOT among them. So the wrapper carries `mv-u-keep`;
 * see the rule it opts out of in `portal.css` §9.
 *
 * NO UNCLAIMED VARIANT, also deliberate. This route carries no `.nc-only` or
 * `.nc-swap` block in the reference, because a visitor with no claimed record
 * has no leases to forecast — the claim rail on the dashboard is that state's
 * answer, and inventing a sample here would mean inventing production history.
 *
 * ON LOADING, EMPTY AND ERROR STATES. Every figure here is a module constant,
 * so the page is fully rendered in its first byte: there is no fetch to be
 * pending, nothing to be empty, and no request to fail. That is why this route
 * ships no `loading.tsx` — a skeleton for data that is already present would
 * flash for one frame and mean nothing. When these figures come from the live
 * record, the boundary belongs here, around the components that read it.
 */
export const metadata: Metadata = {
  title: "Production & Forecast",
  description:
    "What every one of your leases has produced — oil and gas kept separate, in their own units — and where the decline-curve model says each one is heading.",
};

export default function ProductionPage() {
  return (
    <div className="mv-dash-routes mv-u-keep">
      {/* 1 · the head. */}
      <div className="between" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 24 }}>{productionMeta.title}</h2>
          <p className="small muted">
            {productionMeta.straplineLead}
            <strong>{productionMeta.straplineStrong}</strong>
            {productionMeta.straplineTail}
          </p>
        </div>
        <span className="chip chip-mint">{productionMeta.coverage}</span>
      </div>

      {/* The one thing this page has to say before any number: production is
          what the operator told the state, NOT what the owner was paid. */}
      <div className="notice mint" style={{ marginBottom: 14 }}>
        <span aria-hidden="true">✦</span>
        <div>
          <strong>{productionMeta.purposeLead}</strong>
          {productionMeta.purpose}
        </div>
      </div>

      {/* 2 · values at the top, every view. */}
      <ProductionTopValues />

      {/* 3 · all ten leases. */}
      <AllLeasesTable />

      {/* 4 · the worked example, at whichever density is on. */}
      <CasperChartCard />

      {/* 5 · where it sits, and its scorecard. */}
      <div className="pf2-duo">
        <LeaseMapCard />
        <LeaseScorecard />
      </div>

      {/* 6 · the two units, explained once, for the two lighter views. Ryan:
          "would somebody on Ultra even know what MCF means?" */}
      <div className="notice slate tier-s" style={{ margin: "14px 0 0" }}>
        <span aria-hidden="true">▤</span>
        <div>
          <strong>{unitNoteSimple.lead}</strong>{" "}
          <strong>{unitNoteSimple.bbl}</strong>
          {unitNoteSimple.bblBody}
          <strong>{unitNoteSimple.mcf}</strong>
          {unitNoteSimple.mcfBody}
        </div>
      </div>
      <div className="notice slate tier-u" style={{ margin: "14px 0 0" }}>
        <span aria-hidden="true">▤</span>
        <div>
          <strong>{unitNoteUltra.lead}</strong>
          {unitNoteUltra.body}
        </div>
      </div>
    </div>
  );
}
