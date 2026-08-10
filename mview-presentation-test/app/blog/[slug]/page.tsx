import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getBlogDetails } from "@/lib/blog-api";
import { getVisitorId } from "@/lib/visitor-id";

import {
  h3Class,
  headingBase,
  inlineLink,
} from "../../_components/typography";
import { ArticleBody } from "../_components/article-body";
import { ArticleHero } from "../_components/article-hero";
import { ArticleShare } from "../_components/article-share";
import { BlogCard, formatBlogDate } from "../_components/blog-card";
import { BlogChip } from "../_components/blog-chip";

/**
 * Article detail — the prototype's `route:blog-article`.
 *
 * Body, header image, category, author, date and related articles all come from
 * `/NewsFramework/Blog_datadetails`. The body is CMS HTML and goes through
 * `sanitizeHtml` before it reaches the DOM; see that module for why.
 */

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getBlogDetails(slug, await getVisitorId());

  if (!article) {
    return { title: "Article not found | Mineral View" };
  }

  const { details } = article;
  return {
    title: details.metaTitle?.trim() || details.blog_title,
    description: details.metaDescription ?? undefined,
    openGraph: {
      title: details.metaTitle?.trim() || details.blog_title,
      description: details.metaDescription ?? undefined,
      images: details.blog_header_img ? [details.blog_header_img] : undefined,
      siteName: "Mineral View",
      type: "article",
      locale: "en_US",
    },
  };
}

export default async function BlogArticlePage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;

  // The visitor id is passed here rather than on the listing: this is the read
  // the upstream analytics care about, and it is what the production repo sends.
  const article = await getBlogDetails(slug, await getVisitorId());
  if (!article) notFound();

  const { details, realetedArray: related } = article;
  const author = details.Created_by?.trim() || "Mineral View team";

  return (
    <div className="py-16 pt-[26px] max-[767px]:py-11">
      <div className="mx-auto max-w-[760px] px-7 max-[767px]:px-4">
        <Link href="/blog" className={`${inlineLink} text-[13px]`}>
          ← Blog &amp; News
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
            <h3 className={`${h3Class} mb-[10px] mt-[22px]`}>Related Articles</h3>
            <div className="grid grid-cols-3 gap-[18px] max-[767px]:grid-cols-1">
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
