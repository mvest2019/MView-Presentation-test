/**
 * Operator Presentations — filtering, sorting, paging and the derived labels, with
 * no React in it.
 *
 * THE SEAM. The page never touches `operator-presentations-data`. It calls
 * `listPresentations()` once for the whole library, `presentationsSummary()` for the
 * header counts, and `filterPresentations()` / `paginate()` for the grid. Those
 * become async reads when an endpoint exists, and nothing above this file changes
 * shape — `Presentation` is already the view model.
 *
 * FILTERING IS LOCAL, DELIBERATELY. All 18 rows arrive in the first response, so
 * narrowing them needs no further request and no debounce: the whole library is a
 * few kilobytes, and a round trip per keystroke would be slower and worse. If the
 * library grows past a few hundred rows this is the function that moves to the
 * server, and the page keeps its shape.
 */

import {
  OPERATOR_PRESENTATIONS,
  type OperatorPresentationRecord,
} from "./operator-presentations-data";

/** Cards per page — the design's `PER`. */
export const PRESENTATIONS_PER_PAGE = 6;

export type PresentationSort = "newest" | "oldest" | "operator";

export const PRESENTATION_SORTS: readonly {
  value: PresentationSort;
  label: string;
}[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "operator", label: "Operator A–Z" },
];

/** Every filter the bar can apply. All empty means "the whole library". */
export interface PresentationFilters {
  query: string;
  operator: string;
  /** ISO `YYYY-MM-DD`, inclusive. */
  from: string;
  /** ISO `YYYY-MM-DD`, inclusive. */
  to: string;
  sort: PresentationSort;
}

export const DEFAULT_PRESENTATION_FILTERS: PresentationFilters = {
  query: "",
  operator: "",
  from: "",
  to: "",
  sort: "newest",
};

/** True when anything is narrowing the library — drives the "Filters applied" chip. */
export function hasActiveFilters(filters: PresentationFilters): boolean {
  return Boolean(filters.query || filters.operator || filters.from || filters.to);
}

