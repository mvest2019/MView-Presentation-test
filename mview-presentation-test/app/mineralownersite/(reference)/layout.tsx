import type { Metadata } from "next";

import { Sprite } from "../_components/reference/Sprite";
import "../dashboard-reference.css";

/**
 * THE DASHBOARD AND WEEKLY REPORT SHELL — `/mineralownersite` and
 * `/mineralownersite/briefing`.
 *
 * WHY THIS IS A ROUTE GROUP. These two routes are the reference build's, chrome
 * included: its owner search, its pinned value line with the four EIA
 * settlements, its account-state menu, its avatar menu carrying the four
 * density tabs, its sidebar and its phone bottom bar. The other four portal
 * routes — Alerts, My Leases, Activities, Settings — keep the shell this app
 * already had, which lives in `(portal)/layout.tsx`. Two groups, two shells,
 * one URL space: `(reference)/page.tsx` is still `/mineralownersite` and
 * `(portal)/alerts/page.tsx` is still `/mineralownersite/alerts`, because a
 * route group's name never appears in a path.
 *
 * There is deliberately NO layout at `app/mineralownersite/layout.tsx`. A
 * parent layout there would wrap both groups, and the whole point is that they
 * do not share one. Each group carries its own metadata for the same reason.
 *
 * WHAT THIS LAYOUT ITSELF DOES, and it is only three things:
 *
 *   · the stylesheet. `dashboard-reference.css` is the reference's own ten
 *     sheets, extracted and rescoped — see its header. It is imported here
 *     rather than in the pages so both routes get it once.
 *
 *   · the icon sprite, once. Twenty-one `<symbol>`s the sidebar, the bottom bar
 *     and the cards reference by id. It has to be in the document for
 *     `<use href="#mvi-home">` to resolve, and it is rendered here so a route
 *     change does not re-mount it.
 *
 *   · nothing else. The shell is `Chrome`, and `Chrome` is rendered by
 *     `Portal`, which each page renders with its own `route` prop. That is the
 *     reference's own arrangement: one client shell holding the state both
 *     surfaces share, with a real server page per route for a cold entry.
 *
 * SEO. `noindex, nofollow` like the rest of the portal: this is a signed-in
 * owner's dashboard, there is nothing here for a search engine to rank, and
 * the figures on screen belong to one account.
 */
export const metadata: Metadata = {
  title: {
    template: "%s | Mineral Owner Portal | Mineral View",
    default: "Mineral Owner Portal | Mineral View",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

export default function ReferencePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sprite />
      {children}
    </>
  );
}
