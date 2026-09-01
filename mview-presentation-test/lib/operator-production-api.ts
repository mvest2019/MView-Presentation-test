import "server-only";

import { getCasedNameLookup, getOperatorNames } from "./operator-api";
import {
  operatorLogoPath,
  publicOperatorApiBaseUrl,
} from "./operator-api-types";
import { monogramOf } from "./operator-statistics";
import type {
  ProductionFilters,
  ProductionIdentity,
  ProductionInfo,
  ProductionLeader,
  ProductionLeaders,
  ProductionOperator,
  ProductionPoint,
  ProductionSeries,
  ProductionSeriesOperator,
} from "./operator-production-shape";

/**
 * Compare Operator Production — the two upstream reads, and the mapping.
 *
 * `server-only`, and reached through this app's own route handlers, so the browser
 * never learns the upstream host and the option lists it needs are already cached
 * here rather than re-fetched per visitor.
 *
 * TWO ENDPOINTS, ONE PAYLOAD, DIFFERENT ANSWERS:
 *
 *   POST /compare-operators-production_info   the operators, their figures, and
 *                                             the four "who leads" tiles.
 *   POST /compare-operators-production        the annual series for the chart.
 *
 * WHAT WAS ESTABLISHED BY PROBING, because none of it is inferable from the shape:
 *
 *  · `duration` IS IGNORED BY THE INFO ENDPOINT. Asking for 2024 alone returns
 *    byte-identical totals to 2015–2024. Its volumes are the operator's whole
 *    filed record, so the page must not label them as a windowed figure. The
 *    series endpoint does honour it.
 *  · `county` IS honoured by both — dropping it took Pioneer from 1.09B to 1.77B
 *    barrels and `county_count` from 2 to 23.
 *  · `district_code` and `playtype` are honoured but nearly redundant once a
 *    county filter is set: dropping both moved the total by 0.004%.
 *  · UNITS. THIS CHANGED, and the old note is kept here because the change is the
 *    whole of defect 161. It USED to read: the info endpoint answers raw barrels and
 *    Mcf, the series answers thousands, and the series sums to 1/1000th of the info
 *    total. Re-measured for EOG (253162): the info endpoint now answers unit-suffixed
 *    STRINGS — `"1,476,959.213 (MBBL)"` — and its totals are EXACTLY the sum of the
 *    series' annual values, ratio 1.0000 for oil and for gas. Same scale, not a
 *    thousandth. The info endpoint's volumes are therefore read through
 *    `volumeInMillions`, which takes the magnitude from the unit the response
 *    declares; the series still sends bare numbers in thousands and is unchanged.
 *    Both end up in millions, so nothing downstream knows which came from where.
 *  · `dataType` ONLY RECOGNISES `"county"`. Every other value — `operator`,
 *    `district`, `playtype`, or anything unknown — falls through to grouping by
 *    operator and reports `type: "operator"`. The chart draws a line per operator,
 *    so that is what it asks for.
 *  · THE SERIES OMITS YEARS AN OPERATOR DID NOT REPORT IN, so two operators can
 *    return different year lists. They are aligned to a shared axis below.
 *  · `operator_Name` IS SPELLED WITH A CAPITAL N in the series response and
 *    `operator_name` in the info response. Both are read.
 */

/** How long this app waits on one upstream read. */
const REQUEST_TIMEOUT_MS = 45_000;

/** Raw barrels/Mcf to millions. The fallback when a volume declares no unit. */
const RAW_TO_MILLIONS = 1_000_000;

/** The series endpoint's thousands to millions. */
const THOUSANDS_TO_MILLIONS = 1_000;

