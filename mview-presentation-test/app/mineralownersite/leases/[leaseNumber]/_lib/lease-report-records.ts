import { formatCount, formatDollars, formatLeaseTitle } from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { crowA2HCurve } from "./decline-curve-record";
import type { LeaseRecord } from "../../_lib/lease-types";
import type { LeaseReportRecord } from "./lease-report-types";

/**
 * THE PER-LEASE REPORT CONTENT.
 *
 * ── TWO LEASES ARE BUILT IN FULL; EIGHT ARE NOT, AND THAT IS THE DESIGN ──
 *
 * The prototype ships `app-lease-smith.html` (1,088 lines) for Smith Gas Unit
 * (305892), `app-lease-detail.html` (589) for Ledbetter (74318), and
 * `app-lease-generic.html` (50) for the remaining eight. That is not laziness in
 * the design — those two are the leases with a captured decline curve, a real
 * reservoir narrative and a wired well record. The other eight have real record
 * fields and nothing else, so the generic report prints what is known and says
 * "not captured yet" for the panels that need a curve.
 *
 * That split is preserved here rather than extrapolated. Inventing a reservoir
 * narrative and an EUR for eight leases would be exactly the invented-data the
 * rest of this module refuses — and the design's own copy points readers at the
 * two captured leases when they want to see the full thing.
 *
 * ── EVERY HARD FACT COMES FROM `leaseRecords` ──
 *
 * `lease` is the record from `_lib/lease-records.ts`, so operator, county, API,
 * district, volumes, decimal interest and both valuations are the SAME values
 * the lease table prints. Only what the table has no column for is added here:
 * first production, the reservoir narrative, the change rows, the forward ranges
 * and the gross whole-unit figures.
 */

const bee = (number: string) =>
  leaseRecords.find((lease) => lease.number === number)!;

/* ============================================================================
   SMITH GAS UNIT (305892) — the fully captured gas unit
   ============================================================================ */

