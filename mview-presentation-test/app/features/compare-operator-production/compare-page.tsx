"use client";

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  Gauge,
  Lock,
  MapPin,
  Minus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { buttonClass } from "@/app/_components/button";
import { OperatorMonogram } from "@/app/_components/operator-monogram";
import { eyebrowClass, sectionTitleClass } from "@/app/_components/typography";
import {
  COMPARE_SLOT_COUNT,
  COMPARE_STAT_ROWS,
  COMPARE_YEARS,
  SLOT_COLORS,
  buildComparison,
  buildMomentumRows,
  compoundGrowth,
  defaultSelection,
  findLeaders,
  formatCount,
  formatMillions,
  formatPercentChange,
  listCompareCounties,
  listCompareOptions,
  mboePerLease,
  sparklinePoints,
  type CompareLeaders,
  type CompareOperator,
  type MomentumRow,
} from "@/lib/operator-compare";

import { ProductionOverTime } from "./_components/production-over-time";

/**
 * Compare Operator Production — everything below the page header.
 *
 * WHY ONE FILE. Same call as the operator listing: each band here (pickers,
 * identity cards, the generated read, the leaderboard, the mix bars, the two
 * tables, the CTA) is markup used by this page and nothing else, and all of it
 * reads one piece of state — which operators are selected. Splitting the listing
 * into eight one-caller modules made it harder to follow, so these are
 * module-local components, read top to bottom in render order.
 *
 * What is deliberately separate:
 *   · `lib/operator-compare.ts` — every calculation, with no React in it.
 *   · `_components/production-over-time.tsx` — the chart card, which owns four
 *     interaction states of its own and re-renders on every brush move.
 *
 * NO OPERATOR LOGOS — see `app/_components/operator-monogram.tsx` for why the
 * prototype's 411 KB of inlined base64 logos are not shipped.
 *
 * FONT SIZES. The design labels several things at 8–11.5px. Anything that is real
 * text is raised to a 12px floor here, keeping the hierarchy through weight,
 * colour and tracking instead. Below 12px Lighthouse flags the page as not using
 * legible font sizes, and on a phone those labels genuinely are not readable.
 */

/**
 * The scoping row is inert until the tool reads the live directory, which the
 * design states in its own lock note. The controls are `disabled` rather than
 * merely tinted, so a keyboard or screen-reader user is told what the tint tells
 * a sighted one. The play and district lists are the design's own.
 */
const LOCKED_PLAYS = [
  "Permian Basin",
  "Midland Basin",
  "Eagle Ford",
  "Barnett Shale",
] as const;

const LOCKED_DISTRICTS = [
  "District 08 (Midland)",
  "District 7C (San Angelo)",
  "District 01 (San Antonio)",
] as const;

