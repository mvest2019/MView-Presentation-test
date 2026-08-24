import { formatCount, formatMillions } from "./operator-compare";
import type { ChangeEvidence, ChangeRow } from "./operator-detail-data";
import type {
  ProductionLeaders,
  ProductionOperator,
} from "./operator-production-shape";
import { productionMonthLabel } from "./operator-production-stats";

/**
 * The comparison read, as the same findings the operator detail page's panel uses.
 *
 * WHY IT IS THIS SHAPE. The read was a dark card of four numbered sentences; the
 * comparison page was asked for the structure the detail page's "What changed" has, so
 * it now produces `ChangeRow`s and renders through the same `ChangeItem`. The gain is
 * not only visual: a `ChangeRow` carries evidence, so each claim can open onto the
 * figures for EVERY selected operator rather than only naming the winner. That is what
 * turns a read into a comparison.
 *
 * NOTHING HERE IS MODEL-WRITTEN, and that is deliberate. The detail page's panel pays
 * one model call per view because its findings are prose about a single operator; this
 * page's claims are arithmetic over the figures already on screen. Asking a model to
 * rephrase them would add a network round trip and a per-view cost to a page that
 * currently makes neither, for wording that is already exact. Same structure, same
 * card, no new request.
 *
 * THE API PICKS THE WINNERS. Each leader claim is one record the endpoint returned
 * under its own key, so this read and the leader tiles cannot disagree about who leads
 * — which is exactly what happened when both computed it independently. Only the
 * evidence tables are assembled here, and only from figures the same response carried.
 *
 * PURE, and no React: the findings can be checked without rendering anything, the same
 * split `lib/operator-compare.ts` has from the page it serves.
 */

/** What the read needs of each operator: the API record plus its elided label. */
export interface ComparedOperator extends ProductionOperator {
  short: string;
}

/** Every claim on this page is arithmetic over the same response. */
const SOURCE = "Filed production · selected acreage";

function evidence(
  why: string,
  method: string,
  rows: readonly { k: string; v: string; note: string }[],
): ChangeEvidence {
  return { why, method, rows, series: [] };
}

/**
 * Order operators by a figure, biggest first, for an evidence table.
 *
 * SORTED RATHER THAN LEFT IN SLOT ORDER, because the table is the working behind a
 * claim about who leads: reading it top to bottom should confirm the headline, not
 * make the reader scan for the winner.
 */
function ranked(
  operators: readonly ComparedOperator[],
  value: (operator: ComparedOperator) => number,
  render: (operator: ComparedOperator) => { v: string; note: string },
): { k: string; v: string; note: string }[] {
  return [...operators]
    .sort((a, b) => value(b) - value(a))
    .map((operator) => ({ k: operator.short, ...render(operator) }));
}

/** `#3`, or an em dash when the response omits the rank. */
function rankLabel(rank: number | null): string {
  return rank === null ? "—" : `#${rank}`;
}

/**
 * Build the read.
 *
 * A MISSING LEADER DROPS ITS ROW rather than the whole panel — the response omits a
 * leader it cannot name, and five true findings beat six with a hole in one. An empty
 * result returns an empty array and the caller draws nothing.
 */
