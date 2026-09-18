"use client";

import { useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

/**
 * REPAINT THE HEADER AFTER A REMOTE SIGN-OUT. Renders nothing.
 *
 * ── THE BUG THIS FIXES ────────────────────────────────────────────────────
 *
 * A device signed out from elsewhere is redirected here by `proxy.ts`, which
 * deletes the session cookie on the way. The cookie really is gone — this page
 * renders at all, and the proxy would have bounced a signed-in visitor straight
 * back to the portal. But the top-right corner still said **"Hi, Tushar"** with
 * a "Go to your portal" button, on a sign-in screen, for somebody who is signed
 * out.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 *
 * `app/layout.tsx` reads `getSessionUser()` and hands it to `<SiteHeader>`. It
 * is the ROOT layout, and Next does not re-render layouts above the segment
 * that changed on a client-side navigation — it reuses the cached one. The
 * middleware redirect is followed by the router as a soft navigation, so the
 * page swapped and the layout did not: a header rendered while signed in,
 * sitting above a page that only exists because we are not.
 *
 * ── WHY `router.refresh()` AND NOT A HARDER HAMMER ────────────────────────
 *
 * It re-fetches the server payload for the whole tree, layouts included, so the
 * header re-reads the (now absent) cookie and repaints as signed-out. A full
 * `location.reload()` would also work and costs the reader a white flash for a
 * correction they should barely notice.
 *
 * The profile panel's own path does not need this: it signs out with
 * `window.location.assign`, a full document load, which re-renders everything.
 * Only the middleware redirect arrives softly.
 *
 * ── ONLY ON `?signedOut=1`, AND ONLY ONCE ─────────────────────────────────
 *
 * The parent renders this solely for that case — the one time the layout is
 * known to be stale. The ref makes it fire once per mount, so a refresh that
 * re-runs effects cannot start a loop.
 */
export function RefreshAfterSignOut() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    router.refresh();
  }, [router]);

  return null;
}
