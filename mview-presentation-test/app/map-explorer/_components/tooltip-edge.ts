/*
 * Keeping a hover card inside the map.
 *
 * The cards are centred on the mark they describe, which hangs half of one off
 * the side of the map when the mark is near the edge — and the map clips it.
 *
 * Done in CSS rather than in JS because the container's width is not known to
 * the cards: `100%` inside a `clamp()` resolves against it, so nothing has to
 * be measured and nothing renders in the wrong place first.
 */

/** How close to the map's edge a card may come. */
const EDGE_PAD = 10;

/** How close to the card's own corner its tail may come. */
const TAIL_PAD = 16;

export function edgeClamped(x: number, width: number) {
  const half = width / 2 + EDGE_PAD;
  const left = `clamp(${half}px, ${x}px, calc(100% - ${half}px))`;

  return {
    left,
    // The tail stays on the mark, wherever the card ended up.
    tail: `clamp(${TAIL_PAD}px, calc(${x}px - ${left} + ${width / 2}px), ${width - TAIL_PAD}px)`,
  };
}
