/*
 * Every call to the map API lives here — one file, one place to change the
 * host or the error convention.
 *
 * MAP_BASE_URL is declared in next.config.ts and overridable in .env.local, so
 * dev, staging and production differ only in that value.
 */

/**
 * One row of a filter facet: the name to show, how many wells carry it, and
 * the id to filter by. Operator and field are filtered by id, not by name.
 */
export type MapFilterItem = { value: string; count: number; id?: string };

/** GET /api/v1/map/filters/county -> { facet, items: [{ value, count }] } */
export const getCountyListMap = async (): Promise<MapFilterItem[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/filters/county`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.items)) {
      return data.items as MapFilterItem[];
    } else {
      throw new Error("Failed to fetch county list");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch county list");
  }
};

/** A page of a facet: the rows asked for, and how many there are in all. */
export type MapFilterPage = { items: MapFilterItem[]; total: number };

/** How many operators a page holds. */
export const OPERATOR_PAGE_SIZE = 50;

/**
 * The `offset` that asks for the rows after the ones already in hand.
 *
 * A row count, matching the service. One function so the whole app asks the
 * same way, and one place to change it if the service starts counting pages.
 */
export const nextOffset = (loaded: number): number => loaded;

/**
 * GET /api/v1/map/filters/operator?limit=&offset=&q=
 *
 * Paged, unlike the other facets: there are 22,609 operators, and the whole
 * list is a couple of megabytes to send and a couple of thousand rows to draw
 * for a panel that shows eight at a time. `q` searches the whole set on the
 * server, so a name outside the page in hand can still be found.
 *
 * `offset` is a row, not a page — the service was asked and answered:
 * `limit=50&offset=1` returns rows 2 to 51, sharing 49 of its 50 rows with
 * `offset=0`. So the second fifty is `offset=50`, the third `offset=100`.
 * Should the service ever count pages instead, `nextOffset` below is the one
 * line to change.
 *
 * Both parameters go on every request, the first included.
 */
export const getOperatorListMap = async (page?: {
  limit?: number;
  /** The first row wanted, counting from 0. */
  offset?: number;
  q?: string;
}): Promise<MapFilterPage> => {
  try {
    const query = new URLSearchParams();
    query.set("limit", String(page?.limit ?? OPERATOR_PAGE_SIZE));
    query.set("offset", String(page?.offset ?? 0));
    if (page?.q) query.set("q", page.q);

    const search = query.toString();
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/filters/operator${
        search ? `?${search}` : ""
      }`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.items)) {
      return {
        items: data.items as MapFilterItem[],
        /* Older builds of the service send no total; the list is then however
           much of it arrived. */
        total:
          typeof data.total === "number" ? data.total : data.items.length,
      };
    } else {
      throw new Error("Failed to fetch operator list");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch operator list");
  }
};

/** GET /api/v1/map/filters/wtype -> { facet, items: [{ value, count }] } */
export const getWellTypeListMap = async (): Promise<MapFilterItem[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/filters/wtype`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.items)) {
      return data.items as MapFilterItem[];
    } else {
      throw new Error("Failed to fetch well type list");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch well type list");
  }
};

/** GET /api/v1/map/filters/status -> { facet, items: [{ value, count }] } */
export const getWellStatusListMap = async (): Promise<MapFilterItem[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/filters/status`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.items)) {
      return data.items as MapFilterItem[];
    } else {
      throw new Error("Failed to fetch well status list");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch well status list");
  }
};

/** GET /api/v1/map/filters/play -> { facet, items: [{ value, count }] } */
export const getPlayTypeListMap = async (): Promise<MapFilterItem[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/filters/play`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.items)) {
      return data.items as MapFilterItem[];
    } else {
      throw new Error("Failed to fetch play type list");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch play type list");
  }
};

/** GET /api/v1/map/filters/field -> { facet, items: [{ value, count }] } */
export const getFieldListMap = async (): Promise<MapFilterItem[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/filters/field`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.items)) {
      return data.items as MapFilterItem[];
    } else {
      throw new Error("Failed to fetch field list");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch field list");
  }
};

