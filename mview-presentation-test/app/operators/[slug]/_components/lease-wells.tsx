"use client";

import { X } from "lucide-react";
import { useCallback, useState } from "react";

import { Pager } from "@/app/_components/pager";
import {
  fetchLeaseWells,
  LEASE_PAGE_SIZE,
  type LeaseRecord,
  type WellRecord,
} from "@/lib/operator-leases-api";
import { titleCase } from "@/lib/text-case";

import { TableSkeletonRows } from "./table-skeleton";
import { usePagedResource } from "./use-paged-resource";

/**
 * "Wells on <lease>" — the wells belonging to one lease, from
 * `POST /api/v1/operators/wells`.
 *
 * ITS OWN CARD, not a drawer inside the lease table's. That is how the design has it,
 * and it is also what the content wants: a lease can have twelve hundred wells across a
 * hundred and twenty-five pages, which is a table in its own right with its own header,
 * its own pager and its own failure. Nesting that inside another scrolling table's card
 * made two independent things look like one.
 *
 * THE PARENT REMOUNTS IT PER LEASE. This component is rendered with `key` set to the
 * lease number, so selecting a different lease gives a fresh instance: the page resets
 * to one and the previous lease's rows never flash under the new lease's heading. That
 * is React's own answer to "reset state when a prop changes" and it beats an effect
 * that watches for the change after the fact.
 *
 * EVERY STATE IS DRAWN. Skeleton rows while the first page loads, an alert with a retry
 * when the request fails, a dimmed table while a subsequent page is in flight, and TWO
 * different empties — because the API has two. A lease it holds no wells for answers
 * `total_count: 0` with an empty array, which is "none on record". A page past the end
 * answers with the real count and an empty array, which is not: claiming "no wells"
 * there would contradict the pager sitting right below it, so that case says the page is
 * empty and offers the way back. The card holds its height through all of them so
 * nothing below it jumps.
 */

const EM_DASH = "—";
const COLUMNS = 7;

const volume = (value: number | null) =>
  value === null ? EM_DASH : value.toLocaleString("en-US");

/**
 * The pill's colour, from whatever the API actually said.
 *
 * Real values seen: `Producing`, `Shut-In Producer`, `Active UIC`, and the literal
 * `Null` — which the API layer has already turned into a real null. Matching on
 * substrings rather than an enumeration means an unseen status still renders in the
 * neutral style instead of throwing or vanishing.
 */
function statusTone(status: string): string {
  if (/shut|inactive|plug|abandon/i.test(status)) {
    return "bg-mv-red-bg text-mv-red";
  }
  if (/produc|active/i.test(status)) {
    return "bg-mv-blue-bg text-mv-blue";
  }
  return "bg-mv-line-soft text-mv-muted";
}

