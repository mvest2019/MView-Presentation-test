"use client";

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
import { InsightsPanel } from "./insights-panel";
import { MapChrome, type ViewTab } from "./map-chrome";
import { type Place } from "./map-search";
import { MeasureBar } from "./measure-bar";
import {
  NearbyPanel,
  NearbyPrompt,
  type NearbyStats,
} from "./nearby-panel";
import { WellsTable } from "./wells-table";
import {
  CLUSTER_FILL,
  clusterDiameter,
  clusterFontSize,
  formatCount,
  wellClusters,
} from "./well-clusters";

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
  goTo(target: unknown): Promise<unknown>;
  /** Captures the map surface only — the React chrome is not in the canvas. */
  takeScreenshot(options?: {
    format?: "png" | "jpg";
    quality?: number;
  }): Promise<{ dataUrl: string }>;
  destroy(): void;
}

type LonLat = { longitude: number; latitude: number };

interface EsriGraphicsLayer {
  addMany(graphics: unknown[]): void;
  removeAll(): void;
  add(graphic: unknown): void;
}

type PointCtor = new (props: {
  longitude: number;
  latitude: number;
  spatialReference: { wkid: number };
}) => unknown;

type EsriClickEvent = {
  mapPoint: LonLat | null;
  /** Screen position within the view container. */
  x: number;
  y: number;
  stopPropagation(): void;
};

