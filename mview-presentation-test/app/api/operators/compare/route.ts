import { NextResponse } from "next/server";

import { getOperatorComparison } from "@/lib/operator-compare-api";

/**
 * `GET /api/operators/compare?names=…&names=…` — the whole comparison in one read.
 *
 * A GET WITH REPEATED `names`, not a POST, because this is a pure read: it makes the
 * request cacheable by the browser and by Next, so returning to a comparison the
 * visitor has already seen costs nothing. The upstream call it wraps is a POST; that
 * is an upstream detail and does not need to reach the client.
 *
 * NAMES ARRIVE IN THE SPELLING THE PICKER SHOWS. The upstream endpoint matches only
 * the operator's filed name, punctuation and all, which is not what anyone selects
 * — `lib/operator-compare-api.ts` reconciles the two against the cached name list.
 *
 * TWO OPERATORS ARE THE MINIMUM the page compares, so fewer is answered with an
 * empty list rather than a request: there is nothing to compare, and the page shows
 * its prompt.
 *
 * A NAME THAT DOES NOT COME BACK IS NOT AN ERROR. The response carries whichever
 * operators resolved; the page places them into their slots by name and reports the
 * rest per slot, so one unrecognised operator cannot empty the comparison.
 */
export async function GET(request: Request) {
  const names = new URL(request.url).searchParams
    .getAll("names")
    .map((name) => name.trim())
    .filter((name) => name !== "");

  if (names.length < 2) {
    return NextResponse.json({ operators: [], years: [] });
  }

  try {
    /* The trend years come from the response, not from a constant — see
       `trendYearsFrom`. They travel with the operators because every `trend` array is
       indexed by them, so a client that had to guess the years could mislabel a
       column. */
    const { operators, years } = await getOperatorComparison(names);

    return NextResponse.json(
      { operators, years },
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
  } catch (error) {
    // Upstream is intermittent by nature — see the note in `operator-api.ts`. The
    // page offers a retry rather than losing the selection.
    console.error("[compare] comparison failed", { names, error });
    return NextResponse.json(
      { error: "The comparison could not be loaded." },
      { status: 502 },
    );
  }
}
