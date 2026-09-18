import { financialsSeries } from "../../_lib/financials-series";
import {
  formatAcres,
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
  formatDecimalInterest,
  formatDollars,
} from "../../_lib/lease-format";
import { portfolioSummary } from "../../_lib/lease-totals";
import { monthLabel, shortMonthLabel } from "../../_lib/months";
import { gasPriceAt, OIL_PRICE } from "../../_lib/price-deck";
import { demoOwner } from "../../../../_lib/portal-demo-data";
import type {
  Explainer,
  ExplainerBullet,
} from "../_components/explainer-drawer";
import type { LeaseReport } from "./lease-report";

/**
 * WHAT EACH OF THE LEASE REPORT'S SIX FIGURES MEANS.
 *
 * ── THESE SIX MOVE WITH THE SCOPE SWITCH, SO THE PANELS TAKE IT TOO ──
 *
 * Four of the six tiles are printed at "your share" or at "whole lease"
 * depending on a control above them, and the difference between the two is the
 * reader's entire decimal interest. A panel that explained the figure without
 * saying which of the two it was explaining would be the one place on the page
 * where the scope is silent — exactly where it matters most. Every builder here
 * takes `scope` and names it in the first sentence.
 *
 * The two that do not move — the county roll and the well/acre line — take it
 * anyway and ignore it, so the call site never has to remember which is which.
 *
 * ── EVERY FIGURE IS READ OFF THE REPORT, NOT RETYPED ──
 *
 * Same rule as the reservoir panels: a provenance panel carrying its own copy
 * of a number is the one most likely to be wrong and least likely to be caught.
 */

export type FigureScope = "share" | "lease";

/** The tiles hold the owner's figures; "whole lease" divides back out. */
function scale(scope: FigureScope, interest: number): number {
  return scope === "share" ? 1 : 1 / interest;
}

function scopeWords(scope: FigureScope): string {
  return scope === "share" ? "your share" : "the whole lease";
}

/** The sentence every scoped panel opens its second section with. */
function scopeNote(report: LeaseReport, scope: FigureScope): string {
  const interest = formatDecimalInterest(report.lease.decimalInterest);
  return scope === "share"
    ? `This is at YOUR decimal of ${interest} — the figure that should reconcile with a statement.`
    : `This is the WHOLE LEASE, before any decimal is applied. Your own share of it is ${interest} of this; switch the control above the tiles to see that instead.`;
}

/* ──────────────────────────────────────────── 1 · last posted month ─────── */

export function leaseLastMonthExplainer(
  report: LeaseReport,
  scope: FigureScope,
): Explainer {
  const factor = scale(scope, report.lease.decimalInterest);

  return {
    tone: "money",
    title: "Why the newest month here is months old",
    subtitle: "The state files in arrears · this is the last one it has",
    stats: [
      {
        label: `Last posted month, ${scopeWords(scope)}`,
        value: formatDollars(report.lastMonthShare * factor),
        sub: report.lastMonthLabel,
      },
      {
        label: "The state runs behind by",
        value: `${formatCount(report.stateBehindMonths)} months`,
        sub: "typical for this commission",
      },
      {
        label: "Of your record that month",
        value: `${report.shareOfRecordLastMonth.toFixed(1)}%`,
        sub: `across ${portfolioSummary.leaseCount} leases`,
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The most recent month the commission has actually posted for this lease — ${report.lastMonthLabel} — priced at what that month cleared. It is not last month on the calendar, and no portal can make it so: operators report to the state in arrears and the state publishes after that.`,
      },
      {
        heading: "What it means for you",
        body: `${scopeNote(report, scope)} It is the single most recent hard data point on this page: everything after ${report.lastMonthLabel} is a model, and everything before it is a filing. If you have been paid for a later month than this one, your operator is simply ahead of the state's publication — that is normal and not a discrepancy.`,
      },
      {
        heading: "What this is built on",
        aside: `${report.postedMonths} posted months`,
        bullets: [
          `The lease's filed volumes for ${report.lastMonthLabel}, at the price that month settled rather than at a flat average.`,
          "Prices are NET — after gathering, treating and the basis differential, not the screen price on the ticker above.",
          `About ${formatCount(report.stateBehindMonths)} months of lag is what this record shows between the newest month anywhere on it and the newest month filed for this lease.`,
          "A month can be restated after it is first published; where that happens this figure moves with it.",
        ],
      },
    ],
    whatToDo:
      "Use it to sanity-check a statement from the same month, not to predict the next one. One month is the noisiest figure on this page — a single well going down for maintenance moves it more than anything about the rock.",
    tags: [scope === "share" ? "your decimal" : "whole lease", "filed"],
    footnote:
      "The newest month the commission has published for this lease, priced at settlement. Your operator's own statement may cover a later month; that is publication lag, not a difference in the record.",
  };
}

