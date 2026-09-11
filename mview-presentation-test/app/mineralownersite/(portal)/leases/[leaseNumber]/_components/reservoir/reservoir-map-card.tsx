"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "../../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../../_components/ui/card";
import { SegmentedControl } from "../../../../../_components/ui/segmented-control";
import { loadArcgisModules } from "../../../../../_lib/arcgis-loader";
import type { ReservoirReport } from "../../_lib/reservoir-report";

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

type Basemap = "satellite" | "topo-vector" | "streets-vector";

const BASEMAPS: { value: Basemap; label: string }[] = [
  { value: "satellite", label: "Satellite" },
  { value: "topo-vector", label: "Topographic" },
  { value: "streets-vector", label: "Street" },
];

/* The portal's mint, as the SDK wants it: RGBA, not a CSS variable. */
const MARK = [46, 143, 109] as const;

interface GraphicLike {
  geometry: unknown;
}
interface LayerLike {
  addMany: (graphics: GraphicLike[]) => void;
}
interface ViewLike {
  destroy: () => void;
  goTo: (target: unknown) => Promise<unknown>;
  graphics: LayerLike;
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
  const [failed, setFailed] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const viewRef = useRef<ViewLike | null>(null);

  const wells = report.wells;

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
              attributes: { name: `Well ${well.name}`, api: well.api },
              popupTemplate: {
                title: "{name}",
                content: `API {api} · ${well.drilled.toLowerCase()} · open ${well.openTopFt.toLocaleString("en-US")}–${well.openBottomFt.toLocaleString("en-US")} ft`,
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

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={
          <h3 className="text-[15px] font-bold">
            Where these wells sit in the rock
          </h3>
        }
        action={
          <Badge tone="slate" size="xs">
            {report.wellCount} well{report.wellCount === 1 ? "" : "s"} · coloured
            by lease
          </Badge>
        }
      />

      <div className="mt-3 flex justify-end">
        <SegmentedControl
          label="Basemap"
          tone="green"
          value={basemap}
          onChange={setBasemap}
          options={BASEMAPS}
        />
      </div>

      <div className="mt-2 overflow-hidden rounded-mv border border-mv-line">
        {failed ? (
          <p className="px-4 py-16 text-center text-[13px] text-mv-muted">
            The map could not load its imagery. Everything else on this page is
            unaffected — every well&apos;s filed interval is in the table above.
          </p>
        ) : (
          <div ref={container} className="h-[520px] w-full" />
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

      <p className="mt-1.5 text-center text-[11.5px] text-mv-muted">
        Click a well for its detail · imagery from Esri
      </p>
    </Card>
  );
}