/** One legend symbol — its label and the icon the map draws for it. */
export type MapLegend = { id: number; description: string; iconUrl: string };

/** GET /api/v1/map/legends -> { legends: [{ id, description, iconUrl }] } */
export const getLegendListMap = async (): Promise<MapLegend[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/legends`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.legends)) {
      return data.legends as MapLegend[];
    } else {
      throw new Error("Failed to fetch legend list");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch legend list");
  }
};

/** One hit from the combined search — a lease, an operator or a county. */
export type MapSearchResult = {
  type: string;
  /** The name to show. */
  value: string;
  /**
   * What the filter takes, where it is not the name: an operator's or a
   * field's id, a lease's key. Counties filter by name and have none.
   */
  id?: string;
  /** Some rows carry the display name here instead of in `value`. */
  label?: string;
};

/** GET /api/v1/map/search?q={query} -> { query, results: [{ type, value, label }] } */
export const getMapSearch = async (
  query: string,
): Promise<MapSearchResult[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/search?q=${encodeURIComponent(query)}`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.results)) {
      return data.results as MapSearchResult[];
    } else {
      throw new Error("Failed to search");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to search");
  }
};

/** One aggregated bubble: where it sits, how many wells, and their mix. */
export type MapCluster = {
  id: string;
  lon: number;
  lat: number;
  count: number;
  oil: number;
  gas: number;
  oilGas: number;
  name: string;
  topCounty: string;
  /**
   * Every county the cluster covers, largest first — the bubble is a square
   * of the grid, not a county, so at the wider zooms it straddles a dozen of
   * them. `topCounty` is the first of these.
   */
  countyNames?: string[];
  /** Null where the cluster has no producing wells to take shares of. */
  sharePct: { oil: number; gas: number; oilGas: number } | null;
};

/**
 * GET /api/v1/map/clusters?bbox={west},{south},{east},{north}
 *
 * The bbox is the map's own extent in degrees, in that order: minLon, minLat,
 * maxLon, maxLat — bottom-left corner first, then top-right.
 */
export const getClusterListMap = async (bbox: {
  west: number;
  south: number;
  east: number;
  north: number;
}): Promise<MapCluster[]> => {
  try {
    const box = [bbox.west, bbox.south, bbox.east, bbox.north]
      .map((value) => value.toFixed(4))
      .join(",");
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/clusters?bbox=${box}`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.clusters)) {
      return data.clusters as MapCluster[];
    } else {
      throw new Error("Failed to fetch clusters");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch clusters");
  }
};

/** One well, as the map draws it. `icon` names a legend symbol. */
export type MapWell = {
  api: string;
  lon: number;
  lat: number;
  /*
   * The bottom of the hole, where the service reports one. A horizontal well's
   * bore can run a mile or more from its surface location, so anything asking
   * "is this well in that tract" has to know both ends.
   */
  bhLon?: number;
  bhLat?: number;
  /**
   * The bore as drawn: surface hole first, bottom hole last, with whatever
   * vertices lie between. Two identical points for a vertical well.
   */
  path?: [number, number][];
  /**
   * How the hole was drilled — "Horizontal", "Directional", "Vertical",
   * "Unknown". The first two name legend symbols of their own, which is what
   * the map marks the bottom of the bore with.
   */
  profile?: string;
  /**
   * When the well was last recompleted, ISO, where the record carries one.
   *
   * Null for about one well in seven — an older hole whose paperwork never
   * gave a readable date. The time-lapse replays the dated ones and puts the
   * rest back at the end rather than inventing a year for them.
   */
  recompletionDate?: string | null;
  /** Which filing the row came from — "Permit", "Completion". */
  recordType?: string;
  icon: string;
  wtype: string;
  status: string;
  operator: string;
  lease: string;
  well: string;
  county: string;
};

/**
 * GET /api/v1/map/wells?bbox={west},{south},{east},{north}
 *
 * Individual wells rather than aggregated bubbles — only worth asking for once
 * the map is close enough that the count is small.
 */
export const getWellListMap = async (bbox: {
  west: number;
  south: number;
  east: number;
  north: number;
}): Promise<MapWell[]> => {
  try {
    const box = [bbox.west, bbox.south, bbox.east, bbox.north]
      .map((value) => value.toFixed(4))
      .join(",");
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/wells?bbox=${box}`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.wells)) {
      return data.wells as MapWell[];
    } else {
      throw new Error("Failed to fetch wells");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch wells");
  }
};

