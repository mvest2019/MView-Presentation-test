import { ArrowDown, ArrowUp, Lock } from "lucide-react";

import { OperatorLogo } from "@/app/_components/operator-logo";
import type {
  MatrixCell,
  MatrixRow,
  StatisticsOperator,
} from "@/lib/operator-statistics";

/**
 * The comparison table — metrics down the side, operators across the top.
 *
 * Four blocks on this page render one, so it takes rows already built by
 * `lib/operator-statistics.ts` and only decides how each cell *looks*. That split
 * is why the same table can carry an address, a volume with a unit, an activity
 * pill and a trend arrow without this file knowing anything about operators.
 *
 * A server component: nothing here is interactive, so none of it needs to ship.
 *
 * TWO STICKY EDGES. The metric column is `sticky left-0` and the header row is
 * `sticky top-0`, with the corner cell sticky on both. On a phone the table
 * scrolls sideways inside its own box, and without the sticky column a reader
 * scrolled to operator D would be looking at four numbers with no idea which
 * metric they belong to. The prototype pinned the column but let the corner scroll
 * away with the rest of the header.
 *
 * BEST-VALUE MARKING. The leading cell in a row gets the mint fill, a triangle and
 * an off-screen "highest" — the fill alone would carry the meaning by colour only.
 */

