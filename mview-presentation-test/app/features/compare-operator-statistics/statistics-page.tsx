"use client";

import { BarChart3, Check, ChevronRight, FileDown, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button, buttonClass } from "@/app/_components/button";
import { OperatorLogo } from "@/app/_components/operator-logo";
import {
  cardTitleClass,
  sectionTitleClass,
} from "@/app/_components/typography";
import {
  COMPARE_SLOT_COUNT,
  MIN_OPERATORS,
  NO_OPERATOR,
  buildCompanyRows,
  buildFullMatrixRows,
  buildProductionRows,
  buildStatisticsCsvRows,
  buildTrendRows,
  emptySelection,
  exampleSelection,
  findStatisticsLeaders,
  formatCount,
  formatVolume,
  monogramOf,
  toCsv,
  toStatisticsOperatorFromApi,
  type StatisticsLeaders,
  type StatisticsOperator,
} from "@/lib/operator-statistics";

import { ComparisonMatrix } from "./_components/comparison-matrix";
import { OperatorSlotPicker } from "@/app/_components/operator-slot-picker";
import { TrendCards } from "./_components/trend-cards";
import { useOperatorComparison } from "./_components/use-operator-comparison";

/**
 * Compare Operator Statistics — everything below the page header.
 *
 * WHY ONE FILE. Same call as its sibling tools: each band here (the picker
 * workspace, the empty state, the results toolbar, identity cards, KPI strip,
 * category leaders, the three comparison blocks, the CTA) is markup used by this
 * page and nothing else, and all of it reads one piece of state — which operators
 * are selected.
 *
 * What is deliberately separate:
 *   · `lib/operator-statistics.ts` — every calculation and every table row.
 *   · `app/_components/operator-slot-picker.tsx` — the combobox, which owns three
 *     interaction states per slot and re-renders on every keystroke.
 *   · `_components/comparison-matrix.tsx` and `trend-cards.tsx` — server
 *     components, so four tables and four charts cost no client JavaScript.
 *
 * NO ARTIFICIAL DELAY. The prototype shows a shimmer for 420ms before revealing
 * results, simulating a fetch. The data is already here, so results appear on the
 * keystroke: a deliberate wait is latency the user can feel, and it would show up
 * as interaction delay in the field.
 *
 * FONT SIZES. The design labels things at 9.5–11.5px. Everything that is real text
 * is raised to a 12px floor, keeping the hierarchy through weight, colour and
 * tracking. Below 12px Lighthouse marks the page as not using legible font sizes,
 * and on a phone those labels genuinely are not readable.
 */

