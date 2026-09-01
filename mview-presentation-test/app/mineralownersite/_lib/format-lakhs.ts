/**
 * Lakh formatting for the Dashboard's large numeric values.
 *
 * A lakh is 100,000, so "in lakhs" only reads better once a figure actually
 * reaches one: 26,34,000 as "26.34 L" is a genuine improvement, while 26,340 as
 * "0.26 L" is strictly harder to read than the plain number and throws away two
 * significant digits. `LAKH_THRESHOLD` is therefore the point at which the
 * conversion happens, and below it the value is returned untouched.
 *
 * THAT THRESHOLD IS THE ONE LEVER in this file. Lower it if the hero figures
 * should read in lakhs regardless of size.
 *
 * IT TAKES THE ALREADY-FORMATTED STRING, deliberately, rather than a number.
 * The demo record stores its figures the way the design writes them — "$26,340",
 * "~$11,532", "64,730" — and the brief is to change presentation only, keeping
 * the underlying values correct. Parsing the display string and handing back a
 * display string keeps this a pure formatting step: no data is restated, no
 * component's props change shape, and a figure this cannot parse comes back
 * exactly as it arrived rather than becoming `NaN` on the page.
 *
 * The prefix and suffix survive the round trip, so a currency mark, the "~" on
 * the county's approximate value and a trailing unit all stay attached to their
 * number.
 */

/** One lakh. The point at which expressing a figure in lakhs starts to help. */
export const LAKH_THRESHOLD = 100_000;

/**
 * Splits a formatted figure into what comes before the digits, the digits, and
 * what comes after: "~$11,532" -> ["~$", "11,532", ""], "64,730" ->
 * ["", "64,730", ""].
 *
 * Anchored at both ends so a string carrying more than one number (a sentence,
 * say) fails to match and is passed through untouched — this is for a single
 * figure, and silently rewriting the first number in a sentence would be worse
 * than doing nothing.
 */
const FIGURE = /^([^0-9]*)([0-9][0-9,]*(?:\.[0-9]+)?)([^0-9]*)$/;

/**
 * Renders a figure in lakhs when it is at least one lakh, and returns it
 * unchanged when it is not.
 *
 * Up to two decimal places, with trailing zeros trimmed, so 2,00,000 reads
 * "2 L" rather than "2.00 L".
 */
export function formatLakhs(display: string): string {
  const match = FIGURE.exec(display.trim());
  if (!match) return display;

  const [, prefix, digits, suffix] = match;
  const value = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(value) || value < LAKH_THRESHOLD) return display;

  const lakhs = value / LAKH_THRESHOLD;
  // `toFixed` then strip a trailing ".00" or a single trailing "0".
  const rounded = lakhs.toFixed(2).replace(/\.?0+$/, "");
  return `${prefix}${rounded} L${suffix}`;
}
