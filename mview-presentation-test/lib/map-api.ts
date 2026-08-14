/*
 * Every call to the map API lives here — one file, one place to change the
 * host or the error convention.
 *
 * MAP_BASE_URL is declared in next.config.ts and overridable in .env.local, so
 * dev, staging and production differ only in that value.
 */

/** One row of a filter facet — the value and how many wells carry it. */
export type MapFilterItem = { value: string; count: number };

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
  value: string;
  /** The display name. Counties carry theirs in `value` instead. */
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
  sharePct: { oil: number; gas: number; oilGas: number };
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
