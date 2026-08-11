"use client";

import { Check } from "lucide-react";

/*
 * The basemap picker panel that opens off the basemap button.
 *
 * Standalone and presentational — it renders the panel and nothing else. It
 * owns no open/close state, no outside-click handling and no map wiring, so it
 * can be dropped in wherever without touching what is already there:
 *
 *     const [open, setOpen] = useState(false);
 *     const [basemap, setBasemap] = useState("topo-vector");
 *
 *     {open && (
 *       <BasemapGallery
 *         selected={basemap}
 *         onSelect={(id) => { setBasemap(id); setOpen(false); }}
 *         className="absolute right-11 top-0"
 *       />
 *     )}
 *
 * Point the map at it with `view.map.basemap = id` — assigning the string is
 * enough, ArcGIS autocasts it.
 *
 * The thumbnails are inline SVG rather than Esri's hosted preview images: six
 * network requests for 72x52 pictures is a poor trade, and these cannot break
 * when a portal item is retired.
 */

export type BasemapOption = {
  /** Esri basemap id — assignable straight to `map.basemap`. */
  id: string;
  label: string;
  palette: ThumbnailPalette;
};

type ThumbnailPalette = {
  land: string;
  /** Vegetation blob; omitted on the imagery and dark styles. */
  green?: string;
  water: string;
  roadMajor: string;
  roadMinor: string;
};

export const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    id: "satellite",
    label: "Satellite",
    palette: {
      land: "#3f4a33",
      water: "#2f4356",
      roadMajor: "#6f7d59",
      roadMinor: "#57634a",
    },
  },
  {
    id: "hybrid",
    label: "Hybrid",
    palette: {
      land: "#3a4436",
      water: "#3d6b8c",
      roadMajor: "#e8a33d",
      roadMinor: "#b7893c",
    },
  },
  {
    id: "streets",
    label: "Streets",
    palette: {
      land: "#f8f5f0",
      water: "#a9d6ef",
      roadMajor: "#e9a33d",
      roadMinor: "#e2ddd4",
    },
  },
  {
    id: "topo-vector",
    label: "Topo",
    // The land tone is topo-vector's own `#e1e3d0`, lightened for a 52px tile.
    palette: {
      land: "#edefdf",
      green: "#cfe0ac",
      water: "#a9d6ef",
      roadMajor: "#e0a44a",
      roadMinor: "#dcd8c8",
    },
  },
  {
    id: "terrain",
    label: "Terrain",
    palette: {
      land: "#d6ddba",
      green: "#b9c894",
      water: "#a9d6ef",
      roadMajor: "#f1eee6",
      roadMinor: "#e3e0d2",
    },
  },
  {
    id: "dark-gray-vector",
    label: "Dark",
    palette: {
      land: "#24282c",
      water: "#2b3a45",
      roadMajor: "#3f464d",
      roadMinor: "#31373d",
    },
  },
];

type BasemapGalleryProps = {
  /** Id of the active basemap; the tile carrying it gets the check. */
  selected: string;
  onSelect: (id: string) => void;
  /** Positioning — the panel places itself nowhere on its own. */
  className?: string;
  options?: BasemapOption[];
};

export function BasemapGallery({
  selected,
  onSelect,
  className = "",
  options = BASEMAP_OPTIONS,
}: BasemapGalleryProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Basemap"
      className={`w-[266px] rounded-2xl border border-mv-line bg-white p-[14px] shadow-mv-lg ${className}`}
    >
      <div className="mb-[10px] text-[10px] font-extrabold uppercase tracking-[.16em] text-mv-slate">
        Basemap
      </div>

      <div className="grid grid-cols-3 gap-x-[14px] gap-y-[10px]">
        {options.map(({ id, label, palette }) => {
          const active = id === selected;

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(id)}
              className="group flex cursor-pointer flex-col items-center gap-[6px] rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <span
                className={`relative block h-[52px] w-[72px] overflow-hidden rounded-lg border-2 transition-colors ${
                  active
                    ? "border-mv-green"
                    : "border-mv-line group-hover:border-mv-green-deep"
                }`}
              >
                <ThumbnailMap palette={palette} />

                {active && (
                  <span className="absolute right-[3px] top-[3px] grid h-[15px] w-[15px] place-items-center rounded-full bg-mv-green-deep text-white shadow-[0_1px_3px_rgba(13,14,23,.35)]">
                    <Check size={10} strokeWidth={3.5} aria-hidden="true" />
                  </span>
                )}
              </span>

              <span
                className={`text-[11.5px] font-semibold leading-none ${
                  active ? "text-mv-green-deep" : "text-mv-ink"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A 72x52 stand-in for a map: land, a vegetation blob, a bay in the lower-left
 * and three roads running across it. Same geometry for every tile so the six
 * read as one set and only the palette tells them apart.
 */
function ThumbnailMap({ palette }: { palette: ThumbnailPalette }) {
  const { land, green, water, roadMajor, roadMinor } = palette;

  return (
    <svg
      viewBox="0 0 72 52"
      preserveAspectRatio="none"
      className="block h-full w-full"
      aria-hidden="true"
    >
      <rect width="72" height="52" fill={land} />

      {green && (
        <path
          d="M44 -4 C 58 0, 66 6, 76 2 L 76 -6 Z M52 4 C 62 8, 70 6, 76 10 L 76 20 C 64 22, 54 14, 48 10 Z"
          fill={green}
        />
      )}

      <path
        d="M-2 30 C 6 26, 10 40, 20 44 C 26 47, 26 54, 24 58 L -4 58 Z"
        fill={water}
      />

      <g fill="none" strokeLinecap="round">
        <path
          d="M-2 16 C 14 12, 24 24, 42 20 C 58 17, 64 10, 76 13"
          stroke={roadMajor}
          strokeWidth="2.2"
        />
        <path
          d="M-2 40 C 16 36, 34 44, 50 38 C 62 34, 68 36, 76 34"
          stroke={roadMajor}
          strokeWidth="1.6"
        />
        <path
          d="M32 -2 C 34 12, 28 24, 33 38 C 36 46, 34 50, 36 54"
          stroke={roadMinor}
          strokeWidth="1.4"
        />
      </g>
    </svg>
  );
}
