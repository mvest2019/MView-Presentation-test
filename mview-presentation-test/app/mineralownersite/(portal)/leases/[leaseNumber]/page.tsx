import type { Metadata } from "next";

/**
 * ONE LEASE'S REPORT — `/mineralownersite/leases/[leaseNumber]`.
 *
 * PARKED, alongside the My Leases list one level up. The report's full UI (the
 * breadcrumb, the title and owner-value cards, the change feed, the unit-outline
 * map, the 237-month production chart, the decline curve, the benchmark note,
 * the payment card, the estimate derivation, the bottom tiles, and the
 * reservoir and wells reports behind `?report=`) is being reworked, so every
 * lease number prints one line instead.
 *
 * NO LOOKUP AND NO `notFound()` ANY MORE, deliberately. While the page showed a
 * real report, a lease number that was not on the owner's record had to 404 —
 * "this is not yours" rather than "we have nothing to show you". A parked page
 * makes no claim about the record either way, so there is nothing for an unknown
 * number to be wrong about, and keeping the lookup alive only to gate one static
 * sentence would read as a decision that still meant something.
 *
 * The sections it used to compose are still on disk under `_components/` and
 * `_lib/`, untouched — see the git history of this file for the order they were
 * rendered in and why the tabs are server-resolved rather than force-mounted.
 *
 * NO `portalGate.pageRoot`/`reportRoot` HERE, for the reason given in the list
 * page next door: those classes exist so `portal.css` can hide or swap a
 * module's top-level sections in the unclaimed and Ultra states, and with them
 * the single line below would be gated away for those readers.
 */
export const metadata: Metadata = {
  title: "Lease report",
  description: "Lease reports are coming soon.",
};

export default function LeaseReportPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-24">
      <p className="text-2xl font-semibold text-slate-700">Coming soon</p>
    </div>
  );
}
