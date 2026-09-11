/**
 * HOW MY LEASES PRINTS ITS NUMBERS.
 *
 * Pure functions, no records — the fixture holds full precision and every
 * rounding decision the design makes lives here, so a figure is rounded the
 * same way in the band, the table and the totals row.
 *
 * THE TWO MONEY SCALES ARE DELIBERATE AND DIFFERENT. The band and the
 * MVestimate column are compact ($1.36M, $545K) because they are read at a
 * glance and compared against each other; the county roll is printed in full
 * ($1,844,170) because it is a figure off a public document and rounding it
 * would misquote the roll.
 */

/** `$1,844,170` — the county roll, exactly as the roll states it. */
export function formatDollars(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/**
 * `$4.44M`, `$545K`, `$12K` — the band and the MVestimate column.
 *
 * Two decimals above a million and none below it, which is the design's own
 * split: `toFixed(2)` rather than a trimmed number so $1.30M keeps its trailing
 * zero and sits on the same decimal point as $1.36M above it.
 */
export function formatCompactDollars(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return formatDollars(value);
}

/** `28.02M` — a volume large enough that the digits stop carrying meaning. */
export function formatCompactVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return formatCount(value);
}

/** `6,385,191` — volumes and counts in full. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** `629.2`, `160` — acreage keeps its tenth only when the filing gives one. */
export function formatAcres(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

/**
 * `0.05138 (5.138%)` — the decimal as filed, then the same figure as a
 * percentage, because owners read their share both ways and the design prints
 * both rather than making the reader multiply.
 *
 * `toFixed(6)` before `Number()` is what keeps `0.05138 * 100` from printing as
 * `5.138000000000001`; the trailing zeros it adds are then dropped by `Number`.
 */
export function formatDecimalInterest(value: number): string {
  const percent = Number((value * 100).toFixed(6));
  return `${value} (${percent}%)`;
}

/** `MCCABE ETAL GU · Lease 290271`, or the bare unit name when unnumbered. */
export function formatLeaseTitle(name: string, number: string | null): string {
  return number ? `${name} · Lease ${number}` : name;
}
