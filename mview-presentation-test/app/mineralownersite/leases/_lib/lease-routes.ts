/**
 * WHERE A LEASE LIVES. One function, so no component builds this path by hand.
 *
 * The prototype's hash router had three different shapes for the same
 * destination — `#/app/lease/smith` for one lease, `#/app/lease/detail` for
 * another, `#/app/lease/g/<number>` for the remaining eight — because two of
 * them had hand-built report pages and the rest shared a generic one. That is a
 * fact about the prototype's authoring, not about the data: every lease has a
 * number, and the number is the route.
 *
 * Ten call sites need this path (the row, the row's Open button, the report
 * link, the grid card, the plain-English list, both explainers, the annual
 * table…), which is exactly how many places would need editing if the shape
 * changed. Now it is one.
 *
 * `tab` carries the report's Reservoir and Wells panels. The lease tab is the
 * default and takes no query, so a bare lease link and the lease tab's own link
 * are the same URL — which is what makes the tab strip's `aria-current` and the
 * browser's history behave.
 */
export type LeaseReportTab = "lease" | "reservoir" | "wells";

export function leaseReportPath(
  leaseNumber: string,
  tab: LeaseReportTab = "lease",
): string {
  const path = `/mineralownersite/leases/${leaseNumber}`;
  return tab === "lease" ? path : `${path}?report=${tab}`;
}
