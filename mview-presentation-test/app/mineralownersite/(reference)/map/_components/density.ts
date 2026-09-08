/*
 * View modes: Ultra → Essentials → Detailed → Pro, simplest to fullest.
 *
 * Each mode is a floor, not a set: the map shows everything its own mode and
 * every mode below it carries, so a reader moves from the bare minimum to the
 * whole thing along one row of four.
 *
 * WHERE THE CHOICE IS MADE, and it is not here. The four are the owner
 * portal's own — the density tabs in the avatar menu, `Tier` in
 * `_components/reference/bits.tsx` — and the map reads whichever one is set
 * through `usePortalViewState`. This file used to be `density-switch.tsx` and
 * carried the picker as well; the picker went when the map moved inside the
 * portal chrome, because the chrome already had one and two copies of a setting
 * on one screen can disagree. What is left is the ranking and the words for it.
 *
 * The values are the portal's `Tier` values exactly — `ultra` · `simple` ·
 * `detailed` · `pro` — so the two are assignable without a mapping table.
 * Declared again rather than imported because the map needs a ranking the
 * portal has no use for, and `showsAt` is called from six files here.
 *
 * "Pro" is the short form of Professional. It is a view mode, never a plan name.
 */

export const DENSITIES = ["ultra", "simple", "detailed", "pro"] as const;

export type Density = (typeof DENSITIES)[number];

/** Essentials is the product default: the basics, and nothing a reader has to
    dismiss before they can read them. Used when the map is rendered outside the
    portal, where there is no chosen mode to read. */
export const DEFAULT_DENSITY: Density = "simple";

/* How the four rank, so a section can name the least density it belongs to
   rather than listing the ones it appears in. */
const DENSITY_RANK: Record<Density, number> = {
  ultra: 0,
  simple: 1,
  detailed: 2,
  pro: 3,
};

/** Whether `current` is detailed enough to show something that starts at `from`. */
export function showsAt(current: Density, from: Density): boolean {
  return DENSITY_RANK[current] >= DENSITY_RANK[from];
}
