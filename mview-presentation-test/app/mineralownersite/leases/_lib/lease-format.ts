/**
 * HOW LEASE FIGURES ARE PRINTED. Display only — no arithmetic decisions here.
 *
 * WHY IT IS SEPARATE FROM THE DATA. `lease-records.ts` holds numbers so the
 * module can sort, sum and multiply with them; the design prints those numbers
 * in exactly four shapes. Putting the four shapes here means a component never
 * hand-rolls `toLocaleString`, and the money on the table, the grid card, the
 * value band and the explainer can never drift apart.
 *
 * `en-US` IS PASSED EXPLICITLY. `toLocaleString()` with no locale uses the
 * SERVER's locale during SSR and the READER's in the browser, which produces
 * "26 340" on the server and "26,340" on the client for the same figure — a
 * hydration mismatch React reports as an error. Naming the locale makes both
 * passes agree, and the design's figures are US-formatted anyway.
 */

/** `8700` -> `"$8,700"`. Whole dollars: the design never shows lease cents. */
export function formatDollars(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** `4389` -> `"≈ $4,389"`. For any figure the design marks as approximate. */
export function formatApproxDollars(value: number): string {
  return `≈ ${formatDollars(value)}`;
}

/** `27120` -> `"27,120"`. Volumes, well counts, anything unitless. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * `0.005387` -> `"0.00538700"`.
 *
 * EIGHT DECIMAL PLACES, ALWAYS, because the trailing zeros are the value: a
 * division order writes the decimal interest to eight places and an owner
 * checking their paperwork against this column is comparing character by
 * character. `0.005387` and `0.00538700` are the same number and only one of
 * them matches the paper.
 */
export function formatDecimalInterest(value: number): string {
  return value.toFixed(8);
}

/**
 * `380` -> `"Cass (380 ac)"`, `null` -> `"Cass (not reported)"`.
 *
 * The honest gap text is the prototype's own. An unreported acreage is a hole
 * in the RRC filing, not a zero, and blanking the cell would leave a reader
 * wondering whether we simply failed to load it.
 */
export function formatCountyAcres(county: string, acres: number | null): string {
  return `${county} (${acres === null ? "not reported" : `${formatCount(acres)} ac`})`;
}

/** `0` -> `"0.0%"`, `null` -> `"—"`. See `weekChangePercent` on `LeaseRecord`. */
export function formatWeekChange(percent: number | null): string {
  return percent === null ? "—" : `${percent.toFixed(1)}%`;
}

/** `"Smith Gas Unit"` + `"305892"` -> `"Smith Gas Unit (305892)"`. */
export function formatLeaseTitle(name: string, number: string): string {
  return `${name} (${number})`;
}

/**
 * `["a","b","c"]` -> `"a, b and c"`.
 *
 * THE DESIGN'S PROSE JOINS LISTS WITH "and", not with a third comma — "Bee, Cass
 * and Hood", "…Trinity Fork USA and Kestrel Exploration". A plain `.join(", ")`
 * reads as a data dump in the middle of a sentence, which is what these two
 * explainer paragraphs are trying not to be.
 */
export function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  const head = items.slice(0, -1).join(", ");
  const tail = items[items.length - 1];
  /* "Averitt 65081 and Smith 267145 & 508936" reads as one conjunction too
     many, so a tail that already carries an ampersand joins with a comma —
     which is how the design writes that exact sentence. */
  return tail.includes("&") ? `${head}, ${tail}` : `${head} and ${tail}`;
}

/**
 * `"Bluestem Oil and Gas, LP"` -> `"Bluestem Oil & Gas"`.
 *
 * PROSE NAMES, NOT LEGAL NAMES. The explainer paragraphs name the four operators
 * mid-sentence, and the design writes them the way a person would — dropping the
 * entity suffix and using an ampersand. The full filed name stays on the lease's
 * own row in the table, which is where somebody checking a document needs it.
 */
export function formatOperatorShortName(operator: string): string {
  return operator
    .replace(/,?\s+(LLC|LP|L\.P\.|Inc\.?|Co\.|Company|Corp\.?)$/i, "")
    /* Word-bounded, or an operator named "Sandstone" or "Highland" loses its
       middle. Only the standalone conjunction becomes an ampersand. */
    .replace(/\band\b/g, "&");
}

/**
 * `7` -> `"seven"`, `20` -> `"20"`.
 *
 * THE CALM TIERS SPELL THEIR NUMBERS OUT. The Ultra hero reads "Seven are
 * earning money; three are quiet", and the status explainer says "these three",
 * where the dense tiers print "7 of 10". It is a deliberate register shift the
 * design makes wherever a figure sits inside a sentence rather than inside a
 * stat, and exactly the kind of detail that silently reverts to digits the
 * first time somebody derives the sentence from data - which is what had
 * happened here before this helper existed.
 *
 * Stops at twelve, where English convention stops spelling and where the word
 * starts being harder to read than the digit. Above that the digit comes back,
 * so a record holding forty leases degrades sensibly.
 */
const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

export function spellOut(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}
