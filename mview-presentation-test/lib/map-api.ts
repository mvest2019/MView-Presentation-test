/*
 * Every call to the map API lives here — one file, one place to change the
 * host or the error convention.
 *
 * MAP_BASE_URL is declared in next.config.ts and overridable in .env.local, so
 * dev, staging and production differ only in that value.
 */

/** GET /api/v1/map/counties -> { counties: string[] } */
export const getCountyListMap = async (): Promise<string[]> => {
  try {
    const response = await fetch(
      `${process.env.MAP_BASE_URL}/api/v1/map/counties`,
    );
    const data = await response.json();

    if (response.ok && Array.isArray(data?.counties)) {
      return data.counties as string[];
    } else {
      throw new Error("Failed to fetch county list");
    }
  } catch (error) {
    throw new Error(String(error) || "Failed to fetch county list");
  }
};

/** One row of a filter facet — the value and how many wells carry it. */
export type MapFilterItem = { value: string; count: number };

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
