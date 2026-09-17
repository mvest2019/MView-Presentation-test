/**
 * DETERMINISTIC SCATTER IN [-1, 1], FROM AN INDEX AND A SEED.
 *
 * NOT `Math.random()`, AND THAT IS THE WHOLE REASON THIS FILE EXISTS. The
 * modules that use it are imported on the server to render the HTML and again
 * in the browser to hydrate it. A random series would draw one chart into the
 * markup and a different one a moment later, which React reports as a hydration
 * mismatch and a reader sees as the page flickering into different numbers.
 *
 * A hash of the index gives the same answer in both places, on every reload,
 * for ever — so "random-looking" and "stable" are both true at once. The
 * constants are the usual ones for this trick; nothing about them is
 * meaningful beyond producing a well-spread fractional part.
 *
 * The `seed` separates streams that must not move together: gas volumes, oil
 * volumes and the realised gas price each take their own, or every month would
 * be high or low in all three at once and the chart would look choreographed.
 */
export function seededScatter(index: number, seed: number): number {
  const hashed = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return (hashed - Math.floor(hashed)) * 2 - 1;
}
