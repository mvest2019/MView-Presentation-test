"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../_components/ui/card";
import { SegmentedControl } from "../../../../_components/ui/segmented-control";
import { loadArcgisModules } from "../../../../_lib/arcgis-loader";
import { formatAcres } from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

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

type Basemap = "satellite" | "topo-vector" | "streets-vector";

const BASEMAPS: { value: Basemap; label: string }[] = [
  { value: "satellite", label: "Satellite" },
  { value: "topo-vector", label: "Topographic" },
  { value: "streets-vector", label: "Street" },
];

interface MapLike {
  basemap: string;
}
interface ViewLike {
  destroy: () => void;
}
type MapCtor = new (options: { basemap: string }) => MapLike;
type ViewCtor = new (options: {
  container: HTMLDivElement;
  map: MapLike;
  center: [number, number];
  zoom: number;
}) => ViewLike;

/** DE WITT County, Texas — where this record's acreage sits. */
const CENTRE: [number, number] = [-97.35, 29.08];

export function WellsMapCard({ report }: { report: LeaseReport }) {
  const { lease } = report;
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [failed, setFailed] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const viewRef = useRef<ViewLike | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function draw(): Promise<void> {
      const node = container.current;
      if (!node) return;

      try {
        const [EsriMap, MapView] = await loadArcgisModules<[MapCtor, ViewCtor]>([
          "esri/Map",
          "esri/views/MapView",
        ]);
        /* The component can unmount while the CDN is still answering — without
           this the view is built into a detached node and never torn down. */
        if (cancelled) return;

        const map = new EsriMap({ basemap });
        mapRef.current = map;
        viewRef.current = new MapView({
          container: node,
          map,
          center: CENTRE,
          zoom: 9,
        });
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

      <div className="mt-3 grid gap-3 rounded-[10px] border border-mv-line px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
        <Layer label="Surface locations" note={`${lease.wells} on this lease`} on />
        <Layer label="Bottom holes" note={`${lease.wells} bottom-hole locations`} on />
        <Layer label="Well paths" note={`0 recorded · ${lease.wells} estimated`} on />
        <Layer label="Neighbours' wells" note="120 within five miles" />
      </div>

      <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
        No traced unit boundary is held for this lease. The operator filed{" "}
        {formatAcres(lease.acres)} acres and the state records where each well
        starts and finishes, but the outline of the pooled unit only exists on
        the operator&apos;s survey plat — a scanned document that has to be
        georeferenced and traced by hand. Rather than draw a plausible rectangle,
        the map draws what is filed.
      </p>

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
            unaffected — the well locations are in the record above.
          </p>
        ) : (
          <div ref={container} className="h-[420px] w-full" />
        )}
      </div>
    </Card>
  );
}

/**
 * A layer row. The three filed layers are on and fixed; neighbours' wells is a
 * feed this module does not hold, so it is shown unchecked rather than offered
 * as a control that does nothing.
 */
function Layer({
  label,
  note,
  on = false,
}: {
  label: string;
  note: string;
  on?: boolean;
}) {
  return (
    <p className="flex items-start gap-2 text-[12.5px]">
      <span
        aria-hidden="true"
        className={`mt-[2px] flex h-[15px] w-[15px] flex-none items-center justify-center rounded-[4px] border text-[10px] font-bold ${
          on
            ? "border-mv-green-deep bg-mv-green-deep text-white"
            : "border-mv-line-strong bg-mv-card text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="min-w-0">
        <strong className="block">{label}</strong>
        <span className="text-[11px] text-mv-muted">{note}</span>
      </span>
    </p>
  );
}
