import Link from "next/link";

import { PortalIcon } from "../portal-icon";
import { formatLakhs } from "../../_lib/format-lakhs";
import {
  leaseSnapshot,
  operatorSignals,
  portfolio,
  referral,
  watchedThisMonth,
} from "../../_lib/portal-demo-data";

/**
 * The Dashboard's two-column body — 1.35fr / 1fr on desktop, one column at
 * Essentials and below 900px.
 *
 * WHAT GOES LEFT AND WHAT GOES RIGHT:
 *
 *   LEFT is the outward view and the actions — what is going on around the
 *   owner, the Lease Audit entry, the per-lease estimate, other places to look,
 *   the operator signals, and the raw table for Professional.
 *
 *   RIGHT is the inward view — what Mineral View did for them this month, what
 *   happened this week, and the referral card.
 *
 * The value receipt ("What we watched for you") is the "visibly worth the
 * recurring fee" card: the work that runs whether the owner signs in or not.
 */
export function DashboardColumns() {
  return (
    <div
      className="mv-grid"
      style={{ gridTemplateColumns: "1.35fr 1fr", gap: 18 }}
      id="dashcols"
    >
      <div className="stack" style={{ gap: 18 }}>
        <AroundYouCard />
        <LeaseAuditCard />
        <EstimateByLeaseCard />
        <KeepExploringCard />
        <OperatorSignalsCard />
        <RawSnapshotCard />
      </div>

      <div className="stack" style={{ gap: 18 }}>
        <WatchedThisMonthCard />
        <ThisWeekCard />
        <NewWellProbabilityCard />
        <ReferralCard />
      </div>
    </div>
  );
}

/**
 * v43 · OW-34 — the high-level view first: the world the minerals sell into and
 * the neighbourhood they sit in. "Around me" means both, which is why the local
 * counts sit beside the world headlines rather than in a separate card.
 *
 * MARKET CONTEXT, NEVER ADVICE, and the chip and the footnote both say so. Each
 * headline carries a "Why it matters to you" line, because a headline an owner
 * cannot connect to their own record is noise.
 */
function AroundYouCard() {
  return (
    <div className="card card-pad" style={{ borderLeft: "4px solid var(--green)" }}>
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>What&apos;s going on around you</h4>
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          Market context — not advice
        </span>
      </div>
      <p className="tiny muted" style={{ margin: "4px 0 0" }}>
        The high-level view: the world your minerals sell into, and the
        neighbourhood they sit in.
      </p>

      <div className="as-cats" style={{ margin: "11px 0 0" }}>
        <span className="as-cat" style={{ cursor: "default" }}>
          <b>38</b> permits within ~1 mi
        </span>
        <span className="as-cat" style={{ cursor: "default" }}>
          <b>22</b> leases next door
        </span>
        <span className="as-cat" style={{ cursor: "default" }}>
          <b>3</b> counties · 4 operators
        </span>
      </div>

      <ul className="timeline" style={{ marginTop: 14 }}>
        <li>
          <strong>
            Jul 02, 2026 — Gulf Coast LNG exports keep pulling Texas gas
          </strong>
          <span className="sub tiny muted">
            world · natural gas · source: EIA Natural Gas Weekly Update
          </span>
          <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
            <strong>Why it matters to you:</strong> more demand for Texas gas
            supports the price your gas-heavy Bee units sell into.{" "}
            <span className="ctx-hint">the story + the source →</span>
          </span>
        </li>
        <li>
          <strong>
            Jul 01, 2026 — Major producers hold output steady; crude range-bound
            in the high $60s
          </strong>
          <span className="sub tiny muted">
            world · oil · source: EIA STEO / Reuters Energy
          </span>
          <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
            <strong>Why it matters to you:</strong> steady oil keeps Ledbetter on
            the decline path its math already assumes — no surprise either way.{" "}
            <span className="ctx-hint">the story + the source →</span>
          </span>
        </li>
        <li className="quiet">
          <strong>
            Jun 30, 2026 — Bluestem Oil and Gas, LP posts its monthly production
            batch to RRC
          </strong>
          <span className="sub tiny muted">
            operator · your units · source: Texas RRC production records
          </span>
          <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
            <strong>Why it matters to you:</strong> Bluestem posts in batches —
            this is the filing that refreshed all four of your Smith units this
            week.{" "}
            <span className="ctx-hint">the story + the source →</span>
          </span>
        </li>
      </ul>

      <p className="tiny muted" style={{ marginTop: 8 }}>
        Headlines are context for your gas-weighted record — never a signal to
        buy, sell, or lease. Tap any headline for the plain-English story and
        its real, verifiable source.
      </p>
    </div>
  );
}

