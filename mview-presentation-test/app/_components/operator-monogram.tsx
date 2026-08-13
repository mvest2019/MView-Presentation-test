/**
 * An operator's logo tile: two initials on the brand gradient.
 *
 * WHY NOT THE REAL LOGOS. Both compare prototypes inline 411 KB of base64 PNG
 * logos — 83% of each file — and fall back to exactly this monogram whenever one
 * is missing. Only the fallback is shipped: ~300 KB of data URI in the document,
 * for tiles between 22 and 42 pixels, is incompatible with a mobile performance
 * budget. When the logos matter they belong on a CDN behind `next/image`, where
 * they can be sized, lazy-loaded and cached, rather than in the HTML.
 *
 * Shared rather than page-local because three operator surfaces now draw it.
 * It takes the initials as a string, not an operator object, so it does not
 * depend on either compare tool's view model.
 *
 * `aria-hidden` throughout: the initials are decoration beside a name that is
 * always present as real text, and "PN" read aloud helps nobody.
 */

export function OperatorMonogram({
  monogram,
  size,
  className = "",
}: {
  /** Two initials, already upper-cased. */
  monogram: string;
  /** Edge length in pixels. */
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[linear-gradient(150deg,var(--color-mv-green),var(--color-mv-forest))] font-bold leading-none text-white ${className}`}
      style={{
        width: size,
        height: size,
        // The design's 0.36 ratio, floored at the 12px minimum both compare pages
        // hold to. At the small tile sizes the ratio alone lands on 8px, which is
        // unreadable and is what the legible-font-size audit counts against a page.
        // Two initials at 12px still clear a 22px tile.
        fontSize: Math.max(12, Math.round(size * 0.36)),
      }}
    >
      {monogram}
    </span>
  );
}
