"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * WHEN IT HIDES — FROM THE SHELL BEING ON SCREEN, NOT FROM A CLOCK. The first
 * cut faded a fixed beat after hydration, and on a deployment where the shell
 * arrives late (a failed server payload read means `Portal` fetches it
 * client-side) the veil was gone before there was anything behind it: a blank
 * middle, screenshotted. `onHosted` fires when the overlay has re-homed into a
 * VISIBLE `.app-body`, and the fade counts from THAT. The one clock left is a
 * ceiling: if the shell never shows at all, the veil lifts anyway rather than
 * trapping the member behind a spinner over a page that needs its own error to
 * be read.
 */

/** How long after the shell is visibly up the veil holds before fading. */
const HOLD_MS = 450;
/** The fade itself — matches the overlay's transition. */
const FADE_MS = 320;
/** The ceiling: past this the veil lifts even over a shell that never came. */
const MAX_VEIL_MS = 8_000;

export function DashboardVeil() {
  const [stage, setStage] = useState<"shown" | "fading" | "gone">("shown");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const exiting = useRef(false);

  /* Idempotent: `onHosted` and the ceiling can both arrive; the first one
     starts the exit and the second finds it already under way. */
  const beginExit = useCallback((delay: number) => {
    if (exiting.current) return;
    exiting.current = true;
    timers.current.push(setTimeout(() => setStage("fading"), delay));
    timers.current.push(setTimeout(() => setStage("gone"), delay + FADE_MS));
  }, []);

  useEffect(() => {
    timers.current.push(setTimeout(() => beginExit(0), MAX_VEIL_MS));
    const held = timers.current;
    return () => held.forEach(clearTimeout);
  }, [beginExit]);

  if (stage === "gone") return null;
  return (
    <PortalLoadOverlay
      fading={stage === "fading"}
      onHosted={() => beginExit(HOLD_MS)}
    />
  );
}
