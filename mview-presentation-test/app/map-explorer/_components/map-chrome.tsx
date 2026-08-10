"use client";

import {
  ChartColumn,
  Clock,
  Download,
  Expand,
  Grid2x2,
  Layers,
  Map as MapIcon,
  Maximize,
  Minus,
  Plus,
  Search,
  Share2,
  Table2,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BasemapGallery } from "./basemap-gallery";
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
  onZoomIn: () => void;
  onZoomOut: () => void;
  onHome: () => void;
};

type ViewTab = "map" | "table" | "insights";

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
  onZoomIn,
  onZoomOut,
  onHome,
}: MapChromeProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("map");
  const [basemapOpen, setBasemapOpen] = useState(false);
  const basemapRef = useRef<HTMLDivElement>(null);
  const bar = scaleBar(scale);

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

  return (
    /* The layer is click-through so the map keeps its drag; each control opts
       itself back in with `pointer-events-auto`. */
    <div className="pointer-events-none absolute inset-0 z-20">
      <EdgeTab side="left" label="Filters" />
      <EdgeTab side="right" label="Tools" />

      {/* ---------------- top toolbar ---------------- */}
      <div className="absolute inset-x-0 top-0 flex justify-end p-4 max-[919px]:justify-center">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-mv-line bg-white/97 px-2 py-[5px] shadow-mv-lg backdrop-blur-[6px]">
          {VIEW_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-[6px] rounded-lg px-3 py-[6px] text-[13px] font-semibold leading-tight transition-colors ${
                activeTab === id
                  ? "bg-mv-green-deep text-white"
                  : "text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
              }`}
            >
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              {label}
            </button>
          ))}

          <Divider />

          <div className="shrink-0 px-2">
            <div className="text-[9px] font-extrabold uppercase leading-none tracking-[.09em] text-mv-muted">
              Wells statewide
            </div>
            <div className="mt-[3px] text-[15px] font-extrabold leading-none text-mv-ink">
              {WELLS_STATEWIDE.toLocaleString("en-US")}
            </div>
          </div>

          <Divider />

          <ToolbarButton icon={Clock} label="Time-lapse" />
          <ToolbarButton icon={Download} label="Export CSV">
            <span className="inline-flex items-center gap-[2px] rounded bg-mv-amber-bg px-[5px] py-[2px] text-[9px] font-extrabold uppercase tracking-[.06em] text-mv-amber">
              <Zap size={8} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              Pro
            </span>
          </ToolbarButton>
          <ToolbarButton icon={Share2} label="Share" />

          <div className="ml-1 flex shrink-0 items-center gap-2 rounded-lg border border-mv-line bg-white py-[5px] pl-3 pr-2">
            <label htmlFor="map-search" className="sr-only">
              Search by town, ZIP or API number
            </label>
            <input
              id="map-search"
              type="search"
              placeholder="Town, ZIP or API number"
              className="w-[168px] border-0 bg-transparent text-[13px] leading-tight text-mv-slate outline-none placeholder:text-mv-muted"
            />
            <Search size={15} className="text-mv-muted" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* ---------------- scale + coordinates ---------------- */}
      <div className="pointer-events-auto absolute bottom-6 left-3 w-[252px] overflow-hidden rounded-lg border border-mv-line bg-white/97 shadow-mv">
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

        <IconButton icon={Layers} label="Layers" />
        <IconButton icon={Maximize} label="Full screen" />

        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-lg border border-mv-line bg-white shadow-mv">
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="grid h-[30px] w-[30px] cursor-pointer place-items-center text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
          <span className="h-px bg-mv-line" />
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="grid h-[30px] w-[30px] cursor-pointer place-items-center text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
          >
            <Minus size={15} aria-hidden="true" />
          </button>
        </div>

        <IconButton icon={Expand} label="Reset to Texas" onClick={onHome} />
      </div>
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-7 w-px shrink-0 bg-mv-line" />;
}

function ToolbarButton({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapIcon;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="inline-flex shrink-0 cursor-pointer items-center gap-[6px] rounded-lg px-[10px] py-[6px] text-[13px] font-semibold leading-tight text-mv-slate transition-colors hover:bg-[#f2f8f5] hover:text-mv-green-deep"
    >
      <Icon size={15} strokeWidth={2} aria-hidden="true" />
      {label}
      {children}
    </button>
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
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      title={label}
      className={`pointer-events-auto grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-lg border shadow-mv ${
        active
          ? "border-mv-green-deep bg-mv-green-deep text-white"
          : "border-mv-line bg-white text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
      }`}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

/** The vertical FILTERS / TOOLS tabs clipped to the left and right edges. */
function EdgeTab({ side, label }: { side: "left" | "right"; label: string }) {
  return (
    <button
      type="button"
      className={`pointer-events-auto absolute cursor-pointer border border-mv-line bg-white px-[5px] py-[11px] shadow-mv hover:bg-[#f2f8f5] ${
        side === "left"
          ? "left-0 top-6 rounded-r-lg border-l-0"
          : "right-0 top-16 rounded-l-lg border-r-0"
      }`}
    >
      {/* `vertical-rl` runs top-to-bottom; the flip makes it read upwards. */}
      <span className="block rotate-180 text-[10px] font-extrabold uppercase leading-none tracking-[.12em] text-mv-green-deep [writing-mode:vertical-rl]">
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
