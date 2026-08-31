"use client";

import { MapPin, TriangleAlert } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { AreaSelectionBar } from "./area-selection";
import { loadArcgisModules } from "./arcgis-loader";
import { ClusterTooltip } from "./cluster-tooltip";
import { SampleBanner } from "./sample-banner";
import { WellInsightsPanel, type SelectedWell } from "./well-insights-panel";
import { MapChrome, type ViewTab } from "./map-chrome";
import { MeasureAreaPanel, type AreaMeasurement } from "./measure-area-panel";
import { ToolDemo, type DemoTool } from "./tool-demo";
import { MapToast } from "./map-toast";
import { MeasureBar } from "./measure-bar";
import {
  NEARBY_RADII,
  NearbyPanel,
  NearbyPrompt,
  type NearbyAnswer,
  type NearbyLease,
} from "./nearby-panel";
import {
  getClusterListMap,
  getLegendListMap,
  getLeaseNearbyMap,
  getMatchedWellsMap,
  getWellSummaryMap,
  getWellListMap,
  type MapTableRow,
  type MapWell,
} from "@/lib/map-api";

import {
  buildClusterGraphics,
  clusterDiameter,
  mercatorToLatitude,
  mercatorToLongitude,
  toWellCluster,
  type WellCluster,
} from "./cluster-graphics";
import {
  downloadNearbyFilings,
  boxArea,
  measureTract,
  nearestWellsTo,
  wellsInArea,
  wellsInBox,
  METRES_PER_MILE,
  type Area,
  type GeodesicUtils,
  type LonLat,
  type Nearby,
  type PointCtor,
} from "./map-measurements";

import { exportVisible } from "./map-export";
import { readFilterParams, writeFilterParams } from "./filter-url";
import { ToolPrompt } from "./tool-prompt";
import { buildWellGraphics } from "./well-graphics";
import { TimeLapseBar } from "./time-lapse-bar";
import {
  datedCount,
  wellsUpTo,
  yearsIn,
  type TimeLapseYear,
} from "./timelapse";
import { WellTooltip, type HoveredWell } from "./well-tooltip";

import { WellsTable } from "./wells-table";

/*
 * The explorer: an Esri `MapView` on Esri's terrain basemap with the well-count
 * bubbles drawn over it, and the mock's chrome floating on top.
 *
 * The SDK arrives through an AMD `require` rather than an import, so it comes
 * in untyped. Only the members this file touches are described below; symbols
 * and geometries are left to ArcGIS's autocasting, which is why no symbol
 * modules are loaded.
 */

interface EsriMap {
  /** Assigning a well-known id is enough — ArcGIS autocasts the string. */
  basemap: unknown;
}

interface EsriHandle {
  remove(): void;
}

/** A drag on the map surface. `origin` is where the pointer went down. */
type EsriDragEvent = {
  action: "start" | "update" | "end";
  x: number;
  y: number;
  origin: { x: number; y: number };
  stopPropagation(): void;
};

interface EsriView {
  scale: number;
  zoom: number;
  /** Viewport size in pixels; 0 until the view has a laid-out container. */
  width: number;
  height: number;
  /** The visible rectangle, in the basemap's spatial reference. */
  extent: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  } | null;
  center: { longitude: number; latitude: number };
  when(): Promise<unknown>;
  watch(paths: string | string[], callback: () => void): EsriHandle;
  on(event: "drag", handler: (event: EsriDragEvent) => void): EsriHandle;
  on(
    event: "immediate-click",
    handler: (event: EsriClickEvent) => void,
  ): EsriHandle;
  on(
    event: "pointer-move",
    handler: (event: { x: number; y: number }) => void,
  ): EsriHandle;
  /* Where the pointer went down — the anchor a drawn box needs, which
     `DragEvent.origin` does not reliably give. */
  on(
    event: "pointer-down",
    handler: (event: { x: number; y: number }) => void,
  ): EsriHandle;
  /* The pointer left the map surface — onto a panel, or off the window. */
  on(event: "pointer-leave", handler: () => void): EsriHandle;
  toMap(screenPoint: { x: number; y: number }): LonLat | null;
  toScreen(mapPoint: unknown): { x: number; y: number } | null;
  /** What is under a screen point. `include` narrows it to one layer. */
  hitTest(
    screenPoint: { x: number; y: number },
    options?: { include?: unknown },
  ): Promise<{
    results: { graphic?: { attributes?: Record<string, unknown> } }[];
  }>;
  /* `options` carries `{ animate: false }` where a move must not be
     interruptible — see the filter fit. */
  goTo(target: unknown, options?: { animate?: boolean }): Promise<unknown>;
  /** Captures the map surface only — the React chrome is not in the canvas. */
  takeScreenshot(options?: {
    format?: "png" | "jpg";
    quality?: number;
  }): Promise<{ dataUrl: string }>;
  destroy(): void;
}

interface EsriGraphicsLayer {
  addMany(graphics: unknown[]): void;
  removeAll(): void;
  add(graphic: unknown): void;
}

type EsriClickEvent = {
  mapPoint: LonLat | null;
  /** Screen position within the view container. */
  x: number;
  y: number;
  stopPropagation(): void;
};

type MapCtor = new (props: { basemap: string; layers?: unknown[] }) => EsriMap;

type MapViewCtor = new (props: {
  container: HTMLDivElement;
  map: EsriMap;
  center: [number, number];
  scale: number;
  constraints?: { minZoom?: number; maxZoom?: number; snapToZoom?: boolean };
  ui?: { components: string[] };
}) => EsriView;

type GraphicsLayerCtor = new (props?: { id?: string }) => EsriGraphicsLayer;

interface EsriExtent {
  union(other: EsriExtent): EsriExtent;
  expand(factor: number): EsriExtent;
}

interface EsriGeoJSONLayer {
  /** Client-side query over the loaded features. */
  queryExtent(query: {
    where: string;
  }): Promise<{ count: number; extent: EsriExtent | null }>;
}

type GeoJSONLayerCtor = new (
  props: Record<string, unknown>,
) => EsriGeoJSONLayer;

type GraphicCtor = new (props: Record<string, unknown>) => unknown;

/**
 * The mock's opening view — its readout reads 31.2534, -100.0199 at
 * 1:7,262,011. That scale sits between zoom 6 and 7, so the view is set by
 * scale with `snapToZoom` off rather than by zoom level, or it would jump to
 * the nearest LOD and the readout would no longer match.
 */
const HOME_CENTER: [number, number] = [-100.0199, 31.2534];
const HOME_SCALE = 7_262_011;

/*
 * The mock's scale was drawn for a desktop canvas. On a phone the viewport is
 * a third of the width, so the same scale opens on the middle of Texas with
 * the coast and the panhandle both off-screen — the shape people orient by is
 * exactly what gets cropped. Narrow screens open further out instead.
 *
 * Read at view-creation time rather than watched: this is the opening view,
 * and a rotation should not throw away wherever someone has panned to.
 */
const HOME_SCALE_TABLET = 9_800_000;
const HOME_SCALE_PHONE = 13_500_000;

function homeScale(): number {
  if (typeof window === "undefined") return HOME_SCALE;
  if (window.matchMedia("(max-width: 767px)").matches) return HOME_SCALE_PHONE;
  if (window.matchMedia("(max-width: 1023px)").matches)
    return HOME_SCALE_TABLET;
  return HOME_SCALE;
}

/*
 * Boundary overlays, served as GeoJSON from Cloudinary.
 *
 * The counties are split across nine files: one file of that size blocks the
 * first paint, and nine requests the browser runs in parallel do not. They are
 * built in a loop and handed to the map together, so the map starts all nine
 * at once rather than waiting on each in turn.
 */
const DISTRICT_LAYER_URL =
  "https://res.cloudinary.com/mview/raw/upload/districts_-_Copy_jtgkgf.txt";
const COUNTY_LAYER_URL = (index: number) =>
  `https://res.cloudinary.com/mview/raw/upload/maps/newcounty${index}.txt`;
const COUNTY_LAYER_COUNT = 9;

/** County lines stay hidden above this scale — statewide they are a smear. */
const COUNTY_MIN_SCALE = 4_000_000;

/** A measured line and its ellipsoidal length in metres. */
type Measurement = { from: LonLat; to: LonLat; meters: number };

/** Which map tool is armed. One at a time. */
type ActiveTool =
  | "draw-area"
  | "measure-distance"
  | "whats-near-my-land"
  | "measure-area"
  | null;

/**
 * A watched spot: where, how far out, and what is inside. The stats live here
 * rather than being derived at render time, because working them out needs the
 * Esri modules, and those are held in a ref.
 */

/** Vertices around a watch circle. 6° steps read as smooth at any zoom. */
const CIRCLE_STEP_DEGREES = 6;

/** The radius the watch card opens on, matching the mock. */
/**
 * Insights opens on an even split. The bounds stop the drag from collapsing
 * either side to nothing — a map you cannot see is not a map, and the summary
 * cards stop making sense much under a quarter of the page.
 */
const DEFAULT_SPLIT = 0.5;

/*
 * Stacked, the summary takes the screen and the map keeps a strip.
 *
 * Side by side the two are read together, but on a phone the Summary tab is
 * opened to read the record — the map above it is there to say which well is
 * being read, not to be panned around. Just over a quarter is enough for
 * that and leaves the cards the rest, which are the point of the tab; the
 * divider still drags if someone wants more map.
 */
const STACKED_DEFAULT_SPLIT = 0.27;
const MIN_SPLIT = 0.22;
const MAX_SPLIT = 0.78;

/** Fraction of the width one arrow-key press moves the divider. */
const SPLIT_KEY_STEP = 0.02;

/** Where clicking a well-count bubble settles — county-ish. */
/*
 * The zoom levels at which the bubbles are re-requested.
 *
 * Not on every move: the API re-aggregates for the bbox it is given, so a pan
 * at the same zoom returns the same cells, and a request per pan would be
 * traffic for nothing. Crossing one of these levels is what changes the
 * aggregation enough to be worth asking again — so zoom 5 loads, 5→6 and 6→7
 * do not, and reaching 8 loads again for whatever is now on screen.
 */
const CLUSTER_ZOOM_STEPS = [5, 8];

/*
 * How long one year of the replay holds.
 *
 * Slow enough to watch a field fill in rather than flash. The handle under the
 * bar is there for anyone who wants to move faster than this.
 */
const TIME_LAPSE_TICK_MS = 420;

/*
 * Where the bubbles give way to the wells themselves. Past this the extent is
 * small enough that the count is manageable and an aggregate says less than
 * the individual holes do.
 */
const WELL_ZOOM = 10;

/*
 * The zoom at which the wells give way again, this level included.
 *
 * The band is asymmetric for the same reason the cluster bands are: the wells
 * arrive at 10, but a step back to 9 is still looking at the same ground, and
 * swapping a field of wells for bubbles because the readout ticked over reads
 * as the map losing its place. So the wells hold at 9 and the sub-clusters
 * come back at 8, which is where they started.
 */
const WELL_LEAVE_ZOOM = 8;

/*
 * The spread, in degrees, that separates a local filter from a scattered one.
 *
 * Three degrees is roughly two hundred miles — a county, a field, or one
 * operator's patch fits inside that; three counties picked from opposite ends
 * of the state do not. Both are framed; this only decides how far out the map
 * is allowed to go to do it.
 */
const FILTER_FIT_MAX_DEGREES = 3;

/** Below this the extent is a point, and this stands in for it. */
const FILTER_FIT_MIN_DEGREES = 0.05;

/** Metres in a degree of latitude, near enough for choosing a scale. */
const DEGREE_METRES = 111_320;

/**
 * What the filters rail covers, in pixels: its 252px card and the 12px inset.
 *
 * The map runs the full width of the page and the rail floats over its left
 * edge, so the part of it anyone can see is this much narrower. A frame that
 * ignores it puts the western end of a wide selection under the panel — which
 * is exactly what "it only zoomed to one county" looks like.
 */
const FILTERS_RAIL_WIDTH = 264;

/** One well, framed: close enough to read the lease lines around it. */
const SINGLE_WELL_SCALE = 9_000;

/**
 * Where the map is put when more than one county is asked for.
 *
 * Zoom 5 is the level the state is read at — the one the map opens on — so
 * every county in the selection is on screen whether they are neighbours or
 * at opposite ends of Texas, and the reader is somewhere they recognise
 * rather than at whatever scale an extent happened to work out to.
 */
const MULTI_COUNTY_ZOOM = 5;

/** The furthest out Apply may leave a local filter — about zoom 8. */
const FILTER_FIT_MAX_SCALE = 1_100_000;

/**
 * And the furthest out a scattered one may go: the state, near enough.
 *
 * Wider than this is ocean and Mexico. A filter whose wells genuinely span
 * Texas has to be shown at the size of Texas.
 */
const FILTER_FIT_WIDE_SCALE = 13_500_000;

/*
 * The highlight ring. It sits just outside a 10px well icon and breathes out
 * to a little over half again, which catches the eye without covering the
 * wells around it.
 */
const PULSE_MIN_SIZE = 16;
const PULSE_MAX_SIZE = 26;
const PULSE_FRAMES = 26;
const PULSE_INTERVAL_MS = 45;

/*
 * The zoom at which the bubbles are dropped, this level included.
 *
 * Zooming out from 5 to 4 is still looking at the same wells from further
 * away, so what is drawn stays. By 3 the whole of Texas is a few hundred
 * pixels across: the bubbles overlap into one green mass that describes
 * nothing, so at this level and below they come off.
 */
const CLUSTER_CLEAR_ZOOM = 3;

/**
 * Which band a zoom falls in. Same band, same bubbles, no request.
 *
 * Tier 0 is everything below the first step: further out than zoom 5 the whole
 * state is a handful of cells and the answer is not worth asking for, so
 * nothing is requested until the map is at least that close.
 */
/**
 * The zoom level as the reader sees it.
 *
 * `view.zoom` is fractional between levels, and the readout under the zoom
 * buttons rounds it. Every band this file switches on — where the bubbles
 * split, where the wells appear — has to round the same way, or the map
 * disagrees with the number it is showing: at `view.zoom` 9.6 the readout said
 * Zoom 10 while `9.6 >= 10` was false, so no wells were drawn until the next
 * step, and the wells looked as though they began at 11.
 */
function zoomLevel(view: { zoom?: number } | null | undefined): number {
  return Math.round(view?.zoom ?? 0);
}

function clusterZoomTier(zoom: number): number {
  return CLUSTER_ZOOM_STEPS.filter((step) => zoom >= step).length;
}

/**
 * The band to be in, given the zoom and the band already showing.
 *
 * The two directions are not the same, on purpose. Going in, the sub-clusters
 * arrive at 8, as the readout says. Coming back out they stay until 5 — a step
 * back from 8 to 7 is still looking at the same ground, and reloading the
 * coarse bubbles for it means a request and a flicker for a move that changed
 * nothing. So 6 and 7 keep whichever band is already drawn, and only 5 puts
 * the coarse bubbles back.
 *
 * The effect is that zooming out retraces what you saw on the way in rather
 * than re-deciding at every step.
 */
