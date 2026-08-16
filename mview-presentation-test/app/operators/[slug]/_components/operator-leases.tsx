"use client";

import { ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import {
  CONTROL_CARET,
  CONTROL_TINT,
  SELECT_CLASS,
} from "@/app/_components/control-styles";
import { Pager } from "@/app/_components/pager";
import { cardTitleClass } from "@/app/_components/typography";
import {
  fetchOperatorLeases,
  LEASE_PAGE_SIZE,
  type LeaseRecord,
} from "@/lib/operator-leases-api";
import { titleCase } from "@/lib/text-case";

import { LeaseWells } from "./lease-wells";
import { TableSkeletonRows } from "./table-skeleton";
import { usePagedResource } from "./use-paged-resource";

/**
 * "Operator leases" — the live lease table, and the card that opens beneath it.
 *
 * SERVER-DRIVEN. `POST /operators/leases` owns the filtering, the ordering and the
 * paging; this holds the controls and renders what comes back. Pioneer has 5,068
 * leases, so filtering an already-fetched page in the browser was never the same
 * feature as filtering the set.
 *
 * ONE SEARCH FIELD, BECAUSE THE API HAS ONE. `lease_number` matches names as well as
 * numbers upstream — "SPRABERRY" finds the six leases named for it, "15400" finds the
 * one numbered it. Keystrokes are debounced before becoming a request, and a request
 * the user has moved past is aborted rather than left to land late over newer rows.
 *
 * THE COUNTY OPTIONS ARE THE LISTING'S, on request — the same `/operators/counties`
 * read its quick filter uses, in the same native select, with the same classes and the
 * same `"<Name> County"` labels. Every Texas county is offered because the API applies
 * the filter, not this component; one the operator has no leases in returns none, and
 * the table says so.
 *
 * NOTHING IS SORTABLE, on request. Plain headers, the API's own order.
 *
 * UNITS SIT IN THE HEADER, not on every row. A column of numbers each trailing its own
 * "bbl" is harder to scan and harder to compare down, and the unit is a property of the
 * column rather than of any one figure. `normal-case` keeps "Mcf" spelled correctly
 * under the header row's uppercasing — "MCF" is not the unit.
 *
 * THE WELLS ARE A SIBLING, NOT A CHILD. `LeaseWells` renders as its own card below this
 * one, keyed by lease number so picking a different lease remounts it clean. This
 * component owns only which lease is selected; that card owns its own fetch, paging and
 * failure.
 */

const EM_DASH = "—";
const COLUMNS = 5;

/** A volume, or the dash — never a fabricated zero. */
const volume = (value: number | null) =>
  value === null ? EM_DASH : value.toLocaleString("en-US");

export function OperatorLeases({
  operatorNumber,
  totalLeasesOnRecord,
  countyOptions,
}: {
  operatorNumber: string;
  /** Leases on record, for the subtitle before any filter is applied. */
  totalLeasesOnRecord: number;
  /** County names from the shared `/operators/counties` read, as the API spells them. */
  countyOptions: readonly string[];
}) {
  const [query, setQuery] = useState("");
  /** The debounced value that actually becomes a request. */
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("");
  const [page, setPage] = useState(1);
  const [openLease, setOpenLease] = useState<LeaseRecord | null>(null);

  const searchId = useId();
  const countyId = useId();

  /* Typing must not fire a request per keystroke. The timer is cleared on every
     change, so only a pause reaches the API — and it lands back on page one, since
     the page the reader was on has no meaning under a new filter. */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
      setOpenLease(null);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    (signal: AbortSignal) =>
      fetchOperatorLeases({ operatorNumber, search, county, page }, signal),
    [operatorNumber, search, county, page],
  );

  const leases = usePagedResource<LeaseRecord>({
    requestKey: `leases:${operatorNumber}:${search}:${county}:${page}`,
    load,
  });

  const pageCount = Math.max(1, Math.ceil(leases.total / LEASE_PAGE_SIZE));
  const firstLoad = leases.status === "loading" && leases.rows.length === 0;

  const th =
    "whitespace-nowrap bg-mv-table-head px-4 py-3 text-[12px] font-semibold uppercase tracking-[.04em] text-white";
  const td =
    "whitespace-nowrap border-b border-mv-line-soft bg-white px-4 py-3 text-mv-ink-soft";

  return (
    <div className="flex flex-col gap-[22px]">
      <section className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
        <div className="px-[22px] pb-3 pt-5 max-[560px]:px-4">
          <h2 className={cardTitleClass}>Operator leases</h2>
          <p className="mt-1 text-[13px] text-mv-muted">
            {totalLeasesOnRecord.toLocaleString("en-US")} leases on record —
            search by lease name or number, or narrow to a county.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1 max-[767px]:min-w-full">
              <label htmlFor={searchId} className="sr-only">
                Search leases by name or number
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-[15px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mv-green-deep"
                strokeWidth={1.9}
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by Lease Name or Lease Number…"
                className={`w-full rounded-xl border bg-white py-[13px] pl-11 pr-[14px] text-[15px] text-mv-ink outline-none transition-colors placeholder:text-mv-placeholder hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)] ${CONTROL_TINT}`}
              />
            </div>

            {/* The listing's Counties control, to the class — same options, same
                labels, same caret. */}
            <div className="relative min-w-[180px] max-[767px]:min-w-full">
              <label htmlFor={countyId} className="sr-only">
                Choose a county
              </label>
              <select
                id={countyId}
                value={county}
                onChange={(event) => {
                  setCounty(event.target.value);
                  setPage(1);
                  setOpenLease(null);
                }}
                className={`${SELECT_CLASS} ${CONTROL_TINT} min-h-[44px]`}
              >
                <option value="">Counties</option>
                {countyOptions.map((name) => (
                  <option key={name} value={name}>
                    {name} County
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className={CONTROL_CARET}
                strokeWidth={1.8}
              />
            </div>

            <p aria-live="polite" className="text-[12.5px] text-mv-muted">
              {firstLoad
                ? "Loading…"
                : `${leases.total.toLocaleString("en-US")} matching`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-separate border-spacing-0 text-[13.5px]">
            <caption className="sr-only">
              Leases on record, page {page} of {pageCount}
            </caption>
            <thead>
              <tr>
                {(
                  [
                    ["Lease Name", null, "left"],
                    ["Lease Number", null, "left"],
                    ["County", null, "left"],
                    ["Oil Production", "bbl", "right"],
                    ["Gas Production", "Mcf", "right"],
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
                leases.status === "loading" && leases.rows.length > 0
                  ? "opacity-55 transition-opacity"
                  : ""
              }
            >
              {firstLoad ? (
                <TableSkeletonRows rows={LEASE_PAGE_SIZE} columns={COLUMNS} />
              ) : leases.status === "error" ? (
                <tr>
                  <td colSpan={COLUMNS} className="bg-white px-4 py-6">
                    <div
                      role="alert"
                      className="flex flex-wrap items-center justify-center gap-3 text-center"
                    >
                      <p className="text-sm text-mv-ink-soft">
                        Leases could not be loaded.
                      </p>
                      <button
                        type="button"
                        onClick={leases.retry}
                        className="cursor-pointer rounded-[10px] border border-mv-line bg-white px-4 py-2 text-[13px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                      >
                        Try again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : leases.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS}
                    className="whitespace-normal bg-white px-4 py-6 text-center text-sm text-mv-muted"
                  >
                    No leases match these filters.
                  </td>
                </tr>
              ) : (
                leases.rows.map((lease) => {
                  const isOpen = openLease?.leaseNumber === lease.leaseNumber;
                  return (
                    <tr
                      key={`${lease.leaseNumber}-${lease.county}`}
                      className={`[&:hover>*]:bg-mv-row-hover ${isOpen ? "[&>*]:!bg-mv-tint" : ""}`}
                    >
                      <th scope="row" className={`${td} text-left`}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenLease((current) =>
                              current?.leaseNumber === lease.leaseNumber
                                ? null
                                : lease,
                            )
                          }
                          aria-expanded={isOpen}
                          className="inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left text-[13.5px] font-semibold text-mv-ink hover:text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                        >
                          <span
                            aria-hidden="true"
                            className={`text-[15px] font-bold text-mv-placeholder transition-transform ${isOpen ? "rotate-90 text-mv-green-deep" : ""}`}
                          >
                            &rsaquo;
                          </span>
                          {titleCase(lease.leaseName)}
                        </button>
                      </th>
                      <td className={`${td} tabular-nums`}>
                        {lease.leaseNumber}
                      </td>
                      <td className={td}>{titleCase(lease.county)}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {volume(lease.oil)}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {volume(lease.gas)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {leases.total > LEASE_PAGE_SIZE ? (
          <div className="px-[22px] pb-4 max-[560px]:px-4">
            <Pager
              current={page}
              pageCount={pageCount}
              total={leases.total}
              onPage={setPage}
              label="Lease pages"
              totalLabel="Total leases"
              busy={leases.status === "loading"}
            />
          </div>
        ) : null}
      </section>

      {/* Keyed by lease, so a different selection remounts rather than reusing the
          previous lease's page number and rows. */}
      {openLease ? (
        <LeaseWells
          key={openLease.leaseNumber}
          operatorNumber={operatorNumber}
          lease={openLease}
          onClose={() => setOpenLease(null)}
        />
      ) : null}
    </div>
  );
}
