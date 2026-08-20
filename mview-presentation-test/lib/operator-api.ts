import "server-only";

import { unstable_cache } from "next/cache";

import {
  operatorLogoPath,
  OPERATOR_ENDPOINTS,
  type OperatorCountiesResponse,
  type OperatorPlayTypesResponse,
  type OperatorSearchRequest,
  type OperatorSearchResponse,
} from "./operator-api-types";

// Re-exported so callers have one import site for the operator API surface.
export * from "./operator-api-types";

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

/**
 * True for a cancellation, as opposed to a real failure.
 *
 * `fetch` rejects with a `DOMException` named `AbortError` when its signal fires,
 * and `AbortSignal.timeout` uses `TimeoutError`. A supersession is expected and
 * must never reach the user as an error; a timeout is a genuine fault.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function postJson<T>(
  path: string,
  payload: unknown,
  signal?: AbortSignal,
): Promise<T> {
  // The caller's signal cancels; the timeout is our own backstop against a hung
  // origin. `AbortSignal.any` fires on whichever comes first, so one does not
  // disable the other.
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: combined,
      // Results depend on the visitor's filters, so there is nothing to cache.
      cache: "no-store",
    });
  } catch (cause) {
    // A cancellation is rethrown untouched so callers can recognise it with
    // `isAbortError` instead of reporting it as a failed request.
    if (isAbortError(cause)) throw cause;
    throw new Error(`POST ${path} failed to reach the operator API`, { cause });
  }

  if (!response.ok) {
    throw new Error(
      `POST ${path} responded ${response.status} ${response.statusText}`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new Error(`POST ${path} returned a body that is not JSON`, { cause });
  }
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
 * `GET /api/v1/operators/playtypes`. Response shape and field notes live in
 * `operator-api-types.ts`.
 */

/**
 * Play type names for the directory's filter, in the order the API returns them.
 *
 * Throws if the API is unreachable, answers non-2xx, or sends something that is
 * not `{ playtypes: string[] }`. Callers decide how to degrade; nothing is
 * swallowed silently.
 */
export const getOperatorPlayTypes = unstable_cache(
  async (): Promise<string[]> => {
    const payload = await getJson<unknown>(OPERATOR_ENDPOINTS.playTypes);

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

/**
 * County names for the directory's filter and the county browse grid, in the
 * order the API returns them (alphabetical, upper case).
 *
 * Deliberately a near-copy of `getOperatorPlayTypes` rather than a shared
 * `{ key: string[] }` helper: the two are independent endpoints that happen to
 * agree on shape today, and folding them together would mean touching the working
 * play types reader. If a third list endpoint appears, that is the point to
 * factor all three.
 *
 * Throws if the API is unreachable, answers non-2xx, or sends something that is
 * not `{ counties: string[] }`. Callers decide how to degrade.
 */
export const getOperatorCounties = unstable_cache(
  async (): Promise<string[]> => {
    const payload = await getJson<unknown>(OPERATOR_ENDPOINTS.counties);

    if (
      !payload ||
      typeof payload !== "object" ||
      !("counties" in payload) ||
      !Array.isArray((payload as OperatorCountiesResponse).counties)
    ) {
      throw new Error(
        "GET /api/v1/operators/counties did not return { counties: string[] }",
      );
    }

    const names = (payload as OperatorCountiesResponse).counties
      // Defensive: one non-string or blank entry should not blank the filter.
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (names.length === 0) {
      console.warn(
        "[operator-api] /counties returned no usable counties — the filter will " +
          "show only its default option and the browse grid will be empty.",
      );
    }

    return names;
  },
  ["operator-counties"],
  { revalidate: REVALIDATE_SECONDS, tags: ["operators"] },
);

/* ==========================================================================
   POST /api/v1/operators/search
   ========================================================================== */

/**
 * `POST /api/v1/operators/search`.
 *
 * Live response shape, confirmed against the dev host:
 *   { "result": OperatorSearchRecord[], "total_count": 3095 }
 *
 * Throws on transport failure, non-2xx, non-JSON, or a body missing `result` /
 * `total_count`. Cancellation is rethrown as-is so callers can tell a supersession
 * from a fault with `isAbortError`.
 */
export async function searchOperators(
  request: OperatorSearchRequest,
  signal?: AbortSignal,
): Promise<OperatorSearchResponse> {
  const payload = await postJson<unknown>(
    OPERATOR_ENDPOINTS.search,
    request,
    signal,
  );

  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as OperatorSearchResponse).result) ||
    typeof (payload as OperatorSearchResponse).total_count !== "number"
  ) {
    throw new Error(
      "POST /api/v1/operators/search did not return { result: [], total_count: number }",
    );
  }

  return payload as OperatorSearchResponse;
}

