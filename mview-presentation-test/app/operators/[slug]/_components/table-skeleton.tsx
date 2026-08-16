/**
 * Placeholder rows for a table that is fetching.
 *
 * A table that empties to a single "Loading…" line collapses to one row high, drags
 * everything below it up the page, then shoves it back down when the rows land. Holding
 * the height with shimmer rows is what keeps the section still — the same reason the
 * deferred sections reserve a minimum height.
 *
 * The bar widths repeat on a fixed cycle rather than being random: a skeleton is
 * decoration, and randomness here would mean the server and the client disagreed about
 * the markup. `aria-hidden` with a live region alongside keeps it out of the
 * accessibility tree, where a row of fake cells is noise rather than information.
 */

/** Percentage widths, cycled across cells so the block does not look like a grid. */
const WIDTHS = [72, 46, 58, 64, 52, 68, 44];

export function TableSkeletonRows({
  rows,
  columns,
}: {
  rows: number;
  columns: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden="true">
          {Array.from({ length: columns }, (_, column) => (
            <td
              key={column}
              className="border-b border-mv-line-soft bg-white px-4 py-3"
            >
              <span
                className="block h-[13px] animate-pulse rounded bg-mv-line-soft"
                style={{ width: `${WIDTHS[(row + column) % WIDTHS.length]}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
