import {
  AXIS_LABEL_Y,
  CHART,
  CHIP_Y,
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
 * ── IT IS NOT A `<canvas>` AND IT IS NOT AN IMAGE ──
 *
 * `role="img"` with a written label gives a screen reader the shape in one
 * sentence: what is plotted, over what period, from what to what. A chart that
 * announces as nothing is the same as a chart that is not there.
 */

const STROKE: Record<string, string> = {
  gas: "stroke-mv-green-deep",
  oil: "stroke-mv-sand",
  cash: "stroke-mv-green-deep",
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
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      className="w-full"
      role="img"
      aria-label={summary}
    >
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
              className={`fill-mv-axis text-[13px] font-semibold ${
                left.tone === "oil" ? "fill-mv-sand" : ""
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
            className="fill-mv-sand text-[13px] font-semibold"
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
          className="fill-mv-axis text-[14px]"
        >
          {shortMonthLabel(firstMonth + index)}
        </text>
      ))}

      {/* ── and what each half of them is ── */}
      {split && (
        <>
          <Chip x={splitX - 46} y={CHIP_Y} tone="slate" text="POSTED" />
          <Chip x={splitX + 46} y={CHIP_Y} tone="mint" text="FORECAST" />
        </>
      )}
    </svg>
  );
}

/**
 * One chip under the axis. A `<rect>` plus a `<text>` rather than a
 * `foreignObject`, which does not print reliably and does not scale with the
 * viewBox.
 */
function Chip({
  x,
  y,
  text,
  tone,
}: {
  x: number;
  y: number;
  text: string;
  tone: "slate" | "mint";
}) {
  const width = text.length * 8 + 20;
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - 13}
        width={width}
        height={20}
        rx={6}
        className={tone === "mint" ? "fill-mv-mint" : "fill-mv-portal-wash"}
      />
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        className={`text-[11px] font-bold ${
          tone === "mint" ? "fill-mv-green-ink" : "fill-mv-slate"
        }`}
      >
        {text}
      </text>
    </g>
  );
}
