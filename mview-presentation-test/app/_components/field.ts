/**
 * Form field styling shared across the library pages.
 *
 * EXTRACTED, NOT AUTHORED — the same rule as the colour tokens and the type
 * scale. This string is the one Blog, News and Glossary already carried,
 * character for character; it is named here only so the fourth page cannot
 * quietly differ from the other three again.
 *
 * The FAQ search used to be its own construction — a capped 560px pill with a
 * magnifier, extra padding and a shadow — which made the same control look like
 * two different things depending on which library page you were on. If the icon
 * treatment is wanted back, add it to all four here rather than to one page.
 */

/**
 * The rounded search input on the library listing pages.
 *
 * 16px BELOW 768px, AND THAT IS NOT A DESIGN CHOICE. Safari on iOS zooms the
 * whole page in when a text field smaller than 16px receives focus, and does not
 * zoom back out afterwards — so tapping the search box on an iPhone or iPad left
 * the page magnified and scrolled sideways. 16px is the threshold; anything at
 * or above it is left alone.
 *
 * The other way to stop it is `maximum-scale=1` on the viewport meta, which
 * disables pinch-zoom for everyone. That trades an accessibility feature for a
 * layout nicety, so it is not used here.
 */
export const searchFieldClass =
  "min-w-[220px] flex-1 rounded-full border border-mv-line bg-white px-[14px] py-2 text-[13px] text-mv-ink outline-none placeholder:text-mv-placeholder focus-visible:border-mv-green-deep max-[767px]:text-[16px]";

/** The row a search field sits in, so the spacing above it matches too. */
export const searchRowClass = "mt-3 flex flex-wrap items-center gap-[10px]";