/** One row of the API-number lookup. Identity only — no position. */
export type MapWellLookup = { api: string; county: string };

/**
 * GET /api/v1/map/wells/lookup?q={prefix} -> { wells: [{ api, county }] }
 *
 * A prefix search over API numbers, capped at ten by the server.
 */
export const getWellLookupMap = async (
  query: string,
): Promise<MapWellLookup[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/wells/lookup?q=${encodeURIComponent(query)}`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.wells)) {
      return data.wells as MapWellLookup[];
    } else {
      throw new Error("Failed to look up API numbers");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to look up API numbers");
  }
};

/**
 * GET /api/v1/map/matched-wells?county=…&wtype=… -> { matched, returned, wells }
 *
 * The filters panel's query. Keys are the facet names — county, operator,
 * wtype, status, play, field — and several values of one key go comma-joined.
 * `matched` is the true total; `wells` is capped by the server at 5,000.
 */
export const getMatchedWellsMap = async (
  filters: Record<string, string[]>,
): Promise<{
  matched: number;
  wells: MapWell[];
  /** The true extent of every match, not just the returned sample. */
  bounds: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
  } | null;
}> => {
  try {
    const params = new URLSearchParams();
    for (const [facet, values] of Object.entries(filters)) {
      if (values.length > 0) params.set(facet, values.join(","));
    }

    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/matched-wells?${params.toString()}`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.wells)) {
      return {
        matched: Number(data.matched ?? data.wells.length),
        wells: data.wells as MapWell[],
        bounds: data.bounds ?? null,
      };
    } else {
      throw new Error("Failed to fetch matched wells");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch matched wells");
  }
};

/** One row of the wells table. Production is null where none was filed. */
export type MapTableRow = {
  api: string;
  operator: string;
  operatorNumber: string;
  lease: string;
  leaseKey: string;
  wtype: string;
  status: string;
  county: string;
  producedOil: number | null;
  producedGas: number | null;
  lon: number;
  lat: number;
  profile: string;
};

/** The counts above the table, as the server totals them. */
export type MapTableSummary = {
  totalWells: number;
  oilWells: number;
  oilPct: number;
  gasWells: number;
  gasPct: number;
  activeWells: number;
  activePct: number;
  operators: number;
  counties: number;
};

/**
 * GET /api/v1/map/table?page=&pageSize=&sort=&dir=&q=&county=…
 *
 * Server-paged: 1.1M rows, so the page, the sort and the search all belong to
 * the request rather than to the browser.
 */
