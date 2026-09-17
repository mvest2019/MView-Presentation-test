"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ACCOUNT,
  KEEP_LEASES,
  LEDGER,
  MVESTIMATE_DEF,
  TERM_END_CHOICES,
  TERM_STEP_TAILS,
  TERM_STEPS,
  type TermEndChoice,
} from "../_lib/billing-records";

/** the glossary word, with the one definition all three copies share */
function MVestimate() {
  return (
    <span className="gloss" tabIndex={0} data-def={MVESTIMATE_DEF}>
      MVestimate
    </span>
  );
}

/**
 * HOW THE TERM WORKS, AND WHAT HAPPENS AT THE END OF IT.
 *
 * ── THE TIMELINE IS FOUR STEPS AND THE LAST ONE IS DRAWN BACK ──
 *
 * Three have happened and one has not, and `.quiet` is the difference. It is
 * the same rule the invite rail follows: what has not happened yet is shown as
 * not-yet, never as unavailable.
 *
 * ── THE RENEWAL PANEL IS AN EXAMPLE, AND SAYS SO ──
 *
 * There is no renewal to approve — the term runs to 2027 — so the panel shows
 * the approval a reader WILL be asked for, labeled as an example. That is the
 * source's own framing and it is load-bearing: the whole argument of this page
 * is that nothing renews without an explicit click, and the way to make that
 * credible is to show the click before it is needed.
 */
