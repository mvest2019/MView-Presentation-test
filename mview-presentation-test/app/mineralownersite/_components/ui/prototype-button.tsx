"use client";

import { useState } from "react";

import {
  PortalButton,
  type PortalButtonSize,
  type PortalButtonVariant,
} from "./button";

/**
 * A REAL, ENABLED BUTTON for an action whose module is not built — using the
 * prototype's own idiom for exactly this.
 *
 * ── WHY THIS REPLACED THE GREYED-OUT "— soon" LABELS ──
 *
 * I had been rendering these as dimmed, inert spans reading "Upload documents —
 * soon". That is the right convention for a NAVIGATION row, which is where
 * `_lib/portal-nav.ts` established it: a sidebar link with no destination should
 * not look clickable.
 *
 * It is the wrong convention here, and the prototype shows why. Its own workbook
 * buttons are fully enabled and do this:
 *
 *   onclick="this.textContent='Uploaded ✓ (prototype)'"
 *   onclick="this.textContent='Note saved ✓ (prototype)'"
 *
 * A real button that ACKNOWLEDGES the click and admits it is a prototype. That
 * is both more honest and more useful than a disabled one: the reviewer can see
 * the control at its real weight, in its real colour, in the real layout — which
 * is the entire point of a design prototype — and pressing it tells them plainly
 * that the wiring is what is missing, not the button.
 *
 * Nine controls across the lease report were greyed out this way. Being able to
 * see whether a card's primary action reads as primary is not a detail a
 * design review can do without.
 *
 * ── THE ACKNOWLEDGEMENT IS PERMANENT, PER BUTTON ──
 *
 * It does not revert on a timer. A reviewer who presses it should still be able
 * to see what it said when they come back to the card, and a label that flips
 * back looks like the click failed.
 */
export function PrototypeButton({
  children,
  acknowledgement,
  variant = "ghost",
  size = "sm",
  block = false,
  title,
}: {
  children: string;
  /** What the label becomes once pressed. The prototype's wording, verbatim. */
  acknowledgement: string;
  variant?: PortalButtonVariant;
  size?: PortalButtonSize;
  /** Full width, for the two controls the design renders as `btn-block`. */
  block?: boolean;
  title?: string;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <PortalButton
      variant={variant}
      size={size}
      title={title}
      className={block ? "w-full" : undefined}
      onClick={() => setPressed(true)}
    >
      {pressed ? acknowledgement : children}
    </PortalButton>
  );
}
