"use client";

import { useEffect, useRef, useState } from "react";

/* NO `PortalButton` ANY MORE. This page is drawn by the route group's own
   sheet now, and `dashboard-reference.css` ships `.btn` with `.btn-primary`,
   `.btn-ghost` and `.btn-sm` — the same button every other page in the group
   presses. Importing the `(portal)` kit's button here put a second button
   design on a page that already had one. */
type ButtonVariant = "primary" | "ghost";
type ButtonSize = "sm" | "md";

/** the group's own button classes, assembled the way `Chrome` assembles them */
function btnClass(variant: ButtonVariant, size: ButtonSize, extra?: string): string {
  return [
    "btn",
    variant === "primary" ? "btn-primary" : "btn-ghost",
    size === "sm" ? "btn-sm" : null,
    extra,
  ].filter(Boolean).join(" ");
}

/** How long the confirmation stands before the button says its own name again. */
const CONFIRM_MS = 1800;

/**
 * COPY SOMETHING TO THE CLIPBOARD, AND SAY SO.
 *
 * THE WHOLE PAGE ENDS AT THIS BUTTON. Mineral View sends none of these letters
 * — the reader pastes each one into their own mail, from their own address,
 * because that is what makes it read as a note from a relative. So "did that
 * work?" is the last question the page has to answer, and a button that changed
 * nothing when pressed would leave a reader pasting into an empty message.
 *
 * IT FAILS QUIETLY AND VISIBLY AT THE SAME TIME. A browser can refuse clipboard
 * access — an insecure origin, a locked-down profile, a permission the reader
 * declined — and there is nothing useful to say about it in a dialog. The text
 * is on screen and selectable either way, so a refusal reports itself on the
 * button ("Press ⌘C to copy") and leaves the reader somewhere to go, rather
 * than claiming a copy that did not happen.
 *
 * THE TIMER IS CLEARED ON UNMOUNT. Stepping to the next letter replaces this
 * button while its confirmation is still standing; without the cleanup React
 * warns about a state update on an unmounted component, and on a fast reader it
 * would fire on whichever button took its place.
 */
export function CopyButton({
  text,
  label,
  copiedLabel = "Copied ✓",
  variant = "ghost",
  size = "sm",
  className,
  title,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  title?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "refused">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("refused");
    }
    timer.current = setTimeout(() => setState("idle"), CONFIRM_MS);
  };

  return (
    <button
      type="button"
      className={btnClass(variant, size, className)}
      title={title}
      onClick={copy}
      /* The confirmation is a visual change on a control the reader has just
         pressed, which a screen reader has no reason to revisit. `aria-live`
         on the button makes the new label announce itself in place. */
      aria-live="polite"
    >
      {state === "done"
        ? copiedLabel
        : state === "refused"
          ? "Select it and press ⌘C"
          : label}
    </button>
  );
}
