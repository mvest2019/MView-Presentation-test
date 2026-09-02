import { PortalLink } from "../portal-link";
import { CasperDetailChart } from "./casper-detail-chart";
import { CasperSimpleChart } from "./casper-simple-chart";
import {
  casperMeta,
  casperSimple,
  casperUltra,
} from "../../_lib/portal-production-data";

/**
 * THE WORKED-EXAMPLE CHART CARD — one card, three readings of the same series.
 *
 * WHAT EACH DENSITY GETS, and why there are three rather than one (v43 · OW-10,
 * Ryan: "Production & Forecast is pretty good — but the charts assume
 * knowledge"):
 *
 *   ULTRA        `.tier-u` — the SENTENCE the chart is trying to say, and no
 *                chart at all. "This well is slowing down, gently and on
 *                schedule."
 *
 *   ESSENTIALS   `.tier-s` — one line, plain words, axes labelled "its best
 *                month" and "nothing", and a key that says which line is
 *                reported and which is estimated.
 *
 *   DETAILED +   `.hide-s` — the two-axis deep dive with the brush, the four
 *   PROFESSIONAL presets and the hover readout.
 *
 * ULTRA AND ESSENTIALS ARE MUTUALLY EXCLUSIVE, not cumulative:
 * `portal.css` hides `.tier-s` under `.view-ultra` ("ultra replaces the Simple
 * hero, never stacks on it"), and Ultra also carries `view-simple`, so
 * `.hide-s` takes the deep dive away too. Ultra therefore sees exactly one of
 * these three blocks.
 *
 * THE HEADER IS SHARED BY ALL THREE, because the disclaimer has to be: this is
 * a demonstration lease, and every density needs to know that before it reads a
 * single number. Only the legend is `.hide-s`, since it describes the two-line
 * chart the lighter views do not get.
 */
export function CasperChartCard() {
  return (
    <div className="chartbox">
      <div className="pf2-chead">
        <div>
          <h4>
            {casperMeta.title}{" "}
            <span
              className="chip chip-slate"
              style={{ fontSize: 9.5, verticalAlign: 2 }}
            >
              {casperMeta.exampleChip}
            </span>
          </h4>

          <p className="pf2-sub">
            <strong style={{ color: "var(--ink)", fontWeight: 800 }}>
              <PortalLink href={casperMeta.operatorHref}>
                {casperMeta.operator}
              </PortalLink>
            </strong>
            {casperMeta.facts.map((fact) => (
              <span key={fact}>
                <span className="pf2-dot">·</span>
                {/* Wells and acres are figures, so they take `.num` for the
                    tabular figures the rest of the portal uses. */}
                {/\d/.test(fact) ? <span className="num">{fact}</span> : fact}
              </span>
            ))}
          </p>

          <p className="pf2-sub">
            <strong>{casperMeta.disclaimerStrong}</strong>
            {casperMeta.disclaimer}
            <PortalLink href={casperMeta.disclaimerHref}>
              {casperMeta.disclaimerLink}
            </PortalLink>
            {casperMeta.disclaimerTail}
          </p>
        </div>

        <div
          className="pf2-legend hide-s"
          role="list"
          aria-label="Chart legend"
        >
          <span>
            <span className="pf2-sw" />
            {casperMeta.legendOil}
          </span>
          <span>
            <span className="pf2-sw gas" />
            {casperMeta.legendGas}
          </span>
          <span className="pf2-lgnote">{casperMeta.legendNote}</span>
        </div>
      </div>

      {/* ULTRA · the sentence, no chart at all. */}
      <div
        className="tier-u card card-pad"
        style={{
          boxShadow: "none",
          borderLeft: "4px solid var(--green)",
          margin: "0 0 4px",
        }}
      >
        <h4 style={{ marginBottom: 6 }}>{casperUltra.heading}</h4>
        <p style={{ fontSize: 15, margin: 0 }}>{casperUltra.body}</p>
      </div>

      {/* ESSENTIALS · one line, one story, plain words. */}
      <div className="tier-s">
        <h4 style={{ margin: "2px 2px 2px" }}>{casperSimple.heading}</h4>
        <CasperSimpleChart />
        <div className="pf2-key">
          <span>
            <span className="pf2-sw" />
            <strong>{casperSimple.keySolidStrong}</strong>
            {casperSimple.keySolid}
          </span>
          <span>
            <span className="pf2-sw" style={{ borderTopStyle: "dashed" }} />
            <strong>{casperSimple.keyDashedStrong}</strong>
            {casperSimple.keyDashed}
          </span>
        </div>
        <p className="pf2-note">
          {casperSimple.noteLead}
          <strong>{casperSimple.noteStrong}</strong>
          {casperSimple.noteTail}
        </p>
      </div>

      {/* DETAILED and PROFESSIONAL · the deep dive. */}
      <div className="hide-s">
        <CasperDetailChart />
      </div>
    </div>
  );
}
