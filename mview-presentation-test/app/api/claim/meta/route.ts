import { NextResponse } from "next/server";

import { getMeta } from "@/lib/claim-search/engine";

/**
 * GET /api/claim/meta — hero stats and the county dropdown for the Find Your
 * Record page. Contract in `lib/claim-search/types.ts` (ClaimMeta); the
 * backend team's implementation replaces this handler wholesale.
 */
export async function GET(request: Request) {
  try {
    const meta = await getMeta(new URL(request.url).origin);
    return NextResponse.json(meta, {
      // Content-stable between index builds; let clients cache briefly.
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "index unavailable" }, { status: 503 });
  }
}
