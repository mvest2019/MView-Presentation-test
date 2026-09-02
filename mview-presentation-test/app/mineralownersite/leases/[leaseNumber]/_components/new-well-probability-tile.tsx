import { Badge } from "../../../_components/ui/badge";
import { Card, CardHeader } from "../../../_components/ui/card";
import { ExplainPanel } from "../../../_components/ui/explain-panel";
import { gates } from "../../../_components/ui/portal-gating";
import { formatCount, spellOut } from "../../_lib/lease-format";
import type { LeaseReportRecord } from "../_lib/lease-report-types";

/**
 * "NEW-WELL PROBABILITY" — a band and four reasons, and deliberately no number.
 *
 * ── WHY THIS IS THE ONE TILE THAT REFUSES TO GIVE A FIGURE ──
 *
 * A new well is a mineral owner's biggest upside, so a percentage here would be
 * the most quoted number on the page — and today's v1 is a spacing heuristic,
 * not a calibrated model. So it places the lease in a band (Low / Moderate /
 * High) with a confidence level, shows the four inputs that put it there, and
 * says in as many words: never a percentage the math can't yet defend. The
 * backtested reservoir-grid model replaces the band only once it survives a
 * backtest against historical drilling.
 *
 * The guardrail line is the other half of that: a neighbour's well is a signal,
 * not your income. Permits slip, move, and vanish.
 *
 * ── THE FOUR REASONS ARE BUILT, NOT STORED ──
 *
 * Three of them are already facts of this record — the sibling unit count, the
 * gas reserves remaining, whether a continuous-development clause is on file —
 * so they read off `report` and cannot drift from the figures the rest of the
 * page prints. Only the neighbourhood counts are new data. A reason that
 * restated a number is a reason that can contradict it.
 *
 * `hide-s`: an Essentials reader is not offered a model indicator to interpret.
 * The design's own annotations ("Directional — model in build", "(v1) — full
 * backtested probability model in build") are `.anno` — review-mode notes that
 * never render for a reader — so they are not reproduced here.
 */
export function NewWellProbabilityTile({
  report,
}: {
  report: LeaseReportRecord;
}) {
  const outlook = report.newWellProbability;
  if (!outlook || !report.recovery) return null;

  const { lease } = report;
  const reasons = [
    `Room to drill — well spacing on the ${spellOut(outlook.spacingUnits)} ${lease.county} units`,
    `Resource remaining — ${formatCount(report.recovery.reservesGas)} mcf of gas reserves`,
    `Nearby de-risking — ${outlook.nearby.adjacentLeases} adjacent leases · ${outlook.nearby.permits} permits within ~1 mi`,
    outlook.continuousDevelopmentClause
      ? "Lease clause — a continuous-development clause is on file"
      : "Lease clause — no continuous-development clause on file",
  ];

  return (
    <div className={`mb-[18px] break-inside-avoid ${gates("hideInEssentials")}`}>
      <Card className="border-t-[3px] border-t-mv-green">
        <CardHeader
          title={
            <h4 className="text-[15px] font-bold">
              New-well probability — will they drill more near you?
            </h4>
          }
        />
        <p className="mt-0.5 mb-2 text-[11px] text-mv-muted">
          Spacing-based indicator. Never a made-up percentage.
        </p>

        <div className="inline-flex flex-wrap items-center gap-2.5 font-serif text-[22px] font-bold">
          {outlook.band}
          <Badge tone="mint" size="sm" className="font-sans">
            Confidence: {outlook.confidence}
          </Badge>
        </div>

        <p className="mt-2.5 mb-0.5 text-[13px] text-mv-muted">
          <strong>Why:</strong>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {reasons.map((reason) => (
            <span
              key={reason}
              className="rounded-full bg-mv-chip-reason px-[10px] py-[3px] text-[11.5px] font-semibold text-mv-slate"
            >
              {reason}
            </span>
          ))}
        </div>

        <p className="mt-2.5 text-[11px] text-mv-muted">
          Guardrails: <strong>a neighbor&rsquo;s well is a signal, not your
          income</strong> — and this is an{" "}
          <strong>estimate, not a certainty</strong>. Permits slip, move, and
          vanish.
        </p>

        <ExplainPanel
          className="mt-2"
          summary="Explain this indicator — why a band, not a percentage"
        >
          Today&rsquo;s v1 reads well spacing, remaining resource, nearby
          de-risking activity, and lease clauses to place the lease in a{" "}
          <strong>band (Low / Moderate / High)</strong> with a confidence level.
          The backtested reservoir-grid model (Phase A, in build) will replace
          the band with a calibrated likelihood once it survives backtesting
          against historical drilling. Until then we show direction and reasons —{" "}
          <strong>never a percentage the math can&rsquo;t yet defend</strong>.
          You&rsquo;ll get an alert if this band changes.
        </ExplainPanel>
      </Card>
    </div>
  );
}
