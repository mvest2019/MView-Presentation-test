import type { Metadata } from "next";

import { PinnedValueBar } from "../_components/pinned-value-bar";
import { PortalFunnelBar } from "../_components/portal-funnel-bar";
import { PortalSessionProvider } from "../_components/portal-session";
import { PortalShell } from "../_components/portal-shell";
import { PortalStateProvider } from "../_components/portal-state-provider";
import { demoDisclosure } from "../_lib/portal-demo-data";
import { getSessionUser } from "@/lib/session";
import "../portal.css";

/**
 * THE MINERAL OWNER PORTAL — `/mineralownersite/*`.
 *
 * WHY THIS TREE IS SEPARATE FROM THE MARKETING PAGES. The portal is a different
 * product with a different shell, a different type scale and its own gating
 * system. Everything it needs lives under this one folder — `_components` for
 * the chrome, `_lib` for the two gating axes and the record it prints,
 * `portal.css` for the design system. Nothing outside imports from here, and
 * the only thing this tree reaches out for is the shared logo config.
 *
 * ADDING A MODULE means adding a folder — `alerts/page.tsx`, `leases/page.tsx` —
 * and giving that row its `href` in `_lib/portal-nav.ts`. The shell, both
 * pinned bars, the sidebar, the drawer and the tab bar all come from this
 * layout, so no new module restructures anything or re-implements chrome.
 *
 * SEO. The route stays `mineralownersite` because it is descriptive and stable,
 * as asked. Every page under it is `noindex, nofollow`: this is a signed-in
 * owner's private dashboard, there is nothing here for a search engine to rank,
 * and the figures on screen belong to one account. `robots` set on the layout
 * covers the whole subtree, so a module added later inherits it and cannot
 * accidentally ship indexable.
 *
 * WHAT THIS LAYOUT IS NOT: an auth boundary. The portal is reachable by anyone
 * with the URL, and the demo record it prints is fictional, so nothing private
 * is exposed today. The moment it shows a real owner's figures it needs a
 * server-side check here and an API that authorises each read — see the note at
 * the foot of `_lib/portal-state.ts` and the warning in `lib/session.ts`.
 *
 * IT DOES READ THE SESSION, and reading is not gating. `getSessionUser()` is
 * awaited here so the chrome can print the member's own name, email and picture
 * instead of the demo persona's, and the value goes into
 * `PortalSessionProvider` because the cookie is httpOnly and the shell is a
 * client component. NOTHING IS REDIRECTED ON A NULL — a signed-out visitor still
 * gets the whole portal, as before, with the demo identity in the account menu.
 * Adding a redirect here would be the auth boundary this paragraph says the
 * layout is not, and it needs the API-side authorisation described above rather
 * than a cookie check.
 *
 * The marketing header and footer from the root layout still wrap this, so a
 * visitor keeps one way back to the public site. The portal's own sidebar foot
 * and drawer carry that link too.
 */
export const metadata: Metadata = {
  title: {
    // Every module under here gets "… | Mineral Owner Portal" for free.
    template: "%s | Mineral Owner Portal | Mineral View",
    default: "Mineral Owner Portal | Mineral View",
  },
  description:
    "Your minerals in one place — what they are worth, what changed, and what needs you.",
  robots: {
    index: false,
    follow: false,
    // Belt and braces: `noarchive`/`nosnippet` stop a crawler that ignores
    // `noindex` from caching a private dashboard or quoting a figure from it.
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

export default async function MineralOwnerPortalLayout({
  children,
}: LayoutProps<"/mineralownersite">) {
  /* The signed-in member, for the top bar's account menu and the drawer's
     identity block. Read here rather than in the shell: the shell is a client
     component and the `mv_user` cookie is httpOnly. Null is a normal answer —
     see the note above about this layout not being an auth boundary. */
  const user = await getSessionUser();

  const shell = (
    <PortalShell
      // Both are server components, so they are built here and handed to the
      // client shell as nodes. See the note in `portal-shell.tsx`.
      pinnedBar={<PinnedValueBar />}
      funnelBar={<PortalFunnelBar />}
    >
      {children}
    </PortalShell>
  );

  return (
    <>
      {/*
        NO SUSPENSE BOUNDARY HERE, and that is deliberate — it used to have one.

        `PortalStateProvider` reads `?state=` and `?view=` with
        `useSearchParams`, which suspends only on a STATICALLY PRERENDERED page.
        This subtree is never static: the root layout awaits `getSessionUser()`,
        which reads `cookies()`, so every route under it renders dynamically.

        The boundary it replaced was actively harmful. Its fallback rendered the
        same `shell` element as its children, so React held BOTH trees — the
        fallback one in a `<div hidden>` — and the whole portal existed twice in
        the DOM: two sidebars, two top bars, two of every id (`#mvPinBar`,
        `#mvFunnelBar`, `#mvStateCard`, `#dashcols`). Duplicate ids are invalid
        HTML and they broke the account menu, because the click landed on one
        avatar while the outside-click handler on the other closed the menu again.

        If this route is ever made static, `next build` will fail loudly with
        "Missing Suspense boundary with useSearchParams" — which is the right
        way to find out. The fix then is a boundary whose fallback is NOT the
        shell.
      */}
      {/* The member wraps the state provider rather than the other way round:
          the account menu needs both, and the session is the outer, slower-
          changing fact. The same provider wraps the reference group's shell —
          see `portal-session.tsx`. */}
      <PortalSessionProvider user={user}>
        <PortalStateProvider>{shell}</PortalStateProvider>
      </PortalSessionProvider>

      {/* Fixed, on every portal screen. The account is fictional and the portal
          says so in four places — this ribbon, the top bar chip, the sidebar
          foot and the drawer footnote. `pointer-events-none` so it can never
          swallow a click on whatever sits underneath it, and it hides below
          1024px where the top bar's chip takes over and the tab bar owns that
          corner. */}
      <div
        className="pointer-events-none fixed bottom-3 left-3 z-[2147483000] rounded-full bg-mv-slate px-[14px] py-[6px] text-[11px] font-semibold leading-[1.4] tracking-[.02em] text-white opacity-[.92] shadow-[0_2px_10px_rgba(15,23,42,.3)] max-[1024px]:hidden"
        role="note"
      >
        {demoDisclosure.ribbon}
      </div>
    </>
  );
}
