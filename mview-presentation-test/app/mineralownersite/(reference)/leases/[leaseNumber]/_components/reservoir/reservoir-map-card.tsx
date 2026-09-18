"use client";

import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "../../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../../_components/ui/card";
import { SegmentedControl } from "../../../../../_components/ui/segmented-control";
import { loadArcgisModules } from "../../../../../_lib/arcgis-loader";
import { LegendsPanel } from "../../../../map/_components/legends-panel";
import { formatCompactVolume } from "../../../_lib/lease-format";
import {
  BASEMAPS,
  RING_MILES,
  RING_ZOOM,
  ringCounts,
  ringSymbols,
  type Basemap,
} from "../../_lib/map-shared";
import type { ReservoirReport } from "../../_lib/reservoir-report";
import {
  MapHoverTip,
  MapResetButton,
  RingPill,
  placeTip,
  type MapTip,
} from "../map-controls";

/**
 * "WHERE THESE WELLS SIT IN THE ROCK" — the filed holes, on imagery.
 *
 * ── THREE MARKS PER WELL, AND ONLY TWO OF THEM ARE MEASURED ──
 *
 * A circle at the filed surface hole and a diamond at the filed bottom hole are
 * both in the state's record. The dashed line between them is NOT: where no
 * directional survey is on file, a straight line is the only thing the record
 * supports, and it is dashed and labelled "surface-to-bottom line" rather than
 * "well path" so nobody measures a lateral off it.
 *
 * ── THE VIEW IS FRAMED ON THE WELLS, NOT ON THE COUNTY ──
 *
 * `goTo` on the graphics' extent puts the reader at the scale of the acreage on
 * first paint. A county-wide view of one well is a picture of Texas.
 */

/* The portal's mint, as the SDK wants it: RGBA, not a CSS variable. */
const MARK = [46, 143, 109] as const;

interface GraphicLike {
  geometry: unknown;
}
interface LayerLike {
  addMany: (graphics: GraphicLike[]) => void;
  removeMany: (graphics: GraphicLike[]) => void;
}
interface HitResult {
  graphic?: { attributes?: Record<string, unknown> | null } | null;
}
interface ViewLike {
  destroy: () => void;
  goTo: (target: unknown) => Promise<unknown>;
  graphics: LayerLike;
  /** The view's widget corners. `move` re-homes a default widget by name. */
  ui: { move: (widget: string, position: string) => void };
  /** Off, so a hover lands on our own panel instead of Esri's. */
  popupEnabled: boolean;
  on: (event: string, handler: (event: unknown) => void) => void;
  hitTest: (event: unknown) => Promise<{ results: HitResult[] }>;
  when: () => Promise<unknown>;
}
interface MapLike {
  basemap: string;
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
  popupTemplate?: Record<string, unknown>;
}) => GraphicLike;

