import type { Metadata } from "next";
import type { ReactNode } from "react";

import type { TocItem } from "@/lib/toc";

import { Breadcrumb } from "./breadcrumb";
import { pageShellClass } from "./page-shell";
import { TableOfContents } from "../blogs/_components/table-of-contents";
import { headingBase } from "./typography";

/**
 * Shared shell for the legal pages — Privacy Policy and Terms & Conditions.
 *
 * The COPY on those pages is ported verbatim from the live site
 * (`app/privacy-policy` and `app/terms-condition` in the Next repo). It is legal
 * text: it may be restyled, never reworded, reordered or summarised. Only two
 * edits were made, both deliberate and noted at the call sites — the support
 * address, and Mineral View's own URL now pointing at internal routes.
 *
 * The layout is this build's, not the live site's: same 1200px wrap, breadcrumb,
 * contents rail and card treatment as an article, so a legal page reads as part
 * of the site rather than as a bolted-on document. The live pages use a teal and
 * grey palette from an earlier design; none of it is carried over.
 */

export function legalMetadata(title: string, description: string): Metadata {
  return {
    /*
     * A DASH, NOT A PIPE (Ryan, 2026-08-19: "Privacy Policy - Mineral View" needed
     * instead of "Privacy Policy | Mineral View").
     *
     * This is the live site's own tab title, so the two now match — worth having
     * because these pages share deep links with the live host and a bookmark or a
     * search result should not read differently depending on which one served it.
     *
     * SHARED, so this changes BOTH legal pages: Privacy Policy and Terms &
     * Conditions. Deliberate — a pipe on one and a dash on the other would be
     * worse than either.
     */
    title: `${title} - Mineral View`,
    description,
    // Legal pages are boilerplate that search engines should index once, on the
    // canonical host, but they are not what anyone should land on from search.
    robots: { index: true, follow: true },
  };
}

/**
 * The prose inside a legal section.
 *
 * Same approach as `ArticleBody` and `GlossaryContent`: the tags come from ported
 * markup, so they are styled with Tailwind's arbitrary descendant variants rather
 * than by putting a class on each one. That let the port strip EVERY class from
 * the source — the live site's `text-gray-700`, `text-teal-600`, `text-blue-600`
 * and the rest — in one pass, which is why none of that palette leaks in here.
 *
 * `[&_h3]` is the numbered sub-heading inside a section; `[&_h4]` is a level
 * below it. Both are frequent in the terms, which nest three levels deep.
 */
const LEGAL_BODY = [
  "text-[14.5px] leading-[1.65] text-mv-slate",
  // 14px above a numbered sub-clause, not 20px (Ryan, 2026-08-17). `mt-5` won
  // the collapse against the preceding list's `mb-3`, so every "2. …", "3. …"
  // heading sat 20px clear of the paragraph it follows — measured, and the
  // second of the two gaps flagged on the terms page.
  "[&_h3]:mb-2 [&_h3]:mt-[14px] [&_h3]:font-serif [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:leading-[1.25] [&_h3]:text-mv-ink",
  "[&_h3:first-child]:mt-0",
  "[&_h4]:mb-[6px] [&_h4]:mt-3 [&_h4]:font-serif [&_h4]:text-[14.5px] [&_h4]:font-bold [&_h4]:text-mv-ink",
  "[&_p]:mb-3",
  "[&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc",
  "[&_li]:my-[5px]",
  /*
   * `<aside>` IS A HIGHLIGHTED CALLOUT, not a paragraph (Ryan, 2026-08-17:
   * "Highlighted line and box styling are missing… it is displayed as a plain
   * line").
   *
   * The live site wraps these in a tinted card — `<Card className="border-teal-200
   * bg-teal-50">` around `text-lg font-medium text-teal-700` — and the port that
   * brought this content over stripped every class from the source, so the
   * wrapper survived as a bare <aside> and rendered as ordinary prose. Three of
   * them on the privacy policy; none on the terms.
   *
   * Tinted with the same mint/green-ink pair the article pages already use for
   * their inline notice, rather than a fourth green: this is the site's existing
   * callout, not a new one.
   */
  "[&_aside]:my-[14px] [&_aside]:rounded-[10px] [&_aside]:border [&_aside]:border-mv-green [&_aside]:bg-mv-mint [&_aside]:px-4 [&_aside]:py-[13px] [&_aside]:text-mv-green-ink",
  "[&_aside_p]:font-medium [&_aside>*:last-child]:mb-0",
  /*
   * Inline emphasis inside a sentence — the live site's
   * `<span className="font-semibold text-black">Data Download</span>`. Same
   * weight and colour as `strong` so the two cannot drift apart; scoped to spans
   * inside this prose so it cannot reach a span anywhere else.
   */
  "[&_span]:font-semibold [&_span]:text-mv-ink",
  /*
   * NO TRAILING MARGIN ON THE LAST BLOCK IN A CARD.
   *
   * Every section ended with a <p> or <ul> still carrying its 12px `mb-3`, spent
   * INSIDE the card's own 16–22px padding — so the distance from the final line
   * of text to the card's edge measured 29px where the padding says 16px. Across
   * sixteen sections that is most of the band flagged between one card and the
   * next. Whatever element ends the card is covered, not just p and ul.
   */
  "[&>*:last-child]:mb-0",
  // `strong` and `b` both appear in the source and must weigh the same.
  "[&_strong]:font-bold [&_strong]:text-mv-ink [&_b]:font-bold [&_b]:text-mv-ink",
  "[&_em]:italic",
  // Blue, as in the article body (QA #8): green is the site's accent everywhere,
  // so a green link inside green-accented prose does not read as clickable.
  "[&_a]:text-mv-blue [&_a]:no-underline [&_a]:hover:underline [&_a]:break-words",
].join(" ");

