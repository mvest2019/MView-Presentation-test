import {
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
  formatDecimalInterest,
} from "../../_lib/lease-format";
import { portfolioSummary } from "../../_lib/lease-totals";
import { wellRecords } from "../../_lib/well-records";
import type { Explainer } from "../_components/explainer-drawer";
import type { ReservoirReport } from "./reservoir-report";

/**
 * WHAT EACH OF THE RESERVOIR REPORT'S SIX FIGURES MEANS.
 *
 * ── EVERY COUNT IN HERE IS MEASURED, NOT WRITTEN ──
 *
 * The panel's whole job is to say where a number came from, so a panel with a
 * hand-typed count in it would be the one place on the page most likely to be
 * wrong and least likely to be caught. They are computed off the same report
 * the tiles are, which is why the two cannot drift apart.
 *
 * ── THE TONE IS THE FIRST THING THE READER SEES, SO IT IS THE FIRST THING SET ──
 *
 * Two of these six are money and one of those two is a model. "Still ahead of
 * it" is `models` rather than `money` for exactly that reason: it is a figure
 * nobody has been paid, and the blue rule says so before a word is read. The
 * two volumes are `activity` — something the state posted — and the two facts
 * about the hole are `record`.
 *
 * ── THE DESIGN'S OWN FIGURES ARE NOT THIS RECORD'S ──
 *
 * The mock shows "named by the roster outright 1 of 10 / read from the field
 * name's bracket 9 of 10". On this fixture it is the other way round — one of
 * the ten field names carries a bracket and nine do not — so the panel states
 * what is actually here. A provenance panel that quotes a different record than
 * the page behind it is worse than no panel.
 */

