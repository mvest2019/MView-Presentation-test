/**
 * MY LEASES' SAME-ORIGIN FORWARDER — `/api/leases/{financials}`.
 *
 * ONE FILE FOR EVERY MY LEASES CALL, the arrangement the claim flow and the
 * invite flow already use (`app/api/claim/[endpoint]`, `app/api/invite/
 * [endpoint]`). Today it forwards one endpoint; a second is a line in
 * `GET_PARAMS` and nothing else, which is the reason for the `[endpoint]`
 * segment rather than a folder per call.
 *
 * ── WHY THE PAGE CANNOT CALL THE BACKEND DIRECTLY ──
 *
 * The service lives on `MINERALVIEW_API_BASE_URL`, which is deliberately NOT
 * `NEXT_PUBLIC_`: the host stays out of the client bundle and the API's CORS
 * allowlist never needs a browser origin. So this route is the hop.
 *
 * ── WHY `member_id` IS SET HERE AND ONLY HERE ──
 *
 * `member_id` is not authentication yet — the global auth guard has not landed,
 * and whatever id the caller sends is the record it reads. Letting the browser
 * supply it would let anyone with devtools read any member's lease financials.
 * This route reads the id from the httpOnly session cookie and OVERWRITES
 * anything the caller sent, so the browser never chooses whose money it is
 * looking at. (The cookie is not signed — see `lib/session.ts` — so this is a
 * boundary against the casual case, not a substitute for the guard. When the
 * guard lands, `member_id` drops out of these calls and this note with it.)
 *
 * The same reasoning, at more length, is in `app/api/invite/[endpoint]/route.ts`.
 *
 * ── PARAMETERS ARE ALLOWLISTED, NOT FORWARDED WHOLESALE ──
 *
 * A caller must not be able to append parameters of their own to an upstream
 * call made from our server. `financials` documents no query parameters beyond
 * `member_id`, so its list is empty and everything a caller sends is dropped.
 *
 * ── ERRORS PASS THROUGH IN THE BACKEND'S OWN ENVELOPE ──
 *
 * Every upstream error is `{ error: { statusCode, code, message, … } }`, so the
 * body and status are relayed untouched rather than rewrapped, and the two
 * failures this route can add itself — not signed in, upstream unreachable —
 * are minted in the same envelope so the page parses one shape.
 */
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

/** Never cached and never prerendered: the answer depends on the session. */
export const dynamic = "force-dynamic";
/** The financials read walks the whole filing history — it is slow warm, and
 *  this is the same ceiling the dashboard and invite reads take. */
export const maxDuration = 60;

const BASE =
  process.env.MINERALVIEW_API_BASE_URL ||
  "https://mview-dev-api.mineralview.com";

const TIMEOUT_MS = 60_000;

/**
 * The endpoints this route will forward, and the query parameters each may
 * carry. `member_id` is never in a list — it is injected below, over whatever
 * the caller sent.
 *
 * An endpoint absent from here 404s rather than being passed along, so adding a
 * backend call is a deliberate line here and not a side effect of a URL.
 */
const GET_PARAMS = {
  /** `GET /api/v1/leases/financials?member_id=` — the whole filing history and
   *  the model past it, gross and at the member's decimal. */
  financials: [],
  /**
   * `GET /api/v1/leases?member_id=` — the lease list, paged.
   *
   * The four the schema accepts, and it is STRICT: an unknown key is a 400, not
   * an ignored field. `page_size` is capped at 100 upstream, `sort` takes an
   * enum (`value` is one), and `order` is NOT a key — all three verified
   * against the dev service on 2026-09-17.
   */
  leases: ["page", "page_size", "q", "sort"],
} as const satisfies Record<string, readonly string[]>;

/**
 * The upstream path for an endpoint, when it is not `/leases/<endpoint>`.
 *
 * THE LIST IS THE COLLECTION ITSELF — `/api/v1/leases`, with no trailing
 * segment — while everything else hangs off it. Spelling that as an entry here
 * keeps one `[endpoint]` route for the whole module rather than a second file
 * whose only difference is a missing path segment.
 */
const UPSTREAM_PATH: Partial<Record<string, string>> = {
  leases: "",
};

/** What a signed-out caller is told, in the words of the thing they asked for. */
const SIGN_IN_COPY: Record<Endpoint, string> = {
  financials: "Sign in to see your lease financials.",
  leases: "Sign in to see your leases.",
};

type Endpoint = keyof typeof GET_PARAMS;

/** A failure of our own, in the backend's envelope so the page parses one shape. */
function fail(statusCode: number, code: string, message: string): NextResponse {
  return NextResponse.json(
    { error: { statusCode, code, message, requestId: null, details: null } },
    { status: statusCode },
  );
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ endpoint: string }> },
) {
  const { endpoint } = await ctx.params;
  if (!(endpoint in GET_PARAMS)) {
    return fail(404, "LEASES_UNKNOWN_ENDPOINT", "Unknown leases endpoint.");
  }

  const user = await getSessionUser();
  if (!user) {
    /* NAMED PER ENDPOINT, because the page shows this message verbatim and
       "Sign in to see your lease financials" over an empty lease TABLE is the
       kind of small wrongness that makes a reader doubt the rest of the page. */
    return fail(401, "NOT_SIGNED_IN", SIGN_IN_COPY[endpoint as Endpoint]);
  }

  const incoming = new URL(req.url).searchParams;
  const params = new URLSearchParams();
  for (const key of GET_PARAMS[endpoint as Endpoint]) {
    const value = incoming.get(key);
    if (value !== null && value !== "") params.set(key, value);
  }
  /* LAST, so it wins over anything the caller sent. See the note above. */
  params.set("member_id", String(user.id));

  const tail = UPSTREAM_PATH[endpoint] ?? endpoint;
  const path = tail ? `/api/v1/leases/${tail}` : "/api/v1/leases";

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE}${path}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return fail(
      502,
      "LEASES_UPSTREAM_UNREACHABLE",
      "Could not reach the leases service. Try again in a moment.",
    );
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
