import { NextResponse } from "next/server";

import {
  ALL_OPERATORS,
  getPresentationsPage,
} from "@/lib/operator-presentations-api";

/**
 * `GET /api/operators/presentations?operator=&from=&to=&page=` — one page of decks.
 *
 * A GET WRAPPING A POST. The upstream call is a POST, but this is a pure read, so a
 * GET is what makes it cacheable and what lets the browser and the CDN answer a
 * page the visitor has already seen. The upstream's method is an implementation
 * detail the client does not need.
 *
 * DATES ARE VALIDATED AS A PAIR, and this is the server half of that rule: the form
 * enforces it too, but a hand-made request must not be able to send half a range.
 * The endpoint would happily accept one date and quietly ignore it, which reads as
 * "my filter did nothing" — a 400 says what is wrong instead.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const operator = params.get("operator")?.trim() || ALL_OPERATORS;
  const from = params.get("from")?.trim() ?? "";
  const to = params.get("to")?.trim() ?? "";

  if ((from === "") !== (to === "")) {
    return NextResponse.json(
      { error: "Provide both dates, or neither." },
      { status: 400 },
    );
  }

  if (from !== "" && to !== "" && from > to) {
    // Both are `YYYY-MM-DD`, so a string compare is a date compare.
    return NextResponse.json(
      { error: "The From date must not be after the To date." },
      { status: 400 },
    );
  }

  const parsed = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  try {
    const result = await getPresentationsPage({
      operatorName: operator,
      startDate: from,
      endDate: to,
      page,
    });

    return NextResponse.json(result, {
      headers: {
        // Shared caches hold this; the browser revalidates, so a deploy that
        // changes the payload's shape is not replayed from a client cache.
        "Cache-Control":
          "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[presentations] read failed", {
      operator,
      from,
      to,
      page,
      error,
    });
    return NextResponse.json(
      { error: "Presentations could not be loaded." },
      { status: 502 },
    );
  }
}
