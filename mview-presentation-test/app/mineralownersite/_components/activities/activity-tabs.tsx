import { PortalLink } from "../portal-link";
import {
  countyActivity,
  trendFoot,
  trendNotice,
  trendPanels,
} from "../../_lib/portal-activities-data";
import { PortalIcon } from "../portal-icon";

/**
 * TAB 2 · the nearby development trend, and TAB 3 · county & operator.
 *
 * Both are server components: neither holds state, and only one of the three
 * tabs is rendered at a time — which the page decides from `?tab=`.
 */

/**
 * TAB 2 — is drilling moving TOWARD your leases, or away?
 *
 * EVERY FIGURE HERE IS LABELLED ILLUSTRATIVE, on the notice at the top and
 * again on each panel, and that is not defensive boilerplate. The standing
 * counts on this page are real scan results; a period-over-period comparison
 * needs a DATED permit and completion feed, which is build #7 and is not
 * connected. Printing "7 this month vs 4 last month" without the label would
 * be inventing a trend — the one thing a page about neighbours drilling must
 * never do, because a fabricated upward trend is exactly what puts an owner in
 * front of a lowball offer feeling optimistic.
 *
 * THE "READING" LINE IS THE POINT OF EACH PANEL. Three numbers do not answer
 * "toward or away"; a sentence does, and it names which county and whether it
 * touched the owner's own land.
 */
export function NearbyTrendPanel() {
  return (
    <div className="hide-s">
      <div className="notice mint" style={{ margin: "0 0 12px" }}>
        <span>
          <PortalIcon name="trend" className="mvi mvi-inline" />
        </span>
        <div>
          <strong>{trendNotice.heading}</strong> {trendNotice.body}{" "}
          <span className="chip chip-blue" style={{ fontSize: 9 }}>
            {trendNotice.chip}
          </span>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        {trendPanels.map((panel) => (
          <div
            className="card card-pad"
            style={{ borderLeft: "4px solid var(--green)" }}
            key={panel.heading}
          >
            <div className="between" style={{ flexWrap: "wrap" }}>
              <h4>{panel.heading}</h4>
              <span className="chip chip-est" style={{ fontSize: 9 }}>
                illustrative
              </span>
            </div>

            {panel.rows.map((row) => (
              <div className="setrow" key={row.label}>
                <span className="small">{row.label}</span>
                <span className="small num">
                  {row.value}{" "}
                  {row.compare ? (
                    <span
                      className={row.direction === "up" ? "delta-up" : "muted"}
                    >
                      {row.compare}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}

            <p className="tiny muted" style={{ margin: "8px 0 0" }}>
              <strong>Reading:</strong> {panel.reading}
            </p>
          </div>
        ))}
      </div>

      <p className="tiny muted">
        {trendFoot}{" "}
        <PortalLink href="/mineralownersite/map">
          See the newest permits on the map →
        </PortalLink>
      </p>
    </div>
  );
}

/**
 * TAB 3 — by county and operator.
 *
 * EACH CARD SAYS WHAT KIND OF RECORD THAT COUNTY IS — gas-heavy, oil-weighted,
 * dry-gas — because that is what decides whether this week's price move
 * reached the owner at all. Bee's card also states plainly that the adjacency
 * scan returns nothing there; three cards where one honestly has no neighbours
 * is a finding, and hiding it would leave the reader assuming the data was
 * missing.
 */
export function CountyOperatorPanel() {
  return (
    <div className="hide-s">
      <h4 style={{ marginBottom: 10 }}>Activity — by county &amp; operator</h4>
      <div className="grid g3">
        {countyActivity.map((card) => (
          <div className="card card-pad" key={card.slug}>
            <div className="between">
              <h4>
                <PortalLink href={`/mineralownersite/map?county=${card.slug}`}>
                  {card.county} →
                </PortalLink>
              </h4>
              <span className="chip chip-mint">{card.leases}</span>
            </div>
            <p className="small muted" style={{ margin: "6px 0" }}>
              {card.operators}
            </p>
            <p className="small num">{card.body}</p>
            <PortalLink
              className="tiny"
              href={`/mineralownersite/map?county=${card.slug}`}
            >
              Open the {card.county.replace(" Co.", "")} county report →
            </PortalLink>
          </div>
        ))}
      </div>
    </div>
  );
}
