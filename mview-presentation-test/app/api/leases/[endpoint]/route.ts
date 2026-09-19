/**
 * MY LEASES' SAME-ORIGIN FORWARDER — `/api/leases/{financials|leases|picker}`.
 *
 * ONE FILE FOR EVERY MY LEASES CALL, the arrangement the claim flow and the
 * invite flow already use (`app/api/claim/[endpoint]`, `app/api/invite/
 * [endpoint]`). Another backend call is a line in `GET_PARAMS` and nothing
 * else, which is the reason for the `[endpoint]` segment rather than a folder
 * per call.
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
/**
 * The slow reads here walk a whole filing history. `financials` is slow warm;
 * `lease` on a cold lease has been measured at over two minutes, and a ceiling
 * under that turns a working call into "could not load" every time the
 * service's cache has gone cold.
 */
export const maxDuration = 300;

const BASE =
  process.env.MINERALVIEW_API_BASE_URL ||
  "https://mview-dev-api.mineralview.com";

/** Just inside `maxDuration`, so the upstream read is what gives up first and
 *  the caller gets our own 502 rather than a severed connection. */
const TIMEOUT_MS = 290_000;

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
  /**
   * `GET /api/v1/leases/picker?member_id=` — every lease on the record as a
   * name, a number, a county and a figure: the report header's jump list.
   *
   * NOT PAGED, and that is the service's answer rather than an assumption —
   * this member's 782 leases arrive in one 97KB body, `total` agreeing with the
   * array's length. It takes no parameters, so the list is empty and anything a
   * caller appends is dropped. Verified against the dev service on 2026-09-17.
   */
  picker: [],
  /**
   * `GET /api/v1/leases/lease?member_id=&id=` — one lease's whole report.
   *
   * `id` IS THE SERVICE'S OWN KEY, `02_269507` — the district code and the
   * lease number. The number alone is not unique across districts, and this
   * record holds four leases all named BETTY KENNEDY UNIT A, told apart only by
   * it. It is CASE-SENSITIVE upstream: `7C_201743` answers where `7c_201743`
   * comes back "not on this owner's record".
   *
   * A lease that is not on the caller's record is a 404 `LEASES_LEASE_NOT_HELD`
   * — the service enforcing the boundary this route cannot.
   */
  lease: ["id"],
  /**
   * `GET /api/v1/leases/reservoirs?member_id=&id=&reservoir_key=` — the rock
   * one lease produces from: its wells, its depths, its monthly series and the
   * map of where the holes are.
   *
   * `reservoir_key` IS OPTIONAL AND NARROWS THE ANSWER. Without it the service
   * returns every reservoir on the lease (three on `08_04406`, at 19KB);
   * with it, just that one (7KB). The key is the reservoir's name as the
   * service spells it back — `GLORIETA` — matched case-insensitively, and
   * `__unknown` for a reservoir the filings do not name.
   */
  reservoirs: ["id", "reservoir_key"],
  /**
   * `GET /api/v1/leases/lease/map?member_id=&id=` — where one lease's wells sit
   * on the ground: every hole's surface and bottom, the survey grade behind
   * each path, what the operator filed for acreage, and how many wells sit
   * within one, three and five miles.
   *
   * THE KEY IS HYPHENATED BECAUSE THE PATH IS NOT. This route's segment is a
   * single `[endpoint]`, so `/api/leases/lease/map` would be two segments and
   * match nothing. `lease-map` is the name the browser asks for and
   * `UPSTREAM_PATH` turns it back into `lease/map` on the way out.
   */
  "lease-map": ["id"],
  /**
   * `GET /api/v1/leases/monthly?member_id=&month=&owner=` — the twelve-page
   * monthly report, all of it, in one read.
   *
   * THE UPSTREAM QUERY IS STRICT: an unknown parameter is a 400, not an ignored
   * field. `format`, `page` and `refresh` included. That makes the allowlist
   * here load-bearing rather than defensive — it is what stops a stray query
   * string on our own URL turning into a rejected upstream call.
   *
   * `month` is `YYYYMM` and defaults to the newest month actually FILED. A
   * month that was never filed comes back 404 `LEASES_MONTH_NOT_FILED` carrying
   * the months that were, so the picker can correct itself rather than draw a
   * page of zeroes.
   */
  monthly: ["month", "owner"],
  /**
   * `GET /api/v1/leases/monthly/email?member_id=` — whether this deployment can
   * send the report at all: `{transport, can_send, note}`. The button is
   * labelled from it rather than promising a send that the server has no SMTP
   * for.
   */
  "monthly-email": [],
  /**
   * `GET /api/v1/leases/wells?member_id=&id=&api10=` — one lease's wells.
   *
   * `api10` NARROWS IT TO ONE WELL, which is what the well report asks for. The
   * response still carries `picker[]` — EVERY well on the lease, however the
   * list is paged — because that is how a well on another page is reached.
   */
  wells: ["id", "api10", "page", "page_size"],

  /**
   * THE DRAWERS BEHIND THE TILES — one endpoint for all three reports, told
   * apart by `tab`.
   *
   * `scope` is "share" or "lease" and only the lease tab reads it; the other
   * two are always whole-rock and whole-well figures. `reservoir_key` names
   * which rock and `api10` which hole, so the drawer on a tile is about the
   * thing the tab is actually showing.
   *
   * Every one of them is passed through rather than assumed, because the same
   * key — `reservoir_gas`, say — answers differently for two rocks on one
   * lease.
   */
  explainers: ["id", "tab", "scope", "reservoir_key", "api10"],
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
  /* One endpoint, two path segments — see the note on `lease-map` above. */
  "lease-map": "lease/map",
  "monthly-email": "monthly/email",
};