/**
 * One numbered section — the live site's `SectionCard`, restyled.
 *
 * `scroll-mt` clears the sticky 64px header plus air, so a contents link does not
 * park the heading underneath it.
 */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[88px]">
      <div className="rounded-[12px] border border-mv-line bg-mv-card p-[22px] shadow-mv max-[767px]:p-4">
        <h2
          className={`${headingBase} mb-3 text-[19px] leading-[1.25] max-[767px]:text-[17px]`}
        >
          {title}
        </h2>
        <div className={LEGAL_BODY}>{children}</div>
      </div>
    </section>
  );
}

/**
 * Page frame: breadcrumb, title, "last updated", then the sections beside a
 * sticky contents rail.
 *
 * The rail is desktop-only and the sections carry their own ids, so below 1024px
 * the page is a plain single column — the same rule the article pages follow
 * (QA #9), and these documents are long enough that a rail above the content
 * would push the reading a long way down.
 */
export function LegalPage({
  title,
  lede,
  updated,
  sections,
  children,
}: {
  title: string;
  lede: string;
  /** Effective date, as the live site states it. Not a build timestamp. */
  updated: string;
  /** Contents rows — must match the `LegalSection` ids, in order. */
  sections: TocItem[];
  children: ReactNode;
}) {
  return (
    /* The shared shell, so Privacy and Terms stop being the last two pages
       carrying the old 64px band above the footer (Ryan, 2026-08-17 — the second
       screenshot). These were deliberately left behind when Blog, News, Glossary
       and FAQ moved; the note in `page-shell.ts` said to revisit them together,
       and this is that. */
    <div className={pageShellClass}>
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <Breadcrumb trail={[{ label: title }]} />

        <h1
          className={`${headingBase} my-2 text-[clamp(26px,3vw,34px)] leading-[1.16]`}
        >
          {title}
        </h1>
        <p className="m-0 max-w-[680px] text-mv-muted">{lede}</p>
        <p className="mt-2 text-[13px] text-mv-muted">
          Last updated: <strong className="font-semibold">{updated}</strong>
        </p>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_300px] items-start gap-x-10 max-[1023px]:grid-cols-[minmax(0,1fr)]">
          {/* 10px between cards, down from 14px. With the trailing margins gone
              the cards read as separate already — the border and the shadow do
              that work, not the gap. */}
          <div className="min-w-0 space-y-[10px]">{children}</div>

          <aside className="sticky top-[88px] max-[1023px]:hidden">
            <TableOfContents items={sections} variant="article" />
          </aside>
        </div>
      </div>
    </div>
  );
}
