"use client";

import { Search } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";

import { Pager } from "@/app/_components/pager";
import { cardTitleClass } from "@/app/_components/typography";
import {
  ACTIVITY_PAGE_SIZE,
  BOE_UNIT,
  type CountyProductionRecord,
  fetchCountyProduction,
  GAS_UNIT,
  OIL_UNIT,
} from "@/lib/operator-activity-api";
import { titleCase } from "@/lib/text-case";

import { LockedValue } from "./gated-figures";
import { TableSkeletonRows } from "./table-skeleton";
import { usePagedResource } from "./use-paged-resource";

/**
 * "Production by county" — lifetime volumes per county, from
 * `POST /api/v1/operators/production-by-county`.
 *
 * UNITS LIVE IN THE HEADERS, and they are the ones the RESPONSE names. The
 * response carries no unit field, so it was worth pinning down: MIDLAND oil comes back
 * as 714,981,764, and `/production-graph` for MIDLAND across its whole history sums to
 * the same number — which this app labels bbl everywhere else. A header reading "MBBL"
 * would understate every figure by a thousand.
 *
 * THE SHARE COLUMN IS THE API'S, NOT A LOCAL SUM. `county_share_of_operator` arrives as
 * a percentage. The fixture-backed version divided each county's BOE by the total of
 * the rows on screen, which silently changed meaning once the set was paginated — a
 * share of ten visible counties is not a share of the operator.
 *
 * THREE COLUMNS WENT, because the endpoint has no data for them. Wells, Producing and
 * Leases came from the fixture; this response carries county, oil, gas, BOE and share.
 * Keeping the columns would have meant inventing counts, so they are gone rather than
 * filled with dashes or fabricated numbers.
 *
 * PAGINATION IS CLIENT-SIDE BECAUSE THE API HAS NO OTHER KIND — no `total_count`, and
 * `page`/`pagesize` are ignored. The whole set arrives once (79 counties for Pioneer,
 * 114 for Devon) and the slice happens here, so changing page costs no request.
 */

const COLUMNS = 5;
const EM_DASH = "—";

const CELL =
  "whitespace-nowrap border-b border-mv-line-soft bg-white px-4 py-3 text-mv-ink-soft";

/**
 * `[label, unit, align]`. A null unit prints no bracket.
 *
 * THE UNITS ARE THE RESPONSE'S, not this file's. `OIL_UNIT`/`GAS_UNIT`/`BOE_UNIT` say
 * bbl, Mcf and BOE; this endpoint answers in MMBBL and BCF, so those constants headed
 * every column with a unit a thousand times off. They are the fallback now, used only
 * if a response arrives naming none.
 */
function headersFor(
  rows: readonly CountyProductionRecord[],
): readonly {
  label: string;
  unit: string | null;
  align: "left" | "right";
  key: SortKey;
}[] {
  const first = rows[0];
  return [
    { label: "County", unit: null, align: "left", key: "county" },
    {
      label: "Oil Produced",
      unit: first?.oilUnit || OIL_UNIT,
      align: "right",
      key: "oil",
    },
    {
      label: "Gas Produced",
      unit: first?.gasUnit || GAS_UNIT,
      align: "right",
      key: "gas",
    },
    {
      label: "BOE Produced",
      unit: first?.boeUnit || BOE_UNIT,
      align: "right",
      key: "boe",
    },
    {
      label: "Share of Operator",
      unit: null,
      align: "right",
      key: "share",
    },
  ];
}

/** Which column an ordering is on. */
type SortKey = "county" | "oil" | "gas" | "boe" | "share";

/**
 * DEFECT 130 — "add filters and also sorting for oil, gas and BOE produced".
 *
 * BOTH ARE DONE HERE, IN MEMORY, AND THAT IS NOT A SHORTCUT.
 * `/operators/production-by-county` takes an operator number and nothing else: it
 * accepts no sort, no filter and no paging, and carries no `total_count` — which is
 * why the whole set already arrives in one response and this component slices it.
 * Ordering and filtering rows that are already here therefore costs one pass and no
 * request, exactly as changing page already does. Sending a sort the endpoint ignores
 * would imply a guarantee it does not make, and OPERATORS.md §6 records that an
 * unrecognised sort field on these endpoints fails SILENTLY — it falls back to the
 * default order rather than erroring, so a server-side sort here would look like it
 * worked and quietly not.
 */
function compareBy(
  key: SortKey,
  a: CountyProductionRecord,
  b: CountyProductionRecord,
): number {
  switch (key) {
    case "county":
      return a.county.localeCompare(b.county);
    case "share":
      return a.shareOfOperator - b.shareOfOperator;
    // The parsed numerics, not the display strings: "1,074.976" sorts below "155.428"
    // as text, which is the whole reason these are carried as numbers as well.
    default:
      return a[key] - b[key];
  }
}

