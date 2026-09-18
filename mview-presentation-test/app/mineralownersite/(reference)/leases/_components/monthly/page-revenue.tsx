import {
  AXIS_LABEL_Y,
  CHART,
  CHIP_Y,
  PLOT,
  axisMax,
  formatTick,
  labelIndices,
  xAt,
  yAt,
} from "../../_lib/chart-geometry";
import { financialsSeries } from "../../_lib/financials-series";
import { shortMonthLabel } from "../../_lib/months";
import { revenueSeries } from "../../_lib/revenue-series";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { ReportFootnote, ReportPageCard } from "./report-page";

/**
 * PAGE 3 · REVENUE TREND — income by month, stacked by product.
 *
 * ── A STACKED AREA, NOT TWO LINES ──
 *
 * The question this page answers is "what did I earn and which product earned
 * it", and a stack answers both at once: the top edge is the cheque, and where
 * the boundary sits inside it is the split. Two separate lines would answer the
 * second question and force the reader to add them up in their head for the
 * first — which is the one they came for.
 *
 * ── THE FORECAST IS TINTED RATHER THAN DASHED ──
 *
 * An area cannot be dashed the way the Financials line is, so the modelled
 * months carry a wash and a lighter fill instead, with the same divider and the
 * same two chips underneath. The convention has to be visible at a glance on
 * every chart in this product: past the line, nothing has been filed.
 */

/** Two years behind the last filing and half a year past it. */
const MONTHS_BEHIND = 24;
const MONTHS_AHEAD = 6;

export function PageRevenue({ report }: { report: MonthlyReport }) {
  /* ── WHOSE THIRTY-SEVEN MONTHS THESE ARE ──
     The service sends the band already windowed: twenty-four months back from
     the report's own month and twelve forward, each with its gas and oil cash
     and its own `forecast` flag. The fixture path slices a window out of the
     shared series instead, which is why the two compute `from`/`to`
     differently.

     THE DIVIDER IS THE FLAG, NOT A COUNT. It used to be OR'd across every lease
     upstream — one modelled row in a past month flagged the whole month
     projected, and on a 782-lease record every month came back forecast, so the
     chart had no solid section at all. It is the forecast boundary itself now:
     25 filed, 12 modelled. */
  const served = report.served?.revenue;

  const gas = served ? served.map((month) => month.gasCash) : revenueSeries.gas;
  const oil = served ? served.map((month) => month.oilCash) : revenueSeries.oil;

  const { firstMonth, length } = financialsSeries;
  let lastPostedIndex = financialsSeries.lastPostedIndex;
  if (served) {
    /* The last month still on the filed record — the point the wash starts
       after. `-1` when the whole band is modelled, which draws no seam. */
    lastPostedIndex = -1;
    served.forEach((month, index) => {
      if (!month.forecast) lastPostedIndex = index;
    });
  }

  const from = served ? 0 : Math.max(0, lastPostedIndex - MONTHS_BEHIND);
  const to = served
    ? served.length - 1
    : Math.min(length - 1, lastPostedIndex + MONTHS_AHEAD);

  /** The axis label for a point — the service's own, or the shared calendar. */
  const nameOf = (index: number) =>
    served ? (served[index]?.label ?? "") : shortMonthLabel(firstMonth + index);

  let peak = 0;
  for (let index = from; index <= to; index += 1) {
    const total = (gas[index] ?? 0) + (oil[index] ?? 0);
    if (total > peak) peak = total;
  }
  const max = axisMax(peak);

  /* Three gridlines, not five: the stack's own boundary is already a horizontal
     edge running across the plot, and five more would turn the chart into a
     grid with a shape somewhere inside it. */
  const ticks = [0, max / 2, max];

  const splitX = xAt(lastPostedIndex, from, to);

  return (
    <ReportPageCard
      number={3}
      id="revenue-trend"
      title="Revenue trend"
      lead="Your income by month, split by the product that earned it."
    >
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Your monthly income from ${nameOf(from)} to ${nameOf(to)}, split into gas and oil. Filed through ${nameOf(lastPostedIndex)}; modelled after that.`}
      >
        {/* The modelled half, washed before anything is drawn over it. */}
        <rect
          x={splitX}
          y={PLOT.top}
          width={PLOT.right - splitX}
          height={PLOT.bottom - PLOT.top}
          className="fill-mv-mint/45"
        />

        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yAt(value, max)}
              y2={yAt(value, max)}
              className="stroke-mv-line"
              strokeWidth={1}
            />
            <text
              x={PLOT.left - 10}
              y={yAt(value, max) + 4}
              textAnchor="end"
              className="fill-mv-axis text-[11px] font-semibold"
            >
              {formatTick(value, true)}
            </text>
          </g>
        ))}

        {/* Gas on the floor, oil stacked on top of it — gas first because it is
            the volume, and a reader following the gas price looks for it at the
            bottom where a baseline makes it readable. */}
        <path
          d={stackPath(gas, null, from, to, max)}
          className="fill-mv-green-deep/85"
        />
        <path
          d={stackPath(oil, gas, from, to, max)}
          className="fill-mv-oil/85"
        />

        <line
          x1={splitX}
          x2={splitX}
          y1={PLOT.top}
          y2={PLOT.bottom}
          className="stroke-mv-line-strong"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {labelIndices(from, to, 5).map((index) => (
          <text
            key={index}
            x={xAt(index, from, to)}
            y={AXIS_LABEL_Y}
            textAnchor="middle"
            className="fill-mv-axis text-[11px]"
          >
            {nameOf(index)}
          </text>
        ))}

        <Chip x={splitX - 46} y={CHIP_Y} tone="slate" text="POSTED" />
        <Chip x={splitX + 46} y={CHIP_Y} tone="mint" text="FORECAST" />
      </svg>

      <div className="mt-1 flex flex-wrap gap-4 text-[12px] font-semibold">
        <LegendSwatch className="bg-mv-green-deep/85" label="Gas" />
        <LegendSwatch className="bg-mv-oil/85" label="Oil" />
      </div>

      <ReportFootnote>
        Your own share, month by month, split by the product that earned it. The
        lighter part of the chart is the model; the solid part is what has been
        filed. The split matters because a statement arrives as one number and
        gives you no way to see which product moved.
      </ReportFootnote>
    </ReportPageCard>
  );
}

/**
 * One band of the stack: `values` drawn on top of `base`, or on the floor when
 * there is no base. Closed back along the base so the fill has no seam where
 * the two bands meet.
 */
function stackPath(
  values: number[],
  base: number[] | null,
  from: number,
  to: number,
  max: number,
): string {
  const top: string[] = [];
  const bottom: string[] = [];

  for (let index = from; index <= to; index += 1) {
    const floor = base ? base[index] : 0;
    const x = xAt(index, from, to).toFixed(1);
    top.push(`${x},${yAt(floor + values[index], max).toFixed(1)}`);
    bottom.unshift(`${x},${yAt(floor, max).toFixed(1)}`);
  }

  return `M${top.join("L")}L${bottom.join("L")}Z`;
}

function LegendSwatch({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`inline-block h-2.5 w-2.5 rounded-[3px] ${className}`}
      />
      {label}
    </span>
  );
}

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
