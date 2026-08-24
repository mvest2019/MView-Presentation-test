"use client";

import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

import { Button, buttonClass } from "@/app/_components/button";
import { OperatorLogo } from "@/app/_components/operator-logo";
import type { PresentationRecord } from "@/lib/operator-presentations-shape";
import {
  pageButtons,
  publishedLabel,
  quarterLabel,
} from "@/lib/presentation-paging";

import { OperatorSelect } from "./_components/operator-select";
import { usePresentations } from "./_components/use-presentations";

/**
 * Operator presentations — everything below the page header.
 *
 * THE FILTERS ARE A DRAFT UNTIL APPLIED. Editing a control changes the form and
 * nothing else; "Apply filters" is what becomes a request. That is the flow asked
 * for, and it is also what makes the date rule enforceable: the endpoint accepts a
 * single date and silently ignores it, so a live-filtering bar would quietly show
 * unfiltered results the moment someone picked a From date and before they reached
 * the To. Nothing is sent until the pair is complete.
 *
 * PAGING IS THE SERVER'S. `/operators/presentations` returns six records with
 * `totalCount`, `totalPages` and `currentPage`, so the pager reflects the response
 * rather than a client-side slice of a set the browser never holds.
 *
 * NO SEARCH BOX AND NO SORT CONTROL, because the endpoint has neither — a `search`
 * field is accepted and ignored, and there is no ordering parameter. Filtering the
 * six rows on screen would have looked like filtering all 190.
 */

/**
 * The filter controls, minus their border colour.
 *
 * SPLIT SO THE INVALID STATE CAN SWAP THE COLOUR RATHER THAN OVERRIDE IT. Appending
 * a second border-colour utility means relying on `!important` to win, which only
 * works if the scanner emits the important variant — and it is one utility fighting
 * another for no reason. One colour class at a time is what the framework expects.
 */
const CONTROL_BASE =
  "h-[46px] w-full rounded-[11px] border bg-white px-[13px] text-sm text-mv-ink outline-none transition-[border-color,box-shadow] placeholder:text-mv-placeholder focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.15)]";

const CONTROL_CLASS = `${CONTROL_BASE} border-mv-line focus-visible:border-mv-green`;

/** Past this many characters the summary is clamped and offered a "Read more". */
const SUMMARY_CLAMP = 130;

interface FilterForm {
  operator: string;
  /**
   * The chosen operator's number, kept for display only.
   *
   * It never reaches the request — the endpoint matches on the name — so it is
   * deliberately left out of the query key below. Carrying it means the "Applied"
   * chip can name the same number the dropdown row showed.
   */
  operatorNumber: string | null;
  from: string;
  to: string;
}

const EMPTY_FORM: FilterForm = {
  operator: "",
  operatorNumber: null,
  from: "",
  to: "",
};

/**
 * The date rule, in one place.
 *
 * BOTH OR NEITHER. One date alone is not a range the endpoint can honour, and it
 * answers such a request with the unfiltered set — so this is what stops a filter
 * from appearing to do nothing. The route enforces the same rule, because a
 * hand-made request must not be able to send half a range either.
 */
/** Which control a message belongs under. */
type FilterField = "from" | "to";

interface Problem {
  field: FilterField;
  message: string;
}

function validate(form: FilterForm): Problem | null {
  const hasFrom = form.from !== "";
  const hasTo = form.to !== "";

  /* The message is attached to the EMPTY field, not to the one that was filled in:
     the empty one is what has to change, so that is where the reader is looking.

     KEPT SHORT ON PURPOSE. These columns are a third of the bar wide, and a longer
     sentence wraps to a second line and grows the whole filter card — the reserved
     message row is one line high. */
  if (hasFrom !== hasTo) {
    return hasFrom
      ? { field: "to", message: "Pick a To date as well." }
      : {
          field: "from",
          message: "Pick a From date as well.",
        };
  }
  // Both are `YYYY-MM-DD`, so comparing them as strings compares them as dates.
  if (hasFrom && hasTo && form.from > form.to) {
    return { field: "to", message: "Cannot precede the From date." };
  }
  return null;
}

