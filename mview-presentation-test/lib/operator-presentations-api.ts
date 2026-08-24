import "server-only";

import { unstable_cache } from "next/cache";

import { getCasedNameLookup } from "./operator-api";
import {
  operatorLogoPath,
  publicOperatorApiBaseUrl,
} from "./operator-api-types";
import type {
  PresentationRecord,
  PresentationsResult,
} from "./operator-presentations-shape";

/**
 * `POST /api/v1/operators/presentations` — the investor-deck library, paged.
 *
 * WHAT THE ENDPOINT ACTUALLY DOES, established by probing rather than assumed:
 *
 *   · Six records a page. Measured: `totalCount` 136 over `totalPages` 23.
 *   · Both dates are OPTIONAL, and an empty string reads the same as omitting them
 *     — 190 records unfiltered against 136 for calendar 2025.
 *   · `operator_name` accepts either spelling. `"CONOCOPHILLIPS COMPANY"` and
 *     `"ConocoPhillips Company"` both return that operator's 8 filings, which is
 *     unlike `/operators/compare`, where only the filed spelling matches. So the
 *     name a reader picks can be sent as-is.
 *   · `"All Operators"` is how the endpoint spells "no operator filter".
 *   · A `pageNumber` past the end is not an error: it answers 200 with an empty
 *     array and the real `totalPages`.
 *   · THERE IS NO KEYWORD SEARCH AND NO SORT. A `search` field is accepted and
 *     silently ignored — 190 records came back either way — and no ordering
 *     parameter exists. The page therefore offers neither, rather than a control
 *     that would appear to filter 190 records while only touching the 6 on screen.
 *
 * DATES CROSS THE WIRE AS `MM/DD/YYYY`, which is not what an `<input type="date">`
 * produces. The conversion happens here so there is one place that knows the
 * endpoint's format.
 */

export type {
  PresentationRecord,
  PresentationsResult,
} from "./operator-presentations-shape";

/** Six per page, fixed by the endpoint rather than chosen here. */
export const PRESENTATIONS_PAGE_SIZE = 6;

/** How the endpoint spells "every operator". */
export const ALL_OPERATORS = "All Operators";

export interface PresentationsQuery {
  /** A display name, or `ALL_OPERATORS`. */
  operatorName: string;
  /** `YYYY-MM-DD` from a date input, or "" for unfiltered. */
  startDate: string;
  endDate: string;
  page: number;
}

