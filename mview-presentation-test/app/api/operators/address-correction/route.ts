import { NextResponse } from "next/server";

import { submitAddressCorrection } from "@/lib/operator-api";
import { getSessionUser } from "@/lib/session";
import { getVisitorId } from "@/lib/visitor-id";

/**
 * `POST /api/operators/address-correction` — a reader's correction to an operator's
 * filed P-5 address, on its way to `/api/v1/operators/address-correction`.
 *
 * WHY THERE IS A HOP HERE AT ALL, when the upstream would take the call directly.
 * Two of the seven fields the endpoint wants cannot be assembled in a browser:
 *
 *   · `member_id` lives in the `mv_user` cookie, which is `httpOnly` exactly so
 *     page JavaScript cannot read it. Sending it from the client would mean either
 *     un-httpOnly-ing the session or letting the page name its own member id.
 *   · `visitorId` is the `guestUserID` cookie `proxy.ts` mints. It is readable from
 *     the client, but reading it there and the member id here would put one
 *     identity in two places.
 *
 * So the browser sends what it can actually see — the operator and the two
 * addresses — and the identity is attached on this side, where it is authoritative.
 * That is the same shape `/api/operators/<no>/what-changed` uses for its service.
 *
 * IT ALSO KEEPS THE OPERATOR API SERVER-SIDE, which is not optional: the operator
 * endpoints send no `Access-Control-Allow-Origin`, so a browser `POST` straight at
 * them is blocked by CORS before it leaves. (`/owners/address-correction` on the
 * claim page IS called from the client — a different service, which does send CORS.
 * The two are not interchangeable.)
 *
 * WHAT IT ANSWERS WITH. `{ ok: true }` on success, and on failure a status plus a
 * `message` short enough to print in the row. Nothing from the upstream body is
 * passed through verbatim — an internal error string is not something to render.
 */

/** Fields the browser supplies. The identity is added here, not by the caller. */
interface CorrectionBody {
  operator_number?: unknown;
  operator_name?: unknown;
  county?: unknown;
  old_address?: unknown;
  new_address?: unknown;
}

/** A string field, trimmed. Anything that is not a string reads as absent. */
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  let body: CorrectionBody;
  try {
    body = (await request.json()) as CorrectionBody;
  } catch {
    return fail(400, "That request could not be read.");
  }

  const operatorName = text(body.operator_name);
  const oldAddress = text(body.old_address);
  const newAddress = text(body.new_address);

  /*
   * VALIDATED HERE AS WELL AS UPSTREAM. The endpoint's own 400 names the missing
   * field in a `details` array, which is a developer's message, not a reader's —
   * and checking first means an obviously incomplete submission never leaves this
   * machine. These three are the ones the endpoint requires; `operator_number` and
   * `county` are sent whenever the page knows them and are not worth blocking on.
   */
  if (operatorName === "" || oldAddress === "" || newAddress === "") {
    return fail(400, "That address could not be sent — a detail was missing.");
  }

  // An unchanged address is not a correction. Cheap to catch, and it keeps the
  // review queue free of entries with nothing to review.
  if (oldAddress === newAddress) {
    return fail(400, "That address is unchanged.");
  }

  /*
   * THE IDENTITY. `member_id` is the signed-in member, or 0 for an anonymous
   * visitor — the same convention the rest of this API surface uses for "no member".
   * `visitorId` is sent either way, so an anonymous submission is still attributable
   * to one browser; `proxy.ts` mints the cookie on every page request, so it is
   * effectively always present, and "" if a request somehow arrives before it.
   *
   * The two reads are independent, so they overlap rather than queue.
   */
  const [user, visitorId] = await Promise.all([
    getSessionUser(),
    getVisitorId(),
  ]);

  try {
    await submitAddressCorrection({
      operator_number: text(body.operator_number),
      operator_name: operatorName,
      county: text(body.county),
      old_address: oldAddress,
      new_address: newAddress,
      member_id: user?.id ?? 0,
      visitorId,
    });
  } catch (error) {
    console.error("[operators] address correction failed", error);
    // 502, not 500: this app is fine, the service behind it did not accept the
    // submission. The reader is told it was not sent, which is the only fact that
    // matters to them — the cause is in the server log.
    return fail(502, "That address could not be sent just now.");
  }

  return NextResponse.json(
    { ok: true },
    // A submission is never cacheable, and a shared cache holding a 200 for this
    // path would be a correctness bug, not a performance win.
    { headers: { "Cache-Control": "no-store" } },
  );
}
