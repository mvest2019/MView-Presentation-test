import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "../../../_components/ui/badge";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { Notice } from "../../../_components/ui/notice";
import { portalGate } from "../../../_components/ui/portal-gating";
import { ViewTierLink } from "../../../_components/ui/view-tier-link";
import { formatCount, formatDollars } from "../../_lib/lease-format";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { DeclineFigureRow } from "../_lib/decline-curve-record";
import type { LeaseReportRecord } from "../_lib/lease-report-types";
import { DeclineCurvePro } from "./decline-curve-pro";

/**
 * "DECLINE CURVE ANALYSIS" — the forecast, and how far to trust it.
 *
 * ── FOUR TIERS ANSWERING FOUR DIFFERENT QUESTIONS ──
 *
 *   Ultra         how much is left, and what it is worth to me — two sentences
 *   Essentials    "How much is left?" — the tail in plain words, no grades
 *   Detailed      the P90/P50/P10 spread, how the curve was built, how it backfits
 *   Professional  the backtest bands, what the grade cannot tell you, the workbench
 *
 * The heading itself swaps per tier rather than the panel being rebuilt: the
 * Essentials reader gets "How much is left?" over the same content boundary, so
 * moving up a tier expands what they were already looking at instead of
 * relocating it.
 *
 * `tier-d` and `tier-p` are each EXCLUSIVE (see `portal.css`), so Detailed and
 * Professional are alternatives, not cumulative. A Pro reader does not see the
 * three-case spread; see `DeclineCurvePro` for why that is right.
 *
 * ── ONLY THE LEASE WITH AN ENGINE RECORD GETS THIS PANEL ──
 *
 * `report.declineCurve` is set for one lease. The other nine have no published
 * curve document, and this panel is the easiest thing in the module to fake
 * convincingly, so they render nothing here at all.
 *
 * ── THE WARNING IS LOUDER THAN THE FORECAST ──
 *
 * The backfit card carries an amber edge and opens "Read this as a warning, not
 * a footnote", because grade E on a 99.1%-depleted unit means the remaining
 * volume should be read as "nearly nothing, and we cannot tell you the shape of
 * it". The panel then says the forecast leans ~11% LOW and declines to quietly
 * add it back — the correction belongs in the model, not in a thumb on the scale.
 */
