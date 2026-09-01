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
  const slots = pageSlots(current, pageCount);

  /* Every page button is sized for the WIDEST page number this pager can show, so the
     run does not grow a few pixels when the window crosses from 9 to 10 or 99 to 100.
     Part of the same defect as the slot count below — see `pageSlots`. */
  const numberWidth = Math.max(34, `${pageCount}`.length * 9 + 20);

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

        {slots.map((slot, index) =>
          slot === "gap" ? (
            /* A GAP SLOT IS ALWAYS RENDERED, and only sometimes visible. Printing the
               ellipsis conditionally is what let the run change width; keeping the box
               and hiding its glyph keeps the footprint identical while never claiming
               a gap that is not there. `invisible` still occupies its space. */
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className={`px-[2px] text-mv-muted ${
                isRealGap(slots, index) ? "" : "invisible"
              }`}
            >
              …
            </span>
          ) : (
            <PageButton
              key={slot}
              onClick={() => onPage(slot)}
              current={slot === current}
              disabled={busy && slot !== current}
              label={`Page ${slot}`}
              minWidth={numberWidth}
            >
              {slot}
            </PageButton>
          ),
        )}

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
  minWidth,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
  /** Set on the numbered buttons only, so every page number occupies one width. */
  minWidth?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      style={minWidth === undefined ? undefined : { minWidth }}
      className={`min-w-[34px] cursor-pointer rounded-[9px] border px-[10px] py-[6px] text-[13.5px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-not-allowed disabled:opacity-40 ${
        current
          ? selectedControlClass
          : "border-mv-line bg-white text-mv-ink enabled:hover:bg-mv-hover"
      }`}
    >
      {children}
    </button>
  );
}

/** A page number, or a place where one or more pages are skipped. */
type Slot = number | "gap";

/** How many consecutive pages sit between the two gaps. */
const AROUND = 3;

/**
 * The page run — DEFECT 156, "after some pages table height increase".
 *
 * WHAT WAS ACTUALLY GROWING WAS THIS PAGER, not the table. Measured on Apache's 74
 * pages of filings: the table body held 539px on every page, while the pager's own
 * height went 264px on page 1, 304px on pages 2-3 and 344px from page 4 on. The card
 * grew by 80px underneath a table that never changed, which is what the snap shows.
 *
 * THE CAUSE WAS A VARIABLE NUMBER OF SLOTS. The old rule kept `1`, `pageCount` and
 * anything within one of `current`, then printed an ellipsis wherever consecutive
 * kept pages were more than one apart — so the run was three buttons and one ellipsis
 * on page 1, four and one on page 2, and five and two from page 3. The `<span>`
 * holding them wraps, so each addition could push it onto another line and take the
 * card with it.
 *
 * SO THE COUNT IS NOW FIXED. Above the threshold this always returns exactly seven
 * slots — first, gap, three consecutive, gap, last — with the interior run clamped so
 * it never slides off either end. A gap that spans nothing renders as an invisible
 * placeholder rather than being dropped, so the width is the same whether or not it
 * has anything to say. Below the threshold every page is listed, which is likewise
 * constant for that table.
 *
 * The window still moves with the reader and the ellipses still appear exactly where
 * pages are genuinely skipped; only the footprint stopped changing.
 */
function pageSlots(current: number, pageCount: number): Slot[] {
  // Few enough to print in full — the run is already constant at this size.
  if (pageCount <= AROUND + 4) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  /* The interior run, clamped into `2 … pageCount - 1` so it can neither collide with
     the first or last button nor shrink at the ends — clamping the START is what keeps
     the length at exactly `AROUND` for every value of `current`. */
  const start = Math.min(Math.max(current - 1, 2), pageCount - AROUND);
  const interior = Array.from({ length: AROUND }, (_, index) => start + index);

  return [1, "gap", ...interior, "gap", pageCount];
}

/** Whether a gap slot actually spans skipped pages, or is only holding its place. */
function isRealGap(slots: Slot[], index: number): boolean {
  const before = slots[index - 1];
  const after = slots[index + 1];
  return (
    typeof before === "number" &&
    typeof after === "number" &&
    after - before > 1
  );
}
