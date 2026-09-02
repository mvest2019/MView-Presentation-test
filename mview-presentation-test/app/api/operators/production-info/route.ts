import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

import { fetchProductionInfo } from "@/lib/operator-production-api";
import {
  hasProductionSelection,
  productionFiltersFromQuery,
} from "@/lib/operator-production-filters";

/**
 * `GET /api/operators/production-info?operator=…&county=…&from=…&to=…`
 *
 * The operators, their figures and the four "who leads on what" tiles — everything
 * the Compare Operator Production page shows EXCEPT the chart, which has its own
 * endpoint and its own route beside this one. Two routes rather than one because the
 * two are wanted at different moments: this one on Apply, the chart's when the chart
 * is approached. Folding them together would make the fold-visible half wait for the
 * half nobody has scrolled to yet.
 *
 * A GET, so the browser and any shared cache can answer a filter set that has
 * already been asked for. The upstream call is a POST; that is an upstream detail.
 *
 * NO OPERATORS IS NOT A REQUEST. An empty `search_text` comes back with an empty
 * operator list, so the page's prompt is the correct answer and a round trip would
 * only confirm it.
 */
/**
 * THE SIGN-IN GATE LIVES HERE, and it has to. Both upstream endpoints treat the
 * production VOLUMES as account-only: with `member_id: 0` the info endpoint returns
 * `total_production_oil/gas/boe` as the literal `"****"` and the series endpoint
 * returns every `oil`/`gas`/`boe` the same way, while rank, the oil/gas split and
 * the county and lease counts stay real. Measured against the dev host with an
 * otherwise identical body. The app had been overriding that with a development
 * stand-in member id, so the gate was switched off for everyone.
 *
 * IT CANNOT MOVE TO THE PAGE. `/features/compare-operator-performance` is statically
 * prerendered; reading a cookie in its server component would opt the whole route
 * out of static rendering. A route handler is dynamic already, so the session read
 * costs it nothing new.
 *
 * WHAT THE READER STILL GETS is most of the comparison — who ranks where, the
 * oil/gas mix, counties and leases, the operator cards, the filters. Only the
 * volumes and the chart are withheld, which is the soft gate the right way round.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = productionFiltersFromQuery(
    url.searchParams,
    new Date().getFullYear(),
  );

  if (!hasProductionSelection(filters)) {
    return NextResponse.json({
      info: { operators: [], leaders: {}, totalOperators: 0 },
    });
  }

  try {
    const info = await fetchProductionInfo(filters, (await getSessionUser())?.id ?? 0);
    return NextResponse.json(
      { info },
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
    // Upstream is intermittent by nature — see the note in `operator-api.ts`. The page
    // offers a retry rather than losing the applied filters.
    console.error("[production-info] read failed", { filters, error });
    return NextResponse.json(
      { error: "The comparison could not be loaded." },
      { status: 502 },
    );
  }
}
