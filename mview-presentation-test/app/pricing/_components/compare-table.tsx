import { COMPARE_ROWS, PLANS } from "./pricing-content";

/**
 * The full plan comparison.
 *
 * THE FIRST COLUMN IS STICKY, not the header row. On a narrow screen this table
 * scrolls sideways, and what a reader loses is which feature the row of ticks
 * belongs to — so the row label is what has to stay put. A sticky header row
 * would need the scroll container to clip vertically too, which breaks
 * `position: sticky` against the viewport, so it is deliberately not attempted.
 *
 * The ticks are drawn as filled circles rather than left as bare glyphs: at
 * 25 rows of "✓" the column reads as texture, and the circle gives the eye
 * something to count.
 */
export function CompareTable() {
  return (
    <div
      /*
        `tabIndex` and `role="region"` so the horizontal scroll is reachable
        from the keyboard — a scroll container that only a mouse can move is a
        trap for anyone tabbing through.
      */
      tabIndex={0}
      role="region"
      aria-label="Plan comparison, scrolls sideways"
      className="mt-[14px] overflow-x-auto rounded-[13px] border border-mv-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      <table className="w-full min-w-[700px] border-separate border-spacing-0 text-[13px] tabular-nums">
        <caption className="sr-only">
          Plan comparison — the first column names the feature, then one column
          each for {PLANS.map((p) => p.name).join(", ")}.
        </caption>
        <colgroup>
          <col />
          <col />
          <col />
          {/* Premium, tinted to match its card in the ladder above. */}
          <col className="bg-mv-portal-row-tint" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 z-[3] border-b border-r border-mv-mint-edge bg-mv-tint px-3 py-[9px] text-left font-extrabold">
              Feature
            </th>
            {PLANS.map((plan) => (
              <th
                key={plan.id}
                className="whitespace-nowrap border-b border-mv-mint-edge bg-mv-tint px-3 py-[9px] text-center font-extrabold"
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row, i) =>
            row.kind === "group" ? (
              <tr key={`g${i}`}>
                <th
                  colSpan={PLANS.length + 1}
                  className="border-y border-mv-mint-edge bg-mv-tint px-3 py-[9px] text-left text-[11px] font-extrabold uppercase tracking-[.11em] text-mv-green-deep"
                >
                  {row.label}
                </th>
              </tr>
            ) : (
              <tr key={`r${i}`} className="group/row">
                <th className="sticky left-0 z-[2] min-w-[220px] border-b border-r border-mv-line-soft bg-mv-portal-explain px-3 py-[9px] text-left align-top font-semibold group-hover/row:bg-mv-portal-row-tint">
                  {row.label}
                  {row.note ? (
                    <i className="mt-0.5 block max-w-[34ch] text-[11.6px] font-normal not-italic leading-[1.5] text-mv-muted">
                      {row.note}
                    </i>
                  ) : null}
                </th>
                {row.cells.map((cell, c) => (
                  <td
                    key={c}
                    className="border-b border-mv-line-soft px-3 py-[9px] text-center align-top font-semibold group-hover/row:bg-mv-portal-row-tint"
                  >
                    {cell === "✓" ? (
                      <>
                        <span className="sr-only">Included</span>
                        <span
                          aria-hidden="true"
                          className="inline-flex size-5 items-center justify-center rounded-full bg-mv-mint text-[11.5px] font-extrabold leading-none text-mv-green-deep shadow-[inset_0_0_0_1px_var(--color-mv-mint-edge)]"
                        >
                          ✓
                        </span>
                      </>
                    ) : cell === "—" ? (
                      <>
                        <span className="sr-only">Not included</span>
                        <span aria-hidden="true" className="text-mv-line-strong">
                          —
                        </span>
                      </>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
