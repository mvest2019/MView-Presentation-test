"use client";

import Link from "next/link";

import { Lock } from "lucide-react";

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

  /* ---- no account ----
     BEFORE the empty check: a withheld series still carries its years and its
     operators, but every volume in it parsed to zero, so a chart drawn from it
     would be a flat line at the bottom of the plot presented as this operator's
     filed record. That is worse than drawing nothing. See `ProductionSeries.locked`. */
  if (series?.locked) {
    return <LockedChart />;
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


/**
 * What a signed-out reader sees in place of the chart.
 *
 * IT FILLS THE RESERVED HEIGHT. `DeferredSection` holds 520px for this section, so
 * the locked panel occupies the same band the plot would and nothing below it
 * moves. The page's own CTA band sits under this section and carries the detail;
 * this states the fact and the way out, and does not repeat the argument twice on
 * one screen.
 */
function LockedChart() {
  return (
    <div
      role="status"
      className="flex min-h-[420px] flex-col items-center justify-center gap-[14px] rounded-2xl border border-mv-line bg-white px-6 py-10 text-center shadow-mv"
    >
      <span
        aria-hidden="true"
        className="grid h-[38px] w-[38px] place-items-center rounded-full bg-mv-mint text-mv-green-deep"
      >
        <Lock className="h-4 w-4" strokeWidth={2.3} />
      </span>

      <div className="max-w-[440px]">
        <p className="m-0 text-[15px] font-bold leading-snug text-mv-ink">
          The year-by-year chart needs a free account
        </p>
        <p className="m-0 mt-2 text-[13px] leading-relaxed text-mv-muted">
          Filed annual oil, gas and BOE for every operator in this comparison,
          across the whole record. The operator cards, the ranks and the oil/gas
          mix above stay free to read.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-[10px]">
        <Link
          href="/register?from=compare-production"
          className="inline-flex items-center gap-2 rounded-xl bg-mv-green-deep px-[18px] py-[11px] text-[13.5px] font-semibold text-white !no-underline shadow-mv transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          Register for free
        </Link>
        <Link
          href="/login"
          className="text-[13px] font-semibold text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          Sign in
        </Link>
      </div>

      <p className="m-0 text-[11.5px] text-mv-muted">
        Free account &middot; no card required
      </p>
    </div>
  );
}
