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
            supports the price your gas-heavy Bee units sell into.
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
            the decline path its math already assumes — no surprise either way.
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
            week.
          </span>
        </li>
      </ul>

      <p className="tiny muted" style={{ marginTop: 8 }}>
        Headlines are context for your gas-weighted record — never a signal to
        buy, sell, or lease.
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
        stubs — the audit re-computes what each month should have paid.
      </p>
      <p className="tier-s" style={{ fontSize: 15, margin: "8px 0" }}>
        Most owners never check whether their checks are right. Yours is included
        with your plan — send us your check stubs and we do the math.
      </p>

      <div className="mv-row" style={{ flexWrap: "wrap" }}>
        <span
          className="btn btn-primary btn-sm"
          aria-disabled="true"
          style={{ opacity: 0.6, cursor: "default" }}
        >
          Start my included audit — soon
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
 * rather than asking the reader to trust the figure. The bar list stands in for
 * the reference's chart — a chart library is out of scope for this foundation,
 * and a labelled bar per lease carries the same comparison honestly.
 */
function EstimateByLeaseCard() {
  const top = leaseSnapshot.filter((lease) => lease.estimate !== "$0");
  const max = Math.max(
    ...top.map((lease) => Number(lease.estimate.replace(/[$,]/g, ""))),
  );

  return (
    <div className="chartbox">
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h4>
          <span className="hide-s">MVestimate by lease — owner share</span>
          <span className="tier-s">What each lease is worth to you</span>
        </h4>
        <span className="chip chip-est" style={{ fontSize: 10 }}>
          Estimate — not an appraisal
        </span>
      </div>

      <div className="chart-kpi">
        <span className="ck-val num cl-lock">
          {formatLakhs(portfolio.estimate)}
        </span>
        <span className="ck-lbl">
          total owner-share MVestimate · all {portfolio.leaseCount} leases ·
          six-year projection
        </span>
      </div>

      <div className="stack" style={{ gap: 7, margin: "12px 0 14px" }}>
        {top.map((lease) => {
          const value = Number(lease.estimate.replace(/[$,]/g, ""));
          return (
            <div key={lease.lease} className="tiny">
              <div className="between" style={{ gap: 8 }}>
                <span>
                  {lease.lease} · {lease.county}
                </span>
                <span className="num cl-lock" style={{ fontWeight: 700 }}>
                  {formatLakhs(lease.estimate)}
                </span>
              </div>
              <div
                className="progress"
                style={{ height: 6, marginTop: 3 }}
                aria-hidden="true"
              >
                <div className="fill" style={{ width: `${(value / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
        <p className="tiny muted" style={{ margin: "2px 0 0" }}>
          Four further leases have not produced enough to carry a projection yet.
        </p>
      </div>

      <details className="devsources" style={{ marginBottom: 10 }}>
        <summary>
          Explain this estimate — how the {portfolio.estimate} is computed
        </summary>
        <p className="tiny" style={{ marginTop: 8, lineHeight: 1.55 }}>
          Per lease: projected monthly production (the decline curve fitted to
          the public RRC record) × the forward price outlook × your decimal
          interest, summed over the next six years, then summed across your{" "}
          {portfolio.leaseCount} leases. Inputs refresh as new production posts
          and prices move. It is a{" "}
          <strong>
            market cash-flow projection — not an appraisal, not a payment ledger,
            and not advice
          </strong>
          . The county&apos;s appraised value answers a different question
          (annual tax value).
        </p>
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
        >
          Soon
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
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          Informational — not a rating
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

      <p className="tiny muted" style={{ marginTop: 8 }}>
        Gas and oil volumes are gross lease as posted to the RRC — not your
        share. Apply your decimal interest for that.
      </p>
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
        <span className="chip chip-mint" style={{ fontSize: 10 }}>
          This month
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
            <strong>What it means for you:</strong> steady income — a posting on
            the expected curve, nothing to do.
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
            not a problem — your share already assumes this slope.
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
        Credits are non-cash and spend on services, or auto-apply at your next
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
