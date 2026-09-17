import type { ClaimResult } from "../_api/claim-api";
import { recordKey } from "./claim-format";
import type {
  ClaimSet,
  CountyIndex,
  FlowLease,
  OwnerRecord,
} from "./claim-types";

/**
 * THE SAMPLE WALKTHROUGH'S DATA — invented records in the flow's own shapes.
 *
 * ── THESE FEED THE REAL STEPS, NOT A MOCK-UP OF THEM ──
 *
 * An earlier build drew five miniatures that resembled the screens. Resembling
 * is the problem: the preview and the flow drift the first time one of them is
 * restyled, and a reader who was shown a picture arrives at something subtly
 * different. So the dialog mounts `StepFind`, `StepPick`, `StepProve`,
 * `StepLeases` and `StepSuccess` themselves and these are what it hands them.
 *
 * ── THAT IS SAFE BECAUSE THE STEPS DO NOT FETCH ──
 *
 * Every call in this module lives in `claim-wizard.tsx`; the five steps take
 * the slice of state they render plus callbacks, and none of them imports the
 * API. Rendering one outside the wizard therefore cannot reach the network —
 * there is nothing in a step to reach it with. The dialog passes no-op
 * callbacks and marks the stage `inert`, so `onContinue` on step 4 — the one
 * that would post — cannot be reached by mouse, keyboard or assistive tech.
 *
 * ── THE DATA IS INVENTED, AND HAS TO BE ──
 *
 * A real name and a real appraised value in a demo would be someone's mineral
 * position shown to a stranger, and the portal's standing disclaimer —
 * "Illustrative — fictional data, not a real account" — would be false the
 * moment it sat under a real one.
 */

const lease = (
  name: string,
  number: string | null,
  operator: string | null,
  county: string,
  value: number,
  decimal: number | null,
): FlowLease => ({
  name,
  number,
  operator,
  county,
  value,
  decimal,
  producing: value > 0,
});

const PECOS_LEASES: FlowLease[] = [
  lease(
    "PECOS STATE 4102 (1 of 2)",
    "289199",
    "BTA Oil Producers, LLC",
    "Reeves",
    18400,
    0.03125,
  ),
  lease(
    "PECOS STATE 4102 (2 of 2)",
    "289198",
    "BTA Oil Producers, LLC",
    "Reeves",
    16250,
    0.03125,
  ),
  lease("WEST DRAW 12", "284897", "Apache Corp", "Reeves", 9310, 0.00875),
  lease("TOYAH BASIN 7", "284834", "Apache Corp", "Reeves", 4250, 0.00875),
];

const APT_LEASES: FlowLease[] = [
  lease("SAND HILLS UNIT B", "285838", "Apache Corp", "Ward", 8905, 0.00219),
  lease("SAND HILLS UNIT C", "285053", "Apache Corp", "Ward", 4000, 0.00219),
];

/** The picked record — Reeves, four leases, the address that was searched. */
const PECOS_ST: OwnerRecord = {
  name: "Anderson Mary L",
  address: "4120 PECOS ST, PECOS, TX 79772",
  county: "Reeves",
  leaseCount: 4,
  appraisedValue: 48210,
  operatorCount: 2,
  leases: PECOS_LEASES,
};

/**
 * A second spelling of the same person, ticked alongside the first.
 *
 * REEVES, like the first, because the walkthrough narrows the search to Reeves
 * and then takes both of these. A record in another county would vanish the
 * moment the filter was applied and the demo would tick a card that was no
 * longer on screen.
 */
const PECOS_APT: OwnerRecord = {
  name: "Anderson Mary Louise",
  address: "4120 PECOS ST APT 2, PECOS, TX 79772",
  county: "Reeves",
  leaseCount: 2,
  appraisedValue: 12905,
  operatorCount: 1,
  leases: APT_LEASES,
};

/** Same name, a different doorstep — left unticked on step 2. */
const MIDLAND_BOX: OwnerRecord = {
  name: "Anderson Mary L Est",
  address: "PO BOX 771, MIDLAND, TX 79702",
  county: "Ward",
  leaseCount: 1,
  appraisedValue: 3100,
  operatorCount: 1,
  leases: [lease("MIDLAND NORTH 3", null, null, "Ward", 3100, null)],
};

