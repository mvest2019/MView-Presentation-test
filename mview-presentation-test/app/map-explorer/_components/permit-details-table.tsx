"use client";

import { Table2 } from "lucide-react";

/*
 * The permit filing as one row.
 *
 * The cards above are the readable version of this; here the record keeps its
 * own column names and its own order, for anyone checking the page against
 * the filing itself.
 *
 * One row is a strange thing to make a table of, but it is what the record is
 * — and a table is what makes the column names legible without repeating them
 * beside every value. It scrolls sideways on a narrow card; the scrollbar says
 * so on its own.
 */
export function PermitDetailsTable({
  columns,
}: {
  /** The filing's own columns, in its own order. */
  columns: { label: string; value: string; tone?: "green" }[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-mv-line bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-mv-line px-4 py-[11px]">
        <span
          aria-hidden="true"
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
        >
          <Table2 size={14} strokeWidth={2} />
        </span>
        <h2 className="text-[13px] font-bold leading-none text-mv-ink">
          Permit Details
        </h2>
      </div>

      <div className="mv-thin-scroll overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#fafbfa]">
              {columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className="whitespace-nowrap border-b border-mv-line px-4 py-[10px] text-[11.5px] font-bold text-mv-ink"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              {columns.map((column) => (
                <td
                  key={column.label}
                  className={`whitespace-nowrap px-4 py-[13px] text-[12.5px] font-semibold ${
                    column.tone === "green" ? "text-mv-green-deep" : "text-mv-ink"
                  }`}
                >
                  {column.value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
