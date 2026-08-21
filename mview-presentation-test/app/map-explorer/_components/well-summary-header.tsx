"use client";

import { Clock, Download } from "lucide-react";

import type { SelectedWell } from "./well-insights-panel";
import type { WellSummaryFields } from "./well-summary-fields";

/*
 * The line above the summary: what this page is, and when it was last read.
 *
 * Export writes out exactly what is on the page — the same mapped rows the
 * cards render — rather than asking the service for a second, differently
 * shaped copy. Until the record has arrived there is nothing to write, so the
 * button waits.
 *
 * What it writes depends on which record is open. The completion summary is a
 * page of labelled figures, and a spreadsheet is what anyone does with those,
 * so it exports CSV. The permit is a filing — a document — and a document
 * stays a document: it downloads as a PDF that looks like the card on screen.
 * See `download-summary.ts`.
 */

/*
 * The two records a well has with the Railroad Commission. The wells feed
 * already labels each row `recordType: "Permit" | "Completion"`; these are the
 * same two, as a choice of which one the summary is read from.
 */
export const RECORDS = ["Completion", "Permit"] as const;

export type WellRecord = (typeof RECORDS)[number];

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

/** A field needs quoting when it holds a comma, a quote or a line break. */
const CSV_QUOTE = new RegExp('[",\\n]');
const CSV_NEWLINE = "\r\n";

export function WellSummaryHeader({
  well,
  record,
  loadedAt,
  fields,
  permitExport,
  onRecordChange,
}: {
  well: SelectedWell;
  record: WellRecord;
  /**
   * When this well's record came back, as an ISO string.
   *
   * Passed in rather than read from the clock here: "last updated" means when
   * the page fetched the record, which only the fetch knows. Null while it is
   * still in flight.
   */
  loadedAt: string | null;
  /** The record's own rows, or null while it is still being fetched. */
  fields: WellSummaryFields | null;
  /**
   * How to export the permit, when the permit is what is open.
   *
   * The permit summary is rendered by a sibling component, so the panel that
   * holds both hands the action down rather than this file reaching for a node
   * it does not own. `busy` is the second or so the capture takes.
   */
  permitExport?: {
    ready: boolean;
    busy: boolean;
    download: () => void;
  };
  onRecordChange: (record: WellRecord) => void;
}) {
  function exportSummary() {
    const cell = (value: string) =>
      CSV_QUOTE.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

    const rows: { label: string; value: string }[] = [
      { label: "API Number", value: well.api },
      { label: "Lease", value: well.lease },
      { label: "Well", value: well.well },
      { label: "Operator", value: well.operator },
      { label: "County", value: well.county },
      { label: "Well Status", value: well.status },
      { label: "Well Type", value: well.wtype },
      ...(fields
        ? [
            ...fields.metrics.map((metric) => ({
              label: metric.label,
              value: `${metric.value} ${metric.unit}`,
            })),
            ...fields.wellInformation,
            ...fields.leaseInformation,
            fields.operator,
            ...fields.activity,
            ...fields.location,
            ...fields.depth,
          ]
        : []),
    ];

    const lines = [
      ["field", "value"],
      ...rows.map((row) => [row.label, row.value]),
    ]
      .map((line) => line.map(cell).join(","))
      .join(CSV_NEWLINE);

    const url = URL.createObjectURL(
      new Blob([lines], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `well-${well.api || "summary"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /*
   * One button, whichever record is open — Export is Export. Only what it
   * writes and what it says changes.
   */
  const isPermit = record === "Permit";
  const exportAction = isPermit
    ? {
        label: permitExport?.busy ? "Preparing…" : "Export PDF",
        disabled: !permitExport?.ready || permitExport.busy,
        title: permitExport?.busy
          ? "Composing the pages"
          : permitExport?.ready
            ? "Download this permit summary as PDF"
            : "Waiting for this well's permit",
        run: () => permitExport?.download(),
      }
    : {
        label: "Export",
        disabled: fields === null,
        title:
          fields === null
            ? "Waiting for this well's record"
            : "Download this summary as CSV",
        run: exportSummary,
      };

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
          onClick={exportAction.run}
          disabled={exportAction.disabled}
          title={exportAction.title}
          className="inline-flex items-center gap-[7px] rounded-lg border border-mv-line bg-white px-[13px] py-[7px] text-[12.5px] font-semibold text-mv-ink enabled:cursor-pointer enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={14} strokeWidth={2} aria-hidden="true" />
          {exportAction.label}
        </button>

        <span className="flex items-center gap-[6px] text-[11px] text-mv-muted">
          Last updated: {loadedAt ? stamp(loadedAt) : "loading…"}
          <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
