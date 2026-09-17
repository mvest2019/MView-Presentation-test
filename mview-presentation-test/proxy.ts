import { NextResponse, type NextRequest } from "next/server";

/**
 * THE PORTAL'S SIGN-IN GATE — every `/mineralownersite/*` request passes
 * through here before a route renders (Pragati, 2026-09-17: no dashboard
 * without login).
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
 * the proxy runtime, so importing it here fails the build. The parse mirrors
 * `getSessionUser`'s: a value that is not JSON with a string `email` counts as
 * signed out rather than throwing.
 *
 * `?next=` CARRIES THE INTENDED DESTINATION, path and query both, so signing
 * in returns the visitor to the page they asked for. `/login` already checks
 * it for a single leading slash before use — see `app/login/page.tsx` — so
 * nothing here needs to sanitise beyond sending a same-origin path.
 */
export function proxy(request: NextRequest) {
  const raw = request.cookies.get("mv_user")?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { email?: unknown };
      if (typeof parsed?.email === "string") return NextResponse.next();
    } catch {
      // A truncated or hand-edited cookie reads as signed out, same as
      // `getSessionUser`.
    }
  }

  const login = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // `:path*` is zero or more, so the bare `/mineralownersite` is matched too.
  // Anchored to the path start — `/blog/mineralownersite` is not this gate's
  // business, and neither are the marketing routes or static assets.
  matcher: "/mineralownersite/:path*",
};
