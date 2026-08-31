import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

import { fetchProductionSeries } from "@/lib/operator-production-api";
import {
  hasProductionSelection,
  productionFiltersFromQuery,
} from "@/lib/operator-production-filters";

/**
 * `GET /api/operators/production-series?operator=…&county=…&from=…&to=…`
 *
 * The annual series behind the Production over time chart, and nothing else. Its
 * sibling route serves the cards, the tiles and the stats table.
 *
 * WHY THIS IS SEPARATE, AND WHY THAT SAVES REQUESTS RATHER THAN ADDING ONE. The chart
 * sits below the fold, so the page asks for this only when the chart is approached —
 * a visitor who applies filters and reads the cards never pays for it. Sharing one
 * route with the info read would mean either fetching the series nobody looked at, or
 * fetching the info twice.
 *
 * THE WHOLE APPLIED WINDOW COMES BACK AT ONCE, and the chart's year brush scopes what
 * is already in hand. A brush that re-requested would fire on every drag; this way
 * the range control in the filter bar is the only thing that changes the request.
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
 * IT CANNOT MOVE TO THE PAGE. `/features/compare-operator-production` is statically
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
    return NextResponse.json({ series: { years: [], operators: [] } });
  }

  try {
    const series = await fetchProductionSeries(filters, (await getSessionUser())?.id ?? 0);
    return NextResponse.json(
      { series },
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
    console.error("[production-series] read failed", { filters, error });
    return NextResponse.json(
      { error: "The production series could not be loaded." },
      { status: 502 },
    );
  }
}
