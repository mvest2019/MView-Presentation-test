/**
 * The whole payload for one owner — `/api/portfolio`.
 *
 * THE URL IS THE REFERENCE'S, verbatim, and that is the point: the ported
 * `Chrome`/`Portal` fetch this path when the owner picker loads a record, and
 * keeping the path identical is what lets those two files stay copies of the
 * reference's rather than forks of it. Nothing else in this app serves
 * `/api/portfolio`, so there is no collision.
 *
 * It reads the data seam (`_lib/reference/owner-data`), so when the fixture is
 * replaced by a backend this handler does not change either.
 */
import { NextResponse } from "next/server";

import {
  getOwnerPayload,
  selectionFrom,
} from "@/app/mineralownersite/_lib/reference/owner-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const payload = await getOwnerPayload(selectionFrom(new URL(req.url)));
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "build failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