export function compareFindings(
  operators: readonly ComparedOperator[],
  leaders: ProductionLeaders | null,
): ChangeRow[] {
  if (operators.length === 0) return [];

  const rows: ChangeRow[] = [];
  const label = (operatorNumber: string) =>
    operators.find((operator) => operator.operatorNumber === operatorNumber)
      ?.short ?? "";

  /* ---- 1 · oil ---- */
  if (leaders?.highestOil) {
    const leader = leaders.highestOil;
    rows.push({
      kind: "up",
      headline: `${label(leader.operatorNumber) || leader.name} leads on oil`,
      detail: `${formatMillions(leader.value)} bbl filed across the selected acreage.`,
      source: SOURCE,
      evidence: evidence(
        "Oil is what most Texas royalty is calculated on, so the largest oil producer is usually the one whose filings move an owner's cheque the most.",
        "Cumulative filed oil within the selected counties, play types and districts, as returned by the comparison endpoint. Lifetime totals — the year range scopes the chart, not these figures.",
        ranked(
          operators,
          (operator) => operator.oilTotal,
          (operator) => ({
            v: `${formatMillions(operator.oilTotal)} bbl`,
            note: `${operator.oilPercent.toFixed(1)}% of volume`,
          }),
        ),
      ),
    });
  }

  /* ---- 2 · gas ---- */
  if (leaders?.highestGas) {
    const leader = leaders.highestGas;
    rows.push({
      kind: "up",
      headline: `${label(leader.operatorNumber) || leader.name} leads on gas`,
      detail: `${formatMillions(leader.value)} Mcf over the same record.`,
      source: SOURCE,
      evidence: evidence(
        "An operator can lead on gas and trail badly on oil. Which of the two matters depends entirely on what a given acreage actually produces.",
        "Cumulative filed gas within the same selection, from the same response as the oil figures above.",
        ranked(
          operators,
          (operator) => operator.gasTotal,
          (operator) => ({
            v: `${formatMillions(operator.gasTotal)} Mcf`,
            note: `${operator.gasPercent.toFixed(1)}% of volume`,
          }),
        ),
      ),
    });
  }

  /* ---- 3 · efficiency ---- */
  if (leaders?.mostEfficient) {
    const leader = leaders.mostEfficient;
    rows.push({
      kind: "swap",
      headline: `${label(leader.operatorNumber) || leader.name} is the efficiency leader`,
      detail:
        `${formatCount(Math.round(leader.value))} MBOE per lease` +
        `${leader.leaseCount === null ? "" : ` from ${formatCount(leader.leaseCount)} leases on record`}.`,
      source: SOURCE,
      evidence: evidence(
        "Output per lease is the figure that separates a large operator from a productive one — it is what an owner with a single lease is actually exposed to.",
        "Filed BOE divided by leases on record, as the endpoint computes it. A low figure can mean undeveloped acreage rather than poor wells.",
        ranked(
          operators,
          (operator) =>
            operator.leaseCount > 0
              ? operator.boeTotal / operator.leaseCount
              : 0,
          (operator) => ({
            v:
              operator.leaseCount > 0
                ? `${formatMillions(operator.boeTotal)} BOE`
                : "—",
            note:
              operator.leaseCount > 0
                ? `over ${formatCount(operator.leaseCount)} leases`
                : "no leases on record",
          }),
        ),
      ),
    });
  }

  /* ---- 4 · footprint ---- */
  if (leaders?.widestFootprint) {
    const leader = leaders.widestFootprint;
    rows.push({
      kind: "flag",
      headline: `${label(leader.operatorNumber) || leader.name} covers the most ground`,
      detail:
        `${leader.value} counties in scope` +
        `${operators.length > 1 ? `, against ${operators.length} operators compared` : ""}.`,
      source: SOURCE,
      evidence: evidence(
        "A wide footprint spreads an operator's risk across basins; a narrow one concentrates it. Neither is better, but they behave differently when one play slows.",
        "Counties within the current filter, alongside the counties each operator actually reports production from.",
        ranked(
          operators,
          (operator) => operator.countyCount,
          (operator) => ({
            v: `${operator.countyCount} counties`,
            note: `${operator.producingCountyCount} producing`,
          }),
        ),
      ),
    });
  }

  /* ---- 5 · the lease book ---- */
  rows.push({
    kind: "add",
    headline: "Lease books differ more than the volumes do",
    detail: "How many leases each holds, and how many are currently active.",
    source: SOURCE,
    evidence: evidence(
      "Two operators filing similar volumes can hold very different numbers of leases, and the share that is active says which of them is still working the acreage.",
      "Leases on record and active leases per operator, within the current selection, as returned by the comparison endpoint.",
      ranked(
        operators,
        (operator) => operator.leaseCount,
        (operator) => ({
          v: formatCount(operator.leaseCount),
          note: `${formatCount(operator.activeLeaseCount)} active`,
        }),
      ),
    ),
  });

  /* ---- 6 · standing and recency ---- */
  rows.push({
    kind: "flag",
    headline: "Statewide standing and the latest filing",
    detail: "Where each sits statewide, and how current its filed record is.",
    source: SOURCE,
    evidence: evidence(
      "Rank puts the volumes above in proportion. The latest filing date matters alongside it: production posts on a lag, and an operator whose newest month is older than the others is not being compared on equal ground.",
      "Statewide rank by reported production, with the newest month each operator has filed within the current selection.",
      ranked(
        operators,
        // Nulls last: an operator with no rank sorts below every ranked one rather
        // than above them, which is what `null` would do read as zero.
        (operator) =>
          operator.rankStatewide === null ? -1 : -operator.rankStatewide,
        (operator) => ({
          v: rankLabel(operator.rankStatewide),
          note: productionMonthLabel(operator.latestProductionDate) || "—",
        }),
      ),
    ),
  });

  return rows;
}