/**
 * The Lease Audit entry card — the one surviving Lease Audit pitch on this page.
 *
 * v40 · P0-AUDIT-PROMOS: there were THREE (a rotating spotlight, a "next best
 * action" strip, and this card). The team audit cut it to one card plus the
 * getting-started checklist, because three pitches for the same service on one
 * screen read as a sales page rather than a dashboard.
 *
 * THE CHIP SWAPS WITH THE STATE. D-012: a free claimed owner has no Premium
 * term, so "included with your 12-month Premium term" would be a copy lie in
 * that state. `.cl-hide` / `.cl-only` — same card, honest chip, same one ask.
 *
 * "Your statements are analyzed, not stored" is a promise about the product and
 * it stays on the card, not in a footer somewhere.
 */
function LeaseAuditCard() {
  return (
    <div className="card card-pad" style={{ border: "2px solid var(--green)" }}>
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>
          <span aria-hidden="true">✓</span> Mineral View Lease Audit
        </h4>
        <span className="chip chip-mint cl-hide">
          Included with your 12-month Premium term
        </span>
        <span className="chip chip-mint cl-only">
          Included once your free trial starts
        </span>
      </div>

      <p className="small hide-s" style={{ margin: "8px 0" }}>
        <strong>Is your operator paying you correctly?</strong> Send your check
        stubs — the audit re-computes what each month should have paid.{" "}
        <span className="ctx-hint">How the audit works →</span>
      </p>
      <p className="tier-s" style={{ fontSize: 15, margin: "8px 0" }}>
        Most owners never check whether their checks are right. Yours is{" "}
        <strong>included with your 12-month Premium term</strong> — send us your
        check stubs and we do the math.
      </p>

      <div className="mv-row" style={{ flexWrap: "wrap" }}>
        <span
          className="btn btn-primary btn-sm"
          aria-disabled="true"
          style={{ opacity: 0.6, cursor: "default" }}
        >
          Start my included audit
        </span>
        {/* `.hide-s` in the reference — the calmer views get one action. */}
        <span
          className="btn btn-ghost btn-sm hide-s"
          aria-disabled="true"
          style={{ opacity: 0.6, cursor: "default" }}
        >
          See a sample report
        </span>
      </div>

      <p className="tiny muted" style={{ marginTop: 8 }}>
        Your statements are analyzed, not stored — we keep the findings, never
        the documents. Informational — not legal, tax, or investment advice.
      </p>
    </div>
  );
}

/**
 * MVestimate by lease.
 *
 * The heading swaps by density: Detailed and Professional read "MVestimate by
 * lease — owner share"; Essentials reads "What each lease is worth to you",
 * which is the same fact without the model's vocabulary.
 *
 * `.ck-val` carries `.cl-lock`, and the `<details>` explains the arithmetic
 * rather than asking the reader to trust the figure. The chart itself is the
 * reference's own axed SVG bar chart — no charting library is involved, in it
 * or here.
 */
/**
 * The chart's bars.
 *
 * PLOTTED THE WAY THE REFERENCE ACTUALLY PLOTS THEM AT RUNTIME, which is not
 * what its route file contains. `app.html` carries a static SVG, but
 * `drawDashChart()` runs on load and REPLACES it — so the static markup is a
 * pre-render, not the rendered chart. The two disagree: the static one gives
 * the three inactive leases the COUNTY's figure ($60 / $410 / $410) with a
 * "county" annotation, while the drawn one shows them as `$0` stubs, and the
 * bar heights differ because the static SVG was traced against a different
 * scale.
 *
 * These figures come from the reference's own `DASH_LEASES` through its own
 * geometry for the default MVestimate series: `ymax` 10000,
 * `Y(v) = 240 - (v / 10000) * 190`, `x = 72 + i * 64`,
 * `h = max(v / 10000 * 190, v > 0 ? 2 : 3)`, and the value label seven units
 * above the bar.
 */
