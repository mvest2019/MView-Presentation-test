"use client";

import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { PAGE_PURPOSE, PPF_STORAGE_KEY } from "../_lib/portal-page-furniture";

/**
 * "Why this page?" — v38 · P1-03, v46 · OWNER-02, v48 · OWNER-47.
 *
 * OPT-IN, NEVER ALWAYS-ON, and that is the entire design history of this
 * control. It began as a permanent explainer panel at the top of every route.
 * Ryan's note killed that: "can we put this tab somewhere else? It's just
 * moving everything pretty far down the page." So the panel became a small
 * pill, and owner content starts at the top of every screen — which on a phone
 * is the whole fold budget.
 *
 * DISMISSIBLE PER ROUTE, AND REMEMBERED. Once a reader knows what Activities
 * is for, asking again every visit is noise. The dismissal is stored per route
 * under the reference's own `mv_ppf_hide` key, so learning the Dashboard does
 * not silence the report.
 *
 * FIRST PAINT SHOWS THE CONTROL. The dismissal lives in `localStorage`, which
 * the server cannot read, so the pill renders and then disappears on hydration
 * for a reader who dismissed it. That is the right way round: the alternative
 * — hiding it until the client confirms — flashes a missing control on every
 * page for every reader who never dismissed anything. It is also exactly what
 * `PortalStateProvider` does with the saved density, for the same reason.
 *
 * WHAT IS NOT HERE. The reference's banner carries a second button, "Explain
 * every box on this page →", driving a site-wide explain-mode overlay
 * (`mvExplainToggle`). That engine is not built in this portal, and a button
 * that does nothing is worse than an absent one — so it is left out until the
 * overlay lands, rather than shipped inert.
 */

/* ----------------------------------------------------------------------------
   THE DISMISSAL SET, as an external store.

   `localStorage` IS an external system, so `useSyncExternalStore` is the tool
   React provides for reading one — the same call `portal-state-provider.tsx`
   makes for the saved view tier, and for the same two reasons: an effect that
   reads storage and calls `setState` cascades a second render (which
   `react-hooks/set-state-in-effect` objects to), and subscribing to `storage`
   means a dismissal in one tab reaches the others.

   The callbacks are module-level so their identity is stable across renders; a
   `subscribe` that changed every render would resubscribe on every one.
   ---------------------------------------------------------------------------- */

function subscribeToDismissals(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * The raw stored string — a primitive, so React's `===` check is stable and
 * cannot loop. Any read can throw (private mode, blocked site data), and
 * `null` is the right answer when it does: this is a help affordance, not a
 * gate, so failing to read it must mean "show the control".
 */
function readDismissals(): string | null {
  try {
    return window.localStorage.getItem(PPF_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** On the server there is no storage, so nothing is dismissed. */
function readDismissalsOnServer(): string | null {
  return null;
}

function isDismissed(raw: string | null, pathname: string): boolean {
  if (!raw) return false;
  try {
    const hidden = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(hidden[pathname]);
  } catch {
    return false;
  }
}

export function PortalPagePurpose() {
  const pathname = usePathname();
  const purpose = PAGE_PURPOSE[pathname];

  const stored = useSyncExternalStore(
    subscribeToDismissals,
    readDismissals,
    readDismissalsOnServer,
  );

  const [open, setOpen] = useState(false);
  const [openPath, setOpenPath] = useState(pathname);

  // A new route starts closed — the reader asked about the LAST page, and
  // carrying the banner across a navigation answers a question nobody asked.
  //
  // ADJUSTED DURING RENDER, which is React's documented pattern for "reset
  // state when a value changes" and the one `portal-shell.tsx` already uses to
  // close the mobile drawer on navigation. It resolves before paint, where an
  // effect would show the stale open banner for one frame.
  if (openPath !== pathname) {
    setOpenPath(pathname);
    setOpen(false);
  }

  function dismiss() {
    try {
      const raw = window.localStorage.getItem(PPF_STORAGE_KEY);
      const hidden = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      hidden[pathname] = true;
      window.localStorage.setItem(PPF_STORAGE_KEY, JSON.stringify(hidden));
      // `storage` does not fire in the tab that wrote it, so nudge our own
      // subscriber; every other tab hears the real event.
      window.dispatchEvent(new StorageEvent("storage", { key: PPF_STORAGE_KEY }));
    } catch {
      // Nothing to do — the control simply stays for this visit.
    }
  }

  // No sentence for this route means no control: a "Why this page?" button
  // that opens an empty box is worse than no button.
  if (!purpose || isDismissed(stored, pathname)) return null;

  return (
    <>
      <button
        type="button"
        className="ppf-why"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ⓘ Why this page?
      </button>

      {open ? (
        <div className="ppf ppf-open" role="note">
          <span aria-hidden="true">ⓘ</span>
          <span>
            <strong>What this page is for:</strong> {purpose}
          </span>
          <button
            type="button"
            className="ppf-x"
            onClick={dismiss}
            aria-label="Dismiss this explainer"
            title="Got it — don’t show on this page again"
          >
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}
