"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * THE EVIDENCE DRAWER — `portal.css`'s `.ctx-scrim` / `.ctx-drawer` family, and
 * the surface `mvCtxOpen()` opens throughout the reference build.
 *
 * ── WHAT IT IS FOR ──
 *
 * A right-side panel that explains the thing the reader just clicked WITHOUT
 * taking them off the page. The design's own note on it (v34, Ryan 2026-07-13):
 * every alert and recent-changes card opens one, the owner stays on their
 * dashboard, and the drawer answers four fixed questions before offering an
 * optional door to the full screen. "Explanation is the default; navigation is
 * the choice."
 *
 * It is used by the Alerts inbox today and by the dashboard's alert cards, the
 * permit views, the price charts and the audit hooks in the reference — which is
 * why it lives in `_components/ui/` rather than inside one module.
 *
 * ── WHY IT IS HAND-ROLLED AND NOT `<dialog showModal>` ──
 *
 * `portal-ui.md` prefers the native element wherever it does the job, and
 * `showModal()` would give a real focus trap, Escape and an inert background for
 * free. It is turned down here for one reason: the design slides the panel in
 * and out over 280ms, and a modal `<dialog>` has no state between "open" and
 * "closed" to animate the exit from without a second mechanism to hold it in the
 * DOM while it leaves. The reference's own approach — a permanently mounted
 * panel translated off-screen — animates both directions with one CSS
 * transition and nothing to coordinate.
 *
 * So the four things `showModal()` would have supplied are supplied explicitly
 * below, and each is load-bearing:
 *
 *   ESCAPE            the reference binds it; a panel that covers the page must
 *                     close from the keyboard.
 *   FOCUS MOVED IN    on open, so the next Tab lands inside the panel and not on
 *                     the alert list behind it.
 *   FOCUS RESTORED    on close, to the control that opened it (v38 · P1-13:
 *                     "focus is trapped inside and restored on close"). Without
 *                     this a keyboard reader is returned to the top of the page
 *                     every time they read an explainer.
 *   TAB CYCLED        so focus cannot walk out of the panel into content the
 *                     scrim has made unreachable by mouse.
 *
 * ── IT IS ALWAYS MOUNTED, AND `visibility` IS WHY THAT IS SAFE ──
 *
 * `.ctx-drawer` carries `visibility: hidden` when closed, not just a transform.
 * A translated-away panel with visible content stays focusable and stays in the
 * accessibility tree — Tab would walk into an off-screen drawer. `visibility`
 * removes it from both while keeping the transform animatable.
 */
export function ContextDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** The heading. Includes the design's leading glyph where it has one. */
  title: ReactNode;
  /** The provenance line under it — where the panel's facts come from. */
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  /* The element that opened the panel, so focus can go back to it. */
  const openerRef = useRef<Element | null>(null);

  const focusables = useCallback((): HTMLElement[] => {
    const root = drawerRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);
  }, []);

  /* OPENING: remember the opener, move focus in, scroll the body to the top.
     The scroll reset matters because the panel is reused for every alert — the
     reference resets `body.scrollTop` for the same reason, and without it the
     second explainer opens halfway down. */
  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    focusables()[0]?.focus();

    /* Captured for the cleanup below. The drawer is permanently mounted, so
       `drawerRef.current` is the same node on the way out — but reading a ref
       during cleanup is the pattern `react-hooks/exhaustive-deps` warns about,
       and it is right to: nothing here guarantees that in future. */
    const drawer = drawerRef.current;

    /* The page behind must not scroll under the scrim. Restored exactly, not set
       to "auto", so a stylesheet that had its own value keeps it. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      /* Only take focus back if it is still inside the panel. If the reader
         has clicked something else in the meantime, stealing it would be worse
         than leaving it where they put it. */
      const active = document.activeElement;
      if (
        openerRef.current instanceof HTMLElement &&
        (active === document.body || drawer?.contains(active))
      ) {
        openerRef.current.focus();
      }
    };
  }, [open, focusables]);

  /* ESCAPE and TAB. One listener, bound only while the panel is open. */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      /* Wrap at both ends, and pull focus in if it has escaped entirely — which
         happens when the panel opens over a page whose focus was elsewhere. */
      if (!drawerRef.current?.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, focusables]);

  return (
    <>
      {/* THE SCRIM CLOSES ON CLICK, as the reference's does. It is a `div` and
          not a `button` deliberately: it is 100% of the viewport, and a button
          that size lands in the tab order and is announced as a control. Escape
          and the two close controls in the header are the accessible paths. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[370] bg-[rgba(4,35,26,.45)] ${
          open ? "block" : "hidden"
        }`}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[371] flex w-[min(680px,100vw)] flex-col overflow-hidden bg-mv-bg shadow-[-12px_0_40px_rgba(0,0,0,.25)] transition-transform duration-[280ms] ease-out motion-reduce:transition-none ${
          open
            ? "visible translate-x-0"
            : "invisible translate-x-[102%]"
        }`}
      >
        <div className="flex flex-none items-center gap-2.5 bg-mv-green-ink px-4 py-3">
          {/*
            "← BACK" AND "✕" BOTH CLOSE, and that is the reference's own
            arrangement rather than a duplicated control.

            They are not the same affordance to a reader. The drawer is opened
            from a row the reader was looking at, so "Back" describes what
            closing it actually does — it returns you to the list — and it is
            the large, high-contrast target on the left where a thumb reaches on
            a phone. The "✕" is the convention for dismissing an overlay, and
            it sits where every other overlay in the product puts it.
          */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white px-3.5 py-[7px] text-[12.5px] font-bold text-mv-green-ink hover:bg-mv-portal-drawer-back-hover"
          >
            ← Back
          </button>

          <div className="min-w-0 flex-1">
            <h3 className="text-[15.5px] leading-[1.25] font-bold text-white">
              {title}
            </h3>
            {subtitle && (
              <div className="mt-0.5 text-[11px] text-mv-portal-drawer-sub">
                {subtitle}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-none cursor-pointer border-0 bg-transparent p-1.5 text-base text-mv-portal-drawer-sub hover:text-white"
          >
            ✕
          </button>
        </div>

        <div
          ref={bodyRef}
          className="flex-1 overflow-x-hidden overflow-y-auto px-4 pt-3.5 pb-5"
        >
          {children}
        </div>
      </div>
    </>
  );
}
