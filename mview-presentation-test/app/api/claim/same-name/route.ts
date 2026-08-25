import { NextResponse } from "next/server";

import { getSameName } from "@/lib/claim-search/engine";

/**
 * GET /api/claim/same-name?county=&name=&address= — records in `county`
 * sharing the despaced `name` at addresses other than `address`, for the
 * "Is this you?" popup. Contract in `lib/claim-search/types.ts`
 * (SameNameResponse).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const county = (url.searchParams.get("county") ?? "").trim().slice(0, 60);
  const name = (url.searchParams.get("name") ?? "").trim().slice(0, 200);
  const address = (url.searchParams.get("address") ?? "").trim().slice(0, 300);
  if (!county || !name) {
    return NextResponse.json({ error: "county and name required" }, { status: 400 });
  }
  try {
    const items = await getSameName(url.origin, county, name, address);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "lookup failed" }, { status: 503 });
  }
}
