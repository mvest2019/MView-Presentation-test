/**
 * Sanitizer for any CMS HTML rendered through `dangerouslySetInnerHTML`.
 *
 * Ported from the production repo's `utils/sanitizeHtml.ts`, which exists
 * because blog/FAQ/glossary bodies were previously injected raw — a stored-XSS
 * hole (logged there as HIGH-1). The article body from
 * `/NewsFramework/Blog_datadetails` is CMS-authored HTML and reaches the DOM
 * the same way, so it goes through this on the way in.
 *
 * Carried over verbatim, including the caveat: this is a dependency-free
 * allow-list-oriented pass, not a substitute for a vetted library. Once
 * `isomorphic-dompurify` is on the dependency list, replace the body with:
 *
 *   import DOMPurify from 'isomorphic-dompurify';
 *   export const sanitizeHtml = (dirty: string): string =>
 *     DOMPurify.sanitize(dirty ?? '', { USE_PROFILES: { html: true } });
 */

/** Tags whose entire contents must go, not just the tags themselves. */
const DANGEROUS_BLOCK_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "noscript",
  "template",
  "svg",
  "math",
];

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return "";

  let clean = dirty;

  // 1) Remove dangerous tags and everything they contain.
  for (const tag of DANGEROUS_BLOCK_TAGS) {
    clean = clean.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"),
      "",
    );
    // Also drop orphaned or self-closing opening tags.
    clean = clean.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  // 2) Strip inline event handlers (onclick=, onerror=, onload=, ...), quoted
  //    and unquoted alike.
  clean = clean.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  clean = clean.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  clean = clean.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  // 3) Neutralize javascript:/vbscript:/data: URIs in href/src/etc.
  clean = clean.replace(
    /((?:href|src|xlink:href|formaction|action)\s*=\s*)(["']?)\s*(?:javascript|vbscript|data):[^"'>\s]*/gi,
    "$1$2#",
  );

  return clean;
}

/** Plain text from CMS HTML — used for excerpts and read-time estimates. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Decodes the HTML entities the CMS emits, so an excerpt rendered as TEXT does
 * not show the source.
 *
 * The named list alone was not enough: the corpus is full of NUMERIC entities —
 * &#8217; (curly apostrophe) 15 times across the news records, plus &#8212;,
 * &#8220;/&#8221; and &#8211; — and those were reaching the page verbatim, so a
 * headline read "owner&#8217;s" instead of "owner's". The numeric branch below
 * handles both decimal and hex forms, which covers any punctuation the editors
 * paste in without needing a name for each one.
 */
export function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => codePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => codePoint(parseInt(hex, 16)));
}

/** Line breaks become spaces; anything unmappable is dropped rather than shown. */
function codePoint(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
  if (code === 10 || code === 13 || code === 160) return " ";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