export function CountyProduction({
  operatorNumber,
}: {
  operatorNumber: string;
}) {
  const [page, setPage] = useState(1);
  /** The county filter — defect 130. Matches as you type; no request. */
  const [query, setQuery] = useState("");
  /** Null means the response's own order, which is the operator's biggest first. */
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(
    null,
  );
  const searchId = useId();

  const load = useCallback(
    (signal: AbortSignal) => fetchCountyProduction(operatorNumber, signal),
    [operatorNumber],
  );

  const counties = usePagedResource<CountyProductionRecord>({
    requestKey: `county-production:${operatorNumber}`,
    load,
  });

  /**
   * OIL AND GAS CANNOT BE SORTED BY A READER WHO CANNOT SEE THEM.
   *
   * The handler masks both volumes for a signed-out reader, and `numeric()` reads
   * `"**** (MMBBL)"` as 0 — so every row's oil and gas is 0 in this state and an
   * ordering on them would be an arbitrary shuffle presented as a ranking. Those two
   * headers are plain text while locked; county, BOE and share stay sortable, because
   * those three are real for everyone.
   */
  const sortableWhileLocked = (key: SortKey) => key !== "oil" && key !== "gas";
  const canSort = (key: SortKey) =>
    !counties.locked || sortableWhileLocked(key);

  /** The filter, then the ordering. Both over rows that are already here. */
  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return counties.rows;
    return counties.rows.filter((row) =>
      row.county.toLowerCase().includes(needle),
    );
  }, [counties.rows, query]);

  const ordered = useMemo(() => {
    if (sort === null) return matching;
    // Copied before sorting: `matching` can be `counties.rows` itself, and sorting in
    // place would reorder the hook's own array behind its back.
    const rows = [...matching];
    rows.sort((a, b) => {
      const result = compareBy(sort.key, a, b);
      return sort.dir === "asc" ? result : -result;
    });
    return rows;
  }, [matching, sort]);

  const filtered = query.trim() !== "";
  const shown = filtered ? matching.length : counties.total;
  const pageCount = Math.max(1, Math.ceil(shown / ACTIVITY_PAGE_SIZE));

  /* Back to page one when the filter or the ordering changes — compared during render
     rather than in an effect, the same derived-state pattern the filings table and the
     year brush use, so the new first page is what paints. */
  const viewKey = `${query.trim()}|${sort?.key ?? ""}|${sort?.dir ?? ""}`;
  const [knownViewKey, setKnownViewKey] = useState(viewKey);
  if (viewKey !== knownViewKey) {
    setKnownViewKey(viewKey);
    setPage(1);
  }

  const visible = useMemo(() => {
    const from = (page - 1) * ACTIVITY_PAGE_SIZE;
    return ordered.slice(from, from + ACTIVITY_PAGE_SIZE);
  }, [ordered, page]);

  /** Click a header: first press sorts, further presses flip, third clears. */
  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (current?.key !== key) {
        // Volumes and shares open biggest-first, which is the question being asked of
        // them; a county name opens A-Z.
        return { key, dir: key === "county" ? "asc" : "desc" };
      }
      if (current.dir === "desc") return { key, dir: "asc" };
      // Third press returns to the response's own order rather than sticking on a
      // sort the reader is trying to get out of.
      return null;
    });
  };

  const firstLoad = counties.status === "loading" && counties.rows.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
      <div className="px-[22px] pb-3 pt-5 max-[560px]:px-4">
        <h2 className={cardTitleClass}>Production by county</h2>
        <p className="mt-1 text-[13px] text-mv-muted">
          {firstLoad
            ? "Lifetime reported volumes per county — loading…"
            : counties.status === "empty"
              ? "Lifetime reported volumes per county."
              : filtered
                ? `${matching.length.toLocaleString("en-US")} of ${counties.total.toLocaleString("en-US")} counties match.`
                : `Lifetime reported volumes across ${counties.total.toLocaleString("en-US")} ${counties.total === 1 ? "county" : "counties"}.`}
        </p>

        {/* DEFECT 130's filter. Rendered only once there are rows to narrow — on the
            skeleton it would be a control over nothing, and on the error state the
            retry is the only action worth offering. */}
        {counties.rows.length > 0 ? (
          <div className="relative mt-4 max-w-[320px]">
            <label htmlFor={searchId} className="sr-only">
              Filter counties by name
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-[11px] top-1/2 h-4 w-4 -translate-y-1/2 text-mv-placeholder"
              strokeWidth={2}
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter counties"
              className="min-h-[44px] w-full rounded-[11px] border border-mv-line bg-white pl-[35px] pr-[11px] text-[13px] text-mv-ink outline-none transition-[border-color,box-shadow] focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.15)]"
            />
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13.5px]">
          <caption className="sr-only">
            Production by county, page {page} of {pageCount}
          </caption>
          <thead>
            <tr>
              {headersFor(visible).map(({ label, unit, align, key }) => {
                const active = sort?.key === key;
                const unitMark = unit ? (
                  /* `normal-case` keeps the unit as the response spelled it under the
                     row's uppercasing — these come from the payload (MMBBL, BCF), not
                     from this file. */
                  <span className="ml-1 font-medium normal-case text-mv-on-head-soft">
                    ({unit})
                  </span>
                ) : null;

                return (
                  <th
                    key={label}
                    scope="col"
                    /* `aria-sort` on the header itself is what a screen reader reads to
                       announce the ordering; the arrow beside the label is the sighted
                       half of the same statement. */
                    aria-sort={
                      active
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={`whitespace-nowrap bg-mv-table-head px-4 py-3 text-[12px] font-semibold uppercase tracking-[.04em] text-white ${align === "right" ? "text-right" : "text-left"}`}
                  >
                    {canSort(key) ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className={`inline-flex cursor-pointer items-center gap-[5px] rounded-[6px] text-[12px] font-semibold uppercase tracking-[.04em] text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${align === "right" ? "flex-row-reverse" : ""}`}
                      >
                        <span>
                          {label}
                          {unitMark}
                        </span>
                        {/* The inactive arrow is dimmed rather than absent, so the
                            column reads as sortable before it is pressed and the header
                            does not change width when it becomes active. */}
                        <span
                          aria-hidden="true"
                          className={active ? "opacity-100" : "opacity-40"}
                        >
                          {active && sort.dir === "asc" ? "▲" : "▼"}
                        </span>
                      </button>
                    ) : (
                      <>
                        {label}
                        {unitMark}
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody
            className={
              counties.status === "loading" && counties.rows.length > 0
                ? "opacity-55 transition-opacity"
                : ""
            }
          >
            {firstLoad ? (
              <TableSkeletonRows rows={ACTIVITY_PAGE_SIZE} columns={COLUMNS} />
            ) : counties.status === "error" ? (
              <tr>
                <td colSpan={COLUMNS} className="bg-white px-4 py-6">
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-center gap-3 text-center"
                  >
                    <p className="text-sm text-mv-ink-soft">
                      County production could not be loaded.
                    </p>
                    <button
                      type="button"
                      onClick={counties.retry}
                      className="cursor-pointer rounded-[10px] border border-mv-line bg-white px-4 py-2 text-[13px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                    >
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            ) : counties.status === "empty" ? (
              <tr>
                <td
                  colSpan={COLUMNS}
                  className="whitespace-normal bg-white px-4 py-6 text-center text-sm text-mv-muted"
                >
                  {filtered
                    ? "No county matches that name."
                    : "No per-county production is reported for this operator."}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.county} className="[&:hover>*]:bg-mv-row-hover">
                  <th
                    scope="row"
                    className={`${CELL} text-left font-semibold text-mv-ink`}
                  >
                    {titleCase(row.county) || EM_DASH}
                  </th>
                  {/*
                    The endpoint's own figures, printed as sent — except oil and gas,
                    which a signed-out reader does not get. `counties.locked` is the
                    handler's own answer travelling with the rows, not something
                    inferred from the cell: the row is still here, and its county, BOE
                    and share are all real, so there is no absence to read the gate
                    off (§4 rule 2).

                    THE MASK IS APPLIED UPSTREAM OF THIS COMPONENT, in
                    `app/api/operators/production-by-county/route.ts`. That matters:
                    this table used to call the operator API straight from the
                    browser, and a lock drawn here over a value already delivered
                    there would be defeated by opening devtools.
                  */}
                  <td className={`${CELL} text-right tabular-nums`}>
                    {counties.locked ? (
                      <LockedValue label="Oil produced" width="w-[52px]" />
                    ) : (
                      row.oilText || EM_DASH
                    )}
                  </td>
                  <td className={`${CELL} text-right tabular-nums`}>
                    {counties.locked ? (
                      <LockedValue label="Gas produced" width="w-[52px]" />
                    ) : (
                      row.gasText || EM_DASH
                    )}
                  </td>
                  <td className={`${CELL} text-right tabular-nums`}>
                    {row.boeText || EM_DASH}
                  </td>
                  <td className={`${CELL} text-right tabular-nums`}>
                    {row.shareOfOperator.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {counties.total > ACTIVITY_PAGE_SIZE ? (
        <div className="px-[22px] pb-4 max-[560px]:px-4">
          <Pager
            current={page}
            pageCount={pageCount}
            total={counties.total}
            onPage={setPage}
            label="County production pages"
            totalLabel="Total counties"
          />
        </div>
      ) : null}
    </div>
  );
}
