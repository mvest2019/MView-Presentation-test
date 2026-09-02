import { ExplainPanel } from "../../../_components/ui/explain-panel";
import { Notice } from "../../../_components/ui/notice";
import { portalGate } from "../../../_components/ui/portal-gating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../_components/ui/table";
import type { DeclineCurveRecord } from "../_lib/decline-curve-record";

/**
 * THE PROFESSIONAL TIER OF THE DECLINE PANEL — the method, not the figure.
 *
 * ── IT REPLACES THE DETAILED BLOCK, IT DOES NOT EXTEND IT ──
 *
 * `tier-p` is Professional ONLY and `tier-d` is Detailed ONLY, so a Pro reader
 * does not see the P90/P50/P10 cards at all: they get the backtest band table
 * the grades are read off, what the grade cannot tell them, how an override is
 * recorded, and a link into the workbench. That is deliberate — someone at this
 * tier wants to know whether to trust the method, and the single lease's three
 * numbers are the least interesting thing about it.
 *
 * ── THE THREE ADMISSIONS ARE THE POINT ──
 *
 * B and C are not separable at this horizon. The grade is measured only on Arps.
 * Per-well allocation does not follow an accepted model. Each one costs the
 * product something to say, and each is the kind of thing a reader would
 * otherwise discover by being wrong in front of a counterparty.
 *
 * The override notice ends on "still local to one browser until exported" — a
 * limitation of the audit log, stated where someone might rely on it.
 */
export function DeclineCurvePro({ curve }: { curve: DeclineCurveRecord }) {
  return (
    <div className={portalGate.professionalOnly}>
      <p className="mt-1.5 mb-2 text-[13px]">
        Arps is the reported answer and the fallback. Automatic model selection
        was measured at{" "}
        <strong>
          {curve.autoSelection.auto} against {curve.autoSelection.arps}
        </strong>{" "}
        and lost in all eight plays, so nothing auto-switches — but an engineer
        may override it per lease.
      </p>

      <TableScroll className="mb-2.5">
        <Table minWidth={560}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Grade</TableHeaderCell>
              <TableHeaderCell numeric>Recent nRMSE</TableHeaderCell>
              <TableHeaderCell numeric>n</TableHeaderCell>
              <TableHeaderCell numeric>Median error</TableHeaderCell>
              <TableHeaderCell numeric>p90</TableHeaderCell>
              <TableHeaderCell numeric>Over 50%</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {curve.bands.map((band) => (
              <TableRow key={band.grade}>
                <TableCell>{band.grade}</TableCell>
                <TableCell numeric>{band.recentNrmse}</TableCell>
                <TableCell numeric>{band.n}</TableCell>
                <TableCell numeric>{band.medianError}</TableCell>
                <TableCell numeric>{band.p90}</TableCell>
                <TableCell numeric>{band.overFifty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>

      <ExplainPanel
        className="mb-2.5"
        summary="What the grade does not tell you — read before quoting one"
      >
        <p className="mb-2">
          <strong>B and C are not separable at this horizon.</strong> 25% versus
          26% median error is noise. The grade&rsquo;s ranking power decays as
          the forecast lengthens — Spearman falls from 0.606 at 24 months to
          0.433 at 60. Treat B and C as one band.
        </p>
        <p className="mb-2">
          <strong>The grade is measured only on Arps.</strong> The band and the
          grade were both backtested on the Arps pipeline. If an engineer accepts
          one of the other eight models for a lease, the grade shown against it
          is <em>indicative</em>, not measured, and is badged that way at the
          point of decision.
        </p>
        <p>
          <strong>Per-well allocation does not follow an accepted model.</strong>{" "}
          It depends on the multi-cycle deconvolution, which the single-curve
          alternatives do not produce. Accepting a Duong or PLE fit changes the
          lease curve and leaves the per-well split on Arps — the tool says so
          rather than transferring it silently.
        </p>
      </ExplainPanel>

      <Notice tone="slate" glyph="◎" className="mb-2.5 border-l-4 border-l-mv-line">
        <strong>
          Every override is now a signed, tamper-evident decision.
        </strong>{" "}
        Accepting a model is refused until an engineer is named and gives a
        reservoir reason, and the record keeps the EUR and fit error{" "}
        <em>before and after</em> — so the size of the judgement is reviewable,
        not just its label. Reverting is recorded too, which is the part that used
        to vanish. Entries are hash-chained, so an edited or deleted one is
        detectable, and the log exports as JSON or CSV.{" "}
        <strong>It is still local to one browser until exported</strong> — two
        machines diverge until their journals are merged, so attach the exported
        journal to anything the model&rsquo;s numbers go into.
      </Notice>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mv-portal-hairline py-[14px] text-[13px] last:border-b-0">
        <div className="min-w-[240px] flex-1">
          <strong className="text-[13px]">The full model workbench</strong>
          <div className="text-[11px] text-mv-muted">
            Nine models with editable parameters, live EUR / remaining /
            fit-error readout, per-well allocation and the ± bands — the
            engine&rsquo;s own surface. <strong>{curve.workbench.leases}</strong>{" "}
            Texas leases are searchable — {curve.workbench.baked} with a full
            baked fit, the rest from the statewide index — and{" "}
            {curve.workbench.worked} is worked end to end.
          </div>
        </div>
        {/*
          A REAL EXTERNAL TOOL, so a real anchor — not a PrototypeButton. This
          one is built and deployed; `target="_blank"` with `rel="noopener"` is
          the design's own attribute pair here, and leaving the report open is
          right for a tool someone will work in for a while.
        */}
        <a
          href={curve.workbench.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-mv-line bg-mv-card px-[11px] py-[7px] text-[11.5px] font-semibold text-mv-slate hover:border-mv-line-strong hover:bg-mv-bg"
        >
          Open Find Your Lease →
        </a>
      </div>
    </div>
  );
}
