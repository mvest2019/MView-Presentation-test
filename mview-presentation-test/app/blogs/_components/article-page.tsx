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
import { ContentsCard } from "./contents-card";
import { TableOfContents } from "./table-of-contents";

/**
 * Article detail, shared by `/blogs/[slug]` and `/news/[slug]`.
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
  // record the CMS has not classified stays reachable under /blogs.
  if (modeFromApiType(details.type) !== mode) notFound();

  const section = SECTIONS[mode];

  const author = details.Created_by?.trim() || "Mineral View team";

  // Sanitises the body and writes an id onto every h2, so the contents list has
  // something to link to. Blog headings ship no anchors of their own.
  const { html, toc } = prepareArticle(details.blog);

  /*
   * The contents card and the sticky rail appear on ANY article with headings,
   * news included (Ryan, 2026-08-13: "same like blogs").
   *
   * This was blog-only, on the reasoning that the old site shows no "On this
   * page" card on a news story and that news pieces are too short to index. The
   * second half was simply wrong: every news story in the corpus carries 6–19
   * `<h2>` headings, so a news reader was being denied a contents list that the
   * body fully supports, and news detail looked unlike blog detail for no reason
   * a reader could see.
   *
   * The gate is now purely "does the body have headings", which is also what
   * makes this safe: an article with none falls back to a single column instead
   * of leaving an empty 300px track beside the body.
   */
  const showContents = toc.length > 0;

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

        {/* TWO rows rather than one tall column beside the rail (QA #14a). The
            rail used to start level with the chip and the headline; it should
            start where the reading does. Row one is the article header with an
            empty cell beside it, row two is the body with the rail.

            The second track EXISTS ONLY WHEN THE RAIL DOES. Declaring it
            unconditionally broke every page without a rail — news stories, and
            any blog article whose body has no `<h2>`: with the spacer and the
            aside both skipped, the body was the grid's second child and so
            landed in row one's second cell, squeezed into the 300px track with
            the whole left column left empty beside it. */}
        <div
          className={`mt-3 grid items-start gap-x-10 ${
            showContents
              ? "grid-cols-[minmax(0,1fr)_300px] max-[1023px]:grid-cols-[minmax(0,1fr)]"
              : "grid-cols-[minmax(0,1fr)]"
          }`}
        >
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
          </div>

          {/* Spacer holding row one's second cell so the rail lands in row two. */}
          {showContents && (
            <div aria-hidden="true" className="max-[1023px]:hidden" />
          )}

          <div className="min-w-0">
            {showContents && <ContentsCard items={toc} />}

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

            {/* Share sits with the article, not after the related grid (QA #6).
                Below six cards nobody found it. */}
            <ArticleShare title={details.blog_title} />
          </div>

          {/* Desktop only (QA #9): hidden on phones AND iPad, where it used to be
              lifted above the article and pushed the reading down the page. The
              in-body card covers those widths. */}
          {showContents && (
            <aside className="sticky top-[88px] max-[1023px]:hidden">
              <TableOfContents items={toc} variant="article" />
            </aside>
          )}
        </div>

        {/* OUTSIDE the grid (QA #7). Inside it, the sticky rail kept pace with
            the related-articles grid and hung alongside it long after the
            article had ended. The grid now closes with the article. */}
        {related.length > 0 && (
          <>
            <h3 className={`${h3Class} mb-[10px] mt-[26px]`}>
              Related Articles
            </h3>
            {/* One horizontal row that scrolls (QA #10), not a grid that wrapped
                onto a second and third line. `snap` so a swipe lands on a card;
                the fixed basis is needed because a flex child's default
                `min-width:auto` would let the cards squash to fit instead. */}
            <div className="mv-thin-scroll -mx-1 flex snap-x snap-mandatory gap-[18px] overflow-x-auto px-1 pb-2">
              {related.map((item) => (
                <div
                  key={item._id}
                  className="w-[280px] flex-none snap-start max-[767px]:w-[240px]"
                >
                  <BlogCard article={item} compact />
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-xs text-mv-muted">
          Informational only — not legal, tax, or investment advice.
        </p>
      </div>
    </div>
  );
}
