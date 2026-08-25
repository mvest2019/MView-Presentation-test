import { NextResponse } from "next/server";

import { runSearch } from "@/lib/claim-search/engine";

/**
 * GET /api/claim/search?name=&lease=&county= — the v90 ranked search
 * (statewide or county-scoped, name- or lease-anchored), capped at 500 rows.
 * Contract in `lib/claim-search/types.ts` (SearchResponse).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = {
    name: (url.searchParams.get("name") ?? "").trim().slice(0, 120),
    lease: (url.searchParams.get("lease") ?? "").trim().slice(0, 120),
    county: (url.searchParams.get("county") ?? "*").trim().slice(0, 60),
  };
  if (!q.name && !q.lease && q.county === "*") {
    return NextResponse.json(
      { error: "give a name, a lease, or a county" },
      { status: 400 },
    );
  }
  try {
    const owners = await runSearch(url.origin, q);
    return NextResponse.json({ owners });
  } catch {
    return NextResponse.json({ error: "search failed" }, { status: 503 });
  }
}
