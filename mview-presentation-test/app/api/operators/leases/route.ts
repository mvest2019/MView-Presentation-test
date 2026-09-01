import { NextResponse } from "next/server";

import { MASKED, publicOperatorApiBaseUrl } from "@/lib/operator-api-types";
import { getSessionUser } from "@/lib/session";

/**
 * `POST /api/operators/leases` — the lease book, oil and gas gated.
 *
 * THE SAME GATE AS THE COUNTY TABLE, AND FOR THE SAME REASON. This read also went
 * straight from the browser to `POST /api/v1/operators/leases`, which withholds
 * nothing, so the lease book handed a signed-out reader a per-lease `Oil Produced`
 * and `Gas Produced` for every lease on record — 7,676,866 bbl and 81,255,034 Mcf on
 * Apache's first row alone. Those are the two quantities the directory masks, the
 * profile's panel masks, and the county table masks: leaving the finest-grained copy
 * of them open would have made all three ornamental.
 *
 * THE FIELD NAMES ARE THE DIRECTORY'S OWN — `Total_Production_Oil` and
 * `Total_Production_Gas`, exactly what `withoutGatedColumns` replaces in
 * `app/api/operators/search/route.ts`. Same fields, same sentinel, same server-side
 * replacement before serialisation.
 *
 * WHAT STAYS OPEN. Lease name, lease number, county, district and status: the lease
 * book remains free to browse, which is what the "Well records need a free account"
 * notice inside it already promises. Only the two volumes are withheld.
 *
 * THE BODY IS FORWARDED AS RECEIVED. The client builds the complete payload —
 * paging, `lease_number`, `county` — and this handler changes none of it; it is a
 * forwarder and a mask, not a second place where the contract is written. (Note the
 * payload still carries `TEMP_MEMBER_ID` from the client. This endpoint ignores
 * `member_id` — measured — so it changes nothing here, and removing that stand-in is
 * the separate cleanup OPERATORS.md §10 rule 4 tracks.)
 */

const REQUEST_TIMEOUT_MS = 15000;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const operatorNumber =
    typeof body.operator_no === "string" ? body.operator_no : "";
  if (!/^\d{1,7}$/.test(operatorNumber)) {
    return NextResponse.json(
      { error: "operator_no must be digits" },
      { status: 400 },
    );
  }

  const user = await getSessionUser();

  let upstream: Response;
  try {
    upstream = await fetch(
      `${publicOperatorApiBaseUrl()}/api/v1/operators/leases`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        // Depends on who is asking, so it is never cached at any layer.
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("[leases] fetch failed", { operatorNumber, error });
    return NextResponse.json(
      { error: "The lease book is unavailable" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    console.error("[leases] upstream responded", {
      operatorNumber,
      status: upstream.status,
    });
    /* The status is passed through rather than flattened, so the table's own error
       copy can tell a rate limit from an outage — the distinction defect 155 was
       about. */
    return NextResponse.json(
      { error: "The lease book is unavailable" },
      { status: upstream.status === 429 ? 429 : 502 },
    );
  }

  const payload = (await upstream.json()) as { operator_leases?: unknown };
  const leases = Array.isArray(payload.operator_leases)
    ? payload.operator_leases
    : [];

  /* `locked` travels on the response either way — the rows are all still here, so
     unlike the wells feed there is no absence the page could read the gate off
     (§4 rule 2). */
  const result = user
    ? { ...payload, operator_leases: leases, locked: false }
    : {
        ...payload,
        operator_leases: leases.map((entry) => {
          const record = entry as Record<string, unknown>;
          /* Replaced outright, not rewritten: unlike the county volumes these carry
             no `(UNIT)` suffix the table needs to keep. `toVolume` in
             `operator-leases-api.ts` fails the numeric test on `"****"` and yields
             null, so a mask that somehow reached the cell would read as an em dash
             rather than as a zero — §4 rule 3's failure mode, closed twice over. */
          return {
            ...record,
            Total_Production_Oil: MASKED,
            Total_Production_Gas: MASKED,
          };
        }),
        locked: true,
      };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