/* ─────────────────────────────────────────── 2 · this year so far ───────── */

export function leaseYearExplainer(
  report: LeaseReport,
  scope: FigureScope,
): Explainer {
  const factor = scale(scope, report.lease.decimalInterest);

  return {
    tone: "money",
    title: "Twelve filed months, not a calendar year",
    subtitle: `A rolling window ending ${report.lastPosting}`,
    stats: [
      {
        label: `Twelve months, ${scopeWords(scope)}`,
        value: formatDollars(report.yearToDateShare * factor),
        sub: `${report.trailingFrom} – ${report.trailingTo}`,
      },
      {
        label: "Gas over the window",
        value: `${formatCompactVolume(report.trailingGas)} MCF`,
        sub: "whole lease",
      },
      {
        label: "Monthly decline",
        value: `${report.declinePerMonth.toFixed(1)}%`,
        sub: "compounded across the window",
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The last twelve FILED months added up — ${report.trailingFrom} through ${report.trailingTo}. It is a rolling window, not January-to-date: a calendar year would be four months of data for most of the spring, and that tells a reader nothing about a lease.`,
      },
      {
        heading: "What it means for you",
        body: `${scopeNote(report, scope)} Twelve months is the shortest window that cancels the seasonal swing — gas clears well over a dollar more in January than in May on this deck, so any shorter window mostly measures the calendar. Across this window the lease declined about ${report.declinePerMonth.toFixed(1)}% a month compounded.`,
      },
      {
        heading: "What this is built on",
        aside: `${report.trailingFrom} – ${report.trailingTo}`,
        bullets: [
          "Each month priced at what it settled, then summed — not the average price times the total volume, which would flatter a lease whose best months were winter ones.",
          `Both products: ${formatCompactVolume(report.trailingGas)} MCF of gas and ${formatCompactVolume(report.trailingOil)} BBL of liquids.`,
          `The strongest month in the window was ${report.strongestMonth} and the thinnest ${report.thinnestMonth}.`,
          "The window moves as the state publishes, so this figure changes when a new month lands even if nothing about the lease does.",
        ],
      },
    ],
    whatToDo:
      "Compare it with the same window a year back rather than with the calendar year. A lease on decline will be down year on year and that is the curve behaving, not a problem.",
    tags: [scope === "share" ? "your decimal" : "whole lease", "rolling 12"],
    footnote:
      "The twelve most recent filed months, each priced at settlement. It is not a tax year, it is not to-date from January, and it will move when the next month is published.",
  };
}

/* ────────────────────────────────────────────── 3 · gas filed to date ───── */

export function leaseGasExplainer(
  report: LeaseReport,
  scope: FigureScope,
): Explainer {
  const factor = scale(scope, report.lease.decimalInterest);

  return {
    tone: "activity",
    title: "Everything this lease has ever filed",
    subtitle: "Lifetime volumes · posted months only",
    stats: [
      {
        label: `Gas, ${scopeWords(scope)}`,
        value: `${formatCompactVolume(report.gasFiled * factor)} MCF`,
        sub: `${formatCount(report.postedMonths)} posted months`,
      },
      {
        label: `Liquids, ${scopeWords(scope)}`,
        value: `${formatCompactVolume(report.oilFiled * factor)} BBL`,
        sub: "oil and condensate together",
      },
      {
        label: "Of the gas the model expects",
        value: `${report.gasProducedPercent.toFixed(1)}%`,
        sub: "already filed",
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `Every month the commission has posted for this lease since ${report.firstPosting}, added up — ${formatCount(report.postedMonths)} of them, through ${report.lastPosting}. A lifetime figure, so it does not move when a price does; it moves only when the state publishes another month.`,
      },
      {
        heading: "What it means for you",
        body: `${scopeNote(report, scope)} Set against the model's total for these wells, ${report.gasProducedPercent.toFixed(1)}% of the gas has already been filed — which is the figure that says whether you are looking at a lease near the start of its life or near the end of it.`,
      },
      {
        heading: "What this is built on",
        aside: `since ${report.firstPosting}`,
        bullets: [
          "Volumes as posted at the lease. The state files production at the lease, not at the well, so where a lease has several holes nobody has measured which made what.",
          "Not adjusted for shrinkage, fuel or line loss between the wellhead and the sales meter — the sales volume on a statement can be a few percent under this.",
          "Oil and condensate are one figure because the commission reports them as one stream.",
          "The first month counted is the first with a volume on it, not the spud date or the completion date.",
        ],
      },
    ],
    whatToDo:
      "Read the percentage before the total. A large lifetime volume with 90% already filed is a smaller asset than a modest one with 30% filed, and the total on its own cannot tell you which you have.",
    tags: [scope === "share" ? "your decimal" : "whole lease", "filed only"],
    footnote:
      "Summed from the monthly filings for this lease. Volumes are as posted by the commission and are not reduced for shrinkage, fuel or line loss.",
  };
}

