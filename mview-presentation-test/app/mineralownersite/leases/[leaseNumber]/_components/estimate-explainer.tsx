import { ExplainPanel } from "../../../_components/ui/explain-panel";
import { gates, portalGate } from "../../../_components/ui/portal-gating";
import { formatCount, formatDollars } from "../../_lib/lease-format";
import type { LeaseReportRecord } from "../_lib/lease-report-types";

/**
 * "EXPLAIN THIS ESTIMATE" — the whole derivation, in one closed disclosure.
 *
 * The owner card at the top of the report carries the same arithmetic in its own
 * explainer. This one exists because the reader who has just scrolled the chart
 * and the decline panel is asking a narrower question — where exactly does the
 * headline figure come from — and the answer is one multiplication, so it is one
 * line rather than a section.
 *
 * ── IT RENDERS ONLY WHERE THE EXACT MODEL GROSS IS RECORDED ──
 *
 * The point of the panel is showing the UNROUNDED gross beside the rounded one
 * on display, so a reader who redoes the multiplication is not surprised by the
 * last two digits. Without that figure there is nothing here the owner card does
 * not already say, so leases without it render nothing.
 *
 * ── A KNOWN INCONSISTENCY IN THE DESIGN'S OWN FIGURES ──
 *
 * The design states this multiplication as `$1,099,456 × 0.00538700 = $8,700`,
 * and that product is actually ≈$5,922. One of the two operands is stale: either
 * the gross should be ~$1,615,000 (which is what $8,700 ÷ the decimal implies) or
 * the share should be ~$5,922. Both figures appear elsewhere in the prototype —
 * the gross in the valuation banner, the share in the funnel bar, the Ultra
 * verdict and three narrative paragraphs — so there is no way to tell from the
 * markup which one is intended, and picking would mean inventing a number.
 *
 * So the figures are printed as the design publishes them, from the record, and
 * the discrepancy is flagged for the owner of the data rather than papered over.
 * `formatDollars` renders both, so whichever value is corrected in
 * `lease-report-records.ts` flows through here without touching this file.
 */
export function EstimateExplainer({ report }: { report: LeaseReportRecord }) {
  const { lease, recovery, exactGrossValuation } = report;
  if (!recovery || exactGrossValuation === undefined) return null;

  const share = formatDollars(lease.mvestimate);

  return (
    <ExplainPanel
      className={`mt-2.5 mb-4 ${gates("hideInEssentials")}`}
      summary={
        <>
          Explain this estimate — how the{" "}
          <span className={portalGate.lockedValue}>{share}</span> is computed
        </>
      }
    >
      The unit&rsquo;s gas decline curve (fitted to the public RRC record —{" "}
      <abbr
        title="Estimated ultimate recovery — everything a lease or well is expected to produce over its whole life. EUR minus produced = reserves left."
        className="cursor-help border-b border-dotted border-mv-muted no-underline"
      >
        EUR
      </abbr>{" "}
      {formatCount(recovery.eurGas)} mcf, {formatCount(recovery.reservesGas)} mcf
      of reserves remaining) is projected six years forward at the current price
      outlook, then multiplied by your decimal interest{" "}
      {lease.decimalInterest.toFixed(8)}. Exact model gross{" "}
      <span className={portalGate.lockedValue}>
        {formatDollars(exactGrossValuation)}
      </span>{" "}
      (displayed above rounded to{" "}
      <span className={portalGate.lockedValue}>
        {formatDollars(report.grossValuation)}
      </span>
      ) × {lease.decimalInterest.toFixed(8)} ={" "}
      <span className={portalGate.lockedValue}>{share}</span>. A projection —{" "}
      <strong>not an appraisal, not a payment ledger, not advice</strong>.
    </ExplainPanel>
  );
}
