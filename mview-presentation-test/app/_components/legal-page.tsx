import type { Metadata } from "next";
import type { ReactNode } from "react";

import type { TocItem } from "@/lib/toc";

import { Breadcrumb } from "./breadcrumb";
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
    title: `${title} | Mineral View`,
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
  "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-serif [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:leading-[1.25] [&_h3]:text-mv-ink",
  "[&_h3:first-child]:mt-0",
  "[&_h4]:mb-[6px] [&_h4]:mt-4 [&_h4]:font-serif [&_h4]:text-[14.5px] [&_h4]:font-bold [&_h4]:text-mv-ink",
  "[&_p]:mb-3",
  "[&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc",
  "[&_li]:my-[5px]",
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
    <div className="py-16 pt-[26px] max-[767px]:pb-11">
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
          <div className="min-w-0 space-y-[14px]">{children}</div>

          <aside className="sticky top-[88px] max-[1023px]:hidden">
            <TableOfContents items={sections} variant="article" />
          </aside>
        </div>
      </div>
    </div>
  );
}
