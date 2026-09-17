/* THE ONLY LINES IN THIS MODULE THE MOVE TOUCHED — see the note on the same
   import in `lease-step.tsx`. This is still the one place the page reads the
   leases fixture, so pointing it at a database later remains a single-file
   change. */
import { formatLeaseTitle } from "@/app/mineralownersite/(reference)/leases/_lib/lease-format";
import {
  leaseOwnerRecord,
  leaseRecords,
} from "@/app/mineralownersite/(reference)/leases/_lib/lease-records";
import type { CoOwner, InviteLease, OwnerKind } from "./invite-types";

/**
 * THE OTHER OWNERS OF RECORD ON THIS OWNER'S TEN LEASES.
 *
 * STATIC FIXTURE, AND A DELIBERATELY SHAPED ONE. A real page reads the county
 * appraisal roll — one query per lease, keyed on district and lease number —
 * and this portal has no server read to make that with. So the roster below
 * stands in for it, and it is shaped rather than sampled: every property the
 * page's behavior turns on has at least one row that exercises it.
 *
 *   A NAME THE GREETING CANNOT SAFELY SHORTEN.   "MCCABE J T JR" (a suffix),
 *   "ZAPATA ROSA & MANUEL" (two people), "NAVARRO LUIS" (two words). Each one
 *   falls back to the full name as filed rather than being greeted "Dear J,".
 *
 *   A ROW WITH NO ADDRESS ON THE ROLL.           "BROCK LORENE". It cannot be
 *   posted, and the letter says so before the reader prints it.
 *
 *   COMPANIES AND TRUSTS.                        Always greeted by their own
 *   name whatever the reader picks, which is the rule `greetingFor` enforces
 *   and the card explains.
 *
 *   THE OPERATOR.                                Hurd Enterprises is on the
 *   roll because it holds the working interest. It is hidden behind the "also
 *   show companies and trusts" link, it carries a caution, and it never counts
 *   towards a free month.
 *
 *   THE SAME PEOPLE ON SEVERAL LEASES.           The McCabe and Kaiser rows sit
 *   on most of the six MCCABE units, which is what makes `creditPlan`'s "one
 *   month per person, not per lease" a visible fact rather than a claim.
 *
 * WIRING THIS TO THE ROLL means replacing this module and nothing else — every
 * component reads `InviteLease` and `CoOwner`, never this array.
 *
 * THE FIGURES ARE NOT REAL AND NEITHER ARE THE PEOPLE. The owner record this
 * portal prints is the design's fictional one; these names are invented to
 * match it, and no invented name should ever be confused with a row on an
 * actual public roll.
 */

/** One row of the roster, before it is attached to a lease. */
interface RosterEntry {
  name: string;
  kind: OwnerKind;
  city: string | null;
  state: string | null;
}

/**
 * EVERY OWNER OF RECORD, KEYED BY OWNER NUMBER.
 *
 * The number is the identity — see `invite-types.ts`. One person appearing on
 * six leases is ONE entry here referenced six times below, which is what makes
 * "the same person" a fact the code can check rather than a coincidence of
 * spelling.
 */
