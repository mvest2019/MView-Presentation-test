import Link from "next/link";

import { PortalLink } from "../portal-link";
import {
  activityLegend,
  activitySectionLabels,
  adjacencyLedger,
  adjacencyLedgerFoot,
  comingSoonKpi,
  explainAdjacency,
  explainProduction,
  nearbyCountsFor,
  onYourLandKpis,
  type ActivityRadius,
  type ActivityWindow,
} from "../../_lib/portal-activities-data";

/**
 * The two KPI groups, the legend between them, and the Professional ledger.
 *
 * THE GROUPS MUST NOT MERGE INTO ONE GRID. "On your land" and "Nearby" answer
 * different questions and a reader who conflates them has been actively
 * misinformed — a permit a mile away is not a rig on their acreage. So they
 * get separate headings, separate accent rules and a legend in between saying
 * what the green top border means.
 *
 * ZERO IS PRINTED AS WORDS. All three on-your-land cards read "No new
 * activity", never `0`: on a page whose argument is that quiet is a finding,
 * a bare zero in a big numeral reads as a data gap. The nearby cards, which
 * are genuinely counts, do carry `.num`.
 */

const ILLUSTRATIVE_CHIP = (
  <span className="chip chip-est" style={{ fontSize: 8.5 }}>
    illustrative
  </span>
);

