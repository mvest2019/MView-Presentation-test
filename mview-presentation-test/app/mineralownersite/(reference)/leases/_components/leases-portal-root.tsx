"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { usePortalViewState } from "../../../_components/reference/view-state";
import { writeFunnelState } from "../../../_lib/funnel-state-store";
import {
  DEFAULT_FUNNEL_STATE,
  DEFAULT_VIEW_TIER,
  FUNNEL_STATE_CLASS,
  viewTierClasses,
  type FunnelState,
  type ViewTier,
} from "../../../_lib/portal-state";
import "../../../portal.css";
/* One thing only: the reference sheet's form-control reset, undone for this
   subtree so the buttons stay on the page's own face instead of the browser's
   Arial. It has to load with the module, and it has to be in a layer — see the
   file. */
import "../leases-shell.css";

/**
 * MY LEASES' OWN ROOT, INSIDE THE SHARED SHELL.
 *
 * ── WHY THIS FILE EXISTS ──
 *
 * My Leases now renders through `Portal` like the Dashboard, Alerts,
 * Activities, the Weekly Report, the Production page and the Map: one header
 * file, one sidebar, one pinned value line, one account menu. It brings its own
 * view through `Portal`'s `children`, which is the Map's arrangement and the
 * adaptation that prop was added for.
 *
 * What it still needs is the thing the old `(portal)` shell gave it for free:
 * an element carrying `mv-portal` plus the two gating classes, because every
 * one of the 694 rules in `portal.css` is scoped to it and the density and
 * state gates are written as compounds — `.mv-portal.no-claim`,
 * `.mv-portal.view-ultra`. So this is that element, and nothing else.
 *
 * ── IT DOES NOT GO ON THE SHELL ROOT ──
 *
 * `Portal` takes a `shellClass`, and putting `mv-portal` there would be one
 * line instead of this file. It would also re-style the shared chrome:
 * `portal.css` is UNLAYERED and `dashboard-reference.layer.css` is layered, so
 * `.mv-portal .app-top`, `.mv-portal .app-side` and `.mv-portal #mvPinBar`
 * would all win against the reference's own rules and the common header would
 * come out as the old portal one — a 58px bar under a 236px rail that no other
 * page has. The whole point of the move is that the header is the same
 * everywhere, so the portal's stylesheet starts BELOW the chrome.
 *
 * ── THE TWO AXES COME FROM THE SHELL, NOT FROM THIS PAGE ──
 *
 * `usePortalViewState()` is the context `Portal` wraps its children in for
 * exactly this — the Map reads it too. So the density tabs in the avatar menu
 * and the account-state button in the top bar drive My Leases, the same
 * controls that drive every other page, and neither one touches the URL.
 *
 * ── AND NOTHING CLAIMED IS ONE PAGE, NOT FOUR ──
 *
 * While the account is unclaimed this renders DETAILED whatever the avatar menu
 * says, so all four modes show the same page. `view-state.tsx` hands over the
 * reader's RAW choice precisely so each surface can apply its own rule to it,
 * and this is this surface's rule.
 *
 * WHY, in the words it was asked in: everything on the page is a sample in that
 * state, and the density switch is an invitation to read your own record more
 * or less closely. Offering four readings of a record nobody has claimed yet
 * asks a stranger to tune a view of figures that are not theirs — and the four
 * differ enough that the page they were shown changes under them for a reason
 * they have no way to guess.
 *
 * DETAILED AND NOT `Portal`'S OWN ANSWER. The shell forces PROFESSIONAL when
 * unclaimed, which suits a dashboard acting as a shop window: the widest
 * column, the tightest tables. This module is a list of leases and its own
 * default reading is Detailed, so that is the one the sample is shown at — the
 * width included. See the `.no-claim` width rule in `leases-shell.css`, which
 * has to say so again to the shell.
 *
 * IT ALSO SETTLES THE GATES. `dashboard-reference.css` and `portal.css` gate on
 * the same five class names off their own roots, so a shell at Professional and
 * a page at Essentials made `.tier-s` invisible at the one tier that exists to
 * show it. One density in this state means the two roots never disagree.
 *
 * ── AND THE SERVER HAS TO AGREE ABOUT THE FUNNEL STATE ──
 *
 * The lease report swaps in the sample twin ON THE SERVER — see the page — and
 * the server reads the state from the `mv_funnel_state` cookie. The shared
 * shell keeps its copy in `localStorage`, which no server can read. So when the
 * two disagree, this mirrors the shell's answer into the cookie and asks for a
 * re-render: one effect, one write, and only when they differ, so a normal
 * render does nothing at all.
 *
 * Mirrored in this direction only. The shell owns the value; the cookie is the
 * server's read-only copy of it.
 */
export function LeasesPortalRoot({
  serverFunnelState,
  children,
}: {
  /** What the funnel state was when this page rendered on the server. */
  serverFunnelState: FunnelState;
  children: ReactNode;
}) {
  const router = useRouter();
  const view = usePortalViewState();

  /* `null` means this is being rendered outside the shell, which should not
     happen — but the defaults are the same ones the old portal root started
     from, so it renders rather than throwing. */
  const funnelState = (view?.funnel as FunnelState) ?? DEFAULT_FUNNEL_STATE;

  /* One page in every mode while nothing is claimed — see the note above. The
     reader's choice is not discarded, only not applied: the avatar menu still
     shows what they picked, and it takes effect the moment a claim exists. */
  const viewTier: ViewTier =
    funnelState === "unclaimed"
      ? "detailed"
      : (view?.tier ?? DEFAULT_VIEW_TIER);

  useEffect(() => {
    if (funnelState === serverFunnelState) return;
    writeFunnelState(funnelState);
    router.refresh();
  }, [funnelState, serverFunnelState, router]);

  return (
    <div
      className={`mv-portal ${FUNNEL_STATE_CLASS[funnelState]} ${viewTierClasses(viewTier)}`}
      data-funnel-state={funnelState}
      data-view-tier={viewTier}
    >
      {children}
    </div>
  );
}
