"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../_components/ui/card";
import { SegmentedControl } from "../../../../_components/ui/segmented-control";
import { loadArcgisModules } from "../../../../_lib/arcgis-loader";
import { formatAcres } from "../../_lib/lease-format";
import { wellsForLease } from "../../_lib/well-records";
import {
  BASEMAPS,
  RING_MILES,
  RING_ZOOM,
  ringCounts,
  ringSymbols,
  type Basemap,
} from "../_lib/map-shared";
import type { LeaseReport } from "../_lib/lease-report";
import {
  MapHoverTip,
  MapResetButton,
  RingPill,
  placeTip,
  type MapTip,
} from "./map-controls";

/**
 * "THE WELLS, ON THE LAND ITSELF" — the filed locations on a basemap.
 *
 * ── WHAT THE STATE ACTUALLY HOLDS, AND WHAT IT DOES NOT ──
 *
 * The operator files an acreage figure and the state records where each well
 * starts and finishes. It does NOT file the outline of the pooled unit — that
 * lives on a survey plat, a scanned document that has to be georeferenced and
 * traced by hand. So this map shows points and paths and no unit boundary, and
 * the note says so rather than drawing a plausible rectangle. A boundary a
 * reader could measure off would be the most confidently wrong thing on the
 * page.
 *
 * Where no directional survey is recorded the path is a straight line between
 * the filed surface and bottom holes. That is the state record; it is not the
 * path the bit took, and the layer is labelled "estimated" for that reason.
 *
 * THERE IS NO LAYER CHECKLIST. It listed the three filed layers as ticked and
 * neighbours' wells as unticked, and it is gone on request. Nothing is lost:
 * the line under the heading already carries the same counts — "1 surface · 1
 * bottom hole · 0 recorded · 1 estimated path" — and the ring pills below state
 * the neighbour count against the radius they actually draw.
 *
 * ── THE SDK IS LOADED ON DEMAND ──
 *
 * ArcGIS is ~1MB of JavaScript from Esri's CDN and most readers of this page
 * never scroll to the map, so it is fetched when this component mounts rather
 * than bundled. `loadArcgisModules` is the portal's own memoised loader — see
 * its header for why it is a script tag and not an npm import.
 *
 * IT MOVED UP TO `_lib/` TO GET HERE. It used to live inside the map explorer's
 * own `_components/`, which was right while the explorer was its only consumer;
 * a second module reaching into another module's private folder is the signal
 * that a helper has become shared. Nothing about the loader changed.
 */

interface MapLike {
  basemap: string;
}
interface GraphicLike {
  geometry: unknown;
}
interface HitResult {
  graphic?: { attributes?: Record<string, unknown> | null } | null;
}
interface ViewLike {
  destroy: () => void;
  goTo: (target: unknown) => Promise<unknown>;
  when: () => Promise<unknown>;
  graphics: {
    addMany: (graphics: GraphicLike[]) => void;
    removeMany: (graphics: GraphicLike[]) => void;
  };
  ui: { move: (widget: string, position: string) => void };
  popupEnabled: boolean;
  on: (event: string, handler: (event: unknown) => void) => void;
  hitTest: (event: unknown) => Promise<{ results: HitResult[] }>;
}
type MapCtor = new (options: { basemap: string }) => MapLike;
type ViewCtor = new (options: {
  container: HTMLDivElement;
  map: MapLike;
  center: [number, number];
  zoom: number;
}) => ViewLike;
type GraphicCtor = new (options: {
  geometry: Record<string, unknown>;
  symbol: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}) => GraphicLike;

/** The portal's mint, as the SDK wants it: RGBA, not a CSS variable. */
const MARK = [46, 143, 109] as const;

/** DE WITT County, Texas — the fallback if a lease has no well on record. */
const COUNTY: [number, number] = [-97.35, 29.08];

