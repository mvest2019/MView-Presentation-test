import { type NextRequest } from "next/server";

import { apiBase } from "@/app/mineralownersite/_lib/reference/owner-api";
import { getSessionUser } from "@/lib/session";

/**
 * THE AVATAR PROXY — `GET /api/profile-image?src=<profile_image_url>`.
 *
 * ── WHY A PROXY AT ALL ──
 *
 * `profile_image_url` on `GET /users/me` is root-relative to the API'S ORIGIN
 * (`/api/v1/users/me/profile-image?member_id=…&v=…`), and this app's rule —
 * stated at length in `owner-api.ts` — is that the browser never learns that
 * origin: `MINERALVIEW_API_BASE_URL` is server-only and the API's CORS
 * allowlist never has to carry a browser one. So an `<img>` cannot point at
 * the API directly. This route is the one place the two meet: the strip hands
 * the server-built URL through UNTOUCHED as `src` (the contract says treat it
 * as opaque and keep its `v` — nothing here parses `v` or rebuilds anything),
 * and the bytes stream back from this app's own origin.
 *
 * ── THE TWO CHECKS ARE THE POINT ──
 *
 * `src` must be the API's own profile-image path — this is a proxy for ONE
 * endpoint, not a general fetch(anything) an attacker could steer at other
 * routes or hosts — and its `member_id` must be the SESSION'S member. The
 * upstream endpoint is unauthenticated today (§9: caller-supplied member_id),
 * so without the second check any signed-in visitor could browse every
 * member's photo through us. Matching the session is exactly what the coming
 * auth guard will do; when it lands, `member_id` leaves the URL and this check
 * collapses into the bearer token.
 *
 * Upstream refusals pass through as their status with no body: a 404 (§F2, the
 * member simply has no photo) is what `PortalAvatar` already treats as "show
 * the letter instead". `Cache-Control: private, no-store` is re-asserted here
 * because the contract's §1 demands it survive end to end.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return new Response(null, { status: 401 });

  const base = apiBase();
  if (!base) return new Response(null, { status: 404 });

  const src = request.nextUrl.searchParams.get("src") ?? "";
  if (!src.startsWith("/api/v1/users/me/profile-image?")) {
    return new Response(null, { status: 400 });
  }

  let upstream: URL;
  try {
    upstream = new URL(base + src);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (upstream.searchParams.get("member_id") !== String(user.id)) {
    return new Response(null, { status: 403 });
  }

  const res = await fetch(upstream, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res || !res.ok) {
    return new Response(null, { status: res?.status ?? 502 });
  }

  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "last-modified",
    "content-disposition",
  ]) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("cache-control", "private, no-store");

  return new Response(res.body, { status: 200, headers });
}
