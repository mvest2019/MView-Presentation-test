"use client";

import { useLinkStatus } from "next/link";

/**
 * A progress bar across the bottom of the `<Link>` that contains it — DEFECT 198.
 *
 * "page not shown any loading and take too much time to redirect to the operator, no
 * understand its click it or not."
 *
 * `loading.tsx` on the profile route answers the first half — something happens the
 * instant a link is pressed. It cannot answer the second: the fallback replaces the
 * whole page, so it says a navigation is under way but not WHICH of the four related
 * operators was pressed. On a phone, where the tap highlight is gone by the time the
 * reader looks up, that is the part they actually asked for.
 *
 * `useLinkStatus` reports the pending state of the nearest ancestor `Link`, so this
 * marks the card that was pressed and nothing else. It must be rendered INSIDE that
 * Link — Next's own constraint, not a style choice.
 *
 * PURELY DECORATIVE. The navigation is already announced by the route fallback's
 * `role="status"`; a second live region per card would announce four.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden rounded-b-[14px] bg-mv-line-soft"
    >
      <span className="block h-full w-1/3 animate-[mv-indeterminate_1.1s_ease-in-out_infinite] rounded-full bg-mv-green-deep" />
    </span>
  );
}