const CHART_BARS = [
  { x: 72, y: 74.7, h: 165.3, fill: "#54bf96", label: "$8,700", labelY: 67.7, name: "Smith", no: "305892", zero: false },
  { x: 136, y: 139.3, h: 100.7, fill: "#54bf96", label: "$5,300", labelY: 132.3, name: "Ledbetter", no: "74318", zero: false },
  { x: 200, y: 162.1, h: 77.9, fill: "#54bf96", label: "$4,100", labelY: 155.1, name: "Smith", no: "423065", zero: false },
  { x: 264, y: 183, h: 57, fill: "#54bf96", label: "$3,000", labelY: 176, name: "Cedar Bnd", no: "578204", zero: false },
  { x: 328, y: 190.6, h: 49.4, fill: "#54bf96", label: "$2,600", labelY: 183.6, name: "Cedar Bnd", no: "619473", zero: false },
  { x: 392, y: 200.1, h: 39.9, fill: "#54bf96", label: "$2,100", labelY: 193.1, name: "Cedar Bnd", no: "391756", zero: false },
  { x: 456, y: 229.74, h: 10.26, fill: "#54bf96", label: "$540", labelY: 222.74, name: "Cedar Bnd", no: "480329", zero: false },
  { x: 520, y: 237, h: 3, fill: "#cbd5e1", label: "$0", labelY: 230, name: "Averitt", no: "65081", zero: true },
  { x: 584, y: 237, h: 3, fill: "#cbd5e1", label: "$0", labelY: 230, name: "Smith", no: "267145", zero: true },
  { x: 648, y: 237, h: 3, fill: "#cbd5e1", label: "$0", labelY: 230, name: "Smith", no: "508936", zero: true },
];

