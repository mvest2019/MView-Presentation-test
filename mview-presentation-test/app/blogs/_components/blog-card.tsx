import Link from "next/link";

import { slugFromUrlTitle } from "@/lib/blog-api";
import { sectionPath, type BlogListItem } from "@/lib/blog-types";
import { htmlToText } from "@/lib/sanitize-html";

import { headingBase } from "../../_components/typography";
import { BlogChip } from "./blog-chip";
import { BlogThumb } from "./blog-thumb";

/**
 * Article card — the prototype's `blogCardHTML` / `a.blog-card` shape:
 * thumbnail, category chip + date, title, three-line excerpt, "Read →".
 */

export function formatBlogDate(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Estimated reading time at 200 wpm, or 0 when there is no body to measure. */
export function readingMinutes(html: string | undefined): number {
  const words = htmlToText(html).split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.round(words / 200)) : 0;
}

export function BlogCard({
  article,
  priority = false,
  compact = false,
}: {
  article: BlogListItem;
  priority?: boolean;
  /**
   * The related-articles variant from the design: chip, date and a smaller
   * title, no excerpt and no "Read →".
   *
   * The design also shows a read-time here, computed from the full article
   * body — and omits it when the body is not to hand rather than guessing. The
   * list endpoint returns only a truncated excerpt, so there is no body to
   * measure and the read-time is omitted for exactly that reason.
   */
  compact?: boolean;
}) {
  // The list endpoint's `blog` is a truncated HTML excerpt; the design shows it
  // as plain text clamped to three lines with a trailing ellipsis.
  const excerpt = htmlToText(article.blog) || article.metaDescription || "";

  return (
    // Each article lives under its own section, so a News item found in a
    // blog article's related list still links to `/oil-and-gas-news/…`.
    //
    // `h-full` so the card fills whatever box it is placed in. In the related
    // row each card sits inside a fixed-width wrapper that stretches to the
    // tallest of them; without this the card sized to its OWN content instead,
    // so a two-line title and a three-line title produced cards with ragged
    // bottoms. With it, the body's `flex-1` and the "Read →" row's `mt-auto`
    // push that link to the same baseline in every card.
    <Link
      href={`${sectionPath(article.type)}/${slugFromUrlTitle(article.urlTitle)}`}
      className="flex h-full flex-col overflow-hidden rounded-[12px] border border-mv-line bg-mv-card text-inherit no-underline shadow-mv transition-shadow hover:shadow-[0_6px_18px_rgba(13,14,23,.10)] hover:no-underline"
    >
      <BlogThumb
        src={article.blog_header_img}
        alt={article.blog_title}
        priority={priority}
      />

      <div className="flex flex-1 flex-col px-[15px] pb-[15px] pt-[13px]">
        <div className="flex flex-wrap items-center gap-[6px]">
          <BlogChip category={article.Category} />
          <span className="text-xs text-mv-muted">
            {formatBlogDate(article.Created_date)}
          </span>
        </div>

        <h3
          className={`${headingBase} mb-[6px] mt-2 leading-[1.3] ${
            compact ? "text-[15px]" : "text-[16.5px]"
          }`}
        >
          {article.blog_title}
        </h3>

        {!compact && excerpt && (
          <p className="mb-[10px] line-clamp-3 text-[13px] text-mv-muted">
            {excerpt}…
          </p>
        )}

        {!compact && (
          <span className="mt-auto text-[13px] font-semibold text-mv-green-deep">
            Read →
          </span>
        )}
      </div>
    </Link>
  );
}
