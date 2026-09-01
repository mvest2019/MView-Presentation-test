import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

/**
 * `POST /api/operators/recent-wells-permits` — permit and completion filings, gated.
 *
 * WHY THIS ONE IS A PRODUCT DECISION AND NOT AN API ONE. Unlike `/operators/wells`,
 * the upstream endpoint takes no `member_id` and withholds nothing — probed. So
 * this gate is ours, and it needs a reason the page can stand behind rather than
 * "the backend does it".
 *
 * THE REASON IS ON THE PAGE ALREADY. The profile's own closing CTA promises that a
 * free account "ties this operator's permits, completions and production postings
 * to your acreage — with alerts when something new touches your leases". Filings
 * are the thing that page has always described as the account's benefit. Giving
 * them away in full above the ask, and then asking for an account to get them, is
 * the page arguing against itself.
 *
 * WHAT STAYS FREE, AND WHY IT MATTERS. This note used to say that everything which
 * is the filed historical record — production over time, production by county, the
 * lease book, the footprint map, the company and production panels — was untouched
 * and reachable with no account, and that only this forward-looking activity feed was
 * gated. That is no longer the shape of the gate: the volumes in those panels and
 * tables are withheld, and so is the production chart. What stays free is the
 * operator's IDENTITY and FOOTPRINT — who it is, its filed address and status, the
 * counties and leases it appears on, and the map. The figures are the account's.
 *
 * This handler's own reason is unchanged: filings are what the profile's closing CTA
 * has always described as the account's benefit.
 *
 * IT SKIPS THE UPSTREAM CALL ENTIRELY for a signed-out reader, so the gate costs a
 * request rather than adding one, and no withheld rows sit in the network tab
 * contradicting the lock on screen.
 *
 * THE PAGE ABOVE STAYS STATIC. `/operators/[slug]` is prerendered; reading a cookie
 * in its server component would opt the whole route out of static rendering. A
 * route handler is dynamic already — the same reasoning as its two siblings.
 */

function apiBaseUrl(): string {
  const url =
    process.env.OPERATOR_API_BASE_URL ??
    process.env.NEXT_PUBLIC_OPERATOR_API_BASE_URL;
  if (!url) throw new Error("OPERATOR_API_BASE_URL is not set");
  return url.replace(/\/+$/, "");
}

const REQUEST_TIMEOUT_MS = 15000;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const operatorNumber =
    typeof body.operator_number === "string" ? body.operator_number : "";
  if (!/^\d{1,7}$/.test(operatorNumber)) {
    return NextResponse.json(
      { error: "operator_number must be digits" },
      { status: 400 },
    );
  }

  /* `locked` is a normal answer, not an error: the section draws it as a locked
     panel. `no-store` because it depends on who is asking. */
  if (!(await getSessionUser())) {
    return NextResponse.json(
      { locked: true, results: [], total_count: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const upstream = await fetch(
      `${apiBaseUrl()}/api/v1/operators/recent-wells-permits`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ operator_number: operatorNumber }),
        signal: AbortSignal.any([
          request.signal,
          AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ]),
        cache: "no-store",
      },
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `filings responded ${upstream.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json(await upstream.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return new NextResponse(null, { status: 499 });
    }
    console.error("[operators] recent wells/permits failed", {
      operatorNumber,
      error,
    });
    return NextResponse.json(
      { error: "Filings are unavailable" },
      { status: 502 },
    );
  }
}
