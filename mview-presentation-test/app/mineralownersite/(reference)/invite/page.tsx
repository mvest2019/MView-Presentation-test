import type { Metadata } from "next";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";
import { prefetchInviteLeases } from "./_api/invite-prefetch";
import { InviteView } from "./_components/invite-view";
import "./invite.css";
import "../../page-gutters.css";

/**
 * INVITE CO-OWNERS — `/mineralownersite/invite`.
 *
 * ── IT WEARS THE DASHBOARD'S SHELL, WHICH IS WHY IT LIVES IN THIS GROUP ──
 *
 * The module was built under `(portal)` and moved here (requested): the header
 * it should wear is the one `/mineralownersite` wears, and that is `Chrome.tsx`
 * — the single dark bar carrying the account state, the spot prices and the
 * avatar. A shell is not a per-page setting: the `(portal)` group stacks its
 * own white top bar, value bar and funnel bar, so the only way for this page's
 * chrome to BE the Dashboard's is for the page to sit where the Dashboard sits.
 * The page came to the shell rather than the shell to the page.
 *
 * ── `route={null}`, AND WHAT IT MEANS ──
 *
 * `Portal`'s third documented adaptation: a page can bring its own view through
 * `children` rather than being one of the shell's five built-in routes. `null`
 * says this is not one of them — no sidebar row lights from the shell's own
 * `route ===` tests, nothing is marked `aria-current`, and no page name is
 * printed that would be wrong. The Map and the coming-soon pages are the other
 * callers of the same arrangement.
 *
 * ── THE OWNER PAYLOAD IS FOR THE CHROME, NOT FOR THE PAGE ──
 *
 * Everything the three steps print comes from the fixture in
 * `_lib/invite-records.ts`; nothing here reads `initial`. It is loaded because
 * the SHELL reads it — the value in the bar, the owner picker and the sidebar
 * foot all come off that one snapshot, and without it the bar renders with no
 * owner in it.
 *
 * SO A FAILED READ IS SURVIVABLE HERE in a way it is not on the Dashboard:
 * `Portal` skips its "no owner is loaded yet" card precisely when a page
 * brought its own view, so the three steps render whatever the payload does and
 * only the bar comes up empty. `getOwnerPayload` already returns the captured
 * `owner-payload.json` when no API base is configured, which is the normal
 * local case.
 *
 * `force-dynamic` for the reason every other page in this group sets it: the
 * owner comes off the query string, so there is nothing correct to cache at the
 * page level.
 */
export const metadata: Metadata = {
  title: "Invite Co-Owners",
  description:
    "The other owners of your leases are named on the public appraisal roll. Pick the ones you know and an email is written for each of them, with their own invite code.",
};

export const dynamic = "force-dynamic";

export default async function InviteCoOwnersPage({
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

  /* THE TWO SERVER READS RUN TOGETHER. The shell payload is this render's
     slow part; the invite prefetch rides inside its window instead of adding
     its own. Either may miss on its own terms — the payload cost is the bar's
     figures, the prefetch's is one extra client round trip — and neither can
     fail the page. */
  const [initial, initialLeases] = await Promise.all([
    getOwnerPayload(sel).catch(() => null as Payload | null),
    prefetchInviteLeases(),
  ]);

  return (
    /* NO `shellClass`. This passed `mv-invite-wide`, which lifted the shell's
       body from 1340px to 1600px on the argument that a lease picker and a
       ninety-row table are better for the room. It was reverted: the page then
       had visibly narrower side gutters than the Dashboard, Alerts and
       Activities beside it, which on a wide monitor reads as the page having
       come loose from the shell. It takes the group's width now. See
       `invite.css`. */
    <Portal route={null} initial={initial} shellClass="mv-wide-gutters">
      <InviteView initialLeases={initialLeases} />
    </Portal>
  );
}
