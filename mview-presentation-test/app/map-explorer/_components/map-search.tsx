"use client";

import { MapPin } from "lucide-react";

/*
 * Typeahead for the map toolbar's search box.
 *
 * The places are static — a stand-in for the geocoder the placeholder implies
 * ("Town, ZIP or API number"). Each carries a coordinate and a scale, so
 * picking one actually moves the map rather than just filling the field.
 *
 * The list renders outside the toolbar rather than inside it: the toolbar
 * scrolls horizontally, and `overflow-x` clips on both axes, so a dropdown
 * nested in it would be sliced off. See `map-chrome.tsx` for the anchoring.
 */

export type PlaceKind = "City" | "County" | "ZIP";

export type Place = {
  name: string;
  kind: PlaceKind;
  /** `[longitude, latitude]`. */
  at: [number, number];
  /** Scale to settle on — towns come in closer than counties. */
  scale: number;
};

const CITY_SCALE = 160_000;
const COUNTY_SCALE = 900_000;
const ZIP_SCALE = 90_000;

export const PLACES: Place[] = [
  { name: "Fort Worth", kind: "City", at: [-97.3308, 32.7555], scale: CITY_SCALE },
  { name: "Fort Stockton", kind: "City", at: [-102.8793, 30.8935], scale: CITY_SCALE },
  { name: "Dalhart", kind: "City", at: [-102.5133, 36.0595], scale: CITY_SCALE },
  { name: "Carthage", kind: "City", at: [-94.3374, 32.1571], scale: CITY_SCALE },
  { name: "Port Arthur", kind: "City", at: [-93.9399, 29.8850], scale: CITY_SCALE },
  { name: "Houston", kind: "City", at: [-95.3698, 29.7604], scale: CITY_SCALE },
  { name: "San Antonio", kind: "City", at: [-98.4936, 29.4241], scale: CITY_SCALE },
  { name: "Dallas", kind: "City", at: [-96.797, 32.7767], scale: CITY_SCALE },
  { name: "Austin", kind: "City", at: [-97.7431, 30.2672], scale: CITY_SCALE },
  { name: "El Paso", kind: "City", at: [-106.4850, 31.7619], scale: CITY_SCALE },
  { name: "Midland", kind: "City", at: [-102.0779, 31.9973], scale: CITY_SCALE },
  { name: "Odessa", kind: "City", at: [-102.3676, 31.8457], scale: CITY_SCALE },
  { name: "Lubbock", kind: "City", at: [-101.8552, 33.5779], scale: CITY_SCALE },
  { name: "Amarillo", kind: "City", at: [-101.8313, 35.2220], scale: CITY_SCALE },
  { name: "Abilene", kind: "City", at: [-99.7331, 32.4487], scale: CITY_SCALE },
  { name: "Laredo", kind: "City", at: [-99.5075, 27.5306], scale: CITY_SCALE },
  { name: "Corpus Christi", kind: "City", at: [-97.3964, 27.8006], scale: CITY_SCALE },
  { name: "Brownsville", kind: "City", at: [-97.4975, 25.9017], scale: CITY_SCALE },
  { name: "Waco", kind: "City", at: [-97.1467, 31.5493], scale: CITY_SCALE },
  { name: "Tyler", kind: "City", at: [-95.3011, 32.3513], scale: CITY_SCALE },
  { name: "Pecos", kind: "City", at: [-103.4932, 31.4229], scale: CITY_SCALE },
  { name: "Big Spring", kind: "City", at: [-101.4787, 32.2504], scale: CITY_SCALE },
  { name: "Kermit", kind: "City", at: [-103.0924, 31.8579], scale: CITY_SCALE },
  { name: "Alpine", kind: "City", at: [-103.6616, 30.3585], scale: CITY_SCALE },
  { name: "Beeville", kind: "City", at: [-97.7481, 28.4011], scale: CITY_SCALE },
  { name: "Kilgore", kind: "City", at: [-94.8752, 32.3862], scale: CITY_SCALE },
  { name: "Snyder", kind: "City", at: [-100.9176, 32.7179], scale: CITY_SCALE },
  { name: "Andrews", kind: "County", at: [-102.6379, 32.3046], scale: COUNTY_SCALE },
  { name: "Midland", kind: "County", at: [-102.0313, 31.8693], scale: COUNTY_SCALE },
  { name: "Reeves", kind: "County", at: [-103.6935, 31.3216], scale: COUNTY_SCALE },
  { name: "Karnes", kind: "County", at: [-97.8598, 28.9053], scale: COUNTY_SCALE },
  { name: "Glasscock", kind: "County", at: [-101.5209, 31.8688], scale: COUNTY_SCALE },
  { name: "Reagan", kind: "County", at: [-101.5238, 31.3672], scale: COUNTY_SCALE },
  { name: "79701", kind: "ZIP", at: [-102.0724, 31.9974], scale: ZIP_SCALE },
  { name: "79761", kind: "ZIP", at: [-102.3676, 31.8457], scale: ZIP_SCALE },
  { name: "76102", kind: "ZIP", at: [-97.3308, 32.7555], scale: ZIP_SCALE },
];

export const MAX_PLACE_RESULTS = 6;

/**
 * Matches anywhere in the name, not just the start — "rt" has to find Fort
 * Worth and Dalhart alike. Ranked by where the match falls, so a hit near the
 * front of a name outranks one buried in it, then alphabetically to keep the
 * order stable between keystrokes.
 */
export function matchPlaces(query: string): Place[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return PLACES.map((place) => ({
    place,
    at: place.name.toLowerCase().indexOf(needle),
  }))
    .filter((entry) => entry.at !== -1)
    .sort(
      (a, b) =>
        a.at - b.at || a.place.name.localeCompare(b.place.name),
    )
    .slice(0, MAX_PLACE_RESULTS)
    .map((entry) => entry.place);
}

type PlaceResultsProps = {
  results: Place[];
  activeIndex: number;
  onHover: (index: number) => void;
  onPick: (place: Place) => void;
  style?: React.CSSProperties;
};

export function PlaceResults({
  results,
  activeIndex,
  onHover,
  onPick,
  style,
}: PlaceResultsProps) {
  return (
    <ul
      id="map-search-results"
      role="listbox"
      aria-label="Search results"
      className="pointer-events-auto absolute z-50 overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg"
      style={style}
    >
      {results.map((place, index) => (
        <li key={`${place.kind}:${place.name}`}>
          <button
            type="button"
            id={`map-search-option-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            // Keeps focus in the field, so blur never races the click.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(index)}
            onClick={() => onPick(place)}
            className={`w-full cursor-pointer border-b border-mv-line px-4 py-[9px] text-left last:border-b-0 ${
              index === activeIndex ? "bg-[#f2f8f5]" : ""
            }`}
          >
            <span className="block text-[14px] leading-tight text-mv-ink">
              {place.name}
            </span>
            <span className="mt-[3px] flex items-center gap-[5px] text-[12px] leading-none text-mv-green-deep">
              <MapPin size={12} aria-hidden="true" />
              {place.kind}
            </span>
          </button>
        </li>
      ))}

      {results.length === 0 && (
        <li className="px-4 py-[10px] text-[13px] text-mv-muted">No matches</li>
      )}
    </ul>
  );
}
