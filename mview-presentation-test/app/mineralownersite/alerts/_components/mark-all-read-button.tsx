"use client";

import { PortalButton } from "../../_components/ui/button";
import { useAlertsRead } from "./alerts-read-state";

/**
 * "MARK ALL READ" — and, once pressed, "All read ✓".
 *
 * The label change is the reference's own (`alMarkAllRead`), and it matters more
 * than it looks: the visible effect of this button is nine green edges
 * disappearing, which a reader who was scrolled past them will not see. The
 * label is the confirmation for everyone else.
 *
 * IT DOES NOT UNDO. The reference has no un-mark either, and adding one would
 * mean deciding which rows were unread before — a per-row memory that only
 * matters once there is somewhere to persist read state. See
 * `alerts-read-state.tsx` for why there is not.
 *
 * `disabled` after pressing, rather than staying live: pressing "All read ✓" a
 * second time does nothing, and a control that responds to a click by not
 * changing reads as broken.
 */
export function MarkAllReadButton() {
  const { allRead, markAllRead } = useAlertsRead();

  return (
    <PortalButton size="sm" disabled={allRead} onClick={markAllRead}>
      {allRead ? "All read ✓" : "Mark all read"}
    </PortalButton>
  );
}
