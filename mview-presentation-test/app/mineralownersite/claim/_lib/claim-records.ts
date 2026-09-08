/**
 * THE FICTIONAL RECORD THIS FLOW CLAIMS.
 *
 * Same standing as `_lib/portal-demo-data.ts` next door: the portal is a
 * prototype and every figure in it belongs to a person who does not exist. The
 * ribbon, the top-bar chip and the drawer footnote all say so on this screen
 * too, so the flow does not repeat the disclosure a fourth time.
 *
 * WHY THREE CANDIDATES AND NOT ONE. The design's own answer is on step 2 — an
 * owner name string recurs across unrelated parties, so name-only matching is
 * unsafe and the address is the discriminator. A one-candidate mock would hide
 * the whole reason step 3 exists.
 */

export interface ClaimCandidate {
  /** The county appraisal record id — the flow's stable handle for a party. */
  id: string;
  name: string;
  /** "Lampasas, TX" — the chip beside the name. */
  mailCity: string;
  /** Street-masked until the record is confirmed. */
  maskedAddress: string;
  /** Revealed on step 3 for the record that matches the account. */
  fullAddress: string;
  county: string;
  leaseCount: number;
  operatorCount: number;
  /**
   * Does this record's mailing address match the one on the account? Exactly
   * one candidate may be true — it is what makes step 3 a verification rather
   * than a second guess, and the others need a mailed code instead.
   */
  matchesMailing: boolean;
}

export const claimCandidates: ClaimCandidate[] = [
  {
    id: "BEE-084213",
    name: "RAYMOND SMITH",
    mailCity: "Lampasas, TX",
    maskedAddress: "•••• Rd, Lampasas, TX 76550",
    fullAddress: "1200 Ranch Rd, Lampasas, TX 76550",
    county: "Bee",
    leaseCount: 10,
    operatorCount: 4,
    matchesMailing: true,
  },
  {
    id: "CAS-034213",
    name: "RAYMOND SMITH",
    mailCity: "Medford, OR",
    maskedAddress: "•••• Rd, Medford, OR 97501",
    fullAddress: "•••• Rd, Medford, OR 97501",
    county: "Cass",
    leaseCount: 7,
    operatorCount: 3,
    matchesMailing: false,
  },
  {
    id: "HOO-054213",
    name: "RAYMOND SMITH",
    mailCity: "Richardson, TX",
    maskedAddress: "•••• Rd, Richardson, TX 75080",
    fullAddress: "•••• Rd, Richardson, TX 75080",
    county: "Hood",
    leaseCount: 3,
    operatorCount: 2,
    matchesMailing: false,
  },
];

/** The address the account already holds — step 3 attests each record to it. */
export const accountMailingAddress = "1200 Ranch Rd, Lampasas, TX 76550";

export interface ClaimLease {
  /** "Smith Gas Unit (1 of 10)" — the design's own numbering, kept verbatim. */
  name: string;
  /** The RRC lease number. */
  number: string;
  /** `null` where the roll carries no operator — rendered as an em dash. */
  operator: string | null;
  county: string;
  /** Owner-share MVestimate in whole dollars. */
  value: number;
  /** Decimal interest as filed, to eight places. */
  decimal: number;
  producing: boolean;
}

/**
 * The ten leases that come with `BEE-084213`.
 *
 * EVERY TOTAL ON STEPS 4 AND 5 IS DERIVED FROM THIS ARRAY — see `claimTotals`.
 * Nothing downstream restates a sum, so a lease edited here cannot leave a
 * stat tile disagreeing with the table above it.
 */
export const claimLeases: ClaimLease[] = [
  { name: "Smith Gas Unit (1 of 10)", number: "301096", operator: "Bluestem Oil and Gas, LP", county: "Bee", value: 9268, decimal: 0.00376, producing: true },
  { name: "Cedar Bend (2 of 10)", number: "301233", operator: null, county: "Bee", value: 10259, decimal: 0.00413, producing: false },
  { name: "Ledbetter (3 of 10)", number: "301370", operator: "Trinity Fork USA, LLC", county: "Bee", value: 2210, decimal: 0.0045, producing: true },
  { name: "Averitt (4 of 10)", number: "301507", operator: "Kestrel Exploration LLC", county: "Bee", value: 3181, decimal: 0.00487, producing: true },
  { name: "Smith Gas Unit (5 of 10)", number: "301644", operator: null, county: "Bee", value: 4152, decimal: 0.00524, producing: false },
  { name: "Cedar Bend (6 of 10)", number: "301781", operator: "Caddo Pine Resources, LLC", county: "Bee", value: 5123, decimal: 0.00561, producing: true },
  { name: "Ledbetter (7 of 10)", number: "301918", operator: "Trinity Fork USA, LLC", county: "Bee", value: 6094, decimal: 0.00598, producing: true },
  { name: "Averitt (8 of 10)", number: "302055", operator: null, county: "Bee", value: 7065, decimal: 0.00635, producing: false },
  { name: "Smith Gas Unit (9 of 10)", number: "302192", operator: "Bluestem Oil and Gas, LP", county: "Bee", value: 8036, decimal: 0.00672, producing: true },
  { name: "Cedar Bend (10 of 10)", number: "302329", operator: "Caddo Pine Resources, LLC", county: "Bee", value: 9007, decimal: 0.00709, producing: true },
];