/**
 * Fetch an operator's logo bytes from the API.
 *
 * WHY THIS GOES THROUGH OUR SERVER AT ALL. The upstream logo response carries
 * `Cross-Origin-Resource-Policy: same-origin`, which tells a browser the resource
 * may only be embedded by a page on the API's own origin. Our pages are on a
 * different origin, so an `<img src>` pointing straight at it is fetched and then
 * *refused* — `onerror` fires even though the bytes arrived intact. Measured:
 * `fetch(url, { mode: "cors" })` returns 200 and a valid 512×512 PNG, while
 * `mode: "no-cors"` — the mode an `<img>` uses — throws. CORP is not CORS: the
 * endpoint does send `Access-Control-Allow-Origin: *`, which is why the JSON
 * endpoints work from the browser and this one cannot.
 *
 * Reading it server-side and re-serving it from our own origin makes the embed
 * same-origin, so CORP is satisfied.
 *
 * DELETE THIS WHEN THE HEADER IS FIXED. The clean fix is one line upstream —
 * `Cross-Origin-Resource-Policy: cross-origin` on the logo route (these headers are
 * Helmet's defaults, and this asset is public). Once that ships, the row can carry
 * `operator_logo` verbatim and this function and its route handler both go away.
 *
 * Returns the raw response so the handler can pass the status, content type and
 * validator headers through rather than re-deriving them.
 */
export async function fetchOperatorLogo(
  operatorNumber: string,
  signal?: AbortSignal,
): Promise<Response> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  return fetch(`${baseUrl()}/api/v1/operators/${operatorNumber}/logo`, {
    signal: combined,
    // The upstream sends `max-age=86400` and an etag; letting Next cache the
    // response means repeat views of the same page cost no upstream request.
    next: { revalidate: REVALIDATE_SECONDS, tags: ["operators"] },
  });
}

/* ==========================================================================
   GET /api/v1/operators/names
   ========================================================================== */

/** One operator's two spellings, and where to find its logo. */
export interface OperatorName {
  /** The regulator's filed name, upper case: `PIONEER NATURAL RES. USA, INC.` */
  filed: string;
  /** The display spelling: `Pioneer Natural RES USA, Inc`. */
  cleaned: string;
  /**
   * Both spellings and the operator number, lower-cased, so one pass matches a
   * search on any of them. The number is included because operators are looked up
   * by RRC number as often as by name, and a searcher who types 665748 means
   * exactly one operator.
   */
  haystack: string;
  /**
   * The operator's number, parsed out of the logo URL — the only place this
   * endpoint reveals one. Null when the URL is missing or shaped differently.
   */
  operatorNumber: string | null;
  /**
   * Same-origin logo path, or null when the record carries no usable URL.
   *
   * OUR PATH, NOT THE API'S. The endpoint reports an absolute URL on the API host,
   * and that response is served `cross-origin-resource-policy: same-origin` — so an
   * `<img>` pointed straight at it downloads a valid PNG and is then refused by the
   * browser. `operatorLogoPath` re-points it at the route that re-serves the bytes.
   *
   * It also happens to be the only place this endpoint reveals an operator NUMBER,
   * which is embedded in the URL.
   */
  logoPath: string | null;
}

