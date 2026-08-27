"use client";

import { Clock, Download } from "lucide-react";

/*
 * The line above the summary: what this page is, and when it was last read.
 *
 * Export downloads whichever record is open as a PDF that looks like the card
 * on screen — see `download-summary.ts`. Both records work the same way, so
 * this file only picks between the two descriptors the panel hands it; the
 * summaries themselves are rendered by siblings, and the panel that renders
 * both is what holds the nodes.
 *
 * Until the record has arrived there is nothing to capture, so the button
 * waits.
 */

/*
 * The two records a well has with the Railroad Commission.
 *
 * Not a choice any more. The wells feed labels every row
 * `recordType: "Permit" | "Completion"`, so the well that was clicked already
 * says which of the two it is — and a switcher offering the other one mostly
 * offered a record that does not exist. The panel reads the label; this is
 * only the name for it.
 */
export type WellRecord = "Completion" | "Permit";

/** What the panel hands down for each record's Export. */
export type RecordExport = {
  ready: boolean;
  busy: boolean;
  download: () => void;
};

/** `2026-08-20T12:45:42Z` → `20 Aug 2026, 12:45`, in the reader's own zone. */
function stamp(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;

  return at.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WellSummaryHeader({
  record,
  loadedAt,
  completionExport,
  permitExport,
}: {
  /** Which of the well's two records this is, from the well itself. */
  record: WellRecord;
  /**
   * When this well's record came back, as an ISO string.
   *
   * Passed in rather than read from the clock here: "last updated" means when
   * the page fetched the record, which only the fetch knows. Null while it is
   * still in flight.
   */
  loadedAt: string | null;
  /**
   * How to export each record.
   *
   * `ready` is whether the record has arrived and there is something to
   * capture; `busy` is the second or so the capture takes.
   */
  completionExport: RecordExport;
  permitExport: RecordExport;
}) {
  /*
   * One button, whichever record is open — Export is Export. Only the record
   * behind it changes, and the word for it in the tooltip.
   */
  const isPermit = record === "Permit";
  const target = isPermit ? permitExport : completionExport;
  const noun = isPermit ? "permit" : "completion";

  return (
    /*
     * A container, like the band below it: this line sits in a panel that is a
     * share of a split view, so its width has little to do with the window's.
     * Wide, the title and the actions share a line; narrow, the actions drop
     * beneath the title rather than being held to the right of it with the
     * space between them left empty.
     */
    <div className="@container">
      <div className="flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-[19px] font-extrabold leading-tight text-mv-ink">
              Well Summary
            </h2>

            {/* Which record this is, said rather than offered: the well's own
                label decides it, so there is nothing here to pick. */}
            <span className="rounded-full bg-mv-mint px-[9px] py-[4px] text-[10px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-green-deep">
              {record}
            </span>
          </div>
          <p className="mt-[3px] text-[11.5px] text-mv-slate">
            Comprehensive overview of well performance and reserves
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 @xl:ml-auto @xl:flex-nowrap">
          <button
            type="button"
            onClick={target.download}
            disabled={!target.ready || target.busy}
            title={
              target.busy
                ? "Composing the pages"
                : target.ready
                  ? `Download this ${noun} summary as PDF`
                  : `Waiting for this well's ${noun}`
            }
            className="inline-flex shrink-0 items-center gap-[7px] rounded-lg border border-mv-line bg-white px-[13px] py-[7px] text-[12.5px] font-semibold text-mv-ink enabled:cursor-pointer enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} strokeWidth={2} aria-hidden="true" />
            {target.busy ? "Preparing…" : "Export PDF"}
          </button>

          <span className="flex items-center gap-[6px] whitespace-nowrap text-[11px] text-mv-muted">
            Last updated: {loadedAt ? stamp(loadedAt) : "loading…"}
            <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  );
}