const ROSTER: Record<string, RosterEntry> = {
  /* ---- the McCabe side of the family */
  "10419210": { name: "MCCABE CORLISS K", kind: "person", city: "Yorktown", state: "TX" },
  "10419288": { name: "MCCABE RANDALL LEE", kind: "person", city: "San Antonio", state: "TX" },
  "10419301": { name: "MCCABE J T JR", kind: "person", city: "Cuero", state: "TX" },
  "10419355": { name: "MCCABE ELAINE F", kind: "person", city: "Nordheim", state: "TX" },
  "10420709": { name: "ESTATE OF W H MCCABE", kind: "trust", city: "Cuero", state: "TX" },

  /* ---- the Kaiser side */
  "10418822": { name: "KAISER DAVID KEITH", kind: "person", city: "Cuero", state: "TX" },
  "10418901": { name: "KAISER MARTHA ANNE", kind: "person", city: "Victoria", state: "TX" },
  "10420644": { name: "KAISER FAMILY TRUST", kind: "trust", city: "Victoria", state: "TX" },

  /* ---- the reader's own name, on rows that are not theirs */
  "10419044": { name: "PLATIS GEORGE N", kind: "person", city: "Houston", state: "TX" },
  "10419077": { name: "PLATIS ANNA MARIE", kind: "person", city: "Austin", state: "TX" },

  /* ---- the Cook side, which is why two of the units carry the name */
  "10419533": { name: "COOK BILLY RAY", kind: "person", city: "Goliad", state: "TX" },
  "10419587": { name: "COOK PATRICIA ANN", kind: "person", city: "Victoria", state: "TX" },

  /* ---- everybody else on the roll */
  "10419412": { name: "SCHROEDER WALTER H", kind: "person", city: "Cuero", state: "TX" },
  "10419480": { name: "BROCK LORENE", kind: "person", city: null, state: null },
  "10419640": { name: "ZAPATA HECTOR M", kind: "person", city: "Corpus Christi", state: "TX" },
  "10419703": { name: "ZAPATA ROSA & MANUEL", kind: "person", city: "Beeville", state: "TX" },
  "10419766": { name: "WEATHERFORD SUSAN D", kind: "person", city: "Dallas", state: "TX" },
  "10419812": { name: "NAVARRO LUIS", kind: "person", city: "Cuero", state: "TX" },
  "10419877": { name: "HUTCHINS MARY BETH", kind: "person", city: "Katy", state: "TX" },
  "10419930": { name: "HUTCHINS DONALD W", kind: "person", city: "Tomball", state: "TX" },
  "10420015": { name: "BRIGHTWELL SAMUEL", kind: "person", city: "Seguin", state: "TX" },
  "10420088": { name: "TIJERINA CARLOS A", kind: "person", city: "Kenedy", state: "TX" },
  "10420134": { name: "ODELL FRANCES J", kind: "person", city: "Shiner", state: "TX" },
  "10420190": { name: "ODELL THOMAS EARL", kind: "person", city: "Hallettsville", state: "TX" },
  "10420233": { name: "VANCE KATHRYN", kind: "person", city: "Cuero", state: "TX" },
  "10420301": { name: "LOZANO MIGUEL A", kind: "person", city: "Runge", state: "TX" },

  /* ---- not people, and the page never addresses them as though they were */
  "10420455": { name: "CROFT EXPLORATION LLC", kind: "company", city: "Houston", state: "TX" },
  "10420512": { name: "BLUESTEM ROYALTY PARTNERS LP", kind: "company", city: "Fort Worth", state: "TX" },
  "10420588": { name: "SANDHILL MINERALS LLC", kind: "company", city: "Midland", state: "TX" },

  /* ---- the working-interest party. Not a co-owner. See the header. */
  "10420800": { name: "HURD ENTERPRISES LTD", kind: "operator", city: "San Antonio", state: "TX" },
};

/**
 * WHO IS ON WHICH LEASE, AND FOR WHAT SHARE.
 *
 * Keyed by the lease's report slug, which is the id every other module already
 * uses for a lease. `[owner number, percentage]` — the percentage is the share
 * as the roll expresses it, and `null` is a row filed with an interest the roll
 * does not put a fraction on.
 *
 * THE SHARES DO NOT SUM TO A HUNDRED, and should not be made to. The reader's
 * own interest is not in this list, the roll splits some rows across mineral
 * and royalty interests, and a fixture rounded until it totalled exactly 100%
 * would be the one thing an actual appraisal roll never does.
 */