export function StatisticsPage() {
  /** Four slots, each holding an operator's display name or "". */
  const [selection, setSelection] = useState<string[]>(() => emptySelection());

  /* The names actually chosen, in slot order. Memoised because it is the hook's
     input: a new array every render would re-key the comparison on every keystroke
     in a picker. */
  const chosen = useMemo(() => selection.filter(Boolean), [selection]);
  const { state, retry } = useOperatorComparison(chosen);

  /* Name → figures, for placing each result back into the slot that asked for it.
     The endpoint does not answer in the order it was asked — requesting Pioneer,
     EOG, XTO, Devon returns EOG, Devon, Pioneer, XTO — so zipping by index would
     quietly show one operator's numbers under another's name. */
  /* The trend years the response was built against. Empty until a comparison has
     arrived, which is also when nothing reads them. */
  const trendYears = state.status === "ready" ? state.years : EMPTY_YEARS;

  const byName = useMemo(() => {
    if (state.status !== "ready") return null;
    return new Map(
      state.operators.map((operator) => [operator.name, operator]),
    );
  }, [state]);

  /* Only the operators whose figures have actually arrived take part in the
     comparison. A slot that is still loading, missing or failed is not a column —
     it reports itself in the picker instead, so one bad slot cannot empty the page.

     Memoised because every block below reads this and the arithmetic behind
     `toStatisticsOperatorFromApi` runs per operator; recomputing it on unrelated
     renders (a keystroke in a picker) would redo all of it. */
  const operators = useMemo(
    () =>
      selection.flatMap((name, slot) => {
        const data = name ? byName?.get(name) : undefined;
        return data ? [toStatisticsOperatorFromApi(data, slot)] : [];
      }),
    [selection, byName],
  );

  const leaders = useMemo(() => findStatisticsLeaders(operators), [operators]);

  const pending = state.status === "loading";

  /* Names the comparison came back without. The endpoint's own `operators_not_found`
     cannot be used for this — it echoes back every name that was asked for, found or
     not — so a miss is what is absent from the results. */
  const missing =
    byName === null ? [] : chosen.filter((name) => !byName.has(name));

  /** Lets "Edit selection" put the cursor in the first empty slot. */
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const workspace = useRef<HTMLDivElement | null>(null);

  const chosenCount = operators.length;
  const hasResults = chosenCount >= MIN_OPERATORS && leaders !== null;

  /* The selection is the only input: `useOperatorComparison` requests the whole
     comparison whenever it changes and two or more are chosen, and answers a set it
     has already seen from cache. */
  const setSlot = useCallback((slot: number, name: string) => {
    setSelection((current) =>
      current.map((value, index) => (index === slot ? name : value)),
    );
  }, []);

  const takenNames = useMemo(
    () => new Set(selection.filter(Boolean)),
    [selection],
  );

  /** "Try an example" seeds four names; the comparison follows from the selection. */
  const chooseExample = useCallback(() => {
    setSelection(exampleSelection());
  }, []);

  function editSelection() {
    workspace.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstEmpty = selection.findIndex((slug) => !slug);
    inputs.current[firstEmpty < 0 ? 0 : firstEmpty]?.focus();
  }

  function exportCsv() {
    const csv = toCsv(buildStatisticsCsvRows(operators, trendYears));
    // A client-side blob: every figure is already in the browser, so a round trip
    // would only add latency and an endpoint to maintain.
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "operator-statistics-comparison.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1180px] px-[22px] pb-16 max-[767px]:px-4 max-[767px]:pb-11">
      {/* ---- picker workspace ---- */}
      <div
        ref={workspace}
        className="mt-5 rounded-2xl border border-mv-line bg-white p-[22px] shadow-mv max-[560px]:p-4"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={cardTitleClass}>Select operators to compare</h2>
            <p className="mt-1 text-[13px] text-mv-muted">
              Search or pick up to {COMPARE_SLOT_COUNT} — the comparison updates
              the moment you choose.
            </p>
          </div>

          <p className="flex items-center gap-2 text-[13px] font-medium text-mv-muted">
            <span
              aria-hidden="true"
              className={`grid h-[22px] w-[22px] place-items-center rounded-[7px] border ${
                chosenCount > 0
                  ? "border-mv-mint-line bg-mv-tint text-mv-green-deep"
                  : "border-mv-line bg-mv-bg text-mv-muted"
              }`}
            >
              {chosenCount > 0 ? (
                <Check className="h-[13px] w-[13px]" strokeWidth={3} />
              ) : (
                <Plus className="h-[13px] w-[13px]" strokeWidth={3} />
              )}
            </span>
            <span aria-live="polite">
              <b className="font-bold text-mv-ink">{chosenCount}</b> of{" "}
              {COMPARE_SLOT_COUNT} selected
            </span>
            {chosenCount > 0 ? (
              <Button
                variant="link"
                onClick={() => setSelection(emptySelection())}
                className="ml-1 underline"
              >
                Clear all
              </Button>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-[14px] max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          {Array.from({ length: COMPARE_SLOT_COUNT }, (_, slot) => (
            <OperatorSlotPicker
              key={slot}
              slot={slot}
              value={selection[slot] ?? NO_OPERATOR}
              rank={byName?.get(selection[slot] ?? "")?.rank ?? null}
              monogram={selection[slot] ? monogramOf(selection[slot]) : null}
              logoUrl={byName?.get(selection[slot] ?? "")?.logoUrl ?? null}
              takenNames={takenNames}
              onSelect={(name) => setSlot(slot, name)}
              onClear={() => setSlot(slot, NO_OPERATOR)}
              inputRef={(element) => {
                inputs.current[slot] = element;
              }}
            />
          ))}
        </div>

        {/* What the comparison could not answer for, said once rather than left as
            a silently absent column. The row always occupies its height, so a
            message arriving does not push the comparison down the page. */}
        <div className="mt-3 min-h-[20px] text-[12.5px]" aria-live="polite">
          {state.status === "error" ? (
            <p className="flex flex-wrap items-center gap-2 text-mv-ink-soft">
              The comparison could not be loaded.
              <button
                type="button"
                onClick={retry}
                className="cursor-pointer font-semibold text-mv-green-deep underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                Try again
              </button>
            </p>
          ) : (
            missing.map((name) => (
              <p key={name} className="text-mv-ink-soft">
                <b className="font-semibold">{name}</b> could not be found in
                the operator directory.
              </p>
            ))
          )}
        </div>
      </div>

      {hasResults ? (
        <Results
          operators={operators}
          leaders={leaders}
          years={trendYears}
          onEdit={editSelection}
          onExport={exportCsv}
        />
      ) : pending ? (
        /* Something is on its way but there is not yet enough to compare. The
           prompt would be wrong here and swapping it in and out would flicker, so
           the panel holds the same footprint the empty state has and says what is
           happening. */
        <section className="pt-[22px]" aria-busy="true">
          <div className="grid min-h-[220px] place-items-center rounded-2xl border border-mv-line bg-white p-8 text-center shadow-mv">
            <p role="status" className="text-[13.5px] text-mv-muted">
              <span
                aria-hidden="true"
                className="mx-auto mb-3 block h-3 w-[220px] animate-pulse rounded bg-mv-line-soft"
              />
              Loading the figures for the operators you picked…
            </p>
          </div>
        </section>
      ) : (
        <EmptyState onExample={chooseExample} />
      )}

      {/* ---- CTA ---- */}
      <section className="pt-[22px]">
        <div className="rounded-2xl bg-mv-forest px-[34px] py-[34px] text-center shadow-mv max-[560px]:px-5">
          <h2 className="font-sans text-[23px] font-bold leading-[1.2] tracking-[-.02em] text-white">
            Compare the operators on your leases — free.
          </h2>
          <p className="mx-auto mb-5 mt-2 max-w-[520px] text-sm text-mv-on-deep-soft">
            Run any two-to-four Texas operators, save comparisons, and get
            alerts when one changes.
          </p>
          <Link
            href="/signup?from=compare-statistics"
            className={buttonClass({
              variant: "primary",
              size: "lg",
              className: "text-[15px]",
            })}
          >
            Create a free account →
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ==========================================================================
   Empty state
   ========================================================================== */

function EmptyState({ onExample }: { onExample: () => void }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-mv-line bg-white px-[22px] py-[50px] text-center">
      <span
        aria-hidden="true"
        className="mb-[14px] inline-grid h-[54px] w-[54px] place-items-center rounded-[14px] bg-mv-tint text-mv-green-deep"
      >
        <BarChart3 className="h-[26px] w-[26px]" strokeWidth={2} />
      </span>
      <h2 className="mb-[6px] font-sans text-[18px] font-bold leading-[1.3] text-mv-ink">
        Nothing to compare yet
      </h2>
      <p className="mx-auto mb-4 max-w-[440px] text-[13.5px] text-mv-muted">
        Choose at least {MIN_OPERATORS} operators above to see company
        information, production metrics, and the five-year BOE trend side by
        side.
      </p>
      <Button variant="primary" onClick={onExample}>
        Try an example →
      </Button>
    </div>
  );
}

/** Stable, so a render before the comparison lands does not churn dependents. */
const EMPTY_YEARS: readonly number[] = [];

/* ==========================================================================
   Results
   ========================================================================== */

function Results({
  operators,
  leaders,
  years,
  onEdit,
  onExport,
}: {
  operators: StatisticsOperator[];
  leaders: StatisticsLeaders;
  /** The trend years from the API — see `useOperatorComparison`. */
  years: readonly number[];
  onEdit: () => void;
  onExport: () => void;
}) {
  return (
    <>
      {/* ---- toolbar ---- */}
      <section className="py-[22px]">
        <div className="flex flex-wrap items-center gap-[14px] rounded-[14px] border border-mv-line bg-white px-[18px] py-[14px] shadow-[0_1px_2px_rgba(24,24,27,.05)]">
          <p className="flex min-w-0 flex-wrap items-center gap-[14px]">
            {operators.map((operator) => (
              <span
                key={operator.operatorNumber}
                className="inline-flex items-center gap-[7px] text-[13px] font-semibold text-mv-ink"
              >
                {operator.short}
              </span>
            ))}
          </p>

          <span className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit selection
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <FileDown
                aria-hidden="true"
                className="h-[15px] w-[15px]"
                strokeWidth={1.9}
              />
              Export CSV
            </Button>
          </span>
        </div>
      </section>

      {/* ---- identity cards ---- */}
      <section className="pb-[22px]">
        <BlockHead
          title="Operators in this comparison"
          sub="RRC number and most-active counties — consistent with the operator directory."
        />
        <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
          {operators.map((operator) => (
            <IdentityCard key={operator.operatorNumber} operator={operator} />
          ))}
        </div>
      </section>

      {/* ---- KPI strip ---- */}
      <section className="pb-[22px]">
        <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
          <Kpi
            label="Combined BOE"
            value={formatVolume(leaders.combinedBoe)}
            sub={`across ${operators.length} operators`}
          />
          <Kpi
            label="Top producer"
            value={leaders.topProducer.short}
            sub={`${formatVolume(leaders.topProducer.boeTotal)} BOE`}
            compact
          />
          <Kpi
            label="Combined leases"
            value={formatCount(leaders.combinedLeases)}
            sub={`${formatCount(leaders.combinedCounties)} producing counties`}
          />
          <Kpi
            label="Widest footprint"
            value={String(leaders.widestFootprint.counties)}
            unit="counties"
            sub={leaders.widestFootprint.short}
          />
        </div>
      </section>

      {/* ---- category leaders ---- */}
      <section className="pb-[22px]">
        <BlockHead
          title="Category leaders"
          sub="The front-runner on each headline metric across your selection."
        />
        <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
          <LeaderCard
            label="Top producer"
            operator={leaders.topProducer}
            sub={`${formatVolume(leaders.topProducer.boeTotal)} BOE`}
          />
          <LeaderCard
            label="Most leases"
            operator={leaders.mostLeases}
            sub={`${formatCount(leaders.mostLeases.leases)} leases on record`}
          />
          <LeaderCard
            label="Widest footprint"
            operator={leaders.widestFootprint}
            sub={`${leaders.widestFootprint.counties} producing counties`}
          />
          <LeaderCard
            label="Most oil-weighted"
            operator={leaders.mostOilWeighted}
            sub={`${leaders.mostOilWeighted.oilPct}% of BOE from oil`}
          />
        </div>
      </section>

      {/* ---- company information ---- */}
      <section className="pb-[22px]">
        <BlockHead
          title="Company information"
          sub="Registration and footprint from the public record."
        />
        <ComparisonMatrix
          operators={operators}
          rows={buildCompanyRows(operators)}
          caption="Company information for the selected operators"
        />
      </section>

      {/* ---- production metrics ---- */}
      <section className="pb-[22px]">
        <BlockHead
          title="Production metrics"
          sub="Reported volumes — oil (bbl), gas (Mcf), BOE at 15:1."
        />
        <p className="mb-3 flex flex-wrap items-center gap-3 text-[12.5px] text-mv-muted">
          <span>
            <b className="font-semibold text-mv-ink">
              {leaders.topProducer.short}
            </b>{" "}
            leads at {formatVolume(leaders.topProducer.boeTotal)} BOE
          </span>
          <Separator />
          <span>
            Combined{" "}
            <b className="font-semibold text-mv-ink">
              {formatVolume(leaders.combinedBoe)}
            </b>
          </span>
          <Separator />
          <span>
            Average{" "}
            <b className="font-semibold text-mv-ink">
              {formatVolume(leaders.averageBoe)}
            </b>
          </span>
        </p>
        <ComparisonMatrix
          operators={operators}
          rows={buildProductionRows(operators, years)}
          caption="Reported production volumes for the selected operators"
        />
      </section>

      {/* ---- five-year trend ---- */}
      <section className="pb-[22px]">
        <BlockHead
          title="Historical production trends"
          sub={`Annual BOE, ${years[0]}–${years.at(-1)} · from filed RRC records.`}
        />
        <TrendCards operators={operators} years={years} />
        <p className="mb-3 text-[12.5px] text-mv-muted">
          Each card is scaled to its own operator, so the lines show shape
          rather than relative size. Best value each year is marked{" "}
          <span aria-hidden="true">▲</span> in the table.
        </p>
        <ComparisonMatrix
          operators={operators}
          rows={buildTrendRows(operators, years)}
          caption={`Annual BOE by year, ${years[0]} to ${years.at(-1)}`}
        />
        <p className="mt-[10px] text-[12px] text-mv-muted">
          {years.at(-1)} reflects production to date; earlier years are
          full-year totals. Operators without a filed annual series show —.
        </p>
      </section>

      {/* ---- full matrix ---- */}
      <section className="pb-[22px]">
        <details className="overflow-hidden rounded-[14px] border border-mv-line bg-white shadow-[0_1px_2px_rgba(24,24,27,.05)] [&[open]_.chev]:rotate-90">
          <summary className="flex cursor-pointer list-none items-center gap-[10px] px-[18px] py-4 text-[14.5px] font-bold text-mv-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="chev h-[15px] w-[15px] shrink-0 text-mv-green-deep transition-transform duration-200"
              strokeWidth={2.2}
            />
            View the complete data matrix — every metric, all operators
          </summary>
          <div className="px-[18px] pb-[18px]">
            <p className="mb-3 text-[12.5px] text-mv-muted">
              Best value in each row is marked <span aria-hidden="true">▲</span>
              .
            </p>
            <ComparisonMatrix
              operators={operators}
              rows={buildFullMatrixRows(operators, years)}
              caption="Every compared metric for the selected operators"
            />
          </div>
        </details>
      </section>
    </>
  );
}

/* ==========================================================================
   Shared bits
   ========================================================================== */

/** The design's `.cs-block-h` — a rule-marked h2 with a sub beneath. */
function BlockHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-[14px]">
      {/* The eyebrow above this heading was removed on request; the h2's former
          `mt-[7px]` went with it, since it existed only to clear that line. */}
      <h2
        className={`${sectionTitleClass} flex items-center gap-[11px] text-mv-ink before:h-[18px] before:w-1 before:rounded-full before:bg-mv-green-deep before:content-['']`}
      >
        {title}
      </h2>
      {sub ? <p className="mt-[5px] text-[13px] text-mv-muted">{sub}</p> : null}
    </div>
  );
}

/** The thin rule between figures in the production caption. */
function Separator() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3 w-px shrink-0 bg-mv-line"
    />
  );
}

