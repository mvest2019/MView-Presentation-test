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
import { MapChrome } from "./map-chrome";
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

const AREA_CSV_FILENAME = "mineral-view-area.csv";

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

  /*
   * Area drawing. The Esri drag handler is registered once and outlives every
   * render, so what it needs — whether the tool is armed, the area so far — is
   * held in refs; the state beside each ref exists only to re-render the React
   * side. `areaLayer` and `ctors` are filled in once the SDK has loaded.
   */
  const [drawArmed, setDrawArmed] = useState(false);
  const [area, setArea] = useState<Area | null>(null);
  const [areaAnchor, setAreaAnchor] = useState<{ x: number; y: number } | null>(
    null,
  );
  const drawArmedRef = useRef(false);
  const areaRef = useRef<Area | null>(null);
  const areaLayerRef = useRef<EsriGraphicsLayer | null>(null);
  const ctorsRef = useRef<{ Graphic: GraphicCtor; Point: PointCtor } | null>(
    null,
  );
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
          outline: { color: [37, 99, 235], width: 1.5, style: "dash" },
        },
      }),
    );
  }, []);

  /** Puts the bar over the middle of the rectangle's top edge. */
  const anchorAreaBar = useCallback(() => {
    const view = viewRef.current;
    const ctors = ctorsRef.current;
    const current = areaRef.current;

    if (!view || !ctors || !current) {
      setAreaAnchor(null);
      return;
    }

    const screen = view.toScreen(
      new ctors.Point({
        longitude: (current.west + current.east) / 2,
        latitude: current.north,
        spatialReference: { wkid: 4326 },
      }),
    );
    setAreaAnchor(screen ? { x: screen.x, y: screen.y } : null);
  }, []);

  useEffect(() => {
    // StrictMode mounts the effect twice in dev; `cancelled` stops the first
    // pass building a view into a container the second pass owns.
    let cancelled = false;
    let view: EsriView | undefined;
    let watcher: EsriHandle | undefined;
    let dragHandle: EsriHandle | undefined;
    let frame = 0;

    void (async () => {
      try {
        const [EsriMap, MapView, GraphicsLayer, Graphic, Point] =
          await loadArcgisModules<
            [MapCtor, MapViewCtor, GraphicsLayerCtor, GraphicCtor, PointCtor]
          >([
            "esri/Map",
            "esri/views/MapView",
            "esri/layers/GraphicsLayer",
            "esri/Graphic",
            "esri/geometry/Point",
          ]);

        if (cancelled || !containerRef.current) return;

        const clusters = new GraphicsLayer({ id: "well-clusters" });
        clusters.addMany(buildClusterGraphics(Graphic));

        // Above the clusters, so the rectangle's outline is never buried.
        const areaLayer = new GraphicsLayer({ id: "drawn-area" });
        areaLayerRef.current = areaLayer;
        ctorsRef.current = { Graphic, Point };

        // Held so the basemap picker can swap `map.basemap` later. The cluster
        // layer is a sibling of the basemap, so it survives the swap.
        const map = new EsriMap({
          basemap: DEFAULT_BASEMAP,
          layers: [clusters, areaLayer],
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
          // The rectangle is a map graphic and moves itself; the bar above it
          // is React, so it has to be re-projected as the view moves.
          anchorAreaBar();
        });

        dragHandle = view.on("drag", (event) => {
          if (!drawArmedRef.current || !view) return;

          // Without this the drag pans the map underneath the rectangle.
          event.stopPropagation();

          const from = view.toMap(event.origin);
          const to = view.toMap({ x: event.x, y: event.y });
          if (!from || !to) return;

          const next: Area = {
            west: Math.min(from.longitude, to.longitude),
            east: Math.max(from.longitude, to.longitude),
            south: Math.min(from.latitude, to.latitude),
            north: Math.max(from.latitude, to.latitude),
          };

          areaRef.current = next;
          setArea(next);
          drawArea(next);
          anchorAreaBar();

          if (event.action === "end") {
            // One rectangle per activation — the tool disarms on release.
            drawArmedRef.current = false;
            setDrawArmed(false);
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
      areaLayerRef.current = null;
      ctorsRef.current = null;
      viewRef.current = null;
      view?.destroy();
    };
    // Both are stable, so the view is still built exactly once.
  }, [drawArea, anchorAreaBar]);

  const startDrawArea = useCallback(() => {
    drawArmedRef.current = true;
    setDrawArmed(true);
    areaRef.current = null;
    setArea(null);
    setAreaAnchor(null);
    drawArea(null);
  }, [drawArea]);

  const clearArea = useCallback(() => {
    drawArmedRef.current = false;
    setDrawArmed(false);
    areaRef.current = null;
    setArea(null);
    setAreaAnchor(null);
    drawArea(null);
  }, [drawArea]);

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
        drawArmed ? "cursor-crosshair" : ""
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
      <div ref={containerRef} className="h-full w-full" />

      {status === "ready" && area && areaAnchor && (
        <AreaSelectionBar
          count={wellsInArea(area)}
          at={areaAnchor}
          onExport={exportArea}
          onClear={clearArea}
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
          drawArmed={drawArmed}
          onStartDrawArea={startDrawArea}
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
