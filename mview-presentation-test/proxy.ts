import { NextResponse, type NextRequest } from "next/server";

import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE } from "@/lib/visitor-id";

/**
 * Mints the anonymous `guestUserID` the blog endpoints take as `visitorId`, so
 * server components can just read it. Same cookie the production repo sets from
 * the client. Nothing else runs here — Proxy is not the place for data fetching.
 *
 * (Next 16 renamed Middleware to Proxy; `middleware.ts` is deprecated.)
 */
export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  if (!request.cookies.get(GUEST_COOKIE)?.value) {
    response.cookies.set(GUEST_COOKIE, crypto.randomUUID(), {
      maxAge: GUEST_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

export const config = {
  // Page requests only — no static assets, no image optimizer traffic.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