/** `2025-11-06` → `11/06/2025`. Anything else passes through as "". */
export function toApiDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return "";
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function text(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function count(raw: unknown): number {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

function toRecord(
  raw: unknown,
  index: number,
  displayNameFor: (filed: string, operatorNumber?: string | null) => string,
): PresentationRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const title = text(record.title);
  if (title === "") return null;

  const operatorNumber = text(record.operator_number);

  return {
    // `_id` is the endpoint's own key; the index is only a fallback so a record
    // without one still gets a stable React key within its page.
    id: text(record._id) || `${operatorNumber}-${index}`,
    /* The endpoint sends only the regulator's filed spelling, in caps —
       "CONOCOPHILLIPS COMPANY". `/operators/names` carries the cased spelling for
       every operator and is already in memory, so the readable form costs a map
       read rather than a request. Title-casing the caps instead would produce
       "Conocophillips", which is wrong in a way a reader can see. */
    operatorName: displayNameFor(text(record.operator_name), operatorNumber),
    operatorNumber,
    /* `operator_logo` says whether one exists; the bytes come from our origin,
       because the API serves logos `cross-origin-resource-policy: same-origin` and
       a browser refuses to embed those. `logo_link` is null on every record
       sampled, so it is not used. */
    logoUrl:
      text(record.operator_logo) && operatorNumber
        ? operatorLogoPath(operatorNumber)
        : null,
    website: text(record.website) || null,
    title,
    publishedDate: text(record.published_date),
    summary: text(record.summary),
    presentationUrl: text(record.presentation_url) || null,
  };
}

/**
 * Filed spelling → cased spelling, from the directory that is already cached.
 *
 * A failure must not fail the page: the filed name is still a correct name, just a
 * shouty one, so the fallback is to print it as filed. Several of these operators
 * are public issuers with no RRC registration and so no directory entry at all —
 * `BP PLC`, `CHEVRON CORPORATION.`, `CMS ENERGY` — and those keep their filed
 * spelling rather than being title-cased into "Bp Plc".
 */
/** One entry in the Operator filter. */
export interface PresentationOperator {
  /** The cased spelling, for display. */
  name: string;
  /** The filed spelling — what the endpoint matches on. */
  filed: string;
  /** The RRC number, or null for a public issuer with no Texas registration. */
  operatorNumber: string | null;
}

/** Pages fetched at once while collecting the operator list. */
const WALK_BATCH = 8;

/**
 * Every operator that actually has a presentation on file.
 *
 * WHY THIS WALKS THE LIBRARY. The filter should offer the thirty operators with
 * decks, not all 24,742 in the directory — an alphabetical list of everything puts
 * "1-2-3 Operating, LLC" and "14start, LLC" at the top and buries Chevron. There is
 * no endpoint for the distinct set, and none of `pagesize`, `pageSize`, `limit`,
 * `per_page` or `size` overrides the fixed six-per-page, so the only source is the
 * records themselves.
 *
 * THE COST IS BOUNDED AND PAID ONCE. 32 pages, fetched eight at a time, measured at
 * 3.5 seconds — on the server, behind `unstable_cache`, so a visitor never waits for
 * it and the browser receives thirty names. It grows only as the library does.
 *
 * A page that fails is skipped rather than fatal: a filter missing one operator is
 * far better than a page that will not load.
 */
export const getPresentationOperators = unstable_cache(
  async (): Promise<PresentationOperator[]> => {
    const displayNameFor = await getCasedNameLookup();

    const first = await readRawPage(1);
    const totalPages = Math.max(1, first.totalPages);

    /** Filed name → number. A Map dedups the thirty across 190 records. */
    const found = new Map<string, string | null>();
    const collect = (rows: RawRecord[]) => {
      for (const row of rows) {
        const filed = text(row.operator_name);
        if (filed === "") continue;
        const number = text(row.operator_number) || null;
        // Keep the first number seen; a later blank must not erase it.
        if (!found.has(filed) || (found.get(filed) === null && number)) {
          found.set(filed, number);
        }
      }
    };
    collect(first.rows);

    const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    for (let i = 0; i < remaining.length; i += WALK_BATCH) {
      const batch = await Promise.all(
        remaining
          .slice(i, i + WALK_BATCH)
          .map((page) => readRawPage(page).catch(() => null)),
      );
      for (const result of batch) if (result) collect(result.rows);
    }

    /* Deduplicated on the DISPLAY name as well as the filed one: two filed
       spellings can resolve to the same label, and two identical rows in a filter is
       a defect the reader sees. */
    const byLabel = new Map<string, PresentationOperator>();
    for (const [filed, operatorNumber] of found) {
      const name = displayNameFor(filed, operatorNumber);
      if (!byLabel.has(name))
        byLabel.set(name, { name, filed, operatorNumber });
    }

    return [...byLabel.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "en-US"),
    );
  },
  ["presentation-operators", "v1"],
  { revalidate: 600, tags: ["operators"] },
);

interface RawRecord {
  operator_name?: unknown;
  operator_number?: unknown;
}

/** One page, unmapped — the operator walk only needs two fields per row. */
async function readRawPage(
  page: number,
): Promise<{ rows: RawRecord[]; totalPages: number }> {
  const response = await fetch(
    `${publicOperatorApiBaseUrl()}/api/v1/operators/presentations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operator_name: ALL_OPERATORS,
        start_date: "",
        end_date: "",
        pageNumber: page,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Presentations unavailable (${response.status})`);
  }

  const payload: unknown = await response.json();
  const data = (payload as { data?: unknown }).data as
    Record<string, unknown> | undefined;

  return {
    rows: Array.isArray(data?.data) ? (data.data as RawRecord[]) : [],
    totalPages: count(data?.totalPages),
  };
}

async function readPresentations(
  query: PresentationsQuery,
): Promise<PresentationsResult> {
  const response = await fetch(
    `${publicOperatorApiBaseUrl()}/api/v1/operators/presentations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operator_name: query.operatorName || ALL_OPERATORS,
        start_date: toApiDate(query.startDate),
        end_date: toApiDate(query.endDate),
        pageNumber: query.page,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Presentations unavailable (${response.status})`);
  }

  const payload: unknown = await response.json();
  const data = (payload as { data?: unknown }).data as
    Record<string, unknown> | undefined;

  const displayNameFor = await getCasedNameLookup();

  const rows = Array.isArray(data?.data) ? data.data : [];
  const records = rows
    .map((row, index) => toRecord(row, index, displayNameFor))
    .filter((row): row is PresentationRecord => row !== null);

  const totalCount = count(data?.totalCount);

  return {
    records,
    totalCount,
    // Trust the endpoint's own page count, falling back to a derived one only if it
    // is missing — the two have agreed on every response sampled.
    totalPages:
      count(data?.totalPages) ||
      Math.max(1, Math.ceil(totalCount / PRESENTATIONS_PAGE_SIZE)),
    currentPage: count(data?.currentPage) || query.page,
  };
}

/**
 * One page of the library, cached per exact query.
 *
 * Paging back to a page already visited, or re-applying the same filters, is
 * answered without an upstream request.
 */
export const getPresentationsPage = unstable_cache(
  readPresentations,
  ["operator-presentations", "v1"],
  { revalidate: 600, tags: ["operators"] },
);