/* ───────────────────────────────────────────────────── 4 · the value ────── */

export function leaseValueExplainer(
  report: LeaseReport,
  scope: FigureScope,
): Explainer {
  const factor = scale(scope, report.lease.decimalInterest);

  return {
    tone: "models",
    title: "An estimate, and what the range is doing there",
    subtitle: "Modelled from the curve and a fixed price deck",
    stats: [
      {
        label: `Value, ${scopeWords(scope)}`,
        value: formatCompactDollars(report.yourValue * factor),
        sub: `${formatCompactDollars(report.yourValueLow * factor)} – ${formatCompactDollars(report.yourValueHigh * factor)}`,
      },
      {
        label: "Per acre",
        value: formatCompactDollars(report.valuePerAcre),
        sub: `over ${formatAcres(report.lease.acres)} acres`,
      },
      {
        label: "Of your whole record",
        value: `${report.shareOfRecordValue.toFixed(1)}%`,
        sub: `ranked ${report.rankByValue} of ${report.total}`,
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: "What the remaining production is modelled to be worth: the decline curve for these wells, run forward, priced on a fixed deck and taken to your decimal. It is an MVestimate and NOT an appraisal — nobody has offered this, and it is not what a buyer would necessarily pay.",
      },
      {
        heading: "What it means for you",
        body: `${scopeNote(report, scope)} The range is the honest part. Two things move it that are not in any public record — this operator's own deductions, and where the basis differential sits month to month — so a single number would claim a precision nobody has. Read the band, not the midpoint.`,
      },
      {
        heading: "What this is built on",
        aside: `ranked ${report.rankByValue} of ${report.total}`,
        bullets: [
          "The curve is fitted to this lease's own filed history, not to a type curve for the formation.",
          "Prices are a fixed forward deck held flat, so the estimate does not chase the ticker on the header.",
          "Nothing here assumes a new well, a recompletion or a workover — it is the existing holes declining.",
          `The county's own roll for your interest is ${formatCompactDollars(report.countyYourInterest)}, which is ${report.countyAgreementPercent.toFixed(1)}% of this figure — the tile beside this one.`,
        ],
      },
    ],
    whatToDo:
      "Treat it as a scale rather than a price. If you are actually considering a sale, the range and the county roll beside it are two independent reads and the gap between them is worth understanding before anybody quotes you a third.",
    tags: ["modelled", "not an appraisal", "range"],
    footnote:
      "MVestimate — a model over this lease's filed history at a fixed price deck. It is an estimate, it is not an appraisal, and it is not an offer from anybody to buy.",
  };
}

