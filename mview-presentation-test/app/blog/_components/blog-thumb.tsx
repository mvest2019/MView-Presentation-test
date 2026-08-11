"use client";

import Image from "next/image";
import { useState } from "react";

import { isOptimizableImage } from "@/lib/image-host";

/**
 * Article thumbnail with the prototype's `mvBcErr` behaviour: an image that
 * fails to load is replaced by the branded MINERAL VIEW placeholder, so a card
 * is always a photo or the one placeholder — never an empty gradient box.
 * Client-side because that swap needs the image's error event.
 *
 * A src on an unconfigured host is treated the same way, since handing one to
 * `next/image` throws rather than degrading.
 *
 * Sized 16:9 rather than the prototype's flat `height:150px`. Every header image
 * in the corpus is 16:9 (800×450 or 1920×1080), and a 150px-tall box on a ~369px
 * card is 2.46:1 — so `object-cover` was shaving roughly 28% off the top and
 * bottom of every thumbnail, which is what read as the images being cut. Matching
 * the source ratio shows the whole frame. `object-cover` stays as insurance: it
 * is a no-op while the ratios agree, and keeps a differently-shaped upload from
 * stretching later.
 */
export function BlogThumb({
  src,
  alt,
  className = "aspect-video",
  priority = false,
  // Mirrors the grid: one column below 768px, two to 1023px, three above, and a
  // fixed 380px once the 1200px container stops growing. A hint that disagrees
  // with the layout makes the browser fetch the wrong width.
  sizes = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (min-width: 1240px) 380px, 33vw",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative flex-none overflow-hidden bg-[linear-gradient(135deg,#0e2b21,#2e8f6d)] ${className}`}
    >
      {isOptimizableImage(src) && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-serif text-xl font-bold tracking-[.06em] text-[#bfeeda]">
          MINERAL VIEW
        </div>
      )}
    </div>
  );
}
