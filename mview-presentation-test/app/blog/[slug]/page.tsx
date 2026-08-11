import type { Metadata } from "next";

import {
  ArticlePage,
  buildArticleMetadata,
} from "../_components/article-page";

/** A Blog article. News articles live at `/news/[slug]`. */

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return buildArticleMetadata(slug);
}

export default async function BlogArticleRoute({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  return <ArticlePage slug={slug} section="blog" />;
}
