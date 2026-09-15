import {
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
  formatDecimalInterest,
} from "../../_lib/lease-format";
import type { Explainer } from "../_components/explainer-drawer";
import type { WellReport } from "./well-report";

/**
 * WHAT EACH OF THE WELL REPORT'S SIX FIGURES MEANS.
 *
 * ── THE WORD THESE PANELS EXIST TO DEFEND IS "ALLOCATED" ──
 *
 * Texas files production at the LEASE. Where a lease has one hole those are the
 * same number; where it has several, nobody has measured which hole made what.
 * Four of these six tiles are therefore a lease figure allocated to a wellbore,
 * and a reader who takes them for a measurement of this hole has been misled by
 * a page that never said otherwise. Each panel says otherwise.
 *
 * ── THE TWO PHYSICAL ONES ARE THE ONLY MEASUREMENTS HERE ──
 *
 * "Best month it had" and "Open over" are the exceptions, and they are the most
 * useful figures on the row precisely because of it: what the hole could do when
 * it was new, and how much of it is actually connected to the rock.
 *
 * Every figure is read off the report rather than retyped — same rule as the
 * lease and reservoir panels.
 */

/** The "this is the lease's, split" sentence, which four of the six need. */
function allocationNote(report: WellReport): string {
  const wells = report.lease.wells;
  return wells === 1
    ? `This lease has ONE well, so the lease's filing and this wellbore's production are the same number — there is nothing to allocate and nothing being assumed.`
    : `This lease has ${wells} wells and the state files one volume for all of them, so this is the lease's figure split between them by filed volume. It is an allocation, not a measurement of this hole.`;
}

/* ──────────────────────────────────────────── 1 · gas filed, this well ─── */

export function wellGasExplainer(report: WellReport): Explainer {
  return {
    tone: "activity",
    title: "Why this says “allocated”, not “produced”",
    subtitle: "Texas files at the lease · this is the wellbore's share",
    stats: [
      {
        label: "Gas allocated",
        value: `${formatCompactVolume(report.gasFiled)} MCF`,
        sub: `${formatCount(report.allocatedMonths)} months`,
      },
      {
        label: "Wells on the lease",
        value: formatCount(report.lease.wells),
        sub: report.lease.wells === 1 ? "nothing to split" : "split by volume",
      },
      {
        label: "Per foot open",
        value: `${formatCount(Math.round(report.gasPerFootOpen))} MCF`,
        sub: `over ${formatCount(report.openFeet)} ft`,
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `Every month of gas filed against this wellbore since ${report.firstProduction}, added up. The commission publishes production at the LEASE rather than at the well, which is why this page says allocated throughout instead of implying a measurement nobody took at this hole.`,
      },
      {
        heading: "What it means for you",
        body: `${allocationNote(report)} The figure worth carrying away is the one under it: ${formatCount(Math.round(report.gasPerFootOpen))} MCF for every foot of open hole. That is the number that compares this completion with any other, and a raw volume never can.`,
      },
      {
        heading: "What this is built on",
        aside: `${formatCount(report.allocatedMonths)} allocated months`,
        bullets: [
          "The lease's filed monthly volumes, through the newest month the commission has published.",
          "Where the lease has several wells the split is by each well's own filed volume — the same split the money uses, so a well's share of the gas equals its share of the cash.",
          "Volumes are as posted and are not reduced for shrinkage, fuel or line loss.",
          `Gas per foot open uses this wellbore's own perforated length of ${formatCount(report.openFeet)} ft, not the total depth of the hole.`,
        ],
      },
    ],
    whatToDo:
      "Use gas per foot open when comparing this well with another, and the raw total only when you want to know what the hole has done in absolute terms. On a multi-well lease, treat the raw total as an apportionment.",
    tags: ["allocated", "whole lease volume"],
    footnote:
      "Allocated from the lease's filed production. The commission reports at the lease level; no public filing states what an individual wellbore on a multi-well lease produced.",
  };
}

/* ─────────────────────────────────────────────────────── 2 · oil filed ─── */

