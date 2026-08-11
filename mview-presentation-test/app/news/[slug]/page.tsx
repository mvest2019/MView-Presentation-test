import type { Metadata } from "next";

import {
  ArticlePage,
  buildArticleMetadata,
} from "../../blog/_components/article-page";

/** A News story. Blog articles live at `/blog/[slug]`. */

export async function generateMetadata({
  params,
}: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return buildArticleMetadata(slug);
}

export default async function NewsArticleRoute({
  params,
}: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  return <ArticlePage slug={slug} section="news" />;
}
