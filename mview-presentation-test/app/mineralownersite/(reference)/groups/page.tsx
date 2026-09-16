import type { Metadata } from "next";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";
import { GroupsView } from "./_components/groups-view";
import "./groups.css";

/**
 * GROUPS — `/mineralownersite/groups`.
 *
 * ── IT WEARS THE DASHBOARD'S SHELL, WHICH IS WHY IT LIVES IN THIS GROUP ──
 *
 * The same reasoning as Invite Co-Owners, which moved here for it: the chrome
 * this page should wear is the one `/mineralownersite` wears — `Chrome.tsx`, the
 * single dark bar carrying the account state, the spot prices and the avatar
 * menu with the four densities in it. A shell is not a per-page setting, so the
 * page sits where the Dashboard sits. It is also where the two axes this page
 * reads come from: `Portal` provides them through `PortalViewStateProvider`.
 *
 * ── `route={null}`, AND WHAT IT MEANS ──
 *
 * `Portal`'s third documented adaptation: a page may bring its own view through
 * `children` rather than being one of the shell's five built-in routes. `null`
 * says this is not one of them — no sidebar row lights from the shell's own
 * `route ===` tests, nothing is marked `aria-current`, and no page name is
 * printed that would be wrong. The Map, Invite and the coming-soon pages are
 * the other callers of the same arrangement.
 *
 * ── THE OWNER PAYLOAD IS FOR THE CHROME, NOT FOR THE PAGE ──
 *
 * Nothing on this page reads `initial`. The groups themselves are built from
 * this record's own leases and its appraisal roll — see `_lib/groups-data.ts` —
 * which are the fixtures My Leases and Invite already print. The payload is
 * loaded because the SHELL reads it: the value in the bar, the owner picker and
 * the sidebar foot all come off that one snapshot.
 *
 * SO A FAILED READ IS SURVIVABLE HERE in a way it is not on the Dashboard:
 * `Portal` skips its "no owner is loaded yet" card precisely when a page brings
 * its own view, so the groups render whatever the payload does and only the bar
 * comes up empty.
 *
 * ── `?g=` — ONE PARAMETER OF THIS PAGE'S OWN ──
 *
 * Every Share control on the page copies a link with the group's id on it, so a
 * link pasted into a family email opens on the group it was sent about rather
 * than on whatever the page defaults to. It is read here and handed to the view
 * as a prop rather than read from the client with `useSearchParams`: the page is
 * already dynamic for the owner, and a prop cannot be wrong on the first paint.
 *
 * `force-dynamic` for the reason every other page in this group sets it: the
 * owner comes off the query string, so there is nothing correct to cache at the
 * page level.
 */
export const metadata: Metadata = {
  title: "Groups",
  description:
    "The public groups for your county, your operators and your play types — and the private group each claimed lease opens with the other owners on it.",
};

export const dynamic = "force-dynamic";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  let initial: Payload | null = null;
  try {
    initial = await getOwnerPayload(sel);
  } catch {
    /* The page does not read this — only the chrome does — so a cold or
       unreachable source costs the bar its figures and nothing else. The
       client shell retries on mount. */
    initial = null;
  }

  return (
    /* NO `shellClass`, for the reason Invite ends up with none: this page takes
       the route group's own width, so its side gutters match the Dashboard,
       Alerts and Activities either side of it. The page's own cap is on `.gr`
       in `groups.css`. */
    <Portal route={null} initial={initial}>
      <GroupsView initialGroupId={one("g") ?? null} />
    </Portal>
  );
}
