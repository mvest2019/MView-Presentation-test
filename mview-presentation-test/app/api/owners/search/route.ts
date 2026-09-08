/**
 * Owner search over the appraisal roll — `/api/owners/search`.
 *
 * The reference's own path and response shape, because the ported owner picker
 * in `Chrome.tsx` reads `results`, `count`, `year`, `widened_to_prefix` and
 * `note` by those names and renders the notes as sentences. The matching rule
 * and every string live in the data seam beside the record they search.
 */
import { NextResponse } from "next/server";

import { searchOwners } from "@/app/mineralownersite/_lib/reference/owner-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Number(url.searchParams.get("limit") ?? 25);

  try {
    return NextResponse.json(await searchOwners(q, limit));
  } catch (e) {
    return NextResponse.json(
      {
        error: "search failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
