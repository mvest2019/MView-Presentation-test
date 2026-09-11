"use client";

import { PortalButton } from "../../../../_components/ui/button";
import { SelectField } from "../../../../_components/ui/form-controls";
import { PrototypeButton } from "../../../../_components/ui/prototype-button";
import { formatDollars } from "../../_lib/lease-format";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { REPORT_PAGES } from "../../_lib/report-fixtures";

/**
 * THE REPORT'S MASTHEAD, ITS CONTROLS, AND THE TWELVE JUMP CHIPS.
 *
 * ── THE DARK BAND STATES THE WHOLE MONTH IN ONE LINE ──
 *
 * Which month, how many leases filed for it, what it is measured against, and
 * what it was worth. Everything under it elaborates on those four facts, so
 * they go first, on the one dark surface on the page — the same device the
 * portfolio band uses at the top of the list.
 *
 * The caption under the money says "at your own decimal interest", and that is
 * not decoration: the Financials tab beside this one uses a blended rate, this
 * report does not, and a reader comparing the two figures deserves to be told
 * why they differ.
 *
 * ── THE CHIPS ARE ANCHOR LINKS, NOT TABS ──
 *
 * All twelve pages are on the screen at once — it is a document, and a reader
 * scrolling one should be able to keep scrolling. The chips jump; nothing is
 * hidden behind them. They are numbered because the pages are numbered, and a
 * reader who has followed a chip needs to find their way back to the same place
 * by the same name.
 */
export function ReportHeader({
  report,
  monthOptions,
  onMonthChange,
}: {
  report: MonthlyReport;
  monthOptions: { index: number; label: string }[];
  onMonthChange: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-mv p-[22px] text-white shadow-mv-lg bg-[linear-gradient(160deg,var(--color-mv-ink),var(--color-mv-portal-band-end))]">
        <div>
          <p className="text-[10.5px] font-bold tracking-[0.12em] text-mv-on-head-soft uppercase">
            Monthly report
          </p>
          <h2 className="mt-1 text-[26px] leading-tight font-bold">
            {report.month}
          </h2>
          <p className="mt-1 text-[12.5px] text-mv-portal-band-sub">
            {report.filedCount} of {report.leaseCount} leases filed for this
            month · measured against {report.priorMonth}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[28px] leading-tight font-bold text-mv-green tabular-nums">
            {formatDollars(report.yourShare)}
          </p>
          <p className="mt-1 max-w-[230px] text-[11px] leading-[1.45] text-mv-portal-band-sub">
            your share of the month, at your own decimal interest
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <SelectField
          label="Month"
          value={report.index}
          onChange={(event) => onMonthChange(Number(event.target.value))}
        >
          {monthOptions.map((option) => (
            <option key={option.index} value={option.index}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <div className="ml-auto flex flex-wrap gap-2">
          <PrototypeButton
            acknowledgement="Prepared ✓ (prototype)"
            title="Produces this report as a PDF. Not connected yet."
          >
            Download report
          </PrototypeButton>
          <PrototypeButton
            acknowledgement="Exported ✓ (prototype)"
            title="Exports the month's figures as a spreadsheet. Not connected yet."
          >
            Download CSV
          </PrototypeButton>
          {/* The one filled control on the row: it is the only action that
              involves somebody else's inbox. */}
          <PortalButton variant="primary" size="sm">
            Email me this
          </PortalButton>
        </div>
      </div>

      <nav aria-label="Report pages" className="mt-3 flex flex-wrap gap-2">
        {REPORT_PAGES.map((page, position) => (
          <a
            key={page.id}
            href={`#${page.id}`}
            className="inline-flex max-w-[200px] items-center gap-2 rounded-[10px] border border-mv-line bg-mv-card px-2.5 py-[7px] text-[12px] font-semibold text-mv-slate no-underline transition-colors hover:border-mv-green hover:bg-mv-bg"
          >
            <span className="inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-mv-mint text-[10px] font-bold text-mv-green-ink">
              {position + 1}
            </span>
            {/* Truncated rather than wrapped: twelve chips that each take two
                lines become a wall, and the number carries the identity. */}
            <span className="truncate">{page.title}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
