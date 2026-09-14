import {
  AXIS_LABEL_Y,
  CHART,
  PLOT,
  axisMax,
  axisTicks,
  formatTick,
  labelIndices,
  linePath,
  peakIn,
  xAt,
  yAt,
} from "../../_lib/chart-geometry";
import { shortMonthLabel } from "../../_lib/months";

/**
 * THE CHART ITSELF — one hand-built SVG, no charting library.
 *
 * ── WHY HAND-BUILT ──
 *
 * It draws at most two polylines against at most two axes. A charting library
 * would add 40–120KB to a page whose whole point is a table, and every one of
 * them would then have to be argued out of its own defaults: the tooltip, the
 * animation on mount, the legend it wants to place itself, the axis labels it
 * rounds differently from `formatTick`. The maths is in `chart-geometry.ts` and
 * it is eighty lines.
 *
 * ── THE SOLID / DASHED SPLIT IS THE POINT OF THE WHOLE CARD ──
 *
 * Everything left of the divider was FILED with the state by an operator.
 * Everything right of it is a MODEL. They are drawn as one continuous line
 * because that is the truth — the model starts where the filings stop — but
 * never in the same weight, and the two chips under the axis name both halves
 * in words rather than leaving the dashes to carry it. A reader who takes the
 * forecast for a measurement is the one failure this card must not have.
 *
 * ── TWO AXES, AND ONLY WHEN THERE ARE TWO UNITS ──
 *
 * Gas is thousands of cubic feet and oil is barrels, about twenty to one on
 * this record, so a shared scale draws the oil line flat along the floor. The
 * right axis appears only in the combined view; the three single-series views
 * use the left one and say so in the note beside the pills.
 *
 * ── THE AXIS TYPE IS SET IN VIEWBOX UNITS, WHICH ARE NOT PIXELS ──
 *
 * The viewBox is 1000 wide and the SVG is `w-full`, so everything in here is
 * multiplied by the card's width over 1000 — about 1.26 in the portal's content
 * column. The axes were written as 13px and 14px and therefore DREW at roughly
 * 16 and 18, which is body-copy size for labels that are meant to be read past.
 * They are 11 now, landing near 14 on screen. Anything set inside this file is
 * a viewBox number: divide by the scale before judging it against the rest of
 * the page's type.
 *
 * THE AXIS INK IS `mv-muted`, NOT `mv-axis`. `mv-axis` (#98a2b3) is a pale
 * blue-grey built for a GRIDLINE, and the labels inherited it — which put the
 * only words on the chart at the weight of the rules behind them. #6b7280 is
 * the portal's own secondary ink and reads as type rather than as furniture.
 * The right-hand axis is the exception and keeps the oil colour: those numbers
 * belong to a series, and the colour is what says which.
 *
 * ── IT IS NOT A `<canvas>` AND IT IS NOT AN IMAGE ──
 *
 * `role="img"` with a written label gives a screen reader the shape in one
 * sentence: what is plotted, over what period, from what to what. A chart that
 * announces as nothing is the same as a chart that is not there.
 */

/**
 * THIS CHART ENDS UNDER ITS MONTH LABELS.
 *
 * `CHART.height` reserves a band below them for the posted/forecast chips, and
 * those moved to the top of the plot — so the shared height would leave forty
 * units of empty box under the months here. Derived from `AXIS_LABEL_Y` rather
 * than typed as a number, so moving the months moves the floor with them. The
 * report's own charts still use `CHART.height`: they still draw chips.
 */
const PLOT_HEIGHT = AXIS_LABEL_Y + 14;

const STROKE: Record<string, string> = {
  gas: "stroke-mv-green-deep",
  oil: "stroke-mv-oil",
  cash: "stroke-mv-cash",
};

export interface ChartSeries {
  values: number[];
  tone: keyof typeof STROKE;
  /** Axis and legend name — "Gas · MCF". */
  label: string;
  money: boolean;
}

