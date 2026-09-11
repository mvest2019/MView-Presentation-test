import { STORAGE_KEYS, toViewTier, type ViewTier } from "./portal-state";

/**
 * THE SAVED DENSITY, AS AN EXTERNAL STORE — read, write, and be told when it
 * changes.
 *
 * ── WHY THIS MODULE EXISTS ──
 *
 * The density switch used to be four `<Link href="?view=pro">`s, so choosing a
 * density NAVIGATED and left `?view=pro` in the address bar. The Dashboard next
 * door does not do that — it holds the tier in state and saves it to
 * `localStorage` — so the same control behaved differently depending on which
 * page it was opened from, and every My Leases URL an owner copied carried a
 * density in it. This is the storage half of putting the two on the same
 * footing.
 *
 * ── THE PROBLEM IT ACTUALLY SOLVES ──
 *
 * `localStorage.setItem` fires a `storage` event in OTHER tabs and never in the
 * one that wrote it. So a store subscribed to `storage` alone would update
 * every tab except the one the owner is clicking in — the one case that has to
 * work. `notify()` dispatches a custom event as well, and `subscribe` listens
 * for both: the same tab is told by the custom event, other tabs by `storage`.
 * That is the whole trick, and it is why writing must go through `writeViewTier`
 * rather than through `localStorage` directly.
 *
 * Every function here is module-level so its identity is stable across renders
 * — `useSyncExternalStore` resubscribes whenever `subscribe` changes.
 *
 * EVERY ACCESS IS GUARDED. `localStorage` throws outright in a browser set to
 * block site data, and a density preference is not worth taking the portal down
 * for: the catch falls back to the default, which is the correct answer when
 * nothing can be remembered.
 */

/** Same-tab notification. `storage` covers the other tabs; this covers this one. */
const CHANGE_EVENT = "mv:view-tier";

export function readViewTier(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.viewTier);
  } catch {
    return null;
  }
}

/** The server render, and the first client render, agree on "nothing stored". */
export function readViewTierOnServer(): string | null {
  return null;
}

export function subscribeViewTier(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Save a density and tell every subscriber, including this tab's.
 *
 * The event is dispatched even when the write throws: the reader asked for a
 * density and should get it for this visit whether or not it can be remembered
 * for the next one.
 */
export function writeViewTier(tier: ViewTier): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.viewTier, toViewTier(tier));
  } catch {
    // Private mode or blocked site data — see the note above.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