function nextClusterTier(zoom: number, current: number): number {
  /* 8 and closer: the finer bubbles, whichever way you arrived. */
  if (zoom >= CLUSTER_ZOOM_STEPS[1]) return 2;

  /* 6 and 7: whatever is already on the map stays on it. */
  if (zoom > CLUSTER_ZOOM_STEPS[0]) return current >= 2 ? 2 : 1;

  /* 5 exactly: back to the coarse bubbles. */
  if (zoom >= CLUSTER_ZOOM_STEPS[0]) return 1;

  return 0;
}

/**
 * How far outside the loaded extent counts as the same ground, in degrees.
 *
 * A ten-thousandth of a degree is about 11 metres — under a pixel at any zoom
 * the wells are drawn at, and enough to absorb the rounding between one
 * settled extent and the next.
 */
const EXTENT_EPSILON = 0.0001;

/**
 * How many wells out from the click to try before giving up on the lease.
 *
 * Records without a lease number are common enough that the nearest well alone
 * fails often; four is enough to get past a run of them without turning one
 * click into a burst of requests. They are tried in order and it stops at the
 * first that answers, so the usual cost is one.
 */
const LEASE_TRIES = 4;

type ScreenPoint = { x: number; y: number };

/** A bubble on screen: where its top edge is, and how wide it is. */
type BubbleAnchor = ScreenPoint & { bubble: number };

/**
 * The dashed blue every tool draws in.
 *
 * All four, since the demonstration window shows all four in it: the tract and
 * the watch circle used to be drawn in the map's mint green, which is the
 * colour the wells and the clusters are. A gesture the reader is making should
 * not be the same colour as the data they are making it over.
 */
const TOOL_BLUE: [number, number, number] = [37, 99, 235];

/**
 * Esri's Streets basemap.
 *
 * `"streets"` rather than `"streets-vector"` so it matches the id on the
 * gallery's Streets tile — otherwise the picker opens with nothing marked as
 * current, even though Streets is what is on screen.
 */
/*
 * Which tools have already shown their worked example, in this browser.
 *
 * Per tool, not one flag for all four: knowing how a box is dragged says
 * nothing about how a tract is closed. Kept in `localStorage` because it is a
 * convenience, not state anything depends on — a reader who clears their
 * storage, or arrives on another machine, simply sees the example again.
 */
const DEMO_SEEN_KEY = "mv-map-tool-demo-seen";

function demoSeen(tool: DemoTool): boolean {
  try {
    const seen = window.localStorage.getItem(DEMO_SEEN_KEY);
    return seen ? (JSON.parse(seen) as string[]).includes(tool) : false;
  } catch {
    /* Private windows and blocked site data throw on read. Showing the
       example again is the harmless answer. */
    return false;
  }
}

function rememberDemo(tool: DemoTool): void {
  try {
    const seen = window.localStorage.getItem(DEMO_SEEN_KEY);
    const list = seen ? (JSON.parse(seen) as string[]) : [];
    if (list.includes(tool)) return;
    window.localStorage.setItem(DEMO_SEEN_KEY, JSON.stringify([...list, tool]));
  } catch {
    /* Nothing to do: the example will simply be shown again next time. */
  }
}

const DEFAULT_BASEMAP = "streets";

const SCREENSHOT_FILENAME = "mineral-view-map.png";

/**
 * `goTo` returns a promise that *rejects* when its animation is interrupted —
 * a second click, a drag, a scroll-wheel zoom part way through. That is normal
 * use, not a failure, but left unhandled it surfaces as an unhandled rejection
 * and Next's dev overlay throws an error card over the map, which makes a
 * working button look broken.
 */
/**
 * Where a set of wells really is, ignoring strays.
 *
 * Takes the 2nd and 98th percentile on each axis instead of the outright
 * minimum and maximum: a handful of bad coordinates in a county's worth of
 * wells would otherwise define the frame, and the frame would be the state.
 */
function trimmedBox(wells: MapWell[]) {
  if (wells.length === 0) return null;

  const at = (values: number[], fraction: number) =>
    values[
      Math.min(
        values.length - 1,
        Math.max(0, Math.round(fraction * (values.length - 1))),
      )
    ];

  const lons = wells.map((well) => well.lon).sort((a, b) => a - b);
  const lats = wells.map((well) => well.lat).sort((a, b) => a - b);

  return {
    west: at(lons, 0.02),
    east: at(lons, 0.98),
    south: at(lats, 0.02),
    north: at(lats, 0.98),
  };
}

function subscribeToFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

/*
 * Below lg the Insights split runs top-to-bottom instead of side-by-side —
 * half of a phone or tablet's width is no width at all, for the map or for
 * the cards.
 *
 * The split's geometry is an inline percentage, so a media query cannot reach
 * it; the breakpoint has to be a value React can branch on. It is read live
 * rather than once on mount because the map measures itself against this
 * wrapper — `view.toScreen`, the tool bars and every anchored overlay — so a
 * rotation that changed the axis without re-rendering would put the map's idea
 * of its own bounds a screen away from the truth.
 */
const STACK_QUERY = "(max-width: 1023px)";