const smithReport: LeaseReportRecord = {
  depth: "full",
  lease: bee("305892"),
  district: "02",
  firstProduction: "Jul 2003",
  wellsProducing: 1,
  operatorNote: "originally Chevron USA, Inc.",
  grossValuation: 1_100_000,
  /* The model's own output before the banner's rounding. See
     `EstimateExplainer` for the arithmetic this does NOT reconcile with. */
  exactGrossValuation: 1_099_456,
  /* The owner's appraised $3,510 ÷ DI 0.00538700. Our arithmetic, not a CAD
     figure — no appraisal roll publishes a whole-unit value, and the card that
     prints this says so beside it. */
  wholeUnitAppraised: 651_600,
  nextMonth: { label: "Aug 2026", low: 97, high: 159 },
  nextQuarter: { label: "Aug – Oct 2026", low: 290, high: 475 },
  changes: [
    {
      tone: "event",
      glyph: "▤",
      headline: "Production posted",
      body: "Bluestem filed this unit's month: 27,120 mcf gas + 133 bbl oil, the biggest posting across your four Smith units.",
    },
    {
      tone: "ok",
      glyph: "✓",
      headline: "Effect on your estimate: none.",
      body: "The posting sits on the expected decline curve, so the $8,700 held. A posting is a production fact, not a payment.",
    },
    {
      tone: "batch",
      glyph: "≡",
      headline: "Same batch:",
      body: "filed together by the same operator.",
      batch: ["423065", "267145", "508936"],
    },
  ],
  changeDetail: [
    "Bluestem filed this unit's monthly production on Jul 02, 2026 — 27,120 mcf of gas + 133 bbl, the biggest posting across your four Smith units, filed in the same batch as 423065 (37,610 mcf), 267145 and 508936. It sits on the expected decline curve, so your $8,700 estimate did not move — a posting is a production fact, not a payment. That is the whole event.",
    "Data check resolved on this record: this unit has a real, producing Bluestem gas well — 5L (API 42-025-71286). Two source fields are genuinely blank upstream, so we say so instead of guessing: acreage is not reported to the RRC for this unit, and the play is not classified in the state's play table. Neither gap affects the $8,700 estimate, which is built on the unit's real posted gas.",
    "Why two valuation numbers: ours is a forward market cash-flow projection; the county's is a conservative annual tax value of your interest that lags about a year. Different jobs — both real. We show both and flag big gaps; we never rescale your estimate to match the county's.",
  ],
  recovery: {
    eurOil: 15_452,
    producedOil: 15_072,
    reservesOil: 380,
    eurGas: 3_625_715,
    producedGas: 3_335_715,
    reservesGas: 290_000,
  },
  allocation: { splitComputed: "6 Aug 2026", curveResolved: "1 Feb 2026" },
  /* The one lease in the module with a published engine fit to read. */
  declineCurve: crowA2HCurve,
  compareWith: "74318",
  compareNote:
    "Ledbetter (74318) is oil-weighted (275,798 bbl EUR) with a bigger gross value; this unit is gas-weighted (3,625,715 mcf EUR) with the bigger share to you thanks to a 4× larger decimal interest.",
  ultra: {
    headline: "Your best lease is doing its job",
    body: "This gas unit keeps producing steadily — the biggest single piece of your record. Your share: the number above.",
  },
  essentials: {
    title: "Your most valuable lease",
    lede: "A natural-gas unit that keeps producing steadily — the biggest single piece of what you own.",
    rows: [
      {
        q: "What it's worth to you",
        /* Each figure is its own segment because each one blurs on its own in
           the claimed state — see `CopySegment`. */
        a: ["about ", { money: "$8,700" }, " over the next six years"],
      },
      {
        q: "Its place in your total",
        a: [
          "the largest piece of your ",
          { money: "$26,340" },
          " — your three other Smith units add about ",
          { money: "$4,100" },
          " more",
        ],
      },
      {
        q: "What just happened",
        a: [
          "Jul 02 — the operator posted a month of gas, right on the expected trend, so your number did not move",
        ],
      },
      { q: "What to do", a: ["nothing — this lease is doing its job"] },
    ],
  },
  reservoir: {
    name: "Blanco Creek (Wilcox Massive E)",
    shortName: "Wilcox",
    county: "Bee",
    extentBbox: [-98.0, 28.27, -97.58, 28.53],
    wellCount: 1,
    narrative: [
      "What it is: the Wilcox is a thick stack of ancient river-delta sands laid down when the Gulf Coast was building itself seaward, tens of millions of years ago. Under Bee County it sits deep and gas-charged.",
      'The "Massive E" in the field name is the driller\'s label for one of those stacked sand bodies. Wilcox sands are workhorse Gulf Coast producers: not flashy, but they flow for decades, which is exactly what this unit has done since Chevron drilled it in 2003.',
      "Why it matters to you: a 20-year-plus Wilcox gas tail is the steady-eddy kind of minerals ownership — long, shallow decline, few surprises, income that shows up as long as the well is kept open. The risk to watch isn't the rock running out suddenly; it's the operator deciding the tail is no longer worth maintaining. That's why the operator card and your Activities feed matter as much as the geology here.",
    ],
    totals: [
      { label: "EUR — est. ultimate recovery", value: "15,452 bbl · 3,625,715 mcf" },
      { label: "Produced to date", value: "15,072 bbl · 3,335,715 mcf" },
      { label: "Reserves — next 6 years", value: "380 bbl · 290,000 mcf" },
      { label: "Gas produced vs EUR", value: "3,335,715 / 3,625,715 mcf (92.0%)" },
      { label: "Oil produced vs EUR", value: "15,072 / 15,452 bbl (97.5%)" },
    ],
    changes: [
      {
        tone: "ok",
        glyph: "=",
        /* No headline: the badge in the card's corner already says "No changes
           this period", and repeating it as a bold lead-in said it twice. */
        headline: "",
        body: "No reservoir-level changes on record this cycle — no reclassification, no new completions into this rock, no play-table update. The one recent event on this unit (the Jul 02 production posting) is a lease-level fact; the volumes flowed through well 5L.",
      },
    ],
  },
  wells: [
    {
      name: "5L",
      api: "42-025-71286",
      status: "Producing",
      /* The reservoir tab's well row reads "Gas · Producing · latest posting
         27,120 mcf · Bluestem Oil and Gas, LP" — type and last posting, not
         just status. */
      wellType: "Gas",
      latestPosting: "27,120 mcf gas · 133 bbl oil",
      /* Vertical, completed 2003 — nothing filed, and nothing drawn. */
      surveyOnFile: false,
      completedYear: "2003",
      location: "28.507219, −97.861344",
      record: [
        { label: "Well number", value: "5L" },
        {
          label: "Wellbore profile",
          value: "Not reported (upstream gap — older completion)",
        },
        { label: "Well type", value: "Gas" },
        { label: "Status", value: "Producing" },
        { label: "Operator", value: "Bluestem Oil and Gas, LP" },
        { label: "Reservoir", value: "Blanco Creek (Wilcox Massive E)" },
        { label: "Surface location", value: "28.507219, −97.861344" },
        {
          label: "Depths (MD / TVD)",
          value: "Not available (upstream RRC gap — never a literal 0)",
        },
      ],
      flow: [
        { label: "Latest posting", value: "27,120 mcf gas · 133 bbl oil" },
        {
          label: "Reservoir reserves it will drain",
          value: "290,000 mcf · 380 bbl over six years",
        },
      ],
      changes: [
        {
          tone: "event",
          glyph: "▤",
          headline: "Well 5L carried this unit's posting:",
          body: "27,120 mcf gas + 133 bbl oil filed by Bluestem on Jul 02, 2026 — this unit's only wellbore, so the lease-level event and the well-level event are the same molecules. Status unchanged: Producing. No new completion, workover or status filing on this well this cycle.",
        },
      ],
    },
  ],
};

