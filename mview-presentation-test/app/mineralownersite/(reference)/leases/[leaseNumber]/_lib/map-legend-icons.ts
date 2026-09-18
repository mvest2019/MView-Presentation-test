"use client";

import { useEffect, useState } from "react";

import { getLegendListMap } from "@/lib/map-api";

/**
 * THE SYMBOLS THE LEGEND EXPLAINS, FOR THE MAPS THAT PRINT IT.
 *
 * ── WHY THIS EXISTS ──
 *
 * All three maps show the Legends panel — ninety rows, each a PNG and the
 * status it stands for — and all three drew a white circle for every hole
 * regardless. So the panel explained marks that were nowhere on the map, and
 * the map drew a mark the panel had no row for. The legend was decoration.
 *
 * Every well the service sends names its own row: `icon: "Gas"`,
 * `"Plugged Oil"`, `"Injection / Disposal from Oil"`. This joins the two on
 * `description`, which is the field that `icon` matches.
 *
 * ── WHAT IS NOT DRAWN FROM IT ──
 *
 * The line between surface and bottom. The legend's own "Horizontal /
 * Directional Lines" row is a PNG, and a picture cannot stretch along a
 * polyline of arbitrary length and bearing — so the maps keep drawing that
 * themselves, in the legend's colour.
 */

/** As much of a well as choosing its symbol needs. */
export interface LegendKeyed {
  drilled: "DIRECTIONAL" | "HORIZONTAL" | "VERTICAL";
  /** Absent on the fixture wells, which have no filed status to name. */
  icon?: string;
}

export function useLegendIcons() {
  const [icons, setIcons] = useState<Map<string, string>>(new Map());
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let live = true;
    getLegendListMap()
      .then((list) => {
        if (live) {
          setIcons(new Map(list.map((row) => [row.description, row.iconUrl])));
        }
      })
      /* A legend that will not load leaves the map drawing its plain markers,
         which is the state this map was in before any of this. It is not worth
         an error on a card whose subject is the wells — so the failure settles
         the hook exactly as a success does, and the map goes ahead. */
      .catch(() => {})
      .finally(() => {
        if (live) setSettled(true);
      });
    return () => {
      live = false;
    };
  }, []);

  return {
    /**
     * THE WELL'S OWN STATUS — gas, oil, plugged, injection — which goes at the
     * BOTTOM HOLE, or at its only location where no bottom is filed.
     *
     * That is where the map explorer puts it (`well-graphics.ts`), and the two
     * maps have to agree: the status symbol marks where the well actually
     * produces, and on a two-mile lateral the surface hole is nowhere near it.
     *
     * Undefined where the payload named no status — most of them, on most
     * leases — or where the legend has no such row, and the caller falls back
     * to its plain marker rather than to nothing.
     */
    statusIcon: (well: LegendKeyed) =>
      well.icon ? icons.get(well.icon) : undefined,

    /**
     * THE COLLAR AT THE SURFACE, which the legend keys on how the hole was
     * drilled rather than on what it produces — the small mark at the top of
     * the bore. A vertical hole is only ever in one place and has no bore to
     * mark the top of.
     *
     * Keyed on the mapped `drilled` union rather than on the raw `profile`,
     * because the service files profiles the legend has no row for —
     * "ANGLED / DEVIATED" is the commonest one — and those are directional
     * holes by any reading.
     *
     * THE LEGEND'S IMAGE, AS THE LEGEND PUBLISHES IT. It was tried recoloured
     * and on a filled disc, to lift a thin grey outline off the imagery; the
     * answer is that the map should show the same mark the panel does, and a
     * reader comparing the two should find them identical.

     */
    collarIcon: (well: LegendKeyed) =>
      well.drilled === "HORIZONTAL"
        ? icons.get("Horizontal")
        : well.drilled === "DIRECTIONAL"
          ? icons.get("Directional")
          : undefined,

    /**
     * WHETHER THE ANSWER IS IN, one way or the other.
     *
     * The maps draw their wells once and keep the reader's pan and zoom
     * afterwards, so they wait on this rather than redrawing when it flips —
     * and it flips on a failed read too, or a legend the service would not
     * return would leave the map permanently empty.
     */
    legendSettled: settled,
  };
}