export function wellOilExplainer(report: WellReport): Explainer {
  const yield_ = Math.round(report.oilYield);

  return {
    tone: "activity",
    title: "Oil and condensate, counted together",
    subtitle: "One liquid stream · allocated to this wellbore",
    stats: [
      {
        label: "Liquids allocated",
        value: `${formatCompactVolume(report.oilFiled)} BBL`,
        sub: `through ${report.newestFiledMonth}`,
      },
      {
        label: "Yield",
        value: `${formatCount(yield_)} BBL`,
        sub: "per thousand MCF of gas",
      },
      {
        label: "Of the liquids the model expects",
        value: `${report.oilProducedPercent.toFixed(1)}%`,
        sub: "already filed",
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The liquid filed against this wellbore — oil and condensate in one figure, because the state posts them as one stream and the operator sells them on one ticket. At ${formatCount(yield_)} barrels per thousand MCF this is a gas well with liquids in it rather than an oil well.`,
      },
      {
        heading: "What it means for you",
        body: `${allocationNote(report)} Liquids are a small part of the volume and a much larger part of the cash — a barrel clears many times what an MCF does — so this line carries more of what you are paid than its size on a volume chart suggests.`,
      },
      {
        heading: "What this is built on",
        aside: `through ${report.newestFiledMonth}`,
        bullets: [
          "Condensate is not separated out: it drops from the gas at the separator and is sold as oil, so splitting the two would invent a division the record does not make.",
          `The yield is this wellbore's own allocated liquids over its allocated gas — ${formatCount(yield_)} BBL per thousand MCF — not a field average.`,
          "Barrels are as posted at the lease, before any gravity or transport adjustment on the sales ticket.",
          "A yield that moves month to month is usually separator conditions changing, not the rock.",
        ],
      },
    ],
    whatToDo:
      "Read this next to the gas figure rather than on its own — the two move together, and the ratio between them says more about the completion than either does alone.",
    tags: ["allocated", "oil + condensate"],
    footnote:
      "Allocated from the lease's filed liquid production. Oil and condensate are reported together by the commission and are not separable from this record.",
  };
}

/* ─────────────────────────────────────────────── 3 · paid to you, filed ── */

export function wellPaidExplainer(report: WellReport): Explainer {
  return {
    tone: "money",
    title: "How this cash figure is worked out",
    subtitle: "Your decimal · filed months · net of what comes off the top",
    stats: [
      {
        label: "Paid to you, filed",
        value: formatCompactDollars(report.paidYouFiled),
        sub: `${formatCount(report.allocatedMonths)} months`,
      },
      {
        label: "Your decimal",
        value: formatDecimalInterest(report.lease.decimalInterest),
        sub: "of the whole lease",
      },
      {
        label: "This well's share",
        value: `${report.gasSharePercent.toFixed(1)}%`,
        sub: "of the reservoir's filed gas",
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `This wellbore's share of the lease's cash, at YOUR decimal of ${formatDecimalInterest(report.lease.decimalInterest)} — the one figure on this row already yours rather than the lease's. Each month is its allocated volume times what that month actually cleared, summed across the filed record.`,
      },
      {
        heading: "What it means for you",
        body: `${allocationNote(report)} Because it follows the cleared price rather than a flat one, the cash line moves with the calendar: a winter month can pay noticeably more than a summer month on the same volume, and that is gas seasonality rather than anything changing at the well.`,
      },
      {
        heading: "What this is built on",
        aside: `${formatCount(report.allocatedMonths)} filed months`,
        bullets: [
          "Each month priced at what it settled — the forward strip with that month's own basis and timing on it, not one average applied across the record.",
          "Every price is NET: after gathering, treating and the basis differential, which on this record is most of a dollar off the screen price.",
          "Oil is carried at a flat barrel price because a globally traded barrel has no seasonal cycle; gas plainly does.",
          "Cash is allocated between the lease's wells by filed volume, so this well's share of the money matches its share of the gas.",
        ],
      },
    ],
    whatToDo:
      "Check the volume column first when this does not match a statement. Volumes agreeing with cash disagreeing is a price or deduction question — a conversation with the operator rather than with the state's record.",
    tags: ["your decimal", "allocated", "net of deducts"],
    footnote:
      "Filed months only, priced month by month at settlement. Severance tax, post-production deductions beyond those in the net price, and any prior-period adjustment on your statement are not modelled here.",
  };
}

