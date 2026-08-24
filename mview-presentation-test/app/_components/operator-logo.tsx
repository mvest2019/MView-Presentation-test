"use client";

import { useState } from "react";

import { OperatorMonogram } from "./operator-monogram";

/**
 * An operator's real logo, falling back to the monogram tile.
 *
 * Promoted out of the operator listing because the detail page's hero now draws the
 * same thing, the same way — the reasoning below is subtle enough that two copies of
 * it would drift.
 *
 * THE URL IS OURS, NOT THE API'S. It comes from `operatorLogoPath(operatorNumber)`,
 * i.e. `/api/operators/{no}/logo`. The upstream response sets
 * `Cross-Origin-Resource-Policy: same-origin`, so an `<img>` pointed straight at
 * `operator_logo` downloads a valid PNG and is then refused by the browser. The route
 * handler re-serves the same bytes from our origin; see the note on `fetchOperatorLogo`.
 *
 * THE FALLBACK IS LOAD-BEARING, AND `operator_logo` CANNOT REPLACE IT. That field is
 * built from the operator number and arrives on every record — confirmed present on
 * 25 of 25 — so its presence says nothing about whether an image exists; the endpoint
 * 404s for operators without one. `onError` is what turns that into a monogram rather
 * than a broken-image icon, and it is the only thing that can: whether the bytes exist
 * is not knowable from the record.
 *
 * WHY A PLAIN `<img>` AND NOT `next/image`. Now that the bytes come from our own origin
 * the optimizer would work without an allowlist entry, but it buys nothing at these
 * sizes and it turns each of the (many) 404s into a failed, uncached `/_next/image`
 * round trip. The raw 404 is cacheable, so the browser stops asking.
 *
 * THE LOGO FILLS THE TILE, WITH NO INSET, AND THAT IS DELIBERATE. The API's logo PNGs
 * are not bare marks: they are pre-rendered white tiles with a light grey border
 * already drawn in. Sampled at source, Pioneer and Burlington (512×512) both carry a
 * ring of `rgb(225,225,225)` around a white field — a hair off this project's own
 * `mv-line`. Inset the image and that baked border sits *inside* the tile's border, and
 * the caller shows two concentric rounded rectangles. Filling the tile puts the two
 * edges on top of each other, so one border is visible.
 *
 * The tile keeps its own border because not every logo has one — EOG's 200×200 is white
 * to the edge — and without it those would float with no boundary at all.
 *
 * `object-contain` stays: it costs nothing on the square logos and stops a non-square
 * one from being stretched.
 *
 * `alt=""` because the operator's name is always right beside it as real text;
 * announcing the logo too would just repeat it.
 */
export function OperatorLogo({
  url,
  monogram,
  size,
  radius,
  monogramClassName = "",
  loading = "lazy",
}: {
  /** `operatorLogoPath(...)`, or null when there is nothing to try. */
  url: string | null;
  /** Two initials, for the fallback tile. */
  monogram: string;
  /** Edge length in pixels. */
  size: number;
  /**
   * Corner radius in pixels, applied inline. A number rather than a Tailwind class
   * because it is a per-caller measurement like `size`, and a composed class string
   * would be invisible to Tailwind's scanner.
   */
  radius: number;
  /**
   * Radius override for the monogram fallback, which bakes in its own. Must be a
   * literal class at the call site so Tailwind emits it, e.g. `"!rounded-[9px]"`.
   */
  monogramClassName?: string;
  /** `eager` for an above-the-fold tile, so it does not visibly swap in. */
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <OperatorMonogram
        monogram={monogram}
        size={size}
        className={monogramClassName}
      />
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden border border-mv-line bg-white shadow-[0_1px_2px_rgba(13,14,23,.05)]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- deliberate; see the
          note above this component about `next/image` and the 404 path. */}
      <img
        src={url}
        alt=""
        loading={loading}
        decoding="async"
        onError={() => setFailed(true)}
        // The box is a fixed size, so the image is constrained inside it rather than
        // sizing it — no intrinsic dimensions are needed and no logo, square or not,
        // can shift the layout around it.
        className="h-full w-full object-contain"
      />
    </span>
  );
}
