/**
 * Make one claimed owner record the active one — `/api/owners/active`.
 *
 * A THIN PROXY, for the same two reasons as `/api/owners/claimed` beside it:
 * the upstream base is server-side configuration and the member comes from an
 * httpOnly cookie, so the browser cannot call the contract endpoint itself.
 *
 * THE UPSTREAM TAKES `PATCH`, NOT `POST`, and that was measured rather than
 * assumed. Against `mview-dev-api` today:
 *
 *     POST   /api/v1/owners/active   404  "Cannot POST /api/v1/owners/active"
 *     PUT    /api/v1/owners/active   404
 *     GET    /api/v1/owners/active   404
 *     PATCH  /api/v1/owners/active   200
 *
 * This route accepts the `POST` the brief specifies, so the client calls what
 * it was told to call, and forwards it upstream as the `PATCH` the service
 * actually serves. When the backend grows a `POST`, the forward below is the
 * one line that changes.
 *
 * `member_id` IS THE SIGNED-IN MEMBER'S, READ FROM THE SESSION. The brief asks
 * for "the clicked owner's member_id", and there is no such value: the objects
 * `GET /owners/claimed` returns carry `ownername`, `ownernumber`, `is_active`,
 * `lease_count`, `county_count`, `counties` and `claimed_at`, and no member id
 * of their own — the only one in the whole response is the top-level member the
 * list belongs to. That matches what the endpoint does: `{member_id, ownername}`
 * means "for THIS member, make THIS name active", which is the pair that was
 * verified working. An owner record is not a member, so it has no member id to
 * send. Taking it from the session also means a caller cannot flip somebody
 * else's active record by posting a different id.
 */
import { NextResponse } from "next/server";

import { apiBase } from "@/app/mineralownersite/_lib/reference/owner-api";
import { getSessionUser } from "@/lib/session";

/**
 * `apiBase()` IS THE HOST, NOT THE API ROOT — `/api/v1` belongs to the caller.
 *
 * `MINERALVIEW_API_BASE_URL` is `https://mview-dev-api.mineralview.com` and
 * every existing reader adds the version itself: `owner-api.ts` builds
 * `${base}/api/v1${route}` and `member-api.ts` does the same. These two routes
 * did not, so they were requesting `/owners/claimed` at the host root, which
 * 404s — and a 404 here empties the switch panel: the client sees a failed
 * read, `rows` stays null, and the panel falls back to showing the active
 * record alone with no others under it.
 */
const API = '/api/v1';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const base = apiBase();
  if (!base) {
    return NextResponse.json(
      { error: "No records service is configured", code: "NO_API_BASE" },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to change the active record", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  let ownername = "";
  try {
    const body = (await req.json()) as { ownername?: unknown };
    ownername = typeof body?.ownername === "string" ? body.ownername.trim() : "";
  } catch {
    ownername = "";
  }
  if (!ownername) {
    return NextResponse.json(
      { error: "An owner name is required", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${base}${API}/owners/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: user.id, ownername }),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: "That record could not be made active", detail: body },
        { status: res.status },
      );
    }
    return NextResponse.json(body ?? { ok: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "The records service could not be reached",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
