import { NextResponse } from "next/server";

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
    const series = await fetchProductionSeries(filters);
    return NextResponse.json(
      { series },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
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
