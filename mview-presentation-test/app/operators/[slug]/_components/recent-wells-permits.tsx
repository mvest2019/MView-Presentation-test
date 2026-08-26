"use client";

import { useCallback, useMemo, useState } from "react";

import { Pager } from "@/app/_components/pager";
import { SelectControl } from "@/app/_components/select-control";
import { cardTitleClass } from "@/app/_components/typography";
import {
  ACTIVITY_PAGE_SIZE,
  fetchRecentWellsPermits,
  type WellPermitRecord,
} from "@/lib/operator-activity-api";
import { titleCase } from "@/lib/text-case";

import { TableSkeletonRows } from "./table-skeleton";
import { usePagedResource } from "./use-paged-resource";

/**
 * "Recent wells & permits" — W-1 permits and W-2/G-1 completions for one operator.
 *
 * IT OWNS ITS OWN `<section>`, WHICH IS THE POINT. The requirement is that zero records
 * hides the whole section leaving no gap — and the count is only known after the fetch,
 * so the server cannot decide. Returning `null` from here collapses the section, its
 * heading and its top padding together; `DeferredSection` drops its reserved height once
 * mounted, so nothing is left behind. Had the page kept the `<section className="pt-…">`
 * wrapper, an empty result would still have shown 26px of padding.
 *
 * PAGINATION IS CLIENT-SIDE BECAUSE THE API HAS NO OTHER KIND. `page`/`pagesize` are
 * accepted and ignored upstream — Pioneer returns all 1,892 filings regardless — so the
 * complete set arrives once and the slice happens here. That also means changing page
 * costs no request at all, which is the behaviour the brief asks for.
 *
 * ONE FETCH PER OPERATOR. `usePagedResource` is keyed on the operator number alone, so
 * re-renders and page changes do not refetch, and navigating between operators aborts
 * the previous request rather than letting it land over newer rows.
 */

const COLUMNS = 7;

/** The column order is specified, not derived — it must not drift. */
const HEADERS = [
  "API No.",
  "Lease Name",
  "County",
  "Status",
  "Wellbore Profile",
  "Submitted Date",
  "Approved Date",
] as const;

const EM_DASH = "—";

const CELL =
  "whitespace-nowrap border-b border-mv-line-soft bg-white px-4 py-3 text-mv-ink-soft";

/**
 * The status pill's tone, matched on substrings rather than an enumeration so an
 * unseen status renders neutrally instead of vanishing.
 */
function statusTone(status: string): string {
  if (/approv|complet|grant/i.test(status))
    return "bg-mv-tint text-mv-green-deep";
  if (/deni|expir|cancel|withdraw/i.test(status))
    return "bg-mv-red-bg text-mv-red";
  if (/pend|submit|review/i.test(status)) return "bg-mv-sand-tint text-mv-sand";
  return "bg-mv-line-soft text-mv-ink-soft";
}

/** The empty option's value — "" would collide with a genuinely blank status. */
const ANY_STATUS = "__any__";

/**
 * A date input, labelled and sized for the filter row.
 *
 * NATIVE `type="date"`, matching the presentations page's own From/To controls: it
 * brings the platform picker, the platform keyboard on mobile, and a `YYYY-MM-DD`
 * value that compares directly against `submittedOn`/`approvedOn` with no Date
 * construction and so no timezone to shift a boundary by a day.
 */
function DateBound({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[44px] w-full rounded-[11px] border border-mv-line bg-white px-[11px] text-[13px] text-mv-ink outline-none transition-[border-color,box-shadow] focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.15)]"
    />
  );
}

/** One labelled filter cell, so the row's three groups line up. */
function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-[5px] text-[11.5px] font-semibold uppercase tracking-[.05em] text-mv-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

