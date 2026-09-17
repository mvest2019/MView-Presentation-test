import type { FlowLease, OwnerRecord } from "./claim-types";

/**
 * FORMATTING AND DERIVATION, in one place.
 *
 * This replaced a fixtures module that computed the same figures from a
 * hard-coded lease list. The derivations survived the move and the data did
 * not: every total on steps 4 and 5 is still computed from the lease rows the
 * page is showing, so a stat tile cannot disagree with the table above it.
 */

/** `$9,268`. Whole dollars — no lease value in this flow carries cents. */
export function money(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * DECIMAL INTEREST EXACTLY AS SERVED — `0.78125`, not `0.78125000`.
 *
 * This used to be `toFixed(8)`, on the reasoning that division orders quote
 * interest to eight places. That is true of the documents and false of this
 * response: the endpoint sends `0.78125`, `0.012419`, `0.195413`, and padding
 * them wrote three zeros the roll never filed. On a figure whose whole job is
 * to be precise, invented digits are the one thing that must not be there —
 * and a reader comparing this column against a check stub cannot tell a served
 * zero from a printed one.
 *
 * `null` where the endpoint served nothing; the table prints an em dash rather
 * than a fabricated zero, which would read as "no interest".
 */
export function decimalInterest(value: number | null): string {
  return value === null ? "—" : String(value);
}

/** The summary figures steps 4 and 5 print, derived from the rows themselves. */
export function leaseTotals(leases: FlowLease[]) {
  const counties = [...new Set(leases.map((l) => l.county).filter(Boolean))];
  return {
    count: leases.length,
    producing: leases.filter((l) => l.producing).length,
    inactive: leases.filter((l) => !l.producing).length,
    operators: new Set(leases.map((l) => l.operator).filter(Boolean)).size,
    counties: counties.length,
    countyList: counties.join(", "),
    value: leases.reduce((sum, l) => sum + l.value, 0),
  };
}

/**
 * Step 5's order and its pre-selection: descending appraised value.
 *
 * `toSorted`, so the array the lease table is printing in roll order is not
 * reordered underneath it.
 */
export function byValueDesc(leases: FlowLease[]): FlowLease[] {
  return leases.toSorted((a, b) => b.value - a.value);
}

/**
 * A lease's stable identity within the flow.
 *
 * NOT the lease number: it is `null` outside the picked record's own county,
 * and it is not unique across counties either. County + name is what the
 * backend itself keys a lease on.
 */
export function leaseKey(lease: FlowLease): string {
  return `${lease.county}|${lease.name}`;
}

/**
 * A ROLL RECORD'S IDENTITY — county, name AND address, all three.
 *
 * NOT THE ADDRESS ALONE, which is what step 3's ticks used to be keyed on. Two
 * different owner names genuinely share one address: "RAYMOND SMITH" and
 * "SMITH RAYMOND E" are two records at 1200 Ranch Rd, and they are two separate
 * claims. Keyed on address, ticking one silently ticked the other.
 */
export function recordKey(record: OwnerRecord): string {
  return `${record.county}|${record.name}|${record.address}`;
}

/**
 * ONE MAILING ADDRESS, SPELLED ANY OF THE WAYS THE ROLLS SPELL IT.
 *
 * Each county types its own roll, so the same doorstep arrives twice:
 *
 *   Bee       "8800 S HARLEM AVE TRLR 1111, BRIDGEVIEW, IL 60455"
 *   Live Oak  "8800 S HARLEM AVE TRLR 1111 BRIDGEVIEW IL 60455 1995"
 *
 * Same place. One has commas, the other has the ZIP+4 run on without its
 * hyphen. Step 3 drew them as two rows, and — because only one of them was the
 * address that was searched — badged the second "different address, we post a
 * code", which told the reader their own address was somebody else's.
 *
 * TWO NORMALISATIONS, BOTH NARROW:
 *
 *   punctuation  case and separators are typography, never identity
 *   ZIP+4        a trailing 4-digit group after a 5-digit ZIP is the +4 written
 *                without its hyphen
 *
 * The ZIP rule is anchored at the END and requires a 5-digit ZIP in front of
 * it, which is what keeps it from eating a unit number: "100 MAIN ST APT 5" and
 * "100 MAIN ST APT 9" are different homes and stay different keys. Verified
 * against the roll — it collapses Aasen Ryan R's two spellings to one and
 * leaves Smith Raymond's two genuinely different addresses as two.
 *
 * Deliberately NOT a general address parser. Street-type synonyms (AVE/AVENUE),
 * directionals and misspellings are left alone: merging two rows that are not
 * the same place would hide a record the reader needs to see, which is the
 * worse failure of the two.
 */
export function addressKey(address: string): string {
  return address
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(\d{5}) \d{4}$/, "$1");
}

