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
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;|&#38;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;|&#60;/gi, "<")
    .replace(/&gt;|&#62;/gi, ">")
    .replace(/&#10;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
