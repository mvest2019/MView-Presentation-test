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
 * The two records a well has with the Railroad Commission. The wells feed
 * already labels each row `recordType: "Permit" | "Completion"`; these are the
 * same two, as a choice of which one the summary is read from.
 */
export const RECORDS = ["Completion", "Permit"] as const;

export type WellRecord = (typeof RECORDS)[number];

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
  onRecordChange,
}: {
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
  onRecordChange: (record: WellRecord) => void;
}) {
  /*
   * One button, whichever record is open — Export is Export. Only the record
   * behind it changes, and the word for it in the tooltip.
   */
  const isPermit = record === "Permit";
  const target = isPermit ? permitExport : completionExport;
  const noun = isPermit ? "permit" : "completion";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-[19px] font-extrabold leading-tight text-mv-ink">
            Well Summary
          </h2>

          {/* Which of the well's two filings the summary is read from — the
              same two the wells feed labels each row with. */}
          <div className="flex items-baseline gap-3">
            {RECORDS.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={record === name}
                onClick={() => onRecordChange(name)}
                className={`cursor-pointer text-[12.5px] font-semibold underline-offset-[3px] ${
                  record === name
                    ? "text-mv-green-deep underline"
                    : "text-mv-muted hover:text-mv-green-deep hover:underline"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-[3px] text-[11.5px] text-mv-slate">
          Comprehensive overview of well performance and reserves
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
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
          className="inline-flex items-center gap-[7px] rounded-lg border border-mv-line bg-white px-[13px] py-[7px] text-[12.5px] font-semibold text-mv-ink enabled:cursor-pointer enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={14} strokeWidth={2} aria-hidden="true" />
          {target.busy ? "Preparing…" : "Export PDF"}
        </button>

        <span className="flex items-center gap-[6px] text-[11px] text-mv-muted">
          Last updated: {loadedAt ? stamp(loadedAt) : "loading…"}
          <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
