import { NextResponse } from "next/server";

import {
  isAbortError,
  searchOperators,
  TEMP_MEMBER_ID,
  type OperatorSearchRequest,
} from "@/lib/operator-api";
import { getVisitorId } from "@/lib/visitor-id";

/**
 * Same-origin forwarder for `POST /api/v1/operators/search`.
 *
 * WHY THIS EXISTS. Two constraints meet here and only a route handler satisfies
 * both:
 *
 *  · The operator API sends no `Access-Control-Allow-Origin`, so the browser
 *    cannot call it directly. The request has to leave from the server.
 *  · The listing needs real cancellation — a superseded filter change or an
 *    unmount must abort the in-flight request. A Server Action cannot accept an
 *    `AbortSignal`, so its request runs to completion no matter what the user
 *    does next. A route handler can: aborting the browser `fetch` aborts this
 *    handler's `request`, and `request.signal` is passed straight through to the
 *    upstream call, so the cancellation reaches the operator API.
 *
 * It is a forwarder, not a place where payloads are built. The client builds the
 * complete body with `buildOperatorSearchPayload` so the exact contract is
 * visible in the network tab and there is one payload builder in the codebase.
 *
 * TWO FIELDS ARE PINNED SERVER-SIDE, deliberately. `member_id` is the flag that
 * gates rows 4-10 behind sign-in, and `visitorId` identifies the visitor — a
 * client that could set either could unmask gated rows or spoof another
 * visitor's id. They are re-asserted here from the cookie and from the build's
 * own constant, so the body the client sends is complete but not authoritative
 * for those two.
 */

/** Shape check on the body before it is forwarded. */
function isSearchRequest(value: unknown): value is OperatorSearchRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  const sort = body.sort as Record<string, unknown> | undefined;

  return (
    typeof body.page === "number" &&
    typeof body.search_text === "string" &&
    typeof body.pageSize === "number" &&
    !!sort &&
    typeof sort.propertyName === "string" &&
    (sort.type === "asc" || sort.type === "desc") &&
    typeof body.activeInLast90Days === "boolean" &&
    typeof body.topProducers === "boolean" &&
    typeof body.moreThan5Counties === "boolean" &&
    typeof body.moreThan10Counties === "boolean" &&
    typeof body.county === "string" &&
    typeof body.playtype === "string" &&
    (body.status === "active" || body.status === "inactive" || body.status === "")
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isSearchRequest(body)) {
    return NextResponse.json(
      { error: "Body does not match the operator search contract" },
      { status: 400 },
    );
  }

  const payload: OperatorSearchRequest = {
    ...body,
    // Pinned — see the note above. `TEMP_MEMBER_ID` is the development stand-in;
    // pinning it here rather than trusting the body means that when real auth
    // arrives, this line becomes "the session's member id" and a client still
    // cannot nominate its own.
    member_id: TEMP_MEMBER_ID,
    visitorId: await getVisitorId(),
  };

  try {
    const result = await searchOperators(payload, request.signal);
    return NextResponse.json(result);
  } catch (error) {
    // The client went away or superseded this request. Nothing to report, and no
    // response will be read — 499 is the conventional code for a closed request.
    if (isAbortError(error)) {
      return new NextResponse(null, { status: 499 });
    }

    // Logged with the payload that produced it; the client gets a status only, so
    // no upstream detail can reach the screen.
    console.error("[operators] search failed", { payload, error });
    return NextResponse.json(
      { error: "Operator search is unavailable" },
      { status: 502 },
    );
  }
}
