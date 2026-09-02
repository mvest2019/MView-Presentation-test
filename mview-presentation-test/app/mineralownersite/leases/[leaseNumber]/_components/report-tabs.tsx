import Link from "next/link";

import { leaseReportPath } from "../../_lib/lease-routes";
import type { ReportTab } from "../_lib/lease-report-types";

/**
 * THE THREE TIED REPORTS — Lease · Reservoir · Wells.
 *
 * ── LINKS, NOT LOCAL STATE, BECAUSE THE URL HAS TO MOVE ──
 *
 * The prototype switched these by toggling `style.display` on three divs. That
 * makes the reservoir report unreachable by URL: it cannot be linked to, shared,
 * bookmarked, reached by the back button, or deep-linked from an alert — and an
 * alert about a well-level change has nowhere to point.
 *
 * Here each tab is `?report=reservoir` on this lease's own path, so every one of
 * those works for free, the breadcrumb's last segment follows the tab, and only
 * the open panel is rendered on the server. `scroll={false}` keeps the reader
 * where they were: switching from Lease to Wells should not throw them to the
 * top of the page.
 *
 * ── ROLE="TAB" ON A LINK ──
 *
 * The house precedent is `_components/view-tier-switch.tsx`, which does the same
 * thing for the density tiers: the control reads as a tablist, so it is marked
 * as one, with `aria-selected` tracking the choice rather than leaving a screen
 * reader to infer it from a background colour. The panel below carries the
 * matching `role="tabpanel"`.
 *
 * ── THE SUB-LABELS ARE NOT DECORATION ──
 *
 * "Blanco Creek (Wilcox Massive E)" under Reservoir report and "1 well · 5L
 * producing" under Wells report tell the reader what is behind the tab before
 * they spend a click on it. On a lease with eleven wells that second line is the
 * difference between a tab and a guess.
 */
export function ReportTabs({
  leaseNumber,
  active,
  reservoirName,
  wellsSummary,
}: {
  leaseNumber: string;
  active: ReportTab;
  reservoirName: string;
  wellsSummary: string;
}) {
  const tabs: { key: ReportTab; label: string; sub: string }[] = [
    { key: "lease", label: "Lease report", sub: "value · cash flow · activity" },
    { key: "reservoir", label: "Reservoir report", sub: reservoirName },
    { key: "wells", label: "Wells report", sub: wellsSummary },
  ];

  return (
    <>
      <p className="mb-1.5 text-[11px] text-mv-muted">
        One lease → one reservoir → its wells. Three reports on the same lease —
        move between them here.
      </p>

      <div
        role="tablist"
        aria-label="Report sections"
        className="mb-3.5 grid gap-1.5 rounded-mv border border-mv-line bg-mv-card p-1.5 shadow-mv sm:grid-cols-3"
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Link
              key={tab.key}
              role="tab"
              aria-selected={selected}
              aria-controls="lease-report-panel"
              scroll={false}
              href={
                tab.key === "lease"
                  ? leaseReportPath(leaseNumber)
                  : `${leaseReportPath(leaseNumber)}?report=${tab.key}`
              }
              className={`block rounded-[9px] px-4 py-2.5 text-center no-underline transition-colors ${
                selected
                  ? "bg-mv-green-deep text-white"
                  : "text-mv-slate hover:bg-mv-bg"
              }`}
            >
              <span className="block text-[14.5px] font-bold">{tab.label}</span>
              <span
                className={`mt-0.5 block text-[10.5px] ${
                  selected ? "text-white/80" : "text-mv-muted"
                }`}
              >
                {tab.sub}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
