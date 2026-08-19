"use client";

import { Clock, Download } from "lucide-react";

import type { SelectedWell } from "./well-insights-panel";
import {
  DEPTH_GEOMETRY,
  LEASE_INFORMATION,
  SUMMARY_UPDATED,
  WELL_ACTIVITY,
  WELL_INFORMATION,
  WELL_LOCATION,
  WELL_METRICS,
} from "./well-insights-data";

/*
 * The line above the summary: what this page is, and when it was last read.
 *
 * Export takes what is on the page — the well's own facts from the map, and
 * the static sections under them — rather than asking the service for a
 * second, differently-shaped copy.
 */

/*
 * The two records a well has with the Railroad Commission. The wells feed
 * already labels each row `recordType: "Permit" | "Completion"`; these are the
 * same two, as a choice of which one the summary is read from.
 */
export const RECORDS = ["Completion", "Permit"] as const;

export type WellRecord = (typeof RECORDS)[number];

/** A field needs quoting when it holds a comma, a quote or a line break. */
const CSV_QUOTE = new RegExp('[",\\n]');
const CSV_NEWLINE = "\r\n";

export function WellSummaryHeader({
  well,
  record,
  onRecordChange,
}: {
  well: SelectedWell;
  record: WellRecord;
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
      ...WELL_METRICS.map((metric) => ({
        label: metric.label,
        value: `${metric.value} ${metric.unit}`,
      })),
      ...WELL_INFORMATION,
      ...LEASE_INFORMATION,
      ...WELL_ACTIVITY,
      ...WELL_LOCATION,
      ...DEPTH_GEOMETRY,
    ];

    const lines = [["field", "value"], ...rows.map((row) => [row.label, row.value])]
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
          onClick={exportSummary}
          className="inline-flex cursor-pointer items-center gap-[7px] rounded-lg border border-mv-line bg-white px-[13px] py-[7px] text-[12.5px] font-semibold text-mv-ink hover:border-mv-green-deep hover:text-mv-green-deep"
        >
          <Download size={14} strokeWidth={2} aria-hidden="true" />
          Export
        </button>

        <span className="flex items-center gap-[6px] text-[11px] text-mv-muted">
          Last updated: {SUMMARY_UPDATED}
          <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
