"use client";

import Image from "next/image";
import { useState } from "react";

import { isOptimizableImage } from "@/lib/image-host";

/**
 * Article header image — the design's `.ba-hero img`: full width, rounded with a
 * hairline border. Falls back to the branded placeholder, same rule as the cards.
 *
 * The design's `max-height:320px` is dropped. Header images are 16:9, so in the
 * article column they want a height to match; capping at 320 with `object-cover`
 * cropped a quarter of the frame away. Declared at the true 16:9 so the image
 * sets its own height and nothing is cut.
 */
export function ArticleHero({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!isOptimizableImage(src) || failed) {
    return (
      <div className="my-[6px] mb-[14px] flex aspect-video items-center justify-center rounded-[14px] border border-mv-line bg-[linear-gradient(135deg,#0e2b21,#2e8f6d)] font-serif text-xl font-bold tracking-[.06em] text-[#bfeeda]">
        MINERAL VIEW
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1600}
      height={900}
      priority
      /* Tracks the article column: full width on a phone, the whole wrap while
         the contents rail is stacked below 1024, then wrap minus the 300px rail
         and its 40px gap once they sit side by side. */
      sizes="(max-width: 767px) 100vw, (max-width: 1023px) 92vw, (min-width: 1256px) 804px, calc(100vw - 396px)"
      onError={() => setFailed(true)}
      className="my-[6px] mb-[14px] h-auto w-full rounded-[14px] border border-mv-line"
    />
  );
}
