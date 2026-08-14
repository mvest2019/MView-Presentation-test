import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getGlossaryTerm,
  getGlossaryTerms,
  resolveRelatedTerms,
} from "@/lib/glossary-api";

import { h3Class, headingBase, inlineLink } from "../../_components/typography";
import { ShareDialog } from "../../blogs/_components/share-dialog";
import { TableOfContents } from "../../blogs/_components/table-of-contents";
import { prepareArticle } from "@/lib/toc";

import { GlossaryContent } from "../_components/glossary-content";

/**
 * A single glossary term.
 *
 * The prototype expands the full article inline as an accordion, because it is a
 * single-file mockup with all 46 bodies embedded. Here each term gets its own
 * route instead: the bodies total roughly 750 KB, which is not something to ship
 * on a page showing short definitions, and a term needs a real URL to be
 * linkable, crawlable and shareable. The production repo does the same
 * (`app/glossary/[slug]`). The `.gl-full` styling from the design is preserved
 * verbatim in `GlossaryContent`.
 */

export async function generateMetadata({
  params,
}: PageProps<"/glossary/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const term = await getGlossaryTerm(slug);

  if (!term) return { title: "Term not found | Mineral View" };

  const title = term.metaTitle?.trim() || `${term.term_name} — Glossary`;
  return {
    title,
    description: term.metaDescription ?? undefined,
    openGraph: {
      title,
      description: term.metaDescription ?? undefined,
      images: term.header_img ? [term.header_img] : undefined,
      siteName: "Mineral View",
      type: "article",
      locale: "en_US",
    },
  };
}

/** 46 terms, all static — worth prerendering rather than building on demand. */
export async function generateStaticParams() {
  const terms = await getGlossaryTerms();
  return terms.map((term) => ({ slug: term.term_slug }));
}

export default async function GlossaryTermPage({
  params,
}: PageProps<"/glossary/[slug]">) {
  const { slug } = await params;

  const term = await getGlossaryTerm(slug);
  if (!term) notFound();

  const related = await resolveRelatedTerms(term.related_terms);

  // Glossary bodies already wrap each part in `<section id>`, but their
  // `TableOfContents` field is always null, so the contents are derived from the
  // headings the same way the articles' are.
  const { html, toc } = prepareArticle(term.content);

  return (
    <div className="py-16 pt-[26px] max-[767px]:py-11">
      {/* Two columns with the contents rail, matching the article pages — see
          the note in `article-page.tsx` for why this is 1200 and not 1300. */}
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <Link href="/glossary" className={`${inlineLink} text-[13px]`}>
          ← Glossary
        </Link>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_300px] items-start gap-10 max-[1023px]:grid-cols-[minmax(0,1fr)]">
          <div className="min-w-0">
            {/* Headline first, then the meta row — the same order as the blog
                and news pages, so the three detail templates read alike. */}
            <h1
              className={`${headingBase} mb-[10px] mt-[14px] text-[34px] leading-[1.18] max-[767px]:text-[26px]`}
            >
              {term.term_name}
            </h1>

            {/* `section="Term"` rather than "Glossary": the control reads
                "Share Term" and the dialog "Share this Term", which is what a
                single entry is. "Share Glossary" would name the whole index.

                A term has no byline — the CMS exposes no author or date on the
                glossary endpoints — so this row is the category chip and the
                share trigger only, and the divider is dropped when there is no
                chip to divide it from. */}
            {/* `mb-[18px]` because nothing else supplies it here. On the blog
                and news pages the hero image follows this row and carries its
                own `my-[6px] mb-[14px]`; a term has no hero, so without a margin
                the content card butted straight up against the chip. */}
            <div className="mb-[18px] flex flex-wrap items-center gap-2">
              {term.Category && (
                <>
                  <span className="inline-flex items-center rounded-full bg-[#d4dceb] px-[10px] py-[3px] text-[11.5px] font-bold leading-[1.3] text-[#1a2434]">
                    {term.Category}
                  </span>
                  <span aria-hidden="true" className="text-xs text-mv-line">
                    |
                  </span>
                </>
              )}
              <ShareDialog title={term.term_name} section="Term" />
            </div>

            {/*
             * NO HERO HERE — deliberately, unlike the blog and news pages.
             *
             * Glossary bodies author their own hero: the CMS content carries an
             * `<img class="glossary-image glossary-image--hero">` right after the
             * meta row, and `header_img` is the same file exposed as a field.
             * Rendering both showed the identical picture twice on every term
             * that has one.
             *
             * Measured over the whole corpus before removing it: `header_img`
             * duplicates a body image on 36 of 47 terms and is a UNIQUE image on
             * ZERO of them, so nothing loses its only picture here. The body copy
             * is also the better of the two — it carries a full descriptive
             * `alt` where this passed only the term name, and it sits where the
             * CMS put it.
             *
             * `header_img` is still used for the OpenGraph image above: a social
             * card wants one, and it cannot duplicate anything there.
             */}

            <div className="rounded-[12px] border border-mv-line bg-mv-card p-[22px] shadow-mv">
              <GlossaryContent preparedHtml={html} />

              {/* The live site's "trust box" (`GlossaryDetailsPage.tsx`), which
                  closes every term page directly after the content and which this
                  build was missing entirely. Copy is the live site's, verbatim —
                  it is an editorial statement about who writes these pages, not
                  something to reword here.

                  Inside the content card and separated by a rule, as it is there:
                  it reads as the end of the article, not as a site-wide footer. */}
              <p className="mt-[18px] border-t border-mv-line pt-[14px] text-[13.5px] text-mv-slate">
                <strong className="text-mv-ink">
                  Written and reviewed by Mineral View.
                </strong>{" "}
                This glossary page is designed to help mineral owners understand
                oil and gas lease, royalty, operator, and ownership terms in
                plain language.
              </p>
            </div>

            {related.length > 0 && (
              <>
                <h3 className={`${h3Class} mb-[10px] mt-[22px]`}>
                  Related terms
                </h3>
                <div className="flex flex-wrap gap-2">
                  {related.map((item) => (
                    <Link
                      key={item.term_slug}
                      href={`/glossary/${item.term_slug}`}
                      className="rounded-full border border-mv-line bg-white px-[15px] py-[7px] text-[13px] font-semibold text-mv-slate no-underline hover:border-mv-green-deep hover:text-mv-green-deep hover:no-underline"
                    >
                      {item.term_name}
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="mt-[18px] flex items-start gap-[10px] rounded-[10px] bg-mv-mint px-4 py-[13px] text-[13.5px] text-mv-green-ink">
              <span>◆</span>
              <div>
                <strong>See what you own, on a real map.</strong> Claim the
                owner record for free and every lease tied to it appears
                automatically — production, activity, and a plain-English weekly
                briefing.{" "}
                <Link href="/claim" className={inlineLink}>
                  Claim your owner record →
                </Link>
              </div>
            </div>

            <p className="mt-4 text-xs text-mv-muted">
              Informational only — not legal, tax, or investment advice.
            </p>
          </div>

          <aside className="sticky top-[88px] max-[1023px]:static max-[1023px]:order-first">
            <TableOfContents items={toc} variant="glossary" />
          </aside>
        </div>
      </div>
    </div>
  );
}
