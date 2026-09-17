import {
  DEFAULT_FUNNEL_STATE,
  STORAGE_KEYS,
  toFunnelState,
  type FunnelState,
} from "./portal-state";

/**
 * THE DEMO'S FUNNEL STATE, AS AN EXTERNAL STORE — read, write, and be told when
 * it changes.
 *
 * ── WHY THIS MODULE EXISTS ──
 *
 * The state switch used to be five `<Link href="?state=lapsed">`s, so choosing a
 * state NAVIGATED and left `?state=lapsed` in the address bar. The Dashboard
 * next door does not do that — it holds the state in React and swaps the view
 * with no URL at all — so the same control behaved differently depending on
 * which page it was opened from, and every My Leases URL an owner copied
 * carried a demo state in it.
 *
 * This is the same move `view-tier-store.ts` made for the density switch, for
 * the same reason and with the same shape. Read that file's note on `notify()`:
 * the custom-event trick is identical and is why writes must go through
 * `writeFunnelState` rather than touching the cookie directly.
 *
 * ── WHY A COOKIE AND NOT `localStorage` ──
 *
 * This is the one difference from the density store, and it is not a
 * preference. Density is gated entirely in CSS, so only the browser ever needs
 * to know it. The funnel state also decides WHICH RECORD the lease report
 * builds from — an unclaimed reader is shown the sample — and that choice is
 * made on the server, where `localStorage` does not exist. A cookie is the one
 * client-writable store both sides can read.
 *
 * It is deliberately a session cookie with `SameSite=Lax` and no `Secure`: it
 * holds a demo affordance, not a credential, and it must survive a page
 * navigation on plain `http://localhost` during development.
 *
 * ── AND WHY THE SWITCH STILL HAS TO REFRESH ──
 *
 * Writing the cookie updates the class on the portal root immediately, which is
 * every CSS gate. The server-rendered half — the record the lease report was
 * built from — only changes on the next server render, so the menu calls
 * `router.refresh()` after writing. That is a re-render of the current URL, not
 * a navigation: the address bar does not move and no history entry is added.
 */

/** Same-tab notification. `storage` covers other tabs; this covers this one. */
const CHANGE_EVENT = "mv:funnel-state";

/** How long the demo state is remembered. A session, and no longer. */
const MAX_AGE_SECONDS = 60 * 60 * 8;

export function readFunnelState(): string | null {
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${STORAGE_KEYS.funnelState}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** The server render, and the first client render, agree on "nothing stored". */
export function readFunnelStateOnServer(): string | null {
  return null;
}

export function subscribeFunnelState(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Save a state and tell every subscriber, including this tab's.
 *
 * The event is dispatched even when the write throws: the reader asked for a
 * state and should get it for this visit whether or not it can be remembered.
 */
export function writeFunnelState(state: FunnelState): void {
  try {
    document.cookie = `${STORAGE_KEYS.funnelState}=${encodeURIComponent(
      toFunnelState(state),
    )}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch {
    // Blocked site data — see the note above.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** What the server should build for, given the cookie it was sent. */
export function funnelStateFromCookie(value: string | undefined): FunnelState {
  return value ? toFunnelState(value) : DEFAULT_FUNNEL_STATE;
}