/**
 * How many of a declared unit make one million of the unit this page prints —
 * DEFECT 161, "in result show oil produced and gas produced values 0".
 *
 * WHAT WAS ACTUALLY WRONG. The info endpoint used to answer bare numbers in raw
 * barrels and Mcf. It now answers unit-suffixed strings:
 * `"1,476,959.213 (MBBL)"`. `num()` strips commas and calls `Number()`, and
 * `Number("1,476,959.213 (MBBL)")` is `NaN`, which falls through to 0 — so every
 * volume on the page read "0.0M", for a signed-in member as much as a visitor. The
 * cards, the two leader tiles and every `top_producing_counties` figure were all the
 * same failure.
 *
 * THE MAGNITUDE MOVED AT THE SAME TIME, which is the part that would have been missed
 * by only stripping the suffix. Measured against the dev host for EOG (253162): the
 * info endpoint reports `1,476,959.213 (MBBL)` and the SERIES endpoint's 29 annual
 * `oil` values sum to `1476959.213` — exactly equal, ratio 1.0000, gas likewise. The
 * two used to differ by a factor of a thousand (this file's own note recorded the info
 * endpoint as raw barrels and the series as thousands). So `RAW_TO_MILLIONS` on these
 * fields is now a thousandfold overstatement, and fixing only the parse would have
 * turned "0.0M" into a number that is confidently wrong — the worse of the two
 * failures, because nothing on screen would look broken.
 *
 * SO THE UNIT IS READ, NOT ASSUMED. OPERATORS.md §6 warns that the magnitude changed
 * on one of these endpoints and not the other, and that a fix for one must not be
 * copied to the other. Reading the unit the response declares is the version of that
 * warning that cannot go stale: if the endpoint rescales again, this follows it.
 *
 * Oil and BOE are printed in millions of barrels, gas in millions of Mcf, which is
 * what the M suffix on this page has always meant.
 */
const MILLIONS_PER_UNIT: Readonly<Record<string, number>> = {
  // Oil and BOE, printed as millions of barrels.
  BBL: 1_000_000,
  MBBL: 1_000,
  MMBBL: 1,
  // Gas, printed as millions of Mcf. Mcf is a thousand cubic feet, MMcf a million
  // and Bcf a billion — so a Bcf IS a million Mcf, and needs no scaling at all.
  MCF: 1_000_000,
  MMCF: 1_000,
  BCF: 1,
};

/**
 * `"1,476,959.213 (MBBL)"` → 1476.959213 (millions of barrels).
 *
 * A bare number, or one whose unit this does not recognise, keeps the endpoint's
 * historical contract of raw barrels and Mcf rather than being dropped — an
 * unrecognised unit is a reason to log, not a reason to blank the page.
 */
function volumeInMillions(raw: unknown): number {
  /* The number and the unit are split HERE rather than by widening `num()`. `num()`
     is shared with the series endpoint, which sends bare numbers and needs no unit
     handling — and OPERATORS.md §6's standing warning is precisely that a change
     made for one of these two endpoints must not be applied to the other. */
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw / RAW_TO_MILLIONS : 0;
  }
  if (typeof raw !== "string") return 0;

  const match = /^\s*([^()]*?)\s*(?:\(([^)]*)\))?\s*$/.exec(raw);
  const value = num(match?.[1] ?? raw);
  if (value === 0) return 0;

  const unit = (match?.[2] ?? "").trim().toUpperCase();
  if (unit === "") return value / RAW_TO_MILLIONS;

  const divisor = MILLIONS_PER_UNIT[unit];
  if (divisor === undefined) {
    console.error("[compare-production] unrecognised volume unit", { raw });
    return value / RAW_TO_MILLIONS;
  }
  return value / divisor;
}

/**
 * What the chart asks to be grouped by.
 *
 * `"operator"` is not a value the endpoint knows — it recognises only `"county"`
 * and treats everything else as "group by operator", which is what a line-per-
 * operator chart needs. Naming it for what it produces rather than passing a
 * deliberately wrong literal keeps the intent legible; switching this to
 * `"county"` is the whole change needed to group the chart by county instead.
 */
const SERIES_GROUPING = "operator";

/** What the info endpoint is asked for. It ignores this, but the field is required. */
const INFO_GROUPING = "county";

/** Returned when no selected name resolves to a filed one. */
const EMPTY_INFO: ProductionInfo = {
  operators: [],
  leaders: {
    highestOil: null,
    highestGas: null,
    mostEfficient: null,
    widestFootprint: null,
  },
  totalOperators: 0,
  locked: false,
};

const ENDPOINTS = {
  info: "/api/v1/operators/compare-operators-production_info",
  series: "/api/v1/operators/compare-operators-production",
} as const;