/* ────────────────────────────────────────────────── 4 · still ahead ────── */

export function wellAheadExplainer(report: WellReport): Explainer {
  return {
    tone: "models",
    title: "Nobody has been paid this",
    subtitle: "A model of what is left in this hole · not a filing",
    stats: [
      {
        label: "Still ahead, cash",
        value: formatCompactDollars(report.stillAheadCash),
        sub: "at your decimal",
      },
      {
        label: "Still ahead, gas",
        value: `${formatCompactVolume(report.stillAheadGas)} MCF`,
        sub: "allocated to this well",
      },
      {
        label: "Already produced",
        value: `${report.gasProducedPercent.toFixed(1)}%`,
        sub: "of the gas the model expects",
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The remainder: what the decline model still expects from this wellbore after ${report.newestFiledMonth}, priced forward and taken to your decimal. It is the one figure on this row nobody has filed — the state has posted nothing for these months because they have not happened.`,
      },
      {
        heading: "What it means for you",
        body: `${report.gasProducedPercent.toFixed(1)}% of the gas the model expects from this hole has already been filed, so this is the tail rather than the bulk. Treat it as a scale and not a schedule: the size is a reasonable read of the curve${
          report.declinePerMonth !== null
            ? `, which is declining about ${report.declinePerMonth.toFixed(1)}% a month`
            : ""
        }, but the month-by-month timing is much less so.`,
      },
      {
        heading: "What this is built on",
        aside: "modelled, not filed",
        bullets: [
          `Fitted to this wellbore's own allocated history from ${report.firstProduction} onward, not to a type curve for the formation.`,
          "Forward months are priced at the strip CLEAN, without the settlement noise a filed month carries, because there is nothing yet to be noisy.",
          "Nothing here assumes a recompletion, a refrac or a new interval. It is this hole, as completed, declining.",
          `The trailing twelve filed months averaged ${formatCompactVolume(report.trailingAverageGas)} MCF a month, which is the rate the remainder is measured against.`,
        ],
      },
    ],
    whatToDo:
      "Do not budget against the monthly shape of this. Use the total as a rough scale of what is left, and watch the filed months as they land to see whether the curve is holding.",
    tags: ["modelled", "your decimal", "not a filing"],
    footnote:
      "A decline model over this wellbore's allocated history, priced at the forward strip. It is an estimate, it is not an entitlement, and it is not an offer from anybody to pay it.",
  };
}

/* ────────────────────────────────────────────── 5 · best month it had ─── */

export function wellBestMonthExplainer(report: WellReport): Explainer {
  const offPeak =
    report.bestMonthGas > 0
      ? (1 - report.trailingAverageGas / report.bestMonthGas) * 100
      : 0;

  return {
    tone: "activity",
    title: "What the hole could do when it was new",
    subtitle: "The single best month on the record",
    stats: [
      {
        label: "Best month",
        value: `${formatCompactVolume(report.bestMonthGas)} MCF`,
        sub: report.bestMonth,
      },
      {
        label: "Recent average",
        value: `${formatCompactVolume(report.trailingAverageGas)} MCF`,
        sub: "trailing twelve filed months",
      },
      {
        label: "Down from the peak",
        value: `${offPeak.toFixed(0)}%`,
        sub: "peak to recent rate",
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The largest single month this wellbore has ever filed — ${formatCompactVolume(report.bestMonthGas)} MCF in ${report.bestMonth}. Five of the six tiles on this row are totals; this one is not, and that is why it is here.`,
      },
      {
        heading: "What it means for you",
        body: `It is the only figure on the page that says what the hole was CAPABLE of, which is what a reader needs before deciding whether today's rate is a disappointment or a decline curve doing exactly what decline curves do. At ${formatCompactVolume(report.trailingAverageGas)} MCF the recent months run about ${offPeak.toFixed(0)}% below that peak — steep in the first years is normal for this kind of completion.`,
      },
      {
        heading: "What this is built on",
        aside: `peak ${report.bestMonth}`,
        bullets: [
          "The highest allocated month across the whole filed record, not the highest in some recent window.",
          "A peak usually sits within the first year of production; a peak arriving much later normally means a recompletion or a workover rather than the rock improving.",
          "Where the lease has several wells this is the allocated figure, so it is a share of the lease's best month rather than a gauge reading at this hole.",
          "One month is a noisy measure — downtime for maintenance can halve it without anything being wrong.",
        ],
      },
    ],
    whatToDo:
      "Use the gap between the peak and the recent rate as a rough decline check, not as a valuation. A well far off its peak can still be worth more than one near it, if it has more hole open and more rock ahead of it.",
    tags: ["allocated", "single month"],
    footnote:
      "The largest allocated month across this wellbore's filed history. Allocated from the lease's filings; where the lease has several wells this is a share rather than a measurement.",
  };
}

