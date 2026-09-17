"use client";

import type { PrefetchedLeases } from "../_api/invite-prefetch";
import { usePortalViewState } from "../../../_components/reference/view-state";
import { gates } from "../../../_components/ui/portal-gating";
import { InviteHeader, UnclaimedInviteNotice } from "./invite-header";
import { InviteWorkbench } from "./invite-workbench";

/**
 * THE PAGE'S BODY, handed to the reference shell through `Portal`'s `children`.
 *
 * ── THE NO-CLAIM SWAP, AND WHY IT IS REACT HERE ──
 *
 * Under `(portal)` the swap cost nothing: `portal.css` hides every direct child
 * of `.mv-dash-routes` that is not `.nc-only` whenever an `.nc-swap` panel is
 * showing, so one class on the notice replaced the page with no state and no
 * re-render.
 *
 * THAT DID NOT SURVIVE THE MOVE, and it failed silently — which is how it
 * reached a screenshot. This group does not load `portal.css`;
 * `dashboard-reference.css` has its own `nc-only`, so the NOTICE still appeared
 * and disappeared with the claim state and everything looked wired. But its
 * swap rule is
 * `.mv-ref-app.no-claim section[data-route].active:has(> .nc-swap) > :not(.nc-only)`
 * — it selects children of the shell's own route `<section>`, and a page that
 * brings its own view through `children` is never inside one. So the class
 * matched nothing, and an unclaimed visitor got the notice with the full page
 * beneath it: a lease picker, a co-owner list and an invite code for a record
 * nobody had claimed, under a banner saying there was nothing to show.
 *
 * So the shell is asked directly. `usePortalViewState()` is the context
 * `Portal` wraps every child in, holding the reader's tier and funnel state.
 * Reading it makes the swap explicit and testable, and it moves with the shell:
 * changing the state in the top bar re-renders this at once, which is what the
 * CSS did.
 *
 * NULL IS A REAL ANSWER and means this is rendering outside the reference
 * shell. There is nowhere to ask, so it shows the page rather than a claim
 * prompt — a missing provider should not lock a reader out of a page.
 *
 * ── WHY THIS PAGE SWAPS AT ALL, WHERE SETTINGS DOES NOT ──
 *
 * Settings stays fully usable with no claim because it is about the PERSON.
 * This page is about ONE OWNER RECORD — which leases are yours, who else is on
 * them, and a code worked out from your own owner number — so with nothing
 * claimed every card below would be furniture around an empty list.
 *
 * The `pageRoot` wrapper and the notice's own gate classes are left as they
 * were. They are inert in this group, and they are what the page goes back to
 * wearing if it ever returns to the portal shell.
 */
export function InviteView({
  initialLeases,
}: {
  /** The server-prefetched first page of leases — see `invite-prefetch.ts`. */
  initialLeases: PrefetchedLeases | null;
}) {
  const view = usePortalViewState();
  const claimed = view === null || view.funnel !== "unclaimed";

  if (!claimed) {
    return (
      <div className={`iv ${gates("pageRoot")}`}>
        <UnclaimedInviteNotice />
      </div>
    );
  }

  /* `iv` IS THE CONTAINER EVERY BREAKPOINT ON THIS PAGE MEASURES.
     `invite.css` sets `container-type: inline-size` on it, and the step cards,
     the facts strip, the owner table, the rail and the mail preview all size
     themselves against THIS box rather than against the window — which is the
     reference's own arrangement, and it records why: the shell spends most of a
     1024px viewport on its sidebar, so a page 664px wide was being asked to lay
     itself out as though it had 1024. Without this class every one of those
     queries silently falls back to its narrow branch. */
  return (
    <div className={`iv ${gates("pageRoot")}`}>
      <InviteHeader />
      <InviteWorkbench initialLeases={initialLeases} />
    </div>
  );
}
