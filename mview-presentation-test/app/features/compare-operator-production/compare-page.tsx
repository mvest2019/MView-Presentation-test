"use client";

import {
  AlertTriangle,
  Droplet,
  Flame,
  Gauge,
  Lightbulb,
  Lock,
  MapPin,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { buttonClass } from "@/app/_components/button";
import { ChangeItem } from "@/app/_components/change-item";
import { DeferredSection } from "@/app/_components/deferred-section";
import { SelectControl } from "@/app/_components/select-control";
import { OperatorLogo } from "@/app/_components/operator-logo";
import { OperatorMonogram } from "@/app/_components/operator-monogram";
import { OperatorSlotPicker } from "@/app/_components/operator-slot-picker";
import { eyebrowClass, sectionTitleClass } from "@/app/_components/typography";
import { Band, Panel, Row } from "@/app/_components/cta-band";
import { compareFindings } from "@/lib/operator-compare-findings";
import { detailSlugForNumber } from "@/lib/operator-detail";
import { formatCount, formatMillions } from "@/lib/operator-compare";
import { shortName } from "@/lib/operator-statistics";
import {
  hasProductionSelection,
  productionFiltersKey,
} from "@/lib/operator-production-filters";
import type {
  ProductionFilterOptions,
  ProductionFilters,
  ProductionLeader,
  ProductionLeaders,
  ProductionOperator,
} from "@/lib/operator-production-shape";
import { PRODUCTION_STAT_ROWS } from "@/lib/operator-production-stats";
import { COMPARE_SLOT_COUNT, SLOT_COLORS } from "@/lib/operator-slot-colors";
import { titleCase } from "@/lib/text-case";

import { ProductionChart } from "./_components/production-chart";
import { useProductionInfo } from "./_components/use-production-data";

/**
 * Compare Operator Production — everything below the page header.
 *
 * WHY ONE FILE. Same call as the operator listing: each band here (pickers,
 * identity cards, the generated read, the leaderboard, the mix bars, the stats
 * table) is markup used by this page and nothing else, and all of it
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
 * One compared operator, with the two things the API does not supply.
 *
 * `color` is the slot colour, which identifies a line on the chart and a swatch in
 * the table header — it belongs to the POSITION, not the operator, so it is assigned
 * here from the render order rather than stored anywhere. `short` is the elided label
 * the tight cells need, from the same helper the statistics tool uses.
 */
interface Compared extends ProductionOperator {
  color: string;
  short: string;
  /** This site's detail slug, or null when there is no page to link to. */
  slug: string | null;
}

/** Assign slot colours and short labels in response order. */
function withSlots(operators: readonly ProductionOperator[]): Compared[] {
  return operators.map((operator, index) => ({
    ...operator,
    color: SLOT_COLORS[index] ?? SLOT_COLORS[0],
    short: shortName(operator.name),
    slug: detailSlugForNumber(operator.operatorNumber),
  }));
}

const NO_OPERATORS: Compared[] = [];

export function ComparePage({
  options,
  initialFilters,
}: {
  options: ProductionFilterOptions;
  initialFilters: ProductionFilters;
}) {
  /**
   * TWO FILTER SETS, AND THE DIFFERENCE IS THE WHOLE POINT.
   *
   * `draft` is what the controls edit. `applied` is what the data hooks read. Nothing
   * is requested until Apply copies one into the other, so choosing an operator,
   * ticking three counties and changing the year range costs zero requests — where a
   * single piece of state would have fired a request on every one of those.
   *
   * Both start from the server's value, so the first render has no operator selected,
   * makes no request, and shows the prompt.
   */
  const [draft, setDraft] = useState<ProductionFilters>(initialFilters);
  const [applied, setApplied] = useState<ProductionFilters>(initialFilters);

  const { state, retry } = useProductionInfo(applied);

  /* The cached payload, which is a stable object for a given filter set — so the
     memo below re-runs when the answer changes and not on every render. */
  const info = state.status === "ready" ? state.data : null;

  const operators = useMemo(
    () => (info ? withSlots(info.operators) : NO_OPERATORS),
    [info],
  );

  /* Identity for the pickers: rank, logo and initials for an operator that has
     already been resolved. Keyed on the filed name, which is what a slot holds. */
  const resolved = useMemo(() => {
    const map = new Map<string, ProductionOperator>();
    for (const operator of info?.operators ?? []) {
      map.set(operator.filedName, operator);
    }
    return map;
  }, [info]);

  const draftKey = productionFiltersKey(draft);
  const appliedKey = productionFiltersKey(applied);
  const chosen = hasProductionSelection(draft);
  const dirty = draftKey !== appliedKey;

  /**
   * Put an operator in a slot, or clear one.
   *
   * CLEARING THE LAST OPERATOR ALSO CLEARS WHAT IS APPLIED, and that is a bug fix
   * rather than a preference. Slots edit `draft`; the page renders `applied`. Emptying
   * every slot therefore left the previous comparison on screen — and because Apply
   * disables itself with nothing chosen, there was no way to get rid of it. The reader
   * was looking at operators the controls said were not selected, with no way out
   * except a reload.
   *
   * REMOVING ONE OF SEVERAL IS LEFT ALONE. That is an edit like any other: Apply lights
   * up, the applied row still describes what is genuinely in force, and the change costs
   * a request only when it is committed. Only the empty case is unreachable by Apply,
   * so only the empty case is handled here — the same reasoning as `stripScope`.
   */
  function setSlot(slot: number, name: string) {
    setDraft((current) => {
      const next = [...current.operators];
      // Slots are positional, so an empty earlier slot has to be preserved rather
      // than collapsed — otherwise choosing operator 3 first moves it to slot 1.
      while (next.length <= slot) next.push("");
      next[slot] = name;
      // Trailing blanks carry no meaning and would be sent as empty strings.
      while (next.length > 0 && next[next.length - 1] === "") next.pop();
      return { ...current, operators: next };
    });

    /* Computed from the draft this control was rendered from — what the reader just
       acted on — rather than inside the updater above, which must stay free of side
       effects. */
    const clearedTheLastOne =
      name === "" &&
      draft.operators.every((entry, index) => index === slot || entry === "");

    if (clearedTheLastOne) {
      setApplied((current) =>
        current.operators.length === 0
          ? current
          : { ...current, operators: [] },
      );
    }
  }

  const takenBy = (slot: number) =>
    new Set(
      draft.operators.filter((name, index) => name !== "" && index !== slot),
    );

  /**
   * Drop one scoping filter, or all of them.
   *
   * BOTH SETS ARE UPDATED TOGETHER, which is the only behaviour that reads
   * correctly: a chip in the "Applied" row describes what is IN FORCE, so clicking
   * its cross has to change what is in force — not stage a change that then needs
   * Apply pressing. Stripping the draft too keeps the dropdowns in step, so the
   * removed value does not sit there ticked, and leaves `dirty` false rather than
   * lighting up Apply for an edit nobody made.
   *
   * Removing a chip therefore does re-request — the applied filter set genuinely
   * changed. That is one request per deliberate act, which is the point.
   *
   * OPERATORS ARE NOT TOUCHED by either. They are the comparison rather than a
   * filter on it, they have their own cross in each slot, and clearing them here
   * would empty the page from a control that reads as "clear the filters".
   */
  function stripScope(
    change: (current: ProductionFilters) => ProductionFilters,
  ) {
    setDraft(change);
    setApplied(change);
  }

  const removeCounty = (value: string) =>
    stripScope((current) => ({
      ...current,
      counties: current.counties.filter((entry) => entry !== value),
    }));

  const removePlayType = (value: string) =>
    stripScope((current) => ({
      ...current,
      playTypes: current.playTypes.filter((entry) => entry !== value),
    }));

  const removeDistrict = (value: string) =>
    stripScope((current) => ({
      ...current,
      districtCodes: current.districtCodes.filter((entry) => entry !== value),
    }));

  const clearScope = () =>
    stripScope((current) => ({
      ...current,
      counties: [],
      playTypes: [],
      districtCodes: [],
    }));

  /**
   * Why Apply cannot be pressed, when it cannot.
   *
   * A DISABLED BUTTON WITH NO REASON is the thing being fixed here: the operator
   * slots start empty, so the primary action on the page begins greyed out with
   * nothing saying what to do about it. Only the actionable case gets a message —
   * "nothing has changed" needs no instruction, and the applied row directly below
   * already says what is in force.
   */
  const applyBlockedReason = !chosen
    ? "Choose at least one operator to compare."
    : "";

  /** How many scoping filters are in force — drives which empty state is right. */
  const scopeCount =
    applied.counties.length +
    applied.playTypes.length +
    applied.districtCodes.length;

  return (
    <div className="mx-auto max-w-[1180px] px-[22px] pb-16 max-[767px]:px-4 max-[767px]:pb-11">
      {/* ---- filters ---- */}
      <div className="mt-5 rounded-2xl border border-mv-line bg-white px-5 py-[18px] shadow-mv max-[560px]:px-4">
        <div className="grid grid-cols-4 gap-3 max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
          {Array.from({ length: COMPARE_SLOT_COUNT }, (_, slot) => {
            const name = draft.operators[slot] ?? "";
            const record = name === "" ? undefined : resolved.get(name);
            return (
              <OperatorSlotPicker
                key={slot}
                slot={slot}
                slotLabel={String(slot + 1)}
                value={name}
                rank={record?.rankStatewide ?? null}
                monogram={record?.monogram ?? null}
                logoUrl={record?.logoUrl ?? null}
                takenNames={takenBy(slot)}
                onSelect={(next) => setSlot(slot, next)}
                onClear={() => setSlot(slot, "")}
              />
            );
          })}
        </div>

        <div className="mt-[14px] grid grid-cols-[repeat(3,1fr)_auto] items-end gap-3 border-t border-mv-line-soft pt-[14px] max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
          {/* THE SAME `SelectControl` THE OPERATOR LISTING USES (requested), so all
              three operator pages carry one dropdown.

              THESE ARE SINGLE-SELECT NOW. They were multi-select panels, and the
              payload still takes arrays — `county: ["MIDLAND","MARTIN"]` — so the
              shape has not changed, but a native `<select>` can only put one value
              in each. Scoping to two counties at once is therefore no longer
              expressible from this page. The sentinel is "" rather than a magic
              string because an empty value already means "no filter" to the
              endpoint, so it maps straight to an empty array. */}
          <FilterField label="County">
            <SelectControl
              label="Filter by county"
              value={draft.counties[0] ?? ""}
              onChange={(county) =>
                setDraft((current) => ({
                  ...current,
                  counties: county === "" ? [] : [county],
                }))
              }
              className="w-full min-w-0"
            >
              <option value="">All counties</option>
              {options.counties.map((county) => (
                <option key={county} value={county}>
                  {titleCase(county)} County
                </option>
              ))}
            </SelectControl>
          </FilterField>

          <FilterField label="Play type">
            <SelectControl
              label="Filter by play type"
              value={draft.playTypes[0] ?? ""}
              onChange={(play) =>
                setDraft((current) => ({
                  ...current,
                  playTypes: play === "" ? [] : [play],
                }))
              }
              className="w-full min-w-0"
            >
              <option value="">All plays</option>
              {options.playTypes.map((play) => (
                <option key={play} value={play}>
                  {titleCase(play)}
                </option>
              ))}
            </SelectControl>
          </FilterField>

          <FilterField label="District code">
            <SelectControl
              label="Filter by Railroad Commission district"
              value={draft.districtCodes[0] ?? ""}
              onChange={(code) =>
                setDraft((current) => ({
                  ...current,
                  districtCodes: code === "" ? [] : [code],
                }))
              }
              className="w-full min-w-0"
            >
              <option value="">All districts</option>
              {/* The bare code, as the regulator writes it — the field label
                  already says District code. */}
              {options.districtCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectControl>
          </FilterField>

          <button
            type="button"
            onClick={() => setApplied(draft)}
            disabled={!chosen || !dirty}
            aria-describedby={
              applyBlockedReason === "" ? undefined : APPLY_HINT_ID
            }
            className={buttonClass({
              variant: "primary",
              className:
                "h-11 w-full disabled:cursor-not-allowed disabled:opacity-55",
            })}
          >
            Apply filters
          </button>
        </div>

        {/* Announced, not just shown: `status` means a screen reader hears the
            reason when it appears rather than only on focusing the button. */}
        {applyBlockedReason === "" ? null : (
          <p
            id={APPLY_HINT_ID}
            role="status"
            className="mt-[10px] flex items-center gap-[6px] text-[12.5px] text-mv-muted"
          >
            <AlertTriangle
              aria-hidden="true"
              className="h-[13px] w-[13px] shrink-0 text-mv-sand"
              strokeWidth={2.2}
            />
            {applyBlockedReason}
          </p>
        )}

        {/* What is actually in force, stated rather than left to be inferred from
            the controls — which is the only way to tell an edited draft from an
            applied filter set. */}
        <AppliedFilters
          filters={applied}
          onRemoveCounty={removeCounty}
          onRemovePlayType={removePlayType}
          onRemoveDistrict={removeDistrict}
          onClearAll={clearScope}
        />
      </div>

      {state.status === "idle" ? (
        <DoYouKnow />
      ) : state.status === "loading" ? (
        <LoadingPanels />
      ) : state.status === "error" ? (
        <Notice tone="error">
          The comparison could not be loaded. This is usually the upstream
          service rather than the filters.{" "}
          <button
            type="button"
            onClick={retry}
            className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-mv-green-deep underline underline-offset-2 hover:text-mv-ink"
          >
            Try again
          </button>
          .
        </Notice>
      ) : operators.length === 0 ? (
        /* TWO DIFFERENT EMPTIES, because they need different answers. With a
           county, play or district in force the acreage is the likely cause and
           there is something to undo; with none, the operator simply has nothing
           on record and "try removing a filter" would name a filter that is not
           there. */
        scopeCount > 0 ? (
          <Notice>
            No filed production matches these filters.{" "}
            <button
              type="button"
              onClick={clearScope}
              className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-mv-green-deep underline underline-offset-2 hover:text-mv-ink"
            >
              Clear {scopeCount === 1 ? "the filter" : "all filters"}
            </button>{" "}
            to see the whole record.
          </Notice>
        ) : (
          <Notice>
            No filed production is on record for{" "}
            {applied.operators.length === 1
              ? "this operator"
              : "these operators"}
            .
          </Notice>
        )
      ) : (
        <>
          {/* ---- identity cards ---- */}
          <section className="py-[26px]">
            <SectionHead title="Operators in this comparison" />
            <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
              {operators.map((operator) => (
                <IdentityCard
                  key={operator.operatorNumber}
                  operator={operator}
                  /* Read off the response, not off a session flag the page does not
                     have — see `ProductionInfo.locked`. */
                  locked={info?.locked ?? false}
                />
              ))}
            </div>
          </section>

          {/* ---- generated read ----
              HIDDEN OUTRIGHT FOR A SIGNED-OUT READER, not locked, and this one is
              not a presentation choice. Every sentence in it is written from the
              volumes — "leads on oil", "covers the most ground", the growth and
              per-lease lines — and the volumes are exactly what the endpoint
              withholds without an account. Rendered anyway it does not degrade, it
              LIES: the withheld figures parse to zero, so it produced sentences
              like "leads on oil 0.0M bbl" and stated them as findings.

              A locked panel here would also be the fourth lock on one screen,
              after the two card figures and the chart. The band below already
              names this section in what a free account opens, so the reader is
              told it exists without the page asking four times. */}
          {info?.locked ? null : (
            <section className="pb-[26px]">
              <GeneratedRead
                operators={operators}
                leaders={info?.leaders ?? null}
              />
            </section>
          )}

          {/* ---- leaderboard ---- */}
          <section className="pb-[26px]">
            <SectionHead title="Who leads on what" />
            <Leaderboard leaders={info?.leaders ?? null} locked={info?.locked ?? false} />
          </section>

          {/* ---- production over time ----
              DEFERRED, which is what keeps the second endpoint from being called
              alongside the first: the chart asks for its own series when it is
              approached, so a visitor who reads the cards and leaves never pays for
              it. `DeferredSection` reserves the height, so nothing shifts. */}
          <section className="pb-[26px]">
            <DeferredSection minHeight={520} label="Production over time">
              <ProductionChart filters={applied} operators={operators} />
            </DeferredSection>
          </section>

          {/* ---- the ask ----
              Only when the response actually came back withheld, so a signed-in
              member never sees it and a page that is not gated does not carry a
              band about gating. */}
          {info?.locked ? (
            <section className="pb-[26px]">
              <ComparisonLockedCta />
            </section>
          ) : null}

          {/* ---- oil vs gas mix ---- */}
          <section className="pb-[26px]">
            <SectionHead title="Oil vs gas mix" />
            <MixCard operators={operators} />
          </section>

          {/* ---- comparison stats ---- */}
          <section className="pb-[26px]">
            <SectionHead title="Comparison stats" />
            <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
              <StatsTable operators={operators} locked={info?.locked ?? false} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * A label above a control.
 *
 * The shared listbox filter renders only its trigger, so the "COUNTY" / "PLAY TYPE"
 * caption above it lives here — matching the caption the slot pickers draw for
 * themselves, so the two rows of the filter bar read as one grid.
 */
function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[12px] font-bold uppercase tracking-[.04em] text-mv-muted">
        {label}
      </span>
      {children}
    </span>
  );
}

/** Ties the Apply button to the sentence explaining why it is disabled. */
const APPLY_HINT_ID = "cp-apply-hint";

/** One removable chip in the applied row. */
interface AppliedChip {
  /** Unique within the row, so two filters sharing a value cannot collide. */
  id: string;
  label: string;
  remove: () => void;
}

/**
 * The scoping filters in force, each removable.
 *
 * ONE CHIP PER VALUE, not one per filter. It used to join every county into a single
 * chip, which reads fine and removes badly — there is no sensible cross to put on
 * "Karnes, Midland, Martin". A chip per value is what makes each one individually
 * revocable, and it is also more honest about how many filters are actually on.
 *
 * IT READS AS A BAND, not as a footnote. The previous version was 12px muted text on
 * white under a hairline, which is why it was easy to miss entirely: it looked like a
 * caption on the card above rather than the live state of the page. It now has its own
 * tinted surface, a label in the accent colour, and chips with real edges — the same
 * mint-on-white language the filter controls use, so it belongs to them.
 *
 * THE YEAR RANGE IS NOT LISTED. It is no longer a control, so it is not something a
 * visitor applied — and a chip for a value nobody chose, with a cross that cannot
 * meaningfully remove it, would be worse than leaving it out. The chart states its own
 * span on its axis and in its footnote.
 *
 * NOTHING IN FORCE RENDERS NOTHING, rather than an empty band with a label.
 *
 * DISTRICT CHIPS KEEP THE WORD. The dropdown lists bare codes because its own field
 * label says District code; a chip sits beside county and play-type chips with no
 * label of its own, and a lone "08" there could be anything.
 */
function AppliedFilters({
  filters,
  onRemoveCounty,
  onRemovePlayType,
  onRemoveDistrict,
  onClearAll,
}: {
  filters: ProductionFilters;
  onRemoveCounty: (value: string) => void;
  onRemovePlayType: (value: string) => void;
  onRemoveDistrict: (value: string) => void;
  onClearAll: () => void;
}) {
  const chips: AppliedChip[] = [
    ...filters.counties.map((county) => ({
      id: `county:${county}`,
      label: titleCase(county),
      remove: () => onRemoveCounty(county),
    })),
    ...filters.playTypes.map((play) => ({
      id: `play:${play}`,
      label: titleCase(play),
      remove: () => onRemovePlayType(play),
    })),
    ...filters.districtCodes.map((code) => ({
      id: `district:${code}`,
      label: `District ${code}`,
      remove: () => onRemoveDistrict(code),
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="mt-[14px] flex flex-wrap items-center gap-x-2 gap-y-[7px] rounded-[10px] border border-mv-mint-line bg-mv-tint px-[13px] py-[10px]">
      <span className="text-[11px] font-bold uppercase tracking-[.06em] text-mv-green-deep">
        Applied filters
      </span>

      <ul className="m-0 flex flex-1 list-none flex-wrap items-center gap-2 p-0">
        {chips.map((chip) => (
          <li key={chip.id}>
            <span className="inline-flex items-center gap-[5px] rounded-full border border-mv-mint-line bg-white py-[3px] pl-[10px] pr-[4px] text-[12.5px] font-medium text-mv-ink">
              {chip.label}
              <button
                type="button"
                onClick={chip.remove}
                /* Names the filter, not just the action: "Remove" on its own is
                   four identical buttons to a screen reader. */
                aria-label={`Remove filter ${chip.label}`}
                className="grid h-[17px] w-[17px] shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-mv-muted transition-colors hover:bg-mv-line-soft hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
              >
                <X aria-hidden="true" className="h-3 w-3" strokeWidth={2.6} />
              </button>
            </span>
          </li>
        ))}
      </ul>

      {/* Only worth offering once there is more than one thing to clear — with a
          single chip its own cross already does the job. */}
      {chips.length > 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="shrink-0 cursor-pointer rounded-md border-0 bg-transparent px-1 text-[12.5px] font-semibold text-mv-green-deep underline decoration-1 underline-offset-2 transition-colors hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}

/** The page's one-line states — prompt, empty and error all read the same way. */
function Notice({
  children,
  tone = "quiet",
}: {
  children: React.ReactNode;
  tone?: "quiet" | "error";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={`mt-8 flex items-start gap-[10px] rounded-[14px] border px-[18px] py-4 text-sm ${
        tone === "error"
          ? "border-mv-sand-line bg-mv-sand-tint text-mv-ink"
          : "border-mv-line bg-mv-line-soft text-mv-ink-soft"
      }`}
    >
      {tone === "error" ? (
        <AlertTriangle
          aria-hidden="true"
          className="mt-[2px] h-4 w-4 shrink-0 text-mv-sand"
          strokeWidth={2.2}
        />
      ) : null}
      <span>{children}</span>
    </p>
  );
}

/**
 * The skeleton, shaped like what is coming.
 *
 * Four cards and four tiles at the heights the real ones occupy, so the panels do not
 * jump when the figures land.
 */
function LoadingPanels() {
  return (
    <div aria-busy="true" aria-live="polite" className="py-[26px]">
      <span className="sr-only">Loading the comparison…</span>
      <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[182px] animate-pulse rounded-[14px] border border-mv-line bg-white"
          />
        ))}
      </div>
      <div className="mt-[26px] grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[150px] animate-pulse rounded-[14px] border border-mv-line bg-white"
          />
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Shared bits
   ========================================================================== */

/** The design's `.cp-sechead` — eyebrow, rule-marked h2, and a sub beside it. */
/**
 * A section's heading, with both the eyebrow and the trailing note optional.
 *
 * Several sections now carry the title alone (requested). Each optional part is
 * dropped from the markup rather than rendered empty, so a heading without an eyebrow
 * does not keep the gap the eyebrow used to fill — and `mt-[7px]`, which only ever
 * existed to space the title away from the eyebrow, goes with it.
 */
function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-[14px] flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
        <h2
          className={`${sectionTitleClass} ${eyebrow ? "mt-[7px]" : ""} flex items-center gap-[11px] text-mv-ink before:h-[19px] before:w-1 before:rounded-full before:bg-mv-green-deep before:content-['']`}
        >
          {title}
        </h2>
      </div>
      {sub ? (
        <p className="max-w-[440px] text-[13px] text-mv-muted">{sub}</p>
      ) : null}
    </div>
  );
}

/** The `#3` pill beside an operator's name. */
function RankPill({ rank }: { rank: number | null }) {
  // The response omits a rank for an operator outside the statewide ranking, and a
  // "#null" pill is worse than no pill.
  if (rank === null) return null;
  return (
    <span className="shrink-0 rounded-full border border-mv-line bg-mv-bg px-2 py-[2px] text-[12px] font-bold text-mv-muted">
      #{rank}
    </span>
  );
}

/* ==========================================================================
   Identity cards
   ========================================================================== */

/**
 * One operator's card.
 *
 * NO SLOT COLOUR (requested). Each card used to carry its chart colour as a spine down
 * the left edge, which matched a card to its line without reading the legend. Four
 * differently-coloured spines was the "multiple colours" being asked about, so the
 * cards are now uniform and the chart's own legend does the matching. The colour is
 * still on the operator and still used where it earns its place — the chart lines, the
 * legend, and the table headers that label a column.
 *
 * OIL AND GAS RATHER THAN BOE (requested). BOE folds gas into oil at 15:1, so a single
 * figure cannot say which commodity an operator actually produces. Two figures can, and
 * they come straight off the record — `cumOil` in barrels, `cumGas` in Mcf — with the
 * unit beside each, because "7.24B" alone is a number a reader has to guess the unit of.
 */
function IdentityCard({
  operator,
  locked,
}: {
  operator: Compared;
  /** True when the response withheld the volumes — see `ProductionInfo.locked`. */
  locked: boolean;
}) {
  return (
    <article className="flex h-full flex-col rounded-[14px] border border-mv-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <div className="flex min-w-0 items-center gap-[11px]">
        {/* The API supplies a logo for most operators; the initials are the
            fallback, which is what `OperatorLogo` already decides. */}
        <OperatorLogo
          url={operator.logoUrl}
          monogram={operator.monogram}
          size={42}
          radius={10}
        />
        <div className="min-w-0">
          {/* Two lines' worth of height whether the name needs them or not.
              "XTO Energy, Inc" fits one line and "Occidental Permian, Ltd" takes
              two, which is what pushed each card's "Most active" block to a
              different height. */}
          <h3 className="min-h-[34px] text-[13.5px] font-bold leading-[1.25] text-mv-ink">
            {/* A link only where this site has a page. The comparison can name any
                of the 24,000-odd operators in the directory, and only the
                prerendered ones have somewhere to go — a slug guessed from the name
                would 404 just as reliably, only less visibly. */}
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
        <span className="ml-auto">
          <RankPill rank={operator.rankStatewide} />
        </span>
      </div>

      {operator.topCounties.length > 0 ? (
        <p className="mt-3 text-[12px] leading-[1.45] text-mv-muted">
          <span className="block font-extrabold uppercase tracking-[.05em] text-mv-green-deep">
            Most active
          </span>
          {operator.topCounties
            .map((entry) => titleCase(entry.county))
            .join(", ")}
        </p>
      ) : null}

      {/* `mt-auto` pins this to the bottom of the card. Grid rows already stretch
          every card to the same height, so the four figure blocks then sit on one
          line regardless of how much the blocks above them differ. */}
      <div className="mt-auto border-t border-mv-line-soft pt-3">
        <dl className="m-0 grid grid-cols-2 gap-x-3">
          <div className="min-w-0">
            <dt className="text-[11px] font-bold uppercase tracking-[.05em] text-mv-muted">
              Oil produced
            </dt>
            <dd className="m-0 mt-[3px] text-[16px] font-bold leading-none tracking-[-.02em] tabular-nums text-mv-ink">
              {locked ? (
                <LockedFigure label="Oil produced" />
              ) : (
                <>
                  {formatMillions(operator.oilTotal)}{" "}
                  <span className="text-[11px] font-semibold text-mv-muted">
                    bbl
                  </span>
                </>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-bold uppercase tracking-[.05em] text-mv-muted">
              Gas produced
            </dt>
            <dd className="m-0 mt-[3px] text-[16px] font-bold leading-none tracking-[-.02em] tabular-nums text-mv-ink">
              {locked ? (
                <LockedFigure label="Gas produced" />
              ) : (
                <>
                  {formatMillions(operator.gasTotal)}{" "}
                  <span className="text-[11px] font-semibold text-mv-muted">
                    Mcf
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

/**
 * A withheld volume on an operator card.
 *
 * WHY NOT JUST HIDE THE ROW. The four figure blocks are what pin the cards to a
 * common baseline — remove two and every card in the row changes height. This
 * occupies exactly the space the number did, so the grid is untouched.
 */
function LockedFigure({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-[6px]">
      <span className="sr-only">{label} — locked, create a free account</span>
      <span
        aria-hidden="true"
        className="inline-block h-[11px] w-[46px] rounded-full bg-[linear-gradient(90deg,var(--color-mv-line),var(--color-mv-line-soft))] align-middle blur-[2.5px]"
      />
      <Lock
        aria-hidden="true"
        className="h-[13px] w-[13px] shrink-0 text-mv-muted"
        strokeWidth={2.3}
      />
    </span>
  );
}

/**
 * The ask, once the comparison has been drawn around it.
 *
 * WHAT IS GATED HERE IS THE BACKEND'S CHOICE, not this page's: both production
 * endpoints return the volumes as `"****"` without a member id, while rank, the
 * oil/gas split, counties and leases come back real. So the comparison still does
 * most of its job for a signed-out reader — who ranks where, where they operate,
 * how their output splits — and the volumes and the chart are what an account
 * adds. That is the soft gate the right way round, and it is why this band sits
 * after the cards rather than in front of them.
 *
 * THE SAME `Band` the map guide, the operator directory and the operator profile
 * use, so every ask on the site is one component.
 */
function ComparisonLockedCta() {
  return (
    <Band
      tone="deep"
      icon={Lock}
      eyebrow="Free account"
      title="See the volumes behind this comparison"
      body="Rank, the oil and gas split, counties and lease counts are free and stay free — you are reading them now. A free account adds the filed production volumes for each operator, the year-by-year chart, and the written read of what the comparison is telling you."
      primary={{
        href: "/register?from=compare-production",
        label: "Register for free",
      }}
      secondary={{ href: "/login", label: "Sign in" }}
    >
      <Panel title="What a free account opens">
        <Row label="Filed oil and gas volumes" note="per operator, per filter" />
        <Row label="The year-by-year chart" note="with the brush and the ranges" />
        {/* The section hidden above, named here — a reader who never sees it should
            still be told it is part of what an account adds. */}
        <Row
          label="What this comparison is telling you"
          note="the written read of the figures"
        />
        <Row label="No card, no obligation" />
      </Panel>
    </Band>
  );
}

/* ==========================================================================
   Do you know?
   ========================================================================== */

/**
 * What the page is for, shown while nothing has been applied yet.
 *
 * THE DEFAULT STATE USED TO BE ONE SENTENCE. A visitor who lands here before picking
 * anyone saw a single line of instruction and no reason to bother, which is a poor
 * first screen for the page a marketing site is trying to send people to. These are the
 * six occasions this comparison actually answers something.
 *
 * ONE ACCENT, REPEATED — NOT SIX (requested). The reference design gave every row its
 * own hue and its own icon, and the colour there encodes nothing: these are six
 * unrelated prompts, not a scale or a set of categories. Six colours would be telling
 * the reader to look for a meaning that is not present. So every row takes the same
 * mint square the findings cards already use for their positive tone, and the rows
 * themselves sit on one neutral tint.
 *
 * STATIC, AND FREE. No data, no state, no request — six strings and one icon, rendered
 * only on the idle branch and replaced the moment a comparison is applied. It cannot
 * affect the applied page at all, on either breakpoint.
 */
const DO_YOU_KNOW = [
  "When your lease comes up for renewal, you can check if your operator has really performed?",
  "Before signing a new lease, you can compare that operator’s track record against others?",
  "During royalty talks, you can rely on real production numbers instead of promises?",
  "Some operators show lower production than expected — you can spot it in their history.",
  "If you’re unhappy with your operator, you can see who’s delivering better nearby?",
  "Not all counties perform the same — comparing nearby data shows where operators really shine.",
] as const;

function DoYouKnow() {
  return (
    // `mt-8` is the gap the removed prompt used to hold open above this panel —
    // without it the card sits hard against the filter bar.
    <section className="mt-8 rounded-2xl border border-mv-line bg-white p-6 shadow-mv max-[560px]:p-5">
      <h2 className="m-0 mb-[15px] font-sans text-[16px] font-bold leading-[1.3] text-mv-ink">
        Do you know?
      </h2>
      {/* Two columns on desktop, one below 760px — the same single-column fallback
          the card grids on this page take, so the whole page reflows together. */}
      <ul className="m-0 grid list-none grid-cols-2 gap-[10px] p-0 max-[760px]:grid-cols-1">
        {DO_YOU_KNOW.map((line) => (
          <li
            key={line}
            className="flex items-start gap-3 rounded-[12px] border border-mv-line-soft bg-mv-bg px-[14px] py-[12px] text-[13.5px] leading-[1.55] text-mv-ink-soft"
          >
            <span
              aria-hidden="true"
              className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-mv-tint text-mv-green-deep"
            >
              <Lightbulb className="h-[15px] w-[15px]" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ==========================================================================
   Generated read

   Every claim is one of the figures the comparison endpoint returned, phrased.
   Nothing here is model-generated text, which is why the eyebrow says
   "recomputed from the filed record" rather than implying otherwise.
   ========================================================================== */

/**
 * The read, as the same cards the operator detail page's "What changed" draws.
 *
 * SAME STRUCTURE, ON PURPOSE (requested). This was a dark panel of four numbered
 * sentences; it is now `ChangeItem` rows from `app/_components/change-item.tsx` — the
 * component that section uses — so the two read identically and cannot drift apart.
 *
 * THE GAIN IS THE EVIDENCE. A `ChangeRow` carries its working, so each claim opens
 * onto the figure for EVERY selected operator rather than only naming the winner.
 * That is the comparison the page is for, and the flat sentences could not show it.
 *
 * NO NEW REQUEST, ON EITHER BREAKPOINT. The findings are arithmetic over `info`, which
 * is already in memory, so this costs one `useMemo` over at most four operators and no
 * network at all. Only the open row is state, so expanding one re-renders this list and
 * nothing else on the page.
 */
function GeneratedRead({
  operators,
  leaders,
}: {
  operators: Compared[];
  leaders: ProductionLeaders | null;
}) {
  /** One row open at a time, keyed by headline — the same rule the panel follows. */
  const [openRow, setOpenRow] = useState<string | null>(null);

  const rows = useMemo(
    () => compareFindings(operators, leaders),
    [operators, leaders],
  );

  if (rows.length === 0) return null;

  return (
    <>
      {/* Heading and rows appear together. Rendering the heading outside would leave
          it standing over nothing whenever the response names no leaders. */}
      <SectionHead title="What this comparison is telling you" />
      <ul className="m-0 grid list-none gap-[10px] p-0">
        {rows.map((row) => (
          <ChangeItem
            key={row.headline}
            row={row}
            isOpen={openRow === row.headline}
            onToggle={() =>
              setOpenRow((current) =>
                current === row.headline ? null : row.headline,
              )
            }
          />
        ))}
      </ul>
    </>
  );
}

/* ==========================================================================
   Leaderboard
   ========================================================================== */

/**
 * The four leader tiles (set as requested).
 *
 * Cumulative volume and fastest growth are gone; most oil and most gas take their
 * place. Splitting the leader by commodity says something BOE cannot: the largest
 * producer overall is often neither the largest oil producer nor the largest gas
 * producer, and which one a mineral owner cares about depends on what their acreage
 * produces. Growth is no longer tiled or tabled — the momentum table was removed
 * with this page's other trimming — but it is still stated in the generated read
 * above, which is the one place left that reports it.
 */
/**
 * The four tiles, straight from `data.leaders`.
 *
 * THE API PICKS THE WINNERS, not this page. Each tile is one record the endpoint
 * returned under its own key, so the tiles and the "generated read" above cannot
 * disagree about who leads — which is exactly what happened when both computed it
 * independently from the same list.
 *
 * A TILE WITH NO RECORD IS NOT DRAWN. The response omits a leader it cannot name;
 * rendering a placeholder would imply the answer was "nobody" rather than "unknown".
 */
function Leaderboard({
  leaders,
  locked,
}: {
  leaders: ProductionLeaders | null;
  /**
   * True when the volumes were withheld.
   *
   * THREE OF THE FOUR TILES READ A WITHHELD FIELD — highest oil, highest gas and
   * most efficient per lease are all production figures, and all three parsed to
   * zero, so the board was announcing "HIGHEST OIL PRODUCED 0.0M bbl" as a
   * finding. Widest footprint counts counties, which the endpoint does not
   * withhold, so it keeps its real number and stays as it was.
   */
  locked: boolean;
}) {
  if (!leaders) return null;

  return (
    <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
      {leaders.highestOil ? (
        <LeaderTile
          Icon={Droplet}
          caption="Highest oil produced"
          value={formatMillions(leaders.highestOil.value)}
          locked={locked}
          unit="bbl"
          operator={leaders.highestOil}
          note="Filed oil across the selected acreage"
        />
      ) : null}
      {leaders.highestGas ? (
        <LeaderTile
          Icon={Flame}
          caption="Highest gas produced"
          value={formatMillions(leaders.highestGas.value)}
          locked={locked}
          unit="Mcf"
          operator={leaders.highestGas}
          note="Filed gas across the selected acreage"
        />
      ) : null}
      {leaders.mostEfficient ? (
        <LeaderTile
          Icon={Gauge}
          caption="Most efficient per lease"
          value={formatCount(Math.round(leaders.mostEfficient.value))}
          locked={locked}
          unit="MBOE / lease"
          operator={leaders.mostEfficient}
          note={
            leaders.mostEfficient.leaseCount === null
              ? "Per lease on record"
              : `From ${formatCount(leaders.mostEfficient.leaseCount)} leases on record`
          }
        />
      ) : null}
      {leaders.widestFootprint ? (
        <LeaderTile
          Icon={MapPin}
          caption="Widest footprint"
          value={String(leaders.widestFootprint.value)}
          unit="counties"
          operator={leaders.widestFootprint}
          note="Counties in scope for this comparison"
        />
      ) : null}
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
  locked = false,
}: {
  Icon: typeof Droplet;
  caption: string;
  value: string;
  unit: string;
  operator: ProductionLeader;
  note: string;
  /** True for a tile whose figure the endpoint withheld. Defaults to shown. */
  locked?: boolean;
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
      {/* The figure, or the lock that stands in for it. WHICH OPERATOR LEADS IS
          STILL NAMED BELOW — that ranking is real and is not withheld; it is only
          the size of the lead that needs an account. Withholding the name as well
          would give the tile nothing to say. */}
      <p className="mb-[9px] mt-[14px] text-[26px] font-bold leading-none tracking-[-.02em] tabular-nums text-mv-ink">
        {locked ? (
          <LockedFigure label={caption} />
        ) : (
          <>
            {value}{" "}
            <span className="text-[12px] font-semibold text-mv-muted">
              {unit}
            </span>
          </>
        )}
      </p>
      <p className="flex items-center gap-2 text-[13.5px] font-bold text-mv-ink">
        <OperatorLogo
          url={operator.logoUrl}
          monogram={operator.monogram}
          size={22}
          radius={7}
        />
        {shortName(operator.name)}
        <RankPill rank={operator.rankStatewide} />
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

function MixCard({ operators }: { operators: Compared[] }) {
  const rows = [...operators].sort((a, b) => b.oilPercent - a.oilPercent);

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
          <i
            aria-hidden="true"
            className="h-[14px] border-l-2 border-dashed border-mv-faint"
          />
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
            key={operator.operatorNumber}
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
                style={{ width: `${operator.oilPercent}%` }}
              >
                {Math.round(operator.oilPercent)}%
              </span>
              <span
                aria-hidden="true"
                className="flex flex-1 items-center justify-center text-[12px] font-bold text-mv-ink-soft"
              >
                {Math.round(operator.gasPercent)}%
              </span>
              <span className="sr-only">
                {operator.name}: {Math.round(operator.oilPercent)}% of its filed
                volume is oil, {Math.round(operator.gasPercent)}% gas.
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap items-start gap-2 rounded-[10px] border border-mv-line bg-mv-bg px-[14px] py-[11px] text-[12px] text-mv-ink-soft">
        <span className="shrink-0 rounded-full border border-mv-sand-line bg-mv-sand-tint px-[9px] py-[2px] font-bold text-mv-sand">
          Real filed split
        </span>
        {/* A VOLUMETRIC SPLIT, NOT A BOE SHARE. `oil_percentage` and
            `gas_percentage` divide raw barrels by raw Mcf and sum to 100 — Pioneer
            reads 26% oil here against 82% of its BOE, because BOE converts gas at
            15:1 and this does not. Calling it a BOE share would be wrong by a
            factor of three. */}
        <span className="min-w-0 flex-1">
          Share of filed volume from oil vs gas, across the whole record for the
          selected acreage. Oil-weighted operators generally realize more per
          barrel; gas-weighted ones swing with gas prices.
        </span>
      </p>
    </div>
  );
}

/* ==========================================================================
   Table

   Uses the site's dark table header, and scrolls sideways rather than shrink:
   dropping the header below 12px is exactly what the design's 11.5px did, and it
   is what the legible-font-size audit fails on.
   ========================================================================== */

const TH_BASE =
  "whitespace-nowrap bg-mv-table-head px-[15px] py-[13px] text-[12px] font-semibold uppercase tracking-[.04em] text-white";

const TD_BASE =
  "whitespace-nowrap border-b border-mv-line-soft bg-white px-[15px] py-[13px]";

function StatsTable({
  operators,
  locked,
}: {
  operators: Compared[];
  /** True when the response withheld the volumes — see `ProductionInfo.locked`. */
  locked: boolean;
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[13.5px]">
        <caption className="sr-only">
          Filed production and lease counts for the selected operators
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${TH_BASE} text-left`}>
              Metric
            </th>
            {operators.map((operator) => (
              <th
                key={operator.operatorNumber}
                scope="col"
                className={`${TH_BASE} text-right`}
              >
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
          {PRODUCTION_STAT_ROWS.map((row) => (
            <tr key={row.label} className="[&:hover>*]:bg-mv-row-hover">
              <th
                scope="row"
                className={`${TD_BASE} whitespace-normal text-left font-semibold text-mv-ink`}
              >
                {row.label}
              </th>
              {operators.map((operator) => (
                <td
                  key={operator.operatorNumber}
                  className={`${TD_BASE} text-right tabular-nums text-mv-ink-soft`}
                >
                  {/* `row.gated` names the rows built from a withheld field —
                      see `PRODUCTION_STAT_ROWS`. Without this they printed
                      "0.0M bbl", which is a figure, not a blank. */}
                  {locked && row.gated ? (
                    <LockedFigure label={row.label} />
                  ) : (
                    row.value(operator)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
