/*
 * The time-lapse, off the wells the map is already holding.
 *
 * Each well carries `recompletionDate` from `/map/wells`, so the replay needs
 * no request of its own: it is the set on screen, sorted by the year in that
 * field and put back a year at a time.
 *
 * Wells with no date sit out the replay and go back at the end. About one in
 * seven has none, and guessing a year for them would put wells on the map in
 * decades the record does not place them in.
 */

import { type MapWell } from "@/lib/map-api";

/** A year, and the wells the record dates to it. */
export type TimeLapseYear = { year: number; wells: MapWell[] };

/*
 * The window a date has to fall in to be believed.
 *
 * The field carries the occasional impossible year. The floor is Texas's own
 * history — anything earlier is a placeholder rather than a date — and the
 * ceiling is today, since a well cannot have been recompleted in the future.
 */
const EARLIEST_YEAR = 1900;

/**
 * Groups the wells by the year they were recompleted, oldest first.
 *
 * Returns only years that have something in them, so the replay never sits on
 * an empty step: a field drilled in 1955 and again in 2018 is two steps, not
 * sixty-three.
 */
export function yearsIn(wells: MapWell[]): TimeLapseYear[] {
  const latestYear = new Date().getUTCFullYear();
  const byYear = new Map<number, MapWell[]>();

  for (const well of wells) {
    const year = Number(well.recompletionDate?.slice(0, 4));
    if (!year || year < EARLIEST_YEAR || year > latestYear) continue;

    const bucket = byYear.get(year);
    if (bucket) bucket.push(well);
    else byYear.set(year, [well]);
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, group]) => ({ year, wells: group }));
}

/**
 * Every well dated up to and including the step given, oldest first.
 *
 * Cumulative, and rebuilt rather than added to: dragging the handle back has
 * to take wells off the map, and a running total only ever grows. Walking the
 * years again is a few hundred array reads — cheap enough to do on every frame
 * of a drag.
 *
 * Step -1 is before the first year: an empty map, where the replay starts.
 */
export function wellsUpTo(years: TimeLapseYear[], step: number): MapWell[] {
  const wells: MapWell[] = [];
  for (let at = 0; at <= step && at < years.length; at += 1) {
    wells.push(...years[at].wells);
  }
  return wells;
}

/** How many of the wells on screen the replay can actually place. */
export function datedCount(years: TimeLapseYear[]): number {
  return years.reduce((sum, year) => sum + year.wells.length, 0);
}
