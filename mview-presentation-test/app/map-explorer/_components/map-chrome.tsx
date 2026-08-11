"use client";

import {
  ChartColumn,
  Clock,
  Download,
  Grid2x2,
  House,
  Layers,
  Map as MapIcon,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Search,
  Share2,
  Table2,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BasemapGallery } from "./basemap-gallery";
import { FiltersPanel } from "./filters-panel";
import { LegendsPanel } from "./legends-panel";
import { PlaceResults, matchPlaces, type Place } from "./map-search";
import { ShareMenu } from "./share-menu";
import { ToolsPanel } from "./tools-panel";
import { WELLS_STATEWIDE } from "./well-clusters";

/*
 * Every control that floats over the map, ported from the explorer mock: the
 * FILTERS and TOOLS edge tabs, the toolbar across the top, the scale/coordinate
 * card bottom-left and the navigation stack bottom-right.
 *
 * All of it is our own markup rather than Esri widgets — the mock's toolbar has
 * no Esri equivalent, and mixing the two would mean fighting `.esri-widget`
 * styling for the half that did. Only the attribution is left to the SDK, which
 * the terms of use require.
 *
 * Nothing here is wired to data yet. The view switch, the filter and tool rails,
 * time-lapse, export and share are all inert; zoom, home and the readout are
 * live because they only need the view.
 */

type MapChromeProps = {
  /** Live map scale denominator — the `1 : n` in the readout. */
  scale: number;
  center: { longitude: number; latitude: number };
  /** Active basemap id, so the gallery can mark its tile. */
  basemap: string;
  onBasemapChange: (id: string) => void;
  onSaveImage: () => void;
  onPrint: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Which of Map / Table / Insights is showing. Owned by the view. */
  viewTab: ViewTab;
  onViewTabChange: (tab: ViewTab) => void;
  /** Insights halves the map, so the toolbar sheds what will not fit. */
  compact?: boolean;
  /** Fired when a place is chosen from the search box. */
  onSelectPlace: (place: Place) => void;
  /** The tool waiting for a drag on the map, if any. */
  activeTool: string | null;
  onSelectTool: (
    id:
      | "draw-area"
      | "measure-distance"
      | "whats-near-my-land"
      | "measure-area",
  ) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onHome: () => void;
};

export type ViewTab = "map" | "table" | "insights";

const VIEW_TABS: { id: ViewTab; label: string; icon: typeof MapIcon }[] = [
  { id: "map", label: "Map", icon: MapIcon },
  { id: "table", label: "Table", icon: Table2 },
  { id: "insights", label: "Insights", icon: ChartColumn },
];

