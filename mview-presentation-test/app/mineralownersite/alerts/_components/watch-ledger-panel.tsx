import Link from "next/link";

import { PortalButton } from "../../_components/ui/button";
import { gates } from "../../_components/ui/portal-gating";
import { alertPhrases } from "../_lib/alert-phrases";
import { premiumPricing, watchLedger } from "../_lib/watch-ledger";

/**
 * "WHAT YOU'RE ACTUALLY PAYING FOR" — the watch ledger, v44 · OW-32.
 *
 * The full argument for why this panel exists is in `_lib/watch-ledger.ts`. The
 * short version: on a quiet week the alert list is the weakest possible case for
 * renewing, and the ledger is the strongest, because it is true on quiet weeks
 * too.
 *
 * ── IT SITS BELOW THE ALERT SUMMARY AND ABOVE THE LIST, ON PURPOSE ──
 *
 * The alerts are the product; this is why the product costs money. Putting it
 * first would open the page with a price justification, which is what an owner
 * who came to read their alerts least wants.
 *
 * ── ONE ARGUMENT PER TIER, AND THEY ARE NOT THE SAME ARGUMENT ──
 *
 *   Ultra          one line, in the hero above — not here.
 *   Essentials     one sentence: the watch ran, here is what it found.
 *   Detailed       the four-figure grid and the price paragraph.
 *   Professional   the method — what is swept, how it is deduplicated, what is
 *                  retained.
 *
 * ── NOTHING HERE IS A SAVINGS CLAIM, AND THE PANEL SAYS SO OUT LOUD ──
 *
 * "What we will not do is tell you what that watch has saved you." Production is
 * public, payment is not, and the only place an underpayment can be proven is on
 * the owner's own statements. The paragraph names the Lease Audit as the thing
 * that settles it rather than taking credit for it. That refusal is the panel's
 * most valuable sentence and it must not be edited into a benefit.
 */
export function WatchLedgerPanel() {
  return (
    <div className="my-3 mb-0.5 rounded-xl border border-mv-line border-l-4 border-l-mv-green bg-[linear-gradient(165deg,var(--color-mv-card),var(--color-mv-portal-row-tint))] px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="block text-[10px] font-extrabold tracking-[0.09em] text-mv-green-deep uppercase">
            What you&apos;re actually paying for
          </span>
          <strong className="mt-px block max-w-[640px] text-base leading-[1.3] font-extrabold text-mv-green-ink">
            We read the public record on your {watchLedger.leases} leases every
            day — including the days it says nothing.
          </strong>
        </div>
        <PortalButton
          size="sm"
          disabled
          title="Choose what reaches you — per class and per channel, in Settings. Not open yet."
          className={gates("hideInEssentials")}
        >
          Choose what reaches you — soon
        </PortalButton>
      </div>

      {/* ESSENTIALS GETS THE SENTENCE AND NOTHING ELSE. Its numbers are the
          ledger's, spelled out — see `alert-phrases.ts`. */}
      <p className={`mt-[7px] text-[13px] ${gates("essentialsOnly")}`}>
        That daily watch is the subscription. Since{" "}
        <strong>{watchLedger.since}</strong> it has raised{" "}
        <strong>{alertPhrases.alerts}</strong>, {alertPhrases.action} something of
        you. On the weeks it finds nothing, it says nothing — and it still ran
        every morning.
      </p>

      <div
        className={`mt-3 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[11px] ${gates(
          "hideInEssentials",
        )}`}
      >
        <LedgerFigure figure="Every day">
          A {watchLedger.sweepTime} sweep of the state record against your
          leases. It runs whether or not there is anything to tell you — that is
          the part you&apos;re buying.
        </LedgerFigure>

        <LedgerFigure
          figure={
            <>
              {watchLedger.leases}{" "}
              <span className="text-[13px] text-mv-slate">
                leases · {watchLedger.counties} counties
              </span>
            </>
          }
        >
          Yours, plus the{" "}
          <strong className="tabular-nums">{watchLedger.adjacentLeases}</strong>{" "}
          leases and{" "}
          <strong className="tabular-nums">{watchLedger.standingPermits}</strong>{" "}
          standing permits within about a mile of them.
        </LedgerFigure>

        <LedgerFigure figure={watchLedger.productionFilings}>
          Production filings read on your leases and the ones next door, each
          checked against what your record&apos;s own model expected.
        </LedgerFigure>

        <LedgerFigure figure={watchLedger.alerts}>
          Alerts raised since your last visit.{" "}
          <strong>{alertPhrases.actionWord}</strong> {alertPhrases.actionVerb}{" "}
          something of you; the other {alertPhrases.restWord} are good news,
          neighbours at work, or context.
        </LedgerFigure>
      </div>

      <p
        className={`mt-3 border-t border-mv-portal-ledger-line pt-2.5 text-[12.5px] leading-[1.55] text-mv-portal-ledger-ink ${gates(
          "hideInEssentials",
        )}`}
      >
        <strong>And what it costs, plainly.</strong> Premium is{" "}
        <strong className="tabular-nums">
          ${premiumPricing.monthly.toFixed(2)}
        </strong>{" "}
        a month — about{" "}
        <strong className="tabular-nums">
          ${premiumPricing.weeklyOnMonthly}
        </strong>{" "}
        a week, or about{" "}
        <strong className="tabular-nums">
          ${premiumPricing.weeklyOnAnnual}
        </strong>{" "}
        a week on the annual plan (
        <span className="tabular-nums">
          ${premiumPricing.annual.toFixed(2)}
        </span>
        ). What we will <em>not</em> do is tell you what that watch has
        &ldquo;saved&rdquo; you. Production is public and payment is not: the only
        place an underpayment can be proven is on your own statements, which is
        exactly what the{" "}
        <Link href="/lease-audit">Lease Audit included with your plan</Link> is
        for. What the subscription promises is narrower and testable — the watch
        runs every morning, a quiet week gets a quiet page, and nothing here was
        invented to look busy.
      </p>

      <p
        className={`mt-2.5 text-[11px] leading-[1.6] text-mv-muted ${gates(
          "professionalOnly",
        )}`}
      >
        <strong>Professional note — how the watch is built.</strong> A daily{" "}
        {watchLedger.sweepTime} sweep of RRC production, permit, completion and
        status filings matched against your {watchLedger.leases} lease numbers and
        the 1-mile radius lists around them, plus the price feed, your private
        group threads, the decline model&apos;s band changes and the
        audit-findings store. Events are deduplicated across dashboard, alerts and
        email, so one filing never reaches you three times, and a repeat fires
        only when the underlying fact changes. Every alert carries both its event
        date and the date we detected it. History is kept{" "}
        {watchLedger.historyMonths} months. A week with nothing in it costs the
        same to produce as a week with {watchLedger.alerts} — which is the
        difference between paying for a watch and paying for a feed.
      </p>
    </div>
  );
}

/**
 * One cell of the grid: a serif figure over its caption.
 *
 * Local to this panel because the geometry is the ledger's own (`.aw-n` /
 * `.aw-cap`) and nothing else in the portal stacks a number over a
 * three-line explanation like this. `KpiTile` in `_components/ui/` is the
 * portal-wide version and it is a different shape — a label above a value, in a
 * bordered box.
 */
function LedgerFigure({
  figure,
  children,
}: {
  figure: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-[22px] leading-[1.1] font-extrabold text-mv-green-ink tabular-nums">
        {figure}
      </span>
      <span className="mt-[3px] block text-[11.5px] leading-[1.45] text-mv-slate">
        {children}
      </span>
    </div>
  );
}