export function RecentWellsPermits({
  operatorNumber,
}: {
  operatorNumber: string;
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(ANY_STATUS);
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");
  const [approvedFrom, setApprovedFrom] = useState("");
  const [approvedTo, setApprovedTo] = useState("");

  const load = useCallback(
    (signal: AbortSignal) => fetchRecentWellsPermits(operatorNumber, signal),
    [operatorNumber],
  );

  const filings = usePagedResource<WellPermitRecord>({
    requestKey: `wells-permits:${operatorNumber}`,
    load,
  });

  /**
   * The statuses this operator actually filed, for the dropdown.
   *
   * TAKEN FROM THE ROWS, NOT HARDCODED. The endpoint reports seven across the
   * directory — Approved, Submitted, PendingApproval, Cancelled, Withdrawn, Denied,
   * Dismissed — but no single operator need have all of them, and a fixed list would
   * offer options that can only ever return nothing.
   */
  const statuses = useMemo(() => {
    const seen = new Set<string>();
    for (const row of filings.rows) if (row.status !== "") seen.add(row.status);
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [filings.rows]);

  /**
   * The filters, applied here rather than upstream.
   *
   * NO REQUEST, BY DESIGN. `/recent-wells-permits` takes an operator number and
   * nothing else — it ignores paging, which is why the whole set already arrives
   * once and this component slices it. Filtering the set in memory therefore costs
   * one pass over rows that are already here, and changing a filter costs no network
   * at all, exactly as changing page does.
   *
   * A ROW WITH NO DATE IS EXCLUDED BY A DATE BOUND, not kept. A permit with no
   * approved date has not been approved, so it does not belong in "approved between
   * these dates"; keeping it would pad the range with rows that fail its premise.
   */
  const matching = useMemo(() => {
    const anyFilter =
      status !== ANY_STATUS ||
      submittedFrom !== "" ||
      submittedTo !== "" ||
      approvedFrom !== "" ||
      approvedTo !== "";
    if (!anyFilter) return filings.rows;

    const inRange = (on: string | null, from: string, to: string) => {
      if (from === "" && to === "") return true;
      if (on === null) return false;
      return (from === "" || on >= from) && (to === "" || on <= to);
    };

    return filings.rows.filter(
      (row) =>
        (status === ANY_STATUS || row.status === status) &&
        inRange(row.submittedOn, submittedFrom, submittedTo) &&
        inRange(row.approvedOn, approvedFrom, approvedTo),
    );
  }, [
    filings.rows,
    status,
    submittedFrom,
    submittedTo,
    approvedFrom,
    approvedTo,
  ]);

  /**
   * Back to page one when the filter changes.
   *
   * Compared during render rather than in an effect — the same derived-state pattern
   * the year brush uses — so the new first page is what paints, with no flash of an
   * out-of-range page and no `set-state-in-effect` violation.
   */
  const filterKey = `${status}|${submittedFrom}|${submittedTo}|${approvedFrom}|${approvedTo}`;
  const [knownFilterKey, setKnownFilterKey] = useState(filterKey);
  if (filterKey !== knownFilterKey) {
    setKnownFilterKey(filterKey);
    setPage(1);
  }

  const filtered = matching.length !== filings.rows.length;
  /* The filtered count once a filter is on. `filings.total` is the endpoint's own
     figure and stays the source for the unfiltered case, where it can exceed the rows
     actually returned. */
  const shown = filtered ? matching.length : filings.total;
  const pageCount = Math.max(1, Math.ceil(shown / ACTIVITY_PAGE_SIZE));

  /* The visible slice. Cheap, but it runs on every render otherwise — and with 1,992
     rows in memory that is worth not doing. */
  const visible = useMemo(() => {
    const from = (page - 1) * ACTIVITY_PAGE_SIZE;
    return matching.slice(from, from + ACTIVITY_PAGE_SIZE);
  }, [matching, page]);

  const clearFilters = () => {
    setStatus(ANY_STATUS);
    setSubmittedFrom("");
    setSubmittedTo("");
    setApprovedFrom("");
    setApprovedTo("");
  };

  /* ---- zero records: the section does not exist ---- */
  if (filings.status === "empty") return null;

  return (
    <section className="pt-[26px]">
      <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
        <div className="px-[22px] pb-3 pt-5 max-[560px]:px-4">
          <h2 className={cardTitleClass}>Recent wells &amp; permits</h2>
          <p className="mt-1 text-[13px] text-mv-muted">
            {filings.status === "loading" && filings.total === 0
              ? "Permit and completion filings — loading…"
              : filtered
                ? `${matching.length.toLocaleString("en-US")} of ${filings.total.toLocaleString("en-US")} filings match`
                : `${filings.total.toLocaleString("en-US")} permit and completion filing${filings.total === 1 ? "" : "s"} on record`}
          </p>
        </div>

        {/* ---- filters ----
            Rendered only once there is something to filter: on the skeleton they would
            be controls over nothing, and on the error state the retry is the only
            action worth offering. Three groups, laid out on one row on desktop and
            stacking below 720px. */}
        {filings.rows.length > 0 ? (
          <div className="border-t border-mv-line-soft px-[22px] py-[14px] max-[560px]:px-4">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto] items-end gap-x-[14px] gap-y-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
              <FilterGroup label="Status">
                <SelectControl
                  label="Filter by status"
                  value={status}
                  onChange={setStatus}
                >
                  <option value={ANY_STATUS}>All statuses</option>
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </SelectControl>
              </FilterGroup>

              <FilterGroup label="Submitted date">
                <div className="flex items-center gap-2">
                  <DateBound
                    label="Submitted on or after"
                    value={submittedFrom}
                    onChange={setSubmittedFrom}
                  />
                  <span aria-hidden="true" className="text-[12px] text-mv-muted">
                    to
                  </span>
                  <DateBound
                    label="Submitted on or before"
                    value={submittedTo}
                    onChange={setSubmittedTo}
                  />
                </div>
              </FilterGroup>

              <FilterGroup label="Approved date">
                <div className="flex items-center gap-2">
                  <DateBound
                    label="Approved on or after"
                    value={approvedFrom}
                    onChange={setApprovedFrom}
                  />
                  <span aria-hidden="true" className="text-[12px] text-mv-muted">
                    to
                  </span>
                  <DateBound
                    label="Approved on or before"
                    value={approvedTo}
                    onChange={setApprovedTo}
                  />
                </div>
              </FilterGroup>

              {/* Only once something is in force — a permanently greyed control is
                  noise on a section that opens unfiltered. */}
              {filterKey === `${ANY_STATUS}||||` ? null : (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-[44px] cursor-pointer rounded-[11px] border border-mv-line bg-white px-4 text-[13px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-[13.5px]">
            <caption className="sr-only">
              Recent wells and permits, page {page} of {pageCount}
              {filtered ? " (filtered)" : ""}
            </caption>
            <thead>
              <tr>
                {HEADERS.map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="whitespace-nowrap bg-mv-table-head px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[.04em] text-white"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody
              className={
                filings.status === "loading" && filings.rows.length > 0
                  ? "opacity-55 transition-opacity"
                  : ""
              }
            >
              {filings.status === "loading" && filings.rows.length === 0 ? (
                <TableSkeletonRows
                  rows={ACTIVITY_PAGE_SIZE}
                  columns={COLUMNS}
                />
              ) : filings.status === "error" ? (
                <tr>
                  <td colSpan={COLUMNS} className="bg-white px-4 py-6">
                    <div
                      role="alert"
                      className="flex flex-wrap items-center justify-center gap-3 text-center"
                    >
                      <p className="text-sm text-mv-ink-soft">
                        Wells and permits could not be loaded.
                      </p>
                      <button
                        type="button"
                        onClick={filings.retry}
                        className="cursor-pointer rounded-[10px] border border-mv-line bg-white px-4 py-2 text-[13px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                      >
                        Try again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS}
                    className="whitespace-normal bg-white px-4 py-6 text-center text-sm text-mv-muted"
                  >
                    No filings match these filters.{" "}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-mv-green-deep underline underline-offset-2 hover:text-mv-ink"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                visible.map((row, index) => (
                  <tr
                    key={`${row.apiNo ?? "no-api"}-${row.leaseName}-${row.submittedDate ?? index}`}
                    className="[&:hover>*]:bg-mv-row-hover"
                  >
                    <td className={`${CELL} tabular-nums`}>
                      {row.apiNo ?? EM_DASH}
                    </td>
                    <th
                      scope="row"
                      className={`${CELL} text-left font-semibold text-mv-ink`}
                    >
                      {titleCase(row.leaseName) || EM_DASH}
                    </th>
                    <td className={CELL}>{titleCase(row.county) || EM_DASH}</td>
                    <td className={CELL}>
                      {row.status === "" ? (
                        EM_DASH
                      ) : (
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-[10px] py-[3px] text-[12px] font-semibold ${statusTone(row.status)}`}
                        >
                          {row.status}
                        </span>
                      )}
                    </td>
                    {/* Upstream casing is inconsistent — "Directional" and
                        "DIRECTIONAL" both appear — so it is normalised for display. */}
                    <td className={CELL}>
                      {titleCase(row.wellboreProfile) || EM_DASH}
                    </td>
                    <td className={CELL}>{row.submittedDate ?? EM_DASH}</td>
                    <td className={CELL}>{row.approvedDate ?? EM_DASH}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {shown > ACTIVITY_PAGE_SIZE ? (
          <div className="px-[22px] pb-4 max-[560px]:px-4">
            <Pager
              current={page}
              pageCount={pageCount}
              total={shown}
              onPage={setPage}
              label="Wells and permits pages"
              totalLabel="Total filings"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
