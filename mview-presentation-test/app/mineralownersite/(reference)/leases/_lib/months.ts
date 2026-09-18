/**
 * MONTHS AS ONE NUMBER.
 *
 * The lease records carry months as English labels — `firstPosting: "June 2020"`,
 * `lastPosted.month: "June 2026"` — because that is what they print. A chart
 * needs to subtract them, so everything here converts to and from a single
 * integer: `year * 12 + (month - 1)`. Differences in that number are months,
 * which is the only arithmetic this module exists to make possible.
 *
 * `Date.parse("1 June 2026")` IS THE PARSER, and it is deliberate rather than a
 * lookup table: the labels come from our own records in one fixed format, and
 * the engine already knows every month name. A bad label yields `NaN` and is
 * caught here rather than silently plotting at the epoch.
 */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_NAMES = MONTH_NAMES.map((name) => name.slice(0, 3));

/** `"June 2026"` -> a month number. Throws on anything it cannot read. */
export function monthNumber(label: string): number {
  const parsed = new Date(Date.parse(`1 ${label}`));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Unreadable month label: ${label}`);
  }
  return parsed.getFullYear() * 12 + parsed.getMonth();
}

/** `"June 2026"` — the long form, for prose and tile captions. */
export function monthLabel(value: number): string {
  return `${MONTH_NAMES[value % 12]} ${Math.floor(value / 12)}`;
}

/** `"Jun 2026"` — the short form, for axis ticks where width is scarce. */
export function shortMonthLabel(value: number): string {
  return `${SHORT_NAMES[value % 12]} ${Math.floor(value / 12)}`;
}
