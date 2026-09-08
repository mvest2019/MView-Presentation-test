/**
 * The whole payload for one owner — `/api/portfolio`.
 *
 * THE URL IS THE REFERENCE'S, verbatim, and that is the point: the ported
 * `Chrome`/`Portal` fetch this path when the owner picker loads a record, and
 * keeping the path identical is what lets those two files stay copies of the
 * reference's rather than forks of it. Nothing else in this app serves
 * `/api/portfolio`, so there is no collision.
 *
 * It reads the data seam (`_lib/reference/owner-data`), so when the fixture is
 * replaced by a backend this handler does not change either.
 *
 * WHAT IT DOES DO IS TRANSLATE A FAILURE. Alerts and Activity come from
 * `mineralview-api` when one is configured, and that service answers with a
 * `code` per failure — `OWNER-ALERTS-ACTIVITY-API.md` §4 gives a different
 * sentence and a different retryability for each. The reference's envelope is
 * `{ error, detail }` and `Portal` renders it as `error — detail`, so the code
 * is turned into the `error` half here and the service's own message, which
 * names the owner and points at `/owners/search`, is passed through as
 * `detail`. Flattening every failure to one 500 threw that away: a mistyped
 * owner and a database outage read identically, and neither said which.
 */
import { NextResponse } from "next/server";

import { OwnerApiError } from "@/app/mineralownersite/_lib/reference/owner-api";
import {
  getOwnerPayload,
  selectionFrom,
} from "@/app/mineralownersite/_lib/reference/owner-data";

/** §4's table, as the short half of the reference's error envelope */
const HEADLINE: Record<string, string> = {
  VALIDATION_ERROR: "That request was not valid",
  PORTFOLIO_OWNER_NOT_FOUND: "We could not find that name on the roll",
  DATABASE_UNAVAILABLE: "Records are temporarily unavailable",
  QUERY_TIMEOUT: "That took too long",
  CLIENT_TIMEOUT: "That took too long",
  NETWORK_ERROR: "The records service could not be reached",
  OWNER_NOT_AVAILABLE: "That owner is not available yet",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const payload = await getOwnerPayload(selectionFrom(new URL(req.url)));
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof OwnerApiError) {
      return NextResponse.json(
        {
          error: HEADLINE[e.code] ?? "That did not load",
          detail: e.requestId ? `${e.message} (request ${e.requestId})` : e.message,
          code: e.code,
          /* the client may offer a retry for these two and should not for the
             rest — a 400 or a 404 will answer the same way every time */
          retryable: e.retryable,
        },
        /* 0 is this client's "never reached the service"; 502 is the honest
           status for a gateway that could not talk to the thing behind it */
        { status: e.status === 0 ? 502 : e.status },
      );
    }
    return NextResponse.json(
      {
        error: "build failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