/* ============================================================================
   LEDBETTER (74318) — the oil-weighted lease with the captured curve
   ============================================================================ */

const ledbetterReport: LeaseReportRecord = {
  depth: "full",
  lease: bee("74318"),
  district: "06",
  firstProduction: "Aug 2019",
  wellsProducing: 1,
  operatorNote: "originally Brooks Petroleum Company",
  grossValuation: 2_900_000,
  /* $5,060 ÷ DI 0.00243700 — the same derivation as the Smith card. */
  wholeUnitAppraised: 2_076_000,
  nextMonth: { label: "Aug 2026", low: 95, high: 157 },
  nextQuarter: { label: "Aug – Oct 2026", low: 280, high: 465 },
  changes: [
    {
      tone: "event",
      glyph: "▤",
      headline: "Produced gas in months we can see",
      body: "the public record shows Ledbetter produced gas in Aug 2025, Nov 2025 and Feb 2026 — only your check stubs show whether you were paid for them.",
    },
    {
      tone: "ok",
      glyph: "✓",
      headline: "This quarter eased about 8%.",
      body: "Right on its decline curve — this lease has slowed on schedule since 2019, and nothing is wrong.",
    },
  ],
  changeDetail: [
    "This lease has produced since 2019 and made the most money in its first year. Wells naturally slow down over time, and this one is slowing right on schedule — nothing is wrong.",
    "The public record shows production in Aug 2025, Nov 2025 and Feb 2026. Production is not payment: the RRC record shows what came out of the ground, never what reached you. Comparing the two is what the Lease Audit does.",
  ],
  compareWith: "305892",
  compareNote:
    "Smith Gas Unit (305892) is gas-weighted (3,625,715 mcf EUR) with a 4× larger decimal interest, so more of it reaches you; this lease is oil-weighted (275,798 bbl EUR) with the bigger gross value.",
  ultra: {
    headline: "This lease is fine",
    body: "Ledbetter has produced since 2019 and is slowing right on schedule — nothing is wrong. Your share of what's left: the number above.",
  },
  essentials: {
    title: "What this lease means for you",
    lede: "This lease has produced since 2019 and made the most money in its first year. Wells naturally slow down over time, and this one is slowing right on schedule — nothing is wrong.",
    rows: [
      {
        q: "What it's worth to you",
        a: [
          "about ",
          { money: "$5,300" },
          " over the next six years — your slice of the whole lease's projected ",
          { money: "$2,900,000" },
        ],
      },
      {
        q: "Its place in your total",
        a: ["the second-largest piece of your ", { money: "$26,340" }],
      },
      {
        q: "What just happened",
        a: [
          "gas posted in Aug 2025, Nov 2025 and Feb 2026 — whether you were paid for them is on your check stubs, not the public record",
        ],
      },
      {
        q: "What to do",
        a: [
          "worth an audit — this is the lease with produced months to check against your statements",
        ],
      },
    ],
  },
  reservoir: {
    name: "Lake Marlow (Pettit, Upper)",
    shortName: "Pettit",
    county: "Cass",
    extentBbox: [-94.45, 32.87, -94.03, 33.09],
    wellCount: 1,
    narrative: [
      "What it is: the Pettit is a Lower Cretaceous limestone-and-sand interval across East Texas, and the Upper Pettit is its shallower productive bench. Under Cass County it produces oil with associated gas.",
      "This lease sits in the Haynesville/Bossier Shale play area, but it is not producing from the Haynesville itself — the Pettit is a shallower, older target that has been drilled here for decades.",
      "Why it matters to you: an oil-weighted Pettit lease tracks WTI far more closely than a gas unit does, so the month-to-month figures on this lease move with the oil price in a way the Smith units do not.",
    ],
    totals: [
      { label: "EUR — est. ultimate recovery", value: "275,798 bbl" },
      { label: "Weighting", value: "Oil-weighted — WTI matters more here than Nat Gas" },
    ],
    changes: [
      {
        tone: "event",
        glyph: "▤",
        headline: "Gas posted in three months we can see.",
        body: "Aug 2025, Nov 2025 and Feb 2026. No reclassification and no new completions into this rock.",
      },
    ],
  },
  wells: [
    {
      name: "1H",
      api: "42-067-51840",
      status: "Producing",
      wellType: "Oil",
      latestPosting: "399 mcf gas · 482 bbl oil",
      location: "32.977120, −94.240387",
      record: [
        { label: "Well number", value: "1H" },
        { label: "Well type", value: "Oil" },
        { label: "Status", value: "Producing" },
        { label: "Operator", value: "Caddo Pine Resources, LLC" },
        { label: "Reservoir", value: "Lake Marlow (Pettit, Upper)" },
        { label: "Surface location", value: "32.977120, −94.240387" },
      ],
      flow: [
        { label: "Latest posting", value: "399 mcf gas · 482 bbl oil" },
        { label: "Acres", value: "380" },
      ],
      changes: [
        {
          tone: "event",
          glyph: "▤",
          headline: "Well 1H carried the lease's postings",
          body: "This lease's only wellbore, so its events and the lease's events are the same. Status unchanged: Producing.",
        },
      ],
    },
  ],
};

