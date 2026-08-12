import { GlossaryIndexSkeleton } from "../_components/index-skeleton";

/** The index is statically generated, so this shows on client navigation into
 *  the route rather than on first load. */
export default function Loading() {
  return <GlossaryIndexSkeleton />;
}