const hasFilters = (form: FilterForm) =>
  form.operator !== "" || form.from !== "" || form.to !== "";

export function PresentationsPage() {
  const [form, setForm] = useState<FilterForm>(EMPTY_FORM);
  /** What is actually in effect — only "Apply filters" moves the form into here. */
  const [applied, setApplied] = useState<FilterForm>(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [gotoValue, setGotoValue] = useState("1");

  /* Built field by field rather than spread, so `operatorNumber` — which is for
     display and is not part of the request — cannot leak into the cache key and
     split one query into two entries. */
  const query = useMemo(
    () => ({
      operator: applied.operator,
      from: applied.from,
      to: applied.to,
      page,
    }),
    [applied.operator, applied.from, applied.to, page],
  );
  const { state, retry } = usePresentations(query);

  const result = state.status === "ready" ? state.result : null;
  const totalPages = result?.totalPages ?? 1;
  const totalCount = result?.totalCount ?? 0;

  function applyFilters() {
    const message = validate(form);
    setProblem(message);
    if (message) return;

    setApplied(form);
    setPage(1);
    setGotoValue("1");
  }

  function clearFilters() {
    setForm(EMPTY_FORM);
    setApplied(EMPTY_FORM);
    setProblem(null);
    setPage(1);
    setGotoValue("1");
  }

  const goToPage = useCallback(
    (next: number) => {
      if (next < 1 || next > totalPages) return;
      setPage(next);
      setGotoValue(String(next));
      // The design returns to the top of the results so a new page starts at its
      // first card rather than mid-grid. `scroll-margin-top` clears the header.
      document.getElementById("pp-results")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    },
    [totalPages],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* Which records are on screen, and the range they cover. Derived from the
     response's own page number so the label cannot disagree with the rows. */
  /* What is in effect, as labelled chips. Cheap, but it runs on every render
     otherwise and it is read in the markup below. */
  const appliedChips = useMemo(() => {
    const chips: { label: string; value: string }[] = [];
    if (applied.operator) {
      chips.push({
        label: "Operator",
        value: applied.operatorNumber
          ? `${applied.operator} · no. ${applied.operatorNumber}`
          : applied.operator,
      });
    }
    if (applied.from && applied.to) {
      chips.push({
        label: "Published",
        value: `${applied.from} to ${applied.to}`,
      });
    }
    return chips;
  }, [applied]);

  const records = result?.records ?? [];
  const firstShown = totalCount === 0 ? 0 : (page - 1) * 6 + 1;
  const lastShown = Math.min(page * 6, totalCount);

  return (
    <div className="mx-auto max-w-[1200px] px-[22px] pb-16 max-[767px]:px-4 max-[767px]:pb-11">
      {/* ---- filter bar ---- */}
      <section className="py-[22px]">
        {/* `items-start` now that every column is the same height: the labels sit
            on one line and the controls on one line at every breakpoint. */}
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-start gap-x-[14px] gap-y-1 rounded-2xl border border-mv-line bg-white px-5 py-[18px] shadow-[0_1px_2px_rgba(16,20,30,.05)] max-[1120px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] max-[720px]:grid-cols-2 max-[480px]:grid-cols-1 max-[560px]:px-4">
          <Field label="Operator" Icon={UserRound}>
            {(id) => (
              <>
                <OperatorSelect
                  id={id}
                  value={form.operator}
                  onChange={(operator, operatorNumber) =>
                    setForm((f) => ({ ...f, operator, operatorNumber }))
                  }
                  className={CONTROL_CLASS}
                />
                {/* Reserved, so this column is exactly as tall as the date ones. */}
                <p aria-hidden="true" className={MESSAGE_ROW} />
              </>
            )}
          </Field>

          <Field label="From" Icon={CalendarDays}>
            {(id) => (
              <DateInput
                id={id}
                value={form.from}
                onChange={(from) => setForm((f) => ({ ...f, from }))}
                problem={problem?.field === "from" ? problem.message : null}
              />
            )}
          </Field>

          <Field label="To" Icon={CalendarDays}>
            {(id) => (
              <DateInput
                id={id}
                value={form.to}
                onChange={(to) => setForm((f) => ({ ...f, to }))}
                problem={problem?.field === "to" ? problem.message : null}
              />
            )}
          </Field>

          {/* Both buttons take the controls' height and radius so the row reads as
              one band. Apply keeps the house filled variant, Clear stays outline
              beside it, and neither stretches to fill its column. */}
          <ButtonField>
            <Button
              variant="primary"
              onClick={applyFilters}
              className="h-[46px] w-full whitespace-nowrap !rounded-[11px] px-[18px]"
            >
              Apply filters
            </Button>
          </ButtonField>

          <ButtonField>
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={!hasFilters(form) && !hasFilters(applied)}
              className="h-[46px] w-full whitespace-nowrap !rounded-[11px] px-[16px]"
            >
              <X
                aria-hidden="true"
                className="h-[13px] w-[13px]"
                strokeWidth={2}
              />
              Clear
            </Button>
          </ButtonField>
        </div>

        {/* ---- result meta ---- */}
        <div className="mx-[2px] mt-[14px] flex flex-wrap items-center justify-between gap-3 text-[13px] text-mv-muted">
          <p aria-live="polite">
            {state.status === "loading" ? (
              "Loading presentations…"
            ) : (
              <>
                Showing{" "}
                <b className="font-semibold text-mv-ink">
                  {totalCount === 0 ? "0" : `${firstShown}–${lastShown}`}
                </b>{" "}
                of <b className="font-semibold text-mv-ink">{totalCount}</b>{" "}
                {totalCount === 1 ? "presentation" : "presentations"}
              </>
            )}
          </p>

          {/* Which filters are in effect, named rather than merely counted — with
              the operator's number where the picker captured one, so the chip says
              the same thing the dropdown row did. */}
          {appliedChips.length > 0 ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-[.05em] text-mv-placeholder">
                Applied
              </span>
              {appliedChips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-[6px] rounded-lg border border-mv-mint-line bg-mv-tint px-[10px] py-[5px] text-[12.5px] font-semibold text-mv-green-deep"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[.05em] opacity-70">
                    {chip.label}
                  </span>
                  {chip.value}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </section>

      {/* ---- grid ---- */}
      <section id="pp-results" className="scroll-mt-[80px] pb-[22px]">
        {state.status === "loading" ? (
          <ul className="m-0 grid list-none grid-cols-3 gap-5 p-0 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
            {Array.from({ length: 6 }, (_, index) => (
              <li
                key={index}
                aria-hidden="true"
                className="h-[420px] animate-pulse rounded-[18px] border border-mv-line bg-white shadow-[0_1px_2px_rgba(16,20,30,.05)]"
              />
            ))}
          </ul>
        ) : state.status === "error" ? (
          <div
            role="alert"
            className="rounded-[18px] border border-mv-line bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,20,30,.05)]"
          >
            <p className="mb-[6px] font-sans text-[18px] font-bold leading-[1.3] text-mv-ink">
              Presentations could not be loaded.
            </p>
            <p className="mb-[18px] text-sm text-mv-muted">
              The library is temporarily unavailable. Your filters are still
              here.
            </p>
            <Button variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-mv-line bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,20,30,.05)]">
            <span
              aria-hidden="true"
              className="mb-[14px] inline-grid h-[54px] w-[54px] place-items-center rounded-[14px] bg-mv-tint text-mv-green-deep"
            >
              <Search className="h-6 w-6" strokeWidth={1.9} />
            </span>
            <p className="mb-[6px] font-sans text-[18px] font-bold leading-[1.3] text-mv-ink">
              No presentations match your filters.
            </p>
            <p className="mb-[18px] text-sm text-mv-muted">
              Try a wider date range or a different operator.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            <ul className="m-0 grid list-none grid-cols-3 gap-5 p-0 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
              {records.map((record) => (
                <PresentationCard
                  key={record.id}
                  record={record}
                  isExpanded={expanded.has(record.id)}
                  onToggle={() => toggleExpanded(record.id)}
                />
              ))}
            </ul>

            <Pager
              page={page}
              totalPages={totalPages}
              total={totalCount}
              gotoValue={gotoValue}
              onGotoChange={setGotoValue}
              onGo={() => goToPage(Number.parseInt(gotoValue, 10) || 1)}
              onPage={goToPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

/* ==========================================================================
   Filter-bar plumbing
   ========================================================================== */

/**
 * A labelled control. The child is a function of the generated id so the label is
 * bound with `htmlFor` rather than by wrapping — a `<label>` wrapping a date input
 * makes the whole row a click target for the picker, which is not what the design
 * shows.
 */
/**
 * One column of the filter bar: a label row, a control, and a message row.
 *
 * ALL THREE ROWS EXIST IN EVERY COLUMN, INCLUDING THE BUTTONS', AND THAT IS THE
 * WHOLE POINT. The bar was misaligned because only the date fields carried a
 * validation message: that made those two columns taller, and an `items-end` grid
 * pushed the Operator label and its box down to meet their bottoms. Giving every
 * column the same fixed label height and the same reserved message row lines the
 * controls up by construction — and a message appearing never moves anything.
 */
const LABEL_ROW =
  "mb-[7px] flex h-4 items-center gap-[7px] text-[12px] font-bold uppercase tracking-[.04em] text-mv-muted";

const MESSAGE_ROW =
  "mt-[5px] min-h-4 text-[12px] font-semibold leading-4 text-mv-red";

function Field({
  label,
  Icon,
  className = "",
  children,
}: {
  label: string;
  Icon: typeof Search;
  className?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = `pp-${label.toLowerCase()}`;

  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={LABEL_ROW}>
        <Icon
          aria-hidden="true"
          className="h-[14px] w-[14px] shrink-0 text-mv-green-deep"
          strokeWidth={1.9}
        />
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/**
 * A button column, with the same spacers above and below so the button sits on the
 * controls' baseline rather than hanging below them. `aria-hidden` because there is
 * nothing here to read.
 */
function ButtonField({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span aria-hidden="true" className={LABEL_ROW} />
      {children}
      <p aria-hidden="true" className={MESSAGE_ROW} />
    </div>
  );
}

/**
 * A date input that carries its own validation message.
 *
 * THE MESSAGE SITS UNDER THE FIELD IT CONCERNS, not in a banner elsewhere, so the
 * control that has to change is the one being pointed at. `aria-invalid` and
 * `aria-describedby` tie the two together, so a screen reader announces the reason
 * when focus lands on the field rather than leaving it to be discovered.
 *
 * The row keeps its height whether or not a message is showing, so one appearing
 * cannot nudge the grid below it.
 */
function DateInput({
  id,
  value,
  onChange,
  problem,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  problem: string | null;
}) {
  const messageId = `${id}-error`;

  return (
    <>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? messageId : undefined}
        className={`${CONTROL_BASE} ${
          problem
            ? "border-mv-red focus-visible:border-mv-red"
            : "border-mv-line focus-visible:border-mv-green"
        }`}
      />
      <p id={messageId} aria-live="polite" className={MESSAGE_ROW}>
        {problem}
      </p>
    </>
  );
}

/* ==========================================================================
   Card
   ========================================================================== */

/**
 * Memoised so expanding one card reconciles that card alone rather than all six —
 * the expanded set lives in the page, so without this every card re-renders on
 * every toggle.
 */
const PresentationCard = memo(function PresentationCard({
  record,
  isExpanded,
  onToggle,
}: {
  record: PresentationRecord;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const monogram = useMemo(() => {
    const words = record.operatorName.match(/[A-Za-z]+/g) ?? [];
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }, [record.operatorName]);

  const summaryId = `sum-${record.id}`;
  const period = quarterLabel(record.publishedDate);
  const isClamped = record.summary.length > SUMMARY_CLAMP;
  const deckUrl = record.presentationUrl ?? record.website;

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-[18px] border border-mv-line bg-white shadow-[0_1px_2px_rgba(16,20,30,.05)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:border-mv-mint-line hover:shadow-mv-lg">
      <div className="flex flex-1 flex-col px-5 pt-5">
        <div className="flex items-start gap-[13px]">
          {/* The response carries `operator_logo`, so the real mark shows where
              there is one and the initials stand in where there is not. */}
          <OperatorLogo
            url={record.logoUrl}
            monogram={monogram}
            size={46}
            radius={12}
            monogramClassName="!rounded-xl"
          />
          <div className="min-w-0 flex-1">
            {/* `h2`, not `h3`: this page has no section headings between the `h1`
                and the cards, so an `h3` here would skip a level. */}
            <h2 className="text-[14.5px] font-bold leading-[1.3] text-mv-ink">
              {record.operatorName}
            </h2>
            <p className="mt-[3px] text-[12px] font-medium text-mv-muted">
              {record.operatorNumber ? (
                <>
                  Operator no.{" "}
                  <b className="font-semibold tabular-nums text-mv-ink-soft">
                    {record.operatorNumber}
                  </b>
                </>
              ) : (
                // Stated rather than left blank: several of these are public issuers
                // with no Texas registration, and an empty line reads as missing data.
                "Public issuer · not RRC-numbered"
              )}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[13.5px] font-semibold leading-[1.4] text-mv-ink-soft">
          {record.title}
        </p>

        {/* One chip, not two. The quarter follows from the published date; the
            document type the old fixture showed has no field in this response, and
            a guessed label on a real record is worse than no label. */}
        {period ? (
          <p className="mt-[11px] flex flex-wrap gap-[7px]">
            <span className="rounded-[7px] border border-mv-mint-line bg-mv-tint px-[9px] py-1 text-[12px] font-bold uppercase tracking-[.05em] text-mv-green-deep">
              {period}
            </span>
          </p>
        ) : null}

        <span aria-hidden="true" className="my-[14px] h-px bg-mv-line-soft" />

        <dl className="m-0 flex gap-[22px]">
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[.05em] text-mv-placeholder">
              Published
            </dt>
            <dd className="m-0 mt-[3px] text-[13px] font-semibold tabular-nums text-mv-ink-soft">
              {publishedLabel(record.publishedDate) || "—"}
            </dd>
          </div>
          {period ? (
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-[.05em] text-mv-placeholder">
                Period
              </dt>
              <dd className="m-0 mt-[3px] text-[13px] font-semibold text-mv-ink-soft">
                {period}
              </dd>
            </div>
          ) : null}
        </dl>

        {record.summary ? (
          <>
            <p className="mt-[15px] text-[12px] font-bold uppercase tracking-[.06em] text-mv-placeholder">
              Summary
            </p>
            <p
              id={summaryId}
              className={`mt-[6px] text-[13px] leading-[1.55] text-mv-muted ${
                isExpanded ? "" : "line-clamp-2"
              }`}
            >
              {record.summary}
            </p>

            {isClamped ? (
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={isExpanded}
                aria-controls={summaryId}
                className="mt-[7px] inline-flex cursor-pointer items-center gap-1 self-start border-0 bg-transparent p-0 text-[12.5px] font-bold text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                {isExpanded ? "Read less" : "Read more"}
                <ChevronDown
                  aria-hidden="true"
                  className={`h-[13px] w-[13px] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  strokeWidth={2.4}
                />
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Two genuinely different destinations now: `website` is the operator's
          investor-relations page and `presentation_url` is the deck itself. Each is
          rendered only when the record has it. */}
      <div className="mt-auto flex items-center gap-[10px] px-5 pb-5 pt-4">
        {record.website ? (
          <a
            href={record.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${record.operatorName} website (opens in a new tab)`}
            className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-[10px] border border-mv-line px-[10px] py-[9px] text-[12.5px] font-semibold text-mv-muted !no-underline transition-colors hover:border-mv-mint-line hover:bg-mv-tint hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
          >
            <Globe
              aria-hidden="true"
              className="h-[14px] w-[14px]"
              strokeWidth={1.8}
            />
            Website
          </a>
        ) : null}

        {deckUrl ? (
          <a
            href={deckUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${record.operatorName} — ${record.title} (opens in a new tab)`}
            className={buttonClass({
              variant: "primary",
              className:
                "flex-1 px-[14px] py-[11px] text-[13px] shadow-[0_6px_16px_rgba(84,191,150,.22)] hover:-translate-y-px",
            })}
          >
            View presentation
            <ArrowUpRight
              aria-hidden="true"
              className="h-[15px] w-[15px]"
              strokeWidth={2}
            />
          </a>
        ) : null}
      </div>
    </li>
  );
});

/* ==========================================================================
   Pager
   ========================================================================== */

function Pager({
  page,
  totalPages,
  total,
  gotoValue,
  onGotoChange,
  onGo,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  gotoValue: string;
  onGotoChange: (value: string) => void;
  onGo: () => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-[26px] flex flex-wrap items-center justify-between gap-[18px] rounded-[14px] border border-mv-line bg-white px-5 py-[14px] shadow-[0_1px_2px_rgba(16,20,30,.05)]">
      <p className="text-[13px] text-mv-muted">
        Total records:{" "}
        <b className="text-[15px] font-bold tabular-nums text-mv-ink">
          {total}
        </b>
      </p>

      <nav
        aria-label="Presentations pagination"
        className="flex flex-wrap items-center justify-center gap-[6px]"
      >
        <PageButton
          label="Previous page"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft
            aria-hidden="true"
            className="h-4 w-4"
            strokeWidth={2.4}
          />
        </PageButton>

        {pageButtons(page, totalPages).map((value, index) =>
          value === null ? (
            <span
              // The ellipsis positions are stable for a given page, so the index is a
              // sound key here.
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-[2px] font-bold text-mv-placeholder"
            >
              …
            </span>
          ) : (
            <PageButton
              key={value}
              label={`Page ${value}`}
              current={value === page}
              onClick={() => onPage(value)}
            >
              {value}
            </PageButton>
          ),
        )}

        <PageButton
          label="Next page"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4"
            strokeWidth={2.4}
          />
        </PageButton>
      </nav>

      <div className="flex items-center gap-2 text-[13px] text-mv-muted">
        <label htmlFor="pp-goto">Go to page</label>
        <input
          id="pp-goto"
          type="number"
          inputMode="numeric"
          min={1}
          max={totalPages}
          value={gotoValue}
          onChange={(event) => onGotoChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onGo();
            }
          }}
          className="w-[58px] rounded-[10px] border border-mv-line bg-white px-[10px] py-[9px] text-center text-[13.5px] tabular-nums text-mv-ink outline-none focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.15)]"
        />
        <Button
          variant="dark"
          onClick={onGo}
          className="!rounded-[10px] px-[15px] py-[9px] text-[13.5px]"
        >
          Go
        </Button>
      </div>
    </div>
  );
}

function PageButton({
  label,
  current = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-[38px] min-w-[38px] cursor-pointer place-items-center rounded-[10px] border px-[11px] text-[13.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-default disabled:opacity-40 ${
        current
          ? "border-mv-green bg-mv-green text-mv-green-ink"
          : "border-mv-line bg-white text-mv-ink-soft enabled:hover:border-mv-mint-line enabled:hover:bg-mv-tint enabled:hover:text-mv-green-deep"
      }`}
    >
      {children}
    </button>
  );
}
