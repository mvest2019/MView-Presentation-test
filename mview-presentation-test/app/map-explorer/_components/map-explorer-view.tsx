"use client";

import { MapPin } from "lucide-react";
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
import {
  WellInsightsPanel,
  type SelectedWell,
} from "./well-insights-panel";
import { MapChrome, type ViewTab } from "./map-chrome";
import {
  MeasureAreaPanel,
  type AreaMeasurement,
} from "./measure-area-panel";
import { ToolDemo, type DemoTool } from "./tool-demo";
import { MapFeatureGuide } from "./map-feature-guide";
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
  getTimeLapseMap,
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
import { ToolPrompt } from "./tool-prompt";
import { buildWellGraphics } from "./well-graphics";
import { TimeLapseBar } from "./time-lapse-bar";
import {
  addYear,
  buildGrid,
  gridToClusters,
  resetGrid,
  TIME_LAPSE_CLUSTER_CELL,
  TIME_LAPSE_SUB_CLUSTER_CELL,
  type TimeLapseGrid,
} from "./timelapse-graphics";
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
  toMap(screenPoint: { x: number; y: number }): LonLat | null;
  toScreen(mapPoint: unknown): { x: number; y: number } | null;
  /** What is under a screen point. `include` narrows it to one layer. */
  hitTest(
    screenPoint: { x: number; y: number },
    options?: { include?: unknown },
  ): Promise<{
    results: { graphic?: { attributes?: Record<string, unknown> } }[];
  }>;
  goTo(target: unknown): Promise<unknown>;
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

type GraphicsLayerCtor = new (props?: {
  id?: string;
}) => EsriGraphicsLayer;

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
  if (window.matchMedia("(max-width: 1023px)").matches) return HOME_SCALE_TABLET;
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
 * Stacked, the map takes the larger share. An even split reads differently on
 * the two axes: half the width still shows a recognisable stretch of Texas,
 * half the height on a phone shows a band too short to pan around in, while
 * the cards below simply scroll — they lose far less to being shorter than
 * the map does.
 */
const STACKED_DEFAULT_SPLIT = 0.67;
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
 * The data spans 117 years, so this is the length of the whole replay divided
 * by that — a little over a minute end to end.
 *
 * Slow on purpose. At a fifth of a second a year the decades went by faster
 * than the bubbles could be read: the Permian and East Texas filling in after
 * 1950 was a flicker rather than something you could watch happen. The drag
 * handle is there for anyone who wants to move faster than this.
 *
 * A tick costs more than this number: redrawing the cells and re-rendering the
 * bar adds roughly a third of a second, so the replay runs at about twice the
 * figure below. Change this one constant to retime the whole thing.
 */
const TIME_LAPSE_TICK_MS = 420;

/*
 * Where the bubbles give way to the wells themselves. Past this the extent is
 * small enough that the count is manageable and an aggregate says less than
 * the individual holes do.
 */
const WELL_ZOOM = 10;

/*
 * How far apart matched wells may be before Apply stops trying to frame them.
 *
 * Three degrees is roughly two hundred miles — a county, a field, or one
 * operator's patch fits inside that; wells in the Permian and the Eagle Ford
 * at once do not.
 */
const FILTER_FIT_MAX_DEGREES = 3;

/** Below this the extent is a point, and this stands in for it. */
const FILTER_FIT_MIN_DEGREES = 0.05;

/** Metres in a degree, near enough for choosing a scale. */
const DEGREE_METRES = 111_320;

/** One well, framed: close enough to read the lease lines around it. */
const SINGLE_WELL_SCALE = 9_000;

