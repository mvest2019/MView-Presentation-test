/**
 * The spot settlements behind the chrome's price strip — `/api/prices`.
 *
 * A THIN PROXY FOR `GET /api/v1/dashboard/prices`, and it exists for the same
 * reason every other read in this app goes through a route handler: the
 * upstream address is server-side configuration (`MINERALVIEW_API_BASE_URL`),
 * so page JavaScript cannot call the contract endpoint itself.
 *
 * NO `member_id`, AND THAT IS THE ENDPOINT'S OWN SHAPE. A front-month
 * settlement is the same number for every reader — it is not keyed on who is
 * asking, unlike `/dashboard` and `/dashboard/drawers/{key}` beside it. So
 * there is nothing to read from the session here and nothing a caller could
 * ask for that is not already public. It is also why this route may be polled:
 * it carries no member data to leak and no per-member work to repeat.
 *
 * WHY THIS IS POLLED AT ALL, when the rest of the page is not. The strip is
 * the one thing on the Dashboard that moves while the page sits open — the
 * response's own explainer says so ("They update on their own while this page
 * is open") — and it arrives in the first paint inside the server-rendered
 * `Payload`, which then never changes for the life of the tab. The client
 * re-reads THIS route every 10s and nothing else; see `useSpotPrices` in
 * `Chrome.tsx` for the interval, the overlap guard and the teardown.
 */
import { NextResponse } from "next/server";

import { apiBase } from "@/app/mineralownersite/_lib/reference/owner-api";

/**
 * `apiBase()` IS THE HOST, NOT THE API ROOT — `/api/v1` belongs to the caller.
 *
 * The same note stands over `/api/owners/claimed`, where getting it wrong 404d
 * and emptied the switch panel. `owner-api.ts` builds `${base}/api/v1${route}`
 * and `member-api.ts` does the same; this route adds the version itself for
 * exactly that reason.
 */
const API = "/api/v1";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = apiBase();
  if (!base) {
    return NextResponse.json(
      { error: "No prices service is configured", code: "NO_API_BASE" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${base}${API}/dashboard/prices`, {
      cache: "no-store",
    });
    const body = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: "Prices could not be read", detail: body },
        { status: res.status },
      );
    }
    /* `no-store` ON THE WAY BACK OUT TOO. A poll that a proxy or the browser
       may answer from its own cache is not a poll — it would hold the same ten
       settlements for as long as whatever heuristic freshness was applied,
       which is the failure this endpoint exists to avoid. */
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "The prices service could not be reached",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