export function LeaseWells({
  operatorNumber,
  lease,
  onClose,
}: {
  operatorNumber: string;
  /** The lease whose row was clicked. */
  lease: LeaseRecord;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  const load = useCallback(
    (signal: AbortSignal) =>
      fetchLeaseWells(
        { operatorNumber, leaseNumber: lease.leaseNumber, page },
        signal,
      ),
    [operatorNumber, lease.leaseNumber, page],
  );

  const wells = usePagedResource<WellRecord>({
    requestKey: `wells:${operatorNumber}:${lease.leaseNumber}:${page}`,
    load,
  });

  const pageCount = Math.max(1, Math.ceil(wells.total / LEASE_PAGE_SIZE));
  const firstLoad = wells.status === "loading" && wells.rows.length === 0;

  const th =
    "whitespace-nowrap bg-mv-table-head px-4 py-3 text-[12px] font-semibold uppercase tracking-[.04em] text-white";
  const td =
    "whitespace-nowrap border-b border-mv-line-soft bg-white px-4 py-3 text-mv-ink-soft";

  return (
    <section
      aria-labelledby="lease-wells-heading"
      className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-[22px] pb-3 pt-5 max-[560px]:px-4">
        <div className="min-w-0">
          <h3
            id="lease-wells-heading"
            className="font-sans text-[17px] font-bold tracking-[-.01em] text-mv-ink"
          >
            Wells on {titleCase(lease.leaseName)}
          </h3>
          <p aria-live="polite" className="mt-1 text-[13px] text-mv-muted">
            Lease {lease.leaseNumber} · {titleCase(lease.county)} County ·{" "}
            {/* A count is only claimed once one is actually known. On a failure the old
                wording said "0 wells", which asserts a fact the request never returned. */}
            {firstLoad
              ? "loading wells…"
              : wells.status === "error"
                ? "well count unavailable"
                : wells.total === 0
                  ? "no wells on record"
                  : `${wells.total.toLocaleString("en-US")} well${wells.total === 1 ? "" : "s"} belonging to this lease only`}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close wells table"
          className="shrink-0 cursor-pointer rounded-lg border border-mv-line bg-white p-[6px] text-mv-muted transition-colors hover:border-mv-line-strong hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <X aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[13.5px]">
          <caption className="sr-only">
            Wells on lease {lease.leaseNumber}, page {page} of {pageCount}
          </caption>
          <thead>
            <tr>
              {(
                [
                  ["API", null, "left"],
                  ["Well name", null, "left"],
                  ["Status", null, "left"],
                  ["County", null, "left"],
                  ["Oil Produced", "bbl", "right"],
                  ["Gas Produced", "Mcf", "right"],
                  ["Production start", null, "left"],
                ] as const
              ).map(([label, unit, align]) => (
                <th
                  key={label}
                  scope="col"
                  className={`${th} ${align === "right" ? "text-right" : "text-left"}`}
                >
                  {label}
                  {unit ? (
                    <span className="ml-1 font-medium normal-case text-mv-on-head-soft">
                      ({unit})
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className={
              wells.status === "loading" && wells.rows.length > 0
                ? "opacity-55 transition-opacity"
                : ""
            }
          >
            {firstLoad ? (
              <TableSkeletonRows rows={LEASE_PAGE_SIZE} columns={COLUMNS} />
            ) : wells.status === "error" ? (
              <tr>
                <td colSpan={COLUMNS} className="bg-white px-4 py-6">
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-center gap-3 text-center"
                  >
                    <p className="text-sm text-mv-ink-soft">
                      Wells could not be loaded.
                    </p>
                    <button
                      type="button"
                      onClick={wells.retry}
                      className="cursor-pointer rounded-[10px] border border-mv-line bg-white px-4 py-2 text-[13px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                    >
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            ) : wells.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS}
                  className="whitespace-normal bg-white px-4 py-6 text-center text-sm text-mv-muted"
                >
                  {wells.total === 0 ? (
                    /* The API's own answer for a lease it holds no wells for: HTTP 200,
                       `total_count: 0`, an empty array. Not an error — there is simply
                       nothing on record, and the pager stays hidden. */
                    "No wells are recorded against this lease."
                  ) : (
                    /* Rows empty but the count says otherwise — the API does this for a
                       page past the end, and the set can shrink between the count and
                       the page. Saying "no wells" here would contradict the pager
                       directly below, so offer the way back instead. */
                    <>
                      This page has no wells to show.{" "}
                      <button
                        type="button"
                        onClick={() => setPage(1)}
                        className="cursor-pointer font-semibold text-mv-green-deep underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                      >
                        Back to the first page
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              wells.rows.map((well) => (
                <tr
                  key={`${well.apiNo}-${well.wellNumber}`}
                  className="[&:hover>*]:bg-mv-row-hover"
                >
                  <td className={`${td} tabular-nums`}>
                    {well.apiNo || EM_DASH}
                  </td>
                  <th
                    scope="row"
                    className={`${td} text-left font-semibold text-mv-ink`}
                  >
                    {/* The RRC identifies a well as its lease's name plus its well
                        number; both halves are the API's own fields. */}
                    {titleCase(well.leaseName || lease.leaseName)}
                    {well.wellNumber ? ` ${well.wellNumber}` : ""}
                  </th>
                  <td className={td}>
                    {well.status === null ? (
                      EM_DASH
                    ) : (
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-[10px] py-[3px] text-[12px] font-semibold ${statusTone(well.status)}`}
                      >
                        {well.status}
                      </span>
                    )}
                  </td>
                  <td className={td}>{titleCase(well.county) || EM_DASH}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {volume(well.oil)}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {volume(well.gas)}
                  </td>
                  <td className={td}>{well.productionStart ?? EM_DASH}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {wells.total > LEASE_PAGE_SIZE ? (
        <div className="px-[22px] pb-4 max-[560px]:px-4">
          <Pager
            current={page}
            pageCount={pageCount}
            total={wells.total}
            onPage={setPage}
            label="Well pages"
            totalLabel="Total wells"
            busy={wells.status === "loading"}
          />
        </div>
      ) : null}
    </section>
  );
}
