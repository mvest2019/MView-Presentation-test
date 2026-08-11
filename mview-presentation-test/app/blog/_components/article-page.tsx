import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getBlogDetails } from "@/lib/blog-api";
import { SECTIONS, modeFromApiType, type BlogMode } from "@/lib/blog-types";
import { getVisitorId } from "@/lib/visitor-id";

import { h3Class, headingBase, inlineLink } from "../../_components/typography";
import { ArticleBody } from "./article-body";
import { ArticleHero } from "./article-hero";
import { ArticleShare } from "./article-share";
import { BlogCard, formatBlogDate } from "./blog-card";
import { BlogChip } from "./blog-chip";

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

  return (
    <div className="py-16 pt-[26px] max-[767px]:py-11">
      {/* 960px. The design caps this route at 760px to keep the line length
          readable; the full 1200px of the listings put paragraphs at ~140
          characters a line, well past the 45–90 that is comfortable. 960 sits
          between the two — wider than the design, but not the whole page. */}
      <div className="mx-auto max-w-[960px] px-7 max-[767px]:px-4">
        <Link href={section.path} className={`${inlineLink} text-[13px]`}>
          {section.backLabel}
        </Link>

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

        <ArticleHero src={details.blog_header_img} alt={details.blog_title} />

        <ArticleBody html={details.blog} />

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
    </div>
  );
}
