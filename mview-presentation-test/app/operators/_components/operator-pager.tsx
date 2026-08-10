"use client";

import { ChevronDown } from "lucide-react";

import { PAGE_SIZES, type OperatorPage } from "@/lib/operator-types";

/**
 * Pagination — the design's `.pager`: rows-per-page on the left, page buttons
 * on the right, both wrapping on narrow screens.
 *
 * The page window is the prototype's: first, last, and the pages either side of
 * the current one, with `…` standing in for the gaps. The "Showing x–y of N"
 * line is not repeated here — it sits once above the table as the results
 * summary — so this row carries controls only.
 *
 * Hidden entirely when there are no results, since paging nothing is noise.
 */

export function OperatorPager({
  page,
  onPage,
  onPageSize,
}: {
  page: OperatorPage;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
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
      <span className="flex items-center gap-2">
        <label
          htmlFor="operator-page-size"
          className="text-[12.5px] text-mv-muted"
        >
          Rows per page
        </label>
        <span className="relative">
          <select
            id="operator-page-size"
            value={page.pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
            className="min-h-9 cursor-pointer appearance-none rounded-[10px] border border-mv-line bg-white py-[5px] pl-3 pr-[30px] font-sans text-[13.5px] font-medium text-mv-ink outline-none hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-[11px] top-1/2 h-[7px] w-[11px] -translate-y-1/2 text-mv-muted"
            strokeWidth={1.8}
          />
        </span>
      </span>

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
