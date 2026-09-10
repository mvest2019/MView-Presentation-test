import type { Metadata } from "next";

/**
 * MY LEASES — `/mineralownersite/leases`.
 *
 * PARKED. The module's full UI (header, portfolio value band, both explainers,
 * the two dismissible notices, the tab strip with the list, the financials and
 * the statements) is being reworked, so this route prints one line instead.
 *
 * The sections it used to compose are still on disk under `_components/` and
 * `_lib/`, untouched — nothing was deleted, so restoring the page is a matter of
 * putting the section list back in this file. See the git history of this file
 * for the order they were rendered in and why it was that order.
 *
 * NO `portalGate.pageRoot` HERE, DELIBERATELY. That class exists so `portal.css`
 * can hide a module's top-level sections in the unclaimed and Ultra states; with
 * it, the single line below would be hidden as an ungated child and the page
 * would arrive blank for those readers. A parked page says the same thing in
 * every state, so it opts out of both gates.
 */
export const metadata: Metadata = {
  title: "My Leases",
  description: "My Leases is coming soon.",
};

export default function MyLeasesPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-24">
      <p className="text-2xl font-semibold text-slate-700">Coming soon</p>
    </div>
  );
}