/* ───────────────────────────────────────────────────── 6 · open over ───── */

export function wellOpenExplainer(report: WellReport): Explainer {
  const { well } = report;

  return {
    tone: "record",
    title: "The only part of the hole the rock drains through",
    subtitle: "Perforated interval · measured depth, not true vertical",
    stats: [
      {
        label: "Open section",
        value: `${formatCount(report.openFeet)} ft`,
        sub: `${formatCount(well.openTopFt)}–${formatCount(well.openBottomFt)} ft measured`,
      },
      {
        label: "Of the whole hole",
        value: `${report.openPercentOfHole.toFixed(1)}%`,
        sub: `${formatCount(report.measuredFt)} ft drilled`,
      },
      {
        label: "Against the others in this rock",
        value: `${report.gasPerFootVsPeersPercent >= 0 ? "+" : ""}${report.gasPerFootVsPeersPercent.toFixed(0)}%`,
        sub: `per foot open, vs ${report.peerCount} peers`,
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The perforated interval — where the casing was shot and the rock is actually connected to the wellbore. The hole runs ${formatCount(report.measuredFt)} ft, but only ${formatCount(report.openFeet)} ft of it is open, and that ${formatCount(report.openFeet)} ft has produced everything else on this page.`,
      },
      {
        heading: "What it means for you",
        body: `It is the figure that makes the rest of the page comparable. ${formatCount(Math.round(report.gasPerFootOpen))} MCF filed for every foot open puts this well ${report.gasPerFootVsPeersPercent >= 0 ? "above" : "below"} the ${report.peerCount} other wells in ${report.reservoir} by about ${Math.abs(report.gasPerFootVsPeersPercent).toFixed(0)}% — a comparison a raw volume could never support, because a bigger well with three times the open section is the weaker completion.`,
      },
      {
        heading: "What this is built on",
        aside: `${formatCount(report.measuredFt)} ft drilled`,
        bullets: [
          `Measured depth is distance along the hole. This one runs ${formatCount(report.extraHoleFt)} ft further than its true vertical depth of ${formatCount(report.trueVerticalFt)} ft, so measured depth is not how deep the rock is.`,
          "The completion as filed. A later recompletion, plug-back or added interval shows only once the commission has the paper.",
          "The peer set is the wells in the same reservoir whatever lease they sit on, because that is the set this completion is geologically comparable with.",
          "Perforated length, not gross interval: the span from top to bottom can be longer than the feet actually open.",
        ],
      },
    ],
    whatToDo:
      "Use gas per foot open rather than gas alone when comparing wells. It is the closest thing on this page to a like-for-like number, and it is the one that survives a well being bigger for uninteresting reasons.",
    tags: ["measured", "as completed"],
    footnote:
      "Read from this wellbore's completion filings. Perforated intervals are reported as completed and do not reflect any later isolation, plug-back or squeeze unless that was filed too.",
  };
}
