"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { House } from "lucide-react";

import { Card, CardHeader } from "../../../../../_components/ui/card";
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
 * AND THE RING IS DRAWN, not just zoomed to. A pill that only changed the zoom
 * asked the reader to take "within 3 miles" on trust and to judge the distance
 * off a scale bar; the dashed circle is the claim made visible, and the count
 * beside the pill is the count of wells inside that circle. See `ringPath` for
 * why it is spherical maths rather than degrees.
 *
 * ── HOVERING THE WELL OPENS OUR PANEL, NOT ESRI'S ──
 *
 * The default popup is a widget: a title bar with dock and collapse buttons, a
 * "Zoom to" action, and one line of content under a divider. Three of those
 * four things are chrome for a tool this map does not offer — there is nothing
 * to dock to, the ring pills already do the zooming, and the collapse button
 * collapses a panel that is one line tall. So `popupEnabled` is false and the
 * marker carries no `popupTemplate`; a `hitTest` tells us the well was hit, and
 * the panel below is ordinary markup in the portal's own card style.
 *
 * IT OPENS ON HOVER, so there is no close button and no Escape handler — both
 * existed for a panel you had to dismiss, and a tooltip is dismissed by moving
 * the pointer. The click handler stays only because a touch screen has no
 * hover at all.
 *
 * AND IT IS DRAWN AT THE POINTER RATHER THAN IN A CORNER. A corner panel was
 * the first shape of this, on the argument that a callout has to be re-measured
 * on every pan and zoom or it drifts off its subject. That argument belongs to
 * a panel you open and leave open: this one exists only while the pointer is on
 * the marker, and every pointer-move recomputes it, so there is no moment at
 * which it can be stale. See `place` for the flip and the clamp.
 *
 * It also says more. Esri's line was API, orientation and open interval; this
 * one adds the reservoir, the operator and both depths, because the click that
 * opens it is a reader asking "what is this" and those are the answers they
 * would otherwise scroll back up to the record for.
 *
 * ── THE DASHED LINE IS NOT THE WELL PATH ──
 *
 * Only the two ends are filed. Where no directional survey is on record a
 * straight line is all the record supports, so it is dashed and the legend
 * calls it a "surface-to-bottom line" rather than a path — otherwise somebody
 * measures a lateral off it.
 */

type Basemap =
  | "satellite"
  | "hybrid"
  | "topo-vector"
  | "streets-vector"
  | "terrain"
  | "gray-vector";

/**
 * THE SIX BASEMAPS, AND EACH ONE ANSWERS A DIFFERENT QUESTION ABOUT THE GROUND.
 *
 *   Satellite  what is actually there — the pad, the road cut, the tree line
 *   Hybrid     the same imagery with the roads and place names drawn on, which
 *              is the one that answers "whose land is that next to mine"
 *   Topo       contours and water, for how the ground lies
 *   Street     the road network alone, for getting to it
 *   Terrain    relief with almost nothing else, so shape is all that shows
 *   Light      a near-blank grey canvas: the well marks are the only thing
 *              with colour on it, which is the one to use when reading the
 *              wellbore path rather than the ground
 *
 * ORDER IS IMAGERY FIRST, ABSTRACTION LAST. A reader opening a map of their own
 * acreage wants to see it before they want a diagram of it, so the default is
 * Satellite and the drawn maps follow.
 */
