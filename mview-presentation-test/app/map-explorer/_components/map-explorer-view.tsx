"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

interface EsriView {
  scale: number;
  zoom: number;
  center: { longitude: number; latitude: number };
  when(): Promise<unknown>;
  watch(paths: string | string[], callback: () => void): EsriHandle;
  goTo(target: unknown): Promise<unknown>;
  destroy(): void;
}

interface EsriGraphicsLayer {
  addMany(graphics: unknown[]): void;
}

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

type Status = "loading" | "ready" | "error";

export function MapExplorerView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EsriView | null>(null);
  const mapRef = useRef<EsriMap | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP);
  const [readout, setReadout] = useState({
    scale: HOME_SCALE,
    center: { longitude: HOME_CENTER[0], latitude: HOME_CENTER[1] },
  });

  useEffect(() => {
    // StrictMode mounts the effect twice in dev; `cancelled` stops the first
    // pass building a view into a container the second pass owns.
    let cancelled = false;
    let view: EsriView | undefined;
    let watcher: EsriHandle | undefined;
    let frame = 0;

    void (async () => {
      try {
        const [EsriMap, MapView, GraphicsLayer, Graphic] =
          await loadArcgisModules<
            [MapCtor, MapViewCtor, GraphicsLayerCtor, GraphicCtor]
          >([
            "esri/Map",
            "esri/views/MapView",
            "esri/layers/GraphicsLayer",
            "esri/Graphic",
          ]);

        if (cancelled || !containerRef.current) return;

        const clusters = new GraphicsLayer({ id: "well-clusters" });
        clusters.addMany(buildClusterGraphics(Graphic));

        // Held so the basemap picker can swap `map.basemap` later. The cluster
        // layer is a sibling of the basemap, so it survives the swap.
        const map = new EsriMap({ basemap: DEFAULT_BASEMAP, layers: [clusters] });
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
        watcher = view.watch(["scale", "center"], syncReadout);

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
      viewRef.current = null;
      view?.destroy();
    };
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const view = viewRef.current;
    if (view) void view.goTo({ scale: view.scale * factor });
  }, []);

  const zoomIn = useCallback(() => zoomBy(0.5), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(2), [zoomBy]);

  const goHome = useCallback(() => {
    void viewRef.current?.goTo({ center: HOME_CENTER, scale: HOME_SCALE });
  }, []);

  const changeBasemap = useCallback((id: string) => {
    setBasemap(id);
    if (mapRef.current) mapRef.current.basemap = id;
  }, []);

  return (
    <div className="mv-map relative h-full w-full bg-[#efe7d8]">
      <div ref={containerRef} className="h-full w-full" />

      {status === "ready" ? (
        <MapChrome
          scale={readout.scale}
          center={readout.center}
          basemap={basemap}
          onBasemapChange={changeBasemap}
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
