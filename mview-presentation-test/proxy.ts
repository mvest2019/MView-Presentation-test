import { NextResponse, type NextRequest } from "next/server";

import { INVITE_CODE_PARAM, INVITE_REDEEM_PARAM, normalizeInviteCode } from "@/lib/invite-code";
import { PORTAL_HOME } from "@/lib/routes";

/**
 * THE AUTH BOUNDARY, BOTH DIRECTIONS — the one place a request is matched
 * against the session before any route renders.
 *
 *   · `/mineralownersite/*` needs a session: without one the request is
 *     redirected to `/login?next=…` (Pragati, 2026-09-17: no dashboard
 *     without login).
 *   · `/login` and `/register` are for visitors WITHOUT a session: with one, a
 *     GET is redirected straight to where the page itself would have sent them.
 *
 * WHY THE SECOND HALF EXISTS (Pragati, 2026-09-17, with a screenshot): a
 * signed-in visitor landing on `/login` used to get a BLANK band between the
 * header and the footer for as long as the portal took to render. The page's
 * own `redirect()` runs mid-render, and a redirect is not a suspension — the
 * router commits the `/login` URL with the page slot empty and holds it there
 * until the destination (the slowest page in the app) has rendered.
 * `auth-skeleton.tsx` measured and documented exactly this, and prescribed
 * exactly this fix: redirect BEFORE the render, from the proxy, which is also
 * Next's own guidance. The browser then never leaves the page it was on until
 * the portal is ready, so there is nothing blank to look at.
 *
 * GET ONLY, and that is load-bearing: signing in IS a server-action POST to
 * `/login`. Bouncing POSTs would break the second click of a double-submitted
 * sign-in, and any action a signed-in visitor still has in flight on either
 * page. The pages keep their own `redirect()` as the backstop for anything
 * that reaches a render regardless.
 *
 * WHY A PROXY AND NOT THE LAYOUTS. Both portal layouts read the session for
 * the chrome, but a layout only re-runs when the server renders it — a client
 * navigation between two portal routes after the cookie expires would never
 * recheck. The proxy runs on every request, document and RSC alike, so an
 * expired or absent session is caught wherever the visitor lands, including a
 * hand-typed deep URL like `/mineralownersite/alerts`.
 *
 * WHAT THE CHECK IS, HONESTLY. The `mv_user` cookie is not signed — see the
 * warning at the top of `lib/session.ts` — so this gate keeps honest visitors
 * out of a signed-in surface; it is not cryptographic authorisation. Anything
 * that must not be served to a forged cookie has to be authorised by the API
 * per read, which is also where the member-keyed record already comes from.
 *
 * THE COOKIE NAME IS DUPLICATED FROM `lib/session.ts` DELIBERATELY. That
 * module is `server-only` and reads `next/headers`, neither of which exists in
 * the proxy runtime, so importing it here fails the build. (`lib/routes` and
 * `lib/invite-code` are plain constants and functions, so those ARE imported
 * rather than copied.) The parse mirrors `getSessionUser`'s: a value that is
 * not JSON with a string `email` counts as signed out rather than throwing.
 *
 * `?next=` CARRIES THE INTENDED DESTINATION, path and query both, so signing
 * in returns the visitor to the page they asked for. The single-leading-slash
 * test on the way back out is the same one `/login` and `/register` run —
 * without it, `?next=https://evil.example` or `?next=//evil.example` would
 * turn this into an open redirect wearing Mineral View's domain.
 */

function hasSession(request: NextRequest): boolean {
  const raw = request.cookies.get("mv_user")?.value;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { email?: unknown };
    return typeof parsed?.email === "string";
  } catch {
    // A truncated or hand-edited cookie reads as signed out, same as
    // `getSessionUser`.
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const signedIn = hasSession(request);

  const inPortal =
    pathname === PORTAL_HOME || pathname.startsWith(`${PORTAL_HOME}/`);

  if (inPortal) {
    if (signedIn) return NextResponse.next();
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  /* `/login` or `/register`, per the matcher. Signed out they render as
     themselves; signed in, a GET leaves before the render — see the header. */
  if (!signedIn || request.method !== "GET") return NextResponse.next();

  /* An invitation must not be dropped on the way out of `/register` — the
     same rule its page applies: the code rides to the portal under the
     REDEEM parameter, so `InviteRedeem` still claims the record. */
  if (pathname === "/register") {
    const code = normalizeInviteCode(searchParams.get(INVITE_CODE_PARAM));
    if (code) {
      const target = new URL(PORTAL_HOME, request.url);
      target.searchParams.set(INVITE_REDEEM_PARAM, code);
      return NextResponse.redirect(target);
    }
  }

  const requested = searchParams.get("next");
  const target =
    requested && /^\/(?!\/)/.test(requested) ? requested : PORTAL_HOME;
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  // `:path*` is zero or more, so the bare `/mineralownersite` is matched too.
  // Anchored to the path start — `/blog/mineralownersite` is not this gate's
  // business, and neither are the marketing routes or static assets.
  matcher: ["/mineralownersite/:path*", "/login", "/register"],
};
