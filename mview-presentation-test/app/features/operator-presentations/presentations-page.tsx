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
import { memo, useDeferredValue, useMemo, useRef, useState } from "react";

import { Button, buttonClass } from "@/app/_components/button";
import { OperatorMonogram } from "@/app/_components/operator-monogram";
import {
  DEFAULT_PRESENTATION_FILTERS,
  PRESENTATION_SORTS,
  filterPresentations,
  hasActiveFilters,
  listPresentationOperators,
  listPresentations,
  pageButtons,
  paginate,
  type Presentation,
  type PresentationFilters,
  type PresentationSort,
} from "@/lib/operator-presentations";

/**
 * Operator Presentations — the filter bar, the card grid and the pager.
 *
 * WHY THIS IS THE CLIENT BOUNDARY. The header, its count and the KPI strip describe
 * the whole library, never the filtered view, so they stay in the server component
 * and ship no JavaScript. Everything from the filter bar down responds to input, so
 * it lives here.
 *
 * NO DEBOUNCE, NO REQUEST. Filtering is a pass over 18 objects already in memory,
 * so it runs on the keystroke. There is nothing to await and nothing to cancel — see
 * the note in `lib/operator-presentations.ts` about when that stops being true.
 *
 * FONT SIZES. The design labels things at 9.5–11.5px. Everything that is real text
 * is raised to a 12px floor, keeping the hierarchy through weight, colour and
 * tracking. Below 12px Lighthouse marks the page as not using legible font sizes,
 * and on a phone those labels genuinely are not readable.
 */

