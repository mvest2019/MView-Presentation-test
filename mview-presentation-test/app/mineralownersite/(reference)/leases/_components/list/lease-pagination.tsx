"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * THE PAGER UNDER THE TABLE — where you are, and how to move.
 *
 * ── THE SENTENCE ON THE LEFT IS THE HALF THAT ANSWERS THE QUESTION ──
 *
 * "Showing 1–5 of 10 leases" says which rows are on screen AND how many there
 * are in total. A bare set of page numbers says neither: a reader on page 2 of
 * an unknown number of leases cannot tell whether they have seen most of their
 * record or a tenth of it.
 *
 * It carries the `aria-live` that tells a screen reader a filter has changed
 * what is on screen, and it says "1 lease" rather than "1 leases" when a filter
 * narrows that far. It is no longer the only place the count appears — the
 * subtitle under the page title carries the record's own totals — which is what
 * lets the whole bar go on a single page; see below.
 *
 * ── NOTHING AT ALL ON A SINGLE PAGE ──
 *
 * This went back and forth, so the whole of it: the bar hid itself on one page;
 * then it stayed, on the argument that its left half is not a control and
 * "Showing 1–10 of 10 leases" answers "have I seen all of them"; then the
 * buttons were dropped and the sentence kept; and now the bar goes too.
 *
 * WHAT CHANGED IS THAT THE SENTENCE STOPPED BEING THE ONLY PLACE THE COUNT
 * APPEARS. The argument for keeping it rested on that, and it no longer holds:
 * the subtitle under the page title reads "4 leases on your record · 4
 * wells · 2 reservoirs", from the record's own totals. So a bar that says
 * "Showing 1–4 of 4 leases" under four cards is repeating, in a full-width
 * strip of its own, something the page said at the top and the reader can see
 * by counting to four.
 *
 * In Grid it was worse than redundant: `divided={false}` there, so it is not
 * the foot of a card but a detached grey band under the cards with one short
 * sentence adrift in it.
 *
 * THE TEST IS `pageCount`, NOT A ROW COUNT. It was asked for as "more than ten"
 * — which is what one page holds at the size the list asks the service for —
 * but a fixed number is the wrong rule for a table whose page size the reader
 * can change: at twenty-five a page, a twenty-lease record is more than ten and
 * still has nowhere to page to. "Is there a second page" answers the same
 * question at every setting of that control.
 *
 * THE COUNT IS STILL ANNOUNCED. `aria-live` on the sentence is what tells a
 * screen reader a filter changed what is on screen, and a removed element
 * announces nothing — so when the bar is gone the empty-state copy and the
 * subtitle carry that, and a filter that narrows to one page is a filter whose
 * result is short enough to be read directly.
 *
 * ── THE WINDOW, FOR RECORDS THAT ARE NOT TEN LEASES ──
 *
 * Up to seven pages are listed in full. Past that the list keeps the first, the
 * last and the current page's neighbours and elides the rest, so the row never
 * wraps and the two ends — where "start again" and "how much is there" live —
 * are always reachable in one click.
 */
export function LeasePagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  divided = true,
}: {
  page: number;
  pageCount: number;
  /** How many rows a page holds — the "1–5" half of the sentence. */
  pageSize: number;
  /** How many leases matched, which is not how many exist. */
  total: number;
  onPageChange: (next: number) => void;
  /** A rule above it. False where it opens a card of its own — the grid view. */
  divided?: boolean;
}) {
  /* ONE PAGE MEANS NO PAGER — see the note above. Returned before anything is
     computed, so there is no bar, no border and no gap where one used to be. */
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Lease pages"
      className={`flex flex-wrap items-center justify-between gap-3 bg-mv-bg px-4 py-2.5 ${divided ? "border-t border-mv-line" : ""}`}
    >
      <p
        aria-live="polite"
        className="text-[12.5px] text-mv-green-deep tabular-nums"
      >
        Showing {first}–{last} of {total} lease{total === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-1.5">
        <Step
          label="Previous page"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          icon={<ChevronLeft aria-hidden="true" className="h-4 w-4" />}
        />

        {pageWindow(page, pageCount).map((entry, position) =>
          entry === "gap" ? (
            <span
              key={`gap-${position}`}
              aria-hidden="true"
              className="px-1 text-[12.5px] text-mv-muted"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              aria-label={`Page ${entry}`}
              aria-current={entry === page ? "page" : undefined}
              onClick={() => onPageChange(entry)}
              className={`h-8 min-w-8 cursor-pointer rounded-lg border px-2 text-[12.5px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
                entry === page
                  ? "border-mv-green-deep bg-mv-green-deep text-white"
                  : "border-mv-line bg-mv-card text-mv-slate hover:bg-mv-bg"
              }`}
            >
              {entry}
            </button>
          ),
        )}

        <Step
          label="Next page"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
          icon={<ChevronRight aria-hidden="true" className="h-4 w-4" />}
        />
      </div>
    </nav>
  );
}

/**
 * A real `<button disabled>` at the ends rather than a hidden one.
 *
 * The control keeps its place in the row, so the pager does not shift sideways
 * as a reader moves through it — and `disabled` is what tells a screen reader
 * there is nothing before page one, which a removed button cannot say.
 */
function Step({
  label,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-mv-line bg-mv-card text-mv-slate transition-colors hover:bg-mv-bg disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-mv-card"
    >
      {icon}
    </button>
  );
}

/** Which page numbers to print — see the note about the window above. */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const kept = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const value of kept) {
    if (previous && value - previous > 1) out.push("gap");
    out.push(value);
    previous = value;
  }
  return out;
}