export function ActivityKpis({
  window,
  radius,
}: {
  window: ActivityWindow;
  radius: ActivityRadius;
}) {
  const counts = nearbyCountsFor(window, radius);

  return (
    <>
      <p className="act-legend hide-s">
        <span className="sw" aria-hidden="true" />
        {activityLegend}
      </p>

      {/* ------------------------------------------------------------------
          GROUP 1 · ON YOUR LAND — the events that touch your checks.
          ------------------------------------------------------------------ */}
      <div className="hide-s" style={{ margin: "0 0 8px" }}>
        <span className="v41-actsec">{activitySectionLabels.land}</span>{" "}
        <span className="tiny muted">{activitySectionLabels.landNote}</span>
      </div>

      <div className="grid g3 hide-s" style={{ marginBottom: 14 }}>
        {onYourLandKpis.map((kpi) => (
          <div className="kpi" key={kpi.label}>
            <div className="k-label">{kpi.label}</div>
            <div className="k-val" style={{ fontSize: 19 }}>
              {kpi.value}{" "}
              <span className="tiny muted" style={{ fontWeight: 600 }}>
                in {window} days
              </span>
            </div>
            <div className="k-sub">
              {kpi.sub}
              {kpi.trendTab ? (
                <>
                  {" · "}
                  <Link href={`/mineralownersite/activities?tab=${kpi.trendTab}`}>
                    trend →
                  </Link>
                </>
              ) : null}
              {kpi.subExtra ? (
                <>
                  {" · nearby changes: "}
                  <strong className="num">{counts.statusNear}</strong> in {window} d
                  / {radius} mi {ILLUSTRATIVE_CHIP}
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------
          GROUP 2 · NEARBY — neighbours at work. Signals, never income.

          Written out rather than mapped, because each card's sub-line is a
          different sentence with a different figure embedded in it, and a
          template that could express all five would be harder to read than
          the five.
          ------------------------------------------------------------------ */}
      <div className="hide-s" style={{ margin: "0 0 8px" }}>
        <span className="v41-actsec v41-actsec-near">
          {activitySectionLabels.near} {radius} mi
        </span>{" "}
        <span className="tiny muted">{activitySectionLabels.nearNote}</span>
      </div>

      <div className="grid g3 hide-s" style={{ marginBottom: 18 }}>
        <div
          className="kpi act-big"
          style={{ borderTop: "3px solid var(--green)" }}
        >
          <div className="k-label">New permits · nearby</div>
          <div className="k-val num">{counts.permitsNear}</div>
          <div className="k-sub">
            filed in the last {window} days within {radius} mi ·{" "}
            <strong className="num">38</strong> standing within 1 mi all-time{" "}
            <span className="chip chip-est" style={{ fontSize: 8.5 }}>
              windowed counts illustrative
            </span>
          </div>
        </div>

        <div className="kpi">
          <div className="k-label">Completions · nearby</div>
          <div className="k-val num">{counts.complNear}</div>
          <div className="k-sub">
            in {window} d / {radius} mi — a finished neighbor well is the
            strongest &ldquo;heating up&rdquo; signal {ILLUSTRATIVE_CHIP}
          </div>
        </div>

        <div
          className="kpi act-big"
          style={{ borderTop: "3px solid var(--green)" }}
        >
          <div className="k-label">New-production records</div>
          <div className="k-val num">{counts.prodNear}</div>
          <div className="k-sub">
            in {window} d / {radius} mi (all-time on your 10 + adjacent:{" "}
            <strong className="num">228</strong>) · vs our estimate:{" "}
            <strong className="num">{counts.prodOver}</strong> exceeded ·{" "}
            <strong className="num">{counts.prodMet}</strong> met ·{" "}
            <strong className="num">{counts.prodUnder}</strong> missed{" "}
            {ILLUSTRATIVE_CHIP}
            <br />
            <strong>7</strong> are <strong>&ldquo;this is me&rdquo;</strong>{" "}
            (your leases) · <strong>5</strong> same-reservoir neighbors
            (meaningful) · the rest other rock nearby
          </div>
        </div>

        <div
          className="kpi act-big"
          style={{ borderTop: "3px solid var(--green)" }}
        >
          <div className="k-label">Adjacent leases · ~{radius} mi</div>
          <div className="k-val num">{counts.adjNear}</div>
          <div className="k-sub">
            named tracts next door —{" "}
            <strong>
              leases you own that adjoin each other are counted once
            </strong>
            , never double ·{" "}
            <PortalLink href="/mineralownersite/map">map →</PortalLink>
          </div>
        </div>

        <div className="kpi">
          <div className="k-label">Well status changes · nearby</div>
          <div className="k-val num">{counts.statusNear}</div>
          <div className="k-sub">
            in {window} d / {radius} mi — shut-ins and reactivations on neighbor
            tracts {ILLUSTRATIVE_CHIP}
          </div>
        </div>

        {/* The card that is not a count. It ships as "Coming soon" rather than
            being left out: naming the gap is honest, and a reader who never
            sees the card cannot know the flag is planned. */}
        <div className="kpi">
          <div className="k-label">{comingSoonKpi.label}</div>
          <div className="k-val" style={{ fontSize: 16 }}>
            <span className="chip chip-blue">{comingSoonKpi.chip}</span>
          </div>
          <div className="k-sub">
            {comingSoonKpi.sub}{" "}
            <Link href="/mineralownersite">{comingSoonKpi.linkText}</Link>
          </div>
        </div>
      </div>

      <AdjacencyLedger />
      <ActivityDisclosures />
    </>
  );
}

/**
 * Professional · the adjacency ledger.
 *
 * IT EXISTS TO SHOW ITS OWN ARITHMETIC. The per-lease columns add to 32 and
 * 66; the true distinct totals are 22 and 38, because Averitt shares four
 * permits with Ledbetter, the two Cedar Bend lists are near-identical, and
 * Suzie's own Ledbetter and Averitt flank each other. The foot says all of
 * that, which is the only thing that stops the table looking wrong.
 */
function AdjacencyLedger() {
  return (
    <div
      className="card card-pad tier-p"
      style={{ margin: "0 0 14px", borderTop: "3px solid var(--slate)" }}
    >
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>Adjacency ledger — Professional</h4>
        <span className="chip chip-mint" style={{ fontSize: 9 }}>
          Wired — nearby-lease activity + nearby permits
        </span>
      </div>

      <div className="tablewrap" style={{ marginTop: 8 }}>
        <table style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>Your lease</th>
              <th className="right">Adjacent leases · 1 mi</th>
              <th className="right">Nearby permits</th>
              <th>Reservoir match</th>
            </tr>
          </thead>
          <tbody>
            {adjacencyLedger.map((row) => (
              <tr key={row.lease}>
                <td className="small">
                  <strong>{row.lease}</strong>
                </td>
                <td className="right small num">{row.adjacent}</td>
                <td className="right small num">
                  {row.permits}
                  {row.permitsNote ? (
                    <span className="tiny muted"> {row.permitsNote}</span>
                  ) : null}
                </td>
                <td className="small">{row.reservoir}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tiny muted" style={{ marginTop: 8 }}>
        {adjacencyLedgerFoot}
      </p>
    </div>
  );
}

/**
 * The two "what are these numbers" disclosures.
 *
 * THE SECOND ONE NAMES THE NEIGHBOURS. That is what turns "22 adjacent leases"
 * from a number into a checkable claim — an owner can read Nora Fay, Walter
 * Bramwell, Westlake and go and look them up. It also says, out loud, that the
 * Bee scan returns nothing: a page that lists neighbours for two counties and
 * silently omits the third would read as an oversight rather than as the
 * finding it is.
 */
function ActivityDisclosures() {
  return (
    <>
      <details className="explain hide-s" style={{ margin: "0 0 12px" }}>
        <summary>{explainProduction.summary}</summary>
        <div className="ex-body">
          <p style={{ margin: "0 0 6px" }}>
            <strong>What they are:</strong> {explainProduction.what}
          </p>
          <p style={{ margin: "0 0 6px" }}>
            <strong>What they mean for you:</strong> {explainProduction.means}
          </p>
          <p className="tiny muted" style={{ margin: 0 }}>
            {explainProduction.provenance}{" "}
            <span className="chip chip-mint" style={{ fontSize: 9 }}>
              {explainProduction.chip}
            </span>
          </p>
        </div>
      </details>

      <details className="explain hide-s" style={{ margin: "0 0 14px" }}>
        <summary>{explainAdjacency.summary}</summary>
        <div className="ex-body">
          <p style={{ margin: "0 0 6px" }}>
            <strong>What they are:</strong> {explainAdjacency.what}
          </p>
          <p style={{ margin: "0 0 8px" }}>
            <strong>Around Ledbetter &amp; Averitt (Cass/Rusk):</strong>{" "}
            {explainAdjacency.cass}
            <br />
            <strong>Around Cedar Bend (Hood):</strong> {explainAdjacency.hood}
            <br />
            <strong>Your Smith units:</strong> {explainAdjacency.bee}
          </p>
          <p style={{ margin: "0 0 6px" }}>
            <strong>The 38 permits:</strong> {explainAdjacency.permits} Each is
            on the <PortalLink href="/mineralownersite/map">map</PortalLink>.
          </p>
          <p className="tiny muted" style={{ margin: 0 }}>
            {explainAdjacency.provenance}{" "}
            <span className="chip chip-mint" style={{ fontSize: 9 }}>
              {explainAdjacency.chip}
            </span>
          </p>
        </div>
      </details>
    </>
  );
}
