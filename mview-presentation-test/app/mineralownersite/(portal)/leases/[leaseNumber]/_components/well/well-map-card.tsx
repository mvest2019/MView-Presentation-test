"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "../../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../../_components/ui/card";
import { PortalButton } from "../../../../../_components/ui/button";
import { SegmentedControl } from "../../../../../_components/ui/segmented-control";
import { loadArcgisModules } from "../../../../../_lib/arcgis-loader";
import type { WellReport } from "../../_lib/well-report";

/**
 * "WHERE THIS WELL IS" — the surface hole, the bottom hole, and the line
 * between them.
 *
 * ── THE RING PILLS CHANGE THE VIEW, NOT THE DATA ──
 *
 * "This lease" frames the one hole; 1, 3 and 5 miles pull back to the
 * neighbourhood, and each pill carries the count of other wells inside it so a
 * reader knows what widening will show them before they click. The counts are
 * measured from this well's surface hole, not drawn from a list.
 *
 * ── THE DASHED LINE IS NOT THE WELL PATH ──
 *
 * Only the two ends are filed. Where no directional survey is on record a
 * straight line is all the record supports, so it is dashed and the legend
 * calls it a "surface-to-bottom line" rather than a path — otherwise somebody
 * measures a lateral off it.
 */

type Basemap = "satellite" | "topo-vector" | "streets-vector";

const BASEMAPS: { value: Basemap; label: string }[] = [
  { value: "satellite", label: "Satellite" },
  { value: "topo-vector", label: "Topographic" },
  { value: "streets-vector", label: "Street" },
];

/** Zoom levels that frame each ring. Bigger ring, wider view. */
const RING_ZOOM: Record<string, number> = {
  lease: 15,
  "1 mi": 13.5,
  "3 mi": 12.2,
  "5 mi": 11.4,
};

const MARK = [46, 143, 109] as const;

interface GraphicLike {
  geometry: unknown;
}
interface ViewLike {
  destroy: () => void;
  goTo: (target: unknown) => Promise<unknown>;
  graphics: { addMany: (graphics: GraphicLike[]) => void };
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

export function WellMapCard({ report }: { report: WellReport }) {
  const { well, lease } = report;
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [ring, setRing] = useState<string>("lease");
  const [failed, setFailed] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const viewRef = useRef<ViewLike | null>(null);

  const frame = useCallback(
    (key: string) => {
      const view = viewRef.current;
      if (!view) return;
      void view
        .goTo({ center: well.surface, zoom: RING_ZOOM[key] ?? 15 })
        .catch(() => undefined);
    },
    [well.surface],
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
          center: well.surface,
          zoom: RING_ZOOM.lease,
        });
        viewRef.current = view;

        const graphics: GraphicLike[] = [];
        const deviated =
          well.surface[0] !== well.bottom[0] || well.surface[1] !== well.bottom[1];

        if (deviated) {
          graphics.push(
            new Graphic({
              geometry: { type: "polyline", paths: [[well.surface, well.bottom]] },
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
            attributes: { name: `Well ${well.name}`, api: well.api },
            popupTemplate: {
              title: "{name}",
              content: `API {api} · ${well.drilled.toLowerCase()} · open ${well.openTopFt.toLocaleString("en-US")}–${well.openBottomFt.toLocaleString("en-US")} ft`,
            },
          }),
        );

        view.graphics.addMany(graphics);
        await view.when();
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
  }, [well.api]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.basemap = basemap;
  }, [basemap]);

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={<h3 className="text-[15px] font-bold">Where this well is</h3>}
        action={
          <Badge tone="slate" size="xs">
            surface hole, bottom hole and the path between
          </Badge>
        }
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="How far to look" className="flex flex-wrap gap-1.5">
          <RingPill
            label="This lease"
            selected={ring === "lease"}
            onClick={() => {
              setRing("lease");
              frame("lease");
            }}
          />
          {report.neighbours.map((neighbour) => (
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
            unaffected — the wellbore&apos;s filed interval is in the record
            above.
          </p>
        ) : (
          <>
            <div ref={container} className="h-[520px] w-full" />
            {/* Above the view, because a reader who has panned away needs the
                way back without hunting for the well. */}
            <PortalButton
              size="sm"
              className="absolute top-3 left-3 z-10"
              onClick={() => {
                setRing("lease");
                frame("lease");
              }}
            >
              Reset view
            </PortalButton>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11.5px]">
        <span className="flex items-center gap-1.5 font-semibold">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-[3px] bg-mv-green-deep"
          />
          {lease.reservoir}
        </span>
        <span className="text-mv-muted">
          ○ surface · ◇ bottom hole · – – surface-to-bottom line
        </span>
      </div>

      <p className="mt-1.5 text-center text-[11.5px] text-mv-muted">
        Click the well for its detail · imagery from Esri
      </p>
    </Card>
  );
}

function RingPill({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-[9px] border px-3 py-[6px] text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
        selected
          ? "border-mv-ink bg-mv-ink text-white"
          : "border-mv-line bg-mv-card text-mv-slate hover:bg-mv-bg"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 text-[10.5px] tabular-nums ${
            selected ? "bg-white/15 text-white" : "bg-mv-portal-wash text-mv-muted"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
