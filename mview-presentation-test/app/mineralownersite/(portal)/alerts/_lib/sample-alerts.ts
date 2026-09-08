/**
 * THE UNCLAIMED INBOX — three alerts belonging to nobody real.
 *
 * v24 · #1: "no-claim Alerts = a SAMPLE alert inbox on the fictional owner
 * J. T. Callahan." Alerts are personal by definition, so a visitor who has not
 * claimed a record has literally nothing to show — and an empty inbox above a
 * claim button shows them nothing and asks them to imagine the rest.
 *
 * WHY THESE THREE AND NOT NINE. The sample is a demonstration of the KIND of
 * thing that arrives, not a demonstration of volume: one piece of good news, one
 * neighbour at work, one piece of market context. The design then names the three
 * classes it is NOT showing — payment gaps, co-owner activity, decline-trend
 * breaks — in a line underneath, which is a more honest way to promise them than
 * inventing six more fictional rows.
 *
 * THE ACCENT IS THE SAMPLE'S ONE PIECE OF INFORMATION. Green means live and
 * watched daily; amber means a labelled example; grey means neither. The claim
 * rail above prints that key, and its closing line is what these colours are
 * for: "Claiming turns the amber into your green."
 *
 * `J. T. Callahan` IS THE SAME FICTIONAL OWNER the dashboard and My Leases
 * samples use. One made-up owner across all three surfaces, so a visitor who
 * clicks between them is not handed three different strangers' data.
 */

export type SampleAlertAccent = "green" | "amber" | "neutral";

export interface SampleAlert {
  /** The design's own glyph. Decorative — the sentence carries the meaning. */
  glyph: string;
  accent: SampleAlertAccent;
  headline: string;
  /** Ends with the screen it would open, which is the sample's real point. */
  detail: string;
}

export const sampleOwner = {
  name: "J. T. Callahan",
  /** What the sample panel's heading says, verbatim. */
  since: "3 alerts since Tuesday",
} as const;

export const sampleAlerts: SampleAlert[] = [
  {
    glyph: "▤",
    accent: "green",
    headline: "New production posted on Alameda Ranch",
    detail:
      "4,120 mcf filed for June — J. T.'s strongest lease keeps earning. → opens the lease report",
  },
  {
    glyph: "⚑",
    accent: "amber",
    headline: "Permit filed within 1 mile of Bluestem 2H",
    detail:
      "A neighbour is drilling close by — worth a glance, not a worry. → opens the map on the permit",
  },
  {
    glyph: "▲",
    accent: "neutral",
    headline: "Gas firmed +1.5% — touched the estimate",
    detail:
      "Good for a gas-weighted record like this one. → opens this week's briefing",
  },
];
