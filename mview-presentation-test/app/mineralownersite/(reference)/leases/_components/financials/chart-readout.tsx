import { PLOT, xAt } from "../../_lib/chart-geometry";

/**
 * THE CHART'S HOVER READOUT — one month, read off the lines.
 *
 * ── A CHART SHOWS A SHAPE; THIS IS HOW A READER GETS A NUMBER OUT OF IT ──
 *
 * The axes round hard on purpose — `formatTick` prints "25K" and "2K" so the
 * two scales read as one instrument — which means the picture alone cannot
 * answer "what was August?" to better than a few thousand MCF. Everything else
 * on these pages is a figure with its basis stated; the chart was the one place
 * a reader had to estimate. The readout is the answer, at full precision, for
 * whichever month the pointer is nearest.
 *
 * ── IT SNAPS TO A MONTH ──
 *
 * The series is monthly and the line between two points is drawn, not measured,
 * so a readout that followed the pointer continuously would quote values that
 * were never filed. It rounds to the nearest month and puts a dot on each line
 * at that month, which is also what tells the reader the number belongs to a
 * point rather than to wherever the cursor happens to be.
 *
 * ── AND IT SAYS WHICH SIDE OF THE JOIN IT IS ON ──
 *
 * The chip is the whole reason this is safe to add. Half of every one of these
 * charts is a MODEL, and a tooltip that prints "58,204 MCF" over the forecast
 * half with no qualifier is the single most effective way to get a modelled
 * number written down as a filing. Posted or Forecast, on every reading.
 *
 * ── IT IS POSITIONED FROM EDGES, NOT FROM ITS OWN SIZE ──
 *
 * `left`/`right` and `top`/`bottom` are chosen against the hovered point, so
 * nothing here needs the card's measured height. That is deliberate: the map
 * tooltip was placed with a guessed height constant, the real card was 48px
 * taller, and it clipped at the bottom of the frame for as long as nobody
 * measured it. A box that never needs its own height cannot be wrong about it.
 */

export interface ReadoutRow {
  tone: "gas" | "oil" | "cash";
  label: string;
  value: string;
}

export interface Readout {
  index: number;
  month: string;
  posted: boolean;
  rows: ReadoutRow[];
  /** Where the nearest series point sits, as a fraction of the plot's height. */
  pointDepth: number;
}

const DOT = {
  gas: "bg-mv-green-deep",
  oil: "bg-mv-oil",
  cash: "bg-mv-cash",
} as const;

/** Full precision, with the unit the series carries. "117,432 MCF", "$41,165". */
export function readoutValue(
  value: number,
  label: string,
  money: boolean,
): string {
  const rounded = Math.round(value);
  const figure = rounded.toLocaleString("en-US");
  if (money) return `$${figure}`;
  /* "Gas · MCF" -> "MCF". The unit lives in the series label because that is
     what the legend and the axis title already print. */
  const unit = label.split("·").pop()?.trim() ?? "";
  return unit ? `${figure} ${unit}` : figure;
}

/**
 * The guide and the dots, in viewBox units — these belong INSIDE the svg, which
 * is why they are a fragment rather than a component with its own root.
 */
export function ReadoutMarks({
  readout,
  from,
  to,
  points,
}: {
  readout: Readout;
  from: number;
  to: number;
  /** Each series' y for this month, already in viewBox units. */
  points: { tone: "gas" | "oil" | "cash"; y: number }[];
}) {
  const x = xAt(readout.index, from, to);

  return (
    <g aria-hidden="true" pointerEvents="none">
      <line
        x1={x}
        x2={x}
        y1={PLOT.top}
        y2={PLOT.bottom}
        className="stroke-mv-line-strong"
        strokeWidth={1}
      />
      {points.map((point) => (
        <circle
          key={point.tone}
          cx={x}
          cy={point.y}
          r={4.5}
          /* A white ring so a dot sitting on the other line, or on a gridline,
             still reads as a dot. */
          className={`${
            point.tone === "gas"
              ? "fill-mv-green-deep"
              : point.tone === "oil"
                ? "fill-mv-oil"
                : "fill-mv-cash"
          } stroke-white`}
          strokeWidth={2}
        />
      ))}
    </g>
  );
}

/** The card itself — plain HTML over the svg, so the type is page type. */
export function ReadoutCard({
  readout,
  from,
  to,
}: {
  readout: Readout;
  from: number;
  to: number;
}) {
  /* Both axes as percentages of the svg's own box, so the card tracks the
     drawing at any width without anything being measured in pixels. */
  const xPercent = (xAt(readout.index, from, to) / 1000) * 100;
  const nearRightEdge = xPercent > 58;
  const highOnThePlot = readout.pointDepth < 0.45;

  return (
    <div
      role="tooltip"
      style={
        nearRightEdge
          ? { right: `${100 - xPercent}%`, marginRight: 12 }
          : { left: `${xPercent}%`, marginLeft: 12 }
      }
      className={`pointer-events-none absolute z-10 w-[190px] rounded-mv border border-mv-line bg-mv-card shadow-mv-lg ${
        highOnThePlot ? "bottom-[18%]" : "top-[6%]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-mv-line px-3 py-2">
        <p className="text-[12.5px] leading-none font-bold">{readout.month}</p>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[8.5px] leading-none font-bold tracking-[0.07em] uppercase ${
            readout.posted
              ? "bg-mv-portal-wash text-mv-muted"
              : "bg-mv-mint text-mv-green-ink"
          }`}
        >
          {readout.posted ? "Posted" : "Forecast"}
        </span>
      </div>

      <dl className="px-3 py-1.5">
        {readout.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline gap-2 border-b border-mv-portal-hairline py-[6px] last:border-b-0"
          >
            <span
              aria-hidden="true"
              className={`h-[7px] w-[7px] flex-none translate-y-[-1px] rounded-full ${DOT[row.tone]}`}
            />
            <dt className="text-[10.5px] text-mv-muted">
              {row.label.split("·")[0].trim()}
            </dt>
            <dd className="ml-auto text-right text-[11.5px] font-bold tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
