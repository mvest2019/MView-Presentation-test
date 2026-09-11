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
import { financialsSeries } from "../../_lib/financials-series";
import { shortMonthLabel } from "../../_lib/months";

/**
 * THE LEASE'S OWN PRODUCTION CHART — gas left, oil right, filed then modelled.
 *
 * ── IT DIFFERS FROM THE PORTFOLIO CHART IN TWO WAYS, BOTH DELIBERATE ──
 *
 * The axes are TITLED, rotated up each side — "GAS · MCF / month" in the gas
 * colour, "OIL · BBL / month" in the oil colour. On the portfolio chart the
 * legend carries that and the units are obvious from the figures; here the two
 * scales differ by more than an order of magnitude on a single lease, and a
 * reader who reads an oil value off the left axis is out by twenty times.
 *
 * And the filed/modelled boundary is labelled at the TOP — "← POSTED |
 * FORECAST →" — rather than with chips under the axis, because the modelled
 * half is washed rather than left white, and the wash needs naming where it
 * begins.
 */

export interface LeaseChartSeries {
  values: number[];
  tone: "gas" | "oil" | "cash";
  /** The rotated axis title. */
  title: string;
  money: boolean;
}

const STROKE = {
  gas: "stroke-mv-green-deep",
  oil: "stroke-mv-sand",
  cash: "stroke-mv-green-deep",
} as const;

const FILL = {
  gas: "fill-mv-green-deep",
  oil: "fill-mv-sand",
  cash: "fill-mv-green-deep",
} as const;

export function LeaseChart({
  left,
  right,
  from,
  to,
  summary,
}: {
  left: LeaseChartSeries;
  right?: LeaseChartSeries;
  from: number;
  to: number;
  summary: string;
}) {
  const { firstMonth, lastPostedIndex } = financialsSeries;

  const leftMax = axisMax(peakIn(left.values, from, to));
  const rightMax = right ? axisMax(peakIn(right.values, from, to)) : 0;

  const split = lastPostedIndex > from && lastPostedIndex < to;
  const splitX = split ? xAt(lastPostedIndex, from, to) : PLOT.right;

  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      className="w-full"
      role="img"
      aria-label={summary}
    >
      {/* The modelled half, washed. Drawn first so every rule and line sits on
          top of it rather than being interrupted by it. */}
      {split && (
        <rect
          x={splitX}
          y={PLOT.top}
          width={PLOT.right - splitX}
          height={PLOT.bottom - PLOT.top}
          className="fill-mv-mint/40"
        />
      )}

      {axisTicks(leftMax).map((value, step) => {
        const y = yAt(value, leftMax);
        return (
          <g key={value}>
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
              className={`text-[13px] font-semibold ${FILL[left.tone]}`}
            >
              {formatTick(value, left.money)}
            </text>
            {right && (
              <text
                x={PLOT.right + 10}
                y={y + 4}
                textAnchor="start"
                className={`text-[13px] font-semibold ${FILL[right.tone]}`}
              >
                {formatTick(axisTicks(rightMax)[step], right.money)}
              </text>
            )}
          </g>
        );
      })}

      {/* The rotated axis titles — see the note above. */}
      <text
        transform={`rotate(-90 14 ${(PLOT.top + PLOT.bottom) / 2})`}
        x={14}
        y={(PLOT.top + PLOT.bottom) / 2}
        textAnchor="middle"
        className={`text-[13px] font-bold tracking-[0.06em] uppercase ${FILL[left.tone]}`}
      >
        {left.title}
      </text>
      {right && (
        <text
          transform={`rotate(90 ${CHART.width - 12} ${(PLOT.top + PLOT.bottom) / 2})`}
          x={CHART.width - 12}
          y={(PLOT.top + PLOT.bottom) / 2}
          textAnchor="middle"
          className={`text-[13px] font-bold tracking-[0.06em] uppercase ${FILL[right.tone]}`}
        >
          {right.title}
        </text>
      )}

      {split && (
        <>
          <line
            x1={splitX}
            x2={splitX}
            y1={PLOT.top}
            y2={PLOT.bottom}
            className="stroke-mv-line-strong"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text
            x={splitX - 12}
            y={PLOT.top + 2}
            textAnchor="end"
            className="fill-mv-muted text-[12px] font-bold tracking-[0.08em] uppercase"
          >
            ← Posted
          </text>
          <text
            x={splitX + 12}
            y={PLOT.top + 2}
            textAnchor="start"
            className="fill-mv-green-deep text-[12px] font-bold tracking-[0.08em] uppercase"
          >
            Forecast →
          </text>
        </>
      )}

      {[
        { series: left, max: leftMax },
        ...(right ? [{ series: right, max: rightMax }] : []),
      ].map(({ series, max }) => (
        <g key={series.title} fill="none" strokeWidth={2.4}>
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
            strokeOpacity={0.55}
            strokeLinejoin="round"
          />
        </g>
      ))}

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
    </svg>
  );
}