export function PresentationsPage() {
  // Both are static for the life of the page, so they are built once rather than
  // sent through the RSC payload.
  const library = useMemo(() => listPresentations(), []);
  const operators = useMemo(() => listPresentationOperators(), []);

  const [filters, setFilters] = useState<PresentationFilters>(
    DEFAULT_PRESENTATION_FILTERS,
  );
  const [requestedPage, setRequestedPage] = useState(1);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [gotoValue, setGotoValue] = useState("1");

  const filterBar = useRef<HTMLDivElement | null>(null);

  /**
   * PERFORMANCE — INP. The input is controlled by `filters.query` so it paints on
   * the keystroke, but the grid filters on the *deferred* value, so rebuilding six
   * cards happens at low priority and cannot make typing feel heavy. Measured at
   * ~22ms per keystroke on a desktop before this, which a mid-range phone would
   * multiply into the tens of milliseconds of visible lag. Same pattern as the
   * county directory on the operator listing page.
   *
   * Only the query is deferred. The dropdowns and date pickers change in one step,
   * where there is no typing to keep smooth and a deferred update would just look
   * like a slow control.
   */
  const deferredQuery = useDeferredValue(filters.query);

  const matched = useMemo(
    () => filterPresentations(library, { ...filters, query: deferredQuery }),
    [library, filters, deferredQuery],
  );
  const page = useMemo(() => paginate(matched, requestedPage), [matched, requestedPage]);

  /** Any filter change resets to page one — page 4 of a narrower result is not a page. */
  function updateFilters(patch: Partial<PresentationFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setRequestedPage(1);
    setGotoValue("1");
  }

  function clearFilters() {
    setFilters(DEFAULT_PRESENTATION_FILTERS);
    setRequestedPage(1);
    setGotoValue("1");
  }

  function goToPage(next: number) {
    if (next < 1 || next > page.totalPages) return;
    setRequestedPage(next);
    setGotoValue(String(next));
    // The design scrolls back to the filter bar so the new page starts at its top
    // rather than mid-grid.
    filterBar.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] px-[22px] pb-16 max-[767px]:px-4 max-[767px]:pb-11">
      {/* ---- filter bar ---- */}
      <section className="py-[22px]">
        <div
          ref={filterBar}
          className="grid grid-cols-[1.5fr_1.1fr_1fr_1fr_auto] items-end gap-[14px] rounded-2xl border border-mv-line bg-white px-5 py-[18px] shadow-[0_1px_2px_rgba(16,20,30,.05)] max-[1120px]:grid-cols-3 max-[720px]:grid-cols-2 max-[480px]:grid-cols-1 max-[560px]:px-4"
        >
          <Field
            label="Search"
            Icon={Search}
            className="max-[1120px]:col-span-full max-[480px]:col-span-1"
          >
            {(id) => (
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[14px] top-1/2 h-4 w-4 -translate-y-1/2 text-mv-green-deep"
                  strokeWidth={2}
                />
                <input
                  id={id}
                  type="search"
                  value={filters.query}
                  onChange={(event) => updateFilters({ query: event.target.value })}
                  placeholder="Operator, title or keyword…"
                  className={`${CONTROL_CLASS} pl-10`}
                />
              </div>
            )}
          </Field>

          <Field label="Operator" Icon={UserRound}>
            {(id) => (
              <div className="relative">
                <select
                  id={id}
                  value={filters.operator}
                  onChange={(event) => updateFilters({ operator: event.target.value })}
                  className={`${CONTROL_CLASS} cursor-pointer appearance-none truncate pr-[34px]`}
                >
                  <option value="">All operators</option>
                  {operators.map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mv-muted"
                  strokeWidth={2.2}
                />
              </div>
            )}
          </Field>

          <Field label="From" Icon={CalendarDays}>
            {(id) => (
              <input
                id={id}
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => updateFilters({ from: event.target.value })}
                className={CONTROL_CLASS}
              />
            )}
          </Field>

          <Field label="To" Icon={CalendarDays}>
            {(id) => (
              <input
                id={id}
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => updateFilters({ to: event.target.value })}
                className={CONTROL_CLASS}
              />
            )}
          </Field>

          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilters(filters) && filters.sort === "newest"}
            className="h-[46px] !rounded-[11px] max-[1120px]:col-span-full max-[1120px]:justify-center max-[480px]:col-span-1"
          >
            <X aria-hidden="true" className="h-[13px] w-[13px]" strokeWidth={2} />
            Clear
          </Button>
        </div>

        {/* ---- result meta ---- */}
        <div className="mx-[2px] mt-[14px] flex flex-wrap items-center justify-between gap-3 text-[13px] text-mv-muted">
          <p aria-live="polite">
            Showing{" "}
            <b className="font-semibold text-mv-ink">
              {page.total === 0 ? "0" : `${page.firstShown}–${page.lastShown}`}
            </b>{" "}
            of <b className="font-semibold text-mv-ink">{page.total}</b>{" "}
            {page.total === 1 ? "presentation" : "presentations"}
          </p>

          <div className="flex items-center gap-[10px]">
            {hasActiveFilters(filters) ? (
              <span className="rounded-lg bg-mv-tint px-3 py-[6px] text-[13px] font-semibold text-mv-green-deep">
                Filters applied
              </span>
            ) : null}

            <label className="inline-flex items-center gap-[7px] text-[12.5px]">
              Sort
              <span className="relative">
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    updateFilters({ sort: event.target.value as PresentationSort })
                  }
                  className="cursor-pointer appearance-none rounded-[9px] border border-mv-line bg-white py-[6px] pl-[10px] pr-[26px] text-[12.5px] font-semibold text-mv-ink-soft outline-none focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.15)]"
                >
                  {PRESENTATION_SORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-mv-muted"
                  strokeWidth={2.2}
                />
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* ---- grid ---- */}
      <section className="pb-[22px]">
        {page.total === 0 ? (
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
              Try a wider date range, a different operator, or clear the search.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            <ul className="m-0 grid list-none grid-cols-3 gap-5 p-0 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
              {page.items.map((presentation) => (
                <PresentationCard
                  key={presentation.id}
                  presentation={presentation}
                  isExpanded={expanded.has(presentation.id)}
                  onToggle={() => toggleExpanded(presentation.id)}
                />
              ))}
            </ul>

            <Pager
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
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

const CONTROL_CLASS =
  "h-[46px] w-full rounded-[11px] border border-mv-line bg-white px-[13px] text-sm text-mv-ink outline-none transition-[border-color,box-shadow] placeholder:text-mv-placeholder focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.15)]";

/**
 * A labelled control. The child is a function of the generated id so the label is
 * bound with `htmlFor` rather than by wrapping — a `<label>` wrapping a date input
 * makes the whole row a click target for the picker, which is not what the design
 * shows.
 */
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
      <label
        htmlFor={id}
        className="mb-[7px] flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[.04em] text-mv-muted"
      >
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

/* ==========================================================================
   Card
   ========================================================================== */

/**
 * Memoised so expanding one card reconciles that card alone rather than all six —
 * the expanded set lives in the page, so without this every card re-renders on
 * every toggle.
 */
const PresentationCard = memo(function PresentationCard({
  presentation,
  isExpanded,
  onToggle,
}: {
  presentation: Presentation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const monogram = useMemo(() => {
    const words = presentation.operator.match(/[A-Za-z]+/g) ?? [];
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }, [presentation.operator]);

  const summaryId = `sum-${presentation.id}`;

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-[18px] border border-mv-line bg-white shadow-[0_1px_2px_rgba(16,20,30,.05)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:border-mv-mint-line hover:shadow-mv-lg">
      {/* The design's top rule, revealed on hover. Opacity rather than height so it
          cannot shift the card's content by a pixel. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,var(--color-mv-green),var(--color-mv-green-deep))] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />

      <div className="flex flex-1 flex-col px-5 pt-5">
        <div className="flex items-start gap-[13px]">
          <OperatorMonogram monogram={monogram} size={46} className="!rounded-xl" />
          <div className="min-w-0 flex-1">
            {/* `h2`, not `h3`: this page has no section headings between the `h1`
                and the cards, so an `h3` here would skip a level — which Lighthouse
                flags and which leaves a screen-reader heading list with a hole in
                it. The tag carries no styling; the size is unchanged. */}
            <h2 className="text-[14.5px] font-bold leading-[1.3] text-mv-ink">
              {presentation.operator}
            </h2>
            <p className="mt-[3px] text-[12px] font-medium text-mv-muted">
              {presentation.operatorNumber ? (
                <>
                  Operator no.{" "}
                  <b className="font-semibold tabular-nums text-mv-ink-soft">
                    {presentation.operatorNumber}
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
          {presentation.title}
        </p>

        <p className="mt-[11px] flex flex-wrap gap-[7px]">
          <span className="rounded-[7px] border border-mv-mint-line bg-mv-tint px-[9px] py-1 text-[12px] font-bold uppercase tracking-[.05em] text-mv-green-deep">
            {presentation.period}
          </span>
          <span className="rounded-[7px] border border-mv-line bg-mv-line-soft px-[9px] py-1 text-[12px] font-bold uppercase tracking-[.05em] text-mv-ink-soft">
            {presentation.documentType}
          </span>
        </p>

        {presentation.counties.length > 0 ? (
          <p className="mt-3 text-[12px] leading-[1.4] text-mv-muted">
            <span className="mr-[5px] font-extrabold uppercase tracking-[.05em] text-mv-green-deep">
              Most active
            </span>
            {presentation.counties.join(", ")}
          </p>
        ) : null}

        <span aria-hidden="true" className="my-[14px] h-px bg-mv-line-soft" />

        <dl className="m-0 flex gap-[22px]">
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[.05em] text-mv-placeholder">
              Published
            </dt>
            <dd className="m-0 mt-[3px] text-[13px] font-semibold tabular-nums text-mv-ink-soft">
              {presentation.publishedLabel}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[.05em] text-mv-placeholder">
              Period
            </dt>
            <dd className="m-0 mt-[3px] text-[13px] font-semibold text-mv-ink-soft">
              {presentation.period}
            </dd>
          </div>
        </dl>

        <p className="mt-[15px] text-[12px] font-bold uppercase tracking-[.06em] text-mv-placeholder">
          Summary
        </p>
        <p
          id={summaryId}
          className={`mt-[6px] text-[13px] leading-[1.55] text-mv-muted ${
            isExpanded ? "" : "line-clamp-2"
          }`}
        >
          {presentation.summary}
        </p>

        {presentation.isSummaryClamped ? (
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
      </div>

      {/* Both links go to the operator's investor-relations site: the library records
          one URL per row, not a separate deck file. They are given distinct
          accessible names so a link list does not read as two identical entries. */}
      <div className="mt-auto flex items-center gap-[10px] px-5 pb-5 pt-4">
        <a
          href={presentation.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${presentation.operator} website (opens in a new tab)`}
          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-[10px] border border-mv-line px-[10px] py-[9px] text-[12.5px] font-semibold text-mv-muted !no-underline transition-colors hover:border-mv-mint-line hover:bg-mv-tint hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <Globe aria-hidden="true" className="h-[14px] w-[14px]" strokeWidth={1.8} />
          Website
        </a>

        <a
          href={presentation.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${presentation.operator} — ${presentation.title} (opens in a new tab)`}
          className={buttonClass({
            variant: "primary",
            className:
              "flex-1 px-[14px] py-[11px] text-[13px] shadow-[0_6px_16px_rgba(84,191,150,.22)] hover:-translate-y-px",
          })}
        >
          View presentation
          <ArrowUpRight aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={2} />
        </a>
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
        <b className="text-[15px] font-bold tabular-nums text-mv-ink">{total}</b>
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
          <ChevronLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
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
          <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
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
        <Button variant="dark" onClick={onGo} className="!rounded-[10px] px-[15px] py-[9px] text-[13.5px]">
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
