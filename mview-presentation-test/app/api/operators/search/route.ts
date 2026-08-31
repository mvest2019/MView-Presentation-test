import { NextResponse } from "next/server";

import {
  isAbortError,
  MASKED,
  searchOperators,
  type OperatorSearchRequest,
  type OperatorSearchResponse,
} from "@/lib/operator-api";
import { getSessionUser } from "@/lib/session";
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
 * visitor's id. Both are re-asserted here from cookies, so the body the client
 * sends is complete but not authoritative for those two.
 *
 * `member_id` NOW CARRIES THE REAL ANSWER. It used to be pinned to
 * `TEMP_MEMBER_ID` (3448), a development stand-in that treated every anonymous
 * visitor as a signed-in member — which silently disabled the API's own sign-in
 * gate. The line this file already anticipated ("when real auth arrives, this
 * becomes the session's member id") is now written: the signed-in member's id,
 * or `0` for a visitor with no session, which is the value the endpoint reads as
 * anonymous.
 *
 * WHAT THAT GATES, EXACTLY — measured against the dev host, both at
 * `total_count: 2,748`: with one of the four quick filters on, `member_id: 0`
 * returns rows 1–3 intact and rows 4–10 as `"****"`; `member_id: 3448` returns
 * all ten. Plain search, county, status, play type and paging never mask at
 * either value. So the directory stays free to browse, exactly as the page's own
 * heading promises, and only the quick filters ask for an account. This is the
 * soft gate — partial value shown, the rest behind a free account — and the
 * cheapest place to implement it is the place the API already implements it.
 *
 * The `mv_user` cookie is not an authorisation boundary (see `lib/session.ts`),
 * and it does not need to be for this: the endpoint decides what a member id may
 * see, and the worst a forged cookie buys is a listing that is public record
 * anyway.
 */

/**
 * The two columns a signed-out visitor does not get.
 *
 * WHY THERE IS A SECOND GATE AT ALL. The endpoint's own gate (above) only
 * engages behind a quick filter, so a visitor who never touches one sees nothing
 * locked, is never told an account would give them more, and never meets the
 * unlock ask. That is the soft gate failing to do the one job it exists for:
 * showing the value before asking. The directory's own landing state needs to
 * carry it too.
 *
 * WHY THESE TWO AND NOT THE PRODUCTION FIGURES. The page's heading, its meta
 * description and its result summary all promise a directory "ranked by reported
 * production" and free to browse. Locking oil and gas would break the promise
 * the page makes about itself and would be a regression from what a visitor has
 * today. Lease and producing-county counts are the depth behind the ranking
 * rather than the ranking itself — and they are two of the fields the operator
 * API itself withholds on a gated row, so this gate withholds what that one
 * already treats as account-only.
 *
 * IT IS A REAL GATE, NOT A BLUR OVER DELIVERED DATA. The values are replaced
 * here, on the server, before the response is serialised — so they are not in
 * the network tab, not in the DOM, and not recoverable by removing a CSS class.
 * Anything else would be theatre, and a soft gate that a right-click defeats
 * teaches visitors the locks mean nothing.
 *
 * `MASKED` is the endpoint's own sentinel, deliberately: the row mapper already
 * renders it, `OperatorSearchRecord` already types these two fields as
 * `number | typeof MASKED`, and the table already knows what it means. Inventing
 * a second "withheld" marker would mean two of everything for one idea.
 */
function withoutGatedColumns(
  response: OperatorSearchResponse,
): OperatorSearchResponse {
  return {
    ...response,
    result: response.result.map((record) => ({
      ...record,
      countie_count: MASKED,
      leaseCount: MASKED,
    })),
  };
}

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

  // Independent reads, so they overlap rather than queue.
  const [user, visitorId] = await Promise.all([getSessionUser(), getVisitorId()]);

  const payload: OperatorSearchRequest = {
    ...body,
    // Pinned — see the note above. `0` is the endpoint's anonymous value and is
    // what turns its row gate on; a client cannot nominate its own id.
    member_id: user?.id ?? 0,
    visitorId,
  };

  try {
    const result = await searchOperators(payload, request.signal);
    // A member sees everything the endpoint sent; a visitor sees it without the
    // two account-only columns.
    return NextResponse.json(user ? result : withoutGatedColumns(result));
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
