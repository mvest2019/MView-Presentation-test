import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getBlogDetails } from "@/lib/blog-api";
import { SECTIONS, modeFromApiType, type BlogMode } from "@/lib/blog-types";
import { prepareArticle } from "@/lib/toc";
import { getVisitorId } from "@/lib/visitor-id";

import { h3Class, headingBase, inlineLink } from "../../_components/typography";
import { ArticleBody } from "./article-body";
import { ArticleHero } from "./article-hero";
import { ArticleShare } from "./article-share";
import { BlogCard, formatBlogDate } from "./blog-card";
import { BlogChip } from "./blog-chip";
import { TableOfContents } from "./table-of-contents";

/**
 * Article detail, shared by `/blog/[slug]` and `/news/[slug]`.
 *
 * Body, header image, category, author, date and related articles all come from
 * `/NewsFramework/Blog_datadetails`. The body is CMS HTML and goes through
 * `sanitizeHtml` before it reaches the DOM; see that module for why.
 *
 * Each route passes the section it serves, and an article that belongs to the
 * other one 404s here rather than rendering. That keeps exactly one canonical
 * URL per article now that Blog and News are separate sections — without the
 * check, every article would resolve under both paths and the two would compete
 * as duplicates.
 */

export async function buildArticleMetadata(slug: string): Promise<Metadata> {
  const article = await getBlogDetails(slug, await getVisitorId());

  if (!article) return { title: "Article not found | Mineral View" };

  const { details } = article;
  const title = details.metaTitle?.trim() || details.blog_title;
  return {
    title,
    description: details.metaDescription ?? undefined,
    openGraph: {
      title,
      description: details.metaDescription ?? undefined,
      images: details.blog_header_img ? [details.blog_header_img] : undefined,
      siteName: "Mineral View",
      type: "article",
      locale: "en_US",
    },
  };
}

export async function ArticlePage({
  slug,
  section: mode,
}: {
  slug: string;
  section: BlogMode;
}) {
  // The visitor id is passed here rather than on the listing: this is the read
  // the upstream analytics care about, and it is what the production repo sends.
  const article = await getBlogDetails(slug, await getVisitorId());
  if (!article) notFound();

  const { details, realetedArray: related } = article;

  // `modeFromApiType` falls back to "blog" for an unknown or absent type, so a
  // record the CMS has not classified stays reachable under /blog.
  if (modeFromApiType(details.type) !== mode) notFound();

  const section = SECTIONS[mode];
  const author = details.Created_by?.trim() || "Mineral View team";

  // Sanitises the body and writes an id onto every h2, so the contents list has
  // something to link to. Blog headings ship no anchors of their own.
  const { html, toc } = prepareArticle(details.blog);

  return (
    <div className="py-16 pt-[26px] max-[767px]:py-11">
      {/* 1200px — the same container as the header, the footer and the listings.
          This briefly ran at 1300 to make room for the contents rail, which left
          the article sticking 50px past the header and footer on either side and
          gave these pages narrower side margins than the rest of the site. The
          rail is paid for out of the content column instead: prose lands near
          800px, about 95 characters, which reads better than the 112 it was.

          The back link sits outside the grid so it stays the first thing on the
          page at every width, including where the rail moves above the article. */}
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <Link href={section.path} className={`${inlineLink} text-[13px]`}>
          {section.backLabel}
        </Link>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_300px] items-start gap-10 max-[1023px]:grid-cols-[minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="mt-[14px] flex flex-wrap items-center gap-2">
              <BlogChip category={details.Category} size="md" />
              <span className="self-center text-xs text-mv-muted">
                {formatBlogDate(details.Created_date)} · {author}
              </span>
            </div>

            <h1
              className={`${headingBase} mb-[10px] mt-3 text-[34px] leading-[1.18] max-[767px]:text-[26px]`}
            >
              {details.blog_title}
            </h1>

            <ArticleHero
              src={details.blog_header_img}
              alt={details.blog_title}
            />

            <ArticleBody preparedHtml={html} />

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

            {related.length > 0 && (
              <>
                <h3 className={`${h3Class} mb-[10px] mt-[22px]`}>
                  Related Articles
                </h3>
                {/* Same tablet step as the listing grid. */}
                <div className="grid grid-cols-3 gap-[18px] max-[1023px]:grid-cols-2 max-[767px]:grid-cols-1">
                  {related.map((item) => (
                    <BlogCard key={item._id} article={item} compact />
                  ))}
                </div>
              </>
            )}

            <ArticleShare title={details.blog_title} />

            <p className="mt-4 text-xs text-mv-muted">
              Informational only — not legal, tax, or investment advice.
            </p>
          </div>

          {/* Sticky beside the article on wide screens. Below 1024 the grid is a
              single column, so `order-first` lifts the card above the article
              rather than stranding it under the related-articles grid, where
              nobody would reach it. */}
          <aside className="sticky top-[88px] max-[1023px]:static max-[1023px]:order-first">
            <TableOfContents items={toc} variant="article" />
          </aside>
        </div>
      </div>
    </div>
  );
}
