/*
 * What a shared link carries, and how a link that arrives is read back.
 *
 * A link to the map is worth little if it opens on the whole state: what
 * someone wants to send is what they were looking at — the filter, the tab,
 * the record that was open, and, with no filter to frame the map, where the
 * map was.
 *
 * None of it is written into the address while somebody browses. A page that
 * rewrites its own URL under every click hands the reader a query string they
 * never asked for, and the address bar is not where this state belongs: it is
 * a property of the link, so it is assembled when the link is made.
 */

/** The parameters `matched-wells` accepts, and the only ones we round-trip. */
export const FILTER_PARAMS = [
  "county",
  "operator",
  "wtype",
  "status",
  "play",
  "field",
] as const;

/** What a URL is asking for, or an empty object if it asks for nothing. */
export function readFilterParams(search: string): Record<string, string[]> {
  const params = new URLSearchParams(search);
  const filters: Record<string, string[]> = {};

  for (const key of FILTER_PARAMS) {
    const raw = params.get(key);
    if (!raw) continue;

    const values = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length > 0) filters[key] = values;
  }

  return filters;
}

/** What else a link carries: the tab, the open record, and the camera. */
export type ViewParams = {
  tab?: "map" | "table" | "insights";
  /** The API number whose record is open. */
  api?: string;
  /** Which basemap is underneath, where it is not the default. */
  basemap?: string;
  /**
   * The replay: a year to hold on, or "open" for a bar that has not reached
   * its first year yet.
   */
  replay?: number | "open";
  /** Where the map is, when no filter is framing it. */
  at?: { lon: number; lat: number; zoom: number };
};

const TABS = new Set(["map", "table", "insights"]);

/**
 * The basemaps the gallery offers, by Esri's own id.
 *
 * Listed rather than imported: this file is the boundary a link crosses, and
 * what it accepts should not widen because a picker somewhere gained a tile.
 * `streets` is the map's default and says nothing in a link.
 */
export const DEFAULT_BASEMAP = "streets";

const BASEMAPS = new Set([
  "satellite",
  "hybrid",
  "streets",
  "topo-vector",
  "terrain",
  "dark-gray-vector",
]);

/** Reads the view out of a URL, ignoring anything it cannot make sense of. */
export function readViewParams(search: string): ViewParams {
  const params = new URLSearchParams(search);
  const view: ViewParams = {};

  const tab = params.get("tab");
  if (tab && TABS.has(tab)) view.tab = tab as ViewParams["tab"];

  /* Only a well-formed API number: this one goes straight into a request
     path, and a link is the easiest place for a typo to arrive from. */
  const api = params.get("api");
  if (api && /^\d{2}-\d{3}-\d{5}$/.test(api)) view.api = api;

  const basemap = params.get("basemap");
  if (basemap && BASEMAPS.has(basemap)) view.basemap = basemap;

  const replay = params.get("replay");
  if (replay === "open") view.replay = "open";
  else if (replay && /^\d{4}$/.test(replay)) {
    const year = Number(replay);
    /* The Railroad Commission's records start in the 1900s; anything outside
       a plausible span is somebody editing the address by hand. */
    if (year >= 1900 && year <= 2100) view.replay = year;
  }

  const at = params.get("at");
  if (at) {
    const [lon, lat, zoom] = at.split(",").map(Number);
    if (
      Number.isFinite(lon) &&
      Number.isFinite(lat) &&
      Number.isFinite(zoom) &&
      Math.abs(lon) <= 180 &&
      Math.abs(lat) <= 90 &&
      zoom >= 1 &&
      zoom <= 20
    ) {
      view.at = { lon, lat, zoom };
    }
  }

  return view;
}

/** A point, as the tools deal in them. */
export type LinkPoint = { longitude: number; latitude: number };

/**
 * What a tool drew, if one did.
 *
 * One at a time: the map arms a single tool and each drawing replaces the
 * last, so a link carries at most one of these.
 */
export type LinkTools = {
  /** Draw an area: the rectangle, west, south, east, north. */
  area?: { west: number; south: number; east: number; north: number };
  /** Measure distance: the two ends. The length is worked out again. */
  line?: [LinkPoint, LinkPoint];
  /** Measure area: the tract's corners, in the order they were placed. */
  tract?: LinkPoint[];
  /** What's near my land: where it was clicked, and how far out. */
  near?: { at: LinkPoint; radiusMiles: number };
};

/** A flat list of finite numbers, or null if the text is not one. */
function numbers(raw: string | null, count?: number): number[] | null {
  if (!raw) return null;
  const values = raw.split(",").map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  if (count !== undefined && values.length !== count) return null;
  return values;
}

