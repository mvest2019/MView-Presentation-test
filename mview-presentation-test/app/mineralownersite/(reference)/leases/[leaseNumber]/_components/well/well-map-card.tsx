"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Card, CardHeader } from "../../../../../_components/ui/card";
import { SegmentedControl } from "../../../../../_components/ui/segmented-control";
import { loadArcgisModules } from "../../../../../_lib/arcgis-loader";
import { LegendsPanel } from "../../../../map/_components/legends-panel";
import {
  BASEMAPS,
  RING_MILES,
  RING_ZOOM,
  ringSymbols,
  type Basemap,
} from "../../_lib/map-shared";
import { useLegendIcons } from "../../_lib/map-legend-icons";
import type { WellReport } from "../../_lib/well-report";
import {
  MapHoverTip,
  MapResetButton,
  RingPill,
  placeTip,
  type MapTip,
} from "../map-controls";

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
  const { statusIcon, collarIcon, legendSettled } = useLegendIcons();
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [ring, setRing] = useState<string>("lease");
  /**
   * Where to draw the hover tooltip, in pixels inside the map box, or null
   * when the pointer is not over the well. Already clamped — see `place`.
   */
  const [tip, setTip] = useState<MapTip | null>(null);
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
      /* THE LEGEND'S SYMBOLS HAVE TO BE IN HAND BEFORE THE HOLE IS DRAWN.
         It is drawn once and the reader's pan and zoom are kept after that, so
         this waits rather than redrawing later. A failed read settles it too,
         and then the plain markers below are what gets drawn. */
      if (!legendSettled) return;

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
              setTip({
                ...placeTip(at.x, at.y, container.current),
                title: `Well ${well.name}`,
                subtitle: `${well.drilled.toLowerCase()} · ${lease.status.toLowerCase()}`,
                rows: [
                  { label: "API", value: well.api },
                  { label: "Reservoir", value: lease.reservoir },
                  { label: "Operator", value: lease.operator },
                  {
                    label: "Open",
                    value: `${well.openTopFt.toLocaleString("en-US")}–${well.openBottomFt.toLocaleString("en-US")} ft`,
                  },
                  {
                    label: "Depth",
                    value: `${report.measuredFt.toLocaleString("en-US")} ft MD`,
                  },
                ],
              });
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
                 finishes in one place has no top distinct from its bottom, and
                 a second mark on the same point would just obscure the status
                 symbol underneath it. */
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
         * there is not — `well.bottom` is the surface again when nothing was
         * filed, so this one geometry covers both. It is the rule the
         * explorer's map follows, and worth stating: on a well with no filed
         * bottom hole, hanging the status symbol off the bottom draws it
         * nowhere at all.
         *
         * It carries the tooltip for the same reason: a hit-test hands back a
         * graphic, and on a two-mile lateral the surface hole is nowhere near
         * the symbol somebody pointed at.
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
  }, [well.api, legendSettled]);

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

    const drawn = ringSymbols(well.surface, outer).map(
      (shape) => new Graphic(shape),
    );

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
