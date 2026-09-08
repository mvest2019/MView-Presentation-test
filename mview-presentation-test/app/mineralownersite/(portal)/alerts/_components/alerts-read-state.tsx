"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * "MARK ALL READ", SHARED BY TWO SECTIONS THAT ARE NOT NEAR EACH OTHER.
 *
 * The button lives in the page header; the green unread rules live on nine rows
 * further down, with the Essentials hero and the watch ledger in between. The
 * design puts them there and neither can move: the header is where a reader
 * looks for an inbox-wide control, and the rows are the inbox.
 *
 * ── WHY A CONTEXT AND NOT A WRAPPER COMPONENT ──
 *
 * A wrapper would have to contain both sections, which would make it a single
 * child of `.mv-dash-routes` — and `portal.css` gates the page by hiding
 * DIRECT CHILDREN of that element in the Ultra tier and while unclaimed. The
 * sections would still hide correctly (the wrapper would be the hidden child),
 * but the page would stop being the flat list of sections every other portal
 * route is, for no reason except state plumbing.
 *
 * A context provider renders NO DOM AT ALL, so the header and the inbox stay
 * direct children and the gates keep reaching them. That is the whole reason
 * this file exists.
 *
 * ── IT IS SESSION-ONLY, AND SAYS SO ──
 *
 * Marking read does not survive a reload, and the sidebar's unread badge does not
 * move with it. Both are the same missing piece: read state belongs to an owner
 * on a server, and there is no owner and no server yet — the record on screen is
 * fictional. `records-update-notice.tsx` in the leases module reached the same
 * conclusion for the same reason, and the note there applies here: faking
 * persistence in `localStorage` would half-work, remembering on one browser and
 * forgetting on another, which is worse than resetting predictably.
 */

interface AlertsReadState {
  allRead: boolean;
  markAllRead: () => void;
}

const AlertsReadContext = createContext<AlertsReadState | null>(null);

export function AlertsReadProvider({ children }: { children: ReactNode }) {
  const [allRead, setAllRead] = useState(false);

  const value = useMemo(
    () => ({ allRead, markAllRead: () => setAllRead(true) }),
    [allRead],
  );

  return (
    <AlertsReadContext.Provider value={value}>
      {children}
    </AlertsReadContext.Provider>
  );
}

/**
 * Throws outside the provider rather than returning a default.
 *
 * A silent `allRead: false` fallback would leave "Mark all read" rendering
 * happily and doing nothing at all — a control that looks like it works is the
 * one failure mode worth crashing the page in development to prevent.
 */
export function useAlertsRead(): AlertsReadState {
  const state = useContext(AlertsReadContext);
  if (!state) {
    throw new Error("useAlertsRead must be used inside <AlertsReadProvider>");
  }
  return state;
}