/** A presentation with its derived labels resolved. */
export interface Presentation extends OperatorPresentationRecord {
  /** `Q2 2026`, from the publication date. */
  period: string;
  /** `Earnings`, `Results`, `Update`, `Supplement`, `Meetings` or `Investor deck`. */
  documentType: string;
  /** `Jun 22, 2026`. */
  publishedLabel: string;
  /** Most-active counties, title-cased. */
  counties: string[];
  /** Whether the two-line clamp will actually hide anything — see below. */
  isSummaryClamped: boolean;
  /** Lower-cased haystack the search box matches against. */
  haystack: string;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * `2026-06-22` -> `Jun 22, 2026`. Formatted from the ISO parts rather than through
 * `new Date()`: a bare date string is parsed as UTC and then printed in the
 * viewer's zone, which turns the 1st of a month into the last day of the previous
 * one for anybody west of Greenwich — and would differ between the server render
 * and the browser.
 */
export function formatPublished(iso: string): string {
  const [year, month, day] = iso.split("-");
  const monthName = MONTHS[Number(month) - 1] ?? month;
  return `${monthName} ${Number(day)}, ${year}`;
}

/** `2026-06-22` -> `Q2 2026`. */
export function quarterOf(iso: string): string {
  const [year, month] = iso.split("-");
  return `Q${Math.floor((Number(month) - 1) / 3) + 1} ${year}`;
}

/** The document kind, read off the title — the design's `typeTag`. */
export function documentTypeOf(title: string): string {
  const text = title.toLowerCase();
  if (text.includes("earnings")) return "Earnings";
  if (text.includes("result")) return "Results";
  if (text.includes("update")) return "Update";
  if (text.includes("supplement")) return "Supplement";
  if (text.includes("meeting")) return "Meetings";
  return "Investor deck";
}

/**
 * Roughly how many characters fit in the summary's two-line clamp.
 *
 * The design decides whether to show "Read more" by comparing the paragraph's
 * `scrollHeight` to its `clientHeight` after render. That needs a layout read per
 * card on every filter change, and it silently does the wrong thing wherever layout
 * is not available yet — during a server render, or before the first frame.
 *
 * This is an estimate instead: the summary is 13px in a card about 330px wide at
 * every breakpoint the grid produces, which is close to 50 characters a line, so two
 * lines hold about 100. Being a little wrong is cosmetic — a "Read more" that
 * reveals one extra word, or a summary two characters shy of the clamp with no
 * toggle — and it is worth that to have the answer be the same on the server as in
 * the browser, with no measurement at all.
 */
const CLAMP_CHARACTERS = 100;

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function toPresentation(record: OperatorPresentationRecord): Presentation {
  return {
    ...record,
    period: quarterOf(record.publishedOn),
    documentType: documentTypeOf(record.title),
    publishedLabel: formatPublished(record.publishedOn),
    counties: record.topCounties.map(titleCase),
    isSummaryClamped: record.summary.length > CLAMP_CHARACTERS,
    haystack:
      `${record.operator} ${record.title} ${record.summary} ${record.operatorNumber ?? ""}`.toLowerCase(),
  };
}

/** The whole library, newest first. */
export function listPresentations(): Presentation[] {
  return OPERATOR_PRESENTATIONS.map(toPresentation);
}

/** The distinct operators, for the Operator dropdown. Alphabetical. */
export function listPresentationOperators(): string[] {
  return [...new Set(OPERATOR_PRESENTATIONS.map((record) => record.operator))].sort(
    (a, b) => a.localeCompare(b),
  );
}

export interface PresentationsSummary {
  total: number;
  operators: number;
  /** The most recent publication date in the library. */
  latest: string;
  latestLabel: string;
  /** The quarter that date falls in. */
  latestPeriod: string;
  /** How many presentations fall in that quarter. */
  inLatestPeriod: number;
}

/**
 * The header count and the KPI strip. Describes the whole library, not the filtered
 * view, which is why it can be computed once on the server and never re-run.
 */
export function presentationsSummary(): PresentationsSummary {
  const dates = OPERATOR_PRESENTATIONS.map((record) => record.publishedOn).sort();
  const latest = dates.at(-1) ?? "";
  const latestPeriod = latest ? quarterOf(latest) : "";

  return {
    total: OPERATOR_PRESENTATIONS.length,
    operators: new Set(OPERATOR_PRESENTATIONS.map((record) => record.operator)).size,
    latest,
    latestLabel: latest ? formatPublished(latest) : "—",
    latestPeriod,
    inLatestPeriod: OPERATOR_PRESENTATIONS.filter(
      (record) => quarterOf(record.publishedOn) === latestPeriod,
    ).length,
  };
}

/**
 * Apply the filters and the sort. Date comparison is string comparison, which is
 * correct and total for ISO `YYYY-MM-DD` — no `Date` objects, so no timezone in the
 * results either.
 */
export function filterPresentations(
  presentations: Presentation[],
  filters: PresentationFilters,
): Presentation[] {
  const needle = filters.query.trim().toLowerCase();

  const matched = presentations.filter((presentation) => {
    if (filters.operator && presentation.operator !== filters.operator) return false;
    if (filters.from && presentation.publishedOn < filters.from) return false;
    if (filters.to && presentation.publishedOn > filters.to) return false;
    if (needle && !presentation.haystack.includes(needle)) return false;
    return true;
  });

  return matched.sort((a, b) => {
    if (filters.sort === "operator") return a.operator.localeCompare(b.operator);
    if (filters.sort === "oldest") return a.publishedOn < b.publishedOn ? -1 : 1;
    return a.publishedOn > b.publishedOn ? -1 : 1;
  });
}

export interface PresentationPage {
  items: Presentation[];
  /** 1-based, clamped into range. */
  page: number;
  totalPages: number;
  total: number;
  /** 1-based index of the first item shown, or 0 when there are none. */
  firstShown: number;
  /** 1-based index of the last item shown, or 0. */
  lastShown: number;
}

/** Slice a page out of the filtered list, clamping the page into range. */
export function paginate(
  presentations: Presentation[],
  requestedPage: number,
  perPage = PRESENTATIONS_PER_PAGE,
): PresentationPage {
  const total = presentations.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * perPage;
  const items = presentations.slice(start, start + perPage);

  return {
    items,
    page,
    totalPages,
    total,
    firstShown: total === 0 ? 0 : start + 1,
    lastShown: total === 0 ? 0 : start + items.length,
  };
}

/**
 * The page buttons to draw: numbers, with `null` standing in for an ellipsis. Up to
 * seven pages are listed in full; beyond that it is first, a window around the
 * current page, and last — the design's own rule.
 */
export function pageButtons(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const buttons: (number | null)[] = [1];
  if (page > 3) buttons.push(null);
  for (
    let candidate = Math.max(2, page - 1);
    candidate <= Math.min(totalPages - 1, page + 1);
    candidate += 1
  ) {
    buttons.push(candidate);
  }
  if (page < totalPages - 2) buttons.push(null);
  buttons.push(totalPages);
  return buttons;
}
