import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { entitlementsForUser } from "@/lib/entitlements-server";
import { getSessionUser } from "@/lib/session";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";
import { MapExplorerView } from "./_components/map-explorer-view";
import "./map-shell.css";

/**
 * THE MAP — `/mineralownersite/map`.
 *
 * Built to the mock: Esri terrain basemap, well-count bubbles, and the
 * toolbar / edge tabs / readout floating over it.
 *
 * ── WHY IT IS IN THE `(reference)` GROUP ──
 *
 * SO THAT NOTHING ABOUT THE CHROME CHANGES when an owner opens the map. This
 * page renders `Portal` with `route="map"`, which is the same shell
 * `/mineralownersite` renders: the same sidebar in the same order, the same
 * owner picker, the same top bar with its account-state and avatar menus, and
 * the same pinned value line with the four EIA settlements. Not a copy of them
 * — the same components, from the same owner snapshot, which this page loads
 * exactly the way the Dashboard's server half does. The `Map` row in that
 * sidebar lights up, and the top bar reads "Map".
 *
 * The map itself arrives as `children`, so `Portal` did not have to grow a
 * third surface to hold 51 files and an ArcGIS runtime. See the props there.
 *
 * ── WHY IT MOVED OFF `/map-explorer` ──
 *
 * The map is a signed-in surface and belongs in the owner site's URL space next
 * to the other modules; the sidebar and the phone drawer have carried a `Map`
 * row waiting on it since the portal shipped. `/map-explorer` keeps the public
 * FEATURE GUIDE, which is the page a visitor who has decided nothing yet should
 * meet.
 *
 * ── THE BODY FILLS, IT DOES NOT SCROLL ──
 *
 * `.app-body` is a 26px-padded 1180px column, which is right for cards and
 * wrong for a map. `map-shell.css` holds the four rules that make it fill the
 * space under the chrome instead, reached through `shellClass` because the
 * element they have to name, `.app-shell`, is an ancestor of `children`.
 *
 * ── THE SIGNED-OUT CASE IS A REDIRECT ──
 *
 * Not a second page. The feature guide used to be rendered at this address;
 * it has an address of its own now, and serving one page at two URLs is what a
 * canonical is for. The check is on the server because the session cookie is
 * httpOnly and only readable there — deciding it here means the right response
 * is the first one, instead of the map flashing up and being replaced.
 *
 * ── ENTITLEMENTS ARE RESOLVED HERE, AND ONLY HERE ──
 *
 * `entitlementsForUser` runs on the server, from the session, per §5.1 and
 * §7.3, and the object is handed to the view as a PROP. Never fetched on mount:
 * the spec's reason is that a fetch "would flash an ungated UI for one render
 * and then lock it — visibly worse, and briefly exploitable".
 *
 * It is also why this page cannot be cached per §7.3's option A — the tier is
 * read per request so an upgrade or a cancellation takes effect immediately.
 * `force-dynamic` was already required for the owner payload, so this costs
 * nothing new.
 *
 * `force-dynamic` for the same reason as the Dashboard: the owner comes off the
 * query string, so there is nothing correct to cache at the page level.
 */
export const metadata: Metadata = {
  title: "Map",
  description:
    "Explore mineral ownership, wells and permits on the Mineral View map.",
};

export const dynamic = "force-dynamic";

export default async function OwnerMap({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/map-explorer");

  /* Two independent server reads. The payload is the chrome's; the entitlements
     are the map's, and they must not come from the client. */
  const [initial, entitlements] = await Promise.all([
    loadInitial(searchParams),
    entitlementsForUser(user.id),
  ]);

  return (
    <Portal route="map" initial={initial} shellClass="mv-ref-mapshell">
      {/* The slot `map-shell.css` sizes. The map fills whatever it is given and
          has no height of its own, so something has to be the box. */}
      <div className="mv-map-slot">
        <MapExplorerView entitlements={entitlements} />
      </div>
    </Portal>
  );
}

/**
 * Read the four owner parameters and hand them to the data seam.
 *
 * THE SAME READ THE DASHBOARD DOES, and it is here for the chrome rather than
 * for the map: the owner picker, the pinned value line and the sidebar foot all
 * come off this payload, so without it the top of the page would be the right
 * shell with nothing in it.
 *
 * `null` on a failure rather than a thrown page — the shell retries on mount
 * when it receives no payload. The map does not depend on the result either
 * way; it reads the whole public record, not one owner, so a failed owner read
 * costs the chrome its figures and costs the map nothing.
 */
async function loadInitial(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Payload | null> {
  const q = await searchParams;
  const one = (k: string): string | undefined => {
    const v = q[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sel: OwnerSelection = {
    owner: one("owner") ?? null,
    num: one("num") ?? null,
    dist: one("dist") ?? null,
    year: one("year") ? Number(one("year")) : null,
  };
  try {
    return await getOwnerPayload(sel);
  } catch {
    return null;
  }
}