/** "SAWFISH (WILCOX 10400)" -> "WILCOX 10400". Null where there is no bracket. */
function bracketOf(field: string): string | null {
  const match = field.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

/* ─────────────────────────────────────────── 1 · wells in this rock ─────── */

export function reservoirWellsExplainer(report: ReservoirReport): Explainer {
  const total = wellRecords.length;
  const bracketed = wellRecords.filter((well) => bracketOf(well.field));
  const plain = total - bracketed.length;

  return {
    tone: "record",
    title: "How a reservoir is named and grouped",
    subtitle: "Two sources can answer · the field name is asked first",
    stats: [
      {
        label: "Field names carrying a bracket",
        value: `${bracketed.length} of ${total}`,
      },
      { label: "Named by the field alone", value: `${plain} of ${total}` },
      {
        label: "On this lease",
        value: `${report.wellCount} well${report.wellCount === 1 ? "" : "s"}`,
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: "A reservoir is not a property of the lease — it is carried by each WELL, and the wells are grouped by the name theirs holds. Two fields can supply it: the lease's own reservoir column, and the bracket inside the state's field name, as in “COOK (EDWARDS)”.",
      },
      {
        heading: "What it means for you",
        body: `This count is the wells on this lease whose reservoir is ${report.name} — ${report.wellCount} of them, on ${report.leasesWithWells} of your leases. A field is an administrative area the commission names and a reservoir is the rock inside it, so the two are not interchangeable: ${bracketed.length} of your ${total} wells spell the rock out in a bracket and ${plain} give the field alone.`,
      },
      {
        heading: "What this is built on",
        aside: `${total} wells on the record`,
        bullets: [
          "The lease's reservoir column answers for every well on it, which is why this page can group wells that sit on different leases.",
          "Where a field name carries a bracket the two agree, which is what makes the bracket safe to read rather than a guess.",
          "A well whose record names no reservoir is grouped as unnamed rather than dropped, so the reservoir's well count cannot disagree with the lease's.",
          "Every figure above this panel is the same wells summed — none of them is a separate query.",
        ],
      },
    ],
    whatToDo:
      "Treat the name as the state's label for the rock, not as a geological boundary: two names can be the same formation, and one name can cover several benches.",
    tags: ["per well", "field name first"],
    footnote:
      "Matched on the lease's own reservoir and the wells filed against it. The field name is the commission's administrative area and is reused across operators, so it is read for the bracket rather than taken as the rock.",
  };
}

/* ───────────────────────────────────────────── 2 · gas filed from it ───── */

export function reservoirGasExplainer(report: ReservoirReport): Explainer {
  const months = report.filedMonthCount;
  const yours = report.gasFiled * report.lease.decimalInterest;

  return {
    tone: "activity",
    title: "What “gas filed” counts, and whose it is",
    subtitle: "Posted months only · the whole lease, not your share",
    stats: [
      {
        label: "Filed gas",
        value: `${formatCompactVolume(report.gasFiled)} MCF`,
        sub: "whole lease",
      },
      {
        label: "Of all your allocated gas",
        value: `${report.gasFiledPercentOfRecord.toFixed(1)}%`,
        sub: `${formatCompactVolume(portfolioSummary.gasMcf)} MCF across ${portfolioSummary.leaseCount} leases`,
      },
      {
        label: "Months posted",
        value: formatCount(months),
        sub: `${report.filedFrom} – ${report.filedTo}`,
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `Every month of gas the state has posted against this lease's wells in ${report.name}, added up from the first producing month to the newest filed one. It is a VOLUME, so it is the whole lease's — a physical fact about the rock belongs to nobody in particular.`,
      },
      {
        heading: "What it means for you",
        body: `At your decimal of ${formatDecimalInterest(report.lease.decimalInterest)} this works out at roughly ${formatCompactVolume(yours)} MCF attributable to you, which is the basis your statements are built from — not the ${formatCompactVolume(report.gasFiled)} MCF on the tile. The tile prints the gross figure because that is the one matching the state's filing; the cash tiles beside it are the ones already at your decimal.`,
      },
      {
        heading: "What this is built on",
        aside: `${months} filed months`,
        bullets: [
          `Only months up to ${report.filedTo} are counted. Anything after it is a model and lives in “still ahead of it”, never in this figure.`,
          "Where a lease carries several wells the lease total is split between them by each well's own filed volume — the same split the money uses.",
          `The percentage compares this one rock with all ${formatCompactVolume(portfolioSummary.gasMcf)} MCF allocated to you across ${portfolioSummary.leaseCount} leases.`,
          "The first month counted is the first one with a volume on it, not the spud or the completion date.",
        ],
      },
    ],
    whatToDo:
      "Compare it with the volume column on your statements before the cash column. A gap in volume is usually a different allocation month; volumes matching with cash apart is a price or deduction question instead.",
    tags: ["whole lease", "filed only"],
    footnote:
      "Summed from the monthly filings for the wells on this lease in this reservoir. Volumes are as posted and are not adjusted for shrinkage, fuel or line loss between the wellhead and the sales meter.",
  };
}

/* ───────────────────────────────────────────── 3 · oil filed from it ───── */

export function reservoirOilExplainer(report: ReservoirReport): Explainer {
  const yield_ = Math.round(report.oilYield);

  return {
    tone: "activity",
    title: "Oil and condensate, counted together",
    subtitle: "One liquid stream · posted months only",
    stats: [
      {
        label: "Filed liquids",
        value: `${formatCompactVolume(report.oilFiled)} BBL`,
        sub: "whole lease",
      },
      {
        label: "Yield",
        value: `${formatCount(yield_)} BBL`,
        sub: "per thousand MCF of gas",
      },
      { label: "Newest filed month", value: report.newestFiledMonth },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The liquid this rock has filed on this lease — oil and condensate in one figure, because the state posts them as one stream and the operator sells them on one ticket. At ${formatCount(yield_)} barrels per thousand MCF this is a gas reservoir with liquids in it rather than an oil reservoir.`,
      },
      {
        heading: "What it means for you",
        body: `Liquids are a small share of the volume here and a much larger share of the cash: a barrel clears many times what an MCF does, so ${formatCompactVolume(report.oilFiled)} BBL can carry a sizeable part of what you are paid while barely showing on a volume chart. It is also the half of the stream with no winter peak, which is why the cash line is steadier than the gas price alone would make it.`,
      },
      {
        heading: "What this is built on",
        aside: `through ${report.newestFiledMonth}`,
        bullets: [
          "Condensate is not separated out. It drops out of the gas at the separator and is sold as oil, so splitting the two would invent a division the record does not make.",
          `The yield is this reservoir's own filed liquids over its filed gas — ${formatCount(yield_)} BBL per thousand MCF — not a field or basin average.`,
          `Only months through ${report.filedTo} count, the same line the gas figure uses.`,
          "Barrels are as posted at the lease, before any gravity or transport adjustment on the sales ticket.",
        ],
      },
    ],
    whatToDo:
      "Read this next to the gas figure rather than on its own. A yield that moves month to month usually means the separator conditions changed, not that the rock did.",
    tags: ["whole lease", "oil + condensate"],
    footnote:
      "Summed from the monthly liquid filings for the wells on this lease in this reservoir. Oil and condensate are reported together by the commission and are not separable from this record.",
  };
}