export function MapChrome({
  scale,
  center,
  basemap,
  onBasemapChange,
  onSaveImage,
  onPrint,
  isFullscreen,
  onToggleFullscreen,
  viewTab,
  onViewTabChange,
  compact = false,
  onSelectPlace,
  activeTool,
  onSelectTool,
  onZoomIn,
  onZoomOut,
  onHome,
}: MapChromeProps) {
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [legendsOpen, setLegendsOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  /*
   * Filters is open or closed per view, not globally. On the map it is the
   * panel people work from, so it opens with the page; alongside Insights the
   * map is only half as wide and the summary is the point, so it starts
   * collapsed to its edge tab. Keeping a flag per tab also means each view
   * remembers what you last did in it, instead of one view's choice following
   * you into the other.
   */
  const [filtersOpenByTab, setFiltersOpenByTab] = useState<
    Record<ViewTab, boolean>
  >({ map: true, insights: false, table: false });

  const filtersOpen = filtersOpenByTab[viewTab];

  const setFiltersOpen = (open: boolean) =>
    setFiltersOpenByTab((current) => ({ ...current, [viewTab]: open }));
  const [shareOpen, setShareOpen] = useState(false);
  const [shareAnchor, setShareAnchor] = useState({ top: 60, right: 16 });

  const [placeQuery, setPlaceQuery] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [placeAnchor, setPlaceAnchor] = useState({ top: 60, left: 0, width: 220 });
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const places = matchPlaces(placeQuery);
  const basemapRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLSpanElement>(null);
  const bar = scaleBar(scale);

  /**
   * Opens the share menu under the Share button. The offsets are measured
   * rather than hard-coded because the button's position moves with the
   * toolbar — the bar is right-aligned above 919px and centred below it, and
   * the statewide count changes width with the number.
   */
  const toggleShare = () => {
    if (shareOpen) {
      setShareOpen(false);
      return;
    }

    const toolbar = toolbarRef.current?.getBoundingClientRect();
    const button = shareButtonRef.current?.getBoundingClientRect();
    if (toolbar && button) {
      setShareAnchor({
        top: Math.round(button.bottom - toolbar.top + 8),
        right: Math.round(toolbar.right - button.right),
      });
    }
    setShareOpen(true);
  };

  /** Same anchoring problem as the share menu — measured, not nested. */
  const anchorPlaceResults = () => {
    const toolbar = toolbarRef.current?.getBoundingClientRect();
    const box = searchBoxRef.current?.getBoundingClientRect();
    if (!toolbar || !box) return;

    setPlaceAnchor({
      top: Math.round(box.bottom - toolbar.top + 6),
      left: Math.round(box.left - toolbar.left),
      width: Math.round(box.width),
    });
  };

  const pickPlace = (place: Place) => {
    setPlaceQuery(place.name);
    setPlaceOpen(false);
    onSelectPlace(place);
  };

  const onPlaceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setPlaceOpen(false);
      return;
    }
    if (!placeOpen || places.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPlaceIndex((index) => Math.min(index + 1, places.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setPlaceIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      pickPlace(places[placeIndex]);
    }
  };

  // Close the basemap gallery on an outside click or Escape — the same
  // handling the site header gives its Learn dropdown.
  useEffect(() => {
    if (!basemapOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!basemapRef.current?.contains(event.target as Node)) {
        setBasemapOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setBasemapOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [basemapOpen]);

  // Same for the tools panel. Kept as its own effect rather than folded into a
  // shared hook because that is how the site header handles its two overlays.
  useEffect(() => {
    if (!toolsOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!toolsRef.current?.contains(event.target as Node)) setToolsOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setToolsOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [toolsOpen]);

  // The place results live in the toolbar wrapper too, so the same test works.
  useEffect(() => {
    if (!placeOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setPlaceOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [placeOpen]);

  // And the share menu. Its outside-click test covers the toolbar wrapper,
  // which holds both the button and the menu.
  useEffect(() => {
    if (!shareOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setShareOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShareOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [shareOpen]);

  return (
    /* The layer is click-through so the map keeps its drag; each control opts
       itself back in with `pointer-events-auto`. */
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Filters is a standing panel, not a dropdown — it stays open while you
          work the map, so no outside-click dismissal. The chevron closes it.
          `z-10` lifts it over the scale card, which shares this corner. */}
      {filtersOpen ? (
        <FiltersPanel
          onCollapse={() => setFiltersOpen(false)}
          className="pointer-events-auto absolute bottom-6 left-3 top-3 z-10"
        />
      ) : (
        <EdgeTab
          side="left"
          label="Filters"
          onClick={() => setFiltersOpen(true)}
        />
      )}

      {/* The panel takes the tab's place rather than sitting beside it, so the
          right edge never shows both. */}
      <div ref={toolsRef}>
        {toolsOpen ? (
          <ToolsPanel
            activeId={activeTool ?? undefined}
            onSelect={(id) => {
              if (
                id === "draw-area" ||
                id === "measure-distance" ||
                id === "whats-near-my-land" ||
                id === "measure-area"
              ) {
                onSelectTool(id);
              }
            }}
            onCollapse={() => setToolsOpen(false)}
            className="pointer-events-auto absolute right-0 top-16"
          />
        ) : (
          <EdgeTab
            side="right"
            label="Tools"
            onClick={() => setToolsOpen(true)}
          />
        )}
      </div>

      {/* ---------------- top toolbar ---------------- */}
      <div
        ref={toolbarRef}
        className="absolute inset-x-0 top-0 flex justify-end p-4 max-[919px]:justify-center"
      >
        <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-mv-line bg-white/97 px-[6px] py-[4px] shadow-mv-lg backdrop-blur-[6px]">
          {/* A segmented control: the grey track groups the three views and
              makes the filled one read as the raised tab. */}
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[#f1f2f4] p-[3px]">
          {VIEW_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={viewTab === id}
              onClick={() => onViewTabChange(id)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-[6px] rounded-lg px-[10px] py-[5px] text-[12.5px] font-semibold leading-tight transition-colors ${
                viewTab === id
                  ? "bg-mv-green-deep text-white shadow-mv"
                  : "text-mv-slate hover:bg-white/70 hover:text-mv-green-deep"
              }`}
            >
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              {label}
            </button>
          ))}
          </div>

          {/* The statewide count and Export CSV are the first to go when the
              map is only half the page — the mock drops them too, and Share
              falls back to its icon. */}
          {!compact && (
            <>
              <Divider />

              <div className="shrink-0 px-[6px]">
                <div className="text-[9px] font-extrabold uppercase leading-none tracking-[.09em] text-mv-muted">
                  Wells statewide
                </div>
                <div className="mt-[3px] text-[14px] font-extrabold leading-none text-mv-ink">
                  {WELLS_STATEWIDE.toLocaleString("en-US")}
                </div>
              </div>
            </>
          )}

          <Divider />

          <ToolbarButton icon={Clock} label="Time-lapse" />

          <Divider />

          {!compact && (
            <ToolbarButton icon={Download} label="Export CSV">
              <span className="inline-flex items-center gap-[2px] rounded bg-mv-amber-bg px-[5px] py-[2px] text-[9px] font-extrabold uppercase tracking-[.06em] text-mv-amber">
                <Zap size={8} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                Pro
              </span>
            </ToolbarButton>
          )}

          {!compact && <Divider />}

          <span ref={shareButtonRef} className="shrink-0">
            <ToolbarButton
              icon={Share2}
              label={compact ? "" : "Share"}
              title="Share"
              onClick={toggleShare}
              expanded={shareOpen}
            />
          </span>

          <Divider />

          <div
            ref={searchBoxRef}
            className="ml-1 flex shrink-0 items-center gap-2 rounded-lg border border-mv-line bg-white py-[4px] pl-[10px] pr-[6px] focus-within:border-mv-green focus-within:ring-1 focus-within:ring-mv-green"
          >
            <label htmlFor="map-search" className="sr-only">
              Search by town, ZIP or API number
            </label>
            <input
              id="map-search"
              type="text"
              role="combobox"
              autoComplete="off"
              aria-expanded={placeOpen && places.length > 0}
              aria-controls="map-search-results"
              aria-activedescendant={
                placeOpen && places.length > 0
                  ? `map-search-option-${placeIndex}`
                  : undefined
              }
              value={placeQuery}
              onChange={(event) => {
                setPlaceQuery(event.target.value);
                setPlaceIndex(0);
                setPlaceOpen(true);
                anchorPlaceResults();
              }}
              onFocus={() => {
                setPlaceOpen(true);
                anchorPlaceResults();
              }}
              onKeyDown={onPlaceKeyDown}
              placeholder="Town, ZIP or API number"
              className="w-[148px] border-0 bg-transparent text-[12.5px] leading-tight text-mv-slate outline-none placeholder:text-mv-muted"
            />
            <Search size={15} className="text-mv-muted" aria-hidden="true" />
          </div>
        </div>

        {/* Sibling of the bar, not a child: the bar scrolls horizontally on
            narrow viewports, and `overflow-x` clips on both axes, so a dropdown
            nested inside it would be cut off. Anchored by measurement instead —
            see `toggleShare`. */}
        {placeOpen && placeQuery.trim() !== "" && (
          <PlaceResults
            results={places}
            activeIndex={placeIndex}
            onHover={setPlaceIndex}
            onPick={pickPlace}
            style={{
              top: placeAnchor.top,
              left: placeAnchor.left,
              width: placeAnchor.width,
            }}
          />
        )}

        {shareOpen && (
          <ShareMenu
            // Dismiss first: the capture should not have to wait on the menu,
            // and the print dialog must not open behind it.
            onSaveImage={() => {
              setShareOpen(false);
              onSaveImage();
            }}
            onPrint={() => {
              setShareOpen(false);
              onPrint();
            }}
            className="pointer-events-auto absolute"
            style={{ top: shareAnchor.top, right: shareAnchor.right }}
          />
        )}
      </div>

      {/* ---------------- legend + scale ----------------
          One bottom-left stack, so the two keep their spacing whatever the
          legend is doing. It steps aside when the filters panel is open rather
          than hiding under it: 12px gutter + the panel's 252px + 12px again. */}
      <div
        className={`absolute bottom-6 flex flex-col items-start gap-2 ${
          filtersOpen ? "left-[276px]" : "left-3"
        }`}
      >
      {legendsOpen && <LegendsPanel className="pointer-events-auto" />}

      <div className="pointer-events-auto w-[252px] overflow-hidden rounded-lg border border-mv-line bg-white/97 shadow-mv">
        <div className="px-3 pb-[6px] pt-2 text-[12px] font-semibold text-mv-ink">
          1 : {Math.round(scale).toLocaleString("en-US")}
        </div>
        <div className="flex items-center gap-[10px] px-3 pb-[9px]">
          {/* A bracket, not a line — the mock's bar has end ticks. */}
          <span
            aria-hidden="true"
            className="h-[7px] border-x border-b border-mv-slate/70"
            style={{ width: `${bar.width}px` }}
          />
          <span className="text-[11px] leading-none text-mv-slate">
            {bar.miles} mi · {bar.km} km
          </span>
        </div>
        <div className="border-t border-mv-line px-3 py-[7px] text-[11px] text-mv-slate">
          Latitude: {center.latitude.toFixed(4)}, Longitude:{" "}
          {center.longitude.toFixed(4)}
        </div>
      </div>
      </div>

      {/* ---------------- navigation stack ---------------- */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <div ref={basemapRef} className="relative">
          {basemapOpen && (
            <BasemapGallery
              selected={basemap}
              onSelect={(id) => {
                onBasemapChange(id);
                setBasemapOpen(false);
              }}
              // Left of the button, tops aligned — the button is 30px wide, so
              // 38px clears it with an 8px gap.
              className="pointer-events-auto absolute right-[38px] top-0"
            />
          )}

          <IconButton
            icon={Grid2x2}
            label="Basemap"
            active={basemapOpen}
            expanded={basemapOpen}
            onClick={() => setBasemapOpen((open) => !open)}
          />
        </div>

        {/* Labelled for what it does. The layers glyph is the mock's, but the
            button toggles the legend, and a tooltip reading "Layers" over a
            control that shows and hides the legend would just mislead. */}
        <IconButton
          icon={Layers}
          label="Legends"
          active={legendsOpen}
          expanded={legendsOpen}
          onClick={() => setLegendsOpen((open) => !open)}
        />
        <IconButton
          icon={isFullscreen ? Minimize : Maximize}
          label={isFullscreen ? "Exit full screen" : "Full screen"}
          active={isFullscreen}
          onClick={onToggleFullscreen}
        />

        {/* No `overflow-hidden` on this group: it would clip the tooltips that
            sit outside it. The two buttons round their own outer corners
            instead — 7px, the container's 8px less its 1px border. */}
        <div className="pointer-events-auto flex flex-col rounded-lg border border-mv-line bg-white shadow-mv">
          <Tooltip label="Zoom in">
            <button
              type="button"
              onClick={onZoomIn}
              aria-label="Zoom in"
              className="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-t-[7px] text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
            >
              <Plus size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <span className="h-px bg-mv-line" />
          <Tooltip label="Zoom out">
            <button
              type="button"
              onClick={onZoomOut}
              aria-label="Zoom out"
              className="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-b-[7px] text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
            >
              <Minus size={15} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>

        {/* A house, not another expand glyph — the previous icon was a near
            twin of the full-screen control two buttons up. */}
        <IconButton icon={House} label="Reset view" onClick={onHome} />
      </div>
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-[2px] h-6 w-px shrink-0 bg-mv-line" />;
}

function ToolbarButton({
  icon: Icon,
  label,
  children,
  onClick,
  expanded,
  title,
}: {
  icon: typeof MapIcon;
  /** Empty renders icon-only; `title` then carries the accessible name. */
  label: string;
  children?: React.ReactNode;
  onClick?: () => void;
  expanded?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={label ? undefined : title}
      title={title}
      className="inline-flex shrink-0 cursor-pointer items-center gap-[6px] rounded-lg px-[9px] py-[5px] text-[12.5px] font-semibold leading-tight text-mv-slate transition-colors hover:bg-[#f2f8f5] hover:text-mv-green-deep"
    >
      <Icon size={15} strokeWidth={2} aria-hidden="true" />
      {label}
      {children}
    </button>
  );
}

/**
 * Hover/focus label for the icon-only controls, sitting to their left.
 *
 * Replaces the native `title`, which never appears for keyboard users and
 * cannot be styled. `group-focus-within` covers the keyboard case, since the
 * whole stack is tab-reachable. The button keeps its `aria-label`; this is
 * decoration, hence `aria-hidden`.
 */
function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group pointer-events-auto relative flex">
      {children}

      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#1b2430] px-[9px] py-[5px] text-[11.5px] font-semibold leading-none text-white opacity-0 shadow-mv-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  expanded,
}: {
  icon: typeof MapIcon;
  label: string;
  onClick?: () => void;
  /** Filled green while the control's panel is open. */
  active?: boolean;
  expanded?: boolean;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-expanded={expanded}
        className={`grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-lg border shadow-mv ${
          active
            ? "border-mv-green-deep bg-mv-green-deep text-white"
            : "border-mv-line bg-white text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
        }`}
      >
        <Icon size={15} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

/** The vertical FILTERS / TOOLS tabs clipped to the left and right edges. */
function EdgeTab({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pointer-events-auto absolute cursor-pointer border border-mv-green-deep bg-mv-mint px-[11px] py-[15px] shadow-mv hover:bg-mv-green-deep hover:text-white ${
        side === "left"
          ? "left-0 top-6 rounded-r-lg border-l-0"
          : "right-0 top-16 rounded-l-lg border-r-0"
      }`}
    >
      {/* `vertical-rl` runs top-to-bottom; the flip makes it read upwards. */}
      <span className="block rotate-180 text-[12px] font-extrabold uppercase leading-none tracking-[.12em] [writing-mode:vertical-rl]">
        {label}
      </span>
    </button>
  );
}

const NICE_MILES = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 200, 500, 1000];

/** Longest bar the card has room for, in CSS pixels. */
const MAX_BAR_WIDTH = 64;

/**
 * Picks the roundest mileage that fits the bar, the way Esri's own scale bar
 * does. At the mock's 1:7,262,011 this lands on "50 mi · 80 km".
 */
function scaleBar(scale: number): { miles: number; km: number; width: number } {
  // ArcGIS defines scale against a 96dpi screen, so one pixel spans
  // `scale × 0.0254 / 96` metres on the ground.
  const metresPerPixel = (scale * 0.0254) / 96;

  for (let i = NICE_MILES.length - 1; i >= 0; i--) {
    const miles = NICE_MILES[i];
    const width = (miles * 1609.344) / metresPerPixel;
    if (width <= MAX_BAR_WIDTH) {
      const rawKm = miles * 1.609344;
      return {
        miles,
        km: rawKm < 10 ? Math.round(rawKm * 10) / 10 : Math.round(rawKm),
        width: Math.round(width),
      };
    }
  }

  const miles = NICE_MILES[0];
  return {
    miles,
    km: Math.round(miles * 1.609344 * 10) / 10,
    width: Math.round((miles * 1609.344) / metresPerPixel),
  };
}
