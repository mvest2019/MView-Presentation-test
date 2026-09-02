"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { DEFAULT_VIEW_TIER, toViewTier } from "../../_lib/portal-state";

/**
 * `?jump=` — the report's navigation, and the direct counterpart of the
 * Activities module's `?tab=`.
 *
 * WHY IT IS URL STATE. The report is one long document with seven landmarks,
 * and every way of reaching one has to agree:
 *
 *   THE RAIL       seven stops across the top.
 *   THE COVER      each of the four answers links to the page that proves it
 *                  ("Page 2 →"), which is the reference's own `?jump=wrPage2`.
 *   THE COPY       the layers note points at the upload panel
 *                  (`?jump=wrEstAcc`).
 *
 * A scroll held in component state would make the rail work and leave the
 * other two dead, and none of the three would be shareable. So the landmark
 * lives in the query string, exactly as the tab does on Activities: one
 * mechanism, deep-linkable, and Back steps through the reader's route into the
 * document.
 *
 * IT HAS TO DEEPEN THE DENSITY FIRST. In Essentials only the cover renders —
 * pages 2 to 5 are in the markup but hidden — and `scrollIntoView` on a hidden
 * element does nothing at all, so the reader would press "Page 2 →" and watch
 * the page ignore them. The reference hits the same wall and answers it the
 * same way: its `wrGo` falls through to `wrEvidence`, which calls
 * `setViewTier('detailed')` when the target is not on screen. The click means
 * "show me that", not "move me there".
 *
 * WHAT IS NOT REPRODUCED. `wrEvidence` prefers to open the page in a context
 * drawer, cloned and un-tiered, over deepening the whole view. That drawer is
 * the `mvCtx` engine, which this portal has not built — so this takes the
 * reference's own documented fallback rather than shipping a half-drawer.
 */

/** Is this density one where only the cover renders? */
function isCalmTier(tier: string): boolean {
  // Ultra carries `view-simple` too, so both calm densities hide the deep pages.
  return tier === "simple" || tier === "ultra";
}

/** Landmarks that only exist once the density is Detailed or Professional. */
const DEEP_TARGETS = new Set([
  "wrPage2",
  "wrPage3",
  "wrPage4",
  "wrPage5",
  "wrMonthly",
  "wrArchive",
]);

/**
 * Scroll once the target actually HAS a layout box.
 *
 * WHY POLLING AND NOT A SINGLE FRAME. A deepening jump changes a class on the
 * portal root, which re-renders the page and reveals four `.wr-page` blocks —
 * including page 3 and its three Esri map rasters. Immediately after the click
 * the target is still `display: none`, and `scrollIntoView` on a hidden element
 * is a no-op. The reference papers over the same race with a flat 250ms wait;
 * waiting for the CONDITION is faster when the layout has already settled and
 * safer when it takes longer than someone's guess, and it gives up rather than
 * looping forever if the target never appears — the honest outcome for a
 * landmark the current density genuinely does not render.
 *
 * WHY `setTimeout` AND NOT `requestAnimationFrame`. rAF does not fire at all
 * while the document is hidden, so an rAF-driven scroll silently never happens
 * in a BACKGROUND TAB — which is a real path here: middle-clicking or
 * cmd-clicking a "Page 3 →" link, or opening a shared `?jump=` URL in a new
 * background tab, runs this code with `document.hidden === true`. Measured: in
 * a hidden tab, `requestAnimationFrame` fired 0 times over 600ms while
 * `setTimeout` fired normally. The reference's `mvApplyJump` uses `setTimeout`
 * for the same reason, and it means the page is already in the right place
 * when the reader switches to the tab instead of sitting at the top.
 */
function scrollWhenReady(id: string, budgetMs = 1200) {
  const step = 50;
  let waited = 0;

  function attempt() {
    const el = document.getElementById(id);
    // `offsetParent` is null under a `display: none` ancestor, which is exactly
    // the state the density gate leaves the deeper pages in.
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    waited += step;
    if (waited < budgetMs) window.setTimeout(attempt, step);
  }

  window.setTimeout(attempt, 0);
}

/**
 * The shared jump action.
 *
 * Returns a function rather than a component so the rail (buttons) and the
 * in-copy links (anchors) can share one implementation — the thing that went
 * wrong in the reference was six links and a rail each solving this separately.
 */