export function ComparisonMatrix({
  operators,
  rows,
  /** Announced to screen readers; the visible heading sits above the table. */
  caption,
}: {
  operators: StatisticsOperator[];
  rows: MatrixRow[];
  caption: string;
}) {
  return (
    // `relative` is load-bearing, not decoration. The screen-reader-only spans in
    // the cells below are `position: absolute`, and `overflow` only clips
    // absolutely positioned descendants whose containing block is inside the
    // clipping box. Without a positioned wrapper their containing block is the
    // document, so the one in a cell 900px along a sideways-scrolling table sat at
    // x≈900 in the page's own coordinate space and gave the whole document a
    // horizontal scrollbar on mobile — while the visible layout looked correct.
    <div className="relative overflow-auto rounded-[14px] border border-mv-line [scrollbar-color:var(--color-mv-scroll)_transparent] [scrollbar-width:thin]">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 bg-white text-[13.5px]">
        <caption className="sr-only">{caption}</caption>

        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-[5] whitespace-nowrap bg-mv-table-head px-[15px] py-[13px] text-left text-[12px] font-semibold uppercase tracking-[.05em] text-white"
            >
              Metric
            </th>
            {operators.map((operator) => (
              <th
                key={operator.operatorNumber}
                scope="col"
                className="sticky top-0 z-[4] whitespace-nowrap bg-mv-table-head px-[15px] py-[13px] text-left text-[12px] font-semibold text-white"
              >
                <span className="flex items-center gap-2">
                  <OperatorLogo
                    url={operator.logoUrl}
                    monogram={operator.monogram}
                    size={24}
                    radius={10}
                  />
                  <span className="flex flex-col leading-[1.15]">
                    <span>{operator.short}</span>
                    {operator.rank === null ? null : (
                      <span className="mt-[2px] text-[12px] font-normal text-mv-on-head-soft">
                        #{operator.rank} statewide
                      </span>
                    )}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) =>
            row.kind === "group" ? (
              <tr key={`group-${row.label}`}>
                <th
                  scope="colgroup"
                  colSpan={operators.length + 1}
                  className="sticky left-0 border-b border-mv-line-soft bg-mv-bg px-[15px] py-[10px] text-left text-[12px] font-extrabold uppercase tracking-[.05em] text-mv-muted"
                >
                  {row.label}
                </th>
              </tr>
            ) : (
              <tr key={row.label} className="[&:hover>*]:bg-mv-row-hover">
                <th
                  scope="row"
                  className="sticky left-0 z-[2] whitespace-nowrap border-b border-mv-line-soft bg-white px-[15px] py-3 text-left text-[13px] font-semibold text-mv-ink"
                >
                  {row.label}
                </th>
                {row.cells.map((cell, index) => {
                  const isBest = index === row.bestIndex;
                  return (
                    <td
                      key={operators[index]?.operatorNumber ?? index}
                      className={`whitespace-nowrap border-b border-mv-line-soft px-[15px] py-3 tabular-nums ${
                        isBest
                          ? "bg-mv-tint font-bold text-mv-green-deep [tr:hover_&]:!bg-mv-tint-strong"
                          : "bg-white text-mv-ink-soft"
                      }`}
                    >
                      {isBest ? (
                        <>
                          <span className="sr-only">Highest: </span>
                          <span
                            aria-hidden="true"
                            className="mr-[5px] text-[12px] text-mv-green-deep"
                          >
                            ▲
                          </span>
                        </>
                      ) : null}
                      <Cell cell={cell} />
                    </td>
                  );
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ cell }: { cell: MatrixCell }) {
  switch (cell.kind) {
    case "text":
      // Addresses and county lists are prose, not figures — they should wrap and
      // they should not be forced onto the tabular-numbers face.
      return (
        <span className="whitespace-normal [font-variant-numeric:normal]">
          {cell.value}
        </span>
      );

    case "value":
      return (
        <>
          <span className={cell.strong ? "font-bold" : undefined}>
            {cell.value}
          </span>
          {/* A real space, not just the margin — without it a screen reader reads
              "231KBOE" as one token. */}
          {cell.unit ? (
            <>
              {" "}
              <span className="text-[12px] font-medium text-mv-muted">
                {cell.unit}
              </span>
            </>
          ) : null}
        </>
      );

    case "missing":
      // An em dash, never a zero: no filed annual series is not no production.
      return (
        <span className="text-mv-muted">
          <span aria-hidden="true">—</span>
          <span className="sr-only">No filed data</span>
        </span>
      );

    case "locked":
      /* A bar, not an em dash and not a number. The figure exists and is filed —
         it is being withheld, which is a different statement from "nothing on
         file", and the row must not imply the second while meaning the first. */
      return (
        <span className="inline-flex items-center justify-end gap-[6px] text-mv-muted">
          <Lock aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2.2} />
          <span
            aria-hidden="true"
            className="inline-block h-[9px] w-[46px] rounded-full bg-[linear-gradient(90deg,var(--color-mv-line),var(--color-mv-line-soft))] blur-[2.5px]"
          />
          <span className="sr-only">Locked — create a free account to see this figure</span>
        </span>
      );

    case "status":
      return (
        <span
          className={`inline-flex items-center gap-[6px] rounded-full px-[10px] py-[3px] text-[12px] font-semibold ${
            cell.active
              ? "bg-mv-tint text-mv-green-deep"
              : "bg-mv-line-soft text-mv-muted"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-[7px] w-[7px] rounded-full ${
              cell.active ? "bg-mv-green-deep" : "bg-mv-muted"
            }`}
          />
          {cell.active ? "Active" : "Inactive"}
        </span>
      );

    case "delta": {
      if (cell.percent === null) {
        return (
          <span className="font-semibold text-mv-muted">
            <span aria-hidden="true">—</span>
            <span className="sr-only">No comparable year</span>
          </span>
        );
      }

      const direction =
        cell.percent > 0.5 ? "up" : cell.percent < -0.5 ? "down" : "flat";

      if (direction === "flat") {
        return (
          <span className="text-[12.5px] font-bold text-mv-muted">flat</span>
        );
      }

      const Icon = direction === "up" ? ArrowUp : ArrowDown;
      return (
        <span
          className={`inline-flex items-center gap-[3px] text-[12.5px] font-bold ${
            direction === "up" ? "text-mv-green-deep" : "text-mv-down"
          }`}
        >
          <Icon aria-hidden="true" className="h-3 w-3" strokeWidth={2.6} />
          {direction === "up" ? "+" : "−"}
          {Math.abs(cell.percent).toFixed(1)}%
        </span>
      );
    }
  }
}
