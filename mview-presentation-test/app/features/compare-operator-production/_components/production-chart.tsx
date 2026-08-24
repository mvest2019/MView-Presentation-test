"use client";

import { useMemo } from "react";

import { cardTitleClass } from "@/app/_components/typography";
import { titleCase } from "@/lib/text-case";
import type {
  ProductionChartSeries,
  ProductionFilters,
} from "@/lib/operator-production-shape";

import { ProductionOverTime } from "./production-over-time";
import { useProductionSeries } from "./use-production-data";

/**
 * The Production over time card, and the only thing that calls
 * `/api/operators/production-series`.
 *
 * WHY THE FETCH LIVES HERE RATHER THAN IN THE PAGE. The page mounts this inside a
 * `DeferredSection`, so this component does not exist until the chart is approached —
 * which means the series endpoint is not called until then either. A visitor who
 * applies filters, reads the cards and the leader tiles and leaves never pays for it.
 * Hoisting the hook into the page would fire both endpoints together on Apply and
 * throw away that saving.
 *
 * IT TAKES THE APPLIED FILTERS, so it asks exactly the question the rest of the page
 * is answering. The hook caches on that filter set, so scrolling away and back does
 * not re-request, and the chart's own year brush scopes what is already in hand
 * rather than asking again.
 *
 * COLOURS COME FROM THE PAGE, not from this response. The series endpoint returns no
 * colour, and the cards above already assigned one per slot — matching them by
 * operator number is what lets a line and its card be read as the same operator.
 * An operator in the series that the cards do not know about still draws, in the
 * next slot colour, rather than being dropped.
 */
export function ProductionChart({
  filters,
  operators,
}: {
  filters: ProductionFilters;
  /** The cards' operators, for their colours and short labels. */
  operators: readonly {
    operatorNumber: string;
    color: string;
    short: string;
    name: string;
  }[];
}) {
  const { state, retry } = useProductionSeries(filters);

  const series = state.status === "ready" ? state.data : null;

  const chartSeries = useMemo<ProductionChartSeries[]>(() => {
    if (!series) return [];

    const styleFor = new Map(
      operators.map((operator) => [operator.operatorNumber, operator]),
    );

    return series.operators.map((operator, index) => {
      const style = styleFor.get(operator.operatorNumber);
      return {
        key: operator.operatorNumber || operator.filedName,
        name: operator.name,
        label: style?.short ?? operator.name,
        color: style?.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]!,
        oil: operator.points.map((point) => point.oil),
        gas: operator.points.map((point) => point.gas),
        boe: operator.points.map((point) => point.boe),
      };
    });
  }, [series, operators]);

  if (state.status === "loading") {
    return <Card busy>Production over time — loading…</Card>;
  }

  if (state.status === "error") {
    return (
      <Card>
        <span role="alert">
          The production series could not be loaded.{" "}
          <button
            type="button"
            onClick={retry}
            className="font-semibold text-mv-green-deep underline"
          >
            Try again
          </button>
          .
        </span>
      </Card>
    );
  }

  if (!series || series.years.length === 0 || chartSeries.length === 0) {
    return (
      <Card>
        No annual production is filed for these operators.
      </Card>
    );
  }

  return (
    <ProductionOverTime
      operators={chartSeries}
      years={series.years}
      scopeLabel={scopeLabelFor(filters)}
    />
  );
}

/**
 * How the strip above the plot names the acreage.
 *
 * COUNTY FIRST, because it is the filter that actually moves these figures — the
 * measured difference between filtering to two counties and to none was 1.09B barrels
 * against 1.77B. District and play type are named only when there is no county, where
 * they are the only thing narrowing the chart; listing all three would produce a
 * heading longer than the chart is wide.
 */
function scopeLabelFor(filters: ProductionFilters): string {
  if (filters.counties.length === 1) {
    return `${titleCase(filters.counties[0] ?? "")} County`;
  }
  if (filters.counties.length > 1) return `${filters.counties.length} counties`;
  if (filters.playTypes.length === 1)
    return titleCase(filters.playTypes[0] ?? "");
  if (filters.playTypes.length > 1) return `${filters.playTypes.length} plays`;
  if (filters.districtCodes.length > 0) {
    return filters.districtCodes.length === 1
      ? `District ${filters.districtCodes[0]}`
      : `${filters.districtCodes.length} districts`;
  }
  return "All counties";
}

/** Only reached when the page's own slot colours do not cover a series. */
const FALLBACK_COLORS = [
  "var(--color-mv-green-deep)",
  "var(--color-mv-amber)",
  "var(--color-mv-blue)",
  "var(--color-mv-plum)",
] as const;

/**
 * The card shell the three non-chart states share.
 *
 * Same border, radius and padding as the chart card itself, so a loading or empty
 * chart occupies the same box the finished one will and the page does not shift when
 * it arrives.
 */
function Card({
  children,
  busy = false,
}: {
  children: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <div
      aria-busy={busy || undefined}
      aria-live={busy ? "polite" : undefined}
      className="rounded-2xl border border-mv-line bg-white px-[22px] py-5 shadow-mv max-[560px]:px-4"
    >
      <h3 className={`${cardTitleClass} text-mv-ink`}>Production over time</h3>
      <p className="mt-[10px] flex min-h-[380px] items-center justify-center text-center text-sm text-mv-muted">
        {children}
      </p>
    </div>
  );
}
