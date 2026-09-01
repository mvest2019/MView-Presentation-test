"use client";

import { useCallback, useMemo, useState } from "react";

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
): readonly (readonly [string, string | null, "left" | "right"])[] {
  const first = rows[0];
  return [
    ["County", null, "left"],
    ["Oil Produced", first?.oilUnit || OIL_UNIT, "right"],
    ["Gas Produced", first?.gasUnit || GAS_UNIT, "right"],
    ["BOE Produced", first?.boeUnit || BOE_UNIT, "right"],
    ["Share of Operator", null, "right"],
  ] as const;
}

export function CountyProduction({
  operatorNumber,
}: {
  operatorNumber: string;
}) {
  const [page, setPage] = useState(1);

  const load = useCallback(
    (signal: AbortSignal) => fetchCountyProduction(operatorNumber, signal),
    [operatorNumber],
  );

  const counties = usePagedResource<CountyProductionRecord>({
    requestKey: `county-production:${operatorNumber}`,
    load,
  });

  const pageCount = Math.max(1, Math.ceil(counties.total / ACTIVITY_PAGE_SIZE));

  const visible = useMemo(() => {
    const from = (page - 1) * ACTIVITY_PAGE_SIZE;
    return counties.rows.slice(from, from + ACTIVITY_PAGE_SIZE);
  }, [counties.rows, page]);

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
              : `Lifetime reported volumes across ${counties.total.toLocaleString("en-US")} ${counties.total === 1 ? "county" : "counties"}.`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13.5px]">
          <caption className="sr-only">
            Production by county, page {page} of {pageCount}
          </caption>
          <thead>
            <tr>
              {headersFor(visible).map(([label, unit, align]) => (
                <th
                  key={label}
                  scope="col"
                  className={`whitespace-nowrap bg-mv-table-head px-4 py-3 text-[12px] font-semibold uppercase tracking-[.04em] text-white ${align === "right" ? "text-right" : "text-left"}`}
                >
                  {label}
                  {/* `normal-case` because the row is uppercased and "MCF" is not the
                      unit — the capital M in Mcf means thousand. */}
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
                  No per-county production is reported for this operator.
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
