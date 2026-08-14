"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useDeferredValue, useId, useMemo, useState } from "react";

import { cardTitleClass } from "@/app/_components/typography";
import {
  formatCount,
  leaseWells,
  titleCase,
  type OperatorLeaseRow,
} from "@/lib/operator-detail";

/**
 * "Operator leases" — every lease in the extract, searchable and sortable.
 *
 * CLICKING A LEASE OPENS ITS WELLS below the table, as the prototype does — one
 * lease at a time, and clicking the same row again closes it.
 *
 * THOSE WELLS ARE DERIVED, NOT FILED. `leaseWells()` splits the lease's real
 * lifetime oil and gas across a deterministic two-to-five-well breakdown; the API
 * numbers, statuses and first-production dates are generated. An API-14 is a real
 * regulatory identifier, so the panel states which columns are real. Asked for on
 * 2026-08-13 after that was raised twice — a decision, not an oversight.
 *
 * Search reads a deferred value so typing stays smooth while the table reconciles —
 * the same pattern as the county directory on the listing page.
 */

type SortColumn = "oil" | "gas";

export function OperatorLeases({
  leases,
  totalLeasesOnRecord,
}: {
  leases: readonly OperatorLeaseRow[];
  /** Leases the operator has in total, so the extract's size is stated honestly. */
  totalLeasesOnRecord: number;
}) {
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("*");
  const [sort, setSort] = useState<{ column: SortColumn; dir: -1 | 1 }>({
    column: "oil",
    dir: -1,
  });
  /** Lease number whose wells are open, or null. */
  const [openLease, setOpenLease] = useState<string | null>(null);

  const searchId = useId();
  const countyId = useId();
  const deferredQuery = useDeferredValue(query);

  const counties = useMemo(
    () => [...new Set(leases.map((lease) => lease.county))].sort(),
    [leases],
  );

  const rows = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return leases
      .filter((lease) => {
        if (county !== "*" && lease.county !== county) return false;
        if (
          needle &&
          !`${lease.name} ${lease.county} ${lease.number}`
            .toLowerCase()
            .includes(needle)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => sort.dir * (a[sort.column] - b[sort.column]));
  }, [leases, deferredQuery, county, sort]);

  /** The open lease, but only while it survives the current filter. */
  const open = useMemo(
    () => rows.find((lease) => lease.number === openLease) ?? null,
    [rows, openLease],
  );
  const wells = useMemo(() => (open ? leaseWells(open) : []), [open]);

  function toggleSort(column: SortColumn) {
    setSort((current) =>
      current.column === column
        ? { column, dir: current.dir === -1 ? 1 : -1 }
        : { column, dir: -1 },
    );
  }

  const th =
    "whitespace-nowrap bg-mv-table-head px-4 py-3 text-[12px] font-semibold uppercase tracking-[.04em] text-white";
  const td =
    "whitespace-nowrap border-b border-mv-line-soft bg-white px-4 py-3 text-mv-ink-soft";

  return (
    <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
      <div className="px-[22px] pb-3 pt-5 max-[560px]:px-4">
        <h2 className={cardTitleClass}>Operator leases</h2>
        <p className="mt-1 text-[13px] text-mv-muted">
          The {leases.length} largest leases by lifetime oil in this extract, of{" "}
          {formatCount(totalLeasesOnRecord)} on record — search, or sort by oil or
          gas.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <label htmlFor={searchId} className="sr-only">
              Search leases
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-[13px] top-1/2 h-4 w-4 -translate-y-1/2 text-mv-placeholder"
              strokeWidth={1.8}
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search leases by name, county or number…"
              className="h-[42px] w-full rounded-[10px] border border-mv-line bg-white py-2 pl-[38px] pr-[14px] text-sm text-mv-ink outline-none focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
            />
          </div>

          <div className="relative">
            <label htmlFor={countyId} className="sr-only">
              Filter by county
            </label>
            <select
              id={countyId}
              value={county}
              onChange={(event) => setCounty(event.target.value)}
              className="h-[42px] min-w-[170px] cursor-pointer appearance-none rounded-[10px] border border-mv-line bg-white pl-3 pr-9 text-sm font-medium text-mv-ink outline-none focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
            >
              <option value="*">All counties</option>
              {counties.map((name) => (
                <option key={name} value={name}>
                  {titleCase(name)}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mv-muted"
              strokeWidth={2}
            />
          </div>

          <p aria-live="polite" className="text-[12.5px] text-mv-muted">
            {rows.length} of {leases.length} shown
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-0 text-[13.5px]">
          <caption className="sr-only">
            Leases on record, {rows.length} shown
          </caption>
          <thead>
            <tr>
              <th scope="col" className={`${th} text-left`}>
                Lease
              </th>
              <th scope="col" className={`${th} text-left`}>
                Number
              </th>
              <th scope="col" className={`${th} text-left`}>
                County
              </th>
              {(
                [
                  ["oil", "Oil production"],
                  ["gas", "Gas production"],
                ] as const
              ).map(([column, label]) => (
                <th
                  key={column}
                  scope="col"
                  aria-sort={
                    sort.column === column
                      ? sort.dir === 1
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={`${th} text-right`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column)}
                    title={`Sort by ${label} ${sort.column === column && sort.dir === -1 ? "ascending" : "descending"}`}
                    className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold uppercase tracking-[.04em] text-white hover:underline hover:underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {label}
                    <span aria-hidden="true" className="ml-1">
                      {sort.column === column ? (sort.dir === 1 ? "▲" : "▼") : "⇅"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="whitespace-normal bg-white px-4 py-5 text-sm text-mv-muted"
                >
                  No leases match. This extract ships the {leases.length} largest by
                  lifetime oil; full search arrives with the operator endpoint.
                </td>
              </tr>
            ) : (
              rows.map((lease) => (
                <tr
                  key={lease.number}
                  className={`[&:hover>*]:bg-mv-row-hover ${openLease === lease.number ? "[&>*]:!bg-mv-tint" : ""}`}
                >
                  <th scope="row" className={`${td} text-left`}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenLease((current) =>
                          current === lease.number ? null : lease.number,
                        )
                      }
                      aria-expanded={openLease === lease.number}
                      className="inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left text-[13.5px] font-semibold text-mv-ink hover:text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                    >
                      <span
                        aria-hidden="true"
                        className={`text-[15px] font-bold text-mv-placeholder transition-transform ${openLease === lease.number ? "rotate-90 text-mv-green-deep" : ""}`}
                      >
                        &rsaquo;
                      </span>
                      {titleCase(lease.name)}
                    </button>
                  </th>
                  <td className={`${td} tabular-nums`}>{lease.number}</td>
                  <td className={td}>{titleCase(lease.county)}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {formatCount(lease.oil)}{" "}
                    <span className="text-[12px] text-mv-muted">bbl</span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {formatCount(lease.gas)}{" "}
                    <span className="text-[12px] text-mv-muted">Mcf</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="border-t border-mv-line-soft bg-mv-bg px-[22px] py-5 max-[560px]:px-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-sans text-[15px] font-bold text-mv-ink">
                Wells on {titleCase(open.name)}
              </h3>
              <p className="mt-1 text-[13px] text-mv-muted">
                Lease {open.number} · {titleCase(open.county)} County ·{" "}
                {wells.length} well{wells.length === 1 ? "" : "s"} belonging to this
                lease only.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenLease(null)}
              aria-label="Close wells table"
              className="shrink-0 cursor-pointer rounded-lg border border-mv-line bg-white p-[6px] text-mv-muted hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-mv-line">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-[13.5px]">
              <caption className="sr-only">
                Wells on lease {open.number}, {wells.length} rows
              </caption>
              <thead>
                <tr>
                  {(
                    [
                      ["API", "left"],
                      ["Well name", "left"],
                      ["Status", "left"],
                      ["County", "left"],
                      ["Oil production", "right"],
                      ["Gas production", "right"],
                      ["Production start", "left"],
                    ] as const
                  ).map(([label, align]) => (
                    <th
                      key={label}
                      scope="col"
                      className={`${th} ${align === "right" ? "text-right" : "text-left"}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wells.map((well) => (
                  <tr key={well.api} className="[&:hover>*]:bg-mv-row-hover">
                    <td className={`${td} tabular-nums`}>{well.api}</td>
                    <th
                      scope="row"
                      className={`${td} text-left font-semibold text-mv-ink`}
                    >
                      {well.name}
                    </th>
                    <td className={td}>
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-[10px] py-[3px] text-[12px] font-semibold ${
                          well.statusKind === "prod" || well.statusKind === "first"
                            ? "bg-mv-tint text-mv-green-deep"
                            : "bg-mv-line-soft text-mv-muted"
                        }`}
                      >
                        {well.status}
                      </span>
                    </td>
                    <td className={td}>{well.county}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {formatCount(well.oil)}{" "}
                      <span className="text-[12px] text-mv-muted">bbl</span>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {formatCount(well.gas)}{" "}
                      <span className="text-[12px] text-mv-muted">Mcf</span>
                    </td>
                    <td className={td}>{well.firstProduction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stated where the numbers are: an API-14 is a regulatory identifier and
              these are derived, so the page should not let a reader take them for
              filed records. */}
          <p className="mt-3 flex flex-wrap items-start gap-2 text-[12px] text-mv-ink-soft">
            <span className="shrink-0 rounded-full border border-mv-sand-line bg-mv-sand-tint px-[9px] py-[2px] font-bold text-mv-sand">
              Derived breakdown
            </span>
            <span className="min-w-0 flex-1">
              The lease&apos;s oil and gas totals are its real filed volumes, split
              across a per-well breakdown. Well API numbers, statuses and production
              start dates are illustrative until the live well feed wires.
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
