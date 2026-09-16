/**
 * THE INVITE API'S SAME-ORIGIN FORWARDER — `/api/invite/{leases|owners|co-owners}`.
 *
 * The backend's five invite endpoints (contract: INVITE-CO-OWNERS-API.md, tag
 * `invite` in its Swagger) live on `MINERALVIEW_API_BASE_URL`, which is
 * deliberately NOT `NEXT_PUBLIC_`: the host stays out of the client bundle and
 * the API's CORS allowlist never needs a browser origin. So the page cannot
 * call the service directly, and this route is the hop.
 *
 * ── WHY `member_id` IS SET HERE AND ONLY HERE ──
 *
 * The contract is explicit that `member_id` is not authentication yet — the
 * global auth guard has not landed, and whatever id the caller sends is the
 * record it reads. Letting the browser supply it would let anyone with devtools
 * read any member's claimed leases and mint codes in their name. This route
 * reads the id from the httpOnly session cookie instead and OVERWRITES anything
 * the caller sent, so the browser never chooses whose invites it is working
 * with. (The cookie is not signed — see `lib/session.ts` — so this is a
 * boundary against the casual case, not a substitute for the guard. When the
 * guard lands, `member_id` drops out of these calls and this note with it.)
 *
 * ── PARAMETERS ARE ALLOWLISTED, NOT FORWARDED WHOLESALE ──
 *
 * Two reasons. A caller must not be able to append parameters of their own to
 * an upstream call made from our server — the same rule the claim proxy
 * records. And the invite schemas are STRICT: an unknown query param or body
 * field upstream is a 400, not ignored, so forwarding stray fields would break
 * requests that are otherwise fine.
 *
 * ── ERRORS PASS THROUGH IN THE BACKEND'S OWN ENVELOPE ──
 *
 * Every upstream error is `{ error: { statusCode, code, message, … } }` and the
 * page branches on `code` (`INVITE_NO_CLAIM` → "claim a lease first", and so
 * on). So the body and status are relayed untouched rather than rewrapped, and
 * the two failures this route can add itself — not signed in, upstream
 * unreachable — are minted in the same envelope so the page parses one shape.
 * `Retry-After` on a 429 rides along for the same reason.
 */
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

/** Never cached and never prerendered: the answer depends on the session. */
export const dynamic = "force-dynamic";
/** The roll read behind `/invite/owners` can be slow warm — same ceiling the
 *  dashboard reads use. */
export const maxDuration = 60;

const BASE =
  process.env.MINERALVIEW_API_BASE_URL ||
  "https://mview-dev-api.mineralview.com";

const TIMEOUT_MS = 60_000;

/** The query parameters each GET may carry, per the contract's tables. */
const GET_PARAMS = {
  leases: ["owner", "q", "limit", "offset"],
  owners: ["lease", "q", "kind", "limit", "offset"],
  "co-owners": [
    "lease",
    "greeting",
    "custom",
    "body",
    "sender",
    "include_inactive",
  ],
} as const;

type Endpoint = keyof typeof GET_PARAMS;

/**
 * The write-shaped calls, per endpoint: which methods exist, which body fields
 * may pass, and whether the session's `member_id` is injected.
 *
 * `lookup` TAKES NO `member_id` — the schema is strict and would 400 on the
 * extra field, and the call is about the CODE, not the caller: it resolves an
 * invite code to the owner name and address the redeem flow claims with. The
 * session is still required to reach it, so a signed-out visitor cannot use
 * this route to turn codes into names and addresses.
 */
const WRITES: Record<
  string,
  Partial<Record<"POST" | "DELETE", readonly string[]>> & {
    withMemberId: boolean;
  }
> = {
  "co-owners": {
    POST: ["lease", "owners", "greeting", "custom", "body", "sender"],
    DELETE: ["lease", "owners"],
    withMemberId: true,
  },
  lookup: {
    POST: ["invite_code"],
    withMemberId: false,
  },
};

/** A failure of our own, in the backend's envelope so the page parses one shape. */
function fail(statusCode: number, code: string, message: string): NextResponse {
  return NextResponse.json(
    { error: { statusCode, code, message, requestId: null, details: null } },
    { status: statusCode },
  );
}

/** Send to the backend and relay whatever comes back, status and body alike. */
async function forward(url: string, init?: RequestInit): Promise<NextResponse> {
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...init,
    });
  } catch {
    return fail(
      502,
      "INVITE_UPSTREAM_UNREACHABLE",
      "Could not reach the invite service. Try again in a moment.",
    );
  }

  /* DELETE answers 204 with no body — a 204 built with a body throws. */
  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const body = await upstream.text();
  const headers = new Headers({
    "content-type": upstream.headers.get("content-type") ?? "application/json",
  });
  /* The POST rate limit carries its own back-off; the page shows it. */
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) headers.set("retry-after", retryAfter);

  return new NextResponse(body, { status: upstream.status, headers });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ endpoint: string }> },
) {
  const { endpoint } = await ctx.params;
  if (!(endpoint in GET_PARAMS))
    return fail(404, "INVITE_UNKNOWN_ENDPOINT", "Unknown invite endpoint.");

  const user = await getSessionUser();
  if (!user)
    return fail(
      401,
      "NOT_SIGNED_IN",
      "Sign in to see the co-owners of your leases.",
    );

  const incoming = new URL(req.url).searchParams;
  const params = new URLSearchParams();
  for (const key of GET_PARAMS[endpoint as Endpoint]) {
    const value = incoming.get(key);
    if (value !== null && value !== "") params.set(key, value);
  }
  params.set("member_id", String(user.id));

  return forward(`${BASE}/api/v1/invite/${endpoint}?${params}`);
}

/**
 * POST and DELETE share everything but the field list, so they share this.
 *
 * The allowlist runs on the BODY too: the contract's own warning is that a
 * request able to name its own invitee could mint a working claim code
 * addressed to any name it liked, so nothing beyond the documented fields is
 * allowed anywhere near the upstream call — and `member_id` is set last, over
 * whatever the caller sent.
 */
async function writeThrough(
  req: Request,
  ctx: { params: Promise<{ endpoint: string }> },
  method: "POST" | "DELETE",
): Promise<NextResponse> {
  const { endpoint } = await ctx.params;
  const write = WRITES[endpoint];
  const fields = write?.[method];
  if (!write || !fields)
    return fail(
      404,
      "INVITE_UNKNOWN_ENDPOINT",
      `That invite endpoint takes no ${method}.`,
    );

  const user = await getSessionUser();
  if (!user)
    return fail(401, "NOT_SIGNED_IN", "Sign in to invite your co-owners.");

  let incoming: Record<string, unknown>;
  try {
    incoming = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "VALIDATION_ERROR", "The request body was not JSON.");
  }

  const body: Record<string, unknown> = {};
  for (const key of fields) {
    if (incoming[key] !== undefined) body[key] = incoming[key];
  }
  if (write.withMemberId) body.member_id = user.id;

  return forward(`${BASE}/api/v1/invite/${endpoint}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ endpoint: string }> },
) {
  return writeThrough(req, ctx, "POST");
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ endpoint: string }> },
) {
  return writeThrough(req, ctx, "DELETE");
}