const MEMBERSHIP: Record<string, [string, number | null][]> = {
  "290271-mccabe-etal-gu": [
    ["10419210", 8.41], ["10419288", 6.92], ["10419301", 6.92], ["10419355", 4.18],
    ["10420709", 5.55], ["10418822", 4.86], ["10418901", 4.86], ["10420644", 3.74],
    ["10419044", 3.11], ["10419077", 3.11], ["10419412", 2.68], ["10419480", 2.4],
    ["10419640", 2.05], ["10419703", 2.05], ["10419766", 1.92], ["10419812", 1.64],
    ["10419877", 1.5], ["10419930", 1.5], ["10420015", 1.22], ["10420088", 0.98],
    ["10420512", 7.6], ["10420588", 4.3], ["10420455", null], ["10420800", null],
  ],
  "295647-mccabe-etal-gu": [
    ["10419210", 8.41], ["10419288", 6.92], ["10419301", 6.92], ["10420709", 5.55],
    ["10418822", 4.86], ["10418901", 4.86], ["10420644", 3.74], ["10419044", 3.11],
    ["10419412", 2.68], ["10419640", 2.05], ["10419766", 1.92], ["10419877", 1.5],
    ["10420512", 7.6], ["10420588", 4.3], ["10420800", null],
  ],
  "290827-mccabe-etal-gu": [
    ["10419210", 8.41], ["10419288", 6.92], ["10419355", 4.18], ["10420709", 5.55],
    ["10418822", 4.86], ["10420644", 3.74], ["10419077", 3.11], ["10419480", 2.4],
    ["10419703", 2.05], ["10419812", 1.64], ["10419930", 1.5], ["10420015", 1.22],
    ["10420512", 7.6], ["10420800", null],
  ],
  "295750-mccabe-etal-gu": [
    ["10419210", 8.41], ["10419301", 6.92], ["10420709", 5.55], ["10418901", 4.86],
    ["10419044", 3.11], ["10419412", 2.68], ["10419766", 1.92], ["10420088", 0.98],
    ["10420588", 4.3], ["10420800", null],
  ],
  "294204-mccabe-etal-gu": [
    ["10419288", 6.92], ["10419355", 4.18], ["10418822", 4.86], ["10420644", 3.74],
    ["10419077", 3.11], ["10419640", 2.05], ["10419877", 1.5], ["10420134", 1.18],
    ["10420512", 7.6], ["10420800", null],
  ],
  "293026-mccabe-etal-gu": [
    ["10419210", 8.41], ["10419301", 6.92], ["10418822", 4.86], ["10419044", 3.11],
    ["10419480", 2.4], ["10419930", 1.5], ["10420190", 1.18], ["10420800", null],
  ],
  /* ---- the two COOK-KAISER units: the Cook side, the Kaisers, and a different
     set of neighbors. Deliberately a partly different cast, so switching lease
     in step 1 visibly changes who is on offer. */
  "292830-cook-kaiser-gu": [
    ["10419533", 9.14], ["10419587", 9.14], ["10418822", 4.86], ["10418901", 4.86],
    ["10420644", 3.74], ["10420233", 3.02], ["10420301", 2.55], ["10420088", 0.98],
    ["10419812", 1.64], ["10420015", 1.22], ["10420588", 4.3], ["10420800", null],
  ],
  "296278-cook-kaiser-gu": [
    ["10419533", 9.14], ["10419587", 9.14], ["10418901", 4.86], ["10420644", 3.74],
    ["10420233", 3.02], ["10420301", 2.55], ["10419640", 2.05], ["10420455", null],
    ["10420800", null],
  ],
  "kaiser-gas-unit": [
    ["10418822", 7.21], ["10418901", 7.21], ["10420644", 6.05], ["10419210", 3.38],
    ["10419412", 2.68], ["10420134", 1.18], ["10420190", 1.18], ["10420800", null],
  ],
  /* ---- the smallest unit on the record: six rows, and one of them is the
     operator. A lease where there is almost nobody to invite is a real case,
     and the empty-ish list is what tells the reader so. */
  "cook-gas-unit": [
    ["10419533", 11.4], ["10419587", 11.4], ["10420233", 3.02], ["10419480", 2.4],
    ["10420455", null], ["10420800", null],
  ],
};