export function ComparePage() {
  // Options and counties come from the module rather than a prop: both are static
  // for the life of the page and identical for every visitor, so threading them
  // through the server component would only duplicate them in the RSC payload.
  const options = useMemo(() => listCompareOptions(), []);
  const counties = useMemo(() => listCompareCounties(), []);

  const [selection, setSelection] = useState<string[]>(() => defaultSelection());

  const operators = useMemo(() => buildComparison(selection), [selection]);
  const leaders = useMemo(() => findLeaders(operators), [operators]);

  function selectSlot(slot: number, slug: string) {
    setSelection((current) =>
      current.map((value, index) => (index === slot ? slug : value)),
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-[22px] pb-16 max-[767px]:px-4 max-[767px]:pb-11">
      {/* ---- pickers ---- */}
      <div className="mt-5 rounded-2xl border border-mv-line bg-white px-5 py-[18px] shadow-mv max-[560px]:px-4">
        <div className="grid grid-cols-4 gap-3 max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
          {Array.from({ length: COMPARE_SLOT_COUNT }, (_, slot) => (
            <SelectField
              key={slot}
              label={
                <>
                  <span
                    aria-hidden="true"
                    className="h-[10px] w-[10px] shrink-0 rounded-full"
                    style={{ background: SLOT_COLORS[slot] }}
                  />
                  Operator {slot + 1}
                  {slot > 1 ? " · optional" : ""}
                </>
              }
              value={selection[slot] ?? ""}
              onChange={(value) => selectSlot(slot, value)}
            >
              {/* The first two slots have no empty option: a comparison of one
                  operator is not a comparison. */}
              {slot > 1 ? <option value="">— none —</option> : null}
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          ))}
        </div>

        <div className="mt-[14px] grid grid-cols-[repeat(3,1fr)_auto] items-end gap-3 border-t border-mv-line-soft pt-[14px] max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
          <SelectField label="County" disabled describedBy={SCOPE_NOTE_ID}>
            <option value="">All counties</option>
            {counties.map((county) => (
              <option key={county}>{county}</option>
            ))}
          </SelectField>

          <SelectField label="Play type" disabled describedBy={SCOPE_NOTE_ID}>
            <option value="">All plays</option>
            {LOCKED_PLAYS.map((play) => (
              <option key={play}>{play}</option>
            ))}
          </SelectField>

          <SelectField label="District" disabled describedBy={SCOPE_NOTE_ID}>
            <option value="">All districts</option>
            {LOCKED_DISTRICTS.map((district) => (
              <option key={district}>{district}</option>
            ))}
          </SelectField>

          <button
            type="button"
            disabled
            aria-describedby={SCOPE_NOTE_ID}
            className={buttonClass({
              variant: "primary",
              className: "h-11 w-full",
            })}
          >
            Apply filters
          </button>
        </div>

        <p
          id={SCOPE_NOTE_ID}
          className="mt-[10px] flex items-center gap-[6px] text-[12px] text-mv-muted"
        >
          <Lock aria-hidden="true" className="h-[13px] w-[13px] shrink-0" strokeWidth={2} />
          County, play and district scoping activates with the live directory — the
          operator pickers above drive this free preview.
        </p>
      </div>

      {operators.length === 0 || !leaders ? (
        <p className="mt-8 rounded-[14px] border border-mv-line bg-mv-line-soft px-[18px] py-4 text-sm text-mv-ink-soft">
          Choose at least one operator to compare.
        </p>
      ) : (
        <>
          {/* ---- identity cards ---- */}
          <section className="py-[26px]">
            <SectionHead
              eyebrow="Comparing"
              title="Operators in this comparison"
              sub="RRC number and most-active counties for each — consistent with the operator directory."
            />
            <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
              {operators.map((operator) => (
                <IdentityCard key={operator.slug} operator={operator} />
              ))}
            </div>
          </section>

          {/* ---- generated read ---- */}
          <section className="pb-[26px]">
            <GeneratedRead leaders={leaders} />
          </section>

          {/* ---- leaderboard ---- */}
          <section className="pb-[26px]">
            <SectionHead
              eyebrow="At a glance"
              title="Who leads on what"
              sub="The biggest operator isn't always the best one to have on your lease."
            />
            <Leaderboard leaders={leaders} />
          </section>

          {/* ---- production over time ---- */}
          <section className="pb-[26px]">
            <ProductionOverTime operators={operators} />
          </section>

          {/* ---- oil vs gas mix ---- */}
          <section className="pb-[26px]">
            <SectionHead
              eyebrow="Commodity exposure"
              title="Oil vs gas mix"
              sub="Which commodity each operator's barrels come from — and how balanced the split is."
            />
            <MixCard operators={operators} />
          </section>

          {/* ---- momentum ---- */}
          <section className="pb-[26px]">
            <SectionHead
              eyebrow="Direction"
              title="Momentum & growth"
              sub={`Latest year, year-over-year, ${COMPARE_YEARS.length}-year trend and volatility — from the filed record.`}
            />
            <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
              <MomentumTable rows={buildMomentumRows(operators)} />
            </div>
          </section>

          {/* ---- comparison stats ---- */}
          <section className="pb-[26px]">
            <SectionHead
              eyebrow="Scale & efficiency"
              title="Comparison stats"
              sub={`Every figure real · cumulative ${COMPARE_YEARS[0]}–${COMPARE_YEARS.at(-1)}.`}
            />
            <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
              <StatsTable operators={operators} />
            </div>
          </section>
        </>
      )}

      {/* ---- CTA ---- */}
      <section className="pt-[26px]">
        <div className="rounded-2xl bg-[linear-gradient(120deg,var(--color-mv-forest),var(--color-mv-night))] px-[34px] py-[34px] text-center shadow-mv max-[560px]:px-5">
          <h2 className="font-sans text-[23px] font-bold leading-[1.2] tracking-[-.02em] text-white">
            Compare the operators on your leases — free.
          </h2>
          <p className="mx-auto mb-5 mt-2 max-w-[520px] text-sm text-mv-on-deep-soft">
            Run any two-to-four Texas operators, save comparisons, and get alerts
            when one changes.
          </p>
          <Link
            href="/signup?from=compare-production"
            className={buttonClass({ variant: "primary", size: "lg", className: "text-[15px]" })}
          >
            Create a free account →
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ==========================================================================
   Controls
   ========================================================================== */

const SCOPE_NOTE_ID = "cp-scope-note";

/**
 * The chevron is a real element rather than a CSS background image, matching
 * `SelectControl` on the listing page. An arbitrary background-image utility
 * cannot carry the design's inline SVG — Tailwind reads the spaces in it as class
 * boundaries — and one icon component is cheaper than escaping a data URI.
 */
const SELECT_CLASS =
  "h-11 w-full cursor-pointer appearance-none truncate rounded-[10px] border border-mv-line bg-white pl-3 pr-[34px] text-[13.5px] font-medium text-mv-ink outline-none transition-colors hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)] disabled:cursor-not-allowed disabled:bg-mv-bg disabled:text-mv-muted disabled:hover:border-mv-line";

function SelectField({
  label,
  value,
  onChange,
  disabled = false,
  describedBy,
  children,
}: {
  label: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  describedBy?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-[6px]">
      <span className="flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[.04em] text-mv-muted">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          defaultValue={value === undefined ? "" : undefined}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          disabled={disabled}
          aria-describedby={describedBy}
          className={SELECT_CLASS}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-[13px] top-1/2 h-[7px] w-[11px] -translate-y-1/2 text-mv-muted"
          strokeWidth={1.8}
        />
      </span>
    </label>
  );
}

/* ==========================================================================
   Shared bits
   ========================================================================== */

/** The design's `.cp-sechead` — eyebrow, rule-marked h2, and a sub beside it. */
function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-[14px] flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className={eyebrowClass}>{eyebrow}</p>
        <h2
          className={`${sectionTitleClass} mt-[7px] flex items-center gap-[11px] text-mv-ink before:h-[19px] before:w-1 before:rounded-full before:bg-mv-green-deep before:content-['']`}
        >
          {title}
        </h2>
      </div>
      <p className="max-w-[440px] text-[13px] text-mv-muted">{sub}</p>
    </div>
  );
}

/** The `#3` pill beside an operator's name. */
function RankPill({ rank }: { rank: number }) {
  return (
    <span className="shrink-0 rounded-full border border-mv-line bg-mv-bg px-2 py-[2px] text-[12px] font-bold text-mv-muted">
      #{rank}
    </span>
  );
}

/* ==========================================================================
   Identity cards
   ========================================================================== */

function IdentityCard({ operator }: { operator: CompareOperator }) {
  return (
    <article className="relative overflow-hidden rounded-[14px] border border-mv-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      {/* The slot's colour as a spine down the left edge, so a card and its line
          on the chart are matched without reading the legend. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: operator.color }}
      />

      <div className="flex min-w-0 items-center gap-[11px]">
        <OperatorMonogram monogram={operator.monogram} size={42} />
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-bold leading-[1.25] text-mv-ink">
            <Link
              href={`/operators/${operator.slug}`}
              className="text-mv-ink no-underline hover:text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              {operator.name}
            </Link>
          </h3>
          <p className="text-[12px] font-medium tabular-nums text-mv-muted">
            ({operator.operatorNumber})
          </p>
        </div>
        <span className="ml-auto">
          <RankPill rank={operator.rank} />
        </span>
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
          {formatMillions(operator.cumBoe)}
        </span>
        <span className="text-[12px] text-mv-muted">
          cumulative BOE · {operator.counties} counties
        </span>
      </p>
    </article>
  );
}

