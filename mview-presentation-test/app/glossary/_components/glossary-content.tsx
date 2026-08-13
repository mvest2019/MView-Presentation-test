"use client";

import { useEffect, useRef } from "react";

/**
 * The full glossary article — CMS HTML from the Glossary endpoints.
 *
 * Takes ALREADY-PREPARED html: `prepareArticle` in `lib/toc.ts` sanitizes it and
 * writes the heading anchors the contents list links to. Do not pass a raw
 * `details.content` here — it would reach the DOM unsanitized.
 *
 * Styled with Tailwind arbitrary descendant variants, mirroring the prototype's
 * `.gl-full` rule set. That covers the plain prose tags plus the CMS's own
 * wrapper classes (`glossary-callout`, `glossary-warning`, `glossary-formula`,
 * `glossary-lifecycle-step`, …), which the editorial HTML uses heavily.
 *
 * The content also ships an FAQ accordion: `div.faq-item > button.faq-question`
 * with a `div.faq-answer` that is hidden until `.faq-item` gains `.open`. The
 * prototype toggles that with a delegated click handler, so this component does
 * the same — without it the buttons are dead and every answer stays hidden,
 * silently swallowing a section of each article.
 */

const GLOSSARY_BODY = [
  /*
   * `scroll-mt` on SECTIONS as well as headings.
   *
   * The CMS puts the SAME id on both the wrapper and its heading —
   * `<section id="how-bopd-works"><h2 id="how-bopd-works">` — 7 duplicated ids
   * on a term like BOPD. `getElementById` and the browser's own fragment lookup
   * both take the FIRST match in document order, which is the section, and the
   * section had no scroll margin: jumping to a contents row put the section's top
   * edge at the viewport top, tucking the heading up under the sticky 64px
   * header. Giving both the same margin means the landing is right whichever one
   * wins, without rewriting ids the CMS may link to elsewhere.
   */
  "[&_section]:scroll-mt-[88px]",
  // Prose
  "[&_h2]:mt-[18px] [&_h2]:mb-2 [&_h2]:scroll-mt-[88px] [&_h2]:font-serif [&_h2]:font-semibold [&_h2]:leading-[1.18] [&_h2]:tracking-[-.01em] [&_h2]:text-[20px] [&_h2]:text-mv-ink",
  "[&_h3]:mt-[14px] [&_h3]:mb-[6px] [&_h3]:font-serif [&_h3]:font-semibold [&_h3]:leading-[1.18] [&_h3]:tracking-[-.01em] [&_h3]:text-[15.5px] [&_h3]:text-mv-ink",
  // The design caps paragraphs at 72ch, which was a mild limit inside its 760px
  // column. This build's article column is 1200px, where that cap left ~490px
  // of empty space to the right of every paragraph. Dropped so the text fills
  // the card, matching the blog and news article body.
  "[&_p]:mb-[10px] [&_p]:text-[14px] [&_p]:text-mv-slate",
  "[&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:text-[14px] [&_ul]:text-mv-slate",
  "[&_ol]:mb-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:text-[14px] [&_ol]:text-mv-slate",
  "[&_li]:my-1",
  // Blue, same reason as the article body (QA #8).
  "[&_a]:text-mv-blue [&_a]:no-underline [&_a]:hover:underline",
  // Figures and images
  "[&_img]:my-2 [&_img]:block [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-[10px] [&_img]:border [&_img]:border-mv-line",
  "[&_figure]:my-3",
  "[&_figcaption]:mt-[2px] [&_figcaption]:text-xs [&_figcaption]:text-mv-muted",
  // Tables. `w-full` alone is not enough: under the default `table-layout:auto`
  // a table's min-content width beats `width:100%`, so cells with long copy push
  // it wider than its container. On the JOA term that put a 436px table inside a
  // 299px box and forced the whole page to scroll sideways on a phone. Below
  // 1024px the layout is fixed so columns must fit and cells wrap instead —
  // the same trade the design makes for its one wide table at mobile. Desktop
  // keeps auto layout, where content-sized columns read better and fit anyway.
  "[&_table]:my-[10px] [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]",
  "max-[1023px]:[&_table]:table-fixed",
  "[&_th]:border [&_th]:border-mv-line [&_th]:px-[9px] [&_th]:py-[7px] [&_th]:text-left [&_th]:align-top [&_th]:break-words [&_th]:bg-[#f6f9f7]",
  "[&_td]:border [&_td]:border-mv-line [&_td]:px-[9px] [&_td]:py-[7px] [&_td]:text-left [&_td]:align-top [&_td]:break-words",
  // CMS wrapper blocks
  "[&_.glossary-callout]:my-[10px] [&_.glossary-callout]:rounded-[10px] [&_.glossary-callout]:border [&_.glossary-callout]:border-[#cdeede] [&_.glossary-callout]:bg-mv-mint [&_.glossary-callout]:px-3 [&_.glossary-callout]:py-[10px]",
  "[&_.glossary-note]:my-[10px] [&_.glossary-note]:rounded-[10px] [&_.glossary-note]:border [&_.glossary-note]:border-[#cdeede] [&_.glossary-note]:bg-mv-mint [&_.glossary-note]:px-3 [&_.glossary-note]:py-[10px]",
  "[&_.glossary-example]:my-[10px] [&_.glossary-example]:rounded-[10px] [&_.glossary-example]:border [&_.glossary-example]:border-[#cdeede] [&_.glossary-example]:bg-mv-mint [&_.glossary-example]:px-3 [&_.glossary-example]:py-[10px]",
  "[&_.glossary-warning]:my-[10px] [&_.glossary-warning]:rounded-[10px] [&_.glossary-warning]:border [&_.glossary-warning]:border-[#ecd9b8] [&_.glossary-warning]:bg-[#fdf6ec] [&_.glossary-warning]:px-3 [&_.glossary-warning]:py-[10px]",
  "[&_.glossary-formula]:my-[10px] [&_.glossary-formula]:rounded-[10px] [&_.glossary-formula]:border [&_.glossary-formula]:border-mv-line [&_.glossary-formula]:bg-[#f4f6f5] [&_.glossary-formula]:px-3 [&_.glossary-formula]:py-[10px] [&_.glossary-formula]:text-[13.5px]",
  "[&_.glossary-meta]:my-2 [&_.glossary-meta]:text-xs [&_.glossary-meta]:text-mv-muted",
  "[&_.glossary-related]:my-[10px] [&_.glossary-related]:rounded-[10px] [&_.glossary-related]:border [&_.glossary-related]:border-mv-line [&_.glossary-related]:bg-[#f6f9f7] [&_.glossary-related]:px-3 [&_.glossary-related]:py-[10px]",
  "[&_.glossary-related-reading]:my-[10px] [&_.glossary-related-reading]:rounded-[10px] [&_.glossary-related-reading]:border [&_.glossary-related-reading]:border-mv-line [&_.glossary-related-reading]:bg-[#f6f9f7] [&_.glossary-related-reading]:px-3 [&_.glossary-related-reading]:py-[10px]",
  "[&_.glossary-lifecycle-step]:my-2 [&_.glossary-lifecycle-step]:rounded-[10px] [&_.glossary-lifecycle-step]:border [&_.glossary-lifecycle-step]:border-mv-line [&_.glossary-lifecycle-step]:border-l-[3px] [&_.glossary-lifecycle-step]:border-l-mv-green [&_.glossary-lifecycle-step]:px-3 [&_.glossary-lifecycle-step]:py-[10px]",
  "[&_.glossary-lifecycle-step_h3]:mt-0 [&_.glossary-lifecycle-step_h3]:mb-1",
  // FAQ accordion
  "[&_.faq-item]:my-2 [&_.faq-item]:overflow-hidden [&_.faq-item]:rounded-[10px] [&_.faq-item]:border [&_.faq-item]:border-mv-line [&_.faq-item]:bg-white",
  "[&_.faq-question]:w-full [&_.faq-question]:cursor-pointer [&_.faq-question]:border-0 [&_.faq-question]:bg-transparent [&_.faq-question]:px-[13px] [&_.faq-question]:py-[11px] [&_.faq-question]:text-left [&_.faq-question]:font-sans [&_.faq-question]:text-[13.5px] [&_.faq-question]:font-bold [&_.faq-question]:text-mv-ink",
  "[&_.faq-question]:after:text-mv-green-deep [&_.faq-question]:after:content-['_▾']",
  "[&_.faq-answer]:hidden [&_.faq-answer]:px-[13px] [&_.faq-answer]:pb-1",
  "[&_.faq-item.open_.faq-answer]:block",
].join(" ");

export function GlossaryContent({ preparedHtml }: { preparedHtml: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    // Delegated, so it survives the content being replaced on navigation.
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLElement>(".faq-question");
      if (!button || !el?.contains(button)) return;

      const item = button.closest(".faq-item");
      if (!item) return;

      const open = item.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    }

    // The CMS markup ships no ARIA; add it so the accordion is announced.
    for (const button of el.querySelectorAll(".faq-question")) {
      button.setAttribute("aria-expanded", "false");
    }

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [preparedHtml]);

  return (
    <div
      ref={root}
      className={GLOSSARY_BODY}
      dangerouslySetInnerHTML={{ __html: preparedHtml }}
    />
  );
}
