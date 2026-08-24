import { ArticleSkeleton } from "../../blogs/_components/article-skeleton";

/** No hero block: seven of the 46 terms have no header image, and a
 *  placeholder for something that never arrives is worse than none.
 *
 *  `rail="always"` because the glossary rail — unlike the articles' — stays on
 *  tablet and phone, moving above the term. */
export default function Loading() {
  return <ArticleSkeleton hero={false} rail="always" />;
}
