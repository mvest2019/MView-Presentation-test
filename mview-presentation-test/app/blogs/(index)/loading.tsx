import { ListingSkeleton } from "../_components/listing-skeleton";

/** Shown while `/blogs` fetches its page of articles. The route is dynamic, so
 *  this is the first paint on a cold navigation. */
export default function Loading() {
  return <ListingSkeleton />;
}
