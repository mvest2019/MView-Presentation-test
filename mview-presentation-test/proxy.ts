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

/** The bearer token in the session cookie, or null on an older cookie. */
function sessionToken(request: NextRequest): string | null {
  const raw = request.cookies.get("mv_user")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

/**
 * HAS THIS DEVICE BEEN SIGNED OUT FROM ANOTHER ONE?
 *
 * ── WHY THIS IS HERE AND NOT ON THE PROFILE PAGE ──────────────────────────
 *
 * Signing a device out has to actually sign that device out. The API refuses
 * the dead token the moment it is revoked — but a browser holding the session
 * cookie carries on rendering portal pages, because the cookie is what this
 * gate reads and the cookie knows nothing. Before this check, a member who
 * signed their laptop out from their phone saw the laptop keep working, with
 * one red line on one settings panel as the only hint.
 *
 * So the question is asked HERE, where every portal navigation already passes,
 * and a dead token ends the session properly: cookie dropped, reader sent to
 * sign in, with a line saying why.
 *
 * ── THE COST IS ONE REDIS READ ────────────────────────────────────────────
 *
 * `/users/me/sessions/check` verifies the signature and reads one key. No
 * database, no query, nothing proportional to anything — it exists to be called
 * on every navigation. A 1.5s deadline caps the worst case.
 *
 * ── ⚠ IT FAILS OPEN, AND THAT IS DELIBERATE ───────────────────────────────
 *
 * Unreachable API, timeout, 500, anything that is not a clear 401 → the reader
 * goes through. The alternative is that one API blip signs out every member of
 * a live platform at once, which is a far worse incident than a revocation
 * lagging by a few minutes. The revocation store behind it fails open for the
 * same reason. Only an explicit 401 — "this token is dead" — ends the session.
 *
 * ── AN OLD COOKIE WITH NO TOKEN IS LEFT ALONE ─────────────────────────────
 *
 * Anyone who signed in before the token was kept has nothing to check. They
 * stay signed in; they simply cannot be remotely signed out until their next
 * sign-in. Treating "no token" as "revoked" would log out every existing member
 * the moment this deployed.
 */
async function isRevoked(request: NextRequest): Promise<boolean> {
  const token = sessionToken(request);
  if (!token) return false;

  const base = process.env.MINERALVIEW_API_BASE_URL?.replace(/\/+$/, "");
  if (!base) return false;

  try {
    const res = await fetch(`${base}/api/v1/users/me/sessions/check`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(1_500),
    });
    /* ONLY 401. A 503 means the API cannot check right now, which is not the
       same statement as "you are signed out" and must not be treated as one. */
    return res.status === 401;
  } catch {
    return false;
  }
}

/** Signed out elsewhere: drop the cookie and say why on the sign-in page. */
function endSessionAndRedirect(request: NextRequest): NextResponse {
  const login = new URL("/login", request.url);
  login.searchParams.set("signedOut", "1");

  const response = NextResponse.redirect(login);
  /* The cookie goes HERE rather than being left for a later request to notice.
     A browser still holding it would keep being waved through this gate on
     every navigation, each one costing a check that can only say the same
     thing. */
  response.cookies.delete("mv_user");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const signedIn = hasSession(request);

  const inPortal =
    pathname === PORTAL_HOME || pathname.startsWith(`${PORTAL_HOME}/`);

  if (inPortal) {
    if (!signedIn) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(login);
    }
    /* Signed in by the cookie — but is the session still live? */
    if (await isRevoked(request)) return endSessionAndRedirect(request);
    return NextResponse.next();
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
