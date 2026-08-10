"use client";

import Link from "next/link";

import { formatProduction } from "@/lib/operator-query";
import type {
  Operator,
  OperatorColumns,
  OperatorPage,
  OperatorSortKey,
} from "@/lib/operator-types";

import { FilterPill } from "./filter-pill";

/**
 * The directory table — the prototype's "Recent wells & permits" treatment:
 * dark `#1f2937` header, hairline row rules, teal operator links, pill status
 * badges.
 *
 * RESPONSIVE: the horizontal scroll lives on the wrapper immediately around
 * the `<table>`, and the table keeps the design's `min-w-[760px]`. So the
 * columns never crush on a phone, the scroll is contained inside the card's
 * rounded clip, and the page body itself never scrolls sideways.
 *
 * ACCESSIBILITY: the prototype makes the whole `<tr>` a click target via a
 * document listener and `cursor:pointer`. That is not reachable by keyboard and
 * not announced as a link, so here the operator name is a real `<Link>` and the
 * row keeps only the hover tint as an affordance. Sortable headers are buttons
 * carrying `aria-sort` on their `<th>`, and the arrow is decorative.
 */

/** Illustrative-field tooltip, repeated verbatim from the design. */
const STATUS_NOTE =
  "Illustrative placeholder — active/inactive wires from the live P-5 status";

type SortableColumn = {
  key: OperatorSortKey;
  label: string;
  subhead?: string;
  align: "left" | "right";
  /** Which optional column toggle governs this one, if any. */
  column?: keyof OperatorColumns;
};

const SORTABLE: SortableColumn[] = [
  { key: "oil", label: "Oil Produced", subhead: "bbl · illustrative", align: "right", column: "oil" },
  { key: "gas", label: "Gas Produced", subhead: "Mcf · illustrative", align: "right", column: "gas" },
  { key: "cty", label: "Counties", align: "right", column: "cty" },
];