export function SeriesChart({
  left,
  right,
  from,
  to,
  lastPostedIndex,
  firstMonth,
  summary,
}: {
  left: ChartSeries;
  /** The second axis. Only the combined oil-and-gas view has one. */
  right?: ChartSeries;
  from: number;
  to: number;
  lastPostedIndex: number;
  firstMonth: number;
  /** The sentence a screen reader is given in place of the picture. */
  summary: string;
}) {
  const leftMax = axisMax(peakIn(left.values, from, to));
  const rightMax = right ? axisMax(peakIn(right.values, from, to)) : 0;

  /* The divider only exists when the window actually straddles the join.
     Clamped inside the plot so a window ending exactly on the last filed month
     does not draw a forecast chip for a forecast that is off-screen. */
  const split = lastPostedIndex > from && lastPostedIndex < to;
  const splitX = split ? xAt(lastPostedIndex, from, to) : 0;

  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${PLOT_HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={summary}
    >
      {/* ── THE MODELLED HALF, WASHED ──

             The dashed lines and the FORECAST chip already say where the
             filings stop, but both are marks a reader has to notice and read.
             The wash says it without being read: everything standing on tinted
             ground is a model. It is drawn FIRST so every gridline, rule and
             series sits on top of it rather than being interrupted by it, and
             it matches the lease report's chart, which has had one all along.
        */}
      {split && (
        <rect
          x={splitX}
          y={PLOT.top}
          width={PLOT.right - splitX}
          height={PLOT.bottom - PLOT.top}
          className="fill-mv-mint/40"
        />
      )}

      {/* ── the grid, and the left axis it is labelled by ── */}
      {axisTicks(leftMax).map((value) => {
        const y = yAt(value, leftMax);
        return (
          <g key={`l${value}`}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={y}
              y2={y}
              className="stroke-mv-line"
              strokeWidth={1}
            />
            <text
              x={PLOT.left - 10}
              y={y + 4}
              textAnchor="end"
              className={`fill-mv-muted text-[10px] font-semibold ${
                left.tone === "oil" ? "fill-mv-oil" : ""
              }`}
            >
              {formatTick(value, left.money)}
            </text>
          </g>
        );
      })}

      {/* ── the second axis, unlabelled by gridlines of its own: two sets of
             horizontal rules at different intervals is unreadable, so the right
             axis borrows the left's five positions ── */}
      {right &&
        axisTicks(rightMax).map((value, step) => (
          <text
            key={`r${step}`}
            x={PLOT.right + 10}
            y={yAt(axisTicks(leftMax)[step], leftMax) + 4}
            textAnchor="start"
            className="fill-mv-oil text-[10px] font-semibold"
          >
            {formatTick(value, right.money)}
          </text>
        ))}

      {/* ── filed | modelled ── */}
      {split && (
        <line
          x1={splitX}
          x2={splitX}
          y1={PLOT.top}
          y2={PLOT.bottom}
          className="stroke-mv-line-strong"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      {[
        { series: left, max: leftMax },
        ...(right ? [{ series: right, max: rightMax }] : []),
      ].map(({ series, max }) => (
        <g key={series.label} fill="none" strokeWidth={2.4}>
          <path
            d={linePath(
              series.values,
              from,
              Math.min(lastPostedIndex, to),
              from,
              to,
              max,
            )}
            className={STROKE[series.tone]}
            strokeLinejoin="round"
          />
          {/* STARTS AT THE LAST FILED MONTH, NOT THE ONE AFTER IT — the two
              paths share that point, so the line continues rather than jumping
              the width of a month at the join. */}
          <path
            d={linePath(
              series.values,
              Math.max(lastPostedIndex, from),
              to,
              from,
              to,
              max,
            )}
            className={STROKE[series.tone]}
            strokeDasharray="7 6"
            strokeOpacity={0.45}
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* ── the months ── */}
      {labelIndices(from, to).map((index) => (
        <text
          key={index}
          x={xAt(index, from, to)}
          y={AXIS_LABEL_Y}
          textAnchor="middle"
          className="fill-mv-muted text-[10px]"
        >
          {shortMonthLabel(firstMonth + index)}
        </text>
      ))}

      {/* ── and what each half of them is ──

             AT THE TOP, ON THE DIVIDER, rather than in two pills under the
             axis. The label belongs to the line it names: beside it, a reader
             takes in "this side filed, that side modelled" in the same glance
             that finds the divider. Under the axis the pills sat below the
             months, a row away from the thing they described, and had to be
             matched back up to it.

             The arrows are the half that makes it work — "← POSTED" and
             "FORECAST →" say which side each word owns. Without them two words
             either side of a line are just two words near a line.
        */}
      {split && (
        <>
          <text
            x={splitX - 12}
            y={PLOT.top + 2}
            textAnchor="end"
            className="fill-mv-muted text-[10px] font-bold tracking-[0.08em] uppercase"
          >
            ← Posted
          </text>
          <text
            x={splitX + 12}
            y={PLOT.top + 2}
            textAnchor="start"
            className="fill-mv-green-deep text-[10px] font-bold tracking-[0.08em] uppercase"
          >
            Forecast →
          </text>
        </>
      )}
    </svg>
  );
}
