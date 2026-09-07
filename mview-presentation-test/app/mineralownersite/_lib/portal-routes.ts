/**
 * WHICH PORTAL MODULES ACTUALLY EXIST — one list, checked at render time.
 *
 * THE PROBLEM THIS SOLVES. The portal is being built module by module, but the
 * design's copy cross-links freely: the Weekly Report points at nine other
 * screens, the Activities page at six. Writing those as ordinary links ships a
 * page whose every "see it on the map →" is a 404 — which is worse than not
 * offering the link, because the reader learns the product is broken rather
 * than unfinished.
 *
 * IT IS THE SAME RULE `portal-nav.ts` ALREADY STATES, applied to body copy
 * instead of the sidebar. That file's header draws the distinction this module
 * depends on:
 *
 *   `href: undefined`  THE MODULE IS NOT BUILT YET. A build fact. The row
 *                      renders as a plain label rather than a link into a 404.
 *
 *   `state` gating     THE ACCOUNT MAY NOT SEE IT. A product rule, owned by
 *                      `portal-state.ts`.
 *
 * The first says "not yet"; the second says "not for you, here is how". They
 * must never be allowed to look the same, so an unbuilt destination is styled
 * as inert text with an explanatory title — never as a locked or blurred
 * feature, and never as a working link.
 *
 * ADDING A MODULE IS ONE LINE HERE. Ship `leases/page.tsx`, add
 * `/mineralownersite/leases` below, and every "open the lease report →" across
 * the portal becomes a real link at once, with no component touched. That is
 * the whole reason this is a list and not a prop threaded through fifty call
 * sites.
 */

/**
 * Every portal path that resolves today. Keep it in sync with the folders
 * under `app/mineralownersite/` — if a page exists, it belongs here.
 */
export const BUILT_PORTAL_ROUTES: readonly string[] = [
  "/mineralownersite",
  "/mineralownersite/activities",
  /*
   * ALERTS AND LEASES WERE MISSING FROM THIS LIST while both pages existed.
   *
   * The file header's rule is "if a page exists, it belongs here", and the cost
   * of the omission is the exact defect the module was written to prevent, only
   * inverted: `PortalLink` was rendering every cross-link to those two modules
   * as inert text with "not open yet" on it, on top of pages that were built and
   * working. The Settings page's "Open inbox →" was one of them.
   *
   * Found while adding `settings` below. A one-line list is easy to forget in a
   * module's own pull request, which is the argument for the render-time check
   * this file exists to be — the check just has to be told the truth.
   */
  "/mineralownersite/alerts",
  "/mineralownersite/leases",
  "/mineralownersite/briefing",
  "/mineralownersite/settings",
];

/**
 * Marketing routes the portal links out to. These live outside this tree and
 * are all built, so they are always real links — listed rather than assumed so
 * a typo in one fails the same way an unbuilt portal route does.
 */
const BUILT_SITE_ROUTES: readonly string[] = [
  "/claim",
  "/pricing",
  "/contact-us",
  "/blogs",
  "/login",
  "/register",
  /* The Settings page's Privacy card links out twice — the retention schedule
     and the policy itself. The reference points both at `#/privacy`; this
     build's equivalent route is `/privacy-policy`. */
  "/privacy-policy",
];

/**
 * Does this href go somewhere?
 *
 * Compares the PATH only, so `/mineralownersite/activities?tab=trend` resolves
 * against `/mineralownersite/activities`. Query strings are how half the
 * portal's cross-links carry their focus, and stripping them here means a call
 * site never has to remember to.
 */
export function isBuiltRoute(href: string): boolean {
  const path = href.split(/[?#]/)[0];
  return (
    BUILT_PORTAL_ROUTES.includes(path) || BUILT_SITE_ROUTES.includes(path)
  );
}

/**
 * What the inert version says on hover.
 *
 * ONE SENTENCE, AND IT IS ABOUT THE BUILD, NOT THE ACCOUNT. "Not open yet" is
 * true and says nothing about the reader's plan; anything resembling "upgrade
 * to see this" would collapse the two gates the header keeps apart.
 */
export const UNBUILT_TITLE =
  "This part of your portal is not open yet — it arrives with its own module.";