export function TermRenewal() {
  const [renewed, setRenewed] = useState(false);

  return (
    <div className="grid g3" style={{ alignItems: "start" }}>
      <div className="card card-pad">
        <h4>How your term works</h4>
        <ul className="timeline" style={{ marginTop: 14 }}>
          {TERM_STEPS.map((step, i) => (
            <li key={step.title} className={step.quiet ? "quiet" : undefined}>
              <strong>{step.title}</strong>
              {TERM_STEP_TAILS[i]}
              <span className="sub tiny muted">{step.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card card-pad" style={{ borderTop: "3px solid var(--green)" }}>
        <h4>Renewal — requires your explicit approval</h4>
        <p className="small muted" style={{ margin: "6px 0 10px" }}>
          When your {ACCOUNT.planName} term nears its end, this panel activates.
          A new term <strong>never starts without your click</strong> — this is
          how the approval will look:
        </p>
        <div className="notice slate" style={{ marginBottom: 10 }}>
          <span aria-hidden="true">⏱</span>
          <div>
            <strong>Example:</strong> &ldquo;Your {ACCOUNT.planName} term ends
            next year. Renew for another year — your{" "}
            <strong className="num">{ACCOUNT.creditBalance}</strong> referral
            credit auto-applies: annual prepay{" "}
            <span className="num">
              {ACCOUNT.renewalExample.annual} − {ACCOUNT.renewalExample.credit} ={" "}
              {ACCOUNT.renewalExample.payable}
            </span>
            .&rdquo;
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setRenewed(true)}
          aria-live="polite"
        >
          {renewed
            ? "Renewed for 1 year ✓ (prototype demo)"
            : "Renew for another year — one click"}
        </button>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          Do nothing, and the account simply moves to Free at end of term.
          Private lease groups become read-only; leases beyond the Free limit are
          archived, never deleted.
        </p>
      </div>

      <div className="card card-pad">
        <h4>Checkout demo flows</h4>
        <p className="small muted" style={{ margin: "6px 0 10px" }}>
          <Link href="/pricing#plans">See the upgrade checkout flow</Link> ·
          checkout states are not built on this account yet.
        </p>
        <p className="tiny muted">
          Invoices moved up — they now live in the searchable table under your
          current plan.
        </p>
      </div>
    </div>
  );
}

/**
 * THE CREDIT LEDGER, AND THE DECISION AT TERM END.
 *
 * ── THE $0.00 ROW IS THE POINT OF THE LEDGER ──
 *
 * A free signup earns nothing; only a paid conversion that clears the 30-day
 * window posts a credit. Showing the row that paid nothing beside the row that
 * paid $100 is what stops "a credit per referral" being read as a promise, and
 * it is the same argument the invite page's two zero rungs make.
 *
 * ── THE RADIOS ARE REAL AND NOTHING IS SUBMITTED ──
 *
 * There is no store to write a term-end choice to. The controls hold their
 * state so a reader can see what each option says, and "Save my pick" reports
 * that it was pressed — which is honest — rather than claiming a saved choice
 * the account cannot remember.
 */
export function CreditsAndTermEnd() {
  const [choice, setChoice] = useState<TermEndChoice>("revert");
  const [keep, setKeep] = useState(KEEP_LEASES[0].key);
  const [saved, setSaved] = useState(false);

  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <div className="card card-pad">
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4>Referral-credit ledger</h4>
          <span className="chip chip-mint">Balance: {ACCOUNT.creditBalance}</span>
        </div>
        {LEDGER.map((entry) => (
          <div className="ledger-row" key={entry.title}>
            <div>
              <strong className="small">{entry.title}</strong>
              <div className="tiny muted">{entry.detail}</div>
            </div>
            <span className={`num small ledger-bal${entry.credited ? " paid" : ""}`}>
              {entry.balance}
            </span>
          </div>
        ))}
        <p className="tiny muted" style={{ marginTop: 10 }}>
          No credit at a free signup. A <strong>$100 referral credit</strong>{" "}
          posts after your referred co-owner becomes a <strong>paid member</strong>{" "}
          and clears the 30-day confirmation window. Credits are{" "}
          <strong>non-cash</strong> and apply automatically to your{" "}
          <strong>next renewal</strong> (or an eligible service).
        </p>
      </div>

      <div className="card card-pad">
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4>Term-end decision — renew, switch, or revert to Free</h4>
          <span className="chip chip-slate">Nothing is ever deleted</span>
        </div>

        <div className="stack" style={{ gap: 8, margin: "6px 0 10px" }}>
          {TERM_END_CHOICES.map((option) => (
            <label className="bill-choice" key={option.key}>
              <input
                type="radio"
                name="term-end"
                checked={choice === option.key}
                onChange={() => setChoice(option.key)}
              />
              <span>
                <strong>{option.title}</strong>{" "}
                <span className="tiny muted">{option.detail}</span>
              </span>
            </label>
          ))}
        </div>

        <p className="small muted" style={{ margin: "0 0 10px" }}>
          <strong>Effective date: {ACCOUNT.termEndDate}</strong> (your term end —
          your {ACCOUNT.planName} features run in full until then). If you revert
          to Free, <strong>9 of your 10 leases become hidden</strong> — archived
          out of dashboards, maps, reports, alerts, and <MVestimate /> totals
          (never deleted) — and private lease groups become read-only. Your choice
          is confirmed on screen and by email/PDF.
        </p>
        <p className="small muted" style={{ margin: "6px 0 10px" }}>
          If you revert to Free (1 visible lease), pick which lease stays visible
          — everything else is archived and fully restored if you ever upgrade
          again.
        </p>

        <div className="stack" style={{ gap: 8 }}>
          {KEEP_LEASES.map((lease) => (
            <label className="bill-choice" key={lease.key}>
              <input
                type="radio"
                name="keep-lease"
                checked={keep === lease.key}
                onChange={() => setKeep(lease.key)}
              />
              <span>
                {lease.label}
                {lease.suggested ? (
                  <>
                    {" "}
                    <MVestimate />
                    <span className="tiny muted"> · suggested</span>
                  </>
                ) : null}
              </span>
            </label>
          ))}
          <span className="tiny muted" style={{ paddingLeft: 22 }}>
            … or any of your {ACCOUNT.otherLeaseCount} other leases
          </span>
        </div>

        <p className="tiny muted" style={{ marginTop: 8 }}>
          <strong>Archived leases stay attached to your owner record</strong> —
          they&rsquo;re just excluded from dashboards, maps, reports, alerts, and{" "}
          <MVestimate /> totals until you upgrade or reselect them. Downgrading
          never deletes claims and never changes ownership.
        </p>

        <button
          type="button"
          className="btn btn-ghost btn-sm btn-block"
          style={{ marginTop: 10 }}
          onClick={() => setSaved(true)}
          aria-live="polite"
        >
          {saved ? "Choice saved for term end ✓ (prototype)" : "Save my pick for term end"}
        </button>

        <p className="tiny muted" style={{ marginTop: 8 }}>
          Private lease groups become read-only on Free. Weekly briefing continues
          for your visible lease. Change your pick anytime before the term ends —{" "}
          <Link href="/subscription-terms">cancellation &amp; downgrade policy</Link>.
        </p>
      </div>
    </div>
  );
}
