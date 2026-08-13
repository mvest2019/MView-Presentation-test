import { ArticleSkeleton } from "../../blogs/_components/article-skeleton";

/** Same skeleton as a blog article, rail included: news stories carry headings
 *  too, so they get the same contents card and sticky rail. */
export default function Loading() {
  return <ArticleSkeleton rail="desktop" />;
}
