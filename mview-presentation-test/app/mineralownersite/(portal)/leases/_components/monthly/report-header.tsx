"use client";

import { PortalButton } from "../../../../_components/ui/button";
import { Card } from "../../../../_components/ui/card";
import { SelectField } from "../../../../_components/ui/form-controls";
import { PrototypeButton } from "../../../../_components/ui/prototype-button";
import { formatDollars } from "../../_lib/lease-format";
import type { MonthlyReport } from "../../_lib/monthly-report";
import { ReportNav } from "./report-nav";

/**
 * THE REPORT'S MASTHEAD — the month, what it was worth, what you can do with
 * it, and the way into its twelve pages.
 *
 * ── ONE CARD, NOT THREE STRIPS ──
 *
 * The dark band, the controls and the jump chips used to be three separate
 * blocks with air between them, and they read as three unrelated things stacked
 * up rather than as one masthead: the month picker in particular looked like it
 * belonged to the page below it as much as to the band above. They are one
 * object — this month, this month's actions, this month's contents — so they
 * share one border, and the dark band runs to its edges.
 *
 * ── THE DARK BAND STATES THE WHOLE MONTH IN ONE LINE ──
 *
 * Which month, how many leases filed for it, what it is measured against, and
 * what it was worth. Everything under it elaborates on those four facts, so
 * they go first, on the one dark surface on the page — the same device the
 * portfolio band uses at the top of the list.
 *
 * The money is labelled ABOVE and qualified BELOW, which is the value band's
 * own idiom rather than a third arrangement invented here. And the qualifier is
 * not decoration: the Financials tab beside this one uses a blended rate, this
 * report does not, and a reader comparing the two figures deserves to be told
 * why they differ.
 *
 * ── THE TWO HALVES ARE `items-end`, SO THE FIGURE SITS ON THE MONTH ──
 *
 * Aligned to the top instead, the figure floated a line above "June 2026" and
 * the two largest things on the band shared no line at all. The month name and
 * the money are the two facts of the masthead and they read as a pair.
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
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 p-[22px] text-white bg-[linear-gradient(160deg,var(--color-mv-ink),var(--color-mv-portal-band-end))]">
        <div>
          <p className="text-[10.5px] font-bold tracking-[0.12em] text-mv-on-head-soft uppercase">
            Monthly report
          </p>
          <h2 className="mt-1.5 text-[28px] leading-none font-bold">
            {report.month}
          </h2>
          <p className="mt-2 text-[12.5px] text-mv-portal-band-sub">
            {report.filedCount} of {report.leaseCount} leases filed for this
            month · measured against {report.priorMonth}
          </p>
        </div>

        <div>
          <p className="text-[10.5px] font-bold tracking-[0.09em] text-mv-on-head-soft uppercase">
            Your share of the month
          </p>
          <p className="mt-1.5 text-[28px] leading-none font-bold text-mv-green tabular-nums">
            {formatDollars(report.yourShare)}
          </p>
          <p className="mt-2 text-[11px] text-mv-portal-band-sub">
            at your own decimal interest
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-mv-line px-4 py-3">
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

      <ReportNav />
    </Card>
  );
}
