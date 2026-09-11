/**
 * The signed-out half of the Find Your Record search — `/api/claim/{endpoint}`.
 *
 * WHY THIS EXISTS. The 🔒 "Free account" bars over the mailing address and the
 * appraised value were presentational only: the page called
 * `/api/v1/owners/search` straight from the browser and the 200 that painted
 * those bars carried `"6335 W NORTHWEST HWY APT 2014, DALLAS, TX 75225-3556"`
 * and `88313` for every one of the 11,471 owners in it. Anyone with devtools
 * open read the gated fields off the response that was gating them.
 *
 * This proxy withholds them instead of hiding them: `address`,
 * `appraisedValue` and the per-lease `leaseValues` are deleted server-side,
 * and only the remaining fields are sent to a visitor with no session. What
 * reaches the browser is what the browser is allowed to show.
 *
 * ONLY SIGNED-OUT TRAFFIC COMES THROUGH HERE. A member is entitled to those
 * fields, so `api.ts` keeps calling the backend directly for them and pays no
 * extra hop for a request that can take the better part of a minute.
 *
 * WHAT IT DOES NOT FIX. `/api/v1/owners/*` is public and CORS-open, so the
 * same data is still one `curl` away from anyone who knows the URL. Closing
 * that needs the backend to withhold the fields without a session — this only
 * makes sure THIS page is not the thing handing them out.
 */
import { NextResponse } from "next/server";

import { addressKey, matchToks } from "@/lib/claim-search/scoring";
import { getSessionUser } from "@/lib/session";

/** Never cached and never prerendered: the answer depends on the session. */
export const dynamic = "force-dynamic";
/**
 * The upstream search has been measured at 10–45s on the dev API. The default
 * function ceiling would abort a request that was going to answer.
 */
export const maxDuration = 60;

/**
 * Only the two list endpoints. `same-name` and the POSTs are not proxied.
 *
 * `addr` is OURS, not the backend's — `/owners/search` has no address
 * parameter. It is applied here, against the real addresses, and then those
 * addresses are deleted. Doing it in the browser instead would be asking a
 * signed-out visitor to filter on the one field they were just refused.
 */
const ALLOWED = {
  search: ["name", "lease", "county"],
  "lease-owners": ["county", "lease"],
} as const;

type Endpoint = keyof typeof ALLOWED;

const BASE =
  process.env.NEXT_PUBLIC_CLAIM_API_BASE_URL ||
  "https://mview-dev-api.mineralview.com";

/**
 * The fields a free account buys. Absent, not blanked — see the note above.
 *
 * `addressKey` goes in the address's place: the page identifies a record by
 * `county|name|address`, and without a stand-in two same-name records in one
 * county would become indistinguishable. It is a one-way token, not the
 * address; see `addressKey` for what it is and is not.
 */
function redact(owner: Record<string, unknown>): Record<string, unknown> {
  const { address, appraisedValue, leaseValues, ...rest } = owner;
  void appraisedValue;
  void leaseValues;
  return {
    ...rest,
    addressKey: addressKey(typeof address === "string" ? address : ""),
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ endpoint: string }> },
) {
  const { endpoint } = await ctx.params;
  if (!(endpoint in ALLOWED))
    return NextResponse.json({ error: "unknown endpoint" }, { status: 404 });

  const user = await getSessionUser();
  const params = new URLSearchParams();
  const incoming = new URL(req.url).searchParams;
  // Allowlisted, not forwarded wholesale: a caller must not be able to append
  // parameters of their own to an upstream call made from our server.
  for (const key of ALLOWED[endpoint as Endpoint]) {
    const v = incoming.get(key);
    if (v) params.set(key, v);
  }

  try {
    const upstream = await fetch(
      `${BASE}/api/v1/owners/${endpoint}?${params}`,
      { cache: "no-store" },
    );
    if (!upstream.ok)
      return NextResponse.json(
        { error: "upstream failed" },
        { status: upstream.status },
      );
    const data = (await upstream.json()) as {
      owners?: Record<string, unknown>[];
    };
    let owners = data.owners ?? [];
    // Before the redaction, while there is still an address to match on.
    const addr = incoming.get("addr");
    if (addr)
      owners = owners.filter((o) =>
        matchToks(addr, typeof o.address === "string" ? o.address : ""),
      );
    return NextResponse.json({
      owners: user ? owners : owners.map(redact),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "upstream failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
