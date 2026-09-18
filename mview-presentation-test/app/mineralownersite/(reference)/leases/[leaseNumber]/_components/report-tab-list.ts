import { Droplet, FileText, Layers, type LucideIcon } from "lucide-react";

/**
 * WHAT THE THREE REPORTS ARE CALLED — AND NOTHING THAT RUNS IN A BROWSER.
 *
 * ── WHY THIS IS NOT IN `report-tabs.tsx` ──
 *
 * That file is `"use client"`, because pressing a tab now switches the report
 * in place instead of asking the server for it. Everything a client module
 * exports becomes a client reference when a SERVER component imports it — so
 * `leaseReportTab()` called on the server would not be the function, it would
 * be a stub, and the fixture path's `LeaseReportHeader` would throw where it
 * builds the breadcrumb.
 *
 * The list and the lookup are plain data with no interactivity in them, so they
 * live here and both sides can have them. Three places need these two facts —
 * the strip, the breadcrumb, and the title's own glyph — and holding them once
 * is what stops a tab being renamed in one place and keeping its old name in
 * the other two.
 *
 * The icon is the COMPONENT, not an element, because each of the three sites
 * draws it at its own size — 17px in the tab, 22px beside the title.
 */

export type LeaseReportTab = "lease" | "reservoir" | "wells";

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