/** `https://…/api/v1/operators/953595/logo` → `953595`. Null if the shape differs. */
function operatorNumberFromLogo(url: unknown): string | null {
  if (typeof url !== "string") return null;
  return /\/operators\/([^/]+)\/logo/.exec(url)?.[1] ?? null;
}

/**
 * Every operator name, cached.
 *
 * IT IS BIG AND THAT IS THE WHOLE REASON THIS IS A SERVER READER: 24,742 records,
 * 2.10 MB of JSON, 342 KB gzipped. Sending it to the browser to populate a
 * combobox would cost more transfer than the rest of the page and would land on
 * the main thread as a 24,742-element parse. Held here instead, one process-wide
 * copy behind `unstable_cache`, and queried through `/api/operators/names`.
 *
 * A blank or malformed record is dropped rather than allowed to render an empty
 * row in the picker. Throws if the endpoint is unreachable or sends the wrong
 * shape; the route handler degrades instead of failing the page.
 */
/**
 * IN-PROCESS MEMO, NOT `unstable_cache`, AND THAT IS DELIBERATE.
 *
 * Next's data cache refuses any entry over 2 MB. This list is 24,742 records — 4.11
 * MB of JSON, and 5.35 MB once parsed and indexed — so `unstable_cache` silently
 * declined to store it and logged `items over 2MB can not be cached`. The effect was
 * the opposite of caching: every reader re-downloaded and re-parsed the whole
 * directory.
 *
 * A module-level memo has no size ceiling. It is per server instance rather than
 * shared, and it is lost on a cold start, which is a real limitation — but "warm per
 * instance" beats "never cached", and the alternative of trimming the payload under
 * 2 MB would mean dropping the search index the picker needs.
 *
 * The TTL matches the revalidate the other readers use, so the directory goes stale
 * at the same rate as everything else here.
 */
let namesMemo: { at: number; value: OperatorName[] } | null = null;
let namesInFlight: Promise<OperatorName[]> | null = null;

async function readOperatorNames(): Promise<OperatorName[]> {
  return await (async (): Promise<OperatorName[]> => {
    const payload = await getJson<unknown>(OPERATOR_ENDPOINTS.names);

    const rows = (payload as { data?: unknown })?.data;
    if (!Array.isArray(rows)) {
      throw new Error(
        "GET /api/v1/operators/names did not return { data: [] }",
      );
    }

    const names: OperatorName[] = [];
    for (const entry of rows) {
      const record = entry as Record<string, unknown>;
      const filed =
        typeof record.operator_name === "string"
          ? record.operator_name.trim()
          : "";
      const cleaned =
        typeof record.cleaned_operator_name === "string"
          ? record.cleaned_operator_name.trim()
          : "";
      // Either spelling alone is enough to offer the operator; both blank is not.
      if (filed === "" && cleaned === "") continue;

      const operatorNumber = operatorNumberFromLogo(record.operator_logo);

      names.push({
        filed: filed || cleaned,
        cleaned: cleaned || filed,
        operatorNumber,
        haystack: `${cleaned} ${filed} ${operatorNumber ?? ""}`
          .trim()
          .toLowerCase(),
        logoPath: operatorNumber ? operatorLogoPath(operatorNumber) : null,
      });
    }

    return names;
  })();
}

export async function getOperatorNames(): Promise<OperatorName[]> {
  const fresh =
    namesMemo && Date.now() - namesMemo.at < REVALIDATE_SECONDS * 1000;
  if (fresh && namesMemo) return namesMemo.value;

  // One read at a time: without this, four pickers opening at once would each start
  // their own 4.11 MB download before the first finished.
  namesInFlight ??= readOperatorNames()
    .then((value) => {
      namesMemo = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      namesInFlight = null;
    });

  try {
    return await namesInFlight;
  } catch (error) {
    // Serve a stale copy rather than nothing when a refresh fails.
    if (namesMemo) return namesMemo.value;
    throw error;
  }
}

