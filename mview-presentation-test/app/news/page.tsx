import type { Metadata } from "next";

import { SECTIONS } from "@/lib/blog-types";

import { ArticleListing } from "../blog/_components/article-listing";

/**
 * News listing — the API's `Oil & Gas News` type.
 *
 * Same page as `/blog` against a different `type`; see `ArticleListing`. The
 * prototype keeps both behind one route with an in-page view switch, which this
 * build replaces with two tabs.
 */

export const metadata: Metadata = {
  title: `${SECTIONS.news.heading} | Mineral View`,
  description: SECTIONS.news.lede,
};

export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  return <ArticleListing mode="news" searchParams={await searchParams} />;
}
