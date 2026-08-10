/**
 * Shapes returned by the NewsFramework glossary endpoints.
 *
 * Ported from the production repo's `types/types.ts` (`GlossaryData`,
 * `GlossaryDetails`, `GlossaryDetailItem`), corrected against the live response:
 *
 *  · `Alphabet` and `Term` are declared there but the endpoint never sends them.
 *    `sortby` carries the A–Z letter instead (verified: it equals the first
 *    letter of `term_name` for all 46 terms).
 *  · The details response contains `details` only — no `realetedArray` and no
 *    `TableOfContents`, despite `GlossaryDetails` declaring both. Related terms
 *    come from `related_terms` on the record itself, as term *names*.
 *  · `content` is returned by the LIST endpoint too, not just the detail one.
 */

/** One glossary term. */
export interface GlossaryTerm {
  _id: string;
  Category: string;
  Created_by: string;
  Created_date: string;
  /** Display name, e.g. "API Gravity". */
  term_name: string;
  /** URL slug, e.g. "api-gravity" — the detail endpoint's key. */
  term_slug: string;
  /** A short HTML definition (a single wrapped `<p>`). */
  short_definition: string;
  /** The full article HTML. Present on list responses as well as details. */
  content: string;
  /** The A–Z grouping letter. */
  sortby: string;
  header_img?: string;
  metaTitle?: string;
  metaDescription?: string;
  /** Other terms, by display name rather than slug. Usually empty. */
  related_terms?: string[];
  type: string;
  organization?: string;
  isActive: boolean;
  isPublished: boolean;
}

/**
 * The listing shape — `content` deliberately omitted. Shipping all 46 full
 * articles to the browser would be roughly 750 KB for a page that shows short
 * definitions; the full text lives on each term's own page.
 */
export type GlossaryTermSummary = Omit<GlossaryTerm, "content">;

/** The `type` discriminator on every glossary record. */
export const GLOSSARY_TYPE = "Glossary";

/** The full A–Z rail, including letters with no terms (rendered disabled). */
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
