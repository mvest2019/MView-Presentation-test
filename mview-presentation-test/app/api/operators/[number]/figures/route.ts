import { NextResponse } from "next/server";

import { oilShareOfBoe } from "@/lib/operator-detail";
import { fetchOperatorDetails } from "@/lib/operator-details-api";
import type { OperatorGatedFigures } from "@/lib/operator-gated-figures";
import { getSessionUser } from "@/lib/session";

/**
 * `GET /api/operators/<number>/figures` — the five gated profile figures.
 *
 * WHY A HANDLER AND NOT THE PAGE. `/operators/[slug]` is statically prerendered
 * (`generateStaticParams`, thirty slugs), and one `cookies()` read in that server
 * component opts the whole route out of static rendering — thirty prerendered pages
 * traded for a per-request render on every visit. That is the trade OPERATORS.md §2
 * refuses, and it is why the profile's two existing gates ("What changed", "Recent
 * wells & permits") also live in handlers. This is the third, and it is the same
 * shape as both.
 *
 * THE PAGE THEREFORE SHIPS NO FIGURE AT ALL. The prerendered HTML is one document
 * served to members and visitors alike, so a value baked into it is a value
 * everybody gets. These five are rendered by `GatedFigures` from this response
 * instead — which is also what makes the lock real rather than CSS over delivered
 * data (§4).
 *
 * WHY IT IS CHEAP. `fetchOperatorDetails` is tagged and revalidated, and the page
 * above has already read the same operator through it in the same window, so the
 * member's call is a data-cache hit rather than a second upstream round trip. The
 * response is 3.8 KB, well inside the 2 MB the data cache accepts (§5 records what
 * happens above it). For a signed-out reader the gate returns first and there is no
 * upstream call at all — the gate removes work rather than adding it, exactly as its
 * two siblings do.
 *
 * ONE REQUEST PER PAGE VIEW, NOT FIVE. Every slot on the profile reads one shared
 * fetch through context; see `gated-figures.tsx`.
 *
 * GET, NOT POST. The whole request is the operator number in the path — there is no
 * body to send, and the two other `[number]` handlers (`logo`, `what-changed`) are
 * GETs for the same reason.
 */

/** The operator number is at most 7 digits — anything else is not worth a round trip. */
const OPERATOR_NUMBER = /^\d{1,7}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;

  if (!OPERATOR_NUMBER.test(number)) {
    return NextResponse.json(
      { error: "operator number must be digits" },
      { status: 400 },
    );
  }

  /*
   * The gate, before any work. `locked` is a normal answer and a 200 — not an HTTP
   * error — because a visitor with no account is an expected reader, not a fault;
   * collapsing it into `response.ok === false` would put it in the same bucket as an
   * outage, which is the mistake §4 rule 2 is about.
   *
   * `no-store` because the answer depends on who is asking. `Vary: Cookie` is the
   * trap here (§5): every visitor carries a unique `guestUserID`, so it would cache
   * per visitor rather than per state, and a shared cache holding one reader's
   * `locked` and serving it to a member is how a gate like this breaks.
   */
  if (!(await getSessionUser())) {
    return NextResponse.json({ locked: true } satisfies OperatorGatedFigures, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const response = await fetchOperatorDetails(number);
  const record = response?.operator_details[0];

  /*
   * NULLS, NOT A FALLBACK. The page used to print the fixture's lifetime totals when
   * the endpoint sent none, and those totals are real for the thirty fixture
   * operators — so passing them through here would hand a signed-out reader the very
   * figure the lock withholds, from the fixture instead of the API. Nulls render as
   * an em dash, which is what the page already does for a field the record does not
   * carry (defect 137). `fetchOperatorDetails` logs its own failures.
   */
  const figures: OperatorGatedFigures = {
    locked: false,
    oilProduced: record?.Totaloilproduction || null,
    gasProduced: record?.Totalgasproduction || null,
    // Derived from the same three volumes the panel prints, so it cannot disagree
    // with them — the same call `mergeOperatorDetails` makes.
    oilPct: oilShareOfBoe(
      record?.Totaloilproduction || null,
      record?.Totalgasproduction || null,
      record?.TotalBOEproduction || null,
    ),
    leases: record?.leaseCount ?? null,
    counties: record?.counties?.length ?? null,
  };

  return NextResponse.json(figures, {
    headers: { "Cache-Control": "no-store" },
  });
}
