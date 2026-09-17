import type { Metadata } from "next";

import { cookies } from "next/headers";

import { PortalSessionProvider } from "../_components/portal-session";
import { PortalPrefsProvider } from "../_components/reference/prefs-context";
import {
  PORTAL_FUNNELS,
  PORTAL_FUNNEL_COOKIE,
  PORTAL_TIERS,
  PORTAL_TIER_COOKIE,
  readPortalPref,
} from "../_lib/reference/portal-prefs";
import { Sprite } from "../_components/reference/Sprite";
import { getSessionUser } from "@/lib/session";
import "../dashboard-reference.layer.css";

/**
 * THE REFERENCE SHELL — `/mineralownersite`, `/mineralownersite/briefing` and
 * `/mineralownersite/map`.
 *
 * WHY THIS IS A ROUTE GROUP. Most routes under here are the reference build's,
 * chrome included: its owner search, its pinned value line with the four EIA
 * settlements, its account-state menu, its avatar menu carrying the four
 * density tabs, its sidebar and its phone bottom bar. Only the claim flow and
 * Settings are left in the shell this app already had, which lives in
 * `(portal)/layout.tsx`. Two groups, two shells, one URL space:
 * `(reference)/page.tsx` is still `/mineralownersite` and
 * `(portal)/settings/page.tsx` is still `/mineralownersite/settings`, because a
 * route group's name never appears in a path.
 *
 * THE MAP JOINED THIS GROUP RATHER THAN THE OTHER ONE, and that was the whole
 * point of moving it here from `/map-explorer`: an owner opening the map should
 * find the same sidebar and the same top bar they just left, not a second
 * arrangement of the same idea. It renders itself and borrows the chrome
 * through `Portal`'s `children`.
 *
 * MY LEASES MOVED HERE FOR THE SAME REASON, and it was asked for in those
 * words: the list and the lease report had grown a top bar of their own, so the
 * portal showed two different headers depending on which page you were on.
 * They are `Portal` callers now, like everything else here, and they bring
 * their own body through `children` exactly as the Map does. Their own
 * stylesheet starts below the chrome — see
 * `leases/_components/leases-portal-root.tsx`.
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
 *     READING IS NOT GATING. The sign-in gate for the whole portal lives in
 *     `proxy.ts` at the app root — a request with no session never reaches
 *     this layout. A null here (a race, an expired cookie mid-render) still
 *     renders the shell rather than redirecting, same as the other group's.
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

/**
 * THE READER'S DENSITY, READ ON THE SERVER — see `prefs-context.tsx`.
 *
 * `mv.tier` and `mv.funnel` are mirrored into cookies so this layout can hand
 * them to `Portal` as its opening state. Without them the server rendered
 * `detailed` for everybody and the reader's own choice replaced it one
 * hydration later, which is the "shows pro mode and then shows ultra" defect.
 *
 * The names, the key lists and `readPortalPref` come from `_lib/reference/
 * portal-prefs`, which carries NO `'use client'` directive — importing them
 * from the context module instead gave this server component a client
 * reference rather than the array, and the validation threw.
 */
export default async function ReferencePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, jar] = await Promise.all([getSessionUser(), cookies()]);

  const tier = readPortalPref(jar.get(PORTAL_TIER_COOKIE)?.value, PORTAL_TIERS);
  const funnel = readPortalPref(jar.get(PORTAL_FUNNEL_COOKIE)?.value, PORTAL_FUNNELS);

  return (
    <>
      <Sprite />
      <PortalSessionProvider user={user}>
        <PortalPrefsProvider tier={tier} funnel={funnel}>
          {children}
        </PortalPrefsProvider>
      </PortalSessionProvider>
    </>
  );
}