/* ==========================================================================
   Generated read

   Every claim is one of the figures computed in `lib/operator-compare.ts`,
   phrased. Nothing here is model-generated text, which is why the eyebrow says
   "recomputed from the filed record" rather than implying otherwise.
   ========================================================================== */

function GeneratedRead({ leaders }: { leaders: CompareLeaders }) {
  const volume = leaders.byVolume[0];
  if (!volume) return null;

  const items = [
    <>
      <b className="font-bold text-white">{volume.short} leads on scale</b> —{" "}
      {formatMillions(volume.cumBoe)} BOE cumulative
      {leaders.volumeMultiple
        ? `, ${leaders.volumeMultiple.toFixed(1)}× the next operator`
        : ""}{" "}
      and the widest footprint at {volume.counties} counties.
    </>,
    <>
      <b className="font-bold text-white">
        {leaders.efficiency.short} is the efficiency leader
      </b>{" "}
      — {mboePerLease(leaders.efficiency).toFixed(0)} MBOE per lease from{" "}
      {formatCount(leaders.efficiency.leases)} leases on record.
    </>,
    <>
      <b className="font-bold text-white">
        {leaders.oilWeighted.short} is the most oil-weighted
      </b>{" "}
      — {leaders.oilWeighted.oilPct}% of its BOE from oil, generally the stronger
      revenue mix for a mineral owner.
    </>,
    <>
      <b className="font-bold text-white">
        {leaders.growth.short} shows the strongest momentum
      </b>{" "}
      — {formatPercentChange(compoundGrowth(leaders.growth.boe))} compound growth,{" "}
      {COMPARE_YEARS[0]} → {COMPARE_YEARS.at(-1)}.
    </>,
  ];

  return (
    <div className="rounded-2xl bg-[linear-gradient(135deg,var(--color-mv-deep),var(--color-mv-deep-ink))] p-6 shadow-mv-lg max-[560px]:p-5">
      <p className="text-[12px] font-bold uppercase tracking-[.12em] text-mv-on-deep-accent">
        Generated read · recomputed from the filed record
      </p>
      <h2 className="mb-[15px] mt-[7px] font-sans text-[16px] font-bold leading-[1.3] text-white">
        What this comparison is telling you
      </h2>
      <ol className="m-0 grid list-none gap-3 p-0">
        {items.map((body, index) => (
          <li
            key={index}
            className="flex items-start gap-3 text-[13.5px] leading-[1.5] text-mv-on-deep-muted"
          >
            <span
              aria-hidden="true"
              className="grid h-[23px] w-[23px] shrink-0 place-items-center rounded-[7px] bg-[rgba(84,191,150,.16)] text-[12px] font-extrabold text-mv-on-deep-accent"
            >
              {index + 1}
            </span>
            <span>{body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ==========================================================================
   Leaderboard
   ========================================================================== */

function Leaderboard({ leaders }: { leaders: CompareLeaders }) {
  const volume = leaders.byVolume[0];
  if (!volume) return null;

  return (
    <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
      <LeaderTile
        Icon={BarChart3}
        caption="Highest cumulative volume"
        value={formatMillions(volume.cumBoe)}
        unit="BOE"
        operator={volume}
        note={
          leaders.volumeMultiple
            ? `${leaders.volumeMultiple.toFixed(1)}× the next operator`
            : "Top of this set"
        }
      />
      <LeaderTile
        Icon={Gauge}
        caption="Most efficient per lease"
        value={mboePerLease(leaders.efficiency).toFixed(0)}
        unit="MBOE / lease"
        operator={leaders.efficiency}
        note={`From ${formatCount(leaders.efficiency.leases)} leases on record`}
      />
      <LeaderTile
        Icon={TrendingUp}
        caption={`Fastest ${COMPARE_YEARS.length}-yr growth`}
        value={formatPercentChange(compoundGrowth(leaders.growth.boe))}
        unit="per year"
        operator={leaders.growth}
        note={`Compound growth, ${COMPARE_YEARS[0]} → ${COMPARE_YEARS.at(-1)}`}
      />
      <LeaderTile
        Icon={MapPin}
        caption="Widest footprint"
        value={String(leaders.footprint.counties)}
        unit="counties"
        operator={leaders.footprint}
        note="Producing Texas counties on record"
      />
    </div>
  );
}

function LeaderTile({
  Icon,
  caption,
  value,
  unit,
  operator,
  note,
}: {
  Icon: typeof TrendingUp;
  caption: string;
  value: string;
  unit: string;
  operator: CompareOperator;
  note: string;
}) {
  return (
    <div className="relative rounded-[14px] border border-mv-line bg-white p-[18px] shadow-[0_1px_2px_rgba(24,24,27,.05)] transition-[box-shadow,border-color] hover:border-mv-mint-line hover:shadow-mv">
      <span
        aria-hidden="true"
        className="absolute right-4 top-4 grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-mv-mint-line bg-mv-tint"
      >
        <Icon className="h-4 w-4 text-mv-green-deep" strokeWidth={1.8} />
      </span>
      <p className="pr-10 text-[12px] font-bold uppercase tracking-[.05em] text-mv-muted">
        {caption}
      </p>
      <p className="mb-[9px] mt-[14px] text-[26px] font-bold leading-none tracking-[-.02em] tabular-nums text-mv-ink">
        {value} <span className="text-[12px] font-semibold text-mv-muted">{unit}</span>
      </p>
      <p className="flex items-center gap-2 text-[13.5px] font-bold text-mv-ink">
        <OperatorMonogram monogram={operator.monogram} size={22} />
        {operator.short}
        <RankPill rank={operator.rank} />
      </p>
      <p className="mt-[11px] border-t border-mv-line-soft pt-[10px] text-[12px] text-mv-muted">
        {note}
      </p>
    </div>
  );
}

/* ==========================================================================
   Oil vs gas mix
   ========================================================================== */

function MixCard({ operators }: { operators: CompareOperator[] }) {
  const rows = [...operators].sort((a, b) => b.oilPct - a.oilPct);

  return (
    <div className="rounded-2xl border border-mv-line bg-white px-[22px] py-5 shadow-mv max-[560px]:px-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-[14px]">
        <p className="flex gap-[18px] text-[12.5px] font-semibold text-mv-ink-soft">
          <span className="inline-flex items-center gap-2">
            <i
              aria-hidden="true"
              className="inline-block h-[13px] w-[13px] rounded-[3px] bg-mv-green-deep"
            />
            Oil
          </span>
          <span className="inline-flex items-center gap-2">
            <i
              aria-hidden="true"
              className="inline-block h-[13px] w-[13px] rounded-[3px] border border-mv-line bg-mv-gas"
            />
            Gas
          </span>
        </p>
        <p className="inline-flex items-center gap-2 text-[12px] font-semibold text-mv-muted max-[560px]:hidden">
          <i aria-hidden="true" className="h-[14px] border-l-2 border-dashed border-mv-faint" />
          dashed line = 50 / 50 split
        </p>
      </div>

      {/*
        The 50/50 marker is one dashed line spanning every row, positioned from
        the same `--mix-label` the rows use for their first column — so it stays
        centred on the bars at any width, rather than pinned to the design's
        hard-coded 194px, which only lined up at one viewport size. Hidden where
        the rows stack and there is no bar column to centre on.
      */}
      <ul className="relative m-0 grid list-none gap-[14px] p-0 [--mix-label:180px] max-[700px]:[--mix-label:130px]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-1 border-l-2 border-dashed border-mv-faint max-[560px]:hidden"
          style={{
            left: "calc(var(--mix-label) + 14px + (100% - var(--mix-label) - 14px) / 2)",
          }}
        />

        {rows.map((operator) => (
          <li
            key={operator.slug}
            className="grid grid-cols-[var(--mix-label)_1fr] items-center gap-[14px] max-[560px]:grid-cols-1"
          >
            <span className="flex min-w-0 items-center gap-[9px] text-[13px] font-semibold">
              <OperatorMonogram monogram={operator.monogram} size={26} />
              <span className="truncate">{operator.short}</span>
            </span>

            {/* The two percentages are decoration for a screen reader — read on
                their own they are a pair of bare numbers — so the split is stated
                once, in a sentence, instead. */}
            <span className="relative flex h-[30px] overflow-hidden rounded-lg bg-mv-gas">
              <span
                aria-hidden="true"
                className="flex items-center justify-center bg-mv-green-deep text-[12px] font-bold text-white"
                style={{ width: `${operator.oilPct}%` }}
              >
                {operator.oilPct}%
              </span>
              <span
                aria-hidden="true"
                className="flex flex-1 items-center justify-center text-[12px] font-bold text-mv-ink-soft"
              >
                {100 - operator.oilPct}%
              </span>
              <span className="sr-only">
                {operator.name}: {operator.oilPct}% of its {COMPARE_YEARS[0]}–
                {COMPARE_YEARS.at(-1)} BOE from oil, {100 - operator.oilPct}% from
                gas.
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap items-start gap-2 rounded-[10px] border border-mv-line bg-mv-bg px-[14px] py-[11px] text-[12px] text-mv-ink-soft">
        <span className="shrink-0 rounded-full border border-mv-sand-line bg-mv-sand-tint px-[9px] py-[2px] font-bold text-mv-sand">
          Real filed split
        </span>
        {/* The window is stated rather than called "lifetime": this share is
            computed from the charted {COMPARE_YEARS[0]}–{COMPARE_YEARS.at(-1)}
            series, which is not the operator's whole filed record. */}
        <span className="min-w-0 flex-1">
          Share of {COMPARE_YEARS[0]}–{COMPARE_YEARS.at(-1)} BOE from oil vs gas
          (gas at 15:1). Oil-weighted operators generally realize more per BOE;
          gas-weighted ones swing with gas prices.
        </span>
      </p>
    </div>
  );
}

/* ==========================================================================
   Tables

   Both use the site's dark table header, and both scroll sideways rather than
   shrink: dropping the header below 12px is exactly what the design's 11.5px did,
   and it is what the legible-font-size audit fails on.
   ========================================================================== */

const TH_BASE =
  "whitespace-nowrap bg-mv-table-head px-[15px] py-[13px] text-[12px] font-semibold uppercase tracking-[.04em] text-white";

const TD_BASE = "whitespace-nowrap border-b border-mv-line-soft bg-white px-[15px] py-[13px]";

/** A signed change with a direction glyph — the design's `.dd`. */
function Delta({ percent }: { percent: number }) {
  const direction = percent > 0.5 ? "up" : percent < -0.5 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  const tone =
    direction === "up"
      ? "text-mv-green-deep"
      : direction === "down"
        ? "text-mv-down"
        : "text-mv-muted";

  return (
    <span className={`inline-flex items-center gap-[3px] font-bold tabular-nums ${tone}`}>
      <Icon aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
      {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

function MomentumTable({ rows }: { rows: MomentumRow[] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[680px] border-separate border-spacing-0 text-[13.5px]">
        <caption className="sr-only">
          Momentum and growth in BOE for the selected operators, {COMPARE_YEARS[0]}
          –{COMPARE_YEARS.at(-1)}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${TH_BASE} text-left`}>
              Operator
            </th>
            <th scope="col" className={`${TH_BASE} text-right`}>
              Latest yr
            </th>
            <th scope="col" className={`${TH_BASE} text-right`}>
              YoY
            </th>
            <th scope="col" className={`${TH_BASE} text-right`}>
              {COMPARE_YEARS.length}-yr / yr
            </th>
            <th scope="col" className={`${TH_BASE} text-left`}>
              Shape
            </th>
            <th scope="col" className={`${TH_BASE} text-right`}>
              Swing
            </th>
            <th scope="col" className={`${TH_BASE} text-left`}>
              Read
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.operator.slug} className="[&:hover>*]:bg-mv-row-hover">
              <th scope="row" className={`${TD_BASE} text-left`}>
                <span className="flex items-center gap-[9px] font-semibold text-mv-ink">
                  <OperatorMonogram monogram={row.operator.monogram} size={24} />
                  {row.operator.short}
                </span>
              </th>
              <td className={`${TD_BASE} text-right tabular-nums text-mv-ink-soft`}>
                {row.latest.toFixed(1)}M
              </td>
              <td className={`${TD_BASE} text-right`}>
                <Delta percent={row.yearOverYear} />
              </td>
              <td className={`${TD_BASE} text-right`}>
                <Delta percent={row.compoundGrowth} />
              </td>
              <td className={TD_BASE}>
                <svg aria-hidden="true" width="90" height="26" viewBox="0 0 90 26" className="block">
                  <polyline
                    points={sparklinePoints(row.operator.boe, 90, 26)}
                    fill="none"
                    stroke={row.operator.color}
                    strokeWidth="2"
                  />
                </svg>
              </td>
              <td className={`${TD_BASE} text-right tabular-nums text-mv-ink-soft`}>
                ±{row.swing.toFixed(0)}%
              </td>
              <td className={TD_BASE}>
                <span
                  className={`text-[12.5px] font-bold ${
                    row.direction === "up"
                      ? "text-mv-green-deep"
                      : row.direction === "down"
                        ? "text-mv-down"
                        : "text-mv-muted"
                  }`}
                >
                  {row.read}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsTable({ operators }: { operators: CompareOperator[] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[13.5px]">
        <caption className="sr-only">
          Scale and efficiency for the selected operators, cumulative{" "}
          {COMPARE_YEARS[0]}–{COMPARE_YEARS.at(-1)}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${TH_BASE} text-left`}>
              Metric
            </th>
            {operators.map((operator) => (
              <th key={operator.slug} scope="col" className={`${TH_BASE} text-right`}>
                <span
                  aria-hidden="true"
                  className="mr-[6px] inline-block h-[11px] w-[11px] rounded-sm align-[-1px]"
                  style={{ background: operator.color }}
                />
                {operator.short.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_STAT_ROWS.map((row) => (
            <tr key={row.label} className="[&:hover>*]:bg-mv-row-hover">
              <th
                scope="row"
                className={`${TD_BASE} whitespace-normal text-left font-semibold text-mv-ink`}
              >
                {row.label}
              </th>
              {operators.map((operator) => (
                <td
                  key={operator.slug}
                  className={`${TD_BASE} text-right tabular-nums text-mv-ink-soft`}
                >
                  {row.value(operator)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