type GeodesicUtils = {
  /** Ellipsoidal, not great-circle — worth ~0.5% over a few hundred miles. */
  geodesicDistance(
    from: unknown,
    to: unknown,
    unit: "meters",
  ): { distance: number };
  /** `azimuth` is degrees clockwise from north. */
  pointFromDistance(from: unknown, meters: number, azimuth: number): LonLat;
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

type GraphicCtor = new (props: Record<string, unknown>) => unknown;

/**
 * The mock's opening view — its readout reads 31.2534, -100.0199 at
 * 1:7,262,011. That scale sits between zoom 6 and 7, so the view is set by
 * scale with `snapToZoom` off rather than by zoom level, or it would jump to
 * the nearest LOD and the readout would no longer match.
 */
const HOME_CENTER: [number, number] = [-100.0199, 31.2534];
const HOME_SCALE = 7_262_011;

/** A drawn rectangle, in degrees. */
type Area = { west: number; south: number; east: number; north: number };

/** A measured line and its ellipsoidal length in metres. */
type Measurement = { from: LonLat; to: LonLat; meters: number };

/** Which map tool is armed. One at a time. */
type ActiveTool =
  | "draw-area"
  | "measure-distance"
  | "whats-near-my-land"
  | null;

/**
 * A watched spot: where, how far out, and what is inside. The stats live here
 * rather than being derived at render time, because working them out needs the
 * Esri modules, and those are held in a ref.
 */
type Nearby = { at: LonLat; radiusMiles: number; stats: NearbyStats };

const METRES_PER_MILE = 1609.344;

/** Vertices around a watch circle. 6° steps read as smooth at any zoom. */
const CIRCLE_STEP_DEGREES = 6;

/** The radius the watch card opens on, matching the mock. */
const DEFAULT_WATCH_RADIUS_MILES = 2;

/**
 * Insights opens on an even split. The bounds stop the drag from collapsing
 * either side to nothing — a map you cannot see is not a map, and the summary
 * cards stop making sense much under a quarter of the page.
 */
const DEFAULT_SPLIT = 0.5;
const MIN_SPLIT = 0.22;
const MAX_SPLIT = 0.78;

/** Fraction of the width one arrow-key press moves the divider. */
const SPLIT_KEY_STEP = 0.02;

/** Where clicking a well-count bubble settles — county-ish. */
const CLUSTER_ZOOM_SCALE = 900_000;

type ScreenPoint = { x: number; y: number };

const AREA_CSV_FILENAME = "mineral-view-area.csv";
const WATCH_CSV_FILENAME = "mineral-view-nearby.csv";

/** The dashed blue both tools draw in. */
const TOOL_BLUE: [number, number, number] = [37, 99, 235];

/**
 * Esri's World Topographic Map — the cream land, green national forests, blue
 * river labels and letterspaced physical-feature labels (COLORADO PLATEAU,
 * SONORAN DESERT, OZARK PLATEAU) in the mock.
 *
 * Taken from the live map at mineralview.com/map, whose basemap picker offers
 * exactly satellite / streets / topo-vector ("Topographic") / dark-gray-vector
 * / osm. Guessing from the screenshot cost two wrong turns before that: both
 * `terrain` and National Geographic look plausibly tan in description, but
 * `terrain` renders pure white over Texas and Oklahoma — its relief data simply
 * stops there — which is what made the first build look washed out.
 */
const DEFAULT_BASEMAP = "topo-vector";

const SCREENSHOT_FILENAME = "mineral-view-map.png";

/**
 * `goTo` returns a promise that *rejects* when its animation is interrupted —
 * a second click, a drag, a scroll-wheel zoom part way through. That is normal
 * use, not a failure, but left unhandled it surfaces as an unhandled rejection
 * and Next's dev overlay throws an error card over the map, which makes a
 * working button look broken.
 */
/**
 * Clusters whose centre falls inside the rectangle.
 *
 * Cluster-level, not well-level: the map only holds the aggregated bubbles, so
 * a cluster is in or out as a whole. Against the real well layer this becomes a
 * spatial query and the count gets exact.
 */
function clustersInArea(area: Area) {
  return wellClusters.filter(
    ({ at: [longitude, latitude] }) =>
      longitude >= area.west &&
      longitude <= area.east &&
      latitude >= area.south &&
      latitude <= area.north,
  );
}

/**
 * What the watch card reports.
 *
 * Same caveat as the drawn area: the map holds aggregated bubbles, not
 * individual bores, so "wells" counts whole clusters falling inside the circle
 * and "nearest bore" measures to a cluster centre. Permits are always zero —
 * there is no permit layer to read. All three become real queries once the well
 * layer lands; only the numbers change, not this card.
 */
function nearbyStats(
  at: LonLat,
  radiusMiles: number,
  geodesic: GeodesicUtils,
  Point: PointCtor,
): NearbyStats {
  const centre = new Point({
    longitude: at.longitude,
    latitude: at.latitude,
    spatialReference: { wkid: 4326 },
  });

  const radiusMetres = radiusMiles * METRES_PER_MILE;
  let wells = 0;
  let inside = 0;
  let newestYear: number | null = null;
  let nearest = Infinity;

  for (const cluster of wellClusters) {
    const metres = geodesic.geodesicDistance(
      centre,
      new Point({
        longitude: cluster.at[0],
        latitude: cluster.at[1],
        spatialReference: { wkid: 4326 },
      }),
      "meters",
    ).distance;

    if (metres <= radiusMetres) {
      wells += cluster.count;
      inside += 1;
      if (newestYear === null || cluster.newestYear > newestYear) {
        newestYear = cluster.newestYear;
      }
    }
    if (metres < nearest) nearest = metres;
  }

  return {
    permits: 0,
    wells,
    nearestBoreMiles: nearest === Infinity ? null : nearest / METRES_PER_MILE,
    // The clusters carry no operator attribution, so everything inside falls
    // into the same catch-all bucket the county list uses.
    operators: inside ? [{ name: "All other operators", count: inside }] : [],
    newestYear,
  };
}

/**
 * The county the point sits in.
 *
 * NOTE: this is Esri's public *sample* server — fine for a prototype, not
 * something to ship against. Swap in the counties layer the live map already
 * uses (`mview-portal.mineralview.com/gis/counties.geojson`) before release.
 * Returns null on any failure; the card just drops the "· County" suffix.
 */
const COUNTY_QUERY_URL =
  "https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer/3/query";

async function lookupCounty(at: LonLat): Promise<string | null> {
  const params = new URLSearchParams({
    f: "json",
    returnGeometry: "false",
    outFields: "NAME",
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    geometry: JSON.stringify({
      x: at.longitude,
      y: at.latitude,
      spatialReference: { wkid: 4326 },
    }),
  });

  try {
    const response = await fetch(`${COUNTY_QUERY_URL}?${params}`);
    const body = await response.json();

    // Field casing is not guaranteed — this service echoes `NAME` back as
    // `name`. Take whichever key came home rather than assuming.
    const attributes: Record<string, unknown> =
      body?.features?.[0]?.attributes ?? {};
    const name = attributes.NAME ?? attributes.name;
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

function downloadNearbyCsv(watch: Nearby, geodesic: GeodesicUtils, Point: PointCtor): void {
  const centre = new Point({
    longitude: watch.at.longitude,
    latitude: watch.at.latitude,
    spatialReference: { wkid: 4326 },
  });
  const radiusMetres = watch.radiusMiles * METRES_PER_MILE;

  const rows: (string | number)[][] = [
    ["longitude", "latitude", "wells", "newest_year"],
  ];

  for (const cluster of wellClusters) {
    const metres = geodesic.geodesicDistance(
      centre,
      new Point({
        longitude: cluster.at[0],
        latitude: cluster.at[1],
        spatialReference: { wkid: 4326 },
      }),
      "meters",
    ).distance;
    if (metres <= radiusMetres) {
      rows.push([cluster.at[0], cluster.at[1], cluster.count, cluster.newestYear]);
    }
  }

  const url = URL.createObjectURL(
    new Blob([rows.map((row) => row.join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = WATCH_CSV_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function wellsInArea(area: Area): number {
  return clustersInArea(area).reduce((total, { count }) => total + count, 0);
}

function downloadAreaCsv(area: Area): void {
  const rows = [
    ["longitude", "latitude", "wells"],
    ...clustersInArea(area).map(({ at, count }) => [at[0], at[1], count]),
  ];

  const url = URL.createObjectURL(
    new Blob([rows.map((row) => row.join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = AREA_CSV_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function subscribeToFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
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

type Status = "loading" | "ready" | "error";

export function MapExplorerView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EsriView | null>(null);
  const mapRef = useRef<EsriMap | null>(null);

  // Tracked through the browser rather than our own state: Escape and the
  // browser's own chrome can leave fullscreen without going through the button.
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );

  const [status, setStatus] = useState<Status>("loading");
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP);
  const [viewTab, setViewTab] = useState<ViewTab>("map");
  const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT);
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
  const [nearby, setNearby] = useState<Nearby | null>(null);
  const [nearbyAnchor, setNearbyAnchor] = useState<ScreenPoint | null>(null);
  /** Cluster under the pointer, with its bubble's top edge on screen. */
  const [hoveredCluster, setHoveredCluster] = useState<
    { index: number; x: number; y: number } | null
  >(null);
  const hoveredClusterRef = useRef<{ index: number; x: number; y: number } | null>(
    null,
  );
  /** Undefined while the county lookup is in flight. */
  const [nearbyCounty, setNearbyCounty] = useState<string | null | undefined>(
    undefined,
  );
  /** Guards against a slow lookup landing after a newer pick. */
  const countyRequestRef = useRef(0);

  const activeToolRef = useRef<ActiveTool>(null);
  const areaRef = useRef<Area | null>(null);
  const measurementRef = useRef<Measurement | null>(null);
  const nearbyRef = useRef<Nearby | null>(null);
  const areaLayerRef = useRef<EsriGraphicsLayer | null>(null);
  const measureLayerRef = useRef<EsriGraphicsLayer | null>(null);
  const nearbyLayerRef = useRef<EsriGraphicsLayer | null>(null);
  const ctorsRef = useRef<{
    Graphic: GraphicCtor;
    Point: PointCtor;
    geodesic: GeodesicUtils;
  } | null>(null);
  const [readout, setReadout] = useState({
    scale: HOME_SCALE,
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
          color: [84, 191, 150, 0.18],
          outline: { color: [46, 143, 109], width: 1.5, style: "dash" },
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
          outline: { color: [46, 143, 109], width: 2 },
        },
      }),
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

    // …and the watch card hangs off the bottom of the circle, so it is
    // projected from the circle's south edge rather than its centre.
    const currentNearby = nearbyRef.current;
    if (!currentNearby) {
      setNearbyAnchor(null);
      return;
    }

    const south = ctors.geodesic.pointFromDistance(
      new ctors.Point({
        longitude: currentNearby.at.longitude,
        latitude: currentNearby.at.latitude,
        spatialReference: { wkid: 4326 },
      }),
      currentNearby.radiusMiles * METRES_PER_MILE,
      180,
    );
    const anchor = project(south.longitude, south.latitude);
    setNearbyAnchor(anchor ? { x: anchor.x, y: anchor.y + 12 } : null);
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

    void (async () => {
      try {
        const [EsriMap, MapView, GraphicsLayer, Graphic, Point, geodesic] =
          await loadArcgisModules<
            [
              MapCtor,
              MapViewCtor,
              GraphicsLayerCtor,
              GraphicCtor,
              PointCtor,
              GeodesicUtils,
            ]
          >([
            "esri/Map",
            "esri/views/MapView",
            "esri/layers/GraphicsLayer",
            "esri/Graphic",
            "esri/geometry/Point",
            "esri/geometry/support/geodesicUtils",
          ]);

        if (cancelled || !containerRef.current) return;

        const clusters = new GraphicsLayer({ id: "well-clusters" });
        clusters.addMany(buildClusterGraphics(Graphic));

        // Above the clusters, so tool output is never buried. One layer each,
        // so clearing an area does not wipe a measurement and vice versa.
        const areaLayer = new GraphicsLayer({ id: "drawn-area" });
        const measureLayer = new GraphicsLayer({ id: "measured-distance" });
        const nearbyLayer = new GraphicsLayer({ id: "watch-circle" });
        areaLayerRef.current = areaLayer;
        measureLayerRef.current = measureLayer;
        nearbyLayerRef.current = nearbyLayer;
        ctorsRef.current = { Graphic, Point, geodesic };

        // Held so the basemap picker can swap `map.basemap` later. The cluster
        // layer is a sibling of the basemap, so it survives the swap.
        const map = new EsriMap({
          basemap: DEFAULT_BASEMAP,
          layers: [clusters, areaLayer, measureLayer, nearbyLayer],
        });
        mapRef.current = map;

        view = new MapView({
          container: containerRef.current,
          map,
          center: HOME_CENTER,
          scale: HOME_SCALE,
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

          for (let index = wellClusters.length - 1; index >= 0; index--) {
            const cluster = wellClusters[index];
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

        const screenTopOf = (index: number): ScreenPoint | null => {
          const ctors = ctorsRef.current;
          if (!view || !ctors) return null;
          const cluster = wellClusters[index];
          const screen = view.toScreen(
            new ctors.Point({
              longitude: cluster.at[0],
              latitude: cluster.at[1],
              spatialReference: { wkid: 4326 },
            }),
          );
          if (!screen) return null;
          return {
            x: Math.round(screen.x),
            y: Math.round(screen.y - clusterDiameter(cluster.count) / 2),
          };
        };

        pointerHandle = view.on("pointer-move", (event) => {
          // A tool takes precedence — no hover cards mid-draw.
          const index = activeToolRef.current ? -1 : clusterAt(event.x, event.y);
          const top = index === -1 ? null : screenTopOf(index);
          const next = top ? { index, x: top.x, y: top.y } : null;

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

          // With no tool armed, a click on a bubble opens that area — which is
          // what the hover card promises.
          if (!activeToolRef.current) {
            const index = clusterAt(event.x, event.y);
            if (index !== -1 && view) {
              event.stopPropagation();
              const cluster = wellClusters[index];
              view
                .goTo({ center: cluster.at, scale: CLUSTER_ZOOM_SCALE })
                .catch(ignoreInterrupted);
            }
            return;
          }

          if (activeToolRef.current !== "whats-near-my-land") return;
          if (!event.mapPoint || !ctors) return;

          event.stopPropagation();

          const at = {
            longitude: event.mapPoint.longitude,
            latitude: event.mapPoint.latitude,
          };
          const next: Nearby = {
            at,
            radiusMiles: DEFAULT_WATCH_RADIUS_MILES,
            stats: nearbyStats(
              at,
              DEFAULT_WATCH_RADIUS_MILES,
              ctors.geodesic,
              ctors.Point,
            ),
          };

          nearbyRef.current = next;
          setNearby(next);
          drawNearby(next);
          anchorBars();

          const request = ++countyRequestRef.current;
          setNearbyCounty(undefined);
          void lookupCounty(at).then((name) => {
            // Ignore a result that a newer pick has already superseded.
            if (request === countyRequestRef.current) setNearbyCounty(name);
          });

          activeToolRef.current = null;
          setActiveTool(null);
        });

        dragHandle = view.on("drag", (event) => {
          const tool = activeToolRef.current;
          // This tool takes a click, not a drag; a stray drag must not pan the
          // map out from under the prompt either.
          if (tool === "whats-near-my-land") {
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
            const next: Area = {
              west: Math.min(from.longitude, to.longitude),
              east: Math.max(from.longitude, to.longitude),
              south: Math.min(from.latitude, to.latitude),
              north: Math.max(from.latitude, to.latitude),
            };
            areaRef.current = next;
            setArea(next);
            drawArea(next);
          } else {
            const ctors = ctorsRef.current;
            if (!ctors) return;

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
          }

          anchorBars();

          if (event.action === "end") {
            // One shape per activation — the tool disarms on release.
            activeToolRef.current = null;
            setActiveTool(null);
          }
        });

        await view.when();
        if (!cancelled) setStatus("ready");
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
      ctorsRef.current = null;
      viewRef.current = null;
      view?.destroy();
    };
    // All stable, so the view is still built exactly once.
  }, [drawArea, drawMeasurement, drawNearby, anchorBars]);

  // Esc backs out of an armed tool — the prompt says so.
  useEffect(() => {
    if (!activeTool) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      activeToolRef.current = null;
      setActiveTool(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeTool]);

  /** Arms a tool, clearing whatever that same tool drew last time. */
  const startTool = useCallback(
    (tool: ActiveTool) => {
      activeToolRef.current = tool;
      setActiveTool(tool);

      if (tool === "draw-area") {
        areaRef.current = null;
        setArea(null);
        setAreaAnchor(null);
        drawArea(null);
      } else if (tool === "measure-distance") {
        measurementRef.current = null;
        setMeasurement(null);
        setMeasureAnchor(null);
        drawMeasurement(null);
      } else if (tool === "whats-near-my-land") {
        nearbyRef.current = null;
        setNearby(null);
        setNearbyAnchor(null);
        drawNearby(null);
      }
    },
    [drawArea, drawMeasurement, drawNearby],
  );

  const changeWatchRadius = useCallback(
    (radiusMiles: number) => {
      const current = nearbyRef.current;
      const ctors = ctorsRef.current;
      if (!current || !ctors) return;

      const next: Nearby = {
        ...current,
        radiusMiles,
        stats: nearbyStats(
          current.at,
          radiusMiles,
          ctors.geodesic,
          ctors.Point,
        ),
      };
      nearbyRef.current = next;
      setNearby(next);
      drawNearby(next);
      anchorBars();
    },
    [drawNearby, anchorBars],
  );

  const clearNearby = useCallback(() => {
    countyRequestRef.current += 1;
    nearbyRef.current = null;
    setNearby(null);
    setNearbyAnchor(null);
    setNearbyCounty(undefined);
    drawNearby(null);
  }, [drawNearby]);

  const changeViewTab = useCallback((tab: ViewTab) => setViewTab(tab), []);

  /*
   * The Insights divider. Pointer capture rather than window listeners: the
   * drag keeps following the pointer even when it leaves the 7px handle, and
   * the browser cleans the capture up for us if the gesture is interrupted.
   */
  const splitFromPointer = useCallback((clientX: number) => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds || !bounds.width) return;
    const ratio = (clientX - bounds.left) / bounds.width;
    setSplitRatio(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, ratio)));
  }, []);

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
      if (draggingSplitRef.current) splitFromPointer(event.clientX);
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
      const step =
        event.key === "ArrowLeft"
          ? -SPLIT_KEY_STEP
          : event.key === "ArrowRight"
            ? SPLIT_KEY_STEP
            : 0;

      if (step) {
        event.preventDefault();
        setSplitRatio((current) =>
          Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, current + step)),
        );
      } else if (event.key === "Home") {
        event.preventDefault();
        setSplitRatio(DEFAULT_SPLIT);
      }
    },
    [],
  );

  const downloadNearby = useCallback(() => {
    const current = nearbyRef.current;
    const ctors = ctorsRef.current;
    if (current && ctors) {
      downloadNearbyCsv(current, ctors.geodesic, ctors.Point);
    }
  }, []);

  const clearArea = useCallback(() => {
    areaRef.current = null;
    setArea(null);
    setAreaAnchor(null);
    drawArea(null);
  }, [drawArea]);

  const clearMeasurement = useCallback(() => {
    measurementRef.current = null;
    setMeasurement(null);
    setMeasureAnchor(null);
    drawMeasurement(null);
  }, [drawMeasurement]);

  const exportArea = useCallback(() => {
    if (areaRef.current) downloadAreaCsv(areaRef.current);
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
      ?.goTo({ center: HOME_CENTER, scale: HOME_SCALE })
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

  /** Search result picked — fly the map to it. */
  const goToPlace = useCallback((place: Place) => {
    viewRef.current
      ?.goTo({ center: place.at, scale: place.scale })
      .catch(ignoreInterrupted);
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
        activeTool ? "cursor-crosshair" : hoveredCluster ? "cursor-pointer" : ""
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
          viewTab === "insights"
            ? "absolute inset-y-0 left-0 overflow-hidden"
            : "absolute inset-0"
        }
        style={
          viewTab === "insights"
            ? { width: `${splitRatio * 100}%` }
            : undefined
        }
      >
      <div ref={containerRef} className="h-full w-full" />

      {status === "ready" && hoveredCluster && (
        <ClusterTooltip
          name={wellClusters[hoveredCluster.index].name}
          wells={wellClusters[hoveredCluster.index].count}
          oilShare={wellClusters[hoveredCluster.index].oilShare}
          at={{ x: hoveredCluster.x, y: hoveredCluster.y }}
        />
      )}

      {status === "ready" && area && areaAnchor && (
        <AreaSelectionBar
          count={wellsInArea(area)}
          at={areaAnchor}
          onExport={exportArea}
          onClear={clearArea}
        />
      )}

      {status === "ready" && measurement && measureAnchor && (
        <MeasureBar
          meters={measurement.meters}
          at={measureAnchor}
          onClear={clearMeasurement}
        />
      )}

      {status === "ready" && activeTool === "whats-near-my-land" && (
        <NearbyPrompt />
      )}

      {status === "ready" && nearby && nearbyAnchor && (
        <NearbyPanel
          at={nearbyAnchor}
          coordinates={nearby.at}
          county={nearbyCounty}
          radiusMiles={nearby.radiusMiles}
          stats={nearby.stats}
          onRadiusChange={changeWatchRadius}
          onDownload={downloadNearby}
          onClose={clearNearby}
        />
      )}

      {status === "ready" ? (
        <MapChrome
          scale={readout.scale}
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
          onSelectPlace={goToPlace}
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
            className="absolute inset-y-0 right-0 border-l border-mv-line"
            style={{ width: `${(1 - splitRatio) * 100}%` }}
          >
            <InsightsPanel />
          </div>

          {/* The 7px hit area is wider than the 1px seam it sits on, so the
              handle is grabbable without a visible bar. `title` gives the
              hint; the browser's own tooltip is what the mock shows. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize map and insights"
            aria-valuenow={Math.round(splitRatio * 100)}
            aria-valuemin={Math.round(MIN_SPLIT * 100)}
            aria-valuemax={Math.round(MAX_SPLIT * 100)}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            onPointerDown={onSplitPointerDown}
            onPointerMove={onSplitPointerMove}
            onPointerUp={onSplitPointerUp}
            onPointerCancel={onSplitPointerUp}
            onDoubleClick={() => setSplitRatio(DEFAULT_SPLIT)}
            onKeyDown={onSplitKeyDown}
            className="group absolute inset-y-0 z-30 -ml-[3px] w-[7px] cursor-col-resize touch-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-mv-green-deep"
            style={{ left: `${splitRatio * 100}%` }}
          >
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c7cbd1] group-hover:bg-mv-green-deep"
            />
          </div>
        </>
      )}

      {/* The map stays mounted underneath — unmounting it would destroy the
          Esri view and pay for a full re-initialisation on the way back. */}
      {status === "ready" && viewTab === "table" && (
        <WellsTable
          activeTab={viewTab}
          onTabChange={changeViewTab}
          onShowOnMap={() => setViewTab("map")}
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

/**
 * One filled circle plus one label per cluster. Sizes are in screen pixels, so
 * the bubbles hold their size as you zoom — the same behaviour the mock shows,
 * and what a server-side cluster layer would do once it replaces this.
 */
function buildClusterGraphics(Graphic: GraphicCtor): unknown[] {
  return wellClusters.flatMap(({ at: [longitude, latitude], count, tone }) => {
    const diameter = clusterDiameter(count);
    const fontSize = clusterFontSize(diameter);

    const geometry = { type: "point", longitude, latitude };

    return [
      new Graphic({
        geometry,
        symbol: {
          type: "simple-marker",
          size: diameter,
          color: CLUSTER_FILL[tone],
          outline: { color: [255, 255, 255, 0.75], width: 1.5 },
        },
      }),
      new Graphic({
        geometry,
        symbol: {
          type: "text",
          text: formatCount(count),
          color: "#ffffff",
          horizontalAlignment: "center",
          verticalAlignment: "middle",
          font: { size: fontSize, weight: "bold", family: "sans-serif" },
        },
      }),
    ];
  });
}