/* ──────────────────────────────────────────── 4 · paid to you, filed ───── */

export function reservoirPaidExplainer(report: ReservoirReport): Explainer {
  const months = report.filedMonthCount;

  return {
    tone: "money",
    title: "How this cash figure is worked out",
    subtitle: "Your decimal · filed months · net of what comes off the top",
    stats: [
      {
        label: "Paid to you, filed",
        value: formatCompactDollars(report.paidYouFiled),
        sub: `over ${months} months`,
      },
      {
        label: "Your decimal",
        value: formatDecimalInterest(report.lease.decimalInterest),
        sub: "of the whole lease",
      },
      {
        label: "Per acre",
        value: formatCompactDollars(report.valuePerAcre),
        sub: "filed and ahead together",
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `This lease's cash from its wells in ${report.name}, at YOUR decimal of ${formatDecimalInterest(report.lease.decimalInterest)} — the only figures on this tile row already yours rather than the whole lease's. Each month is its volume times what that month actually cleared, added up across the filed record.`,
      },
      {
        heading: "What it means for you",
        body: "It is what the wells in this rock have produced for you to date: not a balance, and nothing outstanding. Because it follows the cleared price rather than a flat one, the cash line moves with the calendar — a winter month can pay noticeably more than a summer month on the same volume, and that is gas seasonality rather than a change in the well.",
      },
      {
        heading: "What this is built on",
        aside: `${months} filed months`,
        bullets: [
          "Each month is priced at what it settled — the forward strip with that month's own basis and timing on it, not one average price applied across the record.",
          "Every price here is NET: after gathering, treating and the basis differential, which on this record is most of a dollar off the screen price.",
          "Oil is carried at a flat barrel price because a globally traded barrel has no seasonal cycle; gas plainly does.",
          "Where a lease has several wells the cash is allocated between them by filed volume, so a well's share of the money matches its share of the gas.",
        ],
      },
    ],
    whatToDo:
      "Check the volume column first when this does not match a statement. Volumes agreeing with cash disagreeing is a price or deduction question — a conversation with the operator rather than with the state's record.",
    tags: ["your decimal", "filed only", "net of deducts"],
    footnote:
      "Filed months only, priced month by month at settlement. Severance tax, post-production deductions beyond those in the net price, and any prior-period adjustment on your statement are not modelled here.",
  };
}

/* ──────────────────────────────────────────── 5 · still ahead of it ────── */