const BASEMAPS: { value: Basemap; label: string }[] = [
  { value: "satellite", label: "Satellite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "topo-vector", label: "Topo" },
  { value: "streets-vector", label: "Street" },
  { value: "terrain", label: "Terrain" },
  { value: "gray-vector", label: "Light" },
];

/** How far each pill reaches, in miles. Keyed by the pill's own label. */
const RING_MILES: Record<string, number> = { "1 mi": 1, "3 mi": 3, "5 mi": 5 };

/** Mean earth radius, miles — the sphere the ring maths below is drawn on. */
const EARTH_MILES = 3958.8;

/**
 * A RING OF POINTS A GIVEN DISTANCE FROM A POINT, ON THE SPHERE.
 *
 * WHY NOT `radius / 69` IN DEGREES: a degree of longitude is only 69 miles at
 * the equator and narrows with the cosine of the latitude, so the easy version
 * draws an ellipse that is too wide — at this latitude a "5 mi" ring would
 * overstate the east-west reach by about a fifth, and the pill's count is
 * measured properly. A ring that disagrees with the number beside it is worse
 * than no ring.
 *
 * This is the standard destination-point formula walked around the compass, so
 * every point on the ring is genuinely the stated distance from the well.
 */
function ringPath(
  [lon, lat]: [number, number],
  miles: number,
  steps = 90,
): [number, number][] {
  const rad = Math.PI / 180;
  const d = miles / EARTH_MILES;
  const lat1 = lat * rad;
  const lon1 = lon * rad;
  const points: [number, number][] = [];

  for (let step = 0; step <= steps; step += 1) {
    const bearing = (step / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
        Math.cos(lat1) * Math.sin(d) * Math.cos(bearing),
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
      );
    points.push([lon2 / rad, lat2 / rad]);
  }
  return points;
}

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
interface HitResult {
  graphic?: { attributes?: Record<string, unknown> | null } | null;
}
interface ViewLike {
  destroy: () => void;
  goTo: (target: unknown) => Promise<unknown>;
  graphics: {
    addMany: (graphics: GraphicLike[]) => void;
    removeMany: (graphics: GraphicLike[]) => void;
  };
  when: () => Promise<unknown>;
  /** The view's widget corners. `move` re-homes a default widget by name. */
  ui: { move: (widget: string, position: string) => void };
  /** Off, so a click lands on our own panel instead of Esri's. */
  popupEnabled: boolean;
  on: (event: string, handler: (event: unknown) => void) => void;
  hitTest: (event: unknown) => Promise<{ results: HitResult[] }>;
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
  /**
   * Where to draw the hover tooltip, in pixels inside the map box, or null
   * when the pointer is not over the well. Already clamped — see `place`.
   */
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const viewRef = useRef<ViewLike | null>(null);
  /* The `Graphic` class and the rings currently drawn, so the ring effect can
     redraw without rebuilding the map. */
  const graphicRef = useRef<GraphicCtor | null>(null);
  const ringsRef = useRef<GraphicLike[]>([]);

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

        graphicRef.current = Graphic;

        const map = new EsriMap({ basemap });
        mapRef.current = map;

        const view = new MapView({
          container: node,
          map,
          center: well.surface,
          zoom: RING_ZOOM.lease,
        });
        viewRef.current = view;

        /*
         * ARCGIS PUTS ITS ZOOM WIDGET TOP-LEFT, WHICH IS WHERE OUR BUTTON IS.
         *
         * Left alone they land on the same corner and overlap outright — the
         * widget at (15,15) 32x64, "Reset view" at (12,12) 95x30 — so the
         * button covered the plus entirely and half the minus, and the control
         * read as a broken box with a dash in it. Moving ours instead would put
         * it somewhere a reader who has panned away has to look for; the zoom
         * pair is the one people already expect to find in a corner, any
         * corner, so it is the one that moves.
         */
        view.ui.move("zoom", "bottom-right");

        /* Esri's popup is off entirely rather than restyled: it is a widget
           with its own dock, collapse and "Zoom to" chrome, and the parts that
           are not wanted cannot be removed without fighting its CSS. */
        view.popupEnabled = false;

        /* `over` is held here rather than read back off state so the MISS case
           can be compared against the last answer without re-subscribing: a
           pointer-move fires many times a second, and setting state to null on
           every one of them would re-render the card continuously while the
           pointer merely crosses the map. A hit does set state each time,
           because that is what moves the tooltip — and it only happens over
           the marker, which is thirteen pixels across. */
        let over = false;
        const test = (event: unknown): void => {
          const at = event as { x: number; y: number };
          void view
            .hitTest(event)
            .then(({ results }) => {
              const hit = results.some(
                (result) => result.graphic?.attributes?.name,
              );
              if (!hit) {
                if (over) {
                  over = false;
                  setTip(null);
                }
                return;
              }
              over = true;
              setTip(place(at.x, at.y, container.current));
            })
            .catch(() => undefined);
        };

        view.on("pointer-move", test);
        /* AND ON CLICK, WHICH IS NOT REDUNDANT: a touch screen has no hover, so
           without this the panel would be unreachable on a phone entirely. A
           tap hit-tests the same way, and a tap on open ground closes it. */
        view.on("click", test);

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
            /* `attributes` STAYS, `popupTemplate` GOES. The attribute is
               what `hitTest` reads to know the click landed on the well
               rather than on the basemap; the template was the thing drawing
               Esri's own panel. See the note at the top of the file. */
            attributes: { name: `Well ${well.name}`, api: well.api },
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

  /*
   * THE RINGS THE PILLS NAME, DRAWN ON THE MAP.
   *
   * EVERY RING UP TO THE ONE CHOSEN, not just the chosen one. The pills are
   * nested distances rather than alternatives — a reader on "5 mi" is looking
   * at a count that includes the 1 and 3 mile wells — so the inner rings stay
   * and the choice is which is the outermost. "This lease" draws none.
   *
   * A SEPARATE EFFECT FROM THE MAP so changing the ring redraws two polylines
   * instead of tearing down the view and re-fetching every tile.
   */
  useEffect(() => {
    const view = viewRef.current;
    const Graphic = graphicRef.current;
    if (!view || !Graphic) return;

    view.graphics.removeMany(ringsRef.current);
    ringsRef.current = [];

    const outer = RING_MILES[ring];
    if (!outer) return;

    const drawn: GraphicLike[] = [];
    for (const [label, miles] of Object.entries(RING_MILES)) {
      if (miles > outer) continue;
      const path = ringPath(well.surface, miles);

      drawn.push(
        new Graphic({
          geometry: { type: "polyline", paths: [path] },
          symbol: {
            type: "simple-line",
            color: [255, 255, 255, 0.92],
            width: 1.4,
            style: "dash",
          },
        }),
      );

      /* The label rides the top of its own ring, where no ring below it can
         land — stacked at the centre they would overprint each other.

         `path[0]` IS NORTH. The loop walks bearings from 0, so index 0 is due
         north and a quarter of the way round is due east — which is where the
         labels first appeared, strung out sideways in a row instead of sitting
         on their own arcs. */
      const north = path[0];
      drawn.push(
        new Graphic({
          geometry: { type: "point", longitude: north[0], latitude: north[1] },
          symbol: {
            type: "text",
            text: label,
            color: [255, 255, 255, 1],
            haloColor: [15, 23, 42, 0.85],
            haloSize: 1.4,
            yoffset: 5,
            font: { size: 10, weight: "bold" },
          },
        }),
      );
    }

    view.graphics.addMany(drawn);
    ringsRef.current = drawn;
  }, [ring, well.surface]);


  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      {/* No chip beside the heading. It read "surface hole, bottom hole and the
          path between", which is what the legend under the map already spells
          out with the marks themselves beside each word. */}
      <CardHeader
        title={<h3 className="text-[15px] font-bold">Where this well is</h3>}
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
            <div
              ref={container}
              /* Esri sets a cursor on its surface, so the marker's pointer
                 cursor has to be set there too and has to win — an element
                 that shows a detail on hover should say so before the hover. */
              className={`h-[520px] w-full ${
                tip ? "[&_.esri-view-surface]:cursor-pointer!" : ""
              }`.trim()}
            />
            {/*
              RECENTRE — AN ICON, IN THE STACK WITH THE ZOOM PAIR.

              It was a worded button in the opposite corner, which made it look
              like a page control that happened to be sitting on a map rather
              than one of the map's own tools. The three things that move the
              view now sit together: home, in, out. A reader who has panned away
              looks at the map controls, not at the top-left of the image.

              THE OFFSET IS ARITHMETIC, NOT A GUESS. Esri puts the zoom pair
              30px off the bottom (clear of its attribution bar) and it is 64px
              tall, so its top edge is at 94; this sits 8px above that.

              THE LABEL SURVIVES THE TEXT. `aria-label` is what a screen reader
              reads and `title` is what a mouse reader gets on hover, so
              dropping the word from the face loses the affordance to neither.
            */}
            <button
              type="button"
              onClick={() => {
                setRing("lease");
                frame("lease");
              }}
              aria-label="Reset view"
              title="Reset view"
              className="absolute right-[15px] bottom-[102px] z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-[4px] border border-mv-line bg-mv-card text-mv-slate shadow-mv transition-colors hover:bg-mv-bg hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <House aria-hidden="true" className="h-4 w-4" />
            </button>

            {tip && <WellHoverTip report={report} at={tip} />}
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

    </Card>
  );
}