export function DeclineCurvePanel({ report }: { report: LeaseReportRecord }) {
  const curve = report.declineCurve;
  const recovery = report.recovery;
  if (!curve || !recovery) return null;

  const { lease } = report;
  /* The share of this unit's whole life still ahead of it — the Essentials
     reader's version of "life remaining", derived rather than transcribed. */
  const percentLeft = Math.round((recovery.reservesGas / recovery.eurGas) * 100);
  const share = formatDollars(lease.mvestimate);

  return (
    <div className="mb-4 rounded-mv border border-mv-line bg-mv-card p-[18px] shadow-mv">
      <CardHeader
        title={
          <h4 className="text-[15px] font-bold">
            <span className={portalGate.hideInEssentials}>
              Decline curve analysis — the whole lease, and how far to trust it
            </span>
            <span className={portalGate.essentialsOnly}>How much is left?</span>
            <span className={portalGate.ultraOnly}>What is left</span>
          </h4>
        }
        action={
          <Badge tone="estimate" size="xs" className={portalGate.hideInUltra}>
            {curve.gradeChip}
          </Badge>
        }
      />

      {/*
        The Ultra sentence. Unreachable while the report's Ultra gate replaces
        the page with the verdict card — kept because it is the panel's own
        answer at that tier, and the day the gate changes this reads correctly
        instead of showing a Detailed wall.
      */}
      <div className={portalGate.ultraOnly}>
        <p className="mt-1.5 text-base">
          About{" "}
          <strong>{formatCount(recovery.reservesGas)} mcf</strong> of gas is
          still expected here — roughly <strong>six more years</strong>. Your
          share is{" "}
          <strong className={portalGate.lockedValue}>{share}</strong>.
        </p>
      </div>

      <Card
        className={`mt-2 border-l-4 border-l-mv-green ${portalGate.essentialsOnly}`}
      >
        <h3 className="mb-1.5 text-lg font-bold">
          Most of this unit&rsquo;s gas has already been produced
        </h3>
        <p className="mb-2 text-[15px]">
          About{" "}
          <strong>{formatCount(recovery.reservesGas)} units of gas</strong> are
          still expected over the next six years — that is{" "}
          <strong>{percentLeft}%</strong> of everything this unit will ever make,
          and it is where your{" "}
          <span className={portalGate.lockedValue}>{share}</span> comes from. A
          long, shallow tail like this is the steadier kind of forecast to make.
        </p>
        <p className="mb-2 text-[11px] text-mv-muted">
          We grade every forecast A to E on how well it tracked history.{" "}
          <strong>This unit&rsquo;s grade is not published yet</strong> — when it
          is, it appears at the top of this panel rather than being buried here.
        </p>
        <ViewTierLink tier="detailed">
          See the range and the assumptions
        </ViewTierLink>
      </Card>

      <div className={portalGate.detailedOnly}>
        <p className="mt-1.5 mb-2 text-[13px]">
          A decline curve is a range, not a line. The engine publishes three: a
          low case, an expected case and a high case. The spread is what the
          forecast does <em>not</em> know.
        </p>

        <Notice tone="mint" glyph="◎" className="mb-2.5">
          <strong>Real example, honestly labeled.</strong> The numbers below are
          the engine&rsquo;s actual published output for{" "}
          <strong>{curve.engineUnit}</strong> ({curve.rrcNote}) — the same real
          unit drawn in the chart above. The fictional {lease.name} demo lease has
          no engine record, and we do not invent one. On a wired lease report this
          panel carries <em>that lease&rsquo;s</em> own figures.
        </Notice>

        <div className="mb-2.5 grid gap-3 min-[900px]:grid-cols-2">
          <Card>
            <CardHeader
              title={
                <h4 className="text-[15px] font-bold">
                  Gas still to come — {curve.engineUnitShort}
                </h4>
              }
              action={
                <Badge tone="estimate" size="xs">
                  Range, not a promise
                </Badge>
              }
            />
            <FigureRows rows={curve.remaining} />
          </Card>

          <Card>
            <CardHeader
              title={
                <h4 className="text-[15px] font-bold">
                  How the curve was built
                </h4>
              }
              action={
                <Badge tone="slate" size="xs">
                  Arps · least squares
                </Badge>
              }
            />
            <FigureRows rows={curve.build} />
          </Card>
        </div>

        <Card className="mb-2.5 border-l-4 border-l-mv-amber">
          <CardHeader
            title={
              <h4 className="text-[15px] font-bold">
                How well the curve tracked history — {curve.engineUnitShort}
              </h4>
            }
            action={
              <Badge tone="slate" size="xs">
                Derived by us, not the engine
              </Badge>
            }
          />
          <FigureRows rows={curve.backfit} />
          <p className="mt-2 text-[13px]">
            <strong>Read this as a warning, not a footnote.</strong> Grade E is
            the bottom band: on the backtest, leases scoring here missed by a
            median <strong>{curve.bandMedianMiss}</strong>, and the worst tenth
            by multiples. This unit is <strong>{curve.depleted}</strong> depleted
            and its last two years are erratic near-zero months — that is
            precisely where a decline curve stops meaning much. The remaining{" "}
            <strong>{curve.expectedCase}</strong> should be read as &ldquo;nearly
            nothing, and we cannot tell you the shape of it&rdquo;.
          </p>
          <p className="mt-1.5 text-[11px] text-mv-muted">
            Only <strong>{curve.scoreableMonths}</strong> months in the recent
            window carried scoreable volume, against the 24 the grade assumes —
            and the engine&rsquo;s own rule excludes leases under ~24 producing
            months. {curve.setAsideMonths} shut-in months were set aside from
            scoring, never from fitting: downtime is not evidence of decline.
          </p>
        </Card>

        <p className="mb-2.5 text-[11px] text-mv-muted">
          This unit is at the very end of its life:{" "}
          <strong>{curve.depleted}</strong> of everything it will ever produce is
          already in the ground behind it. A late-life tail is the easiest shape
          to fit and the least valuable to own — the two usually go together, and
          the grade should not be read as a statement about the lease being{" "}
          <em>good</em>.
        </p>

        <Notice tone="mint" glyph="◎" className="mb-2.5">
          <strong>The forecast leans low, and we are not hiding it.</strong>{" "}
          Measured against six years of held-back history, the engine&rsquo;s
          expected case came in about <strong>{curve.biasUnder}</strong> what
          leases actually produced — and it under-shoots further on the weaker
          grades. We publish the number rather than quietly adding 11% back,
          because the fix belongs in the model, not in a thumb on the scale.
        </Notice>

        <p className="text-[11px] text-mv-muted">
          Ranges come from a 60-month hold-out test on 140 leases — the engine
          forecasts six years, so a six-year test is the honest one. A 24-month
          test scores better and would flatter us.
        </p>
      </div>

      <DeclineCurvePro curve={curve} />

      <p className={`mt-2.5 text-[13px] ${portalGate.hideInUltra}`}>
        <strong>This figure is the whole lease, before any split.</strong> One
        lease can have several wells, and the engine divides this total between
        them by perforated length, proppant and 24-hour test rate. That
        per-wellbore split — and how confident it is — lives on the{" "}
        <Link
          href={leaseReportPath(lease.number, "wells")}
          className="font-semibold text-mv-green-deep underline decoration-mv-green/40 underline-offset-2"
        >
          Wells report
        </Link>
        . Your own share is a separate step again: the decimal interest applied
        above.
      </p>

      <p
        className={`mt-0 px-0.5 pt-2 text-[10px] leading-[1.5] text-mv-muted ${portalGate.hideInUltra}`}
      >
        Source: the decline-curve engine&rsquo;s published per-lease record —{" "}
        <Mono>decline-curve records.Data_to_web</Mono>, document{" "}
        <Mono>{curve.document}</Mono>, read pre-computed at build time so this
        page never fits a curve and never waits on a database.{" "}
        <strong>Curve last re-solved {curve.reSolved}</strong>; record last
        touched {curve.recordTouched} — a forecast has an as-of date like any
        other figure, and this one is the curve&rsquo;s, not today&rsquo;s. The
        engine flags this lease <Mono>STATE: {curve.engineState}</Mono>, with no
        data-loss or wrong-data marker. Volumes are gross to the lease; your
        share applies a decimal interest of{" "}
        {lease.decimalInterest.toFixed(8)}. <strong>
          Not reserves in the SEC sense
        </strong>{" "}
        and not an offer to buy.
      </p>
    </div>
  );
}

/**
 * The figure rows, with the Pro-only legs gated individually.
 *
 * `StatRow`'s own `last:border-b-0` is why the gate goes on a wrapper here: a
 * hidden last row would otherwise leave a hairline under the visible one.
 */
function FigureRows({ rows }: { rows: DeclineFigureRow[] }) {
  return (
    <div className="mt-1">
      {rows.map((row) => (
        <div
          key={row.label}
          className={row.proOnly ? portalGate.professionalOnly : undefined}
        >
          <StatRow
            label={<span className="text-[13px]">{row.label}</span>}
            value={
              <span className="text-[13px]">
                {row.value}
                {row.note && (
                  <span className="ml-1 text-[11px] text-mv-muted">
                    {row.note}
                  </span>
                )}
              </span>
            }
          />
        </div>
      ))}
    </div>
  );
}

/** An engine identifier — a table, a document number, a state flag. */
function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[4px] bg-mv-bg px-[3px] font-mono text-[9.5px]">
      {children}
    </code>
  );
}