/* ────────────────────────────────────────────── 5 · county appraised ───── */

export function leaseCountyExplainer(
  report: LeaseReport,
  _scope: FigureScope,
): Explainer {
  void _scope;

  return {
    tone: "record",
    title: "What the county says it is worth",
    subtitle: "A tax roll · a different purpose and a different year",
    stats: [
      {
        label: "County, your interest",
        value: formatCompactDollars(report.countyYourInterest),
        sub: `roll year ${portfolioSummary.rollYear}`,
      },
      {
        label: "Of the model's figure",
        value: `${report.countyAgreementPercent.toFixed(1)}%`,
        sub: formatCompactDollars(report.yourValue),
      },
      {
        label: "Gross valuation",
        value: formatCompactDollars(report.grossValuation),
        sub: "the whole lease",
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The appraisal district's own value for your interest in this lease, as filed on the ${portfolioSummary.rollYear} roll. It is the number your ad valorem tax is worked out from, and it is the only figure on this page that comes from a public authority rather than from a model.`,
      },
      {
        heading: "What it means for you",
        body: `It sits at ${report.countyAgreementPercent.toFixed(1)}% of the model's estimate, and a gap either way is ordinary rather than alarming. A roll is struck once a year against prices as at one date, and it is assessing for TAX — a purpose with its own statutory method — not asking what somebody would pay. Two numbers built for different questions should not be expected to agree.`,
      },
      {
        heading: "What this is built on",
        aside: `roll year ${portfolioSummary.rollYear}`,
        bullets: [
          "The district's filed value for this interest, not a share of a wider parcel worked back out.",
          "Struck as at the roll's own valuation date, so it lags a moving price by up to a year.",
          "Districts differ in method between counties, so two of your leases in different counties are not on a like-for-like basis with each other.",
          "It is a gross taxable value — nothing in it is netted for what you actually receive.",
        ],
      },
    ],
    whatToDo:
      "If the county's figure looks high against the model and against your actual receipts, that is a protest worth filing with the district. The deadline is set by the district, not by this record.",
    tags: ["public record", "tax roll"],
    footnote:
      "As filed by the appraisal district for the stated roll year. Provided for comparison; it is not tax advice, and the district's own notice is the authority on what is owed and by when.",
  };
}

/* ──────────────────────────────────────── 6 · wells · acres · reservoir ── */

export function leaseShapeExplainer(
  report: LeaseReport,
  _scope: FigureScope,
): Explainer {
  void _scope;
  const { lease } = report;

  return {
    tone: "record",
    title: "The shape of the lease itself",
    subtitle: "How many holes, over how much ground, into which rock",
    stats: [
      {
        label: "Wells producing",
        value: `${lease.wells} of ${lease.wells}`,
        sub: lease.status.toLowerCase(),
      },
      {
        label: "Acres",
        value: formatAcres(lease.acres),
        /* "629.2 / 629.2 per well" on a one-well lease is the same number
           twice. Where there is nothing to divide, the county is the more
           useful second line. */
        sub:
          lease.wells > 1
            ? `${formatAcres(report.acresPerWell)} per well`
            : `${lease.county} County`,
      },
      { label: "Reservoir", value: lease.reservoir, sub: lease.operator },
    ],
    sections: [
      {
        heading: "What this is",
        body: `Three facts about the lease as the state records it: ${lease.wells} well${lease.wells === 1 ? "" : "s"} of ${lease.wells} producing, ${formatAcres(lease.acres)} acres of ground, and ${lease.reservoir} as the rock underneath. They are the frame everything else on the page hangs on.`,
      },
      {
        heading: "What it means for you",
        body: `Acres per well is the figure to look at — ${formatAcres(report.acresPerWell)} here, across ${lease.wells} hole${lease.wells === 1 ? "" : "s"}. Wide spacing means the ground is under-drilled relative to what the rock could carry, which is where a future well would come from; tight spacing means it is largely developed and the value is in the decline rather than in anything new.`,
      },
      {
        heading: "What this is built on",
        aside: lease.county,
        bullets: [
          "Well count is the wells filed against this lease, and the producing count is those with a volume in the newest filed month.",
          "Acreage is the lease's own filed acreage, not your net mineral acres — those depend on your deed and are not in this record.",
          "The reservoir is the lease's own filed rock; the reservoir report explains how a well gets grouped into it.",
          `The operator on file is ${lease.operator}, in ${lease.county} County.`,
        ],
      },
    ],
    whatToDo:
      "Check the acreage against your own deed before relying on it for anything. The filed acreage is the lease's; what you own inside it is a different number and only your deed has it.",
    tags: ["public record", "as filed"],
    footnote:
      "Well count, acreage, operator and reservoir as filed with the commission. Filed acreage is the lease's, not your net mineral acres.",
  };
}

