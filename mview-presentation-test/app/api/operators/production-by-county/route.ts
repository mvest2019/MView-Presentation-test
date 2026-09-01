import { NextResponse } from "next/server";

import { MASKED, publicOperatorApiBaseUrl } from "@/lib/operator-api-types";
import { getSessionUser } from "@/lib/session";

/**
 * `POST /api/operators/production-by-county` — per-county volumes, oil and gas gated.
 *
 * WHY THIS HANDLER HAD TO EXIST BEFORE THE LOCK COULD. Until now this read went
 * straight from the browser to `POST /api/v1/operators/production-by-county`: the
 * endpoint sends `access-control-allow-origin: *`, takes no `member_id` and withholds
 * nothing — measured, 123 counties and 20,814 bytes for operator 027200, every
 * `total_production_oil` and `total_production_gas` in full. So drawing a blurred bar
 * over those cells would have left the real figures sitting in the reader's own
 * network tab, one devtools panel away from the lock. OPERATORS.md §4 is explicit
 * that this is worse than no gate: "a soft gate that a right-click defeats teaches
 * visitors the locks mean nothing."
 *
 * The values are therefore replaced HERE, on the server, before the response is
 * serialised — the same thing `app/api/operators/search/route.ts` does for the
 * directory's four columns, and the reason that gate is real.
 *
 * IT CLOSES A SECOND HOLE AT THE SAME TIME. The profile's "Oil Produced" and "Gas
 * Produced" panel rows are gated, but this table is the same quantity broken out by
 * county — summing 123 rows reconstructs both lifetime totals exactly. Gating the
 * panel while serving the addends is not a gate.
 *
 * WHAT IS NOT GATED. `county`, `county_share_of_operator` and
 * `total_production_boe`. BOE stays real wherever it appears — the directory does not
 * gate it and the production map keeps it (§4) — and the share is a percentage of a
 * total the reader does not have, so it discloses no volume.
 *
 * THE UNIT SURVIVES THE MASK, deliberately: `"44.652 (MMBBL)"` becomes
 * `"**** (MMBBL)"`, not `"****"`. The table reads its column headers off the first
 * row's unit, and `county-production.tsx` records that the hardcoded fallbacks
 * (bbl/Mcf) are a thousand times off for this endpoint — so dropping the unit would
 * mislabel the columns for every signed-out reader.
 */

const REQUEST_TIMEOUT_MS = 15000;

/**
 * `"44.652 (MMBBL)"` -> `"**** (MMBBL)"`; a bare number -> `"****"`.
 *
 * Only the magnitude is removed. Anything that is not a string is replaced outright
 * rather than passed through, so a shape this has not seen cannot leak a figure.
 */
function maskVolume(value: unknown): string {
  if (typeof value !== "string") return MASKED;
  const unit = /\(([^)]*)\)\s*$/.exec(value);
  return unit ? `${MASKED} (${unit[1]})` : MASKED;
}

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
      `${publicOperatorApiBaseUrl()}/api/v1/operators/production-by-county`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // The payload is unchanged: this handler is a forwarder and a mask, not a
        // place where the upstream contract is rewritten.
        body: JSON.stringify({ operator_no: operatorNumber }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        // Depends on who is asking, so it is never cached at any layer.
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("[production-by-county] fetch failed", {
      operatorNumber,
      error,
    });
    return NextResponse.json(
      { error: "County production is unavailable" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    console.error("[production-by-county] upstream responded", {
      operatorNumber,
      status: upstream.status,
    });
    return NextResponse.json(
      { error: "County production is unavailable" },
      { status: 502 },
    );
  }

  const payload = (await upstream.json()) as { counties?: unknown };
  const counties = Array.isArray(payload.counties) ? payload.counties : [];

  /* A member gets the response as it arrived. `locked` travels either way, because
     §4 rule 2 is that the page must never infer the gate from a value — inferring it
     is what made a parse bug and a sign-in gate look identical. */
  const result = user
    ? { ...payload, counties, locked: false }
    : {
        ...payload,
        counties: counties.map((entry) => {
          const record = entry as Record<string, unknown>;
          return {
            ...record,
            total_production_oil: maskVolume(record.total_production_oil),
            total_production_gas: maskVolume(record.total_production_gas),
          };
        }),
        locked: true,
      };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