function EstimateByLeaseCard() {
  return (
    <div className="chartbox">
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>
          <span className="hide-s">MVestimate by lease — owner share</span>
          <span className="tier-s">What each lease is worth to you</span>
        </h4>
        <span className="flex" style={{ gap: 8, alignItems: "center" }}>
          <span className="ctx-hint">How it&apos;s built →</span>
          <span className="chip chip-est" style={{ fontSize: 10 }}>
            Estimate — not an appraisal
          </span>
        </span>
      </div>

      {/* v40 · D13-CHART-KPI — the headline number sits ABOVE the chart. */}
      <div className="chart-kpi">
        <span className="ck-val num cl-lock">{portfolio.estimate}</span>
        <span className="ck-lbl">
          total owner-share MVestimate · all {portfolio.leaseCount} leases ·
          six-year projection
        </span>
      </div>

      <div className="legend">
        <span>
          <span className="sw" style={{ background: "#54bf96" }} />
          Active lease — MVestimate
        </span>
        <span>
          <span className="sw" style={{ background: "#cbd5e1" }} />
          Inactive — county value shown (model projects ~$0 forward)
        </span>
      </div>

      {/* v6 · the series toggle, export and hover note. The toggle re-charts
          the series and the export writes a CSV; both belong to the chart
          script the reference ships, so they render and are inert here. */}
      <div className="chart-ctl hide-s">
        <span className="range-tgl" role="group" aria-label="Value series">
          <span className="on">MVestimate</span>
          <span>County appraised (2026)</span>
        </span>
        <span className="btn-export">⤓ Export CSV</span>
        <span className="tiny muted">hover a bar for the exact value</span>
      </div>

      {/* THE CHART, ported from the reference's own inline SVG — same viewBox,
          same gridlines, same bar geometry, same axis titles. This was a list of
          progress bars, which was a redesign rather than a port: the reference
          draws a real axed bar chart, and it needs no charting library to do
          it. */}
      <svg
        viewBox="0 0 740 300"
        role="img"
        aria-label="MVestimate by lease bar chart"
      >
        <line x1="60" y1="240" x2="710" y2="240" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="60" y1="145" x2="710" y2="145" stroke="#eef0f3" strokeWidth="1" />
        <line x1="60" y1="50" x2="710" y2="50" stroke="#eef0f3" strokeWidth="1" />
        <text x="54" y="244" fontSize="10" fill="#6b7280" textAnchor="end">
          $0
        </text>
        <text x="54" y="149" fontSize="10" fill="#6b7280" textAnchor="end">
          $5,000
        </text>
        <text x="54" y="54" fontSize="10" fill="#6b7280" textAnchor="end">
          $10,000
        </text>
        <g>
          {CHART_BARS.map((b) => (
            <g key={b.x}>
              <rect
                x={b.x}
                y={b.y}
                width="40"
                height={b.h}
                rx="3"
                fill={b.fill}
              />
              {/* A zero bar's label is grey and un-bolded — the reference
                  distinguishes "nothing projected" from a real figure by
                  weight, not by substituting another number for it. */}
              <text
                x={b.x + 20}
                y={b.labelY}
                fontSize="9.5"
                fontWeight={b.zero ? undefined : "700"}
                fill={b.zero ? "#6b7280" : "#04231a"}
                textAnchor="middle"
              >
                {b.label}
              </text>
            </g>
          ))}
        </g>
        {CHART_BARS.map((b) => (
          <g key={"x" + b.x}>
            <text x={b.x + 20} y="256" fontSize="8.5" fill="#6b7280" textAnchor="middle">
              {b.name}
            </text>
            <text x={b.x + 20} y="266" fontSize="8.5" fill="#6b7280" textAnchor="middle">
              {b.no}
            </text>
          </g>
        ))}
        <text x="385" y="288" fontSize="10" fill="#6b7280" textAnchor="middle">
          Lease (no.) · owner-share MVestimate ($) · forward six-year
          projection
        </text>
        <text
          x="16"
          y="145"
          fontSize="10"
          fill="#6b7280"
          textAnchor="middle"
          transform="rotate(-90 16 145)"
        >
          MVestimate ($)
        </text>
      </svg>

      <p className="tiny muted" style={{ padding: "4px 2px 8px" }}>
        Total across the record:{" "}
        <strong className="num">{portfolio.estimate}</strong> — projected
        six-year earnings at your{" "}
        <span
          className="gloss"
          tabIndex={0}
          title="Your ownership share of a lease, written as a decimal — e.g. 0.00538700. Multiply gross lease dollars by it to get your share."
        >
          decimal interests
        </span>
        .{" "}
        <strong>
          Covers your {portfolio.leaseCount} visible leases · 0 archived
        </strong>{" "}
        — if a plan limit ever archives leases, they&apos;re excluded from
        this estimate and we say so here.{" "}
        <span className="ctx-hint">Open My Leases →</span>
      </p>

      {/* v11 · explain-this expander — methodology transparency on every
          estimate. `.explain` is the reference's own class: the summary carries
          the ⓘ and the body carries the method. */}
      <details className="explain" style={{ margin: "0 10px 12px" }}>
        <summary>
          Explain this estimate — how the {portfolio.estimate} is computed
        </summary>
        <div className="ex-body">
          Per lease: projected monthly production (the decline curve fitted to
          the public RRC record) × the forward price outlook × your
          decimal interest, summed over the next six years, then summed across
          your {portfolio.leaseCount} leases. Inputs refresh as new production
          posts and prices move. It is a{" "}
          <strong>
            market cash-flow projection — not an appraisal, not a payment
            ledger, and not advice
          </strong>
          . The county&apos;s appraised value answers a different question
          (annual tax value); toggle the chart above to compare the two.
        </div>
      </details>
    </div>
  );
}

