"use client";

import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../_components/ui/card";
import { SegmentedControl } from "../../../../_components/ui/segmented-control";
import { loadArcgisModules } from "../../../../_lib/arcgis-loader";
import { LegendsPanel } from "../../../map/_components/legends-panel";
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
import type { LeaseMapData } from "../_lib/lease-map-from-api";
import { useLegendIcons } from "../_lib/map-legend-icons";
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

/*
 * THE BORE LINE, IN THE LEGEND'S OWN COLOUR.
 *
 * The panel has a row for this — "Horizontal/Directional Lines" — and its
 * image is a flat grey rule, rgb(109,109,109). The line was drawn in the
 * card's green, so the legend named a mark the map did not draw and the map
 * drew one the legend had no row for. Sampled from the PNG rather than
 * eyeballed, so the two cannot drift.
 *
 * Full opacity and two pixels where the legend's is one: this sits on
 * satellite imagery of west Texas farmland, which is grey-brown, and a
 * hairline at half alpha disappeared into it.
 */
const LINE = [109, 109, 109] as const;

/** DE WITT County, Texas — the fallback if a lease has no well on record. */
const COUNTY: [number, number] = [-97.35, 29.08];

export function WellsMapCard({
  report,
  served,
}: {
  report: LeaseReport;
  /**
   * The lease's own geometry, when it was read from the service.
   *
   * ABSENT ON THE FIXTURE PATH, where the wells come from `wellsForLease` and
   * the ring counts are measured against the ten local leases. A served lease
   * has no row in either — the map drew nothing and the pills counted a fixture
   * that has nothing to do with the lease on screen. See `leaseMapFromApi`.
   */
  served?: LeaseMapData;
}) {
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

  const { statusIcon, collarIcon, legendSettled } = useLegendIcons();

  const wells = useMemo(
    () => served?.wells ?? wellsForLease(lease.slug),
    [served, lease.slug],
  );
  const centre: [number, number] = wells[0]?.surface ?? COUNTY;

  /* The counts exclude this lease's own holes, so a lease with three wells does
     not report three neighbours of itself at every radius. The service applies
     the same rule and measures against the real record rather than the ten
     fixture leases, so its answer is taken whole where there is one. */
  const neighbours = useMemo(
    () =>
      served?.rings ??
      ringCounts(centre, new Set(wells.map((well) => well.api))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [served, wells],
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
      /* Wait for the symbols. See the dependency note at the foot of this
         effect — this returns on the first pass and runs on the second. */
      if (!legendSettled) return;

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
                  /* DEGREES, SAID OUT LOUD. Without `spatialReference` the autocast
                     reads these numbers in the view's own reference — Web
                     Mercator metres — and -98.4 metres east of Greenwich puts
                     the bore in the Atlantic, off screen. The point geometries
                     are safe because `longitude`/`latitude` name their units;
                     `paths` does not. Found and documented on the explorer's
                     map, see `well-graphics.ts`. */
                  spatialReference: { wkid: 4326 },
                },
                /* Dashed, and the legend calls it a surface-to-bottom LINE:
                   where no directional survey is filed this is the only thing
                   the record supports, and it is not the path the bit took. */
                symbol: {
                  type: "simple-line",
                  color: [...LINE, 1],
                  width: 2,
                  style: "dash",
                },
              }),
            );
            graphics.push(
              new Graphic({
                geometry: {
                  type: "point",
                  longitude: well.surface[0],
                  latitude: well.surface[1],
                },
                /* THE COLLAR, at the top of the bore: the small "Horizontal" or
                   "Directional" mark for how the hole was drilled. ONLY WHERE
                   THERE IS A BORE TO MARK THE TOP OF — a hole that starts and
                   finishes in one place has no top distinct from its bottom,
                   and a second mark on the same point would just obscure the
                   status symbol underneath it. */
                symbol: collarIcon(well)
                  ? {
                      type: "picture-marker",
                      url: collarIcon(well),
                      width: 13,
                      height: 13,
                    }
                  : {
                      type: "simple-marker",
                      style: "circle",
                      size: 9,
                      color: [255, 255, 255, 0.95],
                      outline: { color: [...MARK, 1], width: 2 },
                    },
              }),
            );
          }

          /*
           * THE WELL'S OWN STATUS SYMBOL, AT THE END THAT PRODUCES.
           *
           * The bottom hole where there is one and the single location where
           * there is not — which is the rule the explorer's map follows, and
           * the reason it is stated as a rule: on a lease where NOTHING is
           * deviated, hanging the status symbol off the bottom hole draws it
           * nowhere at all. Lease 08_46924 names a status for sixteen of its
           * 138 wells and files not one bottom hole, so that mistake is not
           * hypothetical.
           *
           * It carries the tooltip for the same reason: a hit-test hands back
           * a graphic, and on a two-mile lateral the surface hole is nowhere
           * near the symbol somebody pointed at.
           */
          graphics.push(
            new Graphic({
              geometry: {
                type: "point",
                longitude: well.bottom[0],
                latitude: well.bottom[1],
              },
              symbol: statusIcon(well)
                ? {
                    type: "picture-marker",
                    url: statusIcon(well),
                    width: 16,
                    height: 16,
                  }
                : {
                    type: "simple-marker",
                    style: deviated ? "diamond" : "circle",
                    size: 13,
                    color: [255, 255, 255, 0.95],
                    outline: { color: [...MARK, 1], width: 3 },
                  },
              attributes: {
                name: `Well ${well.name}`,
                api: well.api,
                drilled: well.drilled.toLowerCase(),
                /* WHERE A HOLE IS OPEN IS A QUESTION ABOUT THE ROCK, and
                   the lease map payload does not answer it — only the
                   reservoir call carries perforations. "0–0 ft" would read as
                   a measurement of zero rather than as an absence. */
                open:
                  well.openTopFt > 0 || well.openBottomFt > 0
                    ? `${well.openTopFt.toLocaleString("en-US")}–${well.openBottomFt.toLocaleString("en-US")} ft`
                    : "not recorded",
                depth: `${well.depthFt.toLocaleString("en-US")} ft MD`,
                field: "field" in well ? well.field : lease.reservoir,
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
    /* The basemap is swapped on the live map below rather than rebuilt here.
       This runs once the legend has settled, which is the only thing it waits
       on — the symbols have to be in hand before the holes are drawn, because
       redrawing them later would throw away the reader's pan and zoom. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legendSettled]);

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
          <h3 className="text-[15px] font-bold">
            The wells, on the land itself
          </h3>
        }
        action={
          <Badge tone="quiet" size="xs">
            <MapPin aria-hidden="true" className="h-3 w-3" />
            {lease.county} County · imagery from Esri
          </Badge>
        }
      />
      {/* COUNTED, NOT ASSUMED. This read `{lease.wells} surface · {lease.wells}
          bottom hole · 0 recorded · {lease.wells} estimated path` — four
          numbers derived from one, which is true only of a record where every
          hole is filed at both ends and every path is estimated. The service
          counts each separately and says 138 surface and ZERO bottom holes on
          this lease. */}
      <p className="mt-1 text-[12px] text-mv-muted">
        {formatAcres(served?.ground.acres ?? lease.acres)} acres filed ·{" "}
        {served?.ground.surfaceHoles ?? lease.wells} surface ·{" "}
        {served?.ground.bottomHoles ?? lease.wells} bottom hole ·{" "}
        {served?.ground.pathsMeasured ?? 0} recorded ·{" "}
        {served?.ground.pathsEstimated ?? lease.wells} estimated path
      </p>

      {/* THE SERVICE'S OWN ACCOUNT OF WHY THERE IS NO OUTLINE, per lease. The
          sentence below was fixed text asserting that no boundary is held —
          true of the ten fixture leases and not a promise about a record of
          782. It stands as the fallback for the fixture path. */}
      <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
        {served?.outlineNote ?? (
          <>
            No traced unit boundary is held for this lease. The operator filed{" "}
            {formatAcres(lease.acres)} acres and the state records where each
            well starts and finishes, but the outline of the pooled unit only
            exists on the operator&apos;s survey plat — a scanned document that
            has to be georeferenced and traced by hand. Rather than draw a
            plausible rectangle, the map draws what is filed.
          </>
        )}
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
            {/* THE WELL-SYMBOL LEGEND, from `GET /api/v1/map/legends` — the
                map page's own panel, not a copy of it. Ninety symbols, each the
                PNG the map itself draws, so the legend cannot disagree with
                what is on the tiles.

                CLOSED, AND IN THE SAME CORNER ON ALL THREE MAPS. This one is a
                card inside a report rather than a page-sized map, and ninety
                rows opened over it would cover the wells it explains; the
                header alone sits there until a reader asks. Top left because
                the reset button holds the bottom right and the list opens
                downwards from its own header. */}
            <LegendsPanel
              mode="wells"
              defaultOpen={false}
              className="absolute top-3 left-3 z-10"
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