function IdentityCard({ operator }: { operator: StatisticsOperator }) {
  return (
    <article className="relative overflow-hidden rounded-[14px] border border-mv-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <div className="flex min-w-0 items-center gap-[11px]">
        <OperatorLogo
          url={operator.logoUrl}
          monogram={operator.monogram}
          size={42}
          radius={11}
          monogramClassName="!rounded-[11px]"
        />
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-bold leading-[1.25] text-mv-ink">
            {/* A link only where there is a slug to link to. `/operators/null`
                would 404, and so would a slug guessed from the name — the detail
                route resolves against its own set, not against every operator. */}
            {operator.slug ? (
              <Link
                href={`/operators/${operator.slug}`}
                className="text-mv-ink no-underline hover:text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                {operator.name}
              </Link>
            ) : (
              operator.name
            )}
          </h3>
          <p className="text-[12px] font-medium tabular-nums text-mv-muted">
            ({operator.operatorNumber})
          </p>
        </div>
        {operator.rank === null ? null : (
          <span className="ml-auto shrink-0 rounded-full border border-mv-line bg-mv-bg px-2 py-[2px] text-[12px] font-bold text-mv-muted">
            #{operator.rank}
          </span>
        )}
      </div>

      {operator.topCounties.length > 0 ? (
        <p className="mt-3 text-[12px] leading-[1.45] text-mv-muted">
          <span className="block font-extrabold uppercase tracking-[.05em] text-mv-green-deep">
            Most active
          </span>
          {operator.topCounties.join(", ")}
        </p>
      ) : null}

      <p className="mt-3 flex items-baseline justify-between gap-2 border-t border-mv-line-soft pt-3">
        <span className="text-[19px] font-bold tracking-[-.02em] tabular-nums text-mv-ink">
          {formatVolume(operator.boeTotal)}
        </span>
        <span className="text-[12px] text-mv-muted">
          cumulative BOE · {operator.counties} counties
        </span>
      </p>
    </article>
  );
}