/**
 * The tooltip's own size, which `place` needs BEFORE it has been drawn.
 *
 * `height` IS MEASURED, NOT ESTIMATED. It was guessed at 200 and the rendered
 * card is 248 — two header lines over five fact rows — so the bottom clamp was
 * short by 48px and a well sitting low in the view would have pushed the last
 * row out through the floor of the map. If a row is added here, re-measure:
 * the number's only job is to be the real one.
 */
const TIP = { width: 258, height: 248 } as const;

/**
 * WHERE THE TOOLTIP GOES, GIVEN WHERE THE POINTER IS.
 *
 * BESIDE THE POINTER, NOT UNDER IT: a tooltip drawn under the cursor covers the
 * thing it describes, and on a map that thing is the well. Sixteen pixels to
 * the right, lifted slightly, is clear of both the marker and the cursor.
 *
 * IT FLIPS RATHER THAN OVERFLOWS. A well near the right-hand edge would push
 * 258px of card off the map, so past the halfway point it is drawn to the LEFT
 * of the pointer instead. Vertically it is clamped rather than flipped, because
 * a tooltip that jumps above the cursor reads as a different tooltip.
 *
 * This is arithmetic rather than CSS because the clamp needs the map's real
 * size, and the map is a div whose height is set in one place and whose width
 * is whatever the card gives it.
 */
