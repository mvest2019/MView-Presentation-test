import type { Metadata } from "next";

import { SECTIONS } from "@/lib/blog-types";

import { ArticleListing } from "../_components/article-listing";

/** Blog listing — owner guides. News lives at `/news`. */

export const metadata: Metadata = {
  title: `${SECTIONS.blog.heading} | Mineral View`,
  description: SECTIONS.blog.lede,
};

export default async function BlogPage({ searchParams }: PageProps<"/blogs">) {
  return <ArticleListing mode="blog" searchParams={await searchParams} />;
}