/** Other places to look. `.hide-s` — Essentials gets one path, not four. */
function KeepExploringCard() {
  return (
    <div className="card card-pad hide-s">
      <h4>Keep exploring</h4>

      <div className="setrow">
        <div>
          <strong className="small">Claim another owner record</strong>
          <div className="tiny muted">a co-owner or family entity</div>
        </div>
        <Link className="btn btn-ghost btn-sm" href="/claim">
          Claim
        </Link>
      </div>

      <div className="setrow">
        <div>
          <strong className="small">Know your operators</strong>
          <div className="tiny muted">{portfolio.operators}</div>
        </div>
        <Link className="btn btn-ghost btn-sm" href="/operators">
          Look up
        </Link>
      </div>

      <div className="setrow">
        <div>
          <strong className="small">Post a question</strong>
          <div className="tiny muted">your county &amp; operator groups</div>
        </div>
        <span
          className="btn btn-ghost btn-sm"
          aria-disabled="true"
          style={{ opacity: 0.6, cursor: "default" }}
        />
      </div>

      {/* The reference's fourth row, which was missing. It is the group-economics
          pitch: every co-owner who joins shrinks each owner's share of a
          professional fee, and the figure recomputes as owners elect — which is
          why the row states the arithmetic rather than just inviting. */}
      <div className="setrow">
        <div>
          <strong className="small">Hire a pro together</strong>
          <div className="tiny muted">
            royalty audit pledge · <span className="num">3 of 12</span> · your
            share ≈$417 — recomputes as owners elect
          </div>
        </div>
        <span
          className="btn btn-mint btn-sm"
          aria-disabled="true"
          style={{ opacity: 0.6, cursor: "default" }}
        >
          Pledge
        </span>
      </div>
    </div>
  );
}

/**
 * Operator payment signals.
 *
 * INFORMATIONAL — NOT A RATING, and the chip, the lead-in and the footnote all
 * say so. This is built from findings owners chose to keep, never from their
 * documents, and it is a signal about what to verify rather than an accusation
 * against an operator. "Not yet audited" is a real band, not a gap.
 */
function OperatorSignalsCard() {
  return (
    <div className="card card-pad hide-s">
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>Operator payment signals</h4>
        <span className="flex" style={{ gap: 8, alignItems: "center" }}>
          <span className="ctx-hint">How scores work →</span>
          <span className="chip chip-slate" style={{ fontSize: 10 }}>
            Informational — not a rating
          </span>
        </span>
      </div>
      <p className="tiny muted" style={{ margin: "4px 0 8px" }}>
        How your operators&apos; payments compare to what owners&apos; audits
        across Mineral View re-compute — a signal to help you decide what to
        verify, never an accusation.
      </p>

      {operatorSignals.map((operator) => (
        <div className="opscore" key={operator.name}>
          <div>
            <strong className="small">{operator.name}</strong>
            <div className="tiny muted">{operator.detail}</div>
          </div>
          <span className={`os-band os-${operator.tone}`}>{operator.band}</span>
        </div>
      ))}

      <p className="tiny muted" style={{ marginTop: 8 }}>
        Built from findings owners chose to keep — never from their documents.
        Verify anything flagged with a Lease Audit or a professional.
      </p>
    </div>
  );
}

/**
 * The raw table — Professional only.
 *
 * VOLUMES ARE GROSS LEASE as posted to the RRC, not the owner's share, which is
 * why the decimal interest sits in the row beside them. An owner reading 58,580
 * mcf as their own gas is the misreading this column arrangement prevents.
 */
