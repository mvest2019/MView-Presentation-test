/**
 * The comparison slot colours, shared by every operator comparison tool.
 *
 * WHY ITS OWN MODULE. Both compare pages use the same four colours, and both had
 * to avoid importing them from the other: each compare module pulls in its own
 * fixture, so a cross-import would drag a page's data into a page that does not
 * need it. This file has no dependencies, so importing it costs nothing.
 *
 * `var()` references rather than literals, because `globals.css` is the only place
 * a colour may be defined. Slots one to three are the existing `mv-green-deep`,
 * `mv-amber` and `mv-blue`; the fourth is `mv-plum`.
 *
 * Slot order is fixed and meaningful: the colour identifies the *slot*, not the
 * operator, which is what lets a picker's dot, a card's spine and a chart's line
 * be matched without reading a legend.
 */

export const SLOT_COLORS = [
  "var(--color-mv-green-deep)",
  "var(--color-mv-amber)",
  "var(--color-mv-blue)",
  "var(--color-mv-plum)",
] as const;

/** Four slots: on both compare tools the first two are required. */
export const COMPARE_SLOT_COUNT = 4;

/** The slot labels the statistics picker shows — "Operator A" … "Operator D". */
export const SLOT_LABELS = ["A", "B", "C", "D"] as const;
