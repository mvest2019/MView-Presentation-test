"use client";

import { selectedControlClass } from "@/app/_components/button";

/**
 * Page buttons — the record count on the left, the pages on the right, both wrapping
 * on narrow screens.
 *
 * This was the operator listing's `Pager`, whose own note said to promote it here if a
 * second page needed it. The detail page's lease and well tables are the second and
 * third, so it moved rather than being copied. The listing's version is now a thin
 * call to this one and renders identically.
 *
 * THE WINDOW IS THE PROTOTYPE'S: first, last, and the pages either side of the current
 * one, with an ellipsis across each gap. Five thousand leases would otherwise print
 * five hundred buttons.
 *
 * IT DOES NOT HIDE ITSELF. Callers decide whether a pager is warranted — the lease
 * tables only mount one past a page of rows, and an empty result has an empty state to
 * say so rather than a pager saying zero.
 */

export function Pager({
  current,
  pageCount,
  total,
  onPage,
  label,
  totalLabel = "Total records",
  busy = false,
}: {
  /** 1-based. */
  current: number;
  pageCount: number;
  /** Rows across every page, for the count on the left. */
  total: number;
  onPage: (page: number) => void;
  /** Names this pager for assistive tech — there can be more than one per page. */
  label: string;
  totalLabel?: string;
  /** Disables the buttons while a page is in flight, so clicks cannot stack up. */
  busy?: boolean;
}) {
  const windowed: number[] = [];
  for (let index = 1; index <= pageCount; index += 1) {
    if (index === 1 || index === pageCount || Math.abs(index - current) <= 1) {
      windowed.push(index);
    }
  }

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 px-[2px] pb-[2px] pt-4"
    >
      <p className="m-0 text-[12.5px] text-mv-muted">
        {totalLabel}:{" "}
        <b className="font-bold tabular-nums text-mv-ink">
          {total.toLocaleString("en-US")}
        </b>
      </p>

      <span className="flex flex-wrap items-center gap-[5px]">
        <PageButton
          onClick={() => onPage(current - 1)}
          disabled={busy || current === 1}
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
              disabled={busy && value !== current}
              label={`Page ${value}`}
            >
              {value}
            </PageButton>
          </span>
        ))}

        <PageButton
          onClick={() => onPage(current + 1)}
          disabled={busy || current === pageCount}
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
      className={`min-w-[34px] cursor-pointer rounded-[9px] border px-[10px] py-[6px] text-[13.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-not-allowed disabled:opacity-40 ${
        current
          ? selectedControlClass
          : "border-mv-line bg-white text-mv-ink enabled:hover:bg-mv-hover"
      }`}
    >
      {children}
    </button>
  );
}
