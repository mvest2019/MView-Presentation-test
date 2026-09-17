/**
 * The price strip's explainer, read fresh — `/api/drawers/prices`.
 *
 * A THIN PROXY FOR `GET /api/v1/dashboard/drawers/prices?member_id=`, for the
 * two reasons `/api/owners/claimed` sets out at length: the upstream base is
 * server-side configuration, and the member comes from an httpOnly cookie. The
 * browser can read neither, so it cannot call the contract endpoint itself.
 *
 * `member_id` IS NEVER TAKEN FROM THE REQUEST. It is read from the session on
 * this side, the same way `currentMemberTarget()` reads it for the dashboard
 * and `/api/owners/claimed` reads it for the switch panel. Nothing is
 * hardcoded, and a caller cannot ask for somebody else's explainer by putting a
 * different id in the query string, because the query string is not consulted.
 *
 * WHY THIS IS FETCHED WHEN THE PANEL OPENS, when every other explainer is
 * already in the payload. `p.drawers.prices` is real and is served by this same
 * endpoint — `owner-data.ts` reads all eleven flat keys during the payload
 * build — but it is built ONCE, at first paint, from the settlements as they
 * stood then. The strip above it now re-reads those settlements every 10
 * seconds, so by the time a reader clicks it the payload's copy can be quoting
 * a price that is no longer the one on screen. This panel is almost entirely
 * made of those numbers ("<strong>WTI $102.36</strong> ... at 2026-09-17 04:40
 * UTC"), so a stale copy would not be a slightly old panel, it would be a panel
 * that contradicts the bar it was opened from.
 *
 * ONLY `prices`. The other ten explainers describe the record, not the market —
 * they do not move while the page is open, and re-reading them on open would
 * put a request and a delay in front of a panel that is already correct.
 *
 * NO `owner` PARAMETER. `fetchDrawer` sends one because the endpoint accepts it
 * for the record-keyed panels; measured, this key answers 200 on `member_id`
 * alone, and the prices panel is not about a roll owner.
 */
import { NextResponse } from "next/server";

import { apiBase } from "@/app/mineralownersite/_lib/reference/owner-api";
import { getSessionUser } from "@/lib/session";

/** `apiBase()` is the host, not the API root — see `/api/prices` beside this. */
const API = "/api/v1";

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
    /* NOT AN ERROR THE READER SHOULD SEE AS A FAILURE, and the same judgement
       `/api/owners/claimed` makes: signed out is an ordinary state for this
       portal. `drawer: null` tells the client it has nothing newer, and the
       panel goes on rendering the copy the payload already carries rather than
       showing an error over an explainer that is perfectly readable. */
    return NextResponse.json(
      { key: "prices", drawer: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const res = await fetch(
      `${base}${API}/dashboard/drawers/prices?member_id=${encodeURIComponent(String(user.id))}`,
      { cache: "no-store" },
    );
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: "That explainer could not be read", detail: body },
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
