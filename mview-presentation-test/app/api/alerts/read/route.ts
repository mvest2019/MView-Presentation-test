import { NextResponse } from "next/server";

import { currentMemberTarget } from "@/app/mineralownersite/_lib/reference/owner-data";
import {
  fetchAlertsRead,
  postAlertsRead,
} from "@/app/mineralownersite/_lib/reference/member-api";
import { OwnerApiError } from "@/app/mineralownersite/_lib/reference/owner-api";

/**
 * WHICH ALERTS THIS READER HAS OPENED — `/api/alerts/read`.
 *
 * ── WHY THE BROWSER CANNOT CALL THE SERVICE DIRECTLY ───────────────────────
 * Two reasons, and either one on its own would be enough. `member_id` comes
 * from the httpOnly `mv_user` cookie, which page JavaScript is deliberately
 * unable to read — that is the whole point of the cookie being httpOnly. And
 * `MINERALVIEW_API_BASE_URL` is read in `server-only` code, so the address
 * never reaches the bundle and the API's CORS allowlist never has to carry a
 * browser origin. So the read goes through here: the client sends what it
 * knows (the owner, and which ids), and this route supplies who is asking.
 *
 * ── THE OWNER IS THE CLIENT'S TO SEND, AND IT IS CHECKED ───────────────────
 * Read state is scoped per member AND per owner — a member may hold several
 * claimed roll identities and marking one inbox read must not silence
 * another's. The browser has the right value already: `payload.owner.ownername`
 * is the owner `/dashboard` resolved for this member, which is the same owner
 * the alerts on screen were built for. It is required rather than defaulted,
 * because a default here would write one identity's read state under another's
 * name and nothing would ever say so.
 *
 * ── A WRITE THAT CANNOT PERSIST MUST FAIL LOUDLY ───────────────────────────
 * The service's own note draws this line and it is kept here: its READS are
 * never fatal — a store that is down answers "nothing is read", which shows
 * the reader more than they expected rather than less, and for an inbox that
 * is the safe direction. Its WRITES are not caught. So this route does not
 * swallow a failed POST into a 200: the client needs to know the mark did not
 * stick, because the alternative is a row that looks read until the next page
 * load and then quietly is not.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Not signed in is not an error anywhere else in this app, and it is not one
 *  here: there is simply no member whose read state this could be. */
async function target(): Promise<{ base: string; member: string } | null> {
  return currentMemberTarget();
}

function failed(e: unknown): NextResponse {
  if (e instanceof OwnerApiError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, requestId: e.requestId } },
      { status: e.status || 502 },
    );
  }
  return NextResponse.json(
    { error: { code: "READ_STATE_FAILED", message: String(e) } },
    { status: 502 },
  );
}

export async function GET(req: Request) {
  const who = await target();
  if (!who) return NextResponse.json({ ids: [] });

  const owner = new URL(req.url).searchParams.get("owner")?.trim();
  if (!owner) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "owner is required" } },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await fetchAlertsRead(who.base, who.member, owner));
  } catch (e) {
    /* THE ONE PLACE A FAILURE IS ANSWERED RATHER THAN RAISED, and it matches
       the service's own rule for this direction: unable to say what is read
       means nothing is known to be read, which shows the reader every finding
       rather than hiding one. `unread` on the payload is the real source; this
       route exists for a client that wants to re-check without a reload. */
    console.warn("[alerts/read] could not be read:", e);
    return NextResponse.json({ ids: [] });
  }
}

export async function POST(req: Request) {
  const who = await target();
  if (!who) {
    return NextResponse.json(
      { error: { code: "NOT_SIGNED_IN", message: "No member is signed in." } },
      { status: 401 },
    );
  }

  let body: { owner?: string; ids?: unknown; all?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "expected a JSON body" } },
      { status: 400 },
    );
  }

  const owner = String(body.owner ?? "").trim();
  if (!owner) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "owner is required" } },
      { status: 400 },
    );
  }

  /* `all` AND `ids` ARE NOT BOTH SENT. The service resolves `all` against the
     current sweep, which is strictly better than a list this client assembled
     from a page that may be minutes old — so where the caller asks for both,
     `all` is what goes. */
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  if (!body.all && !ids.length) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ids[] or all:true is required" } },
      { status: 400 },
    );
  }

  try {
    await postAlertsRead(
      who.base, who.member, owner,
      body.all ? { all: true } : { ids },
    );
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return failed(e);
  }
}