function text(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function num(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  // The series response sends `year` as a string; the info response sends numbers.
  if (typeof raw === "string") {
    const parsed = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * The sentinel both endpoints substitute for a withheld volume.
 *
 * The same four asterisks the operator search uses, and the same meaning: a value
 * this reader may not have. It has to be caught BEFORE `num`, which turns it into
 * 0 and makes it indistinguishable from an operator that genuinely produced
 * nothing.
 */
const WITHHELD = "****";

function isWithheld(raw: unknown): boolean {
  return raw === WITHHELD;
}

function maybeNum(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * The picker's spelling of an operator into the regulator's.
 *
 * `search_text` MATCHES THE FILED NAME, PUNCTUATION AND ALL. The picker offers the
 * cleaned spelling — "Pioneer Natural RES USA, Inc" — and the endpoint knows only
 * "PIONEER NATURAL RES. USA, INC.". Sending what was selected returns an empty
 * operator list, which reads on screen as "no production matches these filters"
 * rather than as the name mismatch it is. The same reconciliation
 * `operator-compare-api.ts` does for the statistics tool, against the same cached
 * directory — so neither page ships the knowledge that two spellings exist.
 *
 * A NAME THAT RESOLVES TO NOTHING IS DROPPED rather than passed through. Passing it
 * on would spend a round trip to be told the same thing.
 */
async function toFiledNames(names: readonly string[]): Promise<string[]> {
  const cleaned = names
    .map((name) => name.trim())
    .filter((name) => name !== "");
  if (cleaned.length === 0) return [];

  const directory = await getOperatorNames();
  const filedFor = new Map<string, string>();
  for (const entry of directory) {
    filedFor.set(entry.cleaned.toLowerCase(), entry.filed);
    // A name that is ALREADY the filed spelling resolves to itself, so a caller
    // that has one — the route's own query string, on a shared link — still works.
    filedFor.set(entry.filed.toLowerCase(), entry.filed);
  }

  const resolved = cleaned.map((name) => ({
    selected: name,
    filed: filedFor.get(name.toLowerCase()) ?? null,
  }));

  if (shouldLog()) {
    // Worth its own line: a name that resolves to null is the difference between
    // "this operator has no production here" and "we asked for a name the endpoint
    // has never heard of", and the two look identical on screen.
    logBlock("operator names — selected → filed", resolved);
  }

  return resolved
    .map((entry) => entry.filed)
    .filter((name): name is string => Boolean(name));
}

/**
 * The request body both endpoints take.
 *
 * Empty arrays are sent rather than omitted: the endpoint reads an absent `county`
 * and an empty `county` the same way, and sending the key always means one shape to
 * reason about. `member_id` is the project's existing constant — verified to return
 * a byte-identical body to the value the API docs use, so this does not introduce a
 * second id to keep in step. `operators` arrives already resolved to filed names.
 */
function payloadFor(
  filters: ProductionFilters,
  dataType: string,
  operators: readonly string[],
  /**
   * Whether to constrain the answer to a year range.
   *
   * OFF FOR THE CHART, and the difference is measurable rather than cosmetic. Sending
   * `duration` for 2016-2025 — the window `defaultProductionWindow` produces, and the
   * only one that could be sent now that the From/To controls are gone — returns ten
   * years and 2,363 bytes for Diamondback. Omitting it returns 2011-2026, sixteen
   * years and 3,717 bytes: six additional years of filed record that the chart was
   * discarding before it drew anything, for a window nobody chose.
   *
   * The brush under the plot is what scopes the chart now. It scopes what is already
   * in hand, so dragging it costs no request — and it can only reach years the
   * response actually contains, which is why the response has to carry all of them.
   */
  withDuration: boolean,
  /**
   * WHO IS ASKING — 0 for a visitor with no account.
   *
   * IT IS AN ACCESS GATE ON BOTH ENDPOINTS, measured against the dev host with an
   * otherwise identical body: at 0 the info endpoint returns
   * `total_production_oil/gas/boe` as the literal `"****"` and the series endpoint
   * returns every `oil`/`gas`/`boe` the same way, while rank, the oil/gas split and
   * the county and lease counts stay real at both values.
   *
   * IT USED TO BE `TEMP_MEMBER_ID` — a development stand-in that made every
   * anonymous visitor look like member 3448 and so switched the gate off. It is a
   * parameter now because only the route handler in front of this can answer the
   * question, and it must not be answerable from the browser.
   */
  memberId: number,
) {
  return {
    search_text: operators,
    county: filters.counties,
    district_code: filters.districtCodes,
    playtype: filters.playTypes,
    dataType,
    ...(withDuration
      ? {
          duration: {
            type: "year",
            from: { year: filters.fromYear },
            to: { year: filters.toYear },
          },
        }
      : {}),
    member_id: memberId,
  };
}

/**
 * Whether to print each upstream request and its answer.
 *
 * ON IN DEVELOPMENT, OFF IN PRODUCTION, and overridable either way with
 * `LOG_PRODUCTION_API=1` / `=0`. These bodies run to tens of kilobytes and name every
 * operator asked for, so a deployed server logging them on every Apply would be both
 * noise and a slow, quietly growing log.
 *
 * IT PRINTS ON THE SERVER, not in the browser — this module is `server-only`, so the
 * output goes to the terminal running `next dev`. That is also the only place it can
 * go: the raw upstream body never reaches the client, and routing it there to be
 * logged would mean shipping the upstream's shape to the browser.
 */
function shouldLog(): boolean {
  const flag = (process.env.LOG_PRODUCTION_API ?? "").trim();
  if (flag === "1" || flag.toLowerCase() === "true") return true;
  if (flag === "0" || flag.toLowerCase() === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/**
 * One labelled block, pretty-printed.
 *
 * `JSON.stringify(…, 2)` rather than handing the object to `console.log`: Node
 * abbreviates a nested object past its default depth as `[Object]`, which hides
 * exactly the `duration` and per-operator rows worth reading.
 */
function logBlock(label: string, value: unknown): void {
  console.log(`\n[production-api] ${label}\n${JSON.stringify(value, null, 2)}`);
}

async function post(endpoint: string, body: unknown): Promise<unknown> {
  const logging = shouldLog();
  if (logging) logBlock(`POST ${endpoint} — payload`, body);

  const started = Date.now();
  const response = await fetch(`${publicOperatorApiBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // The filter set is user-chosen and effectively unbounded, so an HTTP cache
    // entry per combination would never be hit twice. The hooks cache in-page
    // instead, which is where a repeat actually happens.
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    if (logging) {
      // The body of a failure is where the upstream says WHY, so it is read before
      // the status is thrown — a bare "responded 400" is the least useful thing here.
      const detail = await response.text().catch(() => "");
      logBlock(
        `POST ${endpoint} — ${response.status} after ${Date.now() - started}ms`,
        detail.slice(0, 2_000),
      );
    }
    throw new Error(`${endpoint} responded ${response.status}`);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (logging) {
    logBlock(
      `POST ${endpoint} — response (${response.status}, ${Date.now() - started}ms)`,
      payload,
    );
  }

  if (payload === null || typeof payload !== "object") {
    throw new Error(`${endpoint} returned a malformed body`);
  }

  // The envelope reports its own failures in `error` with a 200 status.
  const error = text((payload as Record<string, unknown>).error);
  if (error !== "") throw new Error(error);

  return (payload as Record<string, unknown>).data;
}

/**
 * The identity fields, which every record in both responses carries.
 *
 * `displayNameFor` is the directory lookup the related-operators band and the
 * presentations filter already share, so one operator reads the same on every page.
 */
function identityOf(
  record: Record<string, unknown>,
  displayNameFor: (filed: string, operatorNumber?: string | null) => string,
): ProductionIdentity | null {
  const filedName = text(record.operator_name) || text(record.operator_Name);
  const operatorNumber =
    text(record.operator_number) || text(record.operator_no);
  if (filedName === "") return null;

  const name = displayNameFor(filedName, operatorNumber || null);
  return {
    name,
    filedName,
    operatorNumber,
    // `operator_logo` says whether one exists; the bytes come from our origin,
    // because the API serves logos `cross-origin-resource-policy: same-origin`
    // and a browser refuses to embed those.
    logoUrl:
      text(record.operator_logo) && operatorNumber
        ? operatorLogoPath(operatorNumber)
        : null,
    monogram: monogramOf(name),
    rankStatewide: maybeNum(record.rank_statewide) ?? maybeNum(record.rank),
  };
}

function leaderOf(
  raw: unknown,
  valueKeys: readonly string[],
  displayNameFor: (filed: string, operatorNumber?: string | null) => string,
  /**
   * How to read the value. `volume` runs it through the unit-aware conversion
   * (defect 161); `scale` divides a plain number, for the tiles whose figure is
   * already the size it should print at.
   */
  how: { volume: true } | { scale: number },
): ProductionLeader | null {
  if (raw === null || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const identity = identityOf(record, displayNameFor);
  if (!identity) return null;

  const key = valueKeys.find((candidate) => candidate in record);
  if (key === undefined) return null;

  return {
    ...identity,
    value: "volume" in how ? volumeInMillions(record[key]) : num(record[key]) / how.scale,
    leaseCount: maybeNum(record.lease_count),
  };
}

/**
 * `POST /compare-operators-production_info` -> the cards, the tiles and the table.
 *
 * Throws with a message fit to log. The route handler decides what a failure looks
 * like on screen; this only decides that a failure is a failure.
 */
export async function fetchProductionInfo(
  filters: ProductionFilters,
  /** The signed-in member, or 0. See `payloadFor`. */
  memberId: number,
): Promise<ProductionInfo> {
  const [filed, displayNameFor] = await Promise.all([
    toFiledNames(filters.operators),
    getCasedNameLookup(),
  ]);
  if (filed.length === 0) return EMPTY_INFO;

  const data = await post(
    ENDPOINTS.info,
    /* Kept for the info endpoint, which is measured to IGNORE `duration` entirely —
       asking for one year returns the same totals as ten. Sending it changes nothing
       there, so it stays rather than being removed on a guess about an endpoint whose
       behaviour this file already documents. */
    payloadFor(filters, INFO_GROUPING, filed, true, memberId),
  );
  const body = (data ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(body.operators) ? body.operators : [];

  const operators: ProductionOperator[] = [];
  const seen = new Set<string>();
  /* Read off the response rather than derived from `memberId`, so the flag says
     what actually arrived. */
  let locked = false;

  for (const row of rows) {
    if (row === null || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const identity = identityOf(record, displayNameFor);
    if (!identity) continue;
    // The same operator twice would render as two identical cards and double-count
    // in the leader tiles.
    const key = identity.operatorNumber || identity.filedName;
    if (seen.has(key)) continue;
    seen.add(key);

    const topCounties = (
      Array.isArray(record.top_producing_counties)
        ? record.top_producing_counties
        : []
    ).flatMap((entry): ProductionOperator["topCounties"] => {
      if (entry === null || typeof entry !== "object") return [];
      const county = text((entry as Record<string, unknown>).county);
      if (county === "") return [];
      return [
        {
          county,
          boe: volumeInMillions((entry as Record<string, unknown>).boe),
        },
      ];
    });

    if (isWithheld(record.total_production_boe)) locked = true;

    operators.push({
      ...identity,
      oilTotal: volumeInMillions(record.total_production_oil),
      gasTotal: volumeInMillions(record.total_production_gas),
      boeTotal: volumeInMillions(record.total_production_boe),
      oilPercent: num(record.oil_percentage),
      gasPercent: num(record.gas_percentage),
      countyCount: num(record.county_count),
      producingCountyCount: num(record.producing_county_count),
      leaseCount: num(record.lease_count),
      activeLeaseCount: num(record.active_lease_count),
      latestProductionDate: text(record.latest_production_date),
      // Per-lease averages are whole barrels and Mcf — a few hundred thousand, not
      // millions — so they are NOT scaled. Scaling them would print "0.3M".
      avgOilPerLease: num(record.avg_oil_production_per_lease),
      avgGasPerLease: num(record.avg_gas_production_per_lease),
      topCounties,
    });
  }

  const raw = (body.leaders ?? {}) as Record<string, unknown>;
  const leaders: ProductionLeaders = {
    /* `volume: true` — these two carry the same unit-suffixed strings the cards do
       (`"1,476,959.213 (MBBL)"`), so they were reading 0 for exactly the same reason.
       See `volumeInMillions`. */
    highestOil: leaderOf(
      raw.highest_oil_production,
      ["production"],
      displayNameFor,
      { volume: true },
    ),
    highestGas: leaderOf(
      raw.highest_gas_production,
      ["production"],
      displayNameFor,
      { volume: true },
    ),
    /* Already a per-lease figure, and already small. Not a volume to scale.

       `boe_per_lease` IS THE KEY THE ENDPOINT ACTUALLY SENDS — measured. Only
       `mboe_per_lease` was listed, `leaderOf` returns null when it finds none of its
       candidates, and so this tile rendered as absent on every comparison rather than
       as a wrong number. Found while fixing 161, which is the same response. Both
       spellings are accepted so an endpoint that goes back to the other keeps working. */
    mostEfficient: leaderOf(
      raw.most_efficient_per_lease,
      ["mboe_per_lease", "boe_per_lease"],
      displayNameFor,
      { scale: 1 },
    ),
    widestFootprint: leaderOf(
      raw.widest_footprint,
      ["county_count"],
      displayNameFor,
      { scale: 1 },
    ),
  };

  return {
    operators,
    leaders,
    totalOperators: num(body.total_operators) || operators.length,
    locked,
  };
}

/**
 * `POST /compare-operators-production` -> the Production over time chart.
 *
 * The response is year-major (`[{ year, operators: [...] }]`), which is the wrong
 * way round for a chart that draws one line per operator, so it is pivoted here.
 * Doing it on the server keeps the pivot out of a `useMemo` that would re-run on
 * every brush move.
 */
export async function fetchProductionSeries(
  filters: ProductionFilters,
  /** The signed-in member, or 0. See `payloadFor`. */
  memberId: number,
): Promise<ProductionSeries> {
  const [filed, displayNameFor] = await Promise.all([
    toFiledNames(filters.operators),
    getCasedNameLookup(),
  ]);
  if (filed.length === 0) return { years: [], operators: [], locked: false };

  const data = await post(
    ENDPOINTS.series,
    payloadFor(filters, SERIES_GROUPING, filed, false, memberId),
  );
  const entries = Array.isArray(data) ? data : [];

  /* Read off the response rather than derived from `memberId`, so the flag says
     what actually arrived. If the endpoint ever stops gating, the page stops
     locking without this file being edited again. */
  let locked = false;

  /** operator key -> identity, and year -> point. */
  const identities = new Map<string, ProductionIdentity>();
  const byOperator = new Map<string, Map<number, ProductionPoint>>();
  const years = new Set<number>();

  for (const entry of entries) {
    if (entry === null || typeof entry !== "object") continue;
    const yearEntry = entry as Record<string, unknown>;
    const rows = Array.isArray(yearEntry.operators) ? yearEntry.operators : [];

    for (const row of rows) {
      if (row === null || typeof row !== "object") continue;
      const record = row as Record<string, unknown>;
      const identity = identityOf(record, displayNameFor);
      if (!identity) continue;

      // The row's own year, not the wrapper's: they agree today, and trusting the
      // row means a regrouped response cannot silently shift a point a year.
      const year = num(record.year) || num(yearEntry.year);
      if (year === 0) continue;
      years.add(year);

      const key = identity.operatorNumber || identity.filedName;
      if (!identities.has(key)) identities.set(key, identity);

      let points = byOperator.get(key);
      if (!points) {
        points = new Map<number, ProductionPoint>();
        byOperator.set(key, points);
      }
      // Caught here, where the raw value is still in hand: one line further on it
      // has become a 0 and is indistinguishable from a year with no production.
      if (isWithheld(record.boe)) locked = true;

      points.set(year, {
        year,
        oil: num(record.oil) / THOUSANDS_TO_MILLIONS,
        gas: num(record.gas) / THOUSANDS_TO_MILLIONS,
        boe: num(record.boe) / THOUSANDS_TO_MILLIONS,
      });
    }
  }

  const axis = [...years].sort((a, b) => a - b);

  const operators: ProductionSeriesOperator[] = [];
  for (const [key, identity] of identities) {
    const points = byOperator.get(key);
    if (!points) continue;
    operators.push({
      ...identity,
      // Every series is the length of the shared axis. A year this operator did
      // not report becomes an explicit zero rather than a hole, so index N is
      // year N for every line on the chart.
      points: axis.map(
        (year) => points.get(year) ?? { year, oil: 0, gas: 0, boe: 0 },
      ),
    });
  }

  return { years: axis, operators, locked };
}