export const getTableMap = async (params: {
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  filters?: Record<string, string[]>;
  /** producedOilMin and the rest — omitted where the box was left empty. */
  ranges?: Record<string, string>;
}): Promise<{
  rows: MapTableRow[];
  total: number;
  totalPages: number;
  summary: MapTableSummary | null;
}> => {
  try {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    if (params.sort) query.set("sort", params.sort);
    if (params.dir) query.set("dir", params.dir);
    if (params.q?.trim()) query.set("q", params.q.trim());
    for (const [facet, values] of Object.entries(params.filters ?? {})) {
      if (values.length > 0) query.set(facet, values.join(","));
    }
    for (const [bound, value] of Object.entries(params.ranges ?? {})) {
      if (value.trim() !== "") query.set(bound, value.trim());
    }

    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/table?${query.toString()}`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.rows)) {
      return {
        rows: data.rows as MapTableRow[],
        total: Number(data.total ?? data.rows.length),
        totalPages: Number(data.totalPages ?? 1),
        summary: (data.summary as MapTableSummary) ?? null,
      };
    } else {
      throw new Error("Failed to fetch the table");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch the table");
  }
};

/** One well's completion record, as the summary endpoint reports it. */
export type MapWellSummary = {
  identity: {
    api: string;
    wellNumber: string | null;
    operator: string | null;
    operatorNumber: string | null;
    county: string | null;
    district: string | null;
    status: string | null;
    wtype: string | null;
    performance: string | null;
    recordType: string | null;
    lon: number | null;
    lat: number | null;
    /** `WGS_84 (EPSG:4326)` — which datum the two figures above are in. */
    coordinateSystem: string | null;
    /** `Ector County, Texas, USA` — the same point said in words. */
    location: string | null;
  };
  lease: {
    leaseNumber: string | null;
    leaseName: string | null;
    acres: number | null;
    district: string | null;
    fieldNumber: string | null;
    fieldName: string | null;
    play: string | null;
  } | null;
  wellbore: {
    profile: string | null;
    startDepth: number | null;
    endDepth: number | null;
    totalDepth: number | null;
    trueVerticalDepth: number | null;
    nearestWellFt: number | null;
    nearestWellDirection: string | null;
  } | null;
  dates: {
    spud: string | null;
    completion: string | null;
    firstProduction: string | null;
    lastProduction: string | null;
    ageYears: number | null;
  } | null;
  filing: {
    type: string | null;
    purpose: string | null;
    permitStatus: string | null;
    statusNumber: string | null;
    issuedDate: string | null;
    isNewPermit: boolean | null;
  } | null;
  production: {
    lastMonthOil: number | null;
    lastMonthGas: number | null;
    nextMonthEstOil: number | null;
    nextMonthEstGas: number | null;
    reserveOil: number | null;
    reserveGas: number | null;
    lastYearOil: number | null;
    lastYearGas: number | null;
    avgEstMonthlyBoe: number | null;
  } | null;
  analytics: {
    oilStep: number | null;
    gasStep: number | null;
    impliedAnnualOil: number | null;
    lastMonthGor: number | null;
    forecastGor: number | null;
    reserveToProductionMonths: number | null;
  } | null;
};

/**
 * GET /api/v1/map/wells/{api}/summary
 *
 * Everything the completion record holds for one well — the identity, the
 * lease, the wellbore, its filing dates and its production. The API number
 * goes in the path, so it is encoded rather than concatenated.
 */
export const getWellSummaryMap = async (
  api: string,
): Promise<MapWellSummary> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/wells/${encodeURIComponent(api)}/summary`,
    );
    const data = await response.json();

    if (response.ok && data?.identity?.api) {
      return data as MapWellSummary;
    } else {
      throw new Error("Failed to fetch the well summary");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch the well summary");
  }
};

/** One month of allocated production. */
export type MapProductionPoint = {
  month: string;
  oil: number | null;
  gas: number | null;
};

export type MapWellProduction = {
  api: string;
  points: MapProductionPoint[];
  from: string | null;
  to: string | null;
};

/**
 * GET /api/v1/map/wells/{api}/production
 *
 * The monthly oil and gas series behind the production chart — reported months
 * and forecast months in one list, oldest first.
 */
export const getWellProductionMap = async (
  api: string,
): Promise<MapWellProduction> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/wells/${encodeURIComponent(api)}/production`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.points)) {
      return {
        api: String(data.api ?? api),
        points: data.points as MapProductionPoint[],
        from: data.from ?? null,
        to: data.to ?? null,
      };
    } else {
      throw new Error("Failed to fetch production");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch production");
  }
};

/** One well's permit filing, as the permit endpoint reports it. */
export type MapWellPermit = {
  identity: {
    api: string;
    wellNumber: string | null;
    statusNumber: string | null;
    filingPurpose: string | null;
    filingType: string | null;
    permitStatus: string | null;
    isNewPermit: boolean | null;
  };
  lease: {
    leaseNumber: string | null;
    leaseName: string | null;
    acres: number | null;
    district: string | null;
    fieldNumber: string | null;
    fieldName: string | null;
    play: string | null;
  } | null;
  wellType: { wtype: string | null; direction: string | null } | null;
  permit: {
    permitDate: string | null;
    permitDateBasis: string | null;
    issuedDate: string | null;
  } | null;
  operator: {
    operator: string | null;
    operatorNumber: string | null;
    fieldName: string | null;
    fieldNumber: string | null;
    reservoir: string | null;
  } | null;
  location: {
    lon: number | null;
    lat: number | null;
    bhLon: number | null;
    bhLat: number | null;
  } | null;
  nearestWell: {
    distanceMiles: number | null;
    direction: string | null;
  } | null;
};

/**
 * GET /api/v1/map/wells/{api}/permit
 *
 * The permit side of a well: what was applied for, when it cleared, and where
 * it is.
 *
 * Null for a well with no permit. The service answers 404 in that case, which
 * is an answer and not a failure — most wells on the map were drilled long
 * before there was a permit record to find, and "no permit on file" is what
 * the reader needs to be told.
 */
export const getWellPermitMap = async (
  api: string,
): Promise<MapWellPermit | null> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/wells/${encodeURIComponent(api)}/permit`,
    );

    if (response.status === 404) return null;

    const data = await response.json();

    if (response.ok && data?.identity?.api) {
      return data as MapWellPermit;
    } else {
      throw new Error("Failed to fetch the permit");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch the permit");
  }
};

