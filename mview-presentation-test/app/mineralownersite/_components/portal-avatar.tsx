"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The member's picture, falling back to their initials.
 *
 * `.avatar` IS THE DESIGN'S OWN TILE and it is not restyled here — 32px, round,
 * `--green` on `--green-ink`, weight 700 at 13px, and 40px below 767px. All of
 * that already lives in `portal.css` §2 (and `dashboard-reference.css` for the
 * other shell), and the top bar's avatar has always been that tile with two
 * letters in it. This component only puts a picture INSIDE the same tile when
 * the account has one, which is why the class is passed in rather than composed
 * here: the bar's tile is a `<button>`, the menu head's and the drawer's are
 * plain spans, and all three want the identical circle.
 *
 * THE FALLBACK IS LOAD-BEARING, and `profileImage` being present cannot replace
 * it — the same reasoning `OperatorLogo` records for the operator tiles. The URL
 * comes out of a cookie written at sign-in; the file behind it can be gone, or
 * the host can refuse it with `Cross-Origin-Resource-Policy`. Whether the bytes
 * load is not knowable from the record, so something has to notice at runtime.
 *
 * AND `onError` ALONE IS NOT ENOUGH TO NOTICE — measured, not theorised. The
 * tile is server-rendered, so the browser starts (and often finishes) the
 * request from the first HTML, before React has hydrated and attached any
 * handler. A 404 that lands in that window fires its error event into nothing:
 * checked against a dead Cloudinary URL, the DOM held `complete: true,
 * naturalWidth: 0` and the tile rendered as an empty green circle with no
 * initials in it. So the effect below asks the image what happened instead of
 * waiting to be told, which is the one reliable question — `complete` with a
 * zero `naturalWidth` means "finished, and there is no picture". `onError` stays
 * for the failure that arrives after hydration.
 *
 * THE FAILURE IS REMEMBERED BY URL, not as a boolean, so a member who changes
 * their picture gets a fresh attempt rather than initials for the rest of the
 * session.
 *
 * A PLAIN `<img>`, NOT `next/image`, and deliberately — the established call in
 * this repo for exactly this shape (`OperatorLogo`, `reservoir-panel`). The URL
 * is the member's own and can point at any host the API chose; `next/image`
 * throws on a hostname that is not in `next.config.ts`'s `remotePatterns`, which
 * would turn "this member has a Google avatar" into a 500 on every portal page.
 * At 32px there is nothing for the optimiser to win either.
 *
 * `aria-hidden` ON THE TILE, ALWAYS. Every caller already names the member in
 * real text or in its own `aria-label` — the bar's button, the account menu's
 * head, the drawer's identity block — so a tile that announced itself as well
 * would read the name twice, and its bare initials are noise beside the name.
 */
export function PortalAvatar({
  image,
  initials,
  className = "avatar",
}: {
  /** `profileImage` from the session, or null. */
  image: string | null;
  /** One or two letters — the fallback, and never empty. */
  initials: string;
  /** The tile's class. `.avatar` unless a caller needs a variant beside it. */
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const img = useRef<HTMLImageElement>(null);

  /* AN EFFECT BECAUSE THE IMAGE ELEMENT IS AN EXTERNAL SYSTEM, and its load
     state is the outside answer being carried back into React — which is what
     an effect is for. It cannot be initial state: the element does not exist
     until after the first render, and its result is not knowable on the server
     at all. */
  useEffect(() => {
    const el = img.current;
    if (image && el?.complete && el.naturalWidth === 0) setFailedSrc(image);
  }, [image]);

  const show = image !== null && image !== failedSrc;

  return (
    <span className={className} aria-hidden="true">
      {show ? (
        /* eslint-disable-next-line @next/next/no-img-element -- deliberate; see
           the note above this component about `next/image` and arbitrary hosts. */
        <img
          ref={img}
          src={image}
          alt=""
          decoding="async"
          onError={() => setFailedSrc(image)}
          /* Fills the tile the caller sized, so no width is stated here and no
             picture — square or not — can shift the bar around it. The tile
             carries `border-radius: 50%` and, from this change on, `overflow:
             hidden`, so the square image is clipped to the circle. */
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
