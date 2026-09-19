import { NextResponse } from "next/server";

import { currentMemberTarget } from "@/app/mineralownersite/_lib/reference/owner-data";
import {
  fetchAlertPreferences,
  putAlertPreference,
  type AlertChannels,
} from "@/app/mineralownersite/_lib/reference/member-api";
import { OwnerApiError } from "@/app/mineralownersite/_lib/reference/owner-api";

/**
 * WHERE EACH ALERT REACHES THIS READER — `/api/alerts/preferences`.
 *
 * The card that renders these is a SERVER component and reads the service
 * directly, so `GET` here is not what draws the page. This route exists for the
 * `PUT`: the chips are pressed in the browser, `member_id` lives in the
 * httpOnly `mv_user` cookie that page JavaScript cannot read, and the service's
 * address is `server-only`. `GET` is kept beside it so a client that wants to
 * re-read after a write has one way in rather than two.
 *
 * ── THE ID IS THE RULE'S, NOT THE CARD'S ───────────────────────────────────
 * `permit-ring`, `filed`, `pricedeck` — the same ids the findings carry. The
 * card used to key its rows `alert-permit` / `alert-production`, which were its
 * own invention; a preference stored under a key no finding will ever match
 * looks saved and governs nothing. The service answers an unknown id with a 400
 * naming the valid ones, and that 400 is passed through rather than smoothed
 * over, because it means the client is about to store something inert.
 *
 * ── A FAILED WRITE IS A FAILED WRITE ───────────────────────────────────────
 * Nothing here turns a 4xx or 5xx into a 200. The chip is toggled
 * optimistically in the browser, so an error that this route swallowed would
 * leave the reader looking at a setting they believe they changed.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

function notSignedIn(): NextResponse {
  return NextResponse.json(
    { error: { code: "NOT_SIGNED_IN", message: "No member is signed in." } },
    { status: 401 },
  );
}

function failed(e: unknown): NextResponse {
  if (e instanceof OwnerApiError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, requestId: e.requestId } },
      { status: e.status || 502 },
    );
  }
  return NextResponse.json(
    { error: { code: "PREFERENCES_FAILED", message: String(e) } },
    { status: 502 },
  );
}

export async function GET() {
  const who = await currentMemberTarget();
  if (!who) return notSignedIn();
  try {
    return NextResponse.json(await fetchAlertPreferences(who.base, who.member));
  } catch (e) {
    return failed(e);
  }
}

export async function PUT(req: Request) {
  const who = await currentMemberTarget();
  if (!who) return notSignedIn();

  let body: { id?: string; channels?: Partial<AlertChannels> } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "expected a JSON body" } },
      { status: 400 },
    );
  }

  const id = String(body.id ?? "").trim();
  const c = body.channels;
  if (
    !id
    || !c
    || typeof c.email !== "boolean"
    || typeof c.push !== "boolean"
    || typeof c.in_app !== "boolean"
  ) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "id and channels {email, push, in_app} are all required",
        },
      },
      { status: 400 },
    );
  }

  try {
    const row = await putAlertPreference(who.base, who.member, id, {
      email: c.email, push: c.push, in_app: c.in_app,
    });
    return NextResponse.json(row);
  } catch (e) {
    return failed(e);
  }
}
