import { NextResponse } from "next/server";

import { getPresentationOperators } from "@/lib/operator-presentations-api";

/**
 * `GET /api/operators/presentations/operators` — the Operator filter's options.
 *
 * ONLY THE OPERATORS THAT HAVE PRESENTATIONS, which is thirty rather than the
 * directory's 24,742. That is the whole point: the filter should offer Chevron and
 * ConocoPhillips, not "1-2-3 Operating, LLC" at the top of an alphabetical list of
 * every operator in Texas.
 *
 * ONE SMALL RESPONSE, FETCHED ONCE. Thirty names is under two kilobytes, so the
 * dropdown holds the whole set and filters it in the browser — no request per
 * keystroke, and the list opens instantly. The expensive part (walking the library
 * to find the distinct set) happens on the server behind a cache.
 *
 * An empty list is not an error: the filter then offers "All operators" alone and
 * every other part of the page still works.
 */
export async function GET() {
  try {
    const operators = await getPresentationOperators();

    return NextResponse.json(
      { operators },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error("[presentations] operator list failed", error);
    return NextResponse.json({ operators: [] });
  }
}
