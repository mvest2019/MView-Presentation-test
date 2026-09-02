import { NextResponse } from "next/server";

import { searchOperatorNames } from "@/lib/operator-statistics-api";
import type { OperatorNameResult } from "@/lib/operator-statistics-shape";

/**
 * `GET /api/operators/names?q=` — operator name suggestions for the compare picker.
 *
 * WHY THE LIST IS NOT SENT TO THE BROWSER. `/api/v1/operators/names` is 24,742
 * records, 2.10 MB of JSON, 342 KB gzipped, and it carries no operator number.
 * Handing that to a combobox would cost more transfer than the whole rest of the
 * page and would land as a 24,742-element parse on the main thread — a direct hit
 * to LCP and to input responsiveness on a phone. So the list is read and cached
 * once on the server and only the matches for what was typed cross the wire: at
 * most 20 rows, well under a kilobyte.
 *
 * IT ANSWERS BOTH WAYS THE CONTROL IS USED. An empty `q` is the dropdown being
 * opened and browsed; a `q` is a search. Both come from the same cached read and
 * both are paged the same way, so opening the dropdown costs no more than typing in
 * it and there is only one path to reason about.
 *
 * `offset` IS WHAT MAKES THE LIST SCROLLABLE. Twenty names come back at a time and
 * the picker asks for the next twenty as it reaches the end, so every one of the
 * 24,742 operators is reachable by scrolling without any single response being
 * large. `total` tells the picker when to stop asking.
 *
 * A FAILURE HERE IS NOT A PAGE FAILURE, BUT IT MUST NOT LOOK LIKE AN EMPTY ONE.
 * This used to answer 200 with `{ matches: [] }` when the upstream read failed,
 * which is exactly the shape of "nothing matched what you typed" — so a timeout on
 * the 4.11 MB name list rendered as an empty dropdown on both comparison pages,
 * with nothing to distinguish it from a genuine no-match and nothing to retry. It
 * now answers 503, which the picker reports and offers to try again. Every other
 * block on the page is unaffected either way.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? "";

  // A junk or negative offset reads as the first page rather than an error — this
  // is a suggestion list, and there is nothing here worth failing a request over.
  const parsed = Number.parseInt(params.get("offset") ?? "0", 10);
  const offset = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

  let result: OperatorNameResult;
  try {
    result = await searchOperatorNames(query, offset);
  } catch (error) {
    console.error("[operators] name search unavailable", error);
    // 503 rather than 500: the directory is momentarily unreachable, not broken,
    // and the picker's retry is the right response to it. `no-store` so a shared
    // cache cannot hold the outage past the moment it ends.
    return NextResponse.json(
      { matches: [], total: 0, offset, unavailable: true },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { matches: result.matches, total: result.total, offset },
    {
      headers: {
        // Shared caches hold this, the browser does not: `max-age=0` keeps a client
        // from replaying a payload whose SHAPE has changed under it after a deploy —
        // which is exactly how a newly added field reads as missing for ten minutes.
        // `s-maxage` keeps the CDN benefit, and repeat selections in a session are
        // already answered from memory without a request.
        "Cache-Control":
          "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  );
}