/* ============================================================================
   THE OTHER EIGHT — the generic report
   ============================================================================ */

/**
 * Everything the record genuinely holds about a lease with no captured curve.
 *
 * DERIVED FROM `leaseRecords`, so it cannot drift from the lease table, and it
 * asserts nothing the source does not have: no EUR, no reservoir narrative, no
 * forward ranges. `depth: "generic"` is what every panel checks before deciding
 * whether it has something to draw.
 */
function genericReport(lease: LeaseRecord): LeaseReportRecord {
  const earning = lease.mvestimate > 0;
  const title = formatLeaseTitle(lease.name, lease.number);

  return {
    depth: "generic",
    lease,
    district: lease.district,
    firstProduction: "Not captured yet",
    wellsProducing: earning ? lease.wells : 0,
    grossValuation: 0,
    wholeUnitAppraised: 0,
    nextMonth: { label: "Aug 2026", low: 0, high: 0 },
    nextQuarter: { label: "Aug – Oct 2026", low: 0, high: 0 },
    changes: [
      {
        tone: "ok",
        glyph: "=",
        headline: "No captured events on this lease.",
        body: `The record holds ${title}'s operator, field, well and posted volumes. Its month-by-month history and decline curve are not captured in this build — Ledbetter (74318) and Smith Gas Unit (305892) are, and they show what this page becomes.`,
      },
    ],
    changeDetail: [],
    ultra: {
      headline: earning ? `${lease.name} is earning` : `${lease.name} is quiet`,
      body: earning
        ? "Its share of your record is the number above. Nothing about this lease needs you today."
        : `You still own it. The model projects no forward income at today's outlook, and the county values it at ${formatDollars(lease.countyAppraised)}.`,
    },
    essentials: {
      title: earning ? "What this lease means for you" : "This lease is paused",
      lede: earning
        ? `A ${lease.play === "Barnett Shale" ? "Barnett Shale" : lease.play} lease in ${lease.county} County, operated by ${lease.operator}.`
        : "Paused means little future income is projected — you still own it, and the county still values it.",
      rows: [
        {
          q: "What it's worth to you",
          /* Only the MVestimate carries the gate. The COUNTY's appraised value
             is public record and stays legible in the claimed state — the same
             rule the lease table follows in its money column. */
          a: earning
            ? [
                "about ",
                { money: formatDollars(lease.mvestimate) },
                " over the next six years",
              ]
            : [
                `no forward projection — the county appraises your interest at ${formatDollars(
                  lease.countyAppraised,
                )}`,
              ],
        },
        {
          q: "Where it is",
          a: [`${lease.county} County · RRC district ${lease.district}`],
        },
        {
          q: "What it produced",
          a: [
            `${formatCount(lease.production.gasMcf)} mcf gas · ${formatCount(
              lease.production.oilBbl,
            )} bbl oil (gross lease, not your share)`,
          ],
        },
        {
          q: "What to do",
          a: ["nothing — this lease's full report lands when its curve is captured"],
        },
      ],
    },
    reservoir: {
      name: lease.field,
      /* No captured reservoir, so the field name is the best short name there
         is — the peer-rank rows it feeds are "not available yet" anyway. */
      shortName: lease.field.split(" ")[0],
      county: lease.county,
      wellCount: lease.wells,
      narrative: [],
      totals: [
        { label: "Field", value: lease.field },
        { label: "Play", value: lease.play },
        { label: "County · district", value: `${lease.county} · RRC ${lease.district}` },
      ],
      changes: [
        {
          tone: "ok",
          glyph: "=",
          headline: "",
          body: "This reservoir's recovery figures and narrative are not captured in this build.",
        },
      ],
    },
    wells: [
      {
        name: lease.detail.split("well ")[1] ?? "—",
        api: lease.api,
        status: earning ? "Producing" : "Inactive",
        record: [
          { label: "API", value: lease.api },
          { label: "Status", value: earning ? "Producing" : "Inactive" },
          { label: "Operator", value: lease.operator },
          { label: "Reservoir", value: lease.field },
          { label: "RRC district", value: lease.district },
        ],
        flow: [
          {
            label: "Latest posting",
            value: `${formatCount(lease.production.gasMcf)} mcf gas · ${formatCount(lease.production.oilBbl)} bbl oil`,
          },
        ],
        changes: [],
      },
    ],
  };
}

const FULL_REPORTS: Record<string, LeaseReportRecord> = {
  "305892": smithReport,
  "74318": ledbetterReport,
};

/** The report for a lease number, or `undefined` if it is not on this record. */
export function getLeaseReport(
  leaseNumber: string,
): LeaseReportRecord | undefined {
  const full = FULL_REPORTS[leaseNumber];
  if (full) return full;
  const lease = leaseRecords.find((entry) => entry.number === leaseNumber);
  return lease ? genericReport(lease) : undefined;
}

/**
 * THE LEASE→LEASE PAGER. Reports page in the lease table's default order
 * (value, high to low), so "1 of 10" means the same thing on both screens.
 */
export function leaseReportNeighbours(leaseNumber: string) {
  const order = [...leaseRecords].sort((a, b) => b.mvestimate - a.mvestimate);
  const index = order.findIndex((lease) => lease.number === leaseNumber);
  if (index === -1) return null;
  return {
    position: index + 1,
    total: order.length,
    previous: index > 0 ? order[index - 1] : order[order.length - 1],
    next: index < order.length - 1 ? order[index + 1] : order[0],
  };
}
