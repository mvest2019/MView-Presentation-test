/**
 * The shared look of a filter control.
 *
 * These were local constants in `app/operators/operator-page.tsx`, where the operator
 * listing's Play / Status / Counties selects use them. The production chart's county
 * filter has to look like those, so they moved here rather than being copied: two
 * literals describing "the same control" in two files drift on the first tweak, and the
 * whole point is that the two controls match.
 *
 * `CONTROL_TINT` is the mint edge and lift — the design's `--mint-line`.
 *
 * `SELECT_CLASS` is deliberately colour-free apart from tokens, and carries no
 * background image: the caret is a real `ChevronDown` positioned over the control, which
 * renders the same as `appearance-none` plus a data URI and keeps a 200-character URI
 * out of the class string. It suits a `<button>` as well as a `<select>` — the chart's
 * filter is a listbox trigger, and the point is that you cannot tell them apart.
 */

export const CONTROL_TINT =
  "border-mv-mint-line shadow-[0_1px_2px_rgba(13,14,23,.04)]";

export const SELECT_CLASS =
  "w-full cursor-pointer appearance-none rounded-[10px] border bg-white py-2 pl-[14px] pr-9 text-sm font-medium text-mv-ink outline-none transition-colors hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]";

/** The caret, placed identically on every control that uses `SELECT_CLASS`. */
export const CONTROL_CARET =
  /*
   * DEFECT 124 / 158 — the caret was `h-[7px] w-[11px]`: too small to read as a
   * control, and non-square, so the chevron was drawn squashed. `h-4 w-4` is the
   * icon's own aspect and matches the search icon beside it at 18px. The right
   * offset drops to 12px so the larger glyph keeps the same optical inset.
   */
  "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mv-muted";