export function reservoirAheadExplainer(report: ReservoirReport): Explainer {
  const years = report.yearsLeftAtRecentRate;

  return {
    tone: "models",
    title: "Nobody has been paid this",
    subtitle: "A model of what is left · not a filing and not a promise",
    stats: [
      {
        label: "Still ahead, cash",
        value: formatCompactDollars(report.stillAheadCash),
        sub: "at your decimal",
      },
      {
        label: "Still ahead, gas",
        value: `${formatCompactVolume(report.stillAheadGas)} MCF`,
        sub: "whole lease",
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
        body: `The remainder: what the decline model still expects these wells to produce after ${report.filedTo}, priced forward and taken down to your decimal. It is the one figure in this row nobody has filed — the state has posted nothing for these months because they have not happened.`,
      },
      {
        heading: "What it means for you",
        body: `${report.gasProducedPercent.toFixed(1)}% of the gas this model expects from your wells here has already been posted, so this is the tail rather than the bulk${
          years > 0
            ? ` — about ${years.toFixed(1)} years of it at the rate the last twelve filed months ran at`
            : ""
        }. Treat it as a scale and not a schedule: the size is a reasonable read of the curve, the month-by-month timing much less so.`,
      },
      {
        heading: "What this is built on",
        aside: "modelled, not filed",
        bullets: [
          "The curve is fitted to this lease's own filed history — first producing month to newest filed month — not to a type curve for the formation.",
          "Forward months are priced at the strip CLEAN, without the settlement noise a filed month carries, because there is nothing yet to be noisy.",
          "Nothing here assumes a new well, a recompletion or a workover. It is the existing holes declining.",
          "Where wells came on at different times there is no single curve, and the page says so rather than printing a rate that describes none of them.",
        ],
      },
    ],
    whatToDo:
      "Do not budget against the monthly shape of this. Use the total as a rough scale of what is left in the rock, and watch the filed months as they land to see whether the curve is holding.",
    tags: ["modelled", "your decimal", "not a filing"],
    footnote:
      "A decline model over this lease's filed history, priced at the forward strip. It is an estimate, it is not an entitlement, and it is not an offer from anybody to pay it.",
  };
}

/* ────────────────────────────────────────────────── 6 · open between ───── */

export function reservoirOpenExplainer(report: ReservoirReport): Explainer {
  const perFoot = Math.round(report.gasPerFootOpen);

  return {
    tone: "record",
    title: "The only part of the hole the rock drains through",
    subtitle: "Perforated interval · measured depth, not true vertical",
    stats: [
      {
        label: "Open from",
        value: `${formatCount(report.openTopFt)} ft`,
        sub: "measured depth",
      },
      { label: "Open to", value: `${formatCount(report.openBottomFt)} ft` },
      {
        label: "Open section",
        value: `${formatCount(report.openFeet)} ft`,
        sub: `${formatCount(perFoot)} MCF filed per foot`,
      },
    ],
    sections: [
      {
        heading: "What this is",
        body: `The perforated interval — where the casing was shot and the rock is actually connected to the wellbore. The hole runs to ${formatCount(report.depthFt)} ft, but only ${formatCount(report.openFeet)} ft of it is open, and that ${formatCount(report.openFeet)} ft has produced everything above.`,
      },
      {
        heading: "What it means for you",
        body: `It is the figure that makes the rest of the page comparable: ${formatCount(perFoot)} MCF filed for every foot open is how this reservoir measures against any other, in a way a raw volume cannot. A well with twice the gas and three times the open section is the weaker one.`,
      },
      {
        heading: "What this is built on",
        aside: `${report.wellCount} well${report.wellCount === 1 ? "" : "s"} on this lease`,
        bullets: [
          "Measured depth is distance along the hole. On a deviated or horizontal well that is longer than the depth below surface, so this is not how deep the rock is.",
          "The top is the shallowest perforation across the wells here and the bottom the deepest, so the span can be wider than any single well's own section.",
          "Open feet is each well's own perforated length added up, which is why it is smaller than the top-to-bottom span.",
          "It is the completion as filed. A later recompletion or an added interval shows only once the state has it.",
        ],
      },
    ],
    whatToDo:
      "Use gas per foot open rather than gas alone when comparing this rock with another of your leases. It is the closest thing on this page to a like-for-like number.",
    tags: ["per well", "measured depth"],
    footnote:
      "Read from the completion filings for the wells on this lease in this reservoir. Perforated intervals are reported as completed and do not reflect any later isolation, plug-back or squeeze unless that was filed too.",
  };
}
