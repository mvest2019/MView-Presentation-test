import { OperatorLogo } from "@/app/_components/operator-logo";
import {
  STATISTICS_TREND_YEARS,
  formatVolume,
  type StatisticsOperator,
} from "@/lib/operator-statistics";

/**
 * The five-year trend cards — one small area chart per operator, the design's
 * `.cs-trendviz`.
 *
 * A server component: the shape is fixed by the selection, nothing here responds
 * to a pointer, so none of it needs to ship. The numbers behind these lines are
 * also in the table directly below, which is what makes it safe for the chart
 * itself to be decorative (`aria-hidden`) rather than described twice.
 *
 * Each card scales to its own minimum and maximum, so a card shows that operator's
 * *shape* rather than its size relative to the others — comparing magnitudes is the
 * table's job. Stated in the caption below the block so the two are not confused.
 *
 * `preserveAspectRatio="none"` stretches the 200×52 viewBox to whatever width the
 * grid gives the card, which would thicken the stroke with it;
 * `vector-effect="non-scaling-stroke"` keeps the line at 2px throughout.
 */

const VIEW = { width: 200, height: 52 } as const;

/**
 * One accent for every sparkline, rather than one per operator.
 *
 * These are small multiples — a card per operator, each with its own axis and its own
 * logo and name in the header — so no two lines ever share a chart and a colour has
 * nothing to disambiguate. Four hues here were decoration, and four decorated charts
 * side by side is what made the page read as colourful.
 */
const TREND_COLOR = "var(--color-mv-green-deep)";

export function TrendCards({ operators }: { operators: StatisticsOperator[] }) {
  return (
    <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[14px]">
      {operators.map((operator) => (
        <TrendCard key={operator.operatorNumber} operator={operator} />
      ))}
    </div>
  );
}

function TrendCard({ operator }: { operator: StatisticsOperator }) {
  const gradientId = `trend-${operator.operatorNumber}`;
  const first = STATISTICS_TREND_YEARS[0];

  if (!operator.trend) {
    return (
      <div className="rounded-xl border border-mv-line bg-white px-4 py-[14px] shadow-[0_1px_2px_rgba(24,24,27,.05)]">
        <p className="flex items-center gap-2 text-[13px] font-bold text-mv-ink">
          <OperatorLogo
            url={operator.logoUrl}
            monogram={operator.monogram}
            size={22}
            radius={10}
          />
          {operator.short}
        </p>
        <p className="mb-1 mt-[14px] text-[12px] text-mv-muted">
          No annual series in this extract.
        </p>
      </div>
    );
  }

  const values = operator.trend;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const last = values.length - 1 || 1;

  const points = values.map((value, index) => {
    const x = (index / last) * VIEW.width;
    const y = VIEW.height - 2 - ((value - min) / range) * (VIEW.height - 6);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  const line = points
    .map((point, index) => `${index ? "L" : "M"}${point}`)
    .join(" ");
  const area = `${line} L${VIEW.width} ${VIEW.height} L0 ${VIEW.height} Z`;

  return (
    <div className="rounded-xl border border-mv-line bg-white px-4 py-[14px] shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      {/* No colour swatch here: the chart directly below is drawn in this
          operator's colour and the logo beside the name identifies it, so a third
          mark for the same thing only added noise. */}
      <p className="flex items-center gap-2 text-[13px] font-bold text-mv-ink">
        <OperatorLogo
          url={operator.logoUrl}
          monogram={operator.monogram}
          size={22}
          radius={10}
        />
        <span className="truncate">{operator.short}</span>
      </p>

      <svg
        aria-hidden="true"
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        preserveAspectRatio="none"
        className="my-3 mb-[6px] block h-14 w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TREND_COLOR} stopOpacity=".18" />
            <stop offset="1" stopColor={TREND_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={TREND_COLOR}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <p className="flex justify-between text-[12px] font-semibold text-mv-muted">
        <span>{first}</span>
        <span className="text-mv-ink">
          {operator.boeCurrent === null
            ? "—"
            : formatVolume(operator.boeCurrent)}
          {operator.yearOverYear !== null
            ? ` · ${operator.yearOverYear >= 0 ? "+" : ""}${operator.yearOverYear.toFixed(0)}%`
            : ""}
        </span>
      </p>
    </div>
  );
}