function subscribeToStackQuery(onChange: () => void) {
  const query = window.matchMedia(STACK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Fullscreen is refused without a real user gesture, and can be blocked by
 * permissions policy in an iframe. Both reject, and an uncaught rejection puts
 * Next's dev error card over the map.
 */
function reportFullscreenFailure(error: unknown): void {
  console.error("Could not switch full screen.", error);
}

function ignoreInterrupted(error: unknown): void {
  if ((error as { name?: string } | null)?.name !== "view:goto-interrupted") {
    console.error("Map navigation failed.", error);
  }
}

/** The rectangle two opposite corners describe, whichever way round they are. */
function boxBetween(a: LonLat, b: LonLat): Area {
  return {
    west: Math.min(a.longitude, b.longitude),
    east: Math.max(a.longitude, b.longitude),
    south: Math.min(a.latitude, b.latitude),
    north: Math.max(a.latitude, b.latitude),
  };
}

type Status = "loading" | "ready" | "error";

export function MapExplorerView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EsriView | null>(null);
  const countyLayersRef = useRef<EsriGeoJSONLayer[]>([]);
  /*
   * The bubbles currently on the map. Held in a ref as well as state: the Esri
   * handlers below are registered once and close over their first render, so
   * hit-testing and the tool maths read the ref, while the hover card — which
   * is React — reads the state.
   */
  const clusterLayerRef = useRef<EsriGraphicsLayer | null>(null);
  const wellLayerRef = useRef<EsriGraphicsLayer | null>(null);
  /* Legend description -> icon URL, so a well draws its legend's symbol. */
  const wellIconsRef = useRef<Map<string, string>>(new Map());
  const wellRequestRef = useRef(0);
  /* The wells last loaded, for the export — the layer holds graphics, not rows. */
  const wellsRef = useRef<MapWell[]>([]);
  /**
   * The extent the wells in hand were fetched for.
   *
   * Kept so a zoom inside it can be answered without asking the service again
   * — see `loadWells`. Null whenever the wells are cleared.
   */
  const wellsBoxRef = useRef<{
    west: number;
    south: number;
    east: number;
    north: number;
  } | null>(null);
  const clustersRef = useRef<WellCluster[]>([]);
  const [clusters, setClusters] = useState<WellCluster[]>([]);
  /*
   * The individual wells on the map, mirrored into state.
   *
   * The ref is what the Esri handlers read; this is what React renders from —
   * the drawn-area bar has to count what is actually on screen, and past the
   * well zoom that is these and not the bubbles.
   */
  const [wells, setWells] = useState<MapWell[]>([]);
  const [clustersLoading, setClustersLoading] = useState(true);
  const [clusterError, setClusterError] = useState<string | null>(null);
  const [wellsLoading, setWellsLoading] = useState(false);
  const [wellError, setWellError] = useState<string | null>(null);
  /*
   * A filter ran and matched nothing.
   *
   * Not an error — the service answered, and the answer was none — but it has
   * to stay on screen while it is true. An empty map with nothing said about
   * it reads as a fault in the page.
   */
  const [noMatches, setNoMatches] = useState(false);

  /*
   * Bumped to put the filters panel back to nothing.
   *
   * It is the panel's `key`: changing it builds a new panel, which is the one
   * move that clears every box, the typed search and the rows a search
   * picked, in step. Nothing else can reach inside it from here.
   */
  const [filterResetAt, setFilterResetAt] = useState(0);

  /** The wait between saying nothing matched and undoing it. */
  const emptyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (emptyResetRef.current) clearTimeout(emptyResetRef.current);
    },
    [],
  );
  /* Only the newest answer may be drawn, whichever order they arrive in. */
  const clusterRequestRef = useRef(0);
  /* The zoom band the bubbles on screen were loaded for. */
  const clusterTierRef = useRef(-1);
  /*
   * True while a filter is applied. The zoom watcher steps aside then: the
   * wells on screen are the filter's answer, and reloading bubbles or extent
   * wells over them would wipe it out — which is exactly what happened, since
   * clearing the bubbles resets the tier and the next view change reloaded
   * them straight back.
   */
  const filteredRef = useRef(false);
  const mapRef = useRef<EsriMap | null>(null);

  // Tracked through the browser rather than our own state: Escape and the
  // browser's own chrome can leave fullscreen without going through the button.
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );

  const stacked = useSyncExternalStore(
    subscribeToStackQuery,
    () => window.matchMedia(STACK_QUERY).matches,
    () => false,
  );

  const [status, setStatus] = useState<Status>("loading");
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP);
  const [viewTab, setViewTab] = useState<ViewTab>("map");

  /*
   * The filter the address arrived with, if any.
   *
   * Read once, on the first render: it is the opening state, not something to
   * re-read as the URL is rewritten by every later Apply.
   */
  const [openingFilters] = useState<Record<string, string[]>>(() =>
    typeof window === "undefined" ? {} : readFilterParams(window.location.search),
  );

  /*
   * Where the map's two notices sit from `lg` up.
   *
   * On the Map tab the toolbar is held to the right of a full-width map, so
   * the top left is clear and the line reads where the eye already is. In
   * Insights the map is half the page and the toolbar starts near its left
   * edge — the same spot puts the line straight under it — so there it goes
   * below the toolbar, centred on the map.
   */
  const noticePlacement =
    viewTab === "map"
      ? "lg:left-[288px] lg:top-4 lg:translate-x-0"
      : "lg:top-[76px]";
  const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT);
  /*
   * Until the divider is actually moved the ratio is the axis's own default,
   * not the stored number — the stacked and side-by-side defaults differ, and
   * `useState` cannot pick between them because the breakpoint is not known
   * until after hydration.
   */
  const [splitTouched, setSplitTouched] = useState(false);
  const draggingSplitRef = useRef(false);

  /*
   * Area drawing. The Esri drag handler is registered once and outlives every
   * render, so what it needs — whether the tool is armed, the area so far — is
   * held in refs; the state beside each ref exists only to re-render the React
   * side. `areaLayer` and `ctors` are filled in once the SDK has loaded.
   */
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [areaAnchor, setAreaAnchor] = useState<ScreenPoint | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [measureAnchor, setMeasureAnchor] = useState<ScreenPoint | null>(null);
  const [tractResult, setTractResult] = useState<AreaMeasurement | null>(null);
  const tractRef = useRef<LonLat[]>([]);
  const tractLayerRef = useRef<EsriGraphicsLayer | null>(null);

  const [nearby, setNearby] = useState<Nearby | null>(null);
  /*
   * Whether the lease card is open — kept apart from which tool is armed.
   *
   * Arming ends at the first map click, and that click is a legitimate thing
   * to do while the card is up: the circle is the other way of asking. Tying
   * the card to `activeTool` meant a stray click threw away the lease and the
   * answer it had already fetched.
   */
  const [leaseNearbyOpen, setLeaseNearbyOpen] = useState(false);
  /*
   * Which tool is being demonstrated, if any.
   *
   * Every tool opens with one, in a window rather than on the live map: the two
   * used to share one surface, so the demonstration landed on the reader's own
   * view and had to be cleared before they could do anything. Closing it arms
   * the tool on a map with nothing on it.
   */
  const [demoTool, setDemoTool] = useState<DemoTool | null>(null);
  /** The distance being asked about — one of the service's own rings. */
  const [watchRadius, setWatchRadius] = useState<number>(NEARBY_RADII[0]);
  /*
   * The lease under the point that was clicked, once it is known.
   *
   * The service answers by lease, and a click is a point — so the lease has to
   * be found first: the nearest loaded well, then that well's record, which
   * carries the district and the lease number the key is made of. Null until
   * it comes back, and while it is null the card shows its search instead.
   */
  /**
   * The lease the click was traced to, and what the service said about it.
   *
   * Two states rather than one because they arrive separately: the lease comes
   * from the nearest well's record, then the ring is asked for. `problem`
   * carries either failure — a click that could not be traced to a lease, or a
   * lease the service could not answer for — because to the reader they are the
   * same thing: no answer, and a reason.
   */
  const [watchLease, setWatchLease] = useState<NearbyLease | null>(null);
  const [watchAnswer, setWatchAnswer] = useState<NearbyAnswer>({
    kind: "looking",
  });
  /** Guards against a slower lookup landing after a newer click. */
  const leaseRequestRef = useRef(0);
  /**
   * Cluster under the pointer, with its bubble's top edge on screen and how
   * tall the bubble is — the card needs the height to flip below it when there
   * is no room above.
   */
  const [hoveredCluster, setHoveredCluster] = useState<{
    index: number;
    x: number;
    y: number;
    bubble: number;
  } | null>(null);
  const hoveredClusterRef = useRef<{
    index: number;
    x: number;
    y: number;
    bubble: number;
  } | null>(null);
  /*
   * The time-lapse.
   *
   * It replays the wells the map is already holding, grouped by the year in
   * each well's `recompletionDate`. No request of its own: the set on screen
   * is the set that replays, so filtering or zooming first changes what you
   * are watching.
   */
  const [timeLapseOpen, setTimeLapseOpen] = useState(false);
  const [timeLapsePlaying, setTimeLapsePlaying] = useState(false);
  /* Which year is on screen, as an index into `timeLapseYears`. -1 is before
     the first: an empty map, where the replay starts. */
  const [timeLapseStep, setTimeLapseStep] = useState(-1);
  /* The same step the interval works from — the callback cannot read state,
     since it closes over the value it started with. */
  const timeLapseStepRef = useRef(-1);
  const [timeLapseYears, setTimeLapseYears] = useState<TimeLapseYear[]>([]);
  const timeLapseYearsRef = useRef<TimeLapseYear[]>([]);
  /* Every well that was on the map when it opened, put back on close. */
  const timeLapseAllRef = useRef<MapWell[]>([]);
  /* Wells with no date, counted once on open for the bar to report. */
  const [timeLapseUndated, setTimeLapseUndated] = useState(0);
  /* Read by the zoom watcher, which must not reload wells over a replay — a
     ref because the watcher is registered once and never re-reads state. */
  const timeLapseRef = useRef(false);

  /*
   * The well clicked on the map. Held as a ref, not state: nothing in React
   * renders it — the highlight is a graphic on the map, drawn by the same
   * handler that picks it.
   */
  /** The well picked on the map. Swaps the statewide summary for its own. */
  const [selectedWell, setSelectedWell] = useState<SelectedWell | null>(null);
  const highlightLayerRef = useRef<EsriGraphicsLayer | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  /** Well under the pointer, once the map is close enough to draw them. */
  const [hoveredWell, setHoveredWell] = useState<HoveredWell | null>(null);
  const hoveredWellRef = useRef<HoveredWell | null>(null);
  /* Hit-testing is async; only the newest answer may be shown. */
  const wellHoverRef = useRef(0);

  /** Undefined while the county lookup is in flight. */
  /** Guards against a slow lookup landing after a newer pick. */

  const activeToolRef = useRef<ActiveTool>(null);
  /*
   * Which tool's drawing on screen is the sample it drew for you, if any.
   *
   * One field rather than a flag per tool: only one tool draws at a time, so
   * two of them could never be samples at once.
   */
  const [sampleOf, setSampleOf] = useState<ActiveTool>(null);
  /** The sample box's own animation, so anything can call it off. */
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const areaRef = useRef<Area | null>(null);
  const measurementRef = useRef<Measurement | null>(null);
  const nearbyRef = useRef<Nearby | null>(null);
  const areaLayerRef = useRef<EsriGraphicsLayer | null>(null);
  /*
   * The first corner of a box being drawn by clicks, if there is one.
   *
   * Draw an area was drag-only, which is the one gesture the other tools do
   * not use — Measure area is corner-by-corner and the watch tool is a single
   * click — so a click on the map did nothing at all and the tool looked
   * broken. Both gestures work now: drag a box, or click two corners.
   */
  const areaStartRef = useRef<LonLat | null>(null);

  /*
   * Where the pointer actually went down, in view coordinates.
   *
   * Not `DragEvent.origin`: that is where Esri decided a drag had started,
   * which is the first event past its movement threshold. Drag quickly and
   * that is already well along the path, so a box anchored on it came out
   * offset from the gesture that drew it — the far corner tracked the pointer
   * while the near one sat somewhere in the middle.
   */
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const measureLayerRef = useRef<EsriGraphicsLayer | null>(null);
  const nearbyLayerRef = useRef<EsriGraphicsLayer | null>(null);
  const ctorsRef = useRef<{
    Graphic: GraphicCtor;
    Point: PointCtor;
    geodesic: GeodesicUtils;
  } | null>(null);
  /**
   * The one-line confirmation over the map, or null.
   *
   * Applying a filter reloads the wells and often moves the view; when the
   * matches are somewhere else the reader sees a map that has changed under
   * them and no word about it. The toast clears itself — see `map-toast.tsx`.
   */
  const [toast, setToast] = useState<string | null>(null);

  /**
   * Whether the feature guide is over the map.
   *
   * Its own flag rather than a fourth view tab: the guide is something to read
   * about the explorer, not another way of looking at the wells, and the tab
   * state carries per-tab things — which filters panel is open, which record is
   * selected — that a page of prose has no use for. The map stays mounted
   * underneath, so closing it returns the exact view that was left.
   */
  const [readout, setReadout] = useState({
    scale: HOME_SCALE,
    zoom: 6,
    center: { longitude: HOME_CENTER[0], latitude: HOME_CENTER[1] },
  });

  /**
   * Redraws the dashed rectangle. Declared above the effect that installs the
   * drag handler, because that handler calls it.
   */
  const drawArea = useCallback((next: Area | null) => {
    const layer = areaLayerRef.current;
    const ctors = ctorsRef.current;
    if (!layer || !ctors) return;

    layer.removeAll();
    if (!next) return;

    layer.add(
      new ctors.Graphic({
        geometry: {
          type: "polygon",
          rings: [
            [
              [next.west, next.north],
              [next.east, next.north],
              [next.east, next.south],
              [next.west, next.south],
              [next.west, next.north],
            ],
          ],
          spatialReference: { wkid: 4326 },
        },
        symbol: {
          type: "simple-fill",
          /* Enough wash to lift the shape off a dense field without hiding the
             wells inside it — they are the reason it was drawn. At 22% over a
             1.5px dash it disappeared into a few thousand well symbols. */
          color: [255, 255, 255, 0.35],
          outline: { color: TOOL_BLUE, width: 2.5, style: "dash" },
        },
      }),
    );
  }, []);

  /*
   * The frame the next `setArea` is waiting on.
   *
   * Esri's drag fires faster than the browser paints, and each one used to
   * re-render the whole view. Coalescing to one update per frame keeps the
   * card live without asking React to do work that is thrown away.
   */
  const areaFrameRef = useRef<number | undefined>(undefined);

  /** The box, drawn now; the card, updated on the next frame. */
  const trackArea = useCallback(
    (next: Area | null) => {
      areaRef.current = next;
      /* Every event: this is the outline under the pointer, and anything less
         than every event is what made it lag. */
      drawArea(next);

      if (areaFrameRef.current !== undefined) {
        cancelAnimationFrame(areaFrameRef.current);
      }
      areaFrameRef.current = requestAnimationFrame(() => {
        areaFrameRef.current = undefined;
        setArea(next);
      });
    },
    [drawArea],
  );

  /** Redraws the measured line and its two end dots. */
  const drawMeasurement = useCallback((next: Measurement | null) => {
    const layer = measureLayerRef.current;
    const ctors = ctorsRef.current;
    if (!layer || !ctors) return;

    layer.removeAll();
    if (!next) return;

    layer.add(
      new ctors.Graphic({
        geometry: {
          type: "polyline",
          paths: [
            [
              [next.from.longitude, next.from.latitude],
              [next.to.longitude, next.to.latitude],
            ],
          ],
          spatialReference: { wkid: 4326 },
        },
        symbol: {
          type: "simple-line",
          color: TOOL_BLUE,
          width: 1.5,
          style: "dash",
        },
      }),
    );

    for (const end of [next.from, next.to]) {
      layer.add(
        new ctors.Graphic({
          geometry: {
            type: "point",
            longitude: end.longitude,
            latitude: end.latitude,
          },
          symbol: {
            type: "simple-marker",
            size: 7,
            color: [255, 255, 255],
            outline: { color: TOOL_BLUE, width: 1.5 },
          },
        }),
      );
    }
  }, []);

  /*
   * Zooms so the circle is actually readable.
   *
   * At statewide scale a 10-mile radius is about eight pixels — geometrically
   * right and visually useless, indistinguishable from the dot at its centre.
   *
   * It frames the WIDEST radius on offer, once, when the point is picked, and
   * never again: scaling to whatever radius is selected would draw every
   * option at the same size on screen, which tells you nothing. Framed to 10
   * miles, the 1 mi circle is a tenth of the 10 mi one — as it should be.
   *
   * Esri scale is metres on the ground per metre on a 96-dpi screen, hence the
   * 0.0254/96 metres-per-pixel conversion.
   */
  const frameRadius = useCallback((at: LonLat) => {
    const view = viewRef.current;
    if (!view?.width || !view?.height) return;

    const widest = NEARBY_RADII[NEARBY_RADII.length - 1];
    const span = Math.min(view.width, view.height) * 0.55;
    const metresPerPixel = (2 * widest * METRES_PER_MILE) / span;

    view
      .goTo({
        center: [at.longitude, at.latitude],
        scale: (metresPerPixel * 96) / 0.0254,
      })
      .catch(ignoreInterrupted);
  }, []);

  /** Redraws the watch circle and the dot at its centre. */
  const drawNearby = useCallback((next: Nearby | null) => {
    const layer = nearbyLayerRef.current;
    const ctors = ctorsRef.current;
    if (!layer || !ctors) return;

    layer.removeAll();
    if (!next) return;

    const centre = new ctors.Point({
      longitude: next.at.longitude,
      latitude: next.at.latitude,
      spatialReference: { wkid: 4326 },
    });

    // A true geodesic circle, walked round by azimuth. A plain square-degree
    // buffer would come out visibly oval this far north.
    const metres = next.radiusMiles * METRES_PER_MILE;
    const ring: number[][] = [];
    for (let azimuth = 0; azimuth <= 360; azimuth += CIRCLE_STEP_DEGREES) {
      const edge = ctors.geodesic.pointFromDistance(centre, metres, azimuth);
      ring.push([edge.longitude, edge.latitude]);
    }

    layer.add(
      new ctors.Graphic({
        geometry: {
          type: "polygon",
          rings: [ring],
          spatialReference: { wkid: 4326 },
        },
        symbol: {
          type: "simple-fill",
          /* Enough wash to lift the shape off a dense field without hiding the
             wells inside it — they are the reason it was drawn. At 22% over a
             1.5px dash it disappeared into a few thousand well symbols. */
          color: [255, 255, 255, 0.35],
          outline: { color: TOOL_BLUE, width: 2.5, style: "dash" },
        },
      }),
    );

    layer.add(
      new ctors.Graphic({
        geometry: {
          type: "point",
          longitude: next.at.longitude,
          latitude: next.at.latitude,
        },
        symbol: {
          type: "simple-marker",
          size: 9,
          color: [255, 255, 255],
          outline: { color: TOOL_BLUE, width: 2 },
        },
      }),
    );
  }, []);

  /**
   * Draws the tract as it is built: a line through the corners while open, a
   * filled ring once closed, with a dot on every corner either way.
   */
  /*
   * `hint` is the cursor: while the tract is open, the edge from the last
   * corner to wherever the pointer is now is drawn dashed, so the next click
   * is previewed rather than guessed at. It is not part of the tract — it is
   * discarded on the next redraw.
   */
  const drawTract = useCallback(
    (points: LonLat[], closed: boolean, hint?: LonLat | null) => {
      const layer = tractLayerRef.current;
      const ctors = ctorsRef.current;
      if (!layer || !ctors) return;

      layer.removeAll();
      if (points.length === 0) return;

      const ring = points.map((p) => [p.longitude, p.latitude]);

      if (!closed && hint) {
        const last = points[points.length - 1];
        layer.add(
          new ctors.Graphic({
            geometry: {
              type: "polyline",
              paths: [
                [
                  [last.longitude, last.latitude],
                  [hint.longitude, hint.latitude],
                ],
              ],
              spatialReference: { wkid: 4326 },
            },
            symbol: {
              type: "simple-line",
              color: TOOL_BLUE,
              width: 1.5,
              style: "dash",
            },
          }),
        );
      }

      if (closed && points.length >= 3) {
        layer.add(
          new ctors.Graphic({
            geometry: {
              type: "polygon",
              rings: [[...ring, ring[0]]],
              spatialReference: { wkid: 4326 },
            },
            symbol: {
              type: "simple-fill",
              color: [255, 255, 255, 0.22],
              outline: { color: TOOL_BLUE, width: 2 },
            },
          }),
        );
      } else if (points.length >= 2) {
        layer.add(
          new ctors.Graphic({
            geometry: {
              type: "polyline",
              paths: [ring],
              spatialReference: { wkid: 4326 },
            },
            symbol: { type: "simple-line", color: TOOL_BLUE, width: 2 },
          }),
        );
      }

      for (const point of points) {
        layer.add(
          new ctors.Graphic({
            geometry: {
              type: "point",
              longitude: point.longitude,
              latitude: point.latitude,
            },
            symbol: {
              type: "simple-marker",
              size: 9,
              color: [255, 255, 255],
              outline: { color: TOOL_BLUE, width: 2 },
            },
          }),
        );
      }
    },
    [],
  );

  /*
   * Frames a county by name.
   *
   * All nine files are asked, because which one holds a given county is an
   * accident of how the data was split. The three spellings in the `where`
   * cover the field arriving as `county`, `COUNTY` or `County` — the live
   * files use the first, but the query costs nothing extra and a re-export
   * that changes the case would otherwise silently find nothing.
   *
   * A county can straddle two files, so the extents are unioned rather than
   * first-one-wins.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- public helper, not yet called from the UI
  const zoomToCounty = useCallback(async (countyName: string) => {
    const view = viewRef.current;
    const layers = countyLayersRef.current;
    if (!view || layers.length === 0) return false;

    // Doubling is how SQL escapes a quote — "O'Brien" would end the string.
    const name = countyName.replace(/'/g, "''");
    const where = `county = '${name}' OR COUNTY = '${name}' OR County = '${name}'`;

    const results = await Promise.all(
      layers.map((layer) =>
        // A file that has not loaded, or has no such field, is simply a miss.
        layer.queryExtent({ where }).catch(() => null),
      ),
    );

    const extents = results
      .filter((result) => result && result.count > 0 && result.extent)
      .map((result) => result!.extent!);

    if (extents.length === 0) return false;

    const target = extents
      .reduce((union, extent) => union.union(extent))
      .expand(1.15);

    await view.goTo(target).catch(ignoreInterrupted);
    return true;
  }, []);

  /*
   * Loads the bubbles for whatever is on screen and redraws them.
   *
   * The API takes the extent as minLon, minLat, maxLon, maxLat, and Esri hands
   * the extent back in the basemap's own spatial reference — Web Mercator —
   * so it is converted to degrees on the way out.
   */
  const loadClusters = useCallback(() => {
    const view = viewRef.current;
    const ctors = ctorsRef.current;
    const layer = clusterLayerRef.current;
    if (!view?.extent || !ctors || !layer) return;

    // Too far out to be worth asking — but what is drawn stays drawn.
    // Clearing is the zoom watcher's job, and only much further out.
    if (clusterZoomTier(zoomLevel(view)) === 0) return;

    const { xmin, ymin, xmax, ymax } = view.extent;
    const request = ++clusterRequestRef.current;
    // Every load, not just the first — the flag starts true for the opening
    // one, and without this a reload on a zoom band change never raised it.
    setClustersLoading(true);

    getClusterListMap({
      west: mercatorToLongitude(xmin),
      south: mercatorToLatitude(ymin),
      east: mercatorToLongitude(xmax),
      north: mercatorToLatitude(ymax),
    })
      .then((list) => {
        // A slower earlier request must not overwrite a newer answer.
        if (request !== clusterRequestRef.current) return;

        const next = list.map(toWellCluster);
        clustersRef.current = next;
        setClusters(next);
        setClusterError(null);

        layer.removeAll();
        layer.addMany(buildClusterGraphics(ctors.Graphic, next));

        /*
         * And the ring goes, wherever it came from.
         *
         * Clearing it alongside the wells is not enough on its own: the ring
         * survives any path that puts bubbles back without going through
         * `clearWells` — a filter being applied, a filter owning the map while
         * the zoom changes — and a ring pulsing around a bubble marks nothing.
         * Bubbles and a single-well ring cannot both be true, so drawing the
         * one clears the other.
         */
        clearInterval(pulseTimerRef.current);
        clearInterval(sampleTimerRef.current);
        highlightLayerRef.current?.removeAll();
      })
      .catch((error: unknown) => {
        if (request !== clusterRequestRef.current) return;
        setClusterError(
          error instanceof Error ? error.message : "Could not load wells.",
        );
      })
      .finally(() => {
        if (request === clusterRequestRef.current) setClustersLoading(false);
      });
  }, []);

  /*
   * Loads the wells for what is on screen.
   *
   * Unlike the bubbles this does follow a pan: at this zoom the extent is a
   * few miles across, so panning genuinely leaves the loaded set behind.
   */
  const loadWells = useCallback(() => {
    const view = viewRef.current;
    const ctors = ctorsRef.current;
    const layer = wellLayerRef.current;
    if (!view?.extent || !ctors || !layer) return;

    const { xmin, ymin, xmax, ymax } = view.extent;
    const box = {
      west: mercatorToLongitude(xmin),
      south: mercatorToLatitude(ymin),
      east: mercatorToLongitude(xmax),
      north: mercatorToLatitude(ymax),
    };

    /*
     * Zooming into ground already fetched asks for nothing.
     *
     * The wells for an extent include every well in it, so a closer look at
     * part of that extent is a subset of what is already in hand — the service
     * would answer with wells this page is holding. Only ground outside the
     * loaded box is unknown, which is what panning and zooming out produce.
     *
     * The epsilon is for the frame the view settles on: a zoom that lands on
     * the same extent can differ in the last decimal place, and that must not
     * read as new ground.
     */
    const loaded = wellsBoxRef.current;
    if (
      loaded &&
      box.west >= loaded.west - EXTENT_EPSILON &&
      box.east <= loaded.east + EXTENT_EPSILON &&
      box.south >= loaded.south - EXTENT_EPSILON &&
      box.north <= loaded.north + EXTENT_EPSILON
    ) {
      return;
    }

    const request = ++wellRequestRef.current;
    setWellsLoading(true);

    getWellListMap(box)
      .then((list: MapWell[]) => {
        if (request !== wellRequestRef.current) return;

        wellsBoxRef.current = box;
        wellsRef.current = list;
        setWells(list);
        setWellError(null);
        layer.removeAll();
        layer.addMany(
          buildWellGraphics(ctors.Graphic, list, wellIconsRef.current),
        );
      })
      .catch((error: unknown) => {
        if (request !== wellRequestRef.current) return;
        setWellError(
          error instanceof Error ? error.message : "Could not load wells.",
        );
      })
      .finally(() => {
        if (request === wellRequestRef.current) setWellsLoading(false);
      });
  }, []);

  /*
   * Puts the record away.
   *
   * The ring goes with it: it marks the well the panel is showing, and with
   * no panel it marks nothing. The map itself is left exactly where it is —
   * closing a record is not a reason to move somebody's view.
   */
  const closeSummary = useCallback(() => {
    clearInterval(pulseTimerRef.current);
    highlightLayerRef.current?.removeAll();
    setSelectedWell(null);
  }, []);

  const clearWells = useCallback(() => {
    wellRequestRef.current += 1;
    /* Nothing is held any more, so the next extent is new ground. */
    wellsBoxRef.current = null;
    wellsRef.current = [];
    setWells([]);
    setWellsLoading(false);
    setWellError(null);
    wellLayerRef.current?.removeAll();
    /*
     * The ring marks one of those wells, so it goes with them.
     *
     * It was only ever cleared when a filter was cleared, so zooming out of
     * the well band took the wells away and left the ring pulsing over the
     * bubbles, marking nothing.
     */
    clearInterval(pulseTimerRef.current);
    highlightLayerRef.current?.removeAll();
  }, []);

  /** Draws the wells dated up to a step, and nothing after it. */
  const drawTimeLapse = useCallback((step: number) => {
    const ctors = ctorsRef.current;
    const layer = wellLayerRef.current;
    if (!ctors || !layer) return 0;

    const shown = wellsUpTo(timeLapseYearsRef.current, step);
    layer.removeAll();
    layer.addMany(
      buildWellGraphics(ctors.Graphic, shown, wellIconsRef.current),
    );
    return shown.length;
  }, []);

  const closeTimeLapse = useCallback(() => {
    const ctors = ctorsRef.current;
    const layer = wellLayerRef.current;

    timeLapseRef.current = false;
    setTimeLapsePlaying(false);
    timeLapseStepRef.current = -1;
    setTimeLapseStep(-1);
    setTimeLapseOpen(false);

    /* Everything back at once, undated wells included. */
    if (ctors && layer) {
      layer.removeAll();
      layer.addMany(
        buildWellGraphics(
          ctors.Graphic,
          timeLapseAllRef.current,
          wellIconsRef.current,
        ),
      );
    }
  }, []);

  /*
   * Opening clears the map and starts from nothing.
   *
   * The wells are grouped by year here, once, off the set already loaded —
   * which is why this is instant where a replay of the whole state was not.
   */
  const openTimeLapse = useCallback(() => {
    const layer = wellLayerRef.current;
    if (!layer) return;

    /*
     * Nothing to replay: the map is showing bubbles, or the wells it has
     * carry no readable date. It returned silently before, so pressing
     * Time-lapse over the statewide view did nothing at all and looked broken.
     *
     * One channel says so, not two. The bubbles case belongs to the card
     * under the toolbar button — it opens on hover and on focus, and a tap
     * focuses, so a phone gets it as well as a mouse. Saying it here too put
     * the same sentence on screen twice, one over the other.
     *
     * Wells drawn but undated is the one the card does not cover, since the
     * card is only there while the map is showing bubbles. That is the toast.
     */
    const wells = wellsRef.current;
    const years = yearsIn(wells);
    if (years.length === 0) {
      if (wells.length > 0) setToast("No dated wells here to replay");
      return;
    }

    timeLapseAllRef.current = wells;
    timeLapseYearsRef.current = years;
    setTimeLapseYears(years);
    setTimeLapseUndated(wells.length - datedCount(years));

    timeLapseRef.current = true;
    timeLapseStepRef.current = -1;
    setTimeLapseStep(-1);
    setTimeLapseOpen(true);

    /* The ring goes with the wells — it would otherwise sit over ground with
       nothing under it. */
    clearInterval(pulseTimerRef.current);
    highlightLayerRef.current?.removeAll();

    layer.removeAll();
    setTimeLapsePlaying(true);
  }, []);

  /**
   * Moves the replay to a step, forwards or back.
   *
   * Redrawn from the years rather than added to: dragging the handle back has
   * to take wells off the map, and a running total only ever grows.
   */
  const seekTimeLapse = useCallback(
    (step: number) => {
      const years = timeLapseYearsRef.current;
      const target = Math.max(-1, Math.min(step, years.length - 1));
      timeLapseStepRef.current = target;
      setTimeLapseStep(target);
      drawTimeLapse(target);
    },
    [drawTimeLapse],
  );

  const toggleTimeLapse = useCallback(() => {
    if (!timeLapseOpen) {
      openTimeLapse();
      return;
    }

    /*
     * Open but stopped — paused with the bar, or run to the end. Pressing
     * Time-lapse again means run it, so it starts over from an empty map
     * rather than closing. Only a replay actually in motion is put away.
     */
    if (!timeLapsePlaying) {
      seekTimeLapse(-1);
      setTimeLapsePlaying(true);
      return;
    }

    closeTimeLapse();
  }, [
    timeLapseOpen,
    timeLapsePlaying,
    closeTimeLapse,
    openTimeLapse,
    seekTimeLapse,
  ]);

  /*
   * The replay: one year per tick.
   *
   * The drawing happens here rather than inside a `setState` updater. React
   * invokes updaters twice in development to prove they are pure, and one that
   * redrew the map would do it twice a tick.
   */
  useEffect(() => {
    if (!timeLapsePlaying) return;

    const years = timeLapseYearsRef.current;
    if (years.length === 0) return;

    const timer = setInterval(() => {
      const next = timeLapseStepRef.current + 1;
      if (next >= years.length) {
        setTimeLapsePlaying(false);
        return;
      }

      timeLapseStepRef.current = next;
      drawTimeLapse(next);
      setTimeLapseStep(next);
    }, TIME_LAPSE_TICK_MS);

    return () => clearInterval(timer);
  }, [timeLapsePlaying, drawTimeLapse]);

  /**
   * Rings the picked well, with a pulse running out from it.
   *
   * Its own layer above the wells, so highlighting one neither disturbs the
   * field around it nor survives a reload of it.
   *
   * The pulse is redrawn on a timer rather than animated: an Esri symbol has
   * no transition to hook, so a growing, fading ring means replacing the
   * graphic each frame. It is two graphics on one layer, so the cost is
   * nothing — and it is what makes a 10px well findable among a thousand.
   */
  const highlightWell = useCallback((longitude: number, latitude: number) => {
    const ctors = ctorsRef.current;
    const layer = highlightLayerRef.current;
    if (!ctors || !layer) return;

    clearInterval(pulseTimerRef.current);

    const geometry = { type: "point", longitude, latitude };
    let frame = 0;

    const draw = () => {
      /*
       * One ring that breathes, rather than a steady ring with a wave running
       * out of it — two circles around one well read as two things.
       *
       * The size follows a cosine, so it eases at both ends instead of
       * snapping back at the top of each cycle, and the opacity is constant:
       * a ring that fades out leaves the well unmarked for part of every
       * cycle, which is the one thing a highlight must not do.
       */
      const phase = (frame % PULSE_FRAMES) / PULSE_FRAMES;
      frame += 1;

      const swell = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);

      layer.removeAll();
      layer.add(
        new ctors.Graphic({
          geometry,
          symbol: {
            type: "simple-marker",
            size: PULSE_MIN_SIZE + swell * (PULSE_MAX_SIZE - PULSE_MIN_SIZE),
            color: [0, 0, 0, 0],
            outline: { color: [46, 143, 109, 1], width: 2.5 },
          },
        }),
      );
    };

    draw();
    pulseTimerRef.current = setInterval(draw, PULSE_INTERVAL_MS);
  }, []);

  /** Drops the bubbles — the view is too wide for them to mean anything. */
  const clearClusters = useCallback(() => {
    if (clustersRef.current.length === 0) return;

    clustersRef.current = [];
    setClusters([]);
    // The hover card holds an index into that list; leaving it set points the
    // card at a bubble that no longer exists.
    hoveredClusterRef.current = null;
    setHoveredCluster(null);
    clusterLayerRef.current?.removeAll();
    // The next zoom in crosses back into a band and loads afresh.
    clusterTierRef.current = -1;
  }, []);

  /*
   * Apply, from the filters panel.
   *
   * The result is wells wherever they are, not wells in the current extent, so
   * it takes over the well layer outright: bubbles off, matches on, and the
   * map moves to fit them when it can. Clearing every filter hands the map
   * back to the zoom-driven loading it does otherwise.
   */
  /*
   * `applyFilters`, for the one place that has to call it from inside itself:
   * an empty result undoes its own filter, and a callback cannot list itself
   * as a dependency.
   */
  const applyFiltersRef = useRef<
    ((filters: Record<string, string[]>) => void) | null
  >(null);

  const applyFilters = useCallback(
    (filters: Record<string, string[]>) => {
      const ctors = ctorsRef.current;
      const layer = wellLayerRef.current;
      const view = viewRef.current;
      if (!ctors || !layer || !view) return;

      /* The address says what the map is showing, so a link to it is a link
         to this filter rather than to the state. */
      writeFilterParams(filters);

      if (Object.keys(filters).length === 0) {
        filteredRef.current = false;
        setToast("Filters cleared");
        /* Nothing is being filtered, so nothing can be matching nothing. */
        setNoMatches(false);
        // `clearWells` takes the ring with the wells it marked.
        clearWells();
        clusterTierRef.current = -1;

        /*
         * Back to the opening view, not to wherever the filter left the map.
         * A cleared filter should leave no trace, and being parked over one
         * county at zoom 14 with the bubbles reloading around it is a trace.
         *
         * The clusters load once the move settles: they are requested for the
         * extent, and asking before the map has finished moving asks about the
         * wrong one.
         */
        viewRef.current
          ?.goTo({ center: HOME_CENTER, scale: homeScale() })
          .then(loadClusters)
          .catch(ignoreInterrupted);
        return;
      }

      /*
       * Claimed before the request goes out, not when it comes back.
       *
       * Switching tab resizes the map, which fires the zoom watcher — and
       * while this flag was still false the watcher treated it as an ordinary
       * move: it cleared the wells (bumping the request counter, so the answer
       * was discarded as stale) and reloaded the bubbles over the top. The
       * filter appeared to do nothing at all.
       */
      filteredRef.current = true;

      const request = ++wellRequestRef.current;
      setWellsLoading(true);
      // The previous answer is no longer the answer. Leaving it up means a
      // failed request still reads as a successful one.
      setWellError(null);
      setNoMatches(false);

      getMatchedWellsMap(filters)
        .then(({ wells }) => {
          if (request !== wellRequestRef.current) return;

          wellsRef.current = wells;
          setWells(wells);
          setWellError(null);
          setNoMatches(wells.length === 0);

          /*
           * Nothing matched: say so, then undo it.
           *
           * Left applied, the filter has the reader on an empty map that stays
           * empty whatever they tick next, since every further choice narrows
           * a set that is already nought. The pause is for reading the notice
           * — long enough for a sentence, short enough not to feel stuck.
           */
          if (wells.length === 0) {
            if (emptyResetRef.current) clearTimeout(emptyResetRef.current);
            emptyResetRef.current = setTimeout(() => {
              setFilterResetAt((count) => count + 1);
              applyFiltersRef.current?.({});
            }, 2600);
          }

          /*
           * Said once the matches are in, not when Apply was pressed: until
           * the service has answered there is nothing to confirm, and a
           * request that fails must not have been announced as a success.
           */
          /* Only when there is a number to give. Nothing matching is said by
             the red notice at the top of the map, which stays as long as it is
             true — a toast saying the same thing put two messages on screen at
             once, one over the other. */
          if (wells.length > 0) {
            setToast(
              `Filters applied — ${wells.length.toLocaleString("en-US")} well${wells.length === 1 ? "" : "s"}`,
            );
          }

          clearClusters();
          layer.removeAll();
          layer.addMany(
            buildWellGraphics(ctors.Graphic, wells, wellIconsRef.current),
          );

          /*
           * One match is a well someone asked for by name. Ring it, and go
           * right down to it: a single well has no extent to frame, and the
           * general framing below would leave it as a 10px icon somewhere in
           * a county-wide view.
           */
          if (wells.length === 1) {
            const only = wells[0];
            highlightWell(only.lon, only.lat);
            view
              .goTo({ center: [only.lon, only.lat], scale: SINGLE_WELL_SCALE })
              .catch(ignoreInterrupted);
            return;
          }

          /*
           * More than one county: out to the state, centred on the matches.
           *
           * Two counties can be neighbours or four hundred miles apart, and
           * fitting the box for both cases is arithmetic that keeps finding
           * new ways to leave one of them off the edge. Zoom 5 has neither
           * problem — it is the level the whole state is read at.
           */
          const countiesAsked = filters.county?.length ?? 0;

          if (countiesAsked > 1) {
            const spot = trimmedBox(wells);

            view
              .goTo(
                {
                  center: spot
                    ? [
                        (spot.west + spot.east) / 2,
                        (spot.south + spot.north) / 2,
                      ]
                    : HOME_CENTER,
                  zoom: MULTI_COUNTY_ZOOM,
                },
                { animate: false },
              )
              .catch(ignoreInterrupted);
            return;
          }

          /*
           * Frame what matched — all of it.
           *
           * Three counties chosen from opposite ends of the state are three
           * counties the reader asked to see, and leaving the map where it
           * stood showed two of them with the third off the edge. So the box
           * around every match is what the view goes to.
           *
           * The box is trimmed rather than the outright min and max: a handful
           * of bad coordinates would otherwise define the frame.
           */
          const box = trimmedBox(wells);

          if (box) {
            const spread = Math.max(box.east - box.west, box.north - box.south);

            /*
             * Fitted per axis, into the part of the map that is not under the
             * rail. Both sides matter: a box four degrees wide and one deep
             * is not framed by treating it as four degrees square, and a
             * degree of longitude at this latitude is only five sixths of a
             * degree of latitude.
             */
            const midLat = (box.south + box.north) / 2;
            const lonMetres =
              DEGREE_METRES * Math.cos((midLat * Math.PI) / 180);

            const wide = Math.max(box.east - box.west, FILTER_FIT_MIN_DEGREES);
            const deep = Math.max(
              box.north - box.south,
              FILTER_FIT_MIN_DEGREES,
            );

            /* The rail is open beside the map from `lg` up; below that Apply
               has just shut it, so the whole width is there to be used. */
            const covered =
              view.width >= 1024
                ? Math.min(FILTERS_RAIL_WIDTH, view.width / 3)
                : 0;
            const usableWidth = Math.max(view.width - covered, 240);

            const metresPerPixel = Math.max(
              (wide * lonMetres) / (usableWidth * 0.86),
              (deep * DEGREE_METRES) / (Math.max(view.height, 200) * 0.86),
            );

            /* Half the covered strip, in degrees: the box's middle has to land
               in the middle of what is visible, not of the surface. */
            const nudge = ((covered / 2) * metresPerPixel) / lonMetres;

            // Centre and scale, not an extent: a plain object is not a
            // Geometry and `goTo` will not autocast one.
            view
              .goTo(
                {
                  center: [(box.west + box.east) / 2 - nudge, midLat],
                  /*
                   * How far out this is allowed to leave the map depends on
                   * what matched. A county's worth of wells landing on the
                   * statewide view has shown nobody anything, so that case is
                   * held to zoom 8 or nearer; a selection that really does
                   * cross Texas is allowed the size of Texas.
                   */
                  scale: Math.min(
                    (metresPerPixel * 96) / 0.0254,
                    spread <= FILTER_FIT_MAX_DEGREES
                      ? FILTER_FIT_MAX_SCALE
                      : FILTER_FIT_WIDE_SCALE,
                  ),
                },
                /*
                 * Straight there, no flight.
                 *
                 * An animated `goTo` is a camera the map can be argued out
                 * of: anything else that moves the view while it is flying
                 * cancels it, `ignoreInterrupted` swallows the rejection, and
                 * the frame silently never happens — the map sits wherever it
                 * was, which on a scattered filter looks exactly like framing
                 * one county and dropping the rest. Set outright, it cannot
                 * be interrupted.
                 */
                { animate: false },
              )
              .catch(ignoreInterrupted);
          }
        })
        .catch((error: unknown) => {
          if (request !== wellRequestRef.current) return;

          // Nothing was drawn, so the map goes back to loading its own wells.
          filteredRef.current = false;
          setWellError(
            /*
             * The endpoint runs for a minute or more on a broad filter and the
             * gateway gives up before it does, so the failure people actually
             * hit is a 502. Say what to do about it.
             */
            error instanceof Error &&
              /502|timeout|Failed to fetch/i.test(error.message)
              ? "The filter took too long to run. Try again — the result is cached once it completes."
              : error instanceof Error
                ? error.message
                : "Could not apply filters.",
          );
        })
        .finally(() => {
          if (request === wellRequestRef.current) setWellsLoading(false);
        });
    },
    [clearClusters, clearWells, loadClusters, highlightWell],
  );

  /* Kept current so the empty-result reset can reach it without depending on
     its own identity. Assigned in an effect rather than during render, which
     is where a ref must not be written. */
  useEffect(() => {
    applyFiltersRef.current = applyFilters;
  }, [applyFilters]);

  /**
   * A picked API number, run as a filter of one.
   *
   * The lookup returns identity only — no coordinates — so the position has to
   * come from somewhere, and `matched-wells?api=…` already answers exactly
   * that. It draws the well, frames it and rings it by the same path every
   * other filter takes.
   */
  const selectApi = useCallback(
    (api: string) => {
      applyFilters({ api: [api] });
    },
    [applyFilters],
  );

  /** The box was emptied. Only undo something if something was done. */
  const clearApi = useCallback(() => {
    if (!filteredRef.current) return;
    applyFilters({});
  }, [applyFilters]);

  /*
   * A row's "view on map" button.
   *
   * The same path a picked API number takes — the well is fetched as a filter
   * of one, drawn, ringed and framed — and then Insights, because the summary
   * for that well is the reason to look at it. The split shows the map beside
   * it, so the ring is on screen either way.
   */
  const showRowOnMap = useCallback(
    (row: MapTableRow) => {
      applyFilters({ api: [row.api] });
      // The row already carries everything the summary's header needs, so it
      // is filled straight from the table rather than waiting on the fetch.
      setSelectedWell({
        api: row.api,
        lease: row.lease,
        well: "",
        operator: row.operator,
        status: row.status,
        wtype: row.wtype,
        county: row.county,
        /* The table's rows carry no record label, so this falls back to the
           completion — see the panel. */
        record: "",
      });
      setViewTab("insights");
    },
    [applyFilters],
  );

  /**
   * Export CSV.
   *
   * Browsing, that means what is inside the extent — the loaded bubbles reach
   * past the screen after a pan, and a file of things nobody was looking at is
   * not what the button offers. Filtered, it means the whole set: the reader
   * asked for those wells and was told how many there were, so the file has to
   * hold that many.
   */
  const exportCsv = useCallback(() => {
    const view = viewRef.current;
    if (!view?.extent) return;

    const { xmin, ymin, xmax, ymax } = view.extent;
    exportVisible(
      clustersRef.current,
      wellsRef.current,
      filteredRef.current
        ? null
        : {
            west: mercatorToLongitude(xmin),
            south: mercatorToLatitude(ymin),
            east: mercatorToLongitude(xmax),
            north: mercatorToLatitude(ymax),
          },
      /* Tier 2 is the finer set — the one the map draws from zoom 8. */
      clusterTierRef.current >= 2 ? "sub-clusters" : "clusters",
    );
  }, []);

  /** Re-projects the on-map cards — they are React, so they do not follow. */
  const anchorBars = useCallback(() => {
    const view = viewRef.current;
    const ctors = ctorsRef.current;
    if (!view || !ctors) return;

    const project = (longitude: number, latitude: number) => {
      const screen = view.toScreen(
        new ctors.Point({
          longitude,
          latitude,
          spatialReference: { wkid: 4326 },
        }),
      );
      return screen ? { x: screen.x, y: screen.y } : null;
    };

    // The area bar rides the middle of the rectangle's top edge…
    const currentArea = areaRef.current;
    setAreaAnchor(
      currentArea
        ? project((currentArea.west + currentArea.east) / 2, currentArea.north)
        : null,
    );

    // …the distance bar sits on the midpoint of the line…
    const currentMeasure = measurementRef.current;
    setMeasureAnchor(
      currentMeasure
        ? project(
            (currentMeasure.from.longitude + currentMeasure.to.longitude) / 2,
            (currentMeasure.from.latitude + currentMeasure.to.latitude) / 2,
          )
        : null,
    );

    // The watch card is not projected — it holds the bottom of the map
    // whatever the circle does.
  }, []);

  useEffect(() => {
    // StrictMode mounts the effect twice in dev; `cancelled` stops the first
    // pass building a view into a container the second pass owns.
    let cancelled = false;
    let view: EsriView | undefined;
    let watcher: EsriHandle | undefined;
    let dragHandle: EsriHandle | undefined;
    let pressHandle: EsriHandle | undefined;
    let leaveHandle: EsriHandle | undefined;
    let clickHandle: EsriHandle | undefined;
    let pointerHandle: EsriHandle | undefined;
    let frame = 0;
    let clusterTimer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      try {
        const [
          EsriMap,
          MapView,
          GraphicsLayer,
          GeoJSONLayer,
          Graphic,
          Point,
          geodesic,
        ] = await loadArcgisModules<
          [
            MapCtor,
            MapViewCtor,
            GraphicsLayerCtor,
            GeoJSONLayerCtor,
            GraphicCtor,
            PointCtor,
            GeodesicUtils,
          ]
        >([
          "esri/Map",
          "esri/views/MapView",
          "esri/layers/GraphicsLayer",
          "esri/layers/GeoJSONLayer",
          "esri/Graphic",
          "esri/geometry/Point",
          "esri/geometry/support/geodesicUtils",
        ]);

        if (cancelled || !containerRef.current) return;

        const districtLayer = new GeoJSONLayer({
          id: "rrc-districts",
          url: DISTRICT_LAYER_URL,
          title: "RRC districts",
          // Outline only — a fill would hide the basemap the lines describe.
          renderer: {
            type: "simple",
            symbol: {
              type: "simple-fill",
              color: [0, 0, 0, 0],
              outline: { color: [103, 135, 134, 0.85], width: 1.75 },
            },
          },
          labelsVisible: true,
          labelingInfo: [
            {
              labelExpressionInfo: { expression: "$feature.dis_code" },
              labelPlacement: "always-horizontal",
              symbol: {
                type: "text",
                color: [64, 92, 91, 1],
                haloColor: [255, 255, 255, 0.9],
                haloSize: 1.5,
                font: { size: 11, weight: "bold" },
              },
            },
          ],
        });

        // Nine files, created together so the map requests them in parallel.
        const countyLayers: EsriGeoJSONLayer[] = [];
        for (let index = 1; index <= COUNTY_LAYER_COUNT; index += 1) {
          countyLayers.push(
            new GeoJSONLayer({
              id: `counties-${index}`,
              url: COUNTY_LAYER_URL(index),
              title: `Counties ${index}`,
              minScale: COUNTY_MIN_SCALE,
              renderer: {
                type: "simple",
                symbol: {
                  type: "simple-fill",
                  // No fill. The palette's county washes were drawn over a
                  // white basemap; over imagery or the dark map they fog it,
                  // and the lines alone read the same on all six.
                  color: [0, 0, 0, 0],
                  outline: { color: [103, 135, 134, 0.9], width: 1 },
                },
              },
              labelsVisible: true,
              labelingInfo: [
                {
                  labelExpressionInfo: { expression: "$feature.county" },
                  labelPlacement: "always-horizontal",
                  symbol: {
                    type: "text",
                    color: [64, 92, 91, 1],
                    haloColor: [255, 255, 255, 0.9],
                    haloSize: 1.5,
                    font: { size: 12 },
                  },
                },
              ],
            }),
          );
        }
        countyLayersRef.current = countyLayers;

        const clusters = new GraphicsLayer({ id: "well-clusters" });
        clusterLayerRef.current = clusters;

        // Its own layer, so switching between bubbles and wells is two
        // independent clears rather than one shared list to sort out.
        const wells = new GraphicsLayer({ id: "wells" });
        wellLayerRef.current = wells;

        const highlight = new GraphicsLayer({ id: "well-highlight" });
        highlightLayerRef.current = highlight;

        // Above the clusters, so tool output is never buried. One layer each,
        // so clearing an area does not wipe a measurement and vice versa.
        const areaLayer = new GraphicsLayer({ id: "drawn-area" });
        const measureLayer = new GraphicsLayer({ id: "measured-distance" });
        const nearbyLayer = new GraphicsLayer({ id: "watch-circle" });
        const tractLayer = new GraphicsLayer({ id: "measured-tract" });
        tractLayerRef.current = tractLayer;
        areaLayerRef.current = areaLayer;
        measureLayerRef.current = measureLayer;
        nearbyLayerRef.current = nearbyLayer;
        ctorsRef.current = { Graphic, Point, geodesic };

        // Held so the basemap picker can swap `map.basemap` later. The cluster
        // layer is a sibling of the basemap, so it survives the swap.
        const map = new EsriMap({
          basemap: DEFAULT_BASEMAP,
          // Districts first, counties over them, then the bubbles and every
          // tool layer on top — boundaries are context, not content.
          layers: [
            districtLayer,
            ...countyLayers,
            clusters,
            wells,
            highlight,
            areaLayer,
            measureLayer,
            nearbyLayer,
            tractLayer,
          ],
        });
        mapRef.current = map;

        view = new MapView({
          container: containerRef.current,
          map,
          center: HOME_CENTER,
          scale: homeScale(),
          // Below zoom 3 the world repeats and the terrain turns to mush.
          constraints: { minZoom: 3, snapToZoom: false },
          // Attribution only — every other control is React chrome on top.
          ui: { components: ["attribution"] },
        });

        viewRef.current = view;

        // `scale` and `center` fire on every animation frame while panning;
        // coalescing to one frame keeps React off the critical path.
        const syncReadout = () => {
          if (frame || !view) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            if (cancelled || !view) return;
            setReadout({
              scale: view.scale,
              /* Rounded here, so everything reading the readout agrees with
                 the number printed under the zoom buttons. */
              zoom: zoomLevel(view),
              center: {
                longitude: view.center.longitude,
                latitude: view.center.latitude,
              },
            });
          });
        };
        watcher = view.watch(["scale", "center"], () => {
          syncReadout();
          // Tool graphics are on the map and move themselves; the bars above
          // them are React, so they have to be re-projected as the view moves.
          anchorBars();

          // Panning changes nothing about which bubbles are right, so only a
          // change of zoom band asks again — and then only once the zoom has
          // settled, since this fires on every frame of it.
          // A filter owns the map until it is cleared, and so does a
          // replay — reloading the wells would paint over it mid-year.
          if (filteredRef.current || timeLapseRef.current) return;

          const zoom = zoomLevel(view);

          if (zoom <= CLUSTER_CLEAR_ZOOM) {
            clearTimeout(clusterTimer);
            clearClusters();
            clearWells();
            return;
          }

          /*
           * Wells at 10 on the way in, and they hold through 9 on the way
           * out. `-1` is the tier that means wells, so it doubles as the
           * record of which way this band was entered.
           */
          const showingWells = clusterTierRef.current === -1;

          if (zoom >= WELL_ZOOM || (showingWells && zoom > WELL_LEAVE_ZOOM)) {
            // Wells replace the bubbles outright.
            if (!showingWells) {
              clusterTierRef.current = -1;
              clearClusters();
            }
            clearTimeout(clusterTimer);
            clusterTimer = setTimeout(loadWells, 400);
            return;
          }

          clearWells();

          const tier = nextClusterTier(zoom, clusterTierRef.current);
          if (tier !== clusterTierRef.current) {
            clusterTierRef.current = tier;
            clearTimeout(clusterTimer);
            clusterTimer = setTimeout(loadClusters, 400);
          }
        });

        // `immediate-click` rather than `click`: the latter is held back to see
        // whether a double-click follows, and there is no double-click
        // behaviour here to wait for — the delay would just feel sluggish.
        /**
         * Which bubble is under a screen point, or -1.
         *
         * Geometric rather than `view.hitTest`: the bubbles are circles of a
         * known pixel radius, so the test is exact and synchronous — hitTest
         * returns a promise, and one per pointer-move would need race
         * handling for no gain. Walked back to front so the topmost bubble
         * wins where they overlap, which is what the eye picks.
         */
        const clusterAt = (x: number, y: number): number => {
          const ctors = ctorsRef.current;
          if (!view || !ctors) return -1;

          const live = clustersRef.current;
          for (let index = live.length - 1; index >= 0; index--) {
            const cluster = live[index];
            const screen = view.toScreen(
              new ctors.Point({
                longitude: cluster.at[0],
                latitude: cluster.at[1],
                spatialReference: { wkid: 4326 },
              }),
            );
            if (!screen) continue;

            const radius = clusterDiameter(cluster.count) / 2;
            const dx = x - screen.x;
            const dy = y - screen.y;
            if (dx * dx + dy * dy <= radius * radius) return index;
          }
          return -1;
        };

        const screenOf = (point: LonLat): ScreenPoint | null => {
          const ctors = ctorsRef.current;
          if (!view || !ctors) return null;
          const screen = view.toScreen(
            new ctors.Point({
              longitude: point.longitude,
              latitude: point.latitude,
              spatialReference: { wkid: 4326 },
            }),
          );
          return screen ? { x: screen.x, y: screen.y } : null;
        };

        const screenTopOf = (index: number): BubbleAnchor | null => {
          const ctors = ctorsRef.current;
          if (!view || !ctors) return null;
          const cluster = clustersRef.current[index];
          const screen = view.toScreen(
            new ctors.Point({
              longitude: cluster.at[0],
              latitude: cluster.at[1],
              spatialReference: { wkid: 4326 },
            }),
          );
          if (!screen) return null;

          const diameter = clusterDiameter(cluster.count);
          return {
            x: Math.round(screen.x),
            y: Math.round(screen.y - diameter / 2),
            bubble: Math.round(diameter),
          };
        };

        pressHandle = view.on("pointer-down", (event) => {
          pressRef.current = { x: event.x, y: event.y };
        });

        /*
         * The pointer left the map, so nothing is hovered any more.
         *
         * Without this the last card stayed up: moving onto a panel over the
         * map fires no further `pointer-move`, so the well under the pointer a
         * moment ago was still the well the view thought was hovered — and its
         * card sat there over the panel the reader had just opened.
         */
        leaveHandle = view.on("pointer-leave", () => {
          hoveredWellRef.current = null;
          setHoveredWell(null);
          hoveredClusterRef.current = null;
          setHoveredCluster(null);
        });

        pointerHandle = view.on("pointer-move", (event) => {
          // Mid-box, the pointer is the opposite corner until it is clicked.
          if (activeToolRef.current === "draw-area" && areaStartRef.current) {
            const at = view?.toMap(event);
            if (at) {
              drawArea(
                boxBetween(areaStartRef.current, {
                  longitude: at.longitude,
                  latitude: at.latitude,
                }),
              );
            }
          }

          // Mid-tract, the pointer is the next corner until it is clicked.
          if (activeToolRef.current === "measure-area") {
            const points = tractRef.current;
            if (points.length > 0) {
              drawTract(points, false, view?.toMap(event) ?? null);
            }
          }

          /*
           * Over wells, ask the layer what is under the pointer. Esri's own
           * hit test rather than our cluster-style geometry check: there can
           * be thousands of wells on screen, and projecting every one of them
           * on every pointer move is not something to do at 60fps.
           */
          const wellLayer = wellLayerRef.current;
          if (!activeToolRef.current && wellLayer && view) {
            const request = ++wellHoverRef.current;
            const { x, y } = event;

            void view
              .hitTest({ x, y }, { include: wellLayer })
              .then(({ results }) => {
                if (request !== wellHoverRef.current) return;

                const found = results.find(
                  (result) => result.graphic?.attributes?.api,
                );
                const attributes = found?.graphic?.attributes;

                const next = attributes
                  ? {
                      api: String(attributes.api ?? ""),
                      lease: String(attributes.lease ?? ""),
                      well: String(attributes.well ?? ""),
                      operator: String(attributes.operator ?? ""),
                      status: String(attributes.status ?? ""),
                      wtype: String(attributes.wtype ?? ""),
                      county: String(attributes.county ?? ""),
                      recordType: String(attributes.recordType ?? ""),
                      lon: Number(attributes.lon),
                      lat: Number(attributes.lat),
                      x,
                      y,
                    }
                  : null;

                hoveredWellRef.current = next;
                setHoveredWell(next);
              })
              .catch(() => {
                // A hit test can be interrupted by a redraw; no card, no fuss.
              });
          }

          // A tool takes precedence — no hover cards mid-draw.
          const index = activeToolRef.current
            ? -1
            : clusterAt(event.x, event.y);
          const top = index === -1 ? null : screenTopOf(index);
          const next = top
            ? { index, x: top.x, y: top.y, bubble: top.bubble }
            : null;

          const previous = hoveredClusterRef.current;
          const same =
            next?.index === previous?.index &&
            next?.x === previous?.x &&
            next?.y === previous?.y;
          if (same) return;

          hoveredClusterRef.current = next;
          setHoveredCluster(next);
        });

        clickHandle = view.on("immediate-click", (event) => {
          const ctors = ctorsRef.current;

          /*
           * Over wells, a click picks one and switches to Insights with it.
           *
           * The hovered well first: the pointer has already hit-tested this
           * exact spot, and reusing that answer means the click acts on what
           * the tooltip was showing rather than on a second, slightly later
           * test. Only when there is no hover — a tap, where there never was
           * one — does it ask the layer itself.
           */
          if (!activeToolRef.current && view && zoomLevel(view) >= WELL_ZOOM) {
            const wellLayer = wellLayerRef.current;
            if (!wellLayer) return;

            event.stopPropagation();

            const hovered = hoveredWellRef.current;
            if (hovered) {
              // The well's own position, not the cursor's — a click a few
              // pixels off centre should still ring the well.
              highlightWell(hovered.lon, hovered.lat);
              setSelectedWell({
                api: hovered.api,
                lease: hovered.lease,
                well: hovered.well,
                operator: hovered.operator,
                status: hovered.status,
                wtype: hovered.wtype,
                county: hovered.county,
                /* Which of the well's two records this row is — it decides
                   which summary the panel opens. */
                record: hovered.recordType ?? "",
              });
              setViewTab("insights");
              return;
            }

            void view
              .hitTest({ x: event.x, y: event.y }, { include: wellLayer })
              .then(({ results }) => {
                const attributes = results.find(
                  (result) => result.graphic?.attributes?.api,
                )?.graphic?.attributes;
                if (!attributes) return;

                highlightWell(Number(attributes.lon), Number(attributes.lat));
                setSelectedWell({
                  api: String(attributes.api ?? ""),
                  lease: String(attributes.lease ?? ""),
                  well: String(attributes.well ?? ""),
                  operator: String(attributes.operator ?? ""),
                  status: String(attributes.status ?? ""),
                  wtype: String(attributes.wtype ?? ""),
                  county: String(attributes.county ?? ""),
                  record: String(attributes.recordType ?? ""),
                });
                setViewTab("insights");
              })
              .catch((error: unknown) => {
                // Not swallowed: a hit test that keeps failing is why a click
                // would look like it did nothing at all.
                console.error("Could not pick a well.", error);
              });
            return;
          }

          /*
           * With no tool armed, a click on a bubble opens it one step further:
           * a cluster into its sub-clusters, a sub-cluster into the wells. Past
           * the well zoom the individual holes are already there, and the click
           * belongs to whichever one was hit.
           */
          if (!activeToolRef.current) {
            if (!view || zoomLevel(view) >= WELL_ZOOM) return;

            const index = clusterAt(event.x, event.y);
            if (index !== -1) {
              event.stopPropagation();
              const cluster = clustersRef.current[index];
              /*
               * A level, not a scale.
               *
               * A cluster opens into its sub-clusters and a sub-cluster opens
               * into the wells, so where each click lands is a zoom level —
               * the band the bubbles change at. Naming a scale meant naming a
               * number between two levels: 1:200,000 sits between zoom 10 and
               * zoom 11, the view snapped to the nearer level, and a
               * sub-cluster click landed a level past where the wells appear.
               */
              view
                .goTo({
                  center: cluster.at,
                  zoom:
                    zoomLevel(view) >= CLUSTER_ZOOM_STEPS[1]
                      ? WELL_ZOOM
                      : CLUSTER_ZOOM_STEPS[1],
                })
                .catch(ignoreInterrupted);
            }
            return;
          }

          if (activeToolRef.current === "draw-area") {
            if (!event.mapPoint || !view) return;
            event.stopPropagation();

            clearInterval(sampleTimerRef.current);
            sampleTimerRef.current = undefined;
            setSampleOf(null);

            const at = {
              longitude: event.mapPoint.longitude,
              latitude: event.mapPoint.latitude,
            };
            const start = areaStartRef.current;

            // First click sets a corner; the box follows the pointer until the
            // second click fixes the opposite one.
            if (!start) {
              areaStartRef.current = at;
              return;
            }

            const next = boxBetween(start, at);
            areaStartRef.current = null;
            areaRef.current = next;
            setArea(next);
            drawArea(next);
            anchorBars();
            activeToolRef.current = null;
            setActiveTool(null);
            return;
          }

          if (activeToolRef.current === "measure-area") {
            if (!event.mapPoint || !view) return;
            event.stopPropagation();

            clearInterval(sampleTimerRef.current);
            sampleTimerRef.current = undefined;
            setSampleOf(null);

            const points = tractRef.current;
            const next: LonLat = {
              longitude: event.mapPoint.longitude,
              latitude: event.mapPoint.latitude,
            };

            // Clicking the first corner again closes the ring — within 12px on
            // screen, so it forgives an imprecise click on a 9px dot.
            if (points.length >= 3) {
              const first = screenOf(points[0]);
              if (first) {
                const dx = event.x - first.x;
                const dy = event.y - first.y;
                if (dx * dx + dy * dy <= 144) {
                  drawTract(points, true);
                  setTractResult(
                    measureTract(clustersRef.current, wellsRef.current, points),
                  );
                  activeToolRef.current = null;
                  setActiveTool(null);
                  return;
                }
              }
            }

            const grown = [...points, next];
            tractRef.current = grown;
            drawTract(grown, false);
            return;
          }

          if (activeToolRef.current !== "whats-near-my-land") return;
          if (!event.mapPoint || !ctors) return;

          event.stopPropagation();

          clearInterval(sampleTimerRef.current);
          sampleTimerRef.current = undefined;
          setSampleOf(null);

          const at = {
            longitude: event.mapPoint.longitude,
            latitude: event.mapPoint.latitude,
          };
          /* A fresh click starts at the tightest ring, which is what the
             service is asked for first. */
          const next: Nearby = { at, radiusMiles: NEARBY_RADII[0] };
          setWatchRadius(NEARBY_RADII[0]);

          nearbyRef.current = next;
          setNearby(next);
          drawNearby(next);
          frameRadius(at);
          anchorBars();

          /*
           * And ask the service what is near the lease that point sits on.
           *
           * The circle above is measured from what the map has loaded; this is
           * the lease's own record. Two steps, because a click knows only
           * where it landed: the nearest well, then that well's summary, which
           * is where the district and the lease number come from.
           */
          const candidates = nearestWellsTo(at, wellsRef.current, LEASE_TRIES);
          const leaseRequest = ++leaseRequestRef.current;

          /* The card says something in every branch below, including the ones
             that fail — a click that answers with nothing reads as a broken
             tool. */
          setLeaseNearbyOpen(true);
          setWatchLease(null);
          setWatchAnswer({ kind: "looking" });

          if (candidates.length === 0) {
            setWatchAnswer({
              kind: "problem",
              message:
                "No well is loaded near that point, so there is no lease to ask about. Zoom in until the wells are drawn, then click your land again.",
            });
          } else {
            /*
             * Outward from the click until a record names its lease.
             *
             * A well's record does not always carry a lease number, and
             * without one there is no key to ask the service about. Rather
             * than give up on the nearest well, the next few are tried in
             * order — one at a time, stopping at the first that answers, so
             * the usual case is still a single request.
             */
            void (async () => {
              for (const well of candidates) {
                let summary;
                try {
                  summary = await getWellSummaryMap(well.api);
                } catch {
                  continue;
                }
                if (leaseRequest !== leaseRequestRef.current) return;

                const district =
                  summary.lease?.district ?? summary.identity?.district;
                const number = summary.lease?.leaseNumber;
                if (!district || !number) continue;

                setWatchLease({
                  key: `${district}-${number}`,
                  name: summary.lease?.leaseName ?? well.lease,
                });
                return;
              }

              if (leaseRequest !== leaseRequestRef.current) return;
              setWatchAnswer({
                kind: "problem",
                message: `None of the ${candidates.length} wells nearest that point names a lease number on its record, so the service cannot be asked about a lease there. Try clicking closer to a well.`,
              });
            })();
          }

          activeToolRef.current = null;
          setActiveTool(null);
        });

        dragHandle = view.on("drag", (event) => {
          const tool = activeToolRef.current;
          // These two take clicks, not drags — the corner tool because a tract
          // is placed corner by corner, the watch tool because it is a single
          // point. A pointer that slides a few pixels between press and
          // release still fires `drag`, and that must not be read as a
          // gesture, nor pan the map out from under the prompt.
          if (tool === "whats-near-my-land" || tool === "measure-area") {
            event.stopPropagation();
            return;
          }
          if (!tool || !view) return;

          // Without this the drag pans the map underneath the drawing.
          event.stopPropagation();

          /* The press, falling back to Esri's own origin if for any reason
             no pointer-down was seen — a box anchored slightly late is better
             than no box at all. */
          const from = view.toMap(pressRef.current ?? event.origin);
          const to = view.toMap({ x: event.x, y: event.y });
          if (!from || !to) return;

          if (tool === "draw-area") {
            // A real drag takes over from the sample mid-play.
            clearInterval(sampleTimerRef.current);
            sampleTimerRef.current = undefined;

            const next = boxBetween(from, to);
            // From here it is the reader's box, not the demonstration.
            setSampleOf(null);
            // A drag supersedes a click-started box.
            areaStartRef.current = null;
            trackArea(next);
          } else if (tool === "measure-distance") {
            const ctors = ctorsRef.current;
            if (!ctors) return;

            // A real drag takes over from the sample mid-play.
            clearInterval(sampleTimerRef.current);
            sampleTimerRef.current = undefined;
            setSampleOf(null);

            const ends = [from, to].map(
              ({ longitude, latitude }) =>
                new ctors.Point({
                  longitude,
                  latitude,
                  spatialReference: { wkid: 4326 },
                }),
            );

            const next: Measurement = {
              from: { longitude: from.longitude, latitude: from.latitude },
              to: { longitude: to.longitude, latitude: to.latitude },
              meters: ctors.geodesic.geodesicDistance(
                ends[0],
                ends[1],
                "meters",
              ).distance,
            };
            measurementRef.current = next;
            setMeasurement(next);
            drawMeasurement(next);
          } else {
            // A tool with no drag behaviour. Nothing to draw.
            return;
          }

          anchorBars();

          if (event.action === "end") {
            // One shape per activation — the tool disarms on release.
            activeToolRef.current = null;
            setActiveTool(null);
          }
        });

        await view.when();
        if (cancelled) return;

        setStatus("ready");

        // The opening load. The extent is only real once the view has laid
        // itself out, and the band it lands in is the one to beat.
        // The legend's icons are what the wells are drawn with, so they are
        // fetched first — a failure just means the fallback dot.
        const icons = getLegendListMap()
          .then((legends) => {
            wellIconsRef.current = new Map(
              legends.map((legend) => [legend.description, legend.iconUrl]),
            );
          })
          .catch(() => {});

        /*
         * A shared link, applied once the symbols are in hand.
         *
         * Applied here rather than on mount because the filter draws wells and
         * moves the camera, both of which need a view that has laid itself
         * out — and after the legend because `buildWellGraphics` reads those
         * icons as it draws. Jumping the queue drew twenty thousand wells as
         * the fallback dot, which is what a shared link was showing.
         */
        if (Object.keys(openingFilters).length > 0) {
          void icons.then(() => {
            if (cancelled) return;
            applyFiltersRef.current?.(openingFilters);
          });
          return;
        }

        if (zoomLevel(view) >= WELL_ZOOM) {
          loadWells();
        } else {
          clusterTierRef.current = clusterZoomTier(zoomLevel(view));
          loadClusters();
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      watcher?.remove();
      dragHandle?.remove();
      clickHandle?.remove();
      pointerHandle?.remove();
      pressHandle?.remove();
      leaveHandle?.remove();
      areaLayerRef.current = null;
      measureLayerRef.current = null;
      nearbyLayerRef.current = null;
      tractLayerRef.current = null;
      clearTimeout(clusterTimer);
      ctorsRef.current = null;
      viewRef.current = null;
      clusterLayerRef.current = null;
      highlightLayerRef.current = null;
      clearInterval(pulseTimerRef.current);
      view?.destroy();
    };
    // All stable, so the view is still built exactly once.
  }, [
    drawArea,
    trackArea,
    drawMeasurement,
    drawNearby,
    drawTract,
    frameRadius,
    anchorBars,
    loadClusters,
    clearClusters,
    loadWells,
    clearWells,
    highlightWell,
    /* Read once at mount and never reassigned, so listing it changes nothing
       — it is here to satisfy the rule rather than because it can vary. */
    openingFilters,
  ]);

  // Esc backs out of an armed tool — the prompt says so.
  useEffect(() => {
    if (!activeTool) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      areaStartRef.current = null;
      drawArea(null);
      activeToolRef.current = null;
      setActiveTool(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeTool, drawArea]);

  /*
   * Arms a tool, and clears whatever any tool drew before it.
   *
   * One drawing at a time. Clearing only the tool being armed left a drawn box
   * sitting under a measured line, each with its own card floating over the
   * map, and nothing said which belonged to which. Picking a tool is a fresh
   * start.
   */
  const startTool = useCallback(
    (tool: ActiveTool) => {
      activeToolRef.current = tool;
      setActiveTool(tool);

      // Whatever the last pick was playing, it is not what is wanted now.
      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = undefined;
      setSampleOf(null);

      areaRef.current = null;
      areaStartRef.current = null;
      setArea(null);
      setAreaAnchor(null);
      drawArea(null);

      measurementRef.current = null;
      setMeasurement(null);
      setMeasureAnchor(null);
      drawMeasurement(null);

      // The county lookup is in flight for the old pick; its answer is no
      // longer wanted.
      nearbyRef.current = null;
      setNearby(null);
      drawNearby(null);

      tractRef.current = [];
      setTractResult(null);
      drawTract([], false);

      // Draw an area opens with a worked example rather than an empty map.
      /* Arming opens nothing: the card appears on the first click. */
      setLeaseNearbyOpen(false);
      leaseRequestRef.current += 1;
      setWatchLease(null);
      setWatchAnswer({ kind: "looking" });

      /*
       * The worked example, the first time only.
       *
       * It answers "which gesture does this one want", which is a question
       * asked once. Seen already, the tool arms straight away and the map is
       * ready for the gesture — which is what someone reaching for it a second
       * time came to do.
       *
       * "What's near my land?" has none. It no longer waits for a gesture —
       * it asks which lease, and the card that asks is the instruction. A
       * demo circle only put a second answer on the map beside the real one.
       */
      /*
       * Every tool opens with a worked example rather than an empty map: each
       * waits for a gesture, and which gesture is not something a panel can
       * say in a sentence anybody reads. The example runs in its own window —
       * see `tool-demo.tsx`.
       */
      if (!tool || demoSeen(tool)) return;
      setDemoTool(tool);
    },
    [drawArea, drawMeasurement, drawNearby, drawTract],
  );

  const changeWatchRadius = useCallback(
    (radiusMiles: number) => {
      const current = nearbyRef.current;
      if (!current) return;

      /* The circle is redrawn here; the figures come from the effect below,
         which asks the service for the new ring. */
      const next: Nearby = { ...current, radiusMiles };
      nearbyRef.current = next;
      setNearby(next);
      setWatchRadius(radiusMiles);
      drawNearby(next);
      anchorBars();
    },
    [drawNearby, anchorBars],
  );

  const clearNearby = useCallback(() => {
    nearbyRef.current = null;
    setNearby(null);
    drawNearby(null);
  }, [drawNearby]);

  const changeViewTab = useCallback((tab: ViewTab) => {
    /*
     * Coming back to the map puts the ring out.
     *
     * The ring is there to find the well you just picked while the summary is
     * open beside it. Returning to the full map is done with that well, and a
     * ring left pulsing over it marks a choice nobody is looking at any more —
     * and cannot be dismissed, since clicking it only picks the well again.
     */
    if (tab === "map") {
      clearInterval(pulseTimerRef.current);
      highlightLayerRef.current?.removeAll();
    }

    setViewTab(tab);
  }, []);

  /*
   * The Insights divider. Pointer capture rather than window listeners: the
   * drag keeps following the pointer even when it leaves the 7px handle, and
   * the browser cleans the capture up for us if the gesture is interrupted.
   */
  const split = splitTouched
    ? splitRatio
    : stacked
      ? STACKED_DEFAULT_SPLIT
      : DEFAULT_SPLIT;

  const splitFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const bounds = rootRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const span = stacked ? bounds.height : bounds.width;
      if (!span) return;

      const ratio = stacked
        ? (clientY - bounds.top) / span
        : (clientX - bounds.left) / span;
      setSplitTouched(true);
      setSplitRatio(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, ratio)));
    },
    [stacked],
  );

  const onSplitPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      // Arm the drag before asking for capture: `setPointerCapture` can throw
      // if the pointer is already gone, and it must not take the drag with it.
      draggingSplitRef.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is an optimisation — the drag still tracks without it.
      }
    },
    [],
  );

  const onSplitPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (draggingSplitRef.current) {
        splitFromPointer(event.clientX, event.clientY);
      }
    },
    [splitFromPointer],
  );

  const onSplitPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      draggingSplitRef.current = false;
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Already released, or never captured.
      }
    },
    [],
  );

  const onSplitKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const back = stacked ? "ArrowUp" : "ArrowLeft";
      const forward = stacked ? "ArrowDown" : "ArrowRight";
      const step =
        event.key === back
          ? -SPLIT_KEY_STEP
          : event.key === forward
            ? SPLIT_KEY_STEP
            : 0;

      if (step) {
        event.preventDefault();
        setSplitTouched(true);
        setSplitRatio((current) =>
          Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, current + step)),
        );
      } else if (event.key === "Home") {
        event.preventDefault();
        setSplitTouched(false);
      }
    },
    [stacked],
  );

  const downloadNearby = useCallback(() => {
    if (watchAnswer.kind === "ready") downloadNearbyFilings(watchAnswer.data);
  }, [watchAnswer]);

  /*
   * The ring itself, asked for whenever the lease or the distance changes.
   *
   * Kept as an effect rather than done in the click and again in the radius
   * buttons: both of those only change what is being asked, and one place that
   * notices is less to keep in step. The answer is stored against what it
   * answers, so a slower reply for a distance no longer chosen is ignored
   * rather than shown.
   */
  useEffect(() => {
    if (!watchLease) return;

    let cancelled = false;
    const asked = `${watchLease.key}@${watchRadius}`;

    getLeaseNearbyMap(watchLease.key, watchRadius)
      .then((found) => {
        if (cancelled || asked !== `${watchLease.key}@${watchRadius}`) return;
        setWatchAnswer(
          found ? { kind: "ready", data: found } : { kind: "no-ring" },
        );
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setWatchAnswer({
          kind: "problem",
          message:
            failure instanceof Error
              ? failure.message
              : "Could not read what is near this lease.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [watchLease, watchRadius]);

  const clearArea = useCallback(() => {
    areaRef.current = null;
    setArea(null);
    setSampleOf(null);
    setAreaAnchor(null);
    drawArea(null);
  }, [drawArea]);

  const clearMeasurement = useCallback(() => {
    measurementRef.current = null;
    setMeasurement(null);
    setMeasureAnchor(null);
    drawMeasurement(null);
  }, [drawMeasurement]);

  /*
   * The drawn box, as a file.
   *
   * Through the same export the toolbar uses, so it writes one row per well —
   * API number, lease, operator, status — whenever wells are what is on the
   * map, and falls back to bubble rows only when they are. It used to go
   * through the cluster-only export, which past the well zoom had nothing to
   * write and handed over a file with only a header line.
   */
  /*
   * Closing the sample takes the sample away, and nothing else.
   *
   * `clearArea` on its own leaves the tool armed, but there is no way to see
   * that: the box and its card both go, and the map looks like it did before
   * anything was picked. Re-arming here is explicit — the prompt comes back and
   * says the tool is still waiting for a gesture, without replaying the sample
   * that was just dismissed.
   */
  const dismissSample = useCallback(
    (tool: ActiveTool) => {
      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = undefined;
      setSampleOf(null);

      if (tool === "draw-area") {
        areaStartRef.current = null;
        clearArea();
      } else if (tool === "measure-distance") {
        clearMeasurement();
      } else if (tool === "whats-near-my-land") {
        clearNearby();
      } else if (tool === "measure-area") {
        tractRef.current = [];
        setTractResult(null);
        drawTract([], false);
      }

      // Still armed, and the prompt says so — dismissing the demonstration is
      // not putting the tool away.
      activeToolRef.current = tool;
      setActiveTool(tool);
    },
    [clearArea, clearMeasurement, clearNearby, drawTract],
  );

  const exportArea = useCallback(() => {
    if (!areaRef.current) return;
    exportVisible(clustersRef.current, wellsRef.current, areaRef.current);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const view = viewRef.current;
    view?.goTo({ scale: view.scale * factor }).catch(ignoreInterrupted);
  }, []);

  const zoomIn = useCallback(() => zoomBy(0.5), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(2), [zoomBy]);

  /** Back to the opening view — the Texas extent at 1:7,262,011. */
  const goHome = useCallback(() => {
    viewRef.current
      ?.goTo({ center: HOME_CENTER, scale: homeScale() })
      .catch(ignoreInterrupted);
  }, []);

  /**
   * Fullscreens the whole map surface — chrome included, so the toolbar and
   * panels come along — rather than the bare Esri container. The view resizes
   * itself; it watches its container.
   */
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(reportFullscreenFailure);
    } else {
      rootRef.current?.requestFullscreen().catch(reportFullscreenFailure);
    }
  }, []);

  const changeBasemap = useCallback((id: string) => {
    setBasemap(id);
    if (mapRef.current) mapRef.current.basemap = id;
  }, []);

  const saveImage = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;

    try {
      const { dataUrl } = await view.takeScreenshot({ format: "png" });

      // Anchor rather than `window.open`: a data URL in a new tab trips popup
      // blockers, and `download` names the file.
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = SCREENSHOT_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Could not capture the map.", error);
    }
  }, []);

  const printMap = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;

    try {
      const { dataUrl } = await view.takeScreenshot({ format: "png" });
      printImage(dataUrl);
    } catch (error) {
      console.error("Could not capture the map for printing.", error);
    }
  }, []);

  return (
    <div
      ref={rootRef}
      className={`mv-map relative h-full w-full bg-[#efe7d8] ${
        activeTool
          ? "cursor-crosshair"
          : hoveredCluster && readout.zoom < WELL_ZOOM
            ? "cursor-pointer"
            : ""
      }`}
    >
      {/*
       * The className here must stay static. ArcGIS writes its own classes onto
       * the container it is given — `esri-view`, plus the `esri-view-width-*`
       * and `esri-view-height-*` breakpoints it keeps in step with the element's
       * size — and React sets className wholesale, so any dynamic class on this
       * element silently deletes them. The draw cursor lives on the root above
       * for exactly that reason.
       */}
      {/*
       * Insights splits the surface in half. Everything that belongs to the map
       * — the Esri container and every overlay anchored to it — goes inside
       * this wrapper, so the chrome, the tool bars and `view.toScreen` all
       * measure against the map half rather than the whole page.
       */}
      <div
        className={
          viewTab !== "insights"
            ? "absolute inset-0"
            : stacked
              ? "absolute inset-x-0 top-0 overflow-hidden"
              : "absolute inset-y-0 left-0 overflow-hidden"
        }
        style={
          viewTab !== "insights"
            ? undefined
            : stacked
              ? { height: `${split * 100}%` }
              : { width: `${split * 100}%` }
        }
      >
        <div ref={containerRef} className="h-full w-full" />

        {/*
        While a request is out, the map goes behind a blur and stops taking
        input. Half-drawn bubbles are worse than none: mid-load the map is
        showing the last extent's answer, and letting someone pan or click that
        is letting them act on something already known to be stale.

        `backdrop-blur` over the whole view rather than a filter on the map
        container — the filter would create a containing block and every
        absolutely-positioned overlay inside would reposition against it.
      */}
        {status === "ready" && (clustersLoading || wellsLoading) && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-white/35 backdrop-blur-[3px]">
            <div className="flex items-center gap-[13px] rounded-full border border-mv-line bg-white px-[22px] py-[13px] shadow-mv-lg">
              <span
                aria-hidden="true"
                className="h-[20px] w-[20px] shrink-0 animate-spin rounded-full border-[3px] border-mv-line border-t-mv-green-deep"
              />
              <span className="text-[15px] font-semibold leading-none text-mv-slate">
                {/* The second cluster band is a finer aggregation of the first,
                  so it is named for what it is. */}
                {clustersLoading
                  ? readout.zoom >= CLUSTER_ZOOM_STEPS[1]
                    ? "Loading sub-clusters…"
                    : "Loading clusters…"
                  : "Loading wells…"}
              </span>
            </div>
          </div>
        )}

        {/* A pill instead of a veil — nothing is loading, so nothing should
          be blurred, and the map still shows what it last had. Marked in red:
          each of these is the map failing to show something, and in the house
          grey they read as one more caption. */}
        {status === "ready" &&
          !clustersLoading &&
          !wellsLoading &&
          (clusterError || wellError || noMatches) && (
            <div
              role="alert"
              /* Where the toast goes, and for the same reasons. The two
                 never appear at once. */
              className={`pointer-events-none absolute left-1/2 top-[128px] z-30 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-[7px] rounded-full border border-[#f6c9c6] bg-mv-red-bg px-[13px] py-[6px] text-[11.5px] font-semibold text-mv-red shadow-mv ${noticePlacement}`}
            >
              <TriangleAlert
                size={13}
                strokeWidth={2.5}
                aria-hidden="true"
                className="shrink-0"
              />
              {clusterError ??
                wellError ??
                "No wells match these filters — try removing one."}
            </div>
          )}

        {status === "ready" && timeLapseOpen && (
          <TimeLapseBar
            playing={timeLapsePlaying}
            year={
              timeLapseStep >= 0
                ? (timeLapseYears[timeLapseStep]?.year ?? null)
                : null
            }
            firstYear={timeLapseYears[0]?.year ?? null}
            lastYear={timeLapseYears[timeLapseYears.length - 1]?.year ?? null}
            step={timeLapseStep}
            steps={timeLapseYears.length}
            plotted={wellsUpTo(timeLapseYears, timeLapseStep).length}
            total={datedCount(timeLapseYears)}
            undated={timeLapseUndated}
            onSeek={(step) => {
              /* Taking the handle stops the replay: it would otherwise keep
               stepping forward under the drag and fight it. */
              setTimeLapsePlaying(false);
              seekTimeLapse(step);
            }}
            onTogglePlay={() => {
              const years = timeLapseYearsRef.current;
              if (years.length > 0 && timeLapseStep >= years.length - 1) {
                seekTimeLapse(-1);
                setTimeLapsePlaying(true);
                return;
              }
              setTimeLapsePlaying((playing) => !playing);
            }}
            onClose={closeTimeLapse}
          />
        )}

        {status === "ready" && toast && (
          <MapToast
            key={toast}
            message={toast}
            className={noticePlacement}
            onDone={() => setToast(null)}
          />
        )}

        {status === "ready" && hoveredWell && (
          <WellTooltip well={hoveredWell} />
        )}

        {status === "ready" &&
          hoveredCluster &&
          clusters[hoveredCluster.index] && (
            <ClusterTooltip
              cluster={clusters[hoveredCluster.index]}
              /* The first level opens the area; the second zooms to the wells.
             Past the well band the bubbles are gone, so neither applies. */
              action={
                readout.zoom < CLUSTER_ZOOM_STEPS[1]
                  ? "area"
                  : readout.zoom < WELL_ZOOM
                    ? "wells"
                    : null
              }
              at={{ x: hoveredCluster.x, y: hoveredCluster.y }}
              bubble={hoveredCluster.bubble}
            />
          )}

        {/* Whichever tool is demonstrating itself, said once, across the top. */}
        {status === "ready" && sampleOf && (
          <SampleBanner
            tool={sampleOf}
            onDismiss={() => dismissSample(sampleOf)}
          />
        )}

        {status === "ready" && area && areaAnchor && (
          <AreaSelectionBar
            sample={sampleOf === "draw-area"}
            onClear={
              sampleOf === "draw-area"
                ? () => dismissSample("draw-area")
                : clearArea
            }
            /* Not hand-memoised: the compiler caches this against `wells`,
             `clusters` and `area`, and a manual `useMemo` only gives it
             something to disagree with. What made it expensive was being
             recomputed on every pointer event — which the frame-coalescing
             above now prevents. */
            count={
              wells.length > 0
                ? wellsInBox(wells, area)
                : wellsInArea(clusters, area)
            }
            /* Exact where the wells themselves are on the map; from the bubbles
             otherwise, which the card says out loud. */
            exact={wells.length > 0}
            size={boxArea(area)}
            at={areaAnchor}
            onExport={exportArea}
          />
        )}

        {status === "ready" && measurement && measureAnchor && (
          <MeasureBar
            meters={measurement.meters}
            sample={sampleOf === "measure-distance"}
            at={measureAnchor}
            onClear={
              sampleOf === "measure-distance"
                ? () => dismissSample("measure-distance")
                : clearMeasurement
            }
          />
        )}

        {status === "ready" && !demoTool && activeTool === "draw-area" && (
          <ToolPrompt
            title="Click two opposite corners on the map, or drag a box across it."
            hint="Esc to cancel"
          />
        )}

        {status === "ready" &&
          !demoTool &&
          activeTool === "measure-distance" && (
            <ToolPrompt
              title="Drag from one point to another to measure the distance."
              hint="Esc to cancel"
            />
          )}

        {/*
          Armed, this tool asks which lease — that is what the service holds
          rings for, and a lease is what "my land" means. The prompt underneath
          keeps the other way in: clicking the map still draws the circle and
          the quick local estimate.
      */}
        {/*
          Armed, this tool asks which lease — a lease is what "my land" means,
          and it is what the service holds rings for.

          Both ways in are on screen at once, which is why this one sits at the
          top: the sample circle and the card it opens own the bottom of the
          map, and the two were landing on the same pixels. Clicking the map
          still draws the circle and its local estimate; naming the lease is
          what asks the service.
      */}
        {/*
          The lease card stays up until it is closed, whatever the map does
          around it. Clicking the map is the other way of asking — it draws the
          circle and its local estimate — and doing that must not discard an
          answer the service has already given.
      */}
        {/*
          Only once a click has found a lease. There is nothing to show before
          that — the question is asked by clicking your land, and the prompt
          below says so.

          Keyed by the lease, so a new click opens the card on the new lease
          rather than leaving the last answer on screen while the next loads.
      */}
        {/* Shown once when a tool is picked; closing it leaves that tool armed
          on an empty map. The wells it plots are the ones the map has loaded,
          so the field in the picture is the reader's own. */}
        {status === "ready" && demoTool && (
          <ToolDemo
            tool={demoTool}
            wells={wells}
            /* Recorded on the way out, whichever way it is closed: "Let me try"
             and the × both mean the reader is done with the explanation. */
            onClose={() => {
              rememberDemo(demoTool);
              setDemoTool(null);
            }}
          />
        )}

        {status === "ready" &&
          !demoTool &&
          activeTool === "whats-near-my-land" &&
          !leaseNearbyOpen && <NearbyPrompt />}

        {status === "ready" &&
          !demoTool &&
          (activeTool === "measure-area" || tractResult) && (
            <MeasureAreaPanel
              className="absolute bottom-6 left-1/2"
              result={tractResult}
              sample={sampleOf === "measure-area"}
              onClose={() => {
                if (sampleOf === "measure-area") {
                  dismissSample("measure-area");
                  return;
                }
                tractRef.current = [];
                setTractResult(null);
                drawTract([], false);
                startTool(null);
              }}
            />
          )}

        {/* One card for this tool: the circle on the map, and what the service
          says about the lease under it. */}
        {status === "ready" && leaseNearbyOpen && nearby && (
          <NearbyPanel
            className="absolute bottom-6 left-1/2"
            coordinates={nearby.at}
            radiusMiles={watchRadius}
            lease={watchLease}
            answer={watchAnswer}
            onRadiusChange={changeWatchRadius}
            onDownload={downloadNearby}
            onClose={clearNearby}
          />
        )}

        {status === "ready" ? (
          <MapChrome
            scale={readout.scale}
            zoom={readout.zoom}
            /*
             * What is actually drawn, not what the zoom implies.
             *
             * Wells reach the map two ways: the extent load past zoom 10, and a
             * filter, which draws its matches at whatever zoom the fit lands on
             * — often 9 or wider. Deciding from the zoom alone left the legend
             * showing count bands over a map of individual wells, and disabled
             * Time-lapse on a filtered set it could perfectly well replay.
             */
            wellsVisible={wells.length > 0}
            marksVisible={wells.length > 0 || readout.zoom > CLUSTER_CLEAR_ZOOM}
            onExportCsv={exportCsv}
            onSelectApi={selectApi}
            onClearApi={clearApi}
            onApplyFilters={applyFilters}
            /* Changing this rebuilds the filters panel with nothing ticked —
               see the empty-result reset. */
            filtersResetAt={filterResetAt}
            /* So the boxes agree with the map a shared link just drew. */
            openingFilters={openingFilters}
            timeLapseOpen={timeLapseOpen}
            onToggleTimeLapse={toggleTimeLapse}
            center={readout.center}
            basemap={basemap}
            onBasemapChange={changeBasemap}
            onSaveImage={saveImage}
            onPrint={printMap}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            viewTab={viewTab}
            onViewTabChange={changeViewTab}
            compact={viewTab === "insights"}
            /* Stacked on a phone, the map is a 200px strip above the record.
               Its controls would cover most of it, and every one of them is a
               tab away on a map that fills the screen. */
            bare={stacked && viewTab === "insights"}
            activeTool={activeTool}
            onSelectTool={startTool}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onHome={goHome}
          />
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 grid place-items-center bg-[#efe7d8] text-sm text-mv-slate"
          >
            {status === "loading"
              ? "Loading map…"
              : "The map could not be loaded."}
          </div>
        )}
      </div>

      {status === "ready" && viewTab === "insights" && (
        <>
          <div
            className={
              stacked
                ? "absolute inset-x-0 bottom-0 border-t border-mv-line"
                : "absolute inset-y-0 right-0 border-l border-mv-line"
            }
            style={
              stacked
                ? { height: `${(1 - split) * 100}%` }
                : { width: `${(1 - split) * 100}%` }
            }
          >
            {/* Insights is about one well. Without one there is nothing to
                summarise, so it says so rather than showing statewide figures
                that have nothing to do with what was clicked. */}
            {selectedWell ? (
              /* Keyed by API number: a new well is a new panel, so its own
                 summary request starts from nothing rather than the panel
                 showing the previous well's figures until the answer lands. */
              <WellInsightsPanel
                key={selectedWell.api}
                well={selectedWell}
                onClose={closeSummary}
              />
            ) : (
              <div className="grid h-full place-items-center bg-mv-bg p-6">
                <div className="max-w-[280px] text-center">
                  <span className="mx-auto grid h-[44px] w-[44px] place-items-center rounded-full bg-mv-mint text-mv-green-deep">
                    <MapPin size={20} aria-hidden="true" />
                  </span>
                  <h2 className="mt-3 text-[15px] font-bold text-mv-ink">
                    Pick a well
                  </h2>
                  <p className="mt-[6px] text-[12.5px] leading-snug text-mv-muted">
                    Click a well on the map to see its production, wellbore and
                    lease summary here. Zoom in past the bubbles to draw
                    individual wells.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* The 7px hit area is wider than the 1px seam it sits on, so the
              handle is grabbable without a visible bar. `title` gives the
              hint; the browser's own tooltip is what the mock shows. */}
          <div
            role="separator"
            aria-orientation={stacked ? "horizontal" : "vertical"}
            aria-label="Resize map and insights"
            aria-valuenow={Math.round(split * 100)}
            aria-valuemin={Math.round(MIN_SPLIT * 100)}
            aria-valuemax={Math.round(MAX_SPLIT * 100)}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            onPointerDown={onSplitPointerDown}
            onPointerMove={onSplitPointerMove}
            onPointerUp={onSplitPointerUp}
            onPointerCancel={onSplitPointerUp}
            onDoubleClick={() => setSplitTouched(false)}
            onKeyDown={onSplitKeyDown}
            className={`group absolute z-30 touch-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-mv-green-deep ${
              stacked
                ? "inset-x-0 -mt-[3px] h-[7px] cursor-row-resize"
                : "inset-y-0 -ml-[3px] w-[7px] cursor-col-resize"
            }`}
            style={
              stacked ? { top: `${split * 100}%` } : { left: `${split * 100}%` }
            }
          >
            <span
              aria-hidden="true"
              /* The bar itself, in ink: at 3px on a pale seam the old grey
                 was invisible against the map above it. */
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mv-ink group-hover:bg-mv-green-deep ${
                stacked ? "h-[3px] w-10" : "h-10 w-[3px]"
              }`}
            />
          </div>
        </>
      )}

      {status === "ready" && viewTab === "table" && (
        <WellsTable
          activeTab={viewTab}
          onTabChange={changeViewTab}
          onShowOnMap={showRowOnMap}
        />
      )}
    </div>
  );
}

/**
 * Prints a captured map through an off-screen iframe.
 *
 * `window.print()` on the page itself is not an option: the map is a WebGL
 * canvas, which print renderers capture unreliably, and it would drag the site
 * header, the toolbar and every panel onto the paper. Printing a flat PNG in
 * its own document sidesteps both. An iframe rather than a popup window, so
 * there is no blocker to trip over.
 */
function printImage(dataUrl: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }

  const style = doc.createElement("style");
  style.textContent =
    "@page{margin:12mm}html,body{margin:0;padding:0}" +
    "img{width:100%;height:auto;display:block}";
  doc.head.appendChild(style);

  // Built as a node, not written as HTML — the data URL never has to survive
  // being interpolated into markup.
  const image = doc.createElement("img");
  image.alt = "Map";
  image.src = dataUrl;
  doc.body.appendChild(image);

  const print = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // The print dialog is modal but `print()` returns immediately in some
    // browsers, so the frame outlives the call briefly rather than being torn
    // out from under it.
    setTimeout(() => frame.remove(), 1000);
  };

  if (image.complete) print();
  else image.addEventListener("load", print, { once: true });
}
