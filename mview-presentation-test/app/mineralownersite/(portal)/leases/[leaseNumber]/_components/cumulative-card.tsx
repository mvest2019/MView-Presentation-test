import { Card } from "../../../../_components/ui/card";
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
import { formatCount } from "../../_lib/lease-format";
import { shortMonthLabel } from "../../_lib/months";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * "FILED TO DATE, AND WHAT IS STILL TO COME" — the running total, not the rate.
 *
 * ── A CUMULATIVE CURVE ANSWERS A QUESTION A MONTHLY ONE CANNOT ──
 *
 * The chart above this shows a lease declining, which every lease does and which
 * tells a reader nothing about how much is left. This one shows the total
 * flattening out: where the curve stops climbing is where the lease stops
 * paying, and the height of the pale band is the only figure on the page that
 * speaks to how long that is.
 *
 * ── THE PALE BAND IS THE MODEL AND IT IS DRAWN ON TOP, NOT BESIDE ──
 *
 * Filed and projected are the same quantity continuing, so they are one shape
 * in two tones rather than two shapes. The dashed rule is where the filings
 * stop; everything above and right of it is the model's, and the chips under
 * the axis name both halves.
 */
export function CumulativeCard({ report }: { report: LeaseReport }) {
  const { firstMonth, length } = financialsSeries;
  const series = report.cumulativeGas;

  /* From this lease's first filing, not from the record's — a decade of flat
     zero before the lease existed is not context, it is empty chart. */
  const from = series.findIndex((value) => value > 0);
  const to = length - 1;
  const max = axisMax(series[to]);
  const splitX = xAt(report.cumulativeFiledIndex, from, to);

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <h3 className="text-[15px] font-bold">
        Filed to date, and what is still to come
      </h3>
      <p className="mt-0.5 text-[12px] text-mv-muted">
        your share of the gas, as a running total
      </p>

      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Running total of your gas from this lease: ${formatCount(Math.round(report.gasProduced))} MCF filed through ${report.lastPosting}, and a further ${formatCount(Math.round(report.gasReserves))} MCF projected.`}
      >
        {[0, max / 2, max].map((value) => (
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
              className="fill-mv-axis text-[13px] font-semibold"
            >
              {formatTick(value, false)}
            </text>
          </g>
        ))}

        {/* The whole curve in the pale tone, then the filed part painted over
            it — one shape, two tones, and no seam at the join. */}
        <path
          d={areaPath(series, from, to, max)}
          className="fill-mv-green-deep/25"
        />
        <path
          d={areaPath(series, from, report.cumulativeFiledIndex, max)}
          className="fill-mv-green-deep/85"
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
            className="fill-mv-axis text-[14px]"
          >
            {shortMonthLabel(firstMonth + index)}
          </text>
        ))}

        <Chip x={splitX - 44} y={CHIP_Y} tone="slate" text="FILED" />
        <Chip x={splitX + 52} y={CHIP_Y} tone="mint" text="PROJECTED" />
      </svg>

      <p className="mt-3 text-[12.5px] leading-[1.6] text-mv-slate">
        <strong>{formatCount(Math.round(report.gasProduced))} MCF</strong> of gas
        has reached you from this lease so far. The model projects a further{" "}
        <strong>{formatCount(Math.round(report.gasReserves))} MCF</strong> before
        the curve runs out — the height of the pale band, and the only figure
        here that speaks to how long this lease keeps paying.
      </p>
    </Card>
  );
}

/** The area under a running total, closed along the floor. */
function areaPath(
  values: number[],
  from: number,
  to: number,
  max: number,
): string {
  const points: string[] = [];
  for (let index = from; index <= to; index += 1) {
    points.push(
      `${xAt(index, from, values.length - 1).toFixed(1)},${yAt(values[index], max).toFixed(1)}`,
    );
  }
  const left = xAt(from, from, values.length - 1).toFixed(1);
  const right = xAt(to, from, values.length - 1).toFixed(1);
  return `M${left},${PLOT.bottom}L${points.join("L")}L${right},${PLOT.bottom}Z`;
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