/** The furthest out Apply may leave the map — about zoom 8. */
const FILTER_FIT_MAX_SCALE = 1_100_000;

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
 * Below the first step nothing is requested, but what is already drawn stays:
 * zooming out from 5 to 4 or 3 is still looking at the same wells, just from
 * further away. Only past this point is the view so wide that the bubbles no
 * longer describe anything, and they are dropped.
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
      Math.min(values.length - 1, Math.max(0, Math.round(fraction * (values.length - 1))))
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
  const [hoveredCluster, setHoveredCluster] = useState<
    { index: number; x: number; y: number; bubble: number } | null
  >(null);
  const hoveredClusterRef = useRef<{
    index: number;
    x: number;
    y: number;
    bubble: number;
  } | null>(null);
  /*
   * The time-lapse.
   *
   * It replays the whole state from its own endpoint rather than whatever the
   * map happens to be holding: the wells on screen are the ones in the current
   * extent, and a replay of those is a replay of a viewport, not of a field.
   *
   * The data is binned into cells server-side, so what arrives here is a count
   * per cell per year. Everything below is the running total of that.
   */
  const [timeLapseOpen, setTimeLapseOpen] = useState(false);
  const [timeLapseLoading, setTimeLapseLoading] = useState(false);
  const [timeLapseError, setTimeLapseError] = useState<string | null>(null);
  const [timeLapsePlaying, setTimeLapsePlaying] = useState(false);
  /* Which year is on screen, as an index into the years the data carries.
     -1 is "nothing plotted yet", which is where the replay starts. */
  const [timeLapseStep, setTimeLapseStep] = useState(-1);
  /* The same step the interval works from. State is for the bar; the loop
     cannot read it, since the callback closes over the value it started with. */
  const timeLapseStepRef = useRef(-1);
  const [timeLapsePlotted, setTimeLapsePlotted] = useState(0);
  /* The two grids the wells were binned into, kept for the session: the
     answer is the whole state and does not change while the page is open. */
  const timeLapseGridsRef = useRef<{
    cluster: TimeLapseGrid;
    subCluster: TimeLapseGrid;
  } | null>(null);
  /* The fetch-and-bin, in flight.
     Held so the page-load warm-up and a click on the button share one — a
     second call would be a second 48MB download of the same answer. */
  const timeLapseLoadRef = useRef<Promise<{
    cluster: TimeLapseGrid;
    subCluster: TimeLapseGrid;
  }> | null>(null);
  /* The grid the current replay is running on, and its years. */
  const timeLapseRunRef = useRef<TimeLapseGrid | null>(null);
  const timeLapseYearsRef = useRef<number[]>([]);
  /* The same years and total the ref holds, for the bar to render from — a ref
     read during render is not something React tracks, and the compiler's lint
     rejects it outright. */
  const [timeLapseYears, setTimeLapseYears] = useState<number[]>([]);
  const [timeLapseTotal, setTimeLapseTotal] = useState(0);
  /* The bubbles the replay owns, on the cluster layer. Held so closing can put
     the real clusters back over the top of them. */
  const timeLapseLayerRef = useRef<EsriGraphicsLayer | null>(null);
  /* Read by the zoom watcher, which must not reload clusters over a replay —
     a ref because the watcher is registered once and never re-reads state. */
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
  const [guideOpen, setGuideOpen] = useState(false);

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
          color: [255, 255, 255, 0.22],
          outline: { color: TOOL_BLUE, width: 1.5, style: "dash" },
        },
      }),
    );
  }, []);

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
          color: [255, 255, 255, 0.22],
          outline: { color: TOOL_BLUE, width: 1.5, style: "dash" },
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

  /**
   * Which grid the replay draws, for the zoom the map is at.
   *
   * The same two bands the live map uses: one bubble per district-sized cell
   * out wide, the finer grid once those have split. Past the well band there
   * is no grid — the replay is a cluster feature, so it stays on the coarse
   * one rather than pretending to draw wells.
   */
  const timeLapseGrid = useCallback(() => {
    const grids = timeLapseGridsRef.current;
    if (!grids) return null;
    const zoom = zoomLevel(viewRef.current);
    return zoom >= CLUSTER_ZOOM_STEPS[1] ? grids.subCluster : grids.cluster;
  }, []);

  /**
   * Fetches the wells and bins them, at most once per page.
   *
   * Called twice over a page's life and settled once: the warm-up below starts
   * it when the map is ready, and the button awaits whatever that started. A
   * failure clears the promise, so pressing the button again is a real retry
   * rather than a replay of the same rejection.
   */
  const loadTimeLapseGrids = useCallback(async () => {
    if (timeLapseGridsRef.current) return timeLapseGridsRef.current;

    timeLapseLoadRef.current ??= getTimeLapseMap()
      .then((data) => ({
        cluster: buildGrid(data.wells, TIME_LAPSE_CLUSTER_CELL),
        subCluster: buildGrid(data.wells, TIME_LAPSE_SUB_CLUSTER_CELL),
      }))
      .catch((error: unknown) => {
        timeLapseLoadRef.current = null;
        throw error;
      });

    const grids = await timeLapseLoadRef.current;
    timeLapseGridsRef.current = grids;
    return grids;
  }, []);

  /*
   * Warmed as soon as the map is ready, and shown to nobody.
   *
   * The answer is the whole state — 465,000 rows — and fetching it on the
   * click meant forty seconds of waiting before the first bubble. Starting it
   * here means the data is usually in hand before anyone presses the button.
   *
   * It waits for `ready` and then for an idle moment, so it queues behind the
   * map's own first requests rather than competing with them for the
   * connection: nothing on screen depends on it, so it can afford to go last.
   */
  useEffect(() => {
    if (status !== "ready") return;

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void loadTimeLapseGrids().catch(() => {}), {
          timeout: 4000,
        })
      : window.setTimeout(() => void loadTimeLapseGrids().catch(() => {}), 1500);

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
    };
  }, [status, loadTimeLapseGrids]);

  const closeTimeLapse = useCallback(() => {
    timeLapseRef.current = false;
    timeLapseLayerRef.current?.removeAll();
    timeLapseLayerRef.current = null;
    timeLapseRunRef.current = null;
    setTimeLapsePlaying(false);
    timeLapseStepRef.current = -1;
    setTimeLapseStep(-1);
    setTimeLapsePlotted(0);
    setTimeLapseError(null);
    setTimeLapseOpen(false);
    /* The map was left showing the replay, so the real bubbles are asked for
       again — the tier is reset so the request is not treated as a repeat. */
    clusterTierRef.current = -1;
    loadClusters();
  }, [loadClusters]);

  /*
   * Opening clears the map and starts the replay from nothing.
   *
   * The fetch is the slow part — the source builds a list of every dated well
   * in the state — so the bar opens first and says what it is waiting for.
   */
  const openTimeLapse = useCallback(async () => {
    const layer = clusterLayerRef.current;
    if (!layer) return;

    timeLapseRef.current = true;
    timeLapseLayerRef.current = layer;
    setTimeLapseOpen(true);
    setTimeLapseError(null);
    timeLapseStepRef.current = -1;
    setTimeLapseStep(-1);
    setTimeLapsePlotted(0);

    /* Everything comes off: the bubbles, the wells that may be under them, and
       the ring, which would otherwise sit over ground with nothing beneath. */
    layer.removeAll();
    wellLayerRef.current?.removeAll();
    clearInterval(pulseTimerRef.current);
    highlightLayerRef.current?.removeAll();

    /* Usually already done — the warm-up ran when the map became ready — in
       which case this resolves without a request and nothing says "loading". */
    if (!timeLapseGridsRef.current) {
      setTimeLapseLoading(true);
      try {
        await loadTimeLapseGrids();
      } catch (error) {
        setTimeLapseError(
          error instanceof Error
            ? error.message
            : "Could not load the time-lapse.",
        );
        setTimeLapseLoading(false);
        return;
      }
      setTimeLapseLoading(false);
    }

    const grid = timeLapseGrid();
    if (!grid) return;

    resetGrid(grid);
    timeLapseRunRef.current = grid;
    timeLapseYearsRef.current = grid.years;
    setTimeLapseYears(grid.years);
    setTimeLapseTotal(grid.total);
    setTimeLapsePlaying(true);
  }, [timeLapseGrid, loadTimeLapseGrids]);

  const toggleTimeLapse = useCallback(() => {
    if (timeLapseOpen) {
      closeTimeLapse();
      return;
    }
    void openTimeLapse();
  }, [timeLapseOpen, closeTimeLapse, openTimeLapse]);

  /**
   * Draws the map as it stood at a given step, forwards or back.
   *
   * The replay adds a year at a time, which only ever goes one way. Dragging
   * the handle back has to take wells off, and a cell holds one running total
   * rather than a history — so a seek starts from empty and re-adds every year
   * up to the one asked for.
   *
   * That is cheap enough to do on every frame of a drag: the coarse grid is 79
   * cells over 117 years, the fine one 888, and both are plain object reads.
   *
   * Step -1 is before the first year: an empty map, which is where the replay
   * starts and where dragging all the way left returns to.
   */
  const seekTimeLapse = useCallback((step: number) => {
    const grid = timeLapseRunRef.current;
    const layer = timeLapseLayerRef.current;
    const ctors = ctorsRef.current;
    if (!grid || !layer || !ctors) return;

    const years = timeLapseYearsRef.current;
    const target = Math.max(-1, Math.min(step, years.length - 1));

    resetGrid(grid);
    let plotted = 0;
    for (let at = 0; at <= target; at += 1) plotted += addYear(grid, years[at]);

    layer.removeAll();
    layer.addMany(buildClusterGraphics(ctors.Graphic, gridToClusters(grid)));

    timeLapseStepRef.current = target;
    setTimeLapseStep(target);
    setTimeLapsePlotted(plotted);
  }, []);

  /*
   * The replay itself: one year per tick.
   *
   * Each tick folds that year's wells into the running totals and redraws the
   * cells that have anything in them. Redrawing rather than adding is what
   * makes the colour move — a cell's bubble is its total so far, so it climbs
   * the count scale as the decades pass.
   */
  useEffect(() => {
    if (!timeLapsePlaying) return;

    const years = timeLapseYearsRef.current;
    const layer = timeLapseLayerRef.current;
    const ctors = ctorsRef.current;
    const grid = timeLapseRunRef.current;
    if (!layer || !ctors || !grid || years.length === 0) return;

    /*
     * Everything that is not a plain state write happens here, in the tick
     * itself, and not inside a `setState` updater.
     *
     * An updater has to be pure. React invokes them twice in development to
     * prove it, and this one folded a year into the running totals and redrew
     * the map — so every year was counted twice and drawn twice, which both
     * doubled the numbers under the bar and made the replay crawl.
     */
    const timer = setInterval(() => {
      const next = timeLapseStepRef.current + 1;

      if (next >= years.length) {
        setTimeLapsePlaying(false);
        return;
      }

      timeLapseStepRef.current = next;
      const arrived = addYear(grid, years[next]);

      layer.removeAll();
      layer.addMany(buildClusterGraphics(ctors.Graphic, gridToClusters(grid)));

      setTimeLapseStep(next);
      if (arrived > 0) setTimeLapsePlotted((plotted) => plotted + arrived);
    }, TIME_LAPSE_TICK_MS);

    return () => clearInterval(timer);
  }, [timeLapsePlaying]);

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
  const applyFilters = useCallback(
    (filters: Record<string, string[]>) => {
      const ctors = ctorsRef.current;
      const layer = wellLayerRef.current;
      const view = viewRef.current;
      if (!ctors || !layer || !view) return;

      if (Object.keys(filters).length === 0) {
        filteredRef.current = false;
        setToast("Filters cleared");
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

      getMatchedWellsMap(filters)
        .then(({ wells }) => {
          if (request !== wellRequestRef.current) return;

          wellsRef.current = wells;
          setWells(wells);
          setWellError(null);

          /*
           * Said once the matches are in, not when Apply was pressed: until
           * the service has answered there is nothing to confirm, and a
           * request that fails must not have been announced as a success.
           */
          setToast(
            wells.length === 0
              ? "Filters applied — no wells match"
              : `Filters applied — ${wells.length.toLocaleString("en-US")} well${wells.length === 1 ? "" : "s"}`,
          );

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
           * Zoom only when the matches describe one place.
           *
           * A county, or one operator working a single field, fits inside a
           * degree or two. Operators on opposite sides of Texas span the
           * state, and fitting that is the statewide view with extra steps —
           * worse, it throws away wherever the map was.
           *
           * The box is trimmed rather than the outright min and max: a handful
           * of bad coordinates would otherwise define the frame.
           */
          const box = trimmedBox(wells);

          if (box) {
            const spread = Math.max(box.east - box.west, box.north - box.south);

            if (spread <= FILTER_FIT_MAX_DEGREES) {
              // Centre and scale, not an extent: a plain object is not a
              // Geometry and `goTo` will not autocast one.
              const degrees = Math.max(spread, FILTER_FIT_MIN_DEGREES);
              const span = Math.max(
                Math.min(view.width, view.height) * 0.8,
                200,
              );
              const metresPerPixel = (degrees * DEGREE_METRES) / span;

              view
                .goTo({
                  center: [
                    (box.west + box.east) / 2,
                    (box.south + box.north) / 2,
                  ],
                  // Never further out than this: a filter that lands on the
                  // statewide view has not shown anybody anything.
                  scale: Math.min(
                    (metresPerPixel * 96) / 0.0254,
                    FILTER_FIT_MAX_SCALE,
                  ),
                })
                .catch(ignoreInterrupted);
            }
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

  /** Export CSV: whatever is inside the extent right now, wells or bubbles. */
  const exportCsv = useCallback(() => {
    const view = viewRef.current;
    if (!view?.extent) return;

    const { xmin, ymin, xmax, ymax } = view.extent;
    exportVisible(clustersRef.current, wellsRef.current, {
      west: mercatorToLongitude(xmin),
      south: mercatorToLatitude(ymin),
      east: mercatorToLongitude(xmax),
      north: mercatorToLatitude(ymax),
    });
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
        ? project(
            (currentArea.west + currentArea.east) / 2,
            currentArea.north,
          )
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
          // replay — reloading the bubbles would paint over it mid-year.
          if (filteredRef.current || timeLapseRef.current) return;

          const zoom = zoomLevel(view);

          if (zoom < CLUSTER_CLEAR_ZOOM) {
            clearTimeout(clusterTimer);
            clearClusters();
            clearWells();
            return;
          }

          if (zoom >= WELL_ZOOM) {
            // Wells replace the bubbles outright; the tier resets so coming
            // back out counts as a new band and reloads them.
            if (clusterTierRef.current !== -1) {
              clusterTierRef.current = -1;
              clearClusters();
            }
            clearTimeout(clusterTimer);
            clusterTimer = setTimeout(loadWells, 400);
            return;
          }

          clearWells();

          const tier = clusterZoomTier(zoom);
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
          const index = activeToolRef.current ? -1 : clusterAt(event.x, event.y);
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
                    measureTract(
                      clustersRef.current,
                      wellsRef.current,
                      points,
                    ),
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

          const from = view.toMap(event.origin);
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
            areaRef.current = next;
            setArea(next);
            drawArea(next);
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
              meters: ctors.geodesic.geodesicDistance(ends[0], ends[1], "meters")
                .distance,
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
        // fetched alongside — a failure just means the fallback dot.
        void getLegendListMap()
          .then((legends) => {
            wellIconsRef.current = new Map(
              legends.map((legend) => [legend.description, legend.iconUrl]),
            );
          })
          .catch(() => {});

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
       * The drawing tools open with a worked example rather than an empty map:
       * each waits for a gesture, and which gesture is not something a panel
       * can say in a sentence anybody reads.
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

      {/* A failure is a quiet pill instead — nothing is loading, so nothing
          should be blurred, and the map still shows what it last had. */}
      {status === "ready" &&
        !clustersLoading &&
        !wellsLoading &&
        (clusterError || wellError) && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-mv-line bg-white/95 px-3 py-[5px] text-[11.5px] font-semibold text-mv-slate shadow-mv">
            {clusterError ?? wellError}
          </div>
        )}

      {status === "ready" && timeLapseOpen && (
        <TimeLapseBar
          loading={timeLapseLoading}
          error={timeLapseError}
          playing={timeLapsePlaying}
          year={
            timeLapseStep >= 0 ? (timeLapseYears[timeLapseStep] ?? null) : null
          }
          firstYear={timeLapseYears[0] ?? null}
          lastYear={timeLapseYears[timeLapseYears.length - 1] ?? null}
          plotted={timeLapsePlotted}
          total={timeLapseTotal}
          step={timeLapseStep}
          steps={timeLapseYears.length}
          onSeek={(step) => {
            /* Taking hold of the handle stops the replay: it would otherwise
               keep stepping forward under the drag and fight it. */
            setTimeLapsePlaying(false);
            seekTimeLapse(step);
          }}
          onTogglePlay={() => {
            /* Pressing play at the end starts over rather than doing
               nothing — the map is full, and there is nothing left to add. */
            const years = timeLapseYearsRef.current;
            const grid = timeLapseRunRef.current;
            if (grid && years.length > 0 && timeLapseStep >= years.length - 1) {
              resetGrid(grid);
              timeLapseLayerRef.current?.removeAll();
              timeLapseStepRef.current = -1;
              setTimeLapseStep(-1);
              setTimeLapsePlotted(0);
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
          onDone={() => setToast(null)}
        />
      )}

      {status === "ready" && hoveredWell && <WellTooltip well={hoveredWell} />}

      {status === "ready" && hoveredCluster && clusters[hoveredCluster.index] && (
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

      {status === "ready" && !demoTool && activeTool === "measure-distance" && (
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
          onClose={() => setDemoTool(null)}
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
          wellsVisible={readout.zoom >= WELL_ZOOM}
          onExportCsv={exportCsv}
          onSelectApi={selectApi}
          onClearApi={clearApi}
          onApplyFilters={applyFilters}
          timeLapseOpen={timeLapseOpen}
          onToggleTimeLapse={toggleTimeLapse}
          plotting={timeLapsePlaying}
          center={readout.center}
          basemap={basemap}
          onBasemapChange={changeBasemap}
          onSaveImage={saveImage}
          onPrint={printMap}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          viewTab={viewTab}
          onViewTabChange={changeViewTab}
          onOpenGuide={() => setGuideOpen(true)}
          compact={viewTab === "insights"}
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
          {status === "loading" ? "Loading map…" : "The map could not be loaded."}
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
              <WellInsightsPanel key={selectedWell.api} well={selectedWell} />
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
            style={stacked ? { top: `${split * 100}%` } : { left: `${split * 100}%` }}
          >
            <span
              aria-hidden="true"
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c7cbd1] group-hover:bg-mv-green-deep ${
                stacked ? "h-[3px] w-10" : "h-10 w-[3px]"
              }`}
            />
          </div>
        </>
      )}

      {/* The map stays mounted underneath — unmounting it would destroy the
          Esri view and pay for a full re-initialisation on the way back. */}
      {/* Over everything, including the table: it is a full-page read, and
          whatever was underneath is waiting when it closes. */}
      {status === "ready" && guideOpen && (
        <MapFeatureGuide onBack={() => setGuideOpen(false)} />
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
