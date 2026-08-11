import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getGlossaryTerm,
  getGlossaryTerms,
  resolveRelatedTerms,
} from "@/lib/glossary-api";

import {
  h3Class,
  headingBase,
  inlineLink,
} from "../../_components/typography";
import { ArticleHero } from "../../blog/_components/article-hero";
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

  return (
    <div className="py-16 pt-[26px] max-[767px]:py-11">
      {/* 960px — matches the article pages; see the note in `article-page.tsx`
          for why this sits between the design's 760 and the listings' 1200. */}
      <div className="mx-auto max-w-[960px] px-7 max-[767px]:px-4">
        <Link href="/glossary" className={`${inlineLink} text-[13px]`}>
          ← Glossary
        </Link>

        <div className="mt-[14px] flex flex-wrap items-center gap-2">
          {term.Category && (
            <span className="inline-flex items-center rounded-full bg-[#d4dceb] px-[10px] py-[3px] text-[11.5px] font-bold leading-[1.3] text-[#1a2434]">
              {term.Category}
            </span>
          )}
        </div>

        <h1
          className={`${headingBase} mb-[10px] mt-3 text-[34px] leading-[1.18] max-[767px]:text-[26px]`}
        >
          {term.term_name}
        </h1>

        {term.header_img && (
          <ArticleHero src={term.header_img} alt={term.term_name} />
        )}

        <div className="rounded-[12px] border border-mv-line bg-mv-card p-[22px] shadow-mv">
          <GlossaryContent html={term.content} />
        </div>

        {related.length > 0 && (
          <>
            <h3 className={`${h3Class} mb-[10px] mt-[22px]`}>Related terms</h3>
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
            <strong>See what you own, on a real map.</strong> Claim the owner
            record for free and every lease tied to it appears automatically —
            production, activity, and a plain-English weekly briefing.{" "}
            <Link href="/claim" className={inlineLink}>
              Claim your owner record →
            </Link>
          </div>
        </div>

        <p className="mt-4 text-xs text-mv-muted">
          Informational only — not legal, tax, or investment advice.
        </p>
      </div>
    </div>
  );
}
