/**
 * Formatting — shared by the server and the browser so one number never reads
 * two ways.
 *
 * EVERY FORMATTER PINS 'en-US'. `toLocaleString()` with no locale uses the
 * machine's, and on an Indian-locale machine $4,548,479 rendered as
 * "$45,48,479" — the lakh grouping. The figures here are US oil-and-gas
 * records quoted in dollars, mcf and barrels; the grouping belongs to the data,
 * not to the reader's operating system.
 *
 * VOLUMES ARE MCF AND BARRELS, NEVER BOE. An owner reads the products they
 * own. BOE exists in the payload only because it is the one figure that can
 * rank a gas lease against an oil one, and nothing here prints it.
 *
 * THE TWO UNIT STRINGS LIVE HERE, IN CAPITALS, and every surface reads them
 * from here. They were written inline in about twenty places and drifted to
 * lower case; MCF and BBL are how the units are written on a division order
 * and on a state filing, which is what the reader will be comparing against.
 */
const LOCALE = 'en-US';

export const MCF = 'MCF';
export const BBL = 'BBL';

export function n0(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.round(v).toLocaleString(LOCALE);
}

export function n1(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v.toLocaleString(LOCALE, { maximumFractionDigits: 1 });
}

export function usd(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return '$' + Math.round(v).toLocaleString(LOCALE);
}

export function usdShort(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return '$' + Math.round(v / 1e3).toLocaleString(LOCALE) + 'K';
  return '$' + Math.round(v);
}

export function nShort(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return Math.round(v / 1e3).toLocaleString(LOCALE) + 'K';
  return n0(v);
}

/** A signed percentage. "%" is a suffix, not a unit — never spaced. */
export function pctS(v: number | null | undefined, dp = 1): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return (v >= 0 ? '+' : '') + v.toFixed(dp) + '%';
}

/**
 * A percentage that is a SHARE, not a change.
 *
 * `pctS` signs every value, which is right for "gas moved +7.6% against last
 * month" and wrong for "7.6% of the gas never reached the meter" — that read
 * as "+7.6%" and invited the reader to look for what it had risen from.
 */
export function pct1(v: number | null | undefined, dp = 1): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v.toFixed(dp) + '%';
}

export function pct0(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v.toFixed(0) + '%';
}

/** A decimal interest is a fraction; owners read the percentage. Show both. */
export function interest(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  const frac = v.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  const perc = (v * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return `${frac} (${perc}%)`;
}

/**
 * A volume phrase in BOTH products.
 *
 * `both` names the two halves even when one of them is zero — "14,477 MCF ·
 * no oil" rather than just the gas. An owner with a gas-only portfolio was
 * seeing one figure with nothing to say whether oil was absent or simply not
 * shown, and those are different facts. Where a caller genuinely wants only
 * the products that exist (a narrow cell), it passes `both: false`.
 */
export function vol(gas: number, oil: number, short = false, both = true): string {
  const f = short ? nShort : n0;
  const bits: string[] = [];
  if (gas > 0) bits.push(`${f(gas)} ${MCF}`);
  else if (both) bits.push('no gas');
  if (oil > 0) bits.push(`${f(oil)} ${BBL}`);
  else if (both) bits.push('no oil');
  if (gas <= 0 && oil <= 0) return 'none filed';
  return bits.join(' · ');
}

/** Only what exists — for a cell too narrow to carry both halves. */
export function volShort(gas: number, oil: number, short = false): string {
  return vol(gas, oil, short, false);
}

/** The same, spelled out, for prose inside an explainer. */
export function volWords(gas: number, oil: number): string {
  const bits: string[] = [];
  if (gas > 0) bits.push(`${n0(gas)} ${MCF} of gas`);
  if (oil > 0) bits.push(`${n0(oil)} barrels of oil`);
  if (!bits.length) return 'no volume';
  if (gas > 0 && oil <= 0) bits.push('no oil');
  if (oil > 0 && gas <= 0) bits.push('no gas');
  return bits.join(' and ');
}

export function plural(k: number, one: string, many?: string): string {
  return k === 1 ? one : (many ?? one + 's');
}

/** The product this portfolio is actually about, for labels. */
export function productWord(hasGas: boolean, hasOil: boolean): string {
  if (hasGas && hasOil) return 'oil and gas';
  if (hasGas) return 'gas';
  if (hasOil) return 'oil';
  return 'production';
}

/** Good morning / afternoon / evening, from a clock the CALLER supplies. */
export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function dayWords(d: Date): string {
  return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}