/** Longitude/latitude pairs from a flat list, if they are all in range. */
function points(values: number[]): LinkPoint[] | null {
  if (values.length < 2 || values.length % 2 !== 0) return null;

  const found: LinkPoint[] = [];
  for (let index = 0; index < values.length; index += 2) {
    const longitude = values[index];
    const latitude = values[index + 1];
    if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return null;
    found.push({ longitude, latitude });
  }
  return found;
}

const place = (value: number) => value.toFixed(5);
const pair = (point: LinkPoint) =>
  `${place(point.longitude)},${place(point.latitude)}`;

/** Reads whatever a tool left in the address, ignoring anything malformed. */
export function readToolParams(search: string): LinkTools {
  const params = new URLSearchParams(search);
  const tools: LinkTools = {};

  const area = numbers(params.get("area"), 4);
  if (area) {
    const [west, south, east, north] = area;
    if (
      Math.abs(west) <= 180 &&
      Math.abs(east) <= 180 &&
      Math.abs(south) <= 90 &&
      Math.abs(north) <= 90
    ) {
      tools.area = { west, south, east, north };
    }
  }

  const line = numbers(params.get("line"), 4);
  const ends = line && points(line);
  if (ends && ends.length === 2) tools.line = [ends[0], ends[1]];

  const tract = numbers(params.get("tract"));
  const corners = tract && points(tract);
  /* Three corners is the least that encloses anything. */
  if (corners && corners.length >= 3) tools.tract = corners;

  const near = numbers(params.get("near"), 3);
  if (near) {
    const [longitude, latitude, radiusMiles] = near;
    if (
      Math.abs(longitude) <= 180 &&
      Math.abs(latitude) <= 90 &&
      radiusMiles > 0 &&
      radiusMiles <= 100
    ) {
      tools.near = { at: { longitude, latitude }, radiusMiles };
    }
  }

  return tools;
}

/** Everything the Share menu has to put into a link. */
export type ShareState = {
  /** The applied filter, as `matched-wells` takes it. */
  filters: Record<string, string[]>;
  tab: "map" | "table" | "insights";
  /** The API number of the record that is open, if one is. */
  api: string | null;
  /** The basemap on screen. The default one is left out of the link. */
  basemap?: string;
  /**
   * The replay, if the bar is open: the year on screen, or null when it has
   * not reached one yet.
   */
  timeLapse?: { year: number | null };
  /** Where the map is. Left out of a filtered link — see below. */
  camera: { lon: number; lat: number; zoom: number };
  /** What a tool drew, so the reader gets the same box, line or tract. */
  tools?: LinkTools;
};

/**
 * The link the Share menu offers.
 *
 * Built from the page's own state onto a bare path, so it is unaffected by
 * whatever the address happens to hold — including the parameters of the link
 * this page was itself opened from, which may since have been cleared.
 *
 * A filtered link leaves the camera out: the filter frames the map by itself
 * on the other end, and a remembered centre would arrive first and be
 * overruled a moment later, which reads as the page jumping on open.
 */
export function shareUrl(state: ShareState): string {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.pathname, window.location.origin);

  let filtered = false;
  for (const key of FILTER_PARAMS) {
    const values = state.filters[key];
    if (!values || values.length === 0) continue;
    url.searchParams.set(key, values.join(","));
    filtered = true;
  }

  /* The map is the default, so it says nothing in the link. */
  if (state.tab !== "map") url.searchParams.set("tab", state.tab);
  if (state.api) url.searchParams.set("api", state.api);
  if (state.basemap && state.basemap !== DEFAULT_BASEMAP) {
    url.searchParams.set("basemap", state.basemap);
  }
  if (state.timeLapse) {
    url.searchParams.set(
      "replay",
      state.timeLapse.year === null ? "open" : String(state.timeLapse.year),
    );
  }

  if (!filtered) {
    url.searchParams.set(
      "at",
      `${state.camera.lon.toFixed(4)},${state.camera.lat.toFixed(4)},${
        state.camera.zoom
      }`,
    );
  }

  /* Five decimals is about a metre — finer than anything drawn by hand on a
     map, and short enough to keep the link readable. */
  const tools = state.tools;
  if (tools?.area) {
    const { west, south, east, north } = tools.area;
    url.searchParams.set(
      "area",
      [west, south, east, north].map(place).join(","),
    );
  }
  if (tools?.line) {
    url.searchParams.set("line", tools.line.map(pair).join(","));
  }
  if (tools?.tract && tools.tract.length >= 3) {
    url.searchParams.set("tract", tools.tract.map(pair).join(","));
  }
  if (tools?.near) {
    url.searchParams.set(
      "near",
      `${pair(tools.near.at)},${tools.near.radiusMiles}`,
    );
  }

  return url.toString();
}