/** The radii the service holds rings for. Anything else is a 400. */
export const NEARBY_RADII_MILES = [1, 3, 5] as const;

export type MapNearbyEvent = {
  /** "New Permit", "New Completion" — what happened. */
  type: string;
  leaseName: string;
  well: string;
  operator: string;
  /** "HORIZONTAL", "VERTICAL" — how it is being drilled. */
  direction: string | null;
  totalDepth: number | null;
  purpose: string | null;
  status: string | null;
  /** The date, and which date it is — "approved", "filed". */
  date: string | null;
  dateBasis: string | null;
  distanceMiles: number | null;
  /** "NW", "N" — the direction of the event from the lease. */
  bearing: string | null;
  api: string;
  lon: number | null;
  lat: number | null;
};

export type MapLeaseNearby = {
  lease: {
    key: string;
    name: string;
    number: string;
    district: string;
    county: string;
  };
  radiusMiles: number;
  /** How many other leases touch the ring. */
  adjacentLeases: number;
  stats: {
    nearbyWells: number;
    newPermits: number;
    newCompletions: number;
    /** Miles to the closest bore, or null when nothing is in range. */
    closestWellMiles: number | null;
  };
  events: MapNearbyEvent[];
  meta: {
    /** How far back "new" reaches. */
    windowMonths: number;
    /** Activity the service could not place on the map. */
    unplacedEvents: number;
    distanceBasis: string;
  };
};

/**
 * GET /api/v1/map/leases/{key}/nearby?radius={1|3|5}
 *
 * What is happening around one lease: how many wells are inside the ring, how
 * many permits and completions are new, what the closest bore is, and the
 * recent filings themselves.
 *
 * The key is the lease's own, district first — `7C-04254`. It is what
 * `/map/search` returns in `id` for a lease row, which is where the tool gets
 * it from.
 *
 * Null where the service holds no ring of that size for the lease: it answers
 * 404 with `LEASE_RING_NOT_FOUND`, and that is an answer rather than a failure
 * — the lease exists, the ring does not, and the reader should be told to try
 * another distance rather than shown an error.
 */
