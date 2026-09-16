"use client";

import { useEffect, useState } from "react";

import { PortalLoadOverlay } from "./portal-load-overlay";

/**
 * THE DASHBOARD'S LOAD VEIL — a loader over the CONTENT AREA on every entry.
 *
 * WHY IT EXISTS. The dashboard is server-rendered from a payload snapshot, and
 * on a slow load — or right after an invite was redeemed — the first thing on
 * screen could be the UNCLAIMED state: a member who just watched "your record
 * is claimed" landing on a page that says they own nothing, for as long as
 * hydration takes. The veil is in the server HTML, so it is the first paint
 * instead.
 *
 * WHAT IT LOOKS LIKE, AND WHERE (requested): a plain spinner over the
 * dashboard's own space — the region right of the sidebar, under the top bar —
 * in the page's own background, no sheet of color and no words. The chrome
 * around it never disappears. `PortalLoadOverlay` owns that geometry.
 *
 * WHEN IT HIDES. A beat after hydration, with a fade — there is nothing to
 * wait for beyond the page being alive, because the payload rode the document.
 *
 * IT NEVER STACKS WITH THE REDEEM LOADER. The page renders exactly one of the
 * two: `InviteRedeem` while a code is being redeemed, this veil otherwise.
 */

/** How long after hydration the veil holds before fading. */
const HOLD_MS = 450;
/** The fade itself — matches the overlay's transition. */
const FADE_MS = 320;

export function DashboardVeil() {
  const [stage, setStage] = useState<"shown" | "fading" | "gone">("shown");

  useEffect(() => {
    const hold = setTimeout(() => setStage("fading"), HOLD_MS);
    const gone = setTimeout(() => setStage("gone"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(hold);
      clearTimeout(gone);
    };
  }, []);

  if (stage === "gone") return null;
  return <PortalLoadOverlay fading={stage === "fading"} />;
}