/**
 * Tokens that stay upper case when a name has to be title-cased by hand.
 *
 * Acronyms and legal suffixes: "BP PLC" must not become "Bp Plc", and "OXY USA
 * INC." reads correctly as "OXY USA Inc." rather than "Oxy Usa Inc.".
 */
const KEEP_UPPER = new Set([
  "APA",
  "BP",
  "CMS",
  "EQT",
  "EP",
  "E&P",
  "GP",
  "LLC",
  "LLP",
  "LP",
  "LTD",
  "NGL",
  "OXY",
  "PLC",
  "SE",
  "SM",
  "USA",
  "XTO",
  "II",
  "III",
  "IV",
]);

/**
 * A shouty filed name, made readable — the LAST resort, not the first.
 *
 * Only reached when the directory has no entry for the operator at all, which is the
 * case for the public issuers here: BP, Chevron, CMS Energy, Dominion. Word by word,
 * anything in `KEEP_UPPER` stays as it is and everything else is title-cased, so
 * "CMS ENERGY" becomes "CMS Energy" rather than "Cms Energy".
 *
 * It is a heuristic and it is imperfect — "EXXONMOBIL" comes out "Exxonmobil" — which
 * is exactly why the directory's own spelling is preferred wherever one exists.
 */
function titleCaseFiled(filed: string): string {
  return filed
    .toLowerCase()
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token) || token === "") return token;
      const bare = token.replace(/[^A-Za-z&]/g, "").toUpperCase();
      if (KEEP_UPPER.has(bare)) return token.toUpperCase();
      return token.replace(/^[a-z]/, (c) => c.toUpperCase());
    })
    .join("");
}

/**
 * Do two spellings plausibly name the same company?
 *
 * Compares the leading alphabetic word, which is the part a company is known by. It
 * exists only to reject a number match that points at a different company — see the
 * duplicated operator number in `casedNameLookup`.
 */
function sameCompany(a: string, b: string): boolean {
  const lead = (value: string) =>
    (value.toLowerCase().match(/[a-z]+/) ?? [""])[0].slice(0, 6);
  const first = lead(a);
  return first !== "" && first === lead(b);
}

/**
 * Filed spelling → cased spelling, from the directory that is already cached.
 *
 * BY NUMBER FIRST, THEN BY NAME. The operator number is the reliable key: several of
 * these filed names do not match the directory's spelling of the same company, and
 * matching on the name alone left a third of the list SHOUTING beside properly cased
 * neighbours. Where neither key hits — a public issuer with no Texas registration —
 * the name is title-cased locally.
 *
 * A failure must not fail the page, so the fallback chain ends at something readable
 * rather than at an exception.
 */
export async function getCasedNameLookup(): Promise<
  (filed: string, operatorNumber?: string | null) => string
> {
  try {
    const directory = await getOperatorNames();
    const byNumber = new Map<string, string>();
    const byFiled = new Map<string, string>();

    for (const entry of directory) {
      if (entry.operatorNumber)
        byNumber.set(entry.operatorNumber, entry.cleaned);
      byFiled.set(entry.filed.toUpperCase(), entry.cleaned);
    }

    return (filed: string, operatorNumber?: string | null) => {
      /* The filed name first: it is an exact key and cannot collide. */
      const byName = byFiled.get(filed.toUpperCase());
      if (byName) return byName;

      /* Then the number — but only when it names the same company. Operator numbers
         are NOT unique in this response: "MURPHY OIL CORPORATION" and
         "FREEPORTMCMORAN OIL & GAS LLC" both arrive as 285230, and trusting that
         blindly relabelled Murphy as Freeport and dropped Murphy from the filter
         entirely. Comparing the leading word catches exactly that. */
      if (operatorNumber) {
        const byNo = byNumber.get(operatorNumber);
        if (byNo && sameCompany(filed, byNo)) return byNo;
      }

      return titleCaseFiled(filed);
    };
  } catch (error) {
    console.error("[presentations] name casing unavailable", error);
    return (filed: string) => titleCaseFiled(filed);
  }
}
