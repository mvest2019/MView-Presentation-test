import { NextResponse } from "next/server";

import { publicOperatorApiBaseUrl } from "@/lib/operator-api-types";
import { getSessionUser } from "@/lib/session";

/**
 * `POST /api/operators/production-graph` — the profile's annual series, gated.
 *
 * WHY THIS EXISTS. The chart read `POST /api/v1/operators/production-graph` straight
 * from the browser: the endpoint takes no `member_id` and withholds nothing, so a
 * signed-out reader got the operator's whole filed history — the same production data
 * the directory, the profile panels and both comparison tools all withhold. The
 * request now leaves from the server so a gate can be applied before the data is.
 *
 * THE GATE IS OURS, NOT THE API'S — the same footing as "What changed" and "Recent
 * wells & permits", and it is applied the same way: the reader is checked BEFORE any
 * upstream work, so for a visitor with no account this endpoint makes no call at all.
 * The gate removes a request rather than adding one.
 *
 * `locked` IS A NORMAL 200, not an HTTP error. A visitor with no account is an
 * expected reader, not a fault; collapsing it into `response.ok === false` would put
 * it in the same bucket as an outage, which is the mistake §4 rule 2 is about. It
 * also travels on the response rather than being inferred from an empty series — an
 * operator with nothing filed also returns no rows, and "nothing on record" and
 * "needs an account" are different sentences the chart draws differently.
 *
 * `no-store` because the answer depends on who is asking. `Vary: Cookie` is the trap
 * here (§5): every visitor carries a unique `guestUserID`, so it would cache per
 * visitor rather than per state.
 *
 * THE PAGE ABOVE STAYS STATIC. `/operators/[slug]` is prerendered; reading a cookie in
 * its server component would opt all thirty prerendered pages out of static rendering.
 * A route handler is dynamic already — §2.
 */

const REQUEST_TIMEOUT_MS = 20_000;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const operatorNo =
    typeof body.operatorNo === "string"
      ? body.operatorNo
      : typeof body.operator_no === "string"
        ? body.operator_no
        : "";
  if (!/^\d{1,7}$/.test(operatorNo)) {
    return NextResponse.json(
      { error: "operatorNo must be digits" },
      { status: 400 },
    );
  }

  /* The gate, before the upstream call. */
  if (!(await getSessionUser())) {
    return NextResponse.json(
      { locked: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${publicOperatorApiBaseUrl()}/api/v1/operators/production-graph`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        /* Forwarded as received. The client builds the complete payload —
           `operatorNo`, and optionally `county`, `start_year` and `end_year` — so the
           exact contract stays visible in one place and this handler stays a
           forwarder and a gate, not a second payload builder. */
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("[production-graph] fetch failed", { operatorNo, error });
    return NextResponse.json(
      { error: "Production data is unavailable" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    console.error("[production-graph] upstream responded", {
      operatorNo,
      status: upstream.status,
    });
    return NextResponse.json(
      { error: "Production data is unavailable" },
      { status: upstream.status === 429 ? 429 : 502 },
    );
  }

  const payload = (await upstream.json()) as Record<string, unknown>;
  return NextResponse.json(
    { ...payload, locked: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
