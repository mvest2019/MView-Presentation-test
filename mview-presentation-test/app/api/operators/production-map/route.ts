import { NextResponse } from "next/server";

import { publicOperatorApiBaseUrl } from "@/lib/operator-api-types";
import { getSessionUser } from "@/lib/session";

/**
 * `POST /api/operators/production-map` — the choropleth's per-county figures, gated.
 *
 * DEFECT 189, "need to hide map values" (as a guest user).
 *
 * WHAT WAS ACTUALLY WRONG WAS NOT THAT THE MAP FAILED TO BLUR ANYTHING. It was that
 * `lib/operator-production-map-api.ts` called `POST /api/v1/operators/production-map`
 * STRAIGHT FROM THE BROWSER with a hard-coded `member_id: TEMP_MEMBER_ID` (3448) — a
 * development stand-in, shipped in client JavaScript, sent by every visitor. The
 * upstream gate is real and works: without a member id every value comes back `****`.
 * The client was answering that gate on the reader's behalf, so a signed-out visitor
 * received the same per-county oil and gas the directory, the profile panel and the
 * county table all withhold from them.
 *
 * That made the map the widest of the four holes and the only one you could not see:
 * the other three at least drew a lock. It also put a real member id in the bundle.
 *
 * So the call moves here, where the session is readable. `member_id` comes from the
 * session and nothing else, and a signed-out reader's request never leaves this
 * server — the handler answers `locked` before making any upstream call, which is the
 * same shape `recent-wells-permits` and `production-graph` already use, and it removes
 * work rather than adding it.
 *
 * `TEMP_MEMBER_ID` IS NO LONGER READ ON THIS PATH. It carried a standing warning that
 * it "must not reach production as-is"; on this route it no longer can.
 *
 * WHAT A LOCKED READER GETS: no counties. Not counties with masked figures — the map
 * shades from the values, so a masked one has nothing to shade with, and
 * `county-shading.tsx` already has an "unshaded map" state to fall into. The geometry
 * is server-rendered and stays; the footprint is public, the volumes are not.
 */

const REQUEST_TIMEOUT_MS = 15000;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const operatorNumber =
    typeof body.operator_no === "string" ? body.operator_no : "";
  if (!/^\d{1,7}$/.test(operatorNumber)) {
    return NextResponse.json(
      { error: "operator_no must be digits" },
      { status: 400 },
    );
  }

  const user = await getSessionUser();

  /* Before the upstream call, deliberately. `locked` travels on the response rather
     than being inferred from an empty list — OPERATORS.md §4 rule 2: a gate and a
     failure must never look the same to the page. */
  if (!user) {
    return NextResponse.json(
      { counties: [], locked: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${publicOperatorApiBaseUrl()}/api/v1/operators/production-map`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Rebuilt field by field rather than spread: the client composes the shape,
        // but `member_id` comes from the session and nothing else may be smuggled in.
        body: JSON.stringify({
          operator_no: operatorNumber,
          member_id: user.id,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        // Depends on who is asking, so it is never cached at any layer.
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("[production-map] fetch failed", { operatorNumber, error });
    return NextResponse.json(
      { error: "The production map is unavailable" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    console.error("[production-map] upstream responded", {
      operatorNumber,
      status: upstream.status,
    });
    return NextResponse.json(
      { error: "The production map is unavailable" },
      { status: 502 },
    );
  }

  const payload = (await upstream.json()) as { counties?: unknown };

  return NextResponse.json(
    {
      ...payload,
      counties: Array.isArray(payload.counties) ? payload.counties : [],
      locked: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
