"use client";

import type { OperatorPage } from "@/lib/operator-types";

/**
 * Pagination — the design's `.pager`: the record count on the left, page
 * buttons on the right, both wrapping on narrow screens.
 *
 * The page window is the prototype's: first, last, and the pages either side of
 * the current one, with `…` standing in for the gaps.
 *
 * The left slot held a rows-per-page select in the prototype; it now reports the
 * total instead. `page.total` is the count for the filters currently applied, so
 * it tracks the data rather than restating the fixture's size — the same number
 * a paginated API response would carry. Page size is still part of
 * `OperatorQuery`, so a rows-per-page control can return without touching this
 * component's shape.
 *
 * Hidden entirely when there are no results, since paging nothing is noise and
 * the table's empty state already reports zero.
 */

export function OperatorPager({
  page,
  onPage,
}: {
  page: OperatorPage;
  onPage: (page: number) => void;
}) {
  if (page.total === 0) return null;

  const { page: current, pageCount } = page;

  const windowed: number[] = [];
  for (let index = 1; index <= pageCount; index += 1) {
    if (index === 1 || index === pageCount || Math.abs(index - current) <= 1) {
      windowed.push(index);
    }
  }

  return (
    <nav
      aria-label="Directory pages"
      className="flex flex-wrap items-center justify-between gap-3 px-[2px] pb-[2px] pt-4"
    >
      <p className="m-0 text-[12.5px] text-mv-muted">
        Total records:{" "}
        <b className="font-bold tabular-nums text-mv-ink">{page.total}</b>
      </p>

      <span className="flex flex-wrap items-center gap-[5px]">
        <PageButton
          onClick={() => onPage(current - 1)}
          disabled={current === 1}
          label="Previous page"
        >
          ← Previous
        </PageButton>

        {windowed.map((value, index) => (
          <span key={value} className="flex items-center gap-[5px]">
            {index > 0 && value - windowed[index - 1] > 1 && (
              <span aria-hidden="true" className="px-[2px] text-mv-muted">
                …
              </span>
            )}
            <PageButton
              onClick={() => onPage(value)}
              current={value === current}
              label={`Page ${value}`}
            >
              {value}
            </PageButton>
          </span>
        ))}

        <PageButton
          onClick={() => onPage(current + 1)}
          disabled={current === pageCount}
          label="Next page"
        >
          Next →
        </PageButton>
      </span>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled = false,
  current = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`min-w-[34px] cursor-pointer rounded-[9px] border px-[10px] py-[6px] font-sans text-[13.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-not-allowed disabled:opacity-40 ${
        current
          ? "border-mv-green-deep bg-mv-green-deep text-white"
          : "border-mv-line bg-white text-mv-ink enabled:hover:bg-[#f4f6f8]"
      }`}
    >
      {children}
    </button>
  );
}