/** What a signed-out caller is told, in the words of the thing they asked for. */
const SIGN_IN_COPY: Record<Endpoint, string> = {
  financials: "Sign in to see your lease financials.",
  leases: "Sign in to see your leases.",
  picker: "Sign in to see your leases.",
  lease: "Sign in to see this lease report.",
  reservoirs: "Sign in to see this reservoir report.",
  "lease-map": "Sign in to see where these wells are.",
  monthly: "Sign in to see your monthly report.",
  "monthly-email": "Sign in to email yourself this report.",
  wells: "Sign in to see this well report.",
  explainers: "Sign in to see how these figures are built.",
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

/**
 * THE ONE ENDPOINT THIS ROUTE WILL POST TO — sending the monthly report.
 *
 * ── THE CALLER CHOOSES THE MONTH AND NOTHING ELSE ──
 *
 * `member_id` and `to` are both taken from the session and written over
 * whatever arrived. `member_id` for the reason the whole file exists: it decides
 * whose portfolio is read, and a browser must not pick it.
 *
 * `to` MATTERS MORE, and it is the reason this is not a plain pass-through. The
 * body names a recipient, so a forwarder that relayed the caller's `to` would
 * let anyone who can reach this route mail a private owner's whole portfolio to
 * an address of their choosing — the report itself is the payload. The button
 * says "Email me this"; "me" is the signed-in session's own address and is not
 * negotiable from the page.
 *
 * ── THE UPSTREAM BODY IS STRICT ──
 *
 * An unrecognised key is a 400, not an ignored field, so the body is rebuilt
 * from an allowlist rather than spread from what arrived.
 */
const POST_BODY: Partial<Record<string, readonly string[]>> = {
  "monthly-email": ["month"],
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ endpoint: string }> },
) {
  const { endpoint } = await ctx.params;
  const allowed = POST_BODY[endpoint];
  if (!allowed) {
    return fail(404, "LEASES_UNKNOWN_ENDPOINT", "Unknown leases endpoint.");
  }

  const user = await getSessionUser();
  if (!user) {
    return fail(401, "NOT_SIGNED_IN", "Sign in to email yourself this report.");
  }
  if (!user.email) {
    return fail(
      400,
      "NO_ADDRESS_ON_RECORD",
      "Your account has no email address to send to.",
    );
  }

  let incoming: Record<string, unknown> = {};
  try {
    const parsed: unknown = await req.json();
    if (parsed && typeof parsed === "object") {
      incoming = parsed as Record<string, unknown>;
    }
  } catch {
    /* An empty body is a send of the newest month, which is a fair default. */
  }

  const body: Record<string, unknown> = {};
  for (const key of allowed) {
    const value = incoming[key];
    if (value !== undefined && value !== null && value !== "") {
      body[key] = value;
    }
  }
  /* LAST, so they win over anything the caller sent. See the note above. */
  body.member_id = user.id;
  body.to = user.email;

  const tail = UPSTREAM_PATH[endpoint] ?? endpoint;

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE}/api/v1/leases/${tail}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
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

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