export function ReservoirMapCard({ report }: { report: ReservoirReport }) {
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [ring, setRing] = useState<string>("lease");
  /** The hovered well's tooltip, or null when the pointer is off every well. */
  const [tip, setTip] = useState<MapTip | null>(null);
  const [failed, setFailed] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const viewRef = useRef<ViewLike | null>(null);
  const graphicRef = useRef<GraphicCtor | null>(null);
  const ringsRef = useRef<GraphicLike[]>([]);

  const wells = report.wells;
  const centre: [number, number] = wells[0]?.surface ?? [-97.35, 29.08];

  /* The rings count OTHER wells, so every hole already drawn here is excluded
     — otherwise a reservoir with four wells would report four neighbours of
     itself at every radius. */
  const neighbours = useMemo(
    () => ringCounts(centre, new Set(wells.map((well) => well.api))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wells],
  );

  const frame = useCallback(
    (key: string) => {
      void viewRef.current
        ?.goTo({ center: centre, zoom: RING_ZOOM[key] ?? 13 })
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
        if (cancelled) return;

        const map = new EsriMap({ basemap });
        mapRef.current = map;

        const view = new MapView({
          container: node,
          map,
          center: wells[0]?.surface ?? [-97.35, 29.08],
          zoom: 13,
        });
        viewRef.current = view;
        graphicRef.current = Graphic;

        /* Esri homes its zoom widget top-left, where the recentre button goes;
           and its popup is a widget with dock, collapse and "Zoom to" chrome
           this map offers nothing for. Both are dealt with the same way as on
           the well map — see `map-controls.tsx`. */
        view.ui.move("zoom", "bottom-right");
        view.popupEnabled = false;

        /* `over` is held here rather than read back off state so the MISS
           case can be compared without re-subscribing: a pointer-move fires
           many times a second, and setting state to null on every one of them
           would re-render the card continuously while the pointer merely
           crosses the map. */
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
                subtitle: `${it.drilled} · ${it.lease}`,
                rows: [
                  { label: "API", value: it.api },
                  { label: "Gas filed", value: it.gas },
                  { label: "Open", value: it.open },
                  { label: "Depth", value: it.depth },
                ],
              });
            })
            .catch(() => undefined);
        };
        view.on("pointer-move", test);
        /* A touch screen has no hover, so a tap hit-tests the same way. */
        view.on("click", test);

        const graphics: GraphicLike[] = [];
        for (const well of wells) {
          const straight =
            well.surface[0] !== well.bottom[0] ||
            well.surface[1] !== well.bottom[1];

          if (straight) {
            graphics.push(
              new Graphic({
                geometry: {
                  type: "polyline",
                  paths: [[well.surface, well.bottom]],
                },
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
                geometry: { type: "point", longitude: well.bottom[0], latitude: well.bottom[1] },
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
              geometry: { type: "point", longitude: well.surface[0], latitude: well.surface[1] },
              symbol: {
                type: "simple-marker",
                style: "circle",
                size: 12,
                color: [255, 255, 255, 0.95],
                outline: { color: [...MARK, 1], width: 3 },
              },
              /* EVERY FIELD THE TOOLTIP PRINTS RIDES ON THE MARKER, because
                 a hit-test hands back the graphic and nothing else — there is
                 no index to look the well up in from a pointer position. No
                 `popupTemplate`: Esri's popup is off, see `map-controls.tsx`. */
              attributes: {
                name: `Well ${well.name}`,
                api: well.api,
                drilled: well.drilled.toLowerCase(),
                lease: report.lease.number
                  ? `Lease ${report.lease.number}`
                  : report.lease.name,
                open: `${well.openTopFt.toLocaleString("en-US")}–${well.openBottomFt.toLocaleString("en-US")} ft`,
                depth: `${well.depthFt.toLocaleString("en-US")} ft MD`,
                gas: `${formatCompactVolume(well.gasFiled)} MCF`,
              },
            }),
          );
        }

        view.graphics.addMany(graphics);
        await view.when();
        if (cancelled) return;
        /* Frame the acreage rather than the county — see the note above. A
           single vertical well has no extent, so the initial zoom stands. */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wells]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.basemap = basemap;
  }, [basemap]);

  /* Every ring up to the one chosen — the pills are nested distances, not
     alternatives, so a reader on "5 mi" is looking at a count that includes the
     inner wells. Its own effect, so changing the ring redraws two polylines
     rather than tearing down the view and re-fetching every tile. */
  useEffect(() => {
    const view = viewRef.current;
    const Graphic = graphicRef.current;
    if (!view || !Graphic) return;

    view.graphics.removeMany(ringsRef.current);
    ringsRef.current = [];

    const outer = RING_MILES[ring];
    if (!outer) return;

    const drawn = ringSymbols(centre, outer).map(
      (shape) => new Graphic(shape),
    );
    view.graphics.addMany(drawn);
    ringsRef.current = drawn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ring, wells]);

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">
            Where these wells sit in the rock
          </h3>
        }
        action={
          <Badge tone="quiet" size="xs">
            <MapPin aria-hidden="true" className="h-3 w-3" />
            {report.wellCount} well{report.wellCount === 1 ? "" : "s"} · coloured
            by lease
          </Badge>
        }
      />

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
            unaffected — every well&apos;s filed interval is in the table above.
          </p>
        ) : (
          <>
            <div
              ref={container}
              className={`h-[520px] w-full ${
                tip ? "[&_.esri-view-surface]:cursor-pointer!" : ""
              }`.trim()}
            />
            {tip && <MapHoverTip tip={tip} />}

            {/* THE WELL-SYMBOL LEGEND, from `GET /api/v1/map/legends`.
                THE MAP PAGE'S OWN PANEL, not a copy of it. Ninety symbols, each
                one a PNG the map itself draws — a legend that redrew them from
                local SVGs would be a legend that can disagree with the map, and
                two copies of it would be two legends to keep in step with an
                endpoint that grows.

                CLOSED BY DEFAULT HERE, where the map page opens it on a wide
                screen. That map is the whole page and has room; this one is
                520px inside a report, and ninety rows opened over it would
                cover the wells it is explaining. The header alone sits in the
                corner until a reader asks.

                TOP LEFT, AND IT OPENS DOWNWARDS. From the bottom corner the
                list had to grow up the screen, away from its own header —
                opened, the thing you had just clicked ended up at the bottom of
                a 328px panel. The reset button holds the bottom right and the
                basemap strip sits above the map, so this corner is the one
                nothing else wants. */}
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
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11.5px]">
        <span className="flex items-center gap-1.5 font-semibold">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-[3px] bg-mv-green-deep"
          />
          {report.lease.number
            ? `${report.lease.name} · Lease ${report.lease.number}`
            : report.lease.name}
        </span>
        <span className="text-mv-muted">
          ○ surface · ◇ bottom hole · – – surface-to-bottom line
        </span>
      </div>

    </Card>
  );
}