/**
 * Tokens that mean "still in the street half". Walking back from the state
 * code, the first of these ends the city — everything before it is address, not
 * place name.
 *
 * A DIGIT IS THE OTHER STOPPER, and between them they cover the roll's shapes:
 * "PO BOX 446 OLNEY" stops on `446`, "8800 S HARLEM AVE TRLR 1111 BRIDGEVIEW"
 * stops on `1111`, "399 MESA DR VAL VERDE" stops on `DR` and keeps both words
 * of the city.
 */
const STREET_WORDS = new Set([
  "ST",
  "STREET",
  "RD",
  "ROAD",
  "DR",
  "DRIVE",
  "AVE",
  "AVENUE",
  "BLVD",
  "LN",
  "LANE",
  "HWY",
  "HIGHWAY",
  "PKWY",
  "CT",
  "COURT",
  "CIR",
  "CIRCLE",
  "TRL",
  "TRAIL",
  "WAY",
  "PL",
  "PLACE",
  "LOOP",
  "RUN",
  "PASS",
  "BEND",
  "TRLR",
  "APT",
  "STE",
  "SUITE",
  "UNIT",
  "BOX",
  "PO",
  "RR",
  "FM",
  "CR",
  "N",
  "S",
  "E",
  "W",
  "NE",
  "NW",
  "SE",
  "SW",
]);

/**
 * "Lampasas, TX" out of a roll address — or `null` when it cannot be found.
 *
 * ── IT READS FROM THE END, NOT FROM THE COMMAS ──
 *
 * Roll addresses are one unstructured string and they arrive in three shapes,
 * all of them real in the live data:
 *
 *   3 parts  "%J & NANCY HOLLIMAN TSTEES 8833 TRADEWAY ST, SAN ANTONIO, TX 78217"
 *   2 parts  "PO BOX 446 OLNEY, TX 76374-0446"      ← street and city mashed
 *   1 part   "8800 S HARLEM AVE TRLR 1111 BRIDGEVIEW IL 60455 1995"
 *
 * This used to require the three-part form and return `null` for the other two,
 * on the grounds that "STREET CITY" cannot be split without a gazetteer. The
 * cost of that was worse than the risk it avoided: `maskedAddress` falls back
 * to printing the address UNCHANGED, so step 2's list showed a couple of
 * records masked to a city and every other one with its full street line — the
 * exact doorsteps the mask exists to keep off a list of 1,153 strangers, and a
 * list that looked broken besides.
 *
 * The tail is structured even when the head is not: ZIP, then a two-letter
 * state, then the city. So it strips the ZIP, takes the state, and walks back
 * word by word until it meets a digit or a street word — which is where the
 * city begins. No gazetteer, and it does not have to guess where the STREET
 * starts, only where it stops.
 *
 * ── IT STILL RETURNS `null` RATHER THAN GUESSING ──
 *
 * No two-letter state at the end means no anchor to walk back from, and an
 * "UNKNOWN" or a bare name is exactly that. `maskedAddress` prints those as
 * they are, which for a string with no street in it is the honest answer.
 */
export function mailCity(address: string): string | null {
  /* THE COMMAS ARE THROWN AWAY, not parsed. They are the part that varies
     between the three shapes; the tail is the part that does not. */
  const words = address
    .toUpperCase()
    .replace(/,/g, " ")
    /* ZIP, ZIP+4, and the run-on "60455 1995" the rolls also produce. */
    .replace(/\b\d{5}(-\d{4})?( \d{4})?\s*$/, "")
    .split(/\s+/)
    .filter(Boolean);

  const state = words[words.length - 1];
  if (!state || !/^[A-Z]{2}$/.test(state)) return null;

  const city: string[] = [];
  for (let i = words.length - 2; i >= 0 && city.length < 3; i--) {
    const word = words[i];
    if (/\d/.test(word) || STREET_WORDS.has(word)) break;
    city.unshift(word);
  }

  if (city.length === 0) return null;
  return `${city.join(" ")}, ${state}`;
}

/**
 * The street half hidden, leaving the city — step 2 shows where a record's mail
 * GOES without printing a stranger's doorstep.
 *
 * WHEN THE CITY CANNOT BE ISOLATED IT RETURNS THE ADDRESS UNCHANGED, and that
 * is deliberate. A "••••" prefix on a string that still contains the street is
 * worse than no mask at all: it tells the reader something has been hidden when
 * it has not. These addresses are public record data either way — the mask is a
 * courtesy, and a courtesy that lies is not one.
 */
export function maskedAddress(address: string): string {
  const city = mailCity(address);
  return city ? `•••• ${city}` : address;
}
