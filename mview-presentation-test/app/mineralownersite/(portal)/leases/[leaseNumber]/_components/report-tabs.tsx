import Link from "next/link";

import { leaseReportPath } from "../../_lib/lease-routes";

/**
 * THE THREE REPORTS ON ONE LEASE.
 *
 * ── WHY THEY ARE SEPARATE REPORTS AND NOT SECTIONS ──
 *
 * A lease, the reservoir it produces from, and its wells are three different
 * subjects at three different scales, and the facts that belong to each are the
 * ones readers most often look for in the wrong place: the API number, the
 * field, the play and the depth describe a WELL, and a lease can have many. The
 * line above the tabs says so in one sentence, because the alternative is a
 * reader concluding the data is missing.
 *
 * ── LINKS, NOT BUTTONS ──
 *
 * `?report=` is in the URL, so each report is addressable, shareable and back-
 * buttonable, and the page resolves it on the server. The prototype's version
 * toggled `display` on three divs, which meant a reader could not send anyone
 * the reservoir report.
 */

export type LeaseReportTab = "lease" | "reservoir" | "wells";

const TABS: { value: LeaseReportTab; label: string }[] = [
  { value: "lease", label: "Lease report" },
  { value: "reservoir", label: "Reservoir report" },
  { value: "wells", label: "Well report" },
];

export function ReportTabs({
  slug,
  active,
}: {
  slug: string;
  active: LeaseReportTab;
}) {
  return (
    <>
      <p className="mt-4 text-[12.5px] text-mv-slate">
        One lease → one reservoir → its well. Three reports on the same lease —
        move between them here.
      </p>

      <nav aria-label="Reports on this lease" className="mt-2 grid gap-3 sm:grid-cols-3">
        {TABS.map((tab) => {
          const selected = tab.value === active;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "lease"
                  ? leaseReportPath(slug)
                  : `${leaseReportPath(slug)}?report=${tab.value}`
              }
              aria-current={selected ? "page" : undefined}
              className={`rounded-mv border px-4 py-[14px] text-center text-[15px] font-bold no-underline shadow-mv transition-colors ${
                selected
                  ? "border-mv-green-deep bg-mv-green-deep text-white"
                  : "border-mv-line bg-mv-card text-mv-ink hover:bg-mv-bg"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
