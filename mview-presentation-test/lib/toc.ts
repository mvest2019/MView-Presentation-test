import { sanitizeHtml } from "./sanitize-html";

/**
 * Turns CMS article HTML into something a table of contents can link into.
 *
 * Neither content type arrives ready for this:
 *
 *  · Blog and news bodies have no anchors at all — the headings are plain
 *    `<h2 class="Title">`, no ids, no wrapping sections. The details endpoint
 *    does return a `TableOfContents` array whose strings match the `<h2>` text
 *    exactly, but strings alone cannot be linked to, so ids have to be injected.
 *  · Glossary bodies wrap each part in `<section id="…">` and their
 *    `TableOfContents` is always null.
 *
 * So rather than trust either field, the contents are derived from the headings
 * themselves and an id is written onto any that lacks one. That way every entry
 * is guaranteed to have somewhere to scroll to — a TOC row that goes nowhere is
 * worse than no TOC.
 *
 * Sanitising happens here too, before the ids go in, so the caller gets one
 * prepared string and cannot accidentally render the raw value.
 */

export type TocItem = {
  /** The anchor's `id`, without the leading `#`. */
  id: string;
  label: string;
};

export type PreparedArticle = {
  /** Sanitised HTML with an `id` on every h2. Safe to inject. */
  html: string;
  toc: TocItem[];
};

/** Lower-case, hyphenated, ASCII-only — matches the CMS's own section ids. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;|&#38;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;|&#60;/gi, "<")
    .replace(/&gt;|&#62;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function prepareArticle(raw: string | undefined): PreparedArticle {
  const clean = sanitizeHtml(raw);
  if (!clean) return { html: "", toc: [] };

  const toc: TocItem[] = [];
  const used = new Set<string>();

  const html = clean.replace(
    /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi,
    (whole, attrs: string, inner: string) => {
      const label = stripTags(inner);
      if (!label) return whole;

      // Honour an id the CMS already set; otherwise derive one from the text.
      const existing = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
      let id = existing || slugify(label) || `section-${toc.length + 1}`;

      // Two headings with the same wording would otherwise share an anchor and
      // every duplicate would scroll to the first one.
      if (used.has(id)) {
        let n = 2;
        while (used.has(`${id}-${n}`)) n += 1;
        id = `${id}-${n}`;
      }
      used.add(id);
      toc.push({ id, label });

      return existing
        ? whole
        : `<h2${attrs} id="${id}">${inner}</h2>`;
    },
  );

  return { html, toc };
}
