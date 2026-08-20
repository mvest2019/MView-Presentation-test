"use client";

import { useCallback, useMemo, useState } from "react";

import { Pager } from "@/app/_components/pager";
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

export function RecentWellsPermits({
  operatorNumber,
}: {
  operatorNumber: string;
}) {
  const [page, setPage] = useState(1);

  const load = useCallback(
    (signal: AbortSignal) => fetchRecentWellsPermits(operatorNumber, signal),
    [operatorNumber],
  );

  const filings = usePagedResource<WellPermitRecord>({
    requestKey: `wells-permits:${operatorNumber}`,
    load,
  });

  const pageCount = Math.max(1, Math.ceil(filings.total / ACTIVITY_PAGE_SIZE));

  /* The visible slice. Cheap, but it runs on every render otherwise — and with 1,892
     rows in memory that is worth not doing. */
  const visible = useMemo(() => {
    const from = (page - 1) * ACTIVITY_PAGE_SIZE;
    return filings.rows.slice(from, from + ACTIVITY_PAGE_SIZE);
  }, [filings.rows, page]);

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
              : `${filings.total.toLocaleString("en-US")} permit and completion filing${filings.total === 1 ? "" : "s"} on record`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-[13.5px]">
            <caption className="sr-only">
              Recent wells and permits, page {page} of {pageCount}
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

        {filings.total > ACTIVITY_PAGE_SIZE ? (
          <div className="px-[22px] pb-4 max-[560px]:px-4">
            <Pager
              current={page}
              pageCount={pageCount}
              total={filings.total}
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