function place(
  x: number,
  y: number,
  node: HTMLDivElement | null,
): { left: number; top: number } {
  const width = node?.clientWidth ?? 0;
  const height = node?.clientHeight ?? 0;
  const gap = 16;
  const edge = 8;

  const right = x + gap;
  const left =
    right + TIP.width > width - edge ? x - gap - TIP.width : right;

  const top = y - 24;
  const floor = Math.max(edge, height - TIP.height - edge);

  return {
    left: Math.max(edge, left),
    top: Math.min(Math.max(edge, top), floor),
  };
}

/**
 * The well's detail, in the portal's card rather than the map vendor's, drawn
 * beside the pointer.
 */
function WellHoverTip({
  report,
  at,
}: {
  report: WellReport;
  at: { left: number; top: number };
}) {
  const { well, lease } = report;

  return (
    <div
      role="tooltip"
      aria-label={`Well ${well.name}`}
      /* `pointer-events-none` IS THE WHOLE DIFFERENCE BETWEEN A TOOLTIP AND A
         PANEL. It follows the pointer being over the MARKER, so it must never
         become a thing the pointer can be over itself — sitting in the corner
         it would otherwise swallow a hover meant for the map underneath and
         leave itself stuck open. */
      style={{ left: at.left, top: at.top, width: TIP.width }}
      className="pointer-events-none absolute z-10 rounded-mv border border-mv-line bg-mv-card shadow-mv-lg"
    >
      <div className="border-b border-mv-line px-3.5 py-3">
        <p className="text-[13.5px] leading-tight font-bold">
          Well {well.name}
        </p>
        <p className="mt-1 text-[10.5px] font-bold tracking-[0.08em] text-mv-muted uppercase">
          {well.drilled.toLowerCase()} · {lease.status.toLowerCase()}
        </p>
      </div>

      <dl className="px-3.5 py-2.5">
        <PanelRow label="API" value={well.api} />
        <PanelRow label="Reservoir" value={lease.reservoir} />
        <PanelRow label="Operator" value={lease.operator} />
        <PanelRow
          label="Open"
          value={`${well.openTopFt.toLocaleString("en-US")}–${well.openBottomFt.toLocaleString("en-US")} ft`}
        />
        <PanelRow
          label="Depth"
          value={`${report.measuredFt.toLocaleString("en-US")} ft MD`}
        />
      </dl>
    </div>
  );
}

/** One row of the panel: label left, value right, the figures right-aligned. */
function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-mv-portal-hairline py-[7px] last:border-b-0">
      <dt className="text-[11px] text-mv-muted">{label}</dt>
      <dd className="ml-auto text-right text-[11.5px] font-semibold tabular-nums">
        {value}
      </dd>
    </div>
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
