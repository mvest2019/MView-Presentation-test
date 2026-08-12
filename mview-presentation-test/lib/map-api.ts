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
