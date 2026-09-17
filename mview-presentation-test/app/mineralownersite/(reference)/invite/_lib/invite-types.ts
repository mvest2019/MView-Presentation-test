/**
 * THE SHAPES INVITE CO-OWNERS PRINTS.
 *
 * Everyone who owns a share of a Texas lease is named on the county's public
 * appraisal roll, and this module is the page's view of that record: who else
 * is on it, how a letter may address them, and what one invitation is worth.
 *
 * `owner_number` IS THE IDENTITY, NOT THE NAME. Names repeat on a roll — two
 * "SMITH JOHN A" rows are two different people, and one person filed twice
 * under two spellings is still one subscriber. Every tick, every code and the
 * whole credit calculation keys off the number, so a fixture that reuses a
 * number across leases is saying "the same human being", which is exactly what
 * `creditPlan` needs to know.
 */

/**
 * What kind of party an owner of record is — which decides how a letter may
 * address it, and whether inviting it makes any sense at all.
 *
 * `operator` IS NOT A CO-OWNER. It is the working-interest party: the company
 * that pays to drill, filed on the same roll because it holds an interest in
 * the lease. It can never register as a mineral owner and it never earns a
 * credit, and the page says so rather than quietly dropping the row — a reader
 * who knows the operator is on the roll and cannot find it assumes the list is
 * incomplete.
 */
export type OwnerKind = "person" | "company" | "trust" | "operator";

/** One owner of record, as the roll files them. */
export interface CoOwner {
  /** The state's own owner number. The identity — see the header. */
  ownerNumber: string;
  /** As filed, which for an individual is LAST FIRST MIDDLE. */
  name: string;
  kind: OwnerKind;
  /** The posting town, or null when the roll carries no address. */
  city: string | null;
  state: string | null;
  /**
   * Their share of the lease as a percentage — 4.8 is 4.8%. Null when the roll
   * files an interest it does not express as a fraction.
   */
  interestPct: number | null;
}

/** One of the reader's leases, with everyone else who is on it. */
export interface InviteLease {
  /** The lease-report slug, which is this page's stable id for the lease. */
  leaseId: string;
  /** `MCCABE ETAL GU · Lease 290271` — the reader-facing name. */
  label: string;
  leaseName: string;
  /** Null for the two unnumbered units on this record. */
  leaseNumber: string | null;
  county: string;
  /** What the reader's own share is worth, so the picker leads with what matters. */
  ownerValue: number;
  /** Everyone else on the roll for it, largest share first. */
  owners: CoOwner[];
}

/** How a letter opens. */
export type GreetingStyle = "first" | "name" | "family" | "custom";

/** Everything one letter needs, for one owner. */
export interface LetterInput {
  sender: string;
  leaseName: string;
  leaseNumber: string | null;
  county: string;
  owner: CoOwner;
  code: string;
  greeting: GreetingStyle;
  custom: string;
  body: string;
  claimUrl: string;
}

/** One letter, written. */
export interface Letter {
  ownerNumber: string;
  to: string;
  greeting: string;
  paragraphs: string[];
  code: string;
  /** `1234-5678` — the code as it is printed, because that is how it is typed. */
  codeLabel: string;
  /** The claim address with the code on it, for a text message or a chat. */
  inviteUrl: string;
  /**
   * The posting block, over as many lines as the roll gives — empty when it
   * carries no address at all.
   *
   * ONLY THE PRINTED LETTER USES IT. The email form leaves it out on purpose:
   * pasting a cousin's own address back at them reads as a database talking
   * rather than a relative. See `renderLetters`, which puts it where a window
   * envelope expects it.
   */
  addressLines: string[];
  /** `MCCABE ETAL GU · Lease 290271 · DE WITT County`. */
  heading: string;
  sender: string;
  kind: OwnerKind;
  /** Why this one wants a second look before it goes out, or null. */
  caution: string | null;
}

/** Whose step it is. See `FLOW` — the two lanes are never numbered as one. */
export type StepWho = "you" | "them";

/**
 * Whether a step works today.
 *
 * `live`    this page does it
 * `manual`  you do it, in your own mail — and always will
 * `pending` it needs a write store the portal does not have yet
 */
export type StepState = "live" | "manual" | "pending";

export interface FlowStep {
  n: number;
  who: StepWho;
  title: string;
  detail: string;
  state: StepState;
}

/** What an invitation earns, and on what condition. */
export interface CreditPolicy {
  /** Months of service earned when an invited co-owner takes a paid plan. */
  monthsOnPaid: number;
  monthsOnSend: number;
  monthsOnFreeSignup: number;
  /** The grain the credit is counted at — see `CREDIT`. */
  per: "person";
  label: string;
  rules: string[];
}

/** What one selection could earn, worked out from the ticks. */
export interface CreditPlan {
  /** How many letters are about to be written. */
  chosen: number;
  /** Of those, how many could ever register — an operator never will. */
  eligible: number;
  /** Owner numbers among the chosen who also own another lease of yours. */
  repeat: string[];
  /** How many other leases of yours those owners turn up on. */
  repeatLeases: number;
  /** The most this selection can earn, in months. */
  monthsMax: number;
  /** The plain sentence, for the state where the figure alone says nothing. */
  line: string;
}
