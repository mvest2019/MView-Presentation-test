import { NextResponse } from "next/server";

import { getOperatorComparison } from "@/lib/operator-compare-api";
import { getSessionUser } from "@/lib/session";

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
    /* Who is asking can only be answered here — the browser cannot be trusted to
       say, and the page above is a client component with no access to the cookie. */
    const gated = !(await getSessionUser());
    const { operators, years } = await getOperatorComparison(names, gated);

    return NextResponse.json(
      /* `locked` travels with the data so the page never has to infer the gate from
         a zero. Inferring it is what made a parse bug and a sign-in gate look
         identical, and the page blanked itself for both. */
      { operators, years, locked: gated },
      {
        headers: {
          /*
           * NOT CACHED ANYWHERE, and that is a requirement rather than a tuning
           * choice. Two reasons hold it in place:
           *
           *   · The body depends on whether the reader has an account. Any shared
           *     copy is wrong in one direction or the other — a signed-out reader
           *     served a member's volumes, or a member served the locked copy.
           *   · The figures are the filed record as it stands right now, and a
           *     stale one is indistinguishable from a current one on screen.
           *
           * `no-store` rather than `no-cache`: the second still permits storing the
           * response and revalidating, which leaves a gated body sitting in a cache.
           */
          "Cache-Control": "private, no-store",
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