function Kpi({
  label,
  value,
  unit,
  sub,
  compact = false,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  /** For a name rather than a figure — 19px, so a long name still fits. */
  compact?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-mv-line bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <p className="text-[12px] font-bold uppercase tracking-[.05em] text-mv-muted">
        {label}
      </p>
      <p
        className={`mb-[3px] mt-[9px] font-bold tracking-[-.02em] text-mv-ink ${
          compact ? "text-[19px]" : "text-[25px] tabular-nums"
        }`}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-[12px] font-semibold text-mv-muted">
            {unit}
          </span>
        ) : null}
      </p>
      <p className="text-[12px] text-mv-muted">{sub}</p>
    </div>
  );
}

function LeaderCard({
  label,
  operator,
  sub,
}: {
  label: string;
  operator: StatisticsOperator;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-mv-line bg-white px-4 py-[15px] shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <p className="text-[12px] font-bold uppercase tracking-[.05em] text-mv-muted">
        {label}
      </p>
      <p className="mb-1 mt-[10px] flex items-center gap-2 text-sm font-bold text-mv-ink">
        <OperatorLogo
          url={operator.logoUrl}
          monogram={operator.monogram}
          size={22}
          radius={10}
        />
        <span className="truncate">{operator.short}</span>
      </p>
      <p className="text-[12px] text-mv-muted">{sub}</p>
    </div>
  );
}
