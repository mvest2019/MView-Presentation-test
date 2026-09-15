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

/**
 * THE SAME RULE, APPLIED TO TEXT THIS APP DID NOT WRITE.
 *
 * The constants above settle how MCF and BBL are spelled everywhere this code
 * builds a string. They say nothing about the strings the SERVICE builds — the
 * drawer prose, the drawer chart specs and the alert copy all arrive as
 * finished text, and they arrive in lower case: "$/bbl", "peak 114.58 bbl",
 * "91.48 bbl". So the ticker panel printed "bbl" three times directly under a
 * dashboard printing "BBL", which is the drift this module's header was
 * written about, reaching the page from the one direction it could not reach
 * before. Defect sheet row 3.
 *
 * WHAT IS CAPITALISED, AND WHAT IS DELIBERATELY NOT. `bbl`, `mcf` and `boe`
 * are the three this module owns, and `gal` keeps them company because it is
 * the propane settlement's unit and sits in the same row as the other three.
 * `MMBtu` IS LEFT ALONE: that is its correct form — the EIA, every gas
 * contract and every state filing write it exactly that way, and "MMBTU" would
 * be a new error rather than a fixed one. Capitalising a unit is only right
 * where the capitals are the convention.
 *
 * WHOLE WORDS ONLY, so "bbls" and a lease named "GALBRAITH" are untouched.
 */
const UNIT_CASE: Record<string, string> = {
  bbl: BBL, mcf: MCF, boe: 'BOE', gal: 'GAL',
};
const UNIT_WORD = /\b(bbl|mcf|boe|gal)\b/gi;

/** The units in a piece of text, in the capitals this app writes them in. */
export function units(text: string): string {
  return text.replace(UNIT_WORD, (m) => UNIT_CASE[m.toLowerCase()] ?? m);
}

/**
 * THE SAME SEAM AGAIN, FOR A BROKEN VERB RATHER THAN A BROKEN UNIT.
 *
 * The prices panel reads "…and it is rose 11.62% against a month ago", on all
 * four settlements: "it is rose" (WTI), "it is rose" (NAT GAS), "it is eased"
 * (BRENT), "it is rose" (PROPANE). Defect sheet row 48. The shape of the
 * mistake says what happened upstream — a sentence template whose slot expects
 * a STATE ("it is up 11.62%") is being filled with the same past-tense VERB the
 * clause before it uses ("rose 5.11% against the previous session"), so one
 * template is serving two grammatical positions.
 *
 * WHY IT IS FIXED HERE AND NOT LEFT TO THE SERVICE. This is the seam `units`
 * above already establishes and for the identical reason: the sentence arrives
 * finished, this app has no other hold on it, and a reader meeting "it is rose"
 * on a money panel reasonably doubts every figure beside it. The service should
 * stop emitting it; until it does, the page must not print it. The day the
 * template is fixed this function stops matching and costs one pass over the
 * string.
 *
 * IT REWRITES A FIXED, CLOSED SET AND NOTHING ELSE. Only "it is" or "they are"
 * immediately followed by one of the movement verbs the ticker uses is
 * touched, and each maps to the perfect form of that same verb — the meaning,
 * the direction and the figure are untouched; only the tense agrees. A verb
 * this map has not seen is left exactly as it arrived rather than guessed at,
 * because a wrong verb is worse than an ungrammatical one.
 */
const MOVED: Record<string, string> = {
  rose: 'risen',
  fell: 'fallen',
  climbed: 'climbed',
  eased: 'eased',
  slipped: 'slipped',
  gained: 'gained',
  dropped: 'dropped',
  jumped: 'jumped',
  held: 'held',
};
const BAD_TENSE =
  /\b(it|they)\s+(is|are)\s+(rose|fell|climbed|eased|slipped|gained|dropped|jumped|held)\b/gi;

/** Service prose, with the one tense the ticker template gets wrong put right. */
export function prose(text: string): string {
  return text.replace(BAD_TENSE, (_m, subject: string, _be: string, verb: string) => {
    const had = subject.toLowerCase() === 'it' ? 'has' : 'have';
    return `${subject} ${had} ${MOVED[verb.toLowerCase()] ?? verb}`;
  });
}

/**
 * Everything this module knows about text it did not write, in one call.
 *
 * Every surface that renders a finished string from the service should reach
 * for THIS rather than for `units` or `prose` on their own, so a third repair
 * lands everywhere the first two already do instead of at one call site.
 */
export function serviceText(text: string): string {
  return prose(units(text));
}

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
