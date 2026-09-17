/**
 * The owner records this member has claimed — `/api/owners/claimed`.
 *
 * A THIN PROXY FOR `GET /api/v1/owners/claimed`, and it exists for the reason
 * every other read in this app goes through a route handler: the upstream base
 * is server-side configuration (`MINERALVIEW_API_BASE_URL`), and `member_id`
 * comes from the `mv_user` cookie, which is httpOnly. Page JavaScript can read
 * neither, so the browser cannot call the contract endpoint directly and is not
 * meant to.
 *
 * `member_id` IS NEVER TAKEN FROM THE REQUEST. It is read from the session on
 * this side, exactly the way `currentMemberTarget()` reads it for the dashboard
 * and the weekly report. A caller cannot ask for somebody else's claimed
 * records by putting a different id in the query string, because the query
 * string is not consulted.
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

export async function GET() {
  const base = apiBase();
  if (!base) {
    return NextResponse.json(
      { error: "No records service is configured", code: "NO_API_BASE" },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    /* NOT AN ERROR THE READER SHOULD SEE AS A FAILURE. Signed out is an
       ordinary state for this portal — the shell is reachable without an
       account — so the switch panel is told there is nothing to list rather
       than being handed a 500 to render. */
    return NextResponse.json(
      { member_id: null, active: null, count: 0, owners: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const res = await fetch(
      `${base}${API}/owners/claimed?member_id=${encodeURIComponent(String(user.id))}`,
      { cache: "no-store" },
    );
    const body = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not read your claimed records", detail: body },
        { status: res.status },
      );
    }
    return NextResponse.json(body, {
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
