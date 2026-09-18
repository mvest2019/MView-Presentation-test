"use client";

import { useMemo, useState } from "react";

import {
  buildMonthlyReport,
  DEFAULT_REPORT_INDEX,
  reportMonthOptions,
} from "../../_lib/monthly-report";
import { PageCashFlow } from "./page-cash-flow";
import { PageDevelopment } from "./page-development";
import { PageExecutive } from "./page-executive";
import { PageLeaseAnalysis } from "./page-lease-analysis";
import { PageMonth } from "./page-month";
import { PageOperators } from "./page-operators";
import { PageOutlook } from "./page-outlook";
import { PagePrices } from "./page-prices";
import { PagePress } from "./page-press";
import { PageRevenue } from "./page-revenue";
import { PageSideBySide } from "./page-side-by-side";
import { PageYear } from "./page-year";
import { ReportHeader } from "./report-header";

/**
 * MONTHLY REPORTS — twelve pages about one month, on one screen.
 *
 * ── IT HOLDS ONE PIECE OF STATE: WHICH MONTH ──
 *
 * Everything else is derived. `buildMonthlyReport` reads the month out of the
 * series and returns every figure all twelve pages print, which is why they
 * cannot disagree with each other — page 5's column totals to page 2's headline
 * because they are the same number, not two calculations that happen to match.
 *
 * ── ALL TWELVE ARE RENDERED, NOT TABBED ──
 *
 * This is a document. A reader scrolling one expects to keep scrolling, the
 * browser's own find-in-page has to reach every figure in it, and it has to
 * print. The chips at the top jump between pages rather than swapping them, so
 * nothing is ever hidden behind a control.
 *
 * ── THE ORDER IS THE ARGUMENT, AND IT LIVES IN `REPORT_PAGES` ──
 *
 * The list this file renders and the chips the header renders both read from
 * that one array, so a page cannot be added to the document without appearing in
 * the navigation, or the other way round.
 */
export function MonthlyPanel() {
  const [index, setIndex] = useState(DEFAULT_REPORT_INDEX);

  const months = useMemo(() => reportMonthOptions(), []);
  /* Rebuilt only when the month changes: the builder walks ten leases across a
     twelve-month trailing window for each, which is not work to repeat on an
     unrelated re-render. */
  const report = useMemo(() => buildMonthlyReport(index), [index]);

  return (
    <div>
      <ReportHeader
        report={report}
        monthOptions={months}
        onMonthChange={setIndex}
      />

      <PageExecutive report={report} />
      <PageMonth report={report} />
      <PageRevenue />
      <PageLeaseAnalysis report={report} />
      <PageSideBySide report={report} />
      <PageOutlook />
      <PageDevelopment />
      <PageOperators report={report} />
      <PageCashFlow report={report} />
      <PagePrices />
      <PagePress />
      <PageYear report={report} />

      <p className="mt-4 text-center text-[11.5px] text-mv-muted">
        Twelve pages · built from the Texas public record. Production figures are
        what the operator reported to the state; a statement is a different
        document and will not match this to the penny.
      </p>
    </div>
  );
}
