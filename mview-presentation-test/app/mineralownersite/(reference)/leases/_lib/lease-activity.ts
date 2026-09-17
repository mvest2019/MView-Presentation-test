import type { LeaseChangeItem } from "./lease-types";

/**
 * "WHAT CHANGED SINCE YOUR LAST VISIT" — the four items, in the design's order.
 *
 * THE SECOND HALF OF EVERY LINE IS THE POINT OF THE CARD. A change feed that
 * says "407 new drilling permits filed in DE WITT" and stops has told an owner a
 * number they cannot act on and cannot size. Each item here states the fact,
 * then says plainly what it does and does not mean for this record — "it is not
 * your permit", "this is context for your area rather than income", "worth a
 * look, not a panic". That wording is the design's and it is why these are
 * sentences in data rather than a template over a count.
 *
 * The order is by how close the item sits to the owner's money: their own
 * filings first, the area around them next, the operator handover last.
 */
export const changesSinceLastVisit: LeaseChangeItem[] = [
  {
    id: "june-2026-filings",
    headline:
      "Payment check worth running — 9 of your 10 leases filed production in June 2026",
    detail:
      "Your share of that month is 14,477 MCF of gas and 665 barrels of oil. The public record shows the volume; only your own statements show whether you were paid on it. Worth a look, not a panic.",
  },
  {
    id: "completions-de-witt",
    headline: "240 new wells completed in DE WITT",
    detail:
      "Wells are being finished around you. None is on a lease you hold, so this is context for your area rather than income — but a completion next door is what proves the rock under your own tract.",
  },
  {
    id: "permits-de-witt",
    headline: "407 new drilling permits filed in DE WITT",
    detail:
      "A permit is an intention to drill, filed with the state. It is not a well yet and it is not your permit — but permits near your acreage are how you see a neighbour moving before anything comes out of the ground.",
  },
  {
    id: "cook-gas-unit-operator",
    headline: "Operator changed on COOK GAS UNIT",
    detail:
      "BLACKBRUSH O & G, LLC took over from BB-SOUTHTEX, LLC in September 2024. A handover is when division orders and payment addresses most often go wrong — it is worth checking that the first statement from the new operator matches the last one from the old.",
  },
];
