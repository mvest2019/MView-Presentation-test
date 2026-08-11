import { sanitizeHtml } from "@/lib/sanitize-html";

/**
 * The article body — CMS-authored HTML from `/NewsFramework/Blog_datadetails`,
 * sanitized on the way in (see `lib/sanitize-html.ts` for why).
 *
 * Styled with Tailwind's arbitrary descendant variants (`[&_p]:…`) rather than a
 * hand-written CSS class. We do not author the tags inside this HTML, so a plain
 * utility cannot reach them — the variant compiles to the same descendant
 * selector a stylesheet would, while keeping the values here next to the markup
 * and inside Tailwind's token system.
 *
 * Every value is the prototype's `.ba-body` rule set. Note the explicit
 * `list-disc` / `list-decimal`: Tailwind's preflight strips list markers, which
 * the prototype's stylesheet relied on the browser default for.
 */

const ARTICLE_BODY = [
  // Base
  "text-[14.5px] text-mv-slate break-words",
  // Paragraphs
  "[&_p]:mb-[10px]",
  // Headings. The serif stack, 600 weight, leading and tracking are spelled out
  // because they came from the prototype's global `h1,h2,h3` rule, which this
  // build no longer has — Tailwind's preflight resets both size and weight.
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:font-semibold [&_h2]:leading-[1.18] [&_h2]:tracking-[-.01em] [&_h2]:text-[21px] [&_h2]:text-mv-ink",
  "[&_h3]:mt-[14px] [&_h3]:mb-[6px] [&_h3]:font-serif [&_h3]:font-semibold [&_h3]:leading-[1.18] [&_h3]:tracking-[-.01em] [&_h3]:text-[16px] [&_h3]:text-mv-ink",
  // Links — 10 per article on average, and previously styled by the global
  // `a` rule. Underlined on hover only, matching the design.
  "[&_a]:text-mv-green-deep [&_a]:no-underline [&_a]:hover:underline",
  // Lists
  "[&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc",
  "[&_ol]:mb-3 [&_ol]:ml-5 [&_ol]:list-decimal",
  "[&_li]:my-1",
  // Inline images
  "[&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-[10px] [&_img]:border [&_img]:border-mv-line",
  // Tables. `table-fixed` below 1024px for the same reason as the glossary body:
  // `w-full` loses to a table's min-content width under `table-layout:auto`, so
  // a table with long cells overflows its container and scrolls the page
  // sideways on a phone. See the note in `glossary-content.tsx`.
  "[&_table]:my-[10px] [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]",
  "max-[1023px]:[&_table]:table-fixed",
  "[&_th]:border [&_th]:border-mv-line [&_th]:px-[9px] [&_th]:py-[7px] [&_th]:text-left [&_th]:break-words [&_th]:bg-[#f6f9f7]",
  "[&_td]:border [&_td]:border-mv-line [&_td]:px-[9px] [&_td]:py-[7px] [&_td]:text-left [&_td]:break-words",
].join(" ");

export function ArticleBody({ html }: { html: string | undefined }) {
  return (
    <div
      className={`rounded-[12px] border border-mv-line bg-mv-card p-[22px] shadow-mv ${ARTICLE_BODY}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
