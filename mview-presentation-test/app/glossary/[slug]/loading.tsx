import { ArticleSkeleton } from "../../blog/_components/article-skeleton";

/** No hero block: seven of the 46 terms have no header image, and a
 *  placeholder for something that never arrives is worse than none. */
export default function Loading() {
  return <ArticleSkeleton hero={false} />;
}
