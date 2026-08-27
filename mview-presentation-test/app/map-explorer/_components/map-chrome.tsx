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
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BasemapGallery } from "./basemap-gallery";
import { FiltersPanel } from "./filters-panel";
import { LegendsPanel } from "./legends-panel";
import { getWellLookupMap, type MapWellLookup } from "@/lib/map-api";

import { ApiResults } from "./api-results";
import { ShareMenu } from "./share-menu";
import { ToolsPanel } from "./tools-panel";

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
 * export and share are all inert; zoom, home and the readout are live because
 * they only need the view.
 */

type MapChromeProps = {
  /** Live map scale denominator — the `1 : n` in the readout. */
  scale: number;
  /** Live zoom level, as Esri counts it. Fractional between LODs. */
  zoom: number;
  /** True once the map is close enough to draw individual wells. */
  wellsVisible: boolean;
  /** False past the point where the bubbles come off, so the legend goes
      with them rather than explaining an empty map. */
  marksVisible: boolean;
  center: { longitude: number; latitude: number };
  /** Active basemap id, so the gallery can mark its tile. */
  basemap: string;
  onBasemapChange: (id: string) => void;
  onSaveImage: () => void;
  /** Downloads what the map is showing — bubbles, or wells once close in. */
  onExportCsv: () => void;
  /** The replay bar is the view's, since the plotting is. */
  timeLapseOpen: boolean;
  onToggleTimeLapse: () => void;
  onPrint: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Which of Map / Table / Insights is showing. Owned by the view. */
  viewTab: ViewTab;
  onViewTabChange: (tab: ViewTab) => void;
  /** Opens the feature guide over the map. */
  /** Insights halves the map, so the toolbar sheds what will not fit. */
  compact?: boolean;
  /** Fired when an API number is chosen from the search box. */
  onSelectApi: (api: string) => void;
  /** Fired when the box is emptied — the picked well comes off the map. */
  onClearApi: () => void;
  /** Apply, with what the filters panel has ticked. */
  onApplyFilters: (filters: Record<string, string[]>) => void;
  /**
   * Rebuilds the filters panel when it changes.
   *
   * The panel holds its own selection and is kept mounted so that closing it
   * does not lose it; a new key is how the view asks for that selection to be
   * dropped — after a filter that matched nothing and was undone.
   */
  filtersResetAt?: number;
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

/*
 * Below this the lookup is not worth asking for. Six digits is the state and
 * county prefix plus a digit — enough to narrow the answer to one county's
 * wells rather than every well whose number happens to start the same way.
 */
const API_MIN_DIGITS = 6;

const VIEW_TABS: { id: ViewTab; label: string; icon: typeof MapIcon }[] = [
  { id: "map", label: "Map", icon: MapIcon },
  { id: "table", label: "Table", icon: Table2 },
  { id: "insights", label: "Insights", icon: ChartColumn },
];

export function MapChrome({
  scale,
  zoom,
  wellsVisible,
  marksVisible,
  center,
  basemap,
  onBasemapChange,
  onSaveImage,
  onExportCsv,
  timeLapseOpen,
  onToggleTimeLapse,
  onPrint,
  isFullscreen,
  onToggleFullscreen,
  viewTab,
  onViewTabChange,
  compact = false,
  onSelectApi,
  onClearApi,
  onApplyFilters,
  filtersResetAt = 0,
  activeTool,
  onSelectTool,
  onZoomIn,
  onZoomOut,
  onHome,
}: MapChromeProps) {
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [legendsOpen, setLegendsOpen] = useState(true);

  /*
   * Wide screens only get the panels expanded on arrival. Read once, on mount:
   * this is the opening state, not something that should re-fold a panel the
   * moment someone turns their tablet.
   */
  const [wideScreen] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 1024px)").matches,
  );
  const [toolsOpen, setToolsOpen] = useState(false);

  /*
   * How many facet values the last Apply carried.
   *
   * Kept here because the panel unmounts when it collapses and takes its own
   * state with it: with the rail shut, this is the only thing on the page that
   * knows the map is filtered.
   */
  const [appliedCount, setAppliedCount] = useState(0);
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
  >(() => ({
    // Only wide screens have room to give the rail 252px and still show a
    // usable map. On phones and tablets it starts collapsed to its edge tab.
    map:
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 1024px)").matches,

    insights: false,
    table: false,
  }));

  const filtersOpen = filtersOpenByTab[viewTab];

  /*
   * The filters rail's height, in pixels, measured off this layer.
   *
   * `ResizeObserver` rather than a one-off read: the map changes height when
   * the Insights split moves, when the window resizes and when the browser's
   * own chrome slides away, and the rail has to follow all three. The observer
   * fires once as soon as it starts watching, which is where the first
   * measurement comes from — nothing is set from the effect body itself.
   *
   * The 36 is the 12px inset above the card and the 24px below it.
   */
  const chromeRef = useRef<HTMLDivElement>(null);
  const [railHeight, setRailHeight] = useState<number | null>(null);

  useEffect(() => {
    const layer = chromeRef.current;
    if (!layer || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      const height = layer.clientHeight - 36;
      setRailHeight(height > 0 ? height : null);
    });

    observer.observe(layer);
    return () => observer.disconnect();
  }, []);

  const setFiltersOpen = (open: boolean) =>
    setFiltersOpenByTab((current) => ({ ...current, [viewTab]: open }));
  const [shareOpen, setShareOpen] = useState(false);
  const [shareAnchor, setShareAnchor] = useState({ top: 60, right: 16 });

  const [placeQuery, setPlaceQuery] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [placeAnchor, setPlaceAnchor] = useState({ top: 60, left: 0, width: 220 });
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  /* Below lg the field collapses to its magnifier — a full-width text input
     costs more than a narrow toolbar can spare. Above lg it is always open. */
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = () => {
    setSearchOpen(true);
    // After the input is laid out, or the typeahead anchors to a 32px box.
    setTimeout(() => {
      searchInputRef.current?.focus();
      anchorPlaceResults();
    }, 0);
  };

  /* What the lookup returned for what is typed, and the two states any
     request has besides its result. */
  const [places, setPlaces] = useState<MapWellLookup[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const basemapRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  /*
   * The Time-lapse hint: whether to show it, and where.
   *
   * Measured against the bar rather than nested in it. The bar scrolls
   * horizontally and `overflow-x` clips on both axes, so a card inside it
   * either gets cut off or widens the strip and gives it a scrollbar.
   */
  const timeLapseButtonRef = useRef<HTMLButtonElement>(null);
  const [hintAnchor, setHintAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const showTimeLapseHint = () => {
    const toolbar = toolbarRef.current?.getBoundingClientRect();
    const button = timeLapseButtonRef.current?.getBoundingClientRect();
    if (!toolbar || !button) return;

    setHintAnchor({
      top: Math.round(button.bottom - toolbar.top + 8),
      left: Math.round(button.left + button.width / 2 - toolbar.left),
    });
  };
  const shareButtonRef = useRef<HTMLSpanElement>(null);
  const bar = scaleBar(scale);

  /**
   * Opens the share menu under the Share button. The offsets are measured
   * rather than hard-coded because the button's position moves with the
   * toolbar — the bar is right-aligned above 919px and centred below it.
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

  /*
   * The lookup. Debounced, and only past the minimum: two digits match tens of
   * thousands of wells and the answer would be thrown away by the next
   * keystroke anyway.
   */
  useEffect(() => {
    const digits = placeQuery.replace(/\D/g, "");
    let cancelled = false;

    // The clear runs inside the timer too: a setState in the effect body is a
    // render-phase update, and React rightly refuses it.
    const timer = setTimeout(() => {
      if (digits.length < API_MIN_DIGITS) {
        setPlaces([]);
        setPlaceError(null);
        setPlaceLoading(false);
        return;
      }

      setPlaceLoading(true);
      getWellLookupMap(placeQuery.trim())
        .then((wells) => {
          if (cancelled) return;
          setPlaces(wells);
          setPlaceError(null);
          anchorPlaceResults();
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setPlaces([]);
          setPlaceError(
            error instanceof Error ? error.message : "Lookup failed.",
          );
        })
        .finally(() => {
          if (!cancelled) setPlaceLoading(false);
        });
    }, digits.length < API_MIN_DIGITS ? 0 : 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placeQuery]);

  const pickPlace = (well: MapWellLookup) => {
    setPlaceQuery(well.api);
    setPlaceOpen(false);
    onSelectApi(well.api);
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
    <div ref={chromeRef} className="pointer-events-none absolute inset-0 z-20">
      {/* Filters is a standing panel, not a dropdown — it stays open while you
          work the map, so no outside-click dismissal. The chevron closes it.
          `z-10` lifts it over the scale card, which shares this corner.

          Hidden when closed rather than unmounted. Unmounting took its state
          with it, so reopening after an Apply showed every box clear while the
          map was still filtered by what those boxes had said — the toolbar
          chip saying one thing and the panel another. Kept mounted, the ticks
          stand, the typed search stands, and the facet lists are fetched once
          rather than on every reopen. */}
      <FiltersPanel
        key={filtersResetAt}
        /* Applied, and out of the way. On a phone the rail covers most of
           the map, so leaving it open after Apply hides the very thing that
           just changed. Wide screens keep it open — there the map is beside
           the panel, not under it. Read at the tap rather than at mount, so
           a turned phone is judged as it is now. */
        onApply={(filters) => {
          onApplyFilters(filters);
          setAppliedCount(
            Object.values(filters).reduce(
              (total, values) => total + values.length,
              0,
            ),
          );
          if (!window.matchMedia("(min-width: 1024px)").matches) {
            setFiltersOpen(false);
          }
        }}
        onCollapse={() => setFiltersOpen(false)}
        /*
         * The card's height is measured off the map, not derived from it.
         *
         * Every version of this that let CSS work the height out — a top
         * edge with a bottom edge, then a percentage, then a stretched grid
         * cell — could come out short on some machines, leaving the Apply
         * button stranded mid-card with white beneath it. A number in pixels
         * cannot: `railHeight` is this layer's own height less the 12px
         * inset above and the 24px below, remeasured whenever the map
         * resizes. The `.mv-filters-rail` class holds the position and a
         * `calc` for the first paint, before the measurement lands.
         */
        className="mv-filters-rail pointer-events-auto z-10"
        /*
         * Closed is `display: none` in the style attribute, not the `hidden`
         * class. The card's own `.mv-filters-card` rule sets `display: grid`,
         * and being authored CSS it wins against a utility of the same
         * specificity — the panel stayed on screen with the toolbar chip
         * beside it saying it was shut. An inline style outranks both.
         */
        style={{
          ...(railHeight === null ? null : { height: railHeight }),
          ...(filtersOpen ? null : { display: "none" }),
        }}
      />

      {!filtersOpen && (
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
            /* Over bubbles the tools have no wells to measure, so the panel
               says what to do instead of arming one. */
            wellsVisible={wellsVisible}
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
            className="pointer-events-auto absolute right-0 top-[104px] lg:top-16"
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
        <div className="pointer-events-auto relative flex w-full max-w-full flex-col items-stretch gap-2 lg:w-auto lg:flex-row lg:flex-nowrap lg:items-center lg:gap-1 lg:overflow-x-auto lg:rounded-xl lg:border lg:border-mv-line lg:bg-white/97 lg:px-[6px] lg:py-[4px] lg:shadow-mv-lg lg:backdrop-blur-[6px]">
          {/* A segmented control: the grey track groups the three views and
              makes the filled one read as the raised tab. */}
          <div className="flex w-full shrink-0 items-center gap-1 rounded-xl border border-mv-line bg-white/97 p-1 shadow-mv-lg backdrop-blur-[6px] lg:w-auto lg:justify-start lg:rounded-lg lg:border-0 lg:bg-[#f1f2f4] lg:p-[3px] lg:shadow-none">
          {VIEW_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={viewTab === id}
              onClick={() => onViewTabChange(id)}
              /* Each tab takes a third of the card on a phone: three equal
                 targets read as one control, where content-width buttons in a
                 full-width card read as three loose chips with a gap. */
              className={`inline-flex flex-1 shrink-0 items-center justify-center gap-[6px] rounded-lg px-[10px] py-[7px] text-[13px] font-semibold leading-tight transition-colors enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none lg:py-[5px] lg:text-[12.5px] ${
                viewTab === id
                  ? "bg-mv-green-deep text-white shadow-mv"
                  : "text-mv-slate enabled:hover:bg-white/70 enabled:hover:text-mv-green-deep"
              }`}
            >
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              {label}
            </button>
          ))}
          </div>

          {/* Export CSV is the first to go when the map is only half the page
              — the mock drops it too, and Share falls back to its icon. */}
          <div className="flex flex-wrap items-center justify-end gap-2 lg:contents">

          {/* What is filtering the map, and the way off it.
              Shut, the rail says nothing about the filter it is holding — the
              map is simply missing wells with no telling why. The count
              reopens the panel, the cross clears where it stands, which is the
              whole reason not to have to reopen it.

              A phone's control, and only a phone's. There the rail shuts
              itself on Apply and covers the map when it is open, so something
              has to speak for it. From `lg` up the rail is open beside the map
              as a matter of course, and it says all this itself — a second
              copy in the toolbar is one badge too many. */}
          {appliedCount > 0 && !filtersOpen && (
            <span className="flex shrink-0 items-center gap-[6px] rounded-lg border border-mv-green-deep bg-white px-[9px] py-[6px] shadow-mv lg:hidden">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="cursor-pointer text-[11px] lg:text-[12px] font-bold leading-none text-mv-green-deep"
              >
                {appliedCount} filter{appliedCount === 1 ? "" : "s"} on
              </button>

              <button
                type="button"
                onClick={() => {
                  onApplyFilters({});
                  setAppliedCount(0);
                }}
                aria-label="Clear the applied filters"
                title="Clear filters"
                className="grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-md text-mv-muted hover:bg-mv-red-bg hover:text-mv-red"
              >
                <X size={12} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          )}

          {/* Always pressable — the view decides whether it can replay. The
              hint only says why it cannot, and only while the map is showing
              bubbles rather than wells. */}
          <ToolbarButton
            icon={Clock}
            label="Time-lapse"
            title="Replay the wells by the year they were recompleted"
            expanded={timeLapseOpen}
            onClick={onToggleTimeLapse}
            buttonRef={timeLapseButtonRef}
            onHoverStart={wellsVisible ? undefined : showTimeLapseHint}
            onHoverEnd={() => setHintAnchor(null)}
          />

          <Divider />

          {!compact && (
            <ToolbarButton
              icon={Download}
              label="Export CSV"
              onClick={onExportCsv}
            />
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

          <button
            type="button"
            onClick={openSearch}
            aria-label="Search by API number"
            aria-expanded={searchOpen}
            className="grid shrink-0 cursor-pointer place-items-center rounded-xl border border-mv-line bg-white/97 px-[9px] py-[7px] text-mv-slate shadow-mv-lg backdrop-blur-[6px] hover:text-mv-green-deep lg:hidden"
          >
            <Search size={15} aria-hidden="true" />
          </button>

          {/* A full-width row is what pushes the box onto its own line below the
              icons, so the trigger above never shifts — but the box inside it
              is narrower than the row and right-aligned under the icons. The
              row dissolves at lg, putting the box back in the single-row bar. */}
          <div
            className={`w-full lg:contents ${searchOpen ? "" : "hidden lg:contents"}`}
          >
            <div
              ref={searchBoxRef}
              className={`ml-auto mr-8 w-[232px] max-w-full items-center gap-2 rounded-lg border border-mv-line bg-white/97 px-[9px] py-[7px] shadow-mv-lg backdrop-blur-[6px] focus-within:border-mv-green focus-within:ring-1 focus-within:ring-mv-green lg:ml-1 lg:mr-0 lg:flex lg:w-auto lg:shrink-0 lg:bg-white lg:py-[4px] lg:pl-[10px] lg:pr-[6px] lg:shadow-none lg:backdrop-blur-none ${
                searchOpen ? "flex" : "hidden lg:flex"
              }`}
            >
              <label htmlFor="map-search" className="sr-only">
                Search by API number
              </label>
              <input
                ref={searchInputRef}
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
                  // Emptying the box undoes what picking a number did.
                  if (event.target.value.trim() === "") onClearApi();
                  setPlaceIndex(0);
                  setPlaceOpen(true);
                  anchorPlaceResults();
                }}
                onFocus={() => {
                  setPlaceOpen(true);
                  anchorPlaceResults();
                }}
                onKeyDown={onPlaceKeyDown}
                onBlur={() => {
                  if (!placeQuery.trim()) setSearchOpen(false);
                }}
                placeholder="API number (e.g 123-45678)"
                className="w-full min-w-0 border-0 bg-transparent text-[12.5px] leading-tight text-mv-slate outline-none placeholder:text-mv-muted lg:w-[148px]"
              />
              {placeQuery !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    /*
                      The same undoing the box does when it is emptied by hand:
                      the number stops filtering the map, the dropdown closes,
                      and focus goes back to the field so the next number can
                      be typed straight away.
                    */
                    setPlaceQuery("");
                    setPlaceOpen(false);
                    onClearApi();
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear the API number"
                  title="Clear the API number"
                  className="grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f1f2f4] hover:text-mv-red"
                >
                  <X size={12} strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}

              <Search
                size={15}
                aria-hidden="true"
                className="hidden shrink-0 text-mv-muted lg:block"
              />
            </div>
          </div>
          </div>
        </div>

        {/* The Time-lapse hint. Sibling of the bar for the same reason the
            dropdown below is: nested, it would widen the strip and give it a
            scrollbar. */}
        {hintAnchor && !wellsVisible && (
          <div
            role="tooltip"
            style={{ top: hintAnchor.top, left: hintAnchor.left }}
            className="pointer-events-none absolute z-50 w-[248px] -translate-x-1/2 rounded-lg bg-white px-[13px] py-[10px] text-[11.5px] font-medium leading-snug text-mv-slate shadow-mv-lg ring-1 ring-mv-line"
          >
            <span
              aria-hidden="true"
              className="absolute -top-[5px] left-1/2 h-[9px] w-[9px] -translate-x-1/2 rotate-45 border-l border-t border-mv-line bg-white"
            />
            Time-lapse replays individual wells. Zoom in to level 10, where the
            wells are drawn, then press it.
          </div>
        )}

        {/* Sibling of the bar, not a child: the bar scrolls horizontally on
            narrow viewports, and `overflow-x` clips on both axes, so a dropdown
            nested inside it would be cut off. Anchored by measurement instead —
            see `toggleShare`. */}
        {placeOpen && placeQuery.trim() !== "" && (
          <ApiResults
            results={places}
            query={placeQuery}
            activeIndex={placeIndex}
            loading={placeLoading}
            error={placeError}
            tooShort={placeQuery.replace(/\D/g, "").length < API_MIN_DIGITS}
            onHover={setPlaceIndex}
            onPick={pickPlace}
            /*
              Right-aligned to the input and sized to its own content: an API
              number and a county name do not fit a 232px box, and wrapping a
              number across two lines makes it unreadable. Growing leftwards
              keeps it on screen — the box sits at the right of the toolbar.
            */
            style={{
              top: placeAnchor.top,
              left: placeAnchor.left + placeAnchor.width,
              minWidth: placeAnchor.width,
              transform: "translateX(-100%)",
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
          than hiding under it: 12px gutter + the panel's 252px + 12px again.

          Below lg there is nowhere to step aside to — the panel takes most of
          the width — so the stack gets out of the way entirely until the
          filters are closed again. Display lives in the branches rather than
          the base, so `hidden` and `flex` never both apply. */}
      <div
        className={`absolute bottom-6 flex-col items-start gap-2 ${
          filtersOpen ? "left-[276px] hidden lg:flex" : "left-3 flex"
        }`}
      >
      {/* Explains whichever of the two the map is drawing, and steps aside
          when it is drawing neither. */}
      {legendsOpen && marksVisible && (
        <LegendsPanel
          mode={wellsVisible ? "wells" : "clusters"}
          defaultOpen={wideScreen}
          className="pointer-events-auto"
        />
      )}

      {/* The legend's own widths, to the pixel — the two stack one above the
          other in the bottom corner, and two boxes of different widths on the
          same left edge read as a mistake. 168/186/204 is the wider of the
          pair; the readings inside this one are shorter than that at every
          size. */}
      <div className="pointer-events-auto w-[168px] overflow-hidden rounded-lg border border-mv-line bg-white/97 shadow-mv md:w-[186px] lg:w-[204px]">
        <div className="px-[10px] pb-[3px] pt-[5px] text-[11px] font-semibold text-mv-ink lg:px-3 lg:pb-[6px] lg:pt-2 lg:text-[12px]">
          1 : {Math.round(scale).toLocaleString("en-US")}
        </div>
        <div className="flex items-center gap-2 px-[10px] pb-[6px] lg:gap-[10px] lg:px-3 lg:pb-[9px]">
          {/* A bracket, not a line — the mock's bar has end ticks. */}
          <span
            aria-hidden="true"
            className="h-[7px] border-x border-b border-mv-slate/70"
            style={{ width: `${bar.width}px` }}
          />
          <span className="text-[10px] leading-none text-mv-slate lg:text-[11px]">
            {bar.miles} mi · {bar.km} km
          </span>
        </div>
        {/* Abbreviated at every size. Spelled out it came to 212px, which
            fitted the old 214px card exactly — one degree further west and it
            would have been clipped mid-number, which on a coordinate is worse
            than no coordinate — and it does not fit this one at all. */}
        <div className="border-t border-mv-line px-[10px] py-[4px] text-[10px] text-mv-slate lg:px-3 lg:py-[7px] lg:text-[11px]">
          Lat {center.latitude.toFixed(4)} · Lon {center.longitude.toFixed(4)}
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

        {/* The zoom level, under the buttons that change it. Rounded, because
            `snapToZoom` is off and the raw value sits between LODs. */}
        <div className="pointer-events-auto rounded-lg border border-mv-line bg-white/97 px-[9px] py-[5px] text-[11px] font-semibold leading-none text-mv-slate shadow-mv backdrop-blur-[6px] lg:text-[12px]">
          Zoom {Math.round(zoom)}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-[2px] hidden h-6 w-px shrink-0 bg-mv-line lg:block" />;
}

function ToolbarButton({
  icon: Icon,
  label,
  children,
  onClick,
  expanded,
  title,
  disabled,
  buttonRef,
  onHoverStart,
  onHoverEnd,
}: {
  icon: typeof MapIcon;
  /** Empty renders icon-only; `title` then carries the accessible name. */
  label: string;
  children?: React.ReactNode;
  onClick?: () => void;
  expanded?: boolean;
  title?: string;
  disabled?: boolean;
  /** Set only where the caller needs to measure the button's position. */
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      /* Keyboard too: a hint only a mouse can reach is half a hint. */
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      disabled={disabled}
      aria-expanded={expanded}
      aria-label={label || title}
      title={title ?? label}
      className="inline-flex shrink-0 items-center gap-[6px] rounded-xl border border-mv-line bg-white/97 px-[9px] py-[7px] text-[12.5px] font-semibold leading-tight text-mv-slate shadow-mv-lg backdrop-blur-[6px] transition-colors enabled:cursor-pointer enabled:hover:bg-[#f2f8f5] enabled:hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-lg lg:border-0 lg:bg-transparent lg:py-[5px] lg:shadow-none lg:backdrop-blur-none"
    >
      <Icon size={15} strokeWidth={2} aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
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

/**
 * The vertical FILTERS / TOOLS tabs clipped to the left and right edges.
 *
 * Below md they start under the toolbar rather than beside it: the toolbar is
 * two rows tall there and the tabs were sitting behind it.
 */
function EdgeTab({
  side,
  label,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`pointer-events-auto absolute border border-mv-green-deep bg-mv-mint px-[8px] py-[11px] shadow-mv enabled:cursor-pointer enabled:hover:bg-mv-green-deep enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50 lg:px-[11px] lg:py-[15px] ${
        side === "left"
          ? "left-0 top-[104px] rounded-r-lg border-l-0 lg:top-6"
          : "right-0 top-[104px] rounded-l-lg border-r-0 lg:top-16"
      }`}
    >
      {/* `vertical-rl` runs top-to-bottom; the flip makes it read upwards. */}
      <span className="block rotate-180 text-[10.5px] font-extrabold uppercase leading-none tracking-[.1em] [writing-mode:vertical-rl] lg:text-[12px] lg:tracking-[.12em]">
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