/**
 * The leases, assembled.
 *
 * DERIVED FROM `leaseRecords`, not re-typed beside it. The name, number, county
 * and the reader's own value all come off the My Leases fixture, so the picker
 * in step 1 cannot name a lease the leases module does not have — or price it
 * differently. Only the membership above is this module's own.
 *
 * ORDERED BY WHAT THE READER HOLDS, highest first, which is the order the
 * leases module already uses. The lease worth the most is the one where a
 * co-owner conversation matters most.
 *
 * OWNERS ARE SORTED BY SHARE, LARGEST FIRST, with the unquantified rows last.
 * The card says so under the list — a reader scanning ninety names needs to
 * know whether the order means anything.
 */
export const inviteLeases: InviteLease[] = leaseRecords.map((record) => {
  const owners: CoOwner[] = (MEMBERSHIP[record.slug] ?? [])
    .map(([ownerNumber, interestPct]) => {
      const entry = ROSTER[ownerNumber];
      return {
        ownerNumber,
        name: entry.name,
        kind: entry.kind,
        city: entry.city,
        state: entry.state,
        interestPct,
      };
    })
    .sort((a, b) => (b.interestPct ?? -1) - (a.interestPct ?? -1));

  return {
    leaseId: record.slug,
    label: formatLeaseTitle(record.name, record.number),
    leaseName: record.name,
    leaseNumber: record.number,
    county: record.county,
    ownerValue: record.mvestimate,
    owners,
  };
});

/** How many individuals are on a lease — the people the reader might know. */
export function peopleOn(lease: InviteLease): number {
  return lease.owners.filter((owner) => owner.kind === "person").length;
}

/**
 * THE SENDER, AND THE TWO THINGS THE PAGE HAS TO ADMIT.
 *
 * BOTH NOTES ARE ON THE PAGE, not in a tooltip, because each one corrects an
 * assumption the page itself invites:
 *
 * `codeNote` — a code that looks official looks reserved. These are worked out
 * from the lease and the owner number rather than issued, so the same person
 * always gets the same code and a reprint matches the first print. Nothing is
 * written down: there is no invitation log, no status to come back to and no
 * credit ledger until a write store exists.
 *
 * `sendNote` — a page that writes an email looks like a page that sends one.
 * Mineral View does not post these, and that is a product decision rather than
 * a missing feature: a letter from a family member is trusted in a way a
 * mailshot from a company is not, and the roll carries a posting address but no
 * email address to send to.
 */
export const inviteSender = {
  name: leaseOwnerRecord.name,
  claimUrl: "mineralview.com/claim",
  /* THE REFERENCE'S OWN `code_note`, word for word. */
  codeNote:
    "Each code is worked out from the lease and that owner’s own number on the " +
    "appraisal roll, so the same person always gets the same code and a reprint " +
    "matches the first print. Nothing is reserved or recorded yet: this build " +
    "reads the public record and does not write to it, so there is no invitation " +
    "log, no status to come back to, and no referral credit ledger until that " +
    "store exists.",
  /*
   * THE REFERENCE'S `send_note` UP TO ITS LAST SENTENCE, which is this build's.
   *
   * Theirs ends "Print them, or download and send them however you already
   * reach the person" — naming two controls that page has and this one does
   * not. The reference generates its letters through an `/api/invite` route
   * that renders a printable document and a spreadsheet; there is no such route
   * here, so the paper row offers the letter as text to copy instead. The
   * sentence names what is actually on the card. Restore theirs when the route
   * lands, along with the Print and Download rows in `EmailStep`.
   *
   * The rest of the note is untouched, and the part that matters most is the
   * middle: WHY Mineral View does not send these. That is a product decision,
   * not a missing feature.
   */
  sendNote:
    "Mineral View does not post these for you. That is deliberate — a letter " +
    "from a family member reads as more trusted than a mailshot — and the " +
    "appraisal roll carries no email address, only a posting address. Copy them " +
    "into your own mail, or print them and send them however you already reach " +
    "the person.",
} as const;