export const getLeaseNearbyMap = async (
  key: string,
  radiusMiles: number,
): Promise<MapLeaseNearby | null> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/leases/${encodeURIComponent(key)}/nearby?radius=${radiusMiles}`,
    );

    if (response.status === 404) return null;

    const data = await response.json();

    if (response.ok && data?.lease?.key && data?.stats) {
      return data as MapLeaseNearby;
    } else {
      throw new Error("Failed to fetch what is near this lease");
    }
  } catch (error) {
    throw new Error(
      String(error) || "Failed to fetch what is near this lease",
    );
  }
};

/** One row of the decline grid, as the service computes it. */
export type MapInsightMetric = {
  key: string;
  label: string;
  value: number | null;
  unit: string | null;
  /** "oil", "gas", "mix", "history", "totals" — which block the row belongs to. */
  group: string | null;
  help?: string | null;
};

/** A tone-badged note or finding written by the service. */
export type MapInsightNote = {
  tone: "ok" | "info" | "warn" | "bad" | string;
  title: string;
  body: string;
};

/** One age cohort, with the medians the comparison charts are drawn from. */
export type MapInsightCohort = {
  key: string;
  label: string;
  n: number;
  medianDepletion: number | null;
  medianEurBoe: number | null;
  p25EurBoe: number | null;
  p75EurBoe: number | null;
  /** True for the cohort this well itself falls in. */
  isOwn: boolean;
};

export type MapWellInsights = {
  api10: string;
  hasProduction: boolean;
  noProductionReason: string | null;
  decline: {
    metrics: MapInsightMetric[];
    reporting: {
      label: string | null;
      tone: string | null;
      detail: string | null;
    } | null;
    rollUp: {
      cumBoe: number | null;
      remBoe: number | null;
      eurBoe: number | null;
      depletion: number | null;
      lastBoe: number | null;
      reserveLifeMonths: number | null;
    } | null;
    notes: MapInsightNote[];
  } | null;
  cohorts: {
    available: boolean;
    peerLabel: string | null;
    peerTotal: number | null;
    ownBucket: string | null;
    ownBucketLabel: string | null;
    ownDepletion: number | null;
    ownEurBoe: number | null;
    rows: MapInsightCohort[];
    findings: MapInsightNote[];
  } | null;
};

/**
 * GET /api/v1/map/wells/{api}/insights
 *
 * The decline diagnostics, the reserve-integrity comparison and the cohort
 * EUR table — everything the Insights page used to carry as fixed copy. The
 * service does the arithmetic and writes the notes, so the page renders what
 * it is given rather than deriving anything of its own.
 */
export const getWellInsightsMap = async (
  api: string,
): Promise<MapWellInsights> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/wells/${encodeURIComponent(api)}/insights`,
    );
    const data = await response.json();

    if (response.ok && data?.api10) {
      return data as MapWellInsights;
    }

    throw new Error("Failed to fetch insights for this well");
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch insights for this well");
  }
};

/** A standing watch on one lease: what to watch for, and where to write. */
export type LeaseWatch = {
  /** The lease's own key, district first — `7C-19955`. */
  lease: string;
  /** 1, 3 or 5 miles: the ring the service holds. */
  radius: number;
  notifyNewPermit: boolean;
  notifyNewCompletion: boolean;
  email: string;
};

/**
 * POST /api/v1/watches
 *
 * Asks the service to watch one lease's ring and write to an address when
 * something is filed inside it. Returns nothing on success — the watch is the
 * service's to keep, and this page has nothing further to do with it.
 *
 * A refusal comes back as a status with a reason in the body where the service
 * gives one, and that reason is what the reader is shown: "email is required"
 * is worth reading, "400" is not.
 */
export const saveLeaseWatch = async (watch: LeaseWatch): Promise<void> => {
  let response: Response;

  try {
    response = await fetch(`${process.env.MAP_BASE_URL}/api/v1/watches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(watch),
    });
  } catch {
    /* No answer at all — off the network, or the host is down. Said as
       something a reader can act on rather than as "TypeError". */
    throw new Error("Could not reach the service. Try again in a moment.");
  }

  if (response.ok) return;

  /*
   * This service wraps its refusals as `{ error: { message, details } }`, and
   * the details are the part worth reading: "Invalid request payload" says
   * nothing, "radius must be one of 1, 3, 5 miles" says everything. The
   * flatter shapes and the bare status follow it, for a service that answers
   * differently.
   */
  const said = (await response.json().catch(() => null)) as {
    message?: unknown;
    error?: unknown;
  } | null;

  const wrapped = said?.error as
    | { message?: unknown; details?: unknown }
    | undefined;

  const details = Array.isArray(wrapped?.details)
    ? wrapped.details
        .map((detail: unknown) =>
          typeof (detail as { message?: unknown })?.message === "string"
            ? ((detail as { message: string }).message)
            : null,
        )
        .filter((message): message is string => message !== null)
    : [];

  const reason = details.length
    ? details.join(". ")
    : typeof wrapped?.message === "string"
      ? wrapped.message
      : typeof said?.message === "string"
        ? said.message
        : typeof said?.error === "string"
          ? said.error
          : `The service would not save this watch (${response.status}).`;

  throw new Error(reason);
};