export function useReportJump() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const tier = params.get("view")
    ? toViewTier(params.get("view"))
    : DEFAULT_VIEW_TIER;

  return function jumpTo(target: string) {
    const needsDeepening = isCalmTier(tier) && DEEP_TARGETS.has(target);

    const next = new URLSearchParams(params.toString());
    next.set("jump", target);
    if (needsDeepening) next.set("view", "detailed");

    const sameUrl = next.toString() === params.toString() && !needsDeepening;

    if (sameUrl) {
      // RE-CLICKING THE LANDMARK YOU ARE ALREADY ON. No URL change means no
      // re-render and no effect, so this is the one path that has to scroll
      // itself. It is the same hole the reference patches with a click
      // delegate, and its note is worth keeping: six of these links sit on the
      // very page they target, so the second click on any of them lands here.
      scrollWhenReady(target);
      return;
    }

    // `replace`, not `push`: the reader is moving WITHIN one document, and a
    // history entry per landmark would turn Back into a scroll-position undo
    // instead of a way out of the report.
    //
    // NO SCROLL CALL HERE, deliberately. Changing `?jump=` re-renders
    // `ReportJumpOnLoad`, whose effect is keyed on that value and does the
    // scrolling — including the wait for a page the density gate has only just
    // revealed. Scrolling here as well called `scrollIntoView` twice per
    // click (measured), which is harmless but means two mechanisms own one
    // behaviour, and only one of them would get fixed next time.
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
}

/**
 * Handles a `?jump=` that arrived from OUTSIDE this page — a bookmark, a link
 * from the Dashboard, a shared URL.
 *
 * SEPARATE FROM THE CLICK PATH on purpose. A click already knows where it is
 * going and scrolls immediately; this covers the case where the parameter is
 * present before anything has been clicked, which the click handlers cannot
 * see. It runs once per distinct `jump` value.
 *
 * THE DELAY IS THE REFERENCE'S. `mvApplyJump` waits 250ms before scrolling,
 * because the target may be a page the density gate has only just revealed and
 * the three Esri map rasters on page 3 are still settling. Scrolling into a
 * layout that is still moving lands in the wrong place.
 */
export function ReportJumpOnLoad() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const jump = params.get("jump");

  const tier = params.get("view")
    ? toViewTier(params.get("view"))
    : DEFAULT_VIEW_TIER;

  const needsDeepening = Boolean(
    jump && isCalmTier(tier) && DEEP_TARGETS.has(jump),
  );

  // Keyed on `jump` (plus the deepening decision), which is what makes it run
  // once per distinct landmark — no "already handled" flag needed, and none
  // wanted: tracking that in state would be a `setState` inside an effect for
  // no gain. Re-running when `needsDeepening` flips false after the replace is
  // harmless: `scrollWhenReady` finds the target immediately and stops.
  useEffect(() => {
    if (!jump) return;

    // A SHARED `?jump=` LINK HAS TO WORK AT ANY DENSITY. Measured before this:
    // `?view=simple&jump=wrPage4` loaded the cover and did nothing, because
    // page 4 is hidden at Essentials and the poll ran out waiting for a target
    // the gate was never going to reveal. Someone sending "read page 4 of my
    // report" got page 1. The click path already deepened; this one has to
    // follow the same rule or the two disagree about what a jump means.
    if (needsDeepening) {
      const next = new URLSearchParams(params.toString());
      next.set("view", "detailed");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }

    // Polls for the target either way, so it also covers the density gate
    // having only just revealed it.
    scrollWhenReady(jump);
  }, [jump, needsDeepening, params, pathname, router]);

  return null;
}

/**
 * An in-copy jump link — "Page 2 →", "your division orders and last five
 * cheques".
 *
 * A REAL ANCHOR, so it can be middle-clicked, copied and read by a screen
 * reader as a link; the handler intercepts the plain click to add the
 * deepening and the scroll. `wr-noprint` on these by default: on paper the
 * pages are numbered sheets and "Page 2 →" points at nothing.
 */
export function JumpLink({
  target,
  className,
  children,
}: {
  target: string;
  className?: string;
  children: React.ReactNode;
}) {
  const jumpTo = useReportJump();
  const pathname = usePathname();
  const params = useSearchParams();

  const href = (() => {
    const next = new URLSearchParams(params.toString());
    next.set("jump", target);
    return `${pathname}?${next.toString()}`;
  })();

  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        // Let modified clicks (new tab, new window, download) behave normally.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        jumpTo(target);
      }}
    >
      {children}
    </a>
  );
}
