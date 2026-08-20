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

/** GET /api/v1/map/filters/operator -> { facet, items: [{ value, count }] } */
export const getOperatorListMap = async (): Promise<MapFilterItem[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/filters/operator`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.items)) {
      return data.items as MapFilterItem[];
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
