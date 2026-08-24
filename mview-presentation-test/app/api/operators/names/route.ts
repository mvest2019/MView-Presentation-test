import { NextResponse } from "next/server";

import { searchOperatorNames } from "@/lib/operator-statistics-api";

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
 * A FAILURE HERE IS NOT A PAGE FAILURE. `searchOperatorNames` already degrades to
 * an empty list and logs, so the picker shows "no matches" while every other block
 * on the page keeps working.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? "";

  // A junk or negative offset reads as the first page rather than an error — this
  // is a suggestion list, and there is nothing here worth failing a request over.
  const parsed = Number.parseInt(params.get("offset") ?? "0", 10);
  const offset = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

  const { matches, total } = await searchOperatorNames(query, offset);

  return NextResponse.json(
    { matches, total, offset },
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
