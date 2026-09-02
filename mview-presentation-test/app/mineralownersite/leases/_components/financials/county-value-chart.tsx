import { formatDollars } from "../../_lib/lease-format";
import {
  countyPlaceholderTotal,
  inactiveLeases,
  valueByCounty,
} from "../../_lib/lease-totals";

/**
 * WHERE THE SIX-YEAR VALUE SITS — one horizontal bar per county.
 *
 * ── THE BARS ARE DERIVED, AND THEY HAD TO BE ──
 *
 * The prototype drew this as hand-positioned SVG: three `<rect>`s with literal
 * pixel widths (235, 165, 97) and literal labels. Its Hood bar was labelled
 * $8,990 where the four Cedar Bend leases in Hood come to $8,240, so its three
 * bars summed to $27,090 under a $26,340 total printed immediately above them.
 *
 * Reducing over the records fixes that by construction — see `valueByCounty` in
 * `lease-totals.ts`. The bar widths follow from each county's share of the
 * largest, so nothing needs re-measuring when a lease moves counties or a value
 * changes, and the bars cannot disagree with the total again.
 *
 * ── THE COLOUR RAMP, INSTEAD OF THREE FIXED GREENS ──
 *
 * The design assigns each of its three bars its own literal green. A palette of
 * exactly three cannot survive a fourth county, which live data will produce, so
 * the leading county keeps the design's green gradient and each bar after it
 * steps down in opacity. Same read — biggest is boldest — for any number of
 * counties.
 *
 * ── THE SUB-LABEL ──
 *
 * Each county gets one line naming what is in it (how many leases, which
 * operators). That is the sentence that turns three bars into information: "Bee
 * is your engine, and it is four Smith units run by Bluestem."
 */

const BAR = { labelWidth: 62, left: 70, right: 305, height: 22, rowHeight: 46 };

export function CountyValueChart() {
  const height = valueByCounty.length * BAR.rowHeight;
  const maxBarWidth = BAR.right - BAR.left;

  return (
    <svg
      viewBox={`0 0 320 ${height}`}
      role="img"
      aria-label={`Owner-share MVestimate by county: ${valueByCounty
        .map((entry) => `${entry.county} ${formatDollars(entry.value)}`)
        .join(", ")}.`}
      className="my-1.5 block h-auto w-full"
    >
      <defs>
        <linearGradient id="mv-county-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-mv-green-deep)" />
          <stop offset="100%" stopColor="var(--color-mv-green)" />
        </linearGradient>
      </defs>

      {valueByCounty.map((entry, index) => {
        const top = index * BAR.rowHeight + 16;
        const width = Math.max(entry.share * maxBarWidth, 1);
        /* The design appends the display-only county placeholders to the LAST
           (smallest) caption, where there is room for the clause and where the
           quiet leases actually sit. */
        const isLast = index === valueByCounty.length - 1;

        return (
          <g key={entry.county}>
            <text
              x={BAR.labelWidth}
              y={top + 14}
              fontSize={12}
              fontWeight={700}
              textAnchor="end"
              className="fill-mv-slate"
            >
              {entry.county}
            </text>

            <rect
              x={BAR.left}
              y={top}
              width={width}
              height={BAR.height}
              rx={6}
              fill="url(#mv-county-bar)"
              /* The leading bar at full strength, each one after it a step
                 lighter. See the colour-ramp note above. */
              opacity={index === 0 ? 1 : Math.max(0.66 - index * 0.16, 0.3)}
            />

            <text
              /* Inside the bar when there is room for the figure, just outside
                 it when there is not — a short bar would otherwise clip its own
                 label or overprint the bar's left edge. */
              x={width > 78 ? BAR.left + width - 7 : BAR.left + width + 7}
              y={top + 15}
              fontSize={11}
              fontWeight={800}
              textAnchor={width > 78 ? "end" : "start"}
              className={width > 78 ? "fill-mv-green-ink" : "fill-mv-slate"}
            >
              {formatDollars(entry.value)}
            </text>

            <text
              x={BAR.left}
              y={top + BAR.height + 12}
              fontSize={8.5}
              className="fill-mv-muted"
            >
              {entry.note}
              {isLast &&
                ` (+ ${inactiveLeases.length} quiet leases at county value, $${countyPlaceholderTotal.toLocaleString(
                  "en-US",
                )} display-only)`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
