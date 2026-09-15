import { Droplet, FileText, Info, Layers, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
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

/**
 * WHAT EACH TAB IS CALLED AND WHAT IT LOOKS LIKE — EXPORTED, because two other
 * places on this page need the same two facts: the breadcrumb, which ends in
 * the name of the report you are actually reading, and the title's own glyph.
 * Held here rather than copied there, so a tab cannot be renamed in one place
 * and keep its old name in the other two.
 *
 * The icon is the COMPONENT, not an element, because each of the three sites
 * draws it at its own size — 17px in the tab, 22px beside the title.
 */
export const LEASE_REPORT_TABS: {
  value: LeaseReportTab;
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: "lease", label: "Lease report", Icon: FileText },
  { value: "reservoir", label: "Reservoir report", Icon: Layers },
  { value: "wells", label: "Well report", Icon: Droplet },
];

/** The one a page is on. Falls back to the lease report, which is the default. */
export function leaseReportTab(value: LeaseReportTab) {
  return (
    LEASE_REPORT_TABS.find((tab) => tab.value === value) ?? LEASE_REPORT_TABS[0]
  );
}

const TABS = LEASE_REPORT_TABS;

export function ReportTabs({
  slug,
  active,
  reservoir,
  firstPosting,
  lastPosting,
}: {
  slug: string;
  active: LeaseReportTab;
  /** The rock these three reports are all about. */
  reservoir: string;
  firstPosting: string;
  lastPosting: string;
}) {
  return (
    <>
      {/* THE ROW IS A PAIR AGAIN: the rock these three reports are about on the
          left, the sentence orienting a reader in the tabs on the right. The
          left half was taken out and put back; `justify-between` holds both
          ends rather than one of them relying on `ml-auto`. */}
      {/* A RULE BETWEEN THE FACTS CARD AND THIS BLOCK. Above it is the lease
          itself; below it is the reservoir it produces from and the three
          reports on it — a change of subject, and the card's own border was
          not enough to mark it.

          The caption's own top margin comes down from 28 to 16 now that the
          rule is doing the separating: it no longer has to hold itself apart
          from the card with space alone. */}
      <hr className="mt-5 border-t border-mv-line-strong" />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="flex items-center gap-2 text-[12px] tracking-[0.04em] text-mv-muted uppercase">
          <Layers
            aria-hidden="true"
            className="h-4 w-4 flex-none text-mv-green-deep"
          />
          <span className="font-bold text-mv-ink">{reservoir}</span>
          <span className="normal-case">
            first posting{" "}
            <strong className="text-mv-ink">{firstPosting}</strong> · newest
            posting <strong className="text-mv-ink">{lastPosting}</strong>
          </span>
        </p>

        <p className="flex items-center gap-2 text-[12px] text-mv-muted">
          <Info aria-hidden="true" className="h-[13px] w-[13px] flex-none" />
          One lease → one reservoir → its well. Three reports on the same lease
          — move between them here.
        </p>
      </div>

      <nav
        aria-label="Reports on this lease"
        className="mt-2.5 grid gap-3 sm:grid-cols-3"
      >
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
              className={`flex items-center justify-center gap-2.5 rounded-mv border px-4 py-[14px] text-[15px] font-bold no-underline shadow-mv transition-colors ${
                selected
                  ? "border-mv-green-deep bg-mv-green-deep text-white"
                  : "border-mv-line bg-mv-card text-mv-ink hover:bg-mv-bg"
              }`}
            >
              {/* The glyph is the same one the tab's own report uses for its
                  subject — the rock is layers, the hole is a droplet — so the
                  tab and the page it opens agree at a glance. */}
              <span
                aria-hidden="true"
                className={`flex-none [&_svg]:h-[17px] [&_svg]:w-[17px] ${
                  selected ? "text-white" : "text-mv-green-deep"
                }`}
              >
                <tab.Icon />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
