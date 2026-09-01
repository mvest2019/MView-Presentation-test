"use client";

/*
 * Keeping a dropdown's panel on the page.
 *
 * The filter pills run most of the way across their row, and each one's panel
 * hangs from the left edge of its own button at a fixed width. On a phone the
 * last two opened past the right of the screen — which widens the page itself,
 * so everything on it shifts and the reader sees a cut-off table rather than a
 * cut-off dropdown.
 *
 * The panel measures where it landed as it appears and slides back only as far
 * as it must, never past the left edge. Measured rather than decided by a
 * breakpoint: what matters is where that particular button sits, which depends
 * on how the row above it happened to wrap.
 */

import { useCallback, useState } from "react";

/** How much window edge a panel leaves clear on either side. */
const GUTTER = 12;

export type PanelPlacement = {
  /** Pixels to slide the panel left. Zero where it already fits. */
  shift: number;
  /** Hand this to the panel's `ref`. */
  place: (node: HTMLDivElement | null) => void;
};

/**
 * @param width The panel's own width, as its class sets it.
 */
export function usePanelPlacement(width: number): PanelPlacement {
  const [shift, setShift] = useState(0);

  const place = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      const room = document.documentElement.clientWidth || window.innerWidth;
      /* Nothing sensible to measure against — a window narrower than the
         panel itself, or a document that has not been laid out. Left where it
         is rather than clamped to nonsense. */
      if (!room || room < width + GUTTER * 2) return;

      const box = node.getBoundingClientRect();
      /* `left` is where it sits now; the shift already applied has to come out
         of the measurement before the next one is worked out. */
      const wanted = box.left - shift;
      const over = wanted + box.width - (room - GUTTER);
      const next =
        over > 0 ? -Math.min(over, Math.max(0, wanted - GUTTER)) : 0;

      setShift(Math.round(next));
    },
    [shift, width],
  );

  return { shift, place };
}
