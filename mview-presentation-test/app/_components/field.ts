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

/** The rounded search input on the library listing pages. */
export const searchFieldClass =
  "min-w-[220px] flex-1 rounded-full border border-mv-line bg-white px-[14px] py-2 text-[13px] text-mv-ink outline-none placeholder:text-mv-placeholder focus-visible:border-mv-green-deep";

/** The row a search field sits in, so the spacing above it matches too. */
export const searchRowClass = "mt-3 flex flex-wrap items-center gap-[10px]";