export function OperatorTable({
  page,
  columns,
  sortKey,
  sortDir,
  isNumericSearch,
  onSort,
  onClearFilters,
}: {
  page: OperatorPage;
  columns: OperatorColumns;
  sortKey: OperatorSortKey | "";
  sortDir: 1 | -1;
  /** Drives the honest empty-state note for operator-number searches. */
  isNumericSearch: boolean;
  onSort: (key: OperatorSortKey) => void;
  onClearFilters: () => void;
}) {
  const visibleSortable = SORTABLE.filter(
    (col) => !col.column || columns[col.column],
  );
  // `#` + name + the visible optional columns, for the empty row's colspan.
  const columnCount = 2 + visibleSortable.length + (columns.status ? 1 : 0);

  function ariaSort(key: OperatorSortKey) {
    if (sortKey !== key) return "none" as const;
    return sortDir > 0 ? ("ascending" as const) : ("descending" as const);
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-mv-line">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <caption className="sr-only">
            Texas oil and gas operators, ranked by reported production. Oil, gas
            and status figures are illustrative placeholders.
          </caption>

          <thead>
            <tr className="bg-[#1f2937]">
              <th
                scope="col"
                className="w-[58px] min-w-[58px] px-[18px] py-[15px] text-left text-[13px] font-semibold text-white"
              >
                #
              </th>

              <th
                scope="col"
                aria-sort={ariaSort("name")}
                className="whitespace-nowrap px-[18px] py-[15px] text-left text-[13px] font-semibold text-white"
              >
                <SortButton
                  label="Operator Name (operator no.)"
                  active={sortKey === "name"}
                  dir={sortDir}
                  onClick={() => onSort("name")}
                />
              </th>

              {visibleSortable.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort(col.key)}
                  className="whitespace-nowrap px-[18px] py-[15px] text-right text-[13px] font-semibold text-white"
                >
                  <SortButton
                    label={col.label}
                    active={sortKey === col.key}
                    dir={sortDir}
                    onClick={() => onSort(col.key)}
                  />
                  {col.subhead && (
                    <span className="mt-[2px] block text-[10.5px] font-normal tracking-[.02em] text-white/70">
                      {col.subhead}
                    </span>
                  )}
                </th>
              ))}

              {columns.status && (
                <th
                  scope="col"
                  title={STATUS_NOTE}
                  className="whitespace-nowrap px-[18px] py-[15px] text-left text-[13px] font-semibold text-white"
                >
                  Status
                  <span className="mt-[2px] block text-[10.5px] font-normal tracking-[.02em] text-white/70">
                    illustrative
                  </span>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {page.items.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="whitespace-normal bg-white">
                  <EmptyState
                    isNumericSearch={isNumericSearch}
                    onClearFilters={onClearFilters}
                  />
                </td>
              </tr>
            ) : (
              page.items.map((operator, index) => (
                <OperatorRow
                  key={`${operator.play}-${operator.name}`}
                  operator={operator}
                  rank={page.from + index + 1}
                  columns={columns}
                  showOil={columns.oil}
                  showGas={columns.gas}
                  showCounties={columns.cty}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OperatorRow({
  operator,
  rank,
  columns,
  showOil,
  showGas,
  showCounties,
}: {
  operator: Operator;
  rank: number;
  columns: OperatorColumns;
  showOil: boolean;
  showGas: boolean;
  showCounties: boolean;
}) {
  // Provisional href. The operator detail route does not exist yet and its slug
  // contract arrives with the API, so this is the design's link target expressed
  // as a path rather than a real destination.
  const href = `/operators/${encodeURIComponent(slugify(operator.name))}`;

  const cellClass =
    "whitespace-nowrap border-b border-[#eef1f4] bg-white px-[18px] py-4 text-[14.5px] text-mv-ink group-last:border-b-0";

  return (
    <tr className="group transition-colors hover:bg-[#fafbfc]">
      <td
        className={`${cellClass} text-[12.5px] tabular-nums text-mv-muted group-hover:bg-[#fafbfc]`}
      >
        {rank}
      </td>

      <td className={`${cellClass} group-hover:bg-[#fafbfc]`}>
        <Link
          href={href}
          className="font-bold text-mv-green-deep no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          {operator.name}
        </Link>
        <span className="mt-[2px] block text-xs font-normal text-mv-muted">
          No. {operator.operatorNo} · {operator.play} · rank #
          {operator.playRank}
        </span>
      </td>

      {showOil && (
        <td
          className={`${cellClass} text-right tabular-nums group-hover:bg-[#fafbfc]`}
        >
          {formatProduction(operator.oilBbl)}
        </td>
      )}

      {showGas && (
        <td
          className={`${cellClass} text-right tabular-nums group-hover:bg-[#fafbfc]`}
        >
          {formatProduction(operator.gasMcf)}
        </td>
      )}

      {showCounties && (
        <td
          className={`${cellClass} text-right tabular-nums group-hover:bg-[#fafbfc]`}
        >
          {operator.counties}
        </td>
      )}

      {columns.status && (
        <td className={`${cellClass} group-hover:bg-[#fafbfc]`}>
          <span
            title={STATUS_NOTE}
            className={`inline-block whitespace-nowrap rounded-full px-3 py-[5px] text-[12.5px] font-semibold leading-none ${
              operator.status === "active"
                ? "bg-[#e6f6ee] text-mv-green-deep"
                : "bg-[#eef1f4] text-mv-muted"
            }`}
          >
            {operator.status === "active" ? "Active" : "Inactive"}
          </span>
        </td>
      )}
    </tr>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 1 | -1;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Sort by ${label}`}
      className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[13px] font-semibold text-white hover:underline hover:underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {label}
      {active && (
        <span aria-hidden="true">{dir > 0 ? " ▲" : " ▼"}</span>
      )}
    </button>
  );
}

function EmptyState({
  isNumericSearch,
  onClearFilters,
}: {
  isNumericSearch: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="px-5 py-[34px] text-center">
      <div aria-hidden="true" className="mb-2 text-[28px]">
        🔍
      </div>
      <p className="mb-[6px] text-sm font-bold">
        No operators match these filters
      </p>
      <p className="mx-auto mb-[14px] max-w-[460px] text-[12.5px] text-mv-muted">
        {isNumericSearch ? (
          <>
            That looks like an operator <strong>number</strong> — numbers are not
            in this extract, and that search activates when the live directory
            wires. Try the operator&apos;s name instead.
          </>
        ) : (
          "Try removing one of the applied filters above, or clearing the Play type filter."
        )}
      </p>
      <FilterPill active={false} onClick={onClearFilters}>
        Clear all filters ✕
      </FilterPill>
    </div>
  );
}

/** Provisional slug — replaced by whatever key the API exposes. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
