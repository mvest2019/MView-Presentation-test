import "server-only";

import { unstable_cache } from "next/cache";

/**
 * Client for the Mineral View operator API (`/api/v1/operators/*`).
 *
 * Shaped after `lib/blog-api.ts`, which is this project's established data-layer
 * pattern: a `server-only` module, the host read from one env var, `fetch` with
 * `cache: "no-store"` and caching applied by `unstable_cache` around the export,
 * and a throw rather than an empty array when the upstream call fails. Sits at
 * `lib/` root alongside `blog-api.ts` and the other `operator-*` modules, which
 * is where this repo keeps its data layer — not in a new `lib/api/` folder.
 *
 * WHY EVERY CALL IS SERVER-SIDE. The endpoints answer a browser `Origin` with no
 * `Access-Control-Allow-Origin` header (verified: the GET returns 200 and the
 * preflight 204, both without it), so a fetch from the client is blocked by CORS.
 * Server-side fetching sidesteps that without needing a proxy route.
 *
 * UPSTREAM IS INTERMITTENT. Measured over four cold calls: one connection
 * timeout, one Cloudflare 522 after 19.5s, and two 200s in about a second. So
 * every call here carries a hard timeout and callers are expected to degrade
 * rather than surface a failure — see `app/operators/page.tsx`.
 */

/** Long enough for a warm response, short enough not to stall a render. */
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Play types are reference data and change rarely, so this could sit much
 * higher. Ten minutes is deliberate: the page is prerendered, so a failed fetch
 * at build time bakes an empty dropdown into the HTML, and this bounds how long
 * that lasts before a revalidation retries.
 */
const REVALIDATE_SECONDS = 600;

function baseUrl(): string {
  const url = process.env.OPERATOR_API_BASE_URL;
  if (!url) {
    throw new Error(
      "OPERATOR_API_BASE_URL is not set. Point it at the operator API host (see next.config.ts).",
    );
  }
  return url.replace(/\/+$/, "");
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      headers: { Accept: "application/json" },
      // A hung origin must not hold a render open. `AbortSignal.timeout` rejects
      // with a TimeoutError, which the caller turns into a normal failure.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Caching is handled by `unstable_cache` around the exported readers, the
      // same division of labour as `blog-api.ts`.
      cache: "no-store",
    });
  } catch (cause) {
    // DNS failure, connection reset, or our own timeout. Rethrown with the path
    // attached so a server log says which endpoint died.
    throw new Error(`GET ${path} failed to reach the operator API`, { cause });
  }

  if (!response.ok) {
    throw new Error(
      `GET ${path} responded ${response.status} ${response.statusText}`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new Error(`GET ${path} returned a body that is not JSON`, { cause });
  }
}

/**
 * `GET /api/v1/operators/playtypes`.
 *
 * The live response, confirmed against the dev host rather than assumed:
 *
 *   { "playtypes": ["BARNETT SHALE", "EAGLE FORD SHALE", "GRANITE WASH",
 *                   "HAYNESVILLE/BOSSIER SHALE", "PERMIAN BASIN"] }
 *
 * A bare array of strings under one key — not `{ id, name }` objects, and not a
 * top-level array. Values arrive upper-cased.
 */
export interface OperatorPlayTypesResponse {
  playtypes: string[];
}

/**
 * Play type names for the directory's filter, in the order the API returns them.
 *
 * Throws if the API is unreachable, answers non-2xx, or sends something that is
 * not `{ playtypes: string[] }`. Callers decide how to degrade; nothing is
 * swallowed silently.
 */
export const getOperatorPlayTypes = unstable_cache(
  async (): Promise<string[]> => {
    const payload = await getJson<unknown>("/api/v1/operators/playtypes");

    if (
      !payload ||
      typeof payload !== "object" ||
      !("playtypes" in payload) ||
      !Array.isArray((payload as OperatorPlayTypesResponse).playtypes)
    ) {
      throw new Error(
        "GET /api/v1/operators/playtypes did not return { playtypes: string[] }",
      );
    }

    const names = (payload as OperatorPlayTypesResponse).playtypes
      // Defensive: one non-string or blank entry should not blank the filter.
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (names.length === 0) {
      console.warn(
        "[operator-api] /playtypes returned no usable play types — the filter " +
          "will show only its default option.",
      );
    }

    return names;
  },
  ["operator-play-types"],
  { revalidate: REVALIDATE_SECONDS, tags: ["operators"] },
);
