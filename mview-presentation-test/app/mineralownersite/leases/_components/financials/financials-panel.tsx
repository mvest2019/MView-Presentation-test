import { Badge, EstimateBadge } from "../../../_components/ui/badge";
import { Card, CardHeader, StatRow } from "../../../_components/ui/card";
import { KpiTile } from "../../../_components/ui/kpi-tile";
import {
  formatApproxDollars,
  formatDecimalInterest,
  formatDollars,
  formatLeaseTitle,
} from "../../_lib/lease-format";
import {
  incomeBasis,
  latestMonth,
  monthlyIncome,
  yearToDateIncome,
  yearToDateRange,
} from "../../_lib/lease-financials";
import { statementsThisYear } from "../../_lib/lease-statements";
import {
  annualTotal,
  mvestimateTotal,
  portfolioSummary,
  producingLeases,
} from "../../_lib/lease-totals";
import { AnnualPerLeaseTable } from "./annual-per-lease-table";
import { CountyValueChart } from "./county-value-chart";
import { IncomeTrendChart } from "./income-trend-chart";

/**
 * THE FINANCIALS TAB — three KPIs, two charts, a year summary, a per-lease table.
 *
 * A COMPOSITION AND NOTHING ELSE. Each of the four blocks below is its own file
 * or its own small section; this component decides the order and the two-column
 * layout, which is the one thing none of them can decide for themselves.
 *
 * ── EVERY FIGURE ON THIS TAB IS LABELLED AS ONE OF THREE THINGS ──
 *
 *   derived        from a captured report curve × this owner's decimal interest.
 *                  Only Ledbetter has such a curve, so only Ledbetter's monthly
 *                  figures are derived, and the tab says so four times.
 *   illustrative   a straight-line split of a six-year model output.
 *   estimate       the six-year projection itself — forward-looking, not an
 *                  appraisal and not a payment ledger.
 *
 * The repetition is not clutter. This is the screen where somebody decides
 * whether they are being paid what they are owed, and the answer depends on
 * knowing that none of these figures is a statement of what was paid — which is
 * what the closing paragraph says in as many words.
 */
export function FinancialsPanel() {
  const strongest = producingLeases.reduce((best, lease) =>
    lease.mvestimate > best.mvestimate ? lease : best,
  );

  return (
    <div>
      <div className="mb-4 grid gap-[18px] md:grid-cols-3">
        <KpiTile
          accent
          label={`Owner-share income · ${latestMonth.label}`}
          value={formatDollars(latestMonth.share)}
          basis={
            <>
              {incomeBasis.leaseTitle}, derived: gross × DI{" "}
              {formatDecimalInterest(incomeBasis.decimalInterest)} ·{" "}
              <Badge tone="estimate" size="xs">
                Derived
              </Badge>
            </>
          }
        />
        <KpiTile
          locked
          label="2026 owner-share est. · portfolio"
          value={formatApproxDollars(annualTotal)}
          basis={
            <>
              straight-line from six-year MVestimate ·{" "}
              <Badge tone="estimate" size="xs">
                Illustrative
              </Badge>
            </>
          }
        />
        <KpiTile
          locked
          label="Six-year projection"
          value={formatDollars(mvestimateTotal)}
          basis={
            <>
              your {portfolioSummary.leaseCount} visible leases · 0 archived —
              archived leases are never silently included · <EstimateBadge />
            </>
          }
        />
      </div>

      {/* 1.35fr / 1fr is the design's split — the trend needs the width, the
          summary column does not. One column below the medium breakpoint, where
          a 740-wide chart beside a stat list would squeeze both. */}
      <div className="grid gap-[18px] lg:grid-cols-[1.35fr_1fr]">
        <Card className="pb-2">
          <CardHeader
            title={
              <h4 className="text-[15px] font-bold">
                Owner-share monthly income — {monthlyIncome[0].label} to{" "}
                {latestMonth.label}
              </h4>
            }
            action={
              <Badge tone="estimate" size="sm">
                Modeled — {incomeBasis.leaseTitle.split(" ")[0]} only · gross × DI
              </Badge>
            }
          />
          <IncomeTrendChart />
          <p className="px-0.5 pt-0.5 pb-2 text-[10px] text-mv-muted">
            Derived from the {incomeBasis.leaseTitle} lease cash-flow curve × your
            DI {formatDecimalInterest(incomeBasis.decimalInterest)} — the only
            lease with a fully captured curve in this prototype. Statement-level
            figures for all {portfolioSummary.leaseCount} leases are not available
            yet — they land in the full product. {incomeBasis.peakNote}
          </p>
        </Card>

        <Card>
          <CardHeader
            title={
              <h4 className="text-[15px] font-bold">
                Where your {formatDollars(mvestimateTotal)} sits
              </h4>
            }
            action={<EstimateBadge />}
          />
          <CountyValueChart />

          <hr className="my-3 border-mv-line" />

          <h4 className="mb-1 text-[15px] font-bold">Year summary — 2026</h4>
          {/* THE CURVE, NOT THE STATEMENTS. `drawFinTrend()` in the prototype
              overwrites this cell at runtime with the Jan–Jun sum of the same
              series the chart draws, rendered as "$1,082 (Jan–Jun)"; the `$540`
              in its markup never reaches a reader. See `yearToDateIncome`. */}
          <StatRow
            label={`Owner-share income, YTD (derived ${
              incomeBasis.leaseTitle.split(" ")[0]
            })`}
            value={`${formatDollars(yearToDateIncome)} (${yearToDateRange})`}
          />
          <StatRow
            label="Portfolio 2026 estimate (illustrative)"
            value={formatApproxDollars(annualTotal)}
          />
          <StatRow
            label="Strongest lease"
            value={`${formatLeaseTitle(strongest.name, strongest.number)} · ${formatDollars(
              strongest.mvestimate,
            )} / 6 yr`}
          />
          <StatRow
            label="Leases contributing"
            value={`${portfolioSummary.producingCount} of ${portfolioSummary.leaseCount}`}
          />

          <p className="mt-2.5 text-[10px] text-mv-muted">
            Figures marked <em>derived</em> come from report curves × your decimal
            interest; figures marked <em>illustrative</em> are straight-line splits
            of the six-year MVestimate. Neither is a payment ledger — your operator
            statements remain the record of what was paid. The YTD row above is
            the curve&apos;s {yearToDateRange} months; the Monthly Reports tab
            lists the {statementsThisYear} statements actually posted in 2026,
            which are a separate record and do not match it month for month.
          </p>
        </Card>
      </div>

      <AnnualPerLeaseTable />
    </div>
  );
}
