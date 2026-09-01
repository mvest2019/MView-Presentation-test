import type { Metadata } from "next";
import { Suspense } from "react";

import { PinnedValueBar } from "./_components/pinned-value-bar";
import { PortalFunnelBar } from "./_components/portal-funnel-bar";
import { PortalShell } from "./_components/portal-shell";
import {
  PortalRootFallback,
  PortalStateProvider,
} from "./_components/portal-state-provider";
import { demoDisclosure } from "./_lib/portal-demo-data";
import "./portal.css";

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

export default function MineralOwnerPortalLayout({
  children,
}: LayoutProps<"/mineralownersite">) {
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
      {/* The provider reads `?state=` and `?view=` with `useSearchParams`, so it
          suspends during a prerender. The fallback is the same wrapper with the
          same defaults the provider would choose for a visitor arriving with no
          parameters — Premium, Essentials — so the swap is invisible rather
          than a flash of unstyled portal. */}
      <Suspense fallback={<PortalRootFallback>{shell}</PortalRootFallback>}>
        <PortalStateProvider>{shell}</PortalStateProvider>
      </Suspense>

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
