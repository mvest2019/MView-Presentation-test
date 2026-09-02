"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  PREVIOUS_SCREEN_FALLBACK,
  ROUTE_LABELS,
  ROUTE_PARENT,
  TOP_LEVEL_ROUTES,
} from "../_lib/portal-page-furniture";

/**
 * The back row — §A-1, v38 · P2-01, v41 · AUDIT #4.
 *
 * TWO KINDS OF BACK, and keeping them apart is the whole component.
 *
 *   A SUB-PAGE goes to its DETERMINISTIC PARENT. A lease report goes to My
 *   Leases whatever the reader did first. The reference records what the
 *   alternative produced: "Map → Back to Sign in is gone" — a raw history stack
 *   offering to send an owner back to the login screen.
 *
 *   A TOP-LEVEL PAGE goes BACK IN HISTORY, and ONLY when this session has
 *   somewhere to go. AUDIT #4 asked for a back control on every tab; the honest
 *   form of that on the first page of a visit is no control at all, rather than
 *   a button that quietly guesses at the Dashboard.
 *
 * WHY A STACK OF OUR OWN AND NOT `router.back()` ALONE. The row does not just
 * go back, it NAMES where it goes — "← Back / to Activities". `history.back()`
 * cannot tell us that, and `document.referrer` is empty on a client-side
 * navigation. So the component keeps the same stack of visited paths the
 * reference keeps, purely to read the previous entry's label off it.
 *
 * IT IS SESSION-LOCAL AND DELIBERATELY SO. A full page reload starts the stack
 * empty, so the row disappears; that is correct, because a reload also empties
 * what the reader can meaningfully go "back" to inside the portal.
 */
export function PortalBackRow() {
  const pathname = usePathname();
  const router = useRouter();

  /**
   * Visited portal paths, oldest first — the reference's `MV_STACK`.
   *
   * STATE, NOT A REF, even though nothing here needs to be reactive on its own.
   * The stack is READ DURING RENDER to label the row, and a ref read during
   * render is exactly what `react-hooks/refs` forbids: a ref change does not
   * schedule a render, so the label would go stale the moment the two got out
   * of step. Holding it in state makes the read legal and the label correct by
   * construction.
   */
  const [nav, setNav] = useState<{ path: string | null; stack: string[] }>({
    path: null,
    stack: [],
  });

  // RECORDED DURING RENDER, not in an effect. React's documented "adjust state
  // when a prop changes" pattern — the same one `portal-shell.tsx` uses to
  // close the drawer on navigation. It resolves before paint, where an effect
  // would render the row with the previous route's label for one frame.
  //
  // The `!==` guard inside drops repeats of the current path. A query-string
  // change is a density swap, a tab or a scope — those are not PLACES, and
  // without the guard, changing the radius three times would bury the real
  // previous page under three identical entries.
  if (nav.path !== pathname) {
    setNav((previousNav) => ({
      path: pathname,
      stack:
        previousNav.stack[previousNav.stack.length - 1] === pathname
          ? previousNav.stack
          : [...previousNav.stack, pathname].slice(-60),
    }));
  }

  const previous = nav.stack.length >= 2 ? nav.stack[nav.stack.length - 2] : null;

  const parent = ROUTE_PARENT[pathname];

  if (parent) {
    const [href, label] = parent;
    return (
      <div className="mv-backrow">
        <Link href={href}>← Back</Link>
        <span className="tiny">to {label}</span>
      </div>
    );
  }

  // Not a known sub-page. Top-level routes get history-back; anything else is
  // left alone rather than guessed at.
  if (!TOP_LEVEL_ROUTES.includes(pathname) || !previous) return null;

  return (
    <div className="mv-backrow">
      <button type="button" onClick={() => router.back()}>
        ← Back
      </button>
      <span className="tiny">
        to {ROUTE_LABELS[previous] ?? PREVIOUS_SCREEN_FALLBACK}
      </span>
    </div>
  );
}