export function WellsMapCard({ report }: { report: LeaseReport }) {
  const { lease } = report;
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [ring, setRing] = useState<string>("lease");
  const [tip, setTip] = useState<MapTip | null>(null);
  const [failed, setFailed] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const viewRef = useRef<ViewLike | null>(null);
  const graphicRef = useRef<GraphicCtor | null>(null);
  const ringsRef = useRef<GraphicLike[]>([]);

  const wells = useMemo(() => wellsForLease(lease.slug), [lease.slug]);
  const centre: [number, number] = wells[0]?.surface ?? COUNTY;

  /* The counts exclude this lease's own holes, so a lease with three wells does
     not report three neighbours of itself at every radius. */
  const neighbours = useMemo(
    () => ringCounts(centre, new Set(wells.map((well) => well.api))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wells],
  );

  const frame = useCallback(
    (key: string) => {
      void viewRef.current
        ?.goTo({ center: centre, zoom: RING_ZOOM[key] ?? 15 })
        .catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wells],
  );

  useEffect(() => {
    let cancelled = false;

    async function draw(): Promise<void> {
      const node = container.current;
      if (!node) return;

      try {
        const [EsriMap, MapView, Graphic] = await loadArcgisModules<
          [MapCtor, ViewCtor, GraphicCtor]
        >(["esri/Map", "esri/views/MapView", "esri/Graphic"]);
        /* The component can unmount while the CDN is still answering — without
           this the view is built into a detached node and never torn down. */
        if (cancelled) return;

        const map = new EsriMap({ basemap });
        mapRef.current = map;
        graphicRef.current = Graphic;

        const view = new MapView({
          container: node,
          map,
          center: centre,
          zoom: RING_ZOOM.lease,
        });
        viewRef.current = view;

        view.ui.move("zoom", "bottom-right");
        view.popupEnabled = false;

        /*
         * THE THREE LAYERS THE CHECKLIST ABOVE CLAIMS ARE ON.
         *
         * They were not drawn at all: the card listed "Surface locations ✓,
         * Bottom holes ✓, Well paths ✓" over a map with nothing on it but
         * imagery, centred on the county at zoom 9 rather than on the acreage.
         * A checklist asserting three layers over an empty map is the most
         * confidently wrong thing the page could do — worse than no map.
         */
        const graphics: GraphicLike[] = [];
        for (const well of wells) {
          const deviated =
            well.surface[0] !== well.bottom[0] ||
            well.surface[1] !== well.bottom[1];

          if (deviated) {
            graphics.push(
              new Graphic({
                geometry: {
                  type: "polyline",
                  paths: [[well.surface, well.bottom]],
                },
                /* Dashed, and the legend calls it a surface-to-bottom LINE:
                   where no directional survey is filed this is the only thing
                   the record supports, and it is not the path the bit took. */
                symbol: {
                  type: "simple-line",
                  color: [...MARK, 0.9],
                  width: 2,
                  style: "dash",
                },
              }),
            );
            graphics.push(
              new Graphic({
                geometry: {
                  type: "point",
                  longitude: well.bottom[0],
                  latitude: well.bottom[1],
                },
                symbol: {
                  type: "simple-marker",
                  style: "diamond",
                  size: 11,
                  color: [255, 255, 255, 0.95],
                  outline: { color: [...MARK, 1], width: 2 },
                },
              }),
            );
          }

          graphics.push(
            new Graphic({
              geometry: {
                type: "point",
                longitude: well.surface[0],
                latitude: well.surface[1],
              },
              symbol: {
                type: "simple-marker",
                style: "circle",
                size: 13,
                color: [255, 255, 255, 0.95],
                outline: { color: [...MARK, 1], width: 3 },
              },
              attributes: {
                name: `Well ${well.name}`,
                api: well.api,
                drilled: well.drilled.toLowerCase(),
                open: `${well.openTopFt.toLocaleString("en-US")}–${well.openBottomFt.toLocaleString("en-US")} ft`,
                depth: `${well.depthFt.toLocaleString("en-US")} ft MD`,
                field: well.field,
              },
            }),
          );
        }
        view.graphics.addMany(graphics);

        let over = false;
        const test = (event: unknown): void => {
          const at = event as { x: number; y: number };
          void view
            .hitTest(event)
            .then(({ results }) => {
              const found = results.find(
                (result) => result.graphic?.attributes?.name,
              );
              if (!found) {
                if (over) {
                  over = false;
                  setTip(null);
                }
                return;
              }
              over = true;
              const it = found.graphic!.attributes as Record<string, string>;
              setTip({
                ...placeTip(at.x, at.y, container.current),
                title: it.name,
                subtitle: `${it.drilled} · ${lease.status.toLowerCase()}`,
                rows: [
                  { label: "API", value: it.api },
                  { label: "Field", value: it.field },
                  { label: "Open", value: it.open },
                  { label: "Depth", value: it.depth },
                ],
              });
            })
            .catch(() => undefined);
        };
        view.on("pointer-move", test);
        view.on("click", test);

        await view.when();
        if (cancelled) return;
        /* Frame the acreage rather than the county. One vertical hole has no
           extent to fit, so the opening zoom stands for it. */
        if (graphics.length > 1) {
          await view.goTo(graphics).catch(() => undefined);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void draw();

    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
      mapRef.current = null;
    };
    /* The basemap is swapped on the live map below rather than rebuilt here —
       this effect runs once. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Swapping the basemap is a property set, not a new view: rebuilding would
     drop the reader's pan and zoom every time they changed the imagery. */
  useEffect(() => {
    if (mapRef.current) mapRef.current.basemap = basemap;
  }, [basemap]);

  /* Every ring up to the one chosen — nested distances, not alternatives. */
  useEffect(() => {
    const view = viewRef.current;
    const Graphic = graphicRef.current;
    if (!view || !Graphic) return;

    view.graphics.removeMany(ringsRef.current);
    ringsRef.current = [];

    const outer = RING_MILES[ring];
    if (!outer) return;

    const drawn = ringSymbols(centre, outer).map((shape) => new Graphic(shape));
    view.graphics.addMany(drawn);
    ringsRef.current = drawn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ring, wells]);

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">The wells, on the land itself</h3>
        }
        action={
          <Badge tone="slate" size="xs">
            {lease.county} County · imagery from Esri
          </Badge>
        }
      />
      <p className="mt-1 text-[12px] text-mv-muted">
        {formatAcres(lease.acres)} acres filed · {lease.wells} surface ·{" "}
        {lease.wells} bottom hole · 0 recorded · {lease.wells} estimated path
      </p>

      <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
        No traced unit boundary is held for this lease. The operator filed{" "}
        {formatAcres(lease.acres)} acres and the state records where each well
        starts and finishes, but the outline of the pooled unit only exists on
        the operator&apos;s survey plat — a scanned document that has to be
        georeferenced and traced by hand. Rather than draw a plausible rectangle,
        the map draws what is filed.
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="How far to look"
          className="flex flex-wrap gap-1.5"
        >
          <RingPill
            label="This lease"
            selected={ring === "lease"}
            onClick={() => {
              setRing("lease");
              frame("lease");
            }}
          />
          {neighbours.map((neighbour) => (
            <RingPill
              key={neighbour.label}
              label={neighbour.label}
              count={neighbour.count}
              selected={ring === neighbour.label}
              onClick={() => {
                setRing(neighbour.label);
                frame(neighbour.label);
              }}
            />
          ))}
        </div>

        <SegmentedControl
          label="Basemap"
          tone="green"
          value={basemap}
          onChange={setBasemap}
          options={BASEMAPS}
        />
      </div>

      <div className="relative mt-2 overflow-hidden rounded-mv border border-mv-line">
        {failed ? (
          <p className="px-4 py-16 text-center text-[13px] text-mv-muted">
            The map could not load its imagery. Everything else on this page is
            unaffected — the well locations are in the record above.
          </p>
        ) : (
          <>
            <div
              ref={container}
              className={`h-[420px] w-full ${
                tip ? "[&_.esri-view-surface]:cursor-pointer!" : ""
              }`.trim()}
            />
            <MapResetButton
              onClick={() => {
                setRing("lease");
                frame("lease");
              }}
            />
            {tip && <MapHoverTip tip={tip} />}
          </>
        )}
      </div>
    </Card>
  );
}
