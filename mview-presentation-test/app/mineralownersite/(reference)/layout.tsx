import type { Metadata } from "next";

import { PortalSessionProvider } from "../_components/portal-session";
import { Sprite } from "../_components/reference/Sprite";
import { getSessionUser } from "@/lib/session";
import "../dashboard-reference.layer.css";

/**
 * THE REFERENCE SHELL — `/mineralownersite`, `/mineralownersite/briefing` and
 * `/mineralownersite/map`.
 *
 * WHY THIS IS A ROUTE GROUP. The first two routes are the reference build's,
 * chrome included: its owner search, its pinned value line with the four EIA
 * settlements, its account-state menu, its avatar menu carrying the four
 * density tabs, its sidebar and its phone bottom bar. The other four portal
 * routes — Alerts, My Leases, Activities, Settings — keep the shell this app
 * already had, which lives in `(portal)/layout.tsx`. Two groups, two shells,
 * one URL space: `(reference)/page.tsx` is still `/mineralownersite` and
 * `(portal)/alerts/page.tsx` is still `/mineralownersite/alerts`, because a
 * route group's name never appears in a path.
 *
 * THE MAP JOINED THIS GROUP RATHER THAN THE OTHER ONE, and that was the whole
 * point of moving it here from `/map-explorer`: an owner opening the map should
 * find the same sidebar and the same top bar they just left, not a second
 * arrangement of the same idea. It is the one route under here that is not the
 * reference build's own — it renders itself and borrows the chrome through
 * `Portal`'s `children`.
 *
 * There is deliberately NO layout at `app/mineralownersite/layout.tsx`. A
 * parent layout there would wrap both groups, and the whole point is that they
 * do not share one. Each group carries its own metadata for the same reason.
 *
 * WHAT THIS LAYOUT ITSELF DOES, and it is only three things:
 *
 *   · the stylesheet. `dashboard-reference.css` is the reference's own ten
 *     sheets, extracted and rescoped — see its header. It is imported here
 *     rather than in the pages so every route under this group gets it once.
 *
 *     THROUGH `dashboard-reference.layer.css`, which is the same sheet in the
 *     `mv-reference` cascade layer. A CSS import from JavaScript cannot name a
 *     layer, hence the one-line wrapper; the layer is what lets a Tailwind
 *     utility override a reference rule, which the Map needs and the two
 *     reference routes are unaffected by. See that file, and the order
 *     declared at the top of `app/globals.css`.
 *
 *   · the icon sprite, once. Twenty-one `<symbol>`s the sidebar, the bottom bar
 *     and the cards reference by id. It has to be in the document for
 *     `<use href="#mvi-home">` to resolve, and it is rendered here so a route
 *     change does not re-mount it.
 *
 *   · WHO IS SIGNED IN. `getSessionUser()` is awaited here and the value is put
 *     into `PortalSessionProvider`, so `Chrome`'s account menu prints the
 *     member's own name, email and picture rather than the owner RECORD's
 *     initials, and can offer them a way out.
 *
 *     HERE AND NOT IN THE SEVEN PAGES, and not as a prop through `Portal`. The
 *     cookie is httpOnly, so only a server component can read it — and `Portal`
 *     is a deliberate copy of the reference build's own file, which would have
 *     to be forked to carry a value it never uses. One read in this layout, one
 *     context, `Portal.tsx` untouched. See `portal-session.tsx`.
 *
 *     READING IS NOT GATING. Nothing is redirected on a null: this layout is no
 *     more an auth boundary than the other group's, and a signed-out visitor
 *     still gets the whole shell.
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

export default async function ReferencePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <>
      <Sprite />
      <PortalSessionProvider user={user}>{children}</PortalSessionProvider>
    </>
  );
}