function RawSnapshotCard() {
  return (
    <div className="card card-pad tier-p">
      <div className="between">
        <h4>Raw portfolio snapshot</h4>
        <span className="chip chip-slate">Professional view</span>
      </div>

      <div className="tablewrap" style={{ marginTop: 10 }}>
        <table style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Lease (no.)</th>
              <th>County</th>
              <th className="right">
                <span
                  className="gloss"
                  tabIndex={0}
                  title="Your ownership share of a lease, written as a decimal — e.g. 0.00538700. Multiply gross lease dollars by it to get your share."
                >
                  Decimal interest
                </span>
              </th>
              <th className="right">MVestimate</th>
              <th className="right">Gas (mcf)</th>
              <th className="right">Oil (bbl)</th>
              <th className="right">3-mo BOE</th>
            </tr>
          </thead>
          <tbody>
            {leaseSnapshot.map((lease) => (
              <tr key={lease.lease}>
                <td>{lease.lease}</td>
                <td>{lease.county}</td>
                <td className="right num">{lease.decimal}</td>
                <td className="right num cl-lock">
                  {formatLakhs(lease.estimate)}
                </td>
                <td className="right num">{formatLakhs(lease.gas)}</td>
                <td className="right num">{lease.oil}</td>
                <td className="right num">{lease.boe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The reference ends this card at the table — the gross-vs-share caveat
          it needs is already carried by the `.gloss` on "Decimal interest"
          above, so a footnote here would be text the source does not have. */}
    </div>
  );
}

/**
 * The value receipt — v17R · RETENTION.
 *
 * What the subscription actually did this period, in one card, every number
 * real to this record. This is the "visibly worth the recurring fee" moment: the
 * work Mineral View does whether the owner signs in or not, which is exactly
 * what a subscriber cannot otherwise see.
 */
function WatchedThisMonthCard() {
  return (
    <div className="card card-pad hide-s" style={{ borderTop: "3px solid var(--green)" }}>
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>
          <span aria-hidden="true">✦</span> What we watched for you
        </h4>
        <span className="flex" style={{ gap: 8, alignItems: "center" }}>
          <span className="ctx-hint">See the full log →</span>
          <span className="chip chip-mint" style={{ fontSize: 10 }}>
            This month
          </span>
        </span>
      </div>

      <div className="stack" style={{ gap: 0, marginTop: 6 }}>
        {watchedThisMonth.map((row) => (
          <div className="setrow" key={row.label} style={{ flexWrap: "nowrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong className="small">{row.label}</strong>
              <div className="tiny muted">{row.detail}</div>
            </div>
            <strong
              className="num"
              style={{
                fontSize: 18,
                flex: "none",
                color: row.highlight ? "var(--green-deep)" : undefined,
              }}
            >
              {formatLakhs(row.value)}
            </strong>
          </div>
        ))}
      </div>

      <p className="tiny muted" style={{ marginTop: 8 }}>
        This runs whether you sign in or not. Next up: Saturday&apos;s briefing
        and tonight&apos;s record scan.
      </p>
    </div>
  );
}

/**
 * This week, item by item.
 *
 * EVERY ENTRY CARRIES "What it means for you", because a filing an owner cannot
 * interpret is not information. Note the decline entry: smaller checks are "the
 * plan, not a problem" — the share already assumes that slope. Telling an owner
 * that before they panic is the whole job of this card.
 */
function ThisWeekCard() {
  return (
    <div className="card card-pad">
      <h4>This week for you</h4>
      <ul className="timeline" style={{ marginTop: 14 }}>
        <li>
          <strong>New production posted</strong> — Smith Gas Unit (305892):
          27,120 mcf
          <span className="sub tiny muted">
            Bluestem Oil and Gas, LP · Bee Co.
          </span>
          <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
            <strong>What it means for you:</strong> your strongest lease keeps
            earning — this posting feeds your{" "}
            <span className="cl-lock">$8,700</span> six-year share.
          </span>
        </li>
        <li>
          <strong>New production posted</strong> — Smith Gas Unit (423065):
          37,610 mcf
          <span className="sub tiny muted">
            Bluestem Oil and Gas, LP · Bee Co.
          </span>
          <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
            <strong>What it means for you:</strong> steady income on your
            $4,100 unit — a posting on the expected curve, nothing to do.
          </span>
        </li>
        <li>
          <strong>Ledbetter (74318) on its decline curve</strong> — ~8% lower
          this quarter
          <span className="sub tiny muted">
            normal for a well producing since Aug 2019
          </span>
          <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
            <strong>What it means for you:</strong> smaller checks are the plan,
            not a problem — your $5,300 share already assumes this slope.
          </span>
        </li>
        {/* v7 · the event alert — the one item in this list that was SENT, not
            just observed, so it carries when and how. `.alert` is the design's
            own class for it. A neighbour's permit is a signal about the area,
            never the owner's income, and the copy says exactly that. */}
        <li className="alert">
          <strong>
            ⚠ Event alert — nearby-permit list updated: 11 permits within 1 mi of
            Ledbetter (74318)
          </strong>
          <span className="sub tiny muted">
            neighbor tracts · Cass Co. · alert sent Jul 03, 8:12 AM (email +
            push)
          </span>
          <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
            <strong>What it means for you:</strong> a neighbor&apos;s well is a
            signal, not your income — but permits this close tend to keep
            operators interested in your area.{" "}
            <span className="ctx-hint">See the 11 — map + permit list →</span>
          </span>
        </li>
        <li className="quiet">
          <strong>Weekly briefing</strong> — lands Saturday morning
          <span className="sub tiny muted">Jul 04, 2026 · email + in-app</span>
          <span className="sub tiny" style={{ color: "var(--green-deep)" }}>
            <strong>What it means for you:</strong> the five-page coffee read
            answers &ldquo;am I making money?&rdquo; so you don&apos;t have to
            dig.
          </span>
        </li>
      </ul>

      {/* The reference closes this card with the briefing action. */}
      <span
        className="btn btn-ghost btn-sm btn-block"
        aria-disabled="true"
        style={{ marginTop: 12, opacity: 0.6, cursor: "default" }}
      >
        Open this week&apos;s briefing
      </span>
    </div>
  );
}

/**
 * The referral card.
 *
 * THE CONDITION IS STATED UP FRONT: the credit came from a referred co-owner who
 * became a PAID member, and free signups earn nothing. Credits are non-cash and
 * spend on services. Burying either of those would make the card a trap.
 *
 * The group-rate line is the real incentive — every claimed co-owner shrinks the
 * group's share of a professional fee.
 */
/**
 * "New-well probability — will they drill more near you?" — `#dashWellProb`.
 *
 * WHY THIS WAS MISSING, and why no text diff of the route would have caught it:
 * `app.html` carries only `<div id="dashWellProb" class="hide-s"></div>`. The
 * card's markup is built by `wellProbHtml()` in the reference's own scripts and
 * injected by `fillWellProbCards()`, so the route file has an EMPTY container
 * where the card goes.
 *
 * A BAND, NEVER A PERCENTAGE. This is the card's whole design constraint: v1
 * reads spacing, remaining resource, nearby de-risking and lease clauses, and
 * places the lease in Low / Moderate / High with a confidence level. The
 * backtested reservoir-grid model that would justify a calibrated number is
 * still in build, so the card shows direction and reasons instead — and says so
 * twice, in the sub-line and in the expander.
 *
 * `.hide-s` — Essentials does not carry it, matching the reference. It has no
 * funnel-state gate at all, so it reads the same in Claimed, Premium Trial,
 * Trial Ended and Paid. Not Claimed shows the sample dashboard in place of this
 * whole column (`.nc-swap`), which is the reference's behaviour too.
 *
 * The reference's `.anno` spans — a "Directional — model in build" chip and a
 * "(v1)" aside — are review annotations, `display:none !important` outside its
 * `mv-review` mode, so they are not part of what this card renders.
 */
const WELL_PROB_REASONS = [
  "Room to drill — well spacing on your Bee units",
  "Resource remaining — gas EUR not fully drawn down",
  "Nearby de-risking — 22 adjacent leases · 38 permits within ~1 mi",
  "Lease clause — no continuous-development clause on file",
];

function NewWellProbabilityCard() {
  return (
    <div id="dashWellProb" className="hide-s">
      {/* `.kpi-click` is added to this card by the reference itself — the whole
          card opens the all-leases drawer. That drawer is not part of this
          build, so the card is not focusable here, but it keeps the hover
          treatment the reference gives it. */}
      <div
        className="card card-pad kpi-click"
        style={{ borderTop: "3px solid var(--green)" }}
      >
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4>New-well probability — will they drill more near you?</h4>
        </div>

        <p className="tiny muted" style={{ margin: "2px 0 8px" }}>
          Spacing-based indicator. Never a made-up percentage.
        </p>

        <div className="likely-band">
          Moderate{" "}
          <span
            className="chip chip-mint"
            style={{ fontSize: 10.5, fontFamily: "var(--sans)" }}
          >
            Confidence: Medium
          </span>
        </div>

        <p className="small muted" style={{ margin: "10px 0 2px" }}>
          <strong>Why:</strong>
        </p>
        <div className="why-chips">
          {WELL_PROB_REASONS.map((reason) => (
            <span key={reason} className="chip">
              {reason}
            </span>
          ))}
        </div>

        <p className="tiny muted" style={{ marginTop: 10 }}>
          Guardrails:{" "}
          <strong>a neighbor&apos;s well is a signal, not your income</strong> —
          and this is an <strong>estimate, not a certainty</strong>. Permits
          slip, move, and vanish.
        </p>

        {/* v11 · explain-this on the indicator — what "directional" means and
            what ships later. */}
        <details className="explain">
          <summary>
            Explain this indicator — why a band, not a percentage
          </summary>
          <div className="ex-body">
            Today&apos;s v1 reads well spacing, remaining resource, nearby
            de-risking activity, and lease clauses to place the lease in a{" "}
            <strong>band (Low / Moderate / High)</strong> with a confidence
            level. The backtested reservoir-grid model (Phase A, in build) will
            replace the band with a calibrated likelihood once it survives
            backtesting against historical drilling. Until then we show
            direction and reasons —{" "}
            <strong>
              never a percentage the math can&apos;t yet defend
            </strong>
            . You&apos;ll get an alert if this band changes.
          </div>
        </details>

        <div className="flex" style={{ flexWrap: "wrap", marginTop: 10 }}>
          <span className="btn btn-primary btn-sm" aria-disabled="true">
            All {portfolio.leaseCount} leases — each band + why →
          </span>
        </div>

        <p className="tiny muted" style={{ margin: "6px 2px 0" }}>
          This indicator runs <strong>per lease</strong> —{" "}
          <span className="ctx-hint">see each lease&apos;s band + why →</span>{" "}
          (or the full card on any report: Ledbetter · Smith 305892 · My
          Leases).{" "}
          <span className="chip chip-blue" style={{ fontSize: 9 }}>
            Per-lease model not available yet
          </span>
        </p>
      </div>
    </div>
  );
}

function ReferralCard() {
  return (
    <div className="card card-pad hide-s" style={{ borderTop: "3px solid var(--green)" }}>
      <div className="between">
        <h4>Invite co-owners — earn renewal credits</h4>
        <strong className="num">{formatLakhs(referral.earned)}</strong>
      </div>

      <p className="tiny muted" style={{ marginTop: 4 }}>
        Earned from 1 referred co-owner who became a <strong>paid member</strong>{" "}
        (posted after the confirmation window — free signups earn no credit).
        Credits are non-cash and spend on services — like a Lease Audit beyond
        the one included with your annual plan — or auto-apply at your next
        renewal.
      </p>

      <div
        className="progress"
        style={{ height: 8, margin: "10px 0 4px" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={referral.target}
        aria-valuenow={referral.invited}
        aria-label="Co-owner invite progress"
      >
        <div
          className="fill"
          style={{ width: `${(referral.invited / referral.target) * 100}%` }}
        />
      </div>

      <p className="tiny num" style={{ margin: 0 }}>
        <strong>
          {referral.invited} of {referral.target} co-owners invited
        </strong>{" "}
        · every claimed co-owner shrinks the group&apos;s share of any
        professional fee — {referral.groupRate}.
      </p>

      <p className="tiny muted" style={{ marginTop: 6 }}>
        <PortalIcon
          name="groups"
          className="mvi mvi-inline"
        />{" "}
        <strong className="num">{referral.countyProof}</strong> are already on
        Mineral View — your co-owners may recognize the name.
      </p>
    </div>
  );
}
