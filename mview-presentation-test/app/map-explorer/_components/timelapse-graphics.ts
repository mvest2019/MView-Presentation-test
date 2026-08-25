/*
 * Turning `/api/v1/map/timelapse/wells` into the bubbles the map draws.
 *
 * The service answers with one row per well — `{ api, lon, lat,
 * firstCompletionDate }` — for the whole state. The replay draws clusters and
 * sub-clusters, never individual wells, so the first thing that happens to
 * that list is being binned into cells: which cell a well falls in, and which
 * year it arrived.
 *
 * The replay is then cumulative. A cell's bubble is every well completed in it
 * up to the year on screen, so the map fills in rather than flickering one
 * year at a time — and because the count only ever grows, a cell climbs the
 * colour scale as the decades pass, which is the point of watching it.
 */

import { type MapTimeLapseWell } from "@/lib/map-api";
import { type WellCluster } from "./cluster-graphics";

/*
 * Cell sizes, one per zoom band the replay runs in.
 *
 * Measured against the real answer rather than chosen by eye: a degree leaves
 * 79 occupied cells, a quarter-degree 888. Finer than that and the bubbles are
 * a scatter plot, which is what zoom 10 is for.
 */
export const TIME_LAPSE_CLUSTER_CELL = 1;
export const TIME_LAPSE_SUB_CLUSTER_CELL = 0.25;

/*
 * The window a completion date has to fall in to be believed.
 *
 * The field carries a couple of impossible years — two wells dated 2061 and
 * 2070 — and a replay that runs to 2070 spends its last third on an empty map
 * waiting for them. The floor is Texas's own history: anything before 1900 is
 * a placeholder rather than a date.
 */
const EARLIEST_YEAR = 1900;

/** A cell, its centre, and what arrived in it each year. */
export type TimeLapseCell = {
  lon: number;
  lat: number;
  /** Wells first completed here, keyed by year. */
  byYear: Record<number, number>;
  /** The running total during a replay. */
  count: number;
};

export type TimeLapseGrid = {
  cells: TimeLapseCell[];
  /** Every year with something in it, ascending. */
  years: number[];
  /** Wells that fell inside the believable window. */
  total: number;
};

/**
 * Bins the service's wells into cells of the given size.
 *
 * Done once per grid when the answer arrives, not per frame: 465,000 rows is
 * a single pass worth a few hundred milliseconds, and the replay then only
 * ever adds to totals it already holds.
 */
export function buildGrid(
  wells: MapTimeLapseWell[],
  cellSize: number,
): TimeLapseGrid {
  const cells = new Map<string, TimeLapseCell>();
  const years = new Set<number>();
  const latestYear = new Date().getUTCFullYear();
  let total = 0;

  for (const well of wells) {
    const { lon, lat, firstCompletionDate } = well;
    if (typeof lon !== "number" || typeof lat !== "number") continue;

    const year = Number(firstCompletionDate?.slice(0, 4));
    if (!year || year < EARLIEST_YEAR || year > latestYear) continue;

    const x = Math.floor((lon + 180) / cellSize);
    const y = Math.floor((lat + 90) / cellSize);
    const key = `${x}:${y}`;

    let cell = cells.get(key);
    if (!cell) {
      cell = {
        /* The centre, not the corner: a bubble sits on the ground it counts. */
        lon: (x + 0.5) * cellSize - 180,
        lat: (y + 0.5) * cellSize - 90,
        byYear: {},
        count: 0,
      };
      cells.set(key, cell);
    }

    cell.byYear[year] = (cell.byYear[year] ?? 0) + 1;
    years.add(year);
    total += 1;
  }

  return {
    cells: [...cells.values()],
    years: [...years].sort((a, b) => a - b),
    total,
  };
}

/** Puts every cell back to zero, so a replay can run again from nothing. */
export function resetGrid(grid: TimeLapseGrid) {
  for (const cell of grid.cells) cell.count = 0;
}

/**
 * Adds one year to the running totals, in place.
 *
 * Returns how many wells that year brought, so the bar can report progress
 * without walking the cells a second time.
 */
export function addYear(grid: TimeLapseGrid, year: number): number {
  let added = 0;

  for (const cell of grid.cells) {
    const arrived = cell.byYear[year];
    if (arrived) {
      cell.count += arrived;
      added += arrived;
    }
  }

  return added;
}

/**
 * The cells with something in them, in the shape the bubble builder wants.
 *
 * Empty cells are dropped rather than drawn at zero: a bubble reading "0" is a
 * claim about ground the replay has not reached yet.
 */
export function gridToClusters(grid: TimeLapseGrid): WellCluster[] {
  const clusters: WellCluster[] = [];

  for (const cell of grid.cells) {
    if (cell.count === 0) continue;

    clusters.push({
      at: [cell.lon, cell.lat],
      count: cell.count,
      /* The bar above is the date. A card naming a year too would just be
         repeating it. */
      newestYear: null,
      name: "",
      oil: 0,
      gas: 0,
      oilGas: 0,
      oilShare: 0,
      gasShare: 0,
      oilGasShare: 0,
    });
  }

  return clusters;
}