/**
 * THE REST OF THE NAME SEARCH — filler so step 2 opens on a real haul.
 *
 * A COMMON NAME MATCHES A LOT, which is the whole reason step 2 exists and the
 * reason the county filter is worth demonstrating. Three cards made the filter
 * look like a nicety; twenty makes it look like the tool it is.
 *
 * They carry one lease each and no numbers. Only the two records the
 * walkthrough actually takes need a full lease set — these exist to be scrolled
 * past and then filtered away.
 */
const filler = (
  name: string,
  address: string,
  county: string,
  value: number,
): OwnerRecord => ({
  name,
  address,
  county,
  leaseCount: 1,
  appraisedValue: value,
  operatorCount: 1,
  leases: [
    lease(`${county.toUpperCase()} UNIT`, null, null, county, value, null),
  ],
});

const OTHER_MATCHES: OwnerRecord[] = [
  filler("Anderson Mary", "1204 W 3RD ST, PECOS, TX 79772", "Reeves", 8400),
  filler("Anderson Mary A", "705 S CEDAR ST, PECOS, TX 79772", "Reeves", 6120),
  filler("Anderson Mary Jane", "212 E 8TH ST, PECOS, TX 79772", "Reeves", 4980),
  filler("Anderson Mary L Tr", "PO BOX 1442, PECOS, TX 79772", "Reeves", 15600),
  filler("Anderson M L", "1801 TEXAS AVE, MONAHANS, TX 79756", "Ward", 7250),
  filler(
    "Anderson Mary Beth",
    "300 N BETTY AVE, MONAHANS, TX 79756",
    "Ward",
    3310,
  ),
  filler("Anderson Mary E", "22 CALLE VERDE, BARSTOW, TX 79719", "Ward", 2870),
  filler("Anderson Mary Lou", "PO BOX 62, GRANDFALLS, TX 79742", "Ward", 5140),
  filler(
    "Anderson Mary C",
    "4400 N BIG SPRING ST, MIDLAND, TX 79705",
    "Midland",
    19800,
  ),
  filler(
    "Anderson Mary Ellen",
    "1701 W WALL ST, MIDLAND, TX 79701",
    "Midland",
    11250,
  ),
  filler("Anderson Mary K", "PO BOX 3308, MIDLAND, TX 79702", "Midland", 6640),
  filler(
    "Anderson Mary Ann",
    "902 ANDREWS HWY, MIDLAND, TX 79701",
    "Midland",
    9120,
  ),
  filler(
    "Anderson Mary Sue",
    "615 S GASTON ST, CRANE, TX 79731",
    "Crane",
    4410,
  ),
  filler("Anderson Mary T", "100 W 8TH ST, CRANE, TX 79731", "Crane", 3760),
  filler("Anderson Mary V", "PO BOX 907, CRANE, TX 79731", "Crane", 2980),
  filler("Anderson Mary W", "409 N ALFORD ST, CRANE, TX 79731", "Crane", 5530),
  filler("Anderson Mary Y", "77 COUNTY RD 302, CRANE, TX 79731", "Crane", 1990),
];

/**
 * THE SAME DOORSTEP ON A SECOND ROLL — what makes step 3 show its "Same
 * address · Reeves roll" badge rather than a plain other-address row. Ward
 * types the ZIP+4 run on and drops the commas; `addressKey` normalises the two
 * to one place, which is the case that badge exists for.
 */
const WARD_SPELLING: OwnerRecord = {
  name: "Anderson Mary L",
  address: "4120 PECOS ST PECOS TX 79772 1188",
  county: "Ward",
  leaseCount: 2,
  appraisedValue: 12905,
  operatorCount: 1,
  leases: APT_LEASES,
};

export const SAMPLE_COUNTIES: CountyIndex = {
  totalOwners: 1284630,
  pending: false,
  counties: [
    { name: "Reeves", owners: 18422 },
    { name: "Ward", owners: 9310 },
    { name: "Midland", owners: 24107 },
  ],
};

/** What the walkthrough types into the owner-name box, one key at a time. */
export const SAMPLE_NAME = "Anderson Mary L";

