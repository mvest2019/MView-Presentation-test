/**
 * Where signing in lands — the one place that answers "what is the portal's URL".
 *
 * NOT `server-only`, and that is the point: sign-in and sign-up decide this on
 * the server (`redirect()`), while the claim flow decides it in the browser
 * (`router.push`, a `<Link href>`). A constant either of them can import is the
 * only kind that keeps them agreeing.
 *
 * WHY IT EXISTS. Every one of those call sites used to hard-code `/portal`, a
 * placeholder for a portal that had not been built. The portal landed at
 * `/mineralownersite` and `app/_components/site-header.tsx` was updated to it —
 * `app/login`, `app/register`, `app/reset-password` and `app/claim` were not, so
 * they went on sending people to a path with no route and every successful
 * sign-in ended on the 404 page. Five copies of a URL, one of them corrected, is
 * what that bug was; this is one copy.
 *
 * The route is `app/mineralownersite/(reference)/page.tsx` — the owner dashboard.
 * `(reference)` is a route group, so it contributes nothing to the URL.
 */
export const PORTAL_HOME = "/mineralownersite";

/**
 * Where a FILED CLAIM lands — the portal's My Leases list.
 *
 * A successful claim used to push to `PORTAL_HOME`, the dashboard. The thing
 * that just changed is the set of leases attached to the account, and the
 * dashboard is not where those are listed: someone who had just claimed four
 * leases arrived at a summary screen with no sight of them and read it as the
 * claim having gone somewhere else. This is the page the claim wrote to.
 *
 * Still one constant rather than a literal at the call site, for the reason
 * the note above gives.
 */
export const PORTAL_CLAIMED_LEASES = "/mineralownersite/leases";
