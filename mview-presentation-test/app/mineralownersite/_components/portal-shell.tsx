"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { PortalActionFooter } from "./portal-action-footer";
import { PortalBackRow } from "./portal-back-row";
import { PortalMobileDrawer } from "./portal-mobile-drawer";
import { PortalPagePurpose } from "./portal-page-purpose";
import { PortalSideNav } from "./portal-side-nav";
import { PortalTabBar } from "./portal-tab-bar";
import { PortalTopNav } from "./portal-top-nav";
import { pageNameForPath } from "../_lib/portal-nav";

/**
 * The portal chrome: sidebar, top bar, the two pinned bars, and the body.
 *
 * WHY THE TWO BARS AND THE PAGE ARRIVE AS PROPS rather than being imported
 * here. This component is a client component — it owns exactly one piece of
 * state, whether the mobile drawer is open — and a client component cannot
 * import a server component. Passing them in as `ReactNode` keeps the pinned
 * value bar (which reads the settlement file on the server), the funnel bar and
 * the whole page server-rendered, with only the drawer's boolean on the client.
 *
 * That is the shape the brief's "avoid unnecessary client-side rendering" asks
 * for, and it is what makes the gating cheap: a state or density change swaps a
 * class on the portal root and re-renders nothing else.
 *
 * THE LAYOUT ORDER MATTERS and is the design's:
 *
 *   .app-shell            the 236px sidebar + main grid
 *     .app-side           the sidebar (drawer below 1024px)
 *     .app-main
 *       .app-top          sticky, 58px
 *       #mvPinBar         sticky under it — value + spot, EVERY route
 *       #mvFunnelBar      the state message, EVERY route
 *       .app-body         the page
 *
 * Both bars sit OUTSIDE `.app-body`, which is what makes them survive
 * navigation between portal modules instead of being re-mounted per page.
 */
export function PortalShell({
  pinnedBar,
  funnelBar,
  children,
}: {
  pinnedBar: ReactNode;
  funnelBar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);

  // Close the drawer on navigation. Without this it stays open over the page it
  // just navigated to, which reads as the tap having failed.
  //
  // ADJUSTED DURING RENDER, not in an effect. Every link inside the drawer
  // already calls `onClose`, so the only route that reaches here is a history
  // move — Back or Forward with the drawer open. React's documented pattern for
  // "reset state when a value changes" is this comparison during render: it
  // resolves before the browser paints, where an effect would paint the stale
  // open drawer for one frame and then close it. It is also what
  // `react-hooks/set-state-in-effect` is pointing at.
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  // While the drawer is open the page behind it must not scroll — on iOS a
  // scrolling backdrop is what makes a drawer feel broken.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <>
      <div className="app-shell">
        <PortalSideNav />

        <div className="app-main">
          <PortalTopNav
            pageName={pageNameForPath(pathname)}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
          {pinnedBar}
          {funnelBar}
          {/*
            THE PER-ROUTE FURNITURE — the back row, "Why this page?" and the
            action footer. All three are the reference's shell components, and
            they live HERE rather than in each page for the reason the
            reference injects them per route: every module gets them for free,
            and none of them can drift between routes. A page added next week
            inherits all three by adding its entries to
            `_lib/portal-page-furniture.ts`.

            THEY SIT OUTSIDE THE PAGE'S OWN `.mv-dash-routes` WRAPPER, which
            matches the reference's structure exactly — there they are appended
            to the active `<section>`, and `.mv-dash-routes` is the inner
            container the Ultra page-replacement rule targets. So Ultra empties
            the page but keeps the reader's way back and their way onward,
            which is what the calm density is supposed to do.
          */}
          <div className="app-body">
            <PortalBackRow />
            <PortalPagePurpose />
            {children}
            <PortalActionFooter />
          </div>
        </div>
      </div>

      <PortalMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <PortalTabBar />
    </>
  );
}