/** And into the county box, once the twenty results are on screen. */
export const SAMPLE_COUNTY = "Reeves";

/**
 * THE WHOLE NAME SEARCH — twenty records across four counties, the two the
 * walkthrough takes first so they are on screen without scrolling.
 */
export const SAMPLE_RESULTS: OwnerRecord[] = [
  PECOS_ST,
  PECOS_APT,
  MIDLAND_BOX,
  ...OTHER_MATCHES,
];

/** The same search narrowed to one county — what the filter step produces. */
export const SAMPLE_RESULTS_IN_COUNTY = SAMPLE_RESULTS.filter(
  (record) => record.county === SAMPLE_COUNTY,
);

export const SAMPLE_SELECTED = [PECOS_ST, PECOS_APT].map(recordKey);

export const SAMPLE_CLAIM_SET: ClaimSet = {
  records: [PECOS_ST, PECOS_APT],
  others: [WARD_SPELLING],
  all: {
    leases: [...PECOS_LEASES, ...APT_LEASES],
    leaseCount: 6,
    appraisedValue: 61115,
    countyCount: 2,
    countyList: "Reeves, Ward",
  },
};

/** Step 3's ticks — both picked records, and the Ward spelling of the first. */
export const SAMPLE_CONFIRMED = [PECOS_ST, PECOS_APT, WARD_SPELLING].map(
  recordKey,
);

export const SAMPLE_RESULT: ClaimResult = {
  successful_owners: [
    {
      ownername: "Anderson Mary L",
      claimed_leases_count: 4,
      failed_leases_count: 0,
      /* THE RECEIPT REPORTS PER ADDRESS, so the fixture has to as well.
         Without these the last screen prints "No address sent for this name"
         — a true statement about an incomplete fixture, and a confusing one in
         a walkthrough whose third screen was entirely about picking
         addresses. */
      addresses: [
        {
          address: "4120 PECOS ST, PECOS, TX 79772",
          status: "claimed",
          claimed_leases_count: 4,
          already_claimed_leases_count: 0,
        },
      ],
    },
    {
      ownername: "Anderson Mary Louise",
      claimed_leases_count: 2,
      failed_leases_count: 0,
      addresses: [
        {
          address: "4120 PECOS ST APT 2, PECOS, TX 79772",
          status: "claimed",
          claimed_leases_count: 2,
          already_claimed_leases_count: 0,
        },
      ],
    },
  ],
  failed_owners: [],
  summary: {
    total_owners_processed: 2,
    total_successful_owners: 2,
    total_failed_owners: 0,
  },
  claimedAt: "2026-07-20T14:32:00Z",
};

/**
 * THE SCRIPT — what each screen is called and how long it holds.
 *
 * DURATIONS ARE NOT UNIFORM, because the screens are not. Step 1 is four
 * fields and reads in a moment; step 4 is a lease table the reader is meant to
 * actually look at, and giving it the same five seconds as the search form
 * makes it the one screen nobody manages to read.
 */
export interface SampleCue {
  /** Rail label — the flow's own step names. */
  label: string;
  /** One line under the rail saying what is happening on screen. */
  caption: string;
  /** How long this screen holds before the walkthrough moves on, in ms. */
  hold: number;
}

export const SAMPLE_CUES: SampleCue[] = [
  {
    label: "Find",
    caption:
      "Type the owner name as it appears on your mail. County, lease and address only narrow a common name — none of them is required.",
    hold: 6000,
  },
  {
    label: "Pick",
    caption:
      "The roll spells one person several ways, and each spelling is its own record. Tick every one that is you — they move forward together.",
    hold: 7500,
  },
  {
    label: "Prove",
    caption:
      "Values appear here for the first time. The address is what separates you from someone with the same name, so this is the step that settles it.",
    hold: 8000,
  },
  {
    label: "Leases",
    caption:
      "Every lease those names hold statewide, not just the county you searched. The button under this table is the one that commits.",
    hold: 9000,
  },
  {
    label: "Claimed",
    caption:
      "The record is linked to your account. Nothing about who owns the minerals changed, and it is reversible from Settings.",
    hold: 8000,
  },
];
