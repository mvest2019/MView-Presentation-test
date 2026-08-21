"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Lands every in-app navigation at the top of the new page.
 *
 * WHY THIS IS NEEDED AT ALL — it is Next 16 behaviour, not a bug in a page. From
 * `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`:
 *
 *   "The default scrolling behavior of `<Link>` in Next.js is to MAINTAIN SCROLL
 *    POSITION … scroll position will stay the same as long as the Page is visible
 *    in the viewport. However, if the Page is not visible in the viewport,
 *    Next.js will scroll to the top of the first Page element."
 *
 * So the landing position depends on whether the incoming page's root element
 * happens to intersect the viewport, which makes it feel arbitrary: measured on
 * this build, scrolling /glossary to 1548 and clicking through to /blogs arrived
 * at 1548 — the middle of an article list, with its heading a screen and a half
 * above. Short pages jump to the top, tall ones do not, and nothing about the
 * link tells you which you will get.
 *
 * `<Link scroll>` cannot fix it: `true` IS this behaviour and `false` only
 * disables the fallback. The reset has to happen after the route changes.
 *
 * TWO CASES ARE DELIBERATELY LEFT ALONE, and both would be regressions if this
 * scrolled unconditionally:
 *
 *   · BACK AND FORWARD must restore where you were. That is the whole point of
 *     the button, and it is why `popstate` sets a flag the effect below honours
 *     once. Without it, reading half of a long glossary and pressing Back would
 *     dump you at the top of the page you came from.
 *   · THE FIRST RENDER, so a reload keeps the browser's own scroll restoration
 *     and a link with a `#hash` still reaches its target instead of being yanked
 *     to the top a frame later.
 *
 * `behavior: "instant"` is load-bearing: `<html>` carries `scroll-smooth`, so the
 * default would ANIMATE this — the visitor would watch the new page's content
 * scroll past on the way up, which is worse than the problem being fixed.
 */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  /* Written only from an event handler and an effect, never during render — a
     render-phase ref write is rejected by `react-hooks/refs`. */
  const cameFromHistory = useRef(false);
  const firstRender = useRef(true);

  useEffect(() => {
    const onPopState = () => {
      cameFromHistory.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (cameFromHistory.current) {
      cameFromHistory.current = false;
      return;
    }
    // A hash means the visitor asked for a specific place on the page.
    if (window.location.hash) return;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
