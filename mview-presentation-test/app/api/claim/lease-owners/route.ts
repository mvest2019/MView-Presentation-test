import { NextResponse } from "next/server";

import { getLeaseOwners } from "@/lib/claim-search/engine";

/**
 * GET /api/claim/lease-owners?county=&lease= — a lease's full membership from
 * its county roll. `lease` is the DESPACED lease name (A–Z0–9 only): exact
 * membership, never fuzzy. Contract in `lib/claim-search/types.ts`
 * (LeaseOwnersResponse).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const county = (url.searchParams.get("county") ?? "").trim().slice(0, 60);
  const lease = (url.searchParams.get("lease") ?? "").trim().slice(0, 200);
  if (!county || !lease) {
    return NextResponse.json({ error: "county and lease required" }, { status: 400 });
  }
  try {
    const owners = await getLeaseOwners(url.origin, county, lease);
    return NextResponse.json({ owners });
  } catch {
    return NextResponse.json({ error: "lookup failed" }, { status: 503 });
  }
}
