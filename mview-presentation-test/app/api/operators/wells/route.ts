import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

/**
 * `POST /api/operators/wells` — the well list inside one lease, gated on sign-in.
 *
 * WHY THIS EXISTS AT ALL. `/api/v1/operators/wells` already treats itself as
 * account-only: with `member_id: 0` every field of every row comes back as the
 * literal `*****` — district, lease, county, API number, status, both volumes —
 * while `/leases` beside it returns real rows either way. Measured against the dev
 * host. So the backend's own answer to "what needs an account" includes the
 * well-level detail, and the app was overriding it by sending a development
 * stand-in member id from the browser.
 *
 * A BROWSER CANNOT ANSWER "WHO IS THIS", which is the whole reason for a hop. The
 * lease drill-down runs client-side against the public API host, so `member_id`
 * rode in a body the page composes — anything able to edit that request could
 * award itself an id. Pinning it here from the `mv_user` cookie is the only place
 * the question can be answered honestly.
 *
 * IT COSTS NOTHING AND SAVES A REQUEST. For a signed-out reader this returns
 * `{ locked: true }` without calling upstream at all: no round trip, no page of
 * `*****` rows crossing the wire to be hidden in CSS. Nothing is blurred that was
 * ever fetched, and there is no masked payload sitting in the network tab
 * contradicting the lock on screen.
 *
 * THE PAGE ABOVE IT STAYS STATIC. `/operators/[slug]` is prerendered for the
 * best-known operators; reading a cookie in that server component would opt the
 * whole route out of static rendering. A route handler is dynamic already, so the
 * session read costs it nothing new — the same reasoning as
 * `/api/operators/[number]/what-changed`.
 */

/** The upstream host, read server-side. */
function apiBaseUrl(): string {
  const url =
    process.env.OPERATOR_API_BASE_URL ??
    process.env.NEXT_PUBLIC_OPERATOR_API_BASE_URL;
  if (!url) throw new Error("OPERATOR_API_BASE_URL is not set");
  return url.replace(/\/+$/, "");
}

/** Long enough for a warm response, short enough not to hang the drawer. */
const REQUEST_TIMEOUT_MS = 15000;

/** A string field from the body, or "" — never forwarded as anything else. */
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function count(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  /*
   * The gate, ahead of the upstream call. `locked` is a normal answer for a reader
   * with no account, not an error — the drawer draws it as a locked panel, and
   * signalling it as a non-2xx would put it in the same bucket as an outage.
   *
   * `no-store`: the answer depends on who is asking, and a shared cache holding one
   * reader's `locked` and serving it to a member is how a gate like this breaks.
   */
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { locked: true, operator_wells: [], total_count: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Rebuilt field by field rather than spread: the client composes the shape, but
  // `member_id` must come from the session and nothing else may be smuggled in.
  const payload = {
    operator_number: text(body.operator_number),
    county: text(body.county),
    lease_number: text(body.lease_number),
    well_number: text(body.well_number),
    status: text(body.status),
    district_code: text(body.district_code),
    member_id: user.id,
    page: count(body.page, 1),
    pagesize: count(body.pagesize, 10),
  };

  try {
    const upstream = await fetch(`${apiBaseUrl()}/api/v1/operators/wells`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      // The caller's abort reaches upstream, so closing the drawer or opening
      // another lease cancels the request rather than merely ignoring its reply.
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ]),
      cache: "no-store",
    });

    if (!upstream.ok) {
      /*
       * DEFECT 155 — a rate limit is not an outage and must not read as one.
       *
       * The upstream answers 429 with its own sentence, "Too many requests. Try
       * again in 20 seconds." Collapsing that into a blanket 502 "wells responded
       * 429" left the drawer saying "Wells could not be loaded", which invites the
       * reader to hammer Try again and earn another 429. The status and the
       * upstream's wording are passed through so the UI can say what actually
       * happened and how long to wait.
       *
       * NOTHING RETRIES ON ITS OWN. The only retry on this path is the reader
       * pressing the button, which is the behaviour the defect asks for.
       */
      const detail = await upstream
        .json()
        .then((body: { message?: unknown; error?: unknown }) =>
          typeof body?.message === "string"
            ? body.message
            : typeof body?.error === "string"
              ? body.error
              : "",
        )
        .catch(() => "");

      if (upstream.status === 429) {
        return NextResponse.json(
          {
            error:
              detail || "Too many requests. Please wait a moment and try again.",
            retryAfter: upstream.headers.get("retry-after"),
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { error: detail || `Well records are unavailable just now.` },
        { status: 502 },
      );
    }

    return NextResponse.json(await upstream.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // The drawer went away or was superseded. 499 is the conventional code for a
    // request the client closed; nothing will read the body.
    if (error instanceof DOMException && error.name === "AbortError") {
      return new NextResponse(null, { status: 499 });
    }
    console.error("[operators] wells failed", { payload, error });
    return NextResponse.json(
      { error: "Well records are unavailable" },
      { status: 502 },
    );
  }
}
