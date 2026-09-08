import { alertCounts } from "./alert-counts";

/**
 * THE LEDGER'S SENTENCES, IN WORDS RATHER THAN DIGITS.
 *
 * The watch ledger reads "it has raised nine alerts, one of which asks something
 * of you" — spelled out, and agreeing with itself in number. The reference
 * builds those five strings in `mvWatchLedger()` and writes them into five
 * `data-aw` spans; this file is the same five, computed from `alertCounts`.
 *
 * ── WHY SPELLED OUT AT ALL ──
 *
 * Because the ledger is prose and the grid beside it is figures, and the design
 * separates the two deliberately: numerals for things you compare (10 leases, 38
 * permits, 228 filings), words for things you read (nine alerts, one of which
 * asks). Mixing them makes a sentence look like a table.
 *
 * ── THE PLURALS ARE NOT DECORATION ──
 *
 * "one of which asks" / "two of which ask" — the verb has to agree, and so does
 * "One asks" / "Two ask" in the grid caption. The reference got this right by
 * branching on the count in four separate places; here it is branched once and
 * the four phrases are derived together, so they cannot fall out of agreement
 * with each other the way four independent ternaries can.
 */

/**
 * Zero to twelve. Past that the numeral is clearer than the word, which is the
 * reference's own cutoff (`MV_NUMWORD`) and the usual editorial one.
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
] as const;

export function numberWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

/** "one" -> "One". Only ever used to open a sentence. */
function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export interface LedgerPhrases {
  /** "nine alerts" */
  alerts: string;
  /** "one of which asks" / "two of which ask" */
  action: string;
  /** "One" / "Two" — opens the grid caption's sentence. */
  actionWord: string;
  /** "asks" / "ask" — that sentence's verb. */
  actionVerb: string;
  /** "eight" — everything that is not action-recommended. */
  restWord: string;
}

export function ledgerPhrases(
  total: number,
  action: number,
  rest: number,
): LedgerPhrases {
  const singular = action === 1;

  return {
    alerts: `${numberWord(total)} alert${total === 1 ? "" : "s"}`,
    action: `${numberWord(action)} of which ${singular ? "asks" : "ask"}`,
    actionWord: capitalise(numberWord(action)),
    actionVerb: singular ? "asks" : "ask",
    restWord: numberWord(rest),
  };
}

/** The demo record's phrases. */
export const alertPhrases = ledgerPhrases(
  alertCounts.total,
  alertCounts.action,
  alertCounts.rest,
);