/* ────────────────────────────── the band's "How it is built" ───────────── */

/**
 * THE PANEL BEHIND THE DARK BAND'S OWN LINK.
 *
 * ── IT IS THE LONGEST ONE IN THE PRODUCT AND IT SHOULD BE ──
 *
 * The valuation is the single figure a reader is most likely to act on and the
 * one least like a filing: no authority published it, nobody has offered it,
 * and it moves with a price deck this page holds fixed. The six tile panels
 * answer "what is this number"; this one has to answer "should I believe it",
 * which needs the trend the model was fitted to and the months it projects —
 * hence the two charts and the month-by-month evidence.
 *
 * ── THE CHARTS ARE THE FILED HISTORY, NOT THE FORECAST ──
 *
 * The value is a projection, so the honest thing to show under it is the record
 * the projection was fitted to. Twenty-four months of what the state actually
 * posted, at the reader's own decimal, is the evidence for whether the curve
 * ahead is credible; drawing the forecast itself would be the model vouching
 * for the model.
 */
export function leaseValueBuiltExplainer(report: LeaseReport): Explainer {
  const { lease } = report;
  const interest = formatDecimalInterest(lease.decimalInterest);

  /* Twenty-four filed months back from the newest, at the owner's decimal —
     the window the reference's own charts use. */
  const series = financialsSeries.byLease.find(
    (entry) => entry.slug === lease.slug,
  );
  const end = series?.filedThroughIndex ?? 0;
  const start = Math.max(0, end - 23);
  const labels: string[] = [];
  for (let index = start; index <= end; index += 1) {
    /* Short form: twenty-four of these run along one small card, and
       "September 2025" at either end of it is wider than the plot can
       spare. The reference prints "Jul 2024". */
    labels.push(shortMonthLabel(financialsSeries.firstMonth + index));
  }
  const slice = (values: number[]): number[] =>
    values.slice(start, end + 1).map((value) => value * lease.decimalInterest);

  const chartNote =
    "Your interest applied to each month the state has filed. The value model stores no day-to-day history, so this is the trend that drives it rather than the estimate itself.";

  const shown = report.forward.slice(0, 6);
  const remaining = report.forward.length - shown.length;

  /* ONE ARRAY, COUNTED WHERE IT IS RENDERED. The aside prints how many
     lines this section holds, and it used to count a second list written
     beside it — which was already wrong by one, because the "…and N more"
     row was in the rendered bullets and not in the tally. */
  const builtOn: ExplainerBullet[] = [
    ...shown.map((cell) => ({
      lead: cell.label,
      /* Full units, not the compact form: every one of these months
             rounds to "4K MCF", so the compact figure made six different
             rows print the same volume. `Math.round` because these are
             model outputs and carry a fractional tail that `formatCount`
             would otherwise print as "323.482 BBL". */
      text: ` — ${formatCount(Math.round(cell.gas))} MCF and ${formatCount(Math.round(cell.oil))} BBL whole-lease, your share `,
      tail: `${formatDollars(cell.shareLow)} – ${formatDollars(cell.shareHigh)}`,
    })),
    ...(remaining > 0
      ? [`…and ${remaining} more, listed in full on this page.`]
      : []),
    {
      lead: "The deck",
      text: ` — oil held at $${OIL_PRICE}/BBL and gas on a seasonal strip, so a winter month prices above a spring one on the same volume. A fifth of price movement moves the twelve-month total between `,
      tail: `${formatCompactDollars(report.forwardLowDeck)} and ${formatCompactDollars(report.forwardHighDeck)}`,
    },
    {
      lead: "The county",
      text: ` — the appraisal district's own figure for your interest is ${formatDollars(report.countyYourInterest)}, or ${report.countyAgreementPercent.toFixed(1)}% of this one. Two numbers built for different questions, which is why they are printed side by side rather than reconciled.`,
    },
    {
      lead: `Re-run on ${demoOwner.asOf}`,
      /* PER MCF, NOT PER MMBTU. The reference's own panel quotes a
             therm-based unit; this deck is struck per thousand cubic feet
             and the two differ by the gas's heat content, which is not on
             this record. Printing the reference's unit over this deck's
             number would be a conversion nobody performed. */
      text: ` against the model's own price path: oil $${OIL_PRICE.toFixed(2)}/BBL and gas $${gasPriceAt((financialsSeries.firstMonth + end + 1) % 12, end + 1, false).toFixed(3)}/MCF for ${report.nextMonthLabel}.`,
    },
  ];

  return {
    tone: "money",
    title: "Your value — how it is built",
    subtitle: `Estimate, not an appraisal · re-run ${demoOwner.asOf}`,
    stats: [
      {
        label: "Your share",
        /* IN FULL, unlike the three beside it. This is the figure the panel is
           about and the one a reader writes down; "$1.36M" is the right answer
           for a supporting stat and the wrong one for the headline. */
        value: formatDollars(report.yourValue),
        sub: "over six years",
      },
      {
        label: "Range",
        value: `${formatCompactDollars(report.yourValueLow)} – ${formatCompactDollars(report.yourValueHigh)}`,
        sub: "low and high case",
      },
      {
        label: "Whole-lease value",
        value: formatCompactDollars(report.grossValuation),
        sub: "before your interest",
      },
      {
        label: "Ranked",
        value: `${report.rankByValue} of ${report.total}`,
        sub: `${report.shareOfRecordValue.toFixed(1)}% of your record`,
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `Your value is ${formatDollars(report.yourValue)}. It is the model's SIX-YEAR cash-flow projection for this lease — what these wells still have to produce, priced on a fixed deck — multiplied by your own interest of ${interest} in it.`,
      },
      {
        heading: "What it means for you",
        body: `The model values the whole lease at ${formatDollars(report.grossValuation)}; you own a fraction of it, so your share is ${formatDollars(report.yourValue)}. Treat it as a range: the low and high cases put your share between ${formatDollars(report.yourValueLow)} and ${formatDollars(report.yourValueHigh)}. It is a forward-looking estimate of earnings — not an offer, and not a tax value.`,
      },
      {
        heading: "What this is built on",
        aside: `${builtOn.length} lines from the record`,
        bullets: builtOn,
      },
    ],
    charts: series
      ? [
          {
            title: "Gas behind your value — your share",
            window: `24 months to ${report.lastPosting}`,
            labels,
            values: slice(series.gas),
            unit: "MCF",
            tone: "gas",
            footnote: chartNote,
          },
          {
            title: "Oil behind your value — your share",
            window: `24 months to ${report.lastPosting}`,
            labels,
            values: slice(series.oil),
            unit: "BBL",
            tone: "oil",
            footnote: chartNote,
          },
        ]
      : undefined,
    whatToDo:
      "Nothing to do — it re-runs on its own every night. What moves it is the price path and this lease's production trend, both of which are on this page. The one thing it cannot tell you is whether you were PAID what you were owed; only your own statements show that.",
    tags: ["Estimate — not an appraisal"],
    footnote: `Matched on owner number AND name for roll year ${portfolioSummary.rollYear}, never on the number alone — an owner number is a county appraisal key and is reused. It is an estimate of future earnings, it is not an appraisal, and no part of it is an offer from anybody to buy.`,
  };
}
