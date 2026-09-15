"use client";

import Link from "next/link";

import { Band } from "../../../_components/reference/bits";
import { usePortalViewState } from "../../../_components/reference/view-state";
import { ACCOUNT, YEAR_REVIEW } from "../_lib/billing-records";
import { Fold, WhyThisPage } from "./bits";
import { InvoicesCard } from "./invoices-card";
import { CompareTable, PlanCards } from "./plan-compare";
import { CreditsAndTermEnd, TermRenewal } from "./term-credits";

/**
 * BILLING & PLAN.
 *
 * PORTED FROM the demo build's `#/app/billing`, which serves it as
 * `<section data-route="app-billing">` on the same design system as the rest of
 * this portal — `.card`, `.chip`, `.btn`, `.kpi`, `.timeline`, `.tablewrap`,
 * and the `tier-u` / `tier-s` / `hide-s` density gates. That is why almost
 * nothing here is new CSS: the page was already speaking this sheet's language.
 *
 * ── THE FOUR DENSITIES, WHICH THE SOURCE ALSO HAS ──
 *
 * The source expresses them as CSS classes on sibling cards. Here they are
 * `Band`, for the reason `bits.tsx` records: the CSS gate depends on the child
 * being a direct descendant of the route section, which a component tree cannot
 * promise, and a wrong depth silently hides the whole page.
 *
 *   Ultra       one card: what you are on, that it never renews without you,
 *               and the credit balance. One button through to the detail.
 *   Essentials  the same answer in one paragraph, with the plan's contents
 *               named.
 *   Detailed +  the whole page: current plan, the comparison, the year in
 *               review, invoices, the term, the credits and the term-end
 *               decision.
 *
 * ── NOT CLAIMED IS A DIFFERENT PAGE, NOT A DIMMED ONE ──
 *
 * With nothing claimed there is no plan, no invoice and no credit — so the
 * page's own cards would be furniture around three empty states. The source
 * swaps in a short "how the plans work once you claim" page ending on the claim
 * CTA, and so does this. It is the same call `InviteView` makes and for the
 * same reason.
 *
 * ── EVERY FIGURE IS ILLUSTRATIVE AND THE PAGE SAYS SO ──
 *
 * The amber chip under the title is not decoration. No billing service stands
 * behind this page; the prices, invoices and credits are the fixture in
 * `_lib/billing-records.ts`. The chip is what keeps the page from reading as an
 * offer, and it stays until real billing is wired.
 */
export function BillingView() {
  const view = usePortalViewState();
  /* `null` means this is rendering outside the shell — show the claimed page
     rather than a claim prompt, the same fallback `InviteView` uses. */
  const claimed = view === null || view.funnel !== "unclaimed";
  const tier = view?.tier ?? "detailed";

  return (
    <section data-route="app-billing" className="active">
      <WhyThisPage>
        <strong>What this page is for:</strong> your plan, your invoices and your
        credits — terms never renew without your explicit click.
      </WhyThisPage>

      <div className="mv-illus-row">
        <span
          className="illus-chip"
          role="note"
          title="Every dollar amount on this page is an illustrative placeholder, not an offered or binding price."
        >
          Illustrative pricing — not an offer
        </span>
      </div>

      {claimed ? <Claimed tier={tier} /> : <NotClaimed />}
    </section>
  );
}

function Claimed({ tier }: { tier: "ultra" | "simple" | "detailed" | "pro" }) {
  return (
    <>
      <div className="between" style={{ flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, margin: 0 }}>Billing &amp; Plan</h2>
          <p className="small muted" style={{ margin: "2px 0 0" }}>
            {ACCOUNT.headline}
          </p>
        </div>
        <Band tier={tier} from="detailed">
          <div className="flex" style={{ flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span className="chip chip-mint">1-year terms · never auto-renewed</span>
            {/* IT SCROLLS, IT DOES NOT NAVIGATE. The comparison is on this page
                and open by default, so the button's job is to put it in front
                of the reader — which is what the source's own handler does. */}
            <a className="btn btn-primary" href="#planCompare">
              Manage plan — compare &amp; change ↓
            </a>
          </div>
        </Band>
      </div>

      {/* ---------------------------------------------------------- ULTRA */}
      <Band tier={tier} to="ultra">
        <div
          className="card card-pad"
          style={{ borderTop: "3px solid var(--green)", marginBottom: 18 }}
        >
          <h3 style={{ marginBottom: 6 }}>Your plan</h3>
          <p style={{ fontSize: 15, margin: "0 0 10px" }}>
            You&rsquo;re on <strong>{ACCOUNT.planName}</strong>, billed monthly. It{" "}
            <strong>never renews without your approval</strong> — when the year
            ends, billing simply stops unless you choose to continue. You have{" "}
            <strong className="num">{ACCOUNT.creditBalance}</strong> in referral
            credits.
          </p>
        </div>
      </Band>

      {/* ----------------------------------------------------- ESSENTIALS */}
      <Band tier={tier} from="simple" to="simple">
        <div className="card card-pad simple-hero" style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 6 }}>Your plan, in one line</h3>
          <p style={{ fontSize: 15, margin: "0 0 8px" }}>
            You&rsquo;re on{" "}
            <strong>
              {ACCOUNT.planName} — {ACCOUNT.monthlyPrice.replace("/mo", "")} a month
            </strong>
            . All 10 of your leases are visible ({ACCOUNT.planName} opens two
            owner records at ten leases each), plus the monthly report printed
            and mailed to you, your private document vault, and{" "}
            <strong>three Lease Audits a year on three leases</strong>. Your plan{" "}
            <strong>never renews without you clicking</strong> — when the year
            ends, billing simply stops unless you choose to continue.
          </p>
        </div>
      </Band>

      {/* --------------------------------------------- DETAILED AND ABOVE */}
      <Band tier={tier} from="detailed">
        <div
          className="card card-pad"
          style={{ border: "2px solid var(--green)", marginBottom: 14 }}
        >
          <div className="between" style={{ flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ marginBottom: 2 }}>Current plan — {ACCOUNT.planName}</h3>
              <p className="small muted" style={{ margin: 0 }}>
                <strong className="num">{ACCOUNT.monthlyPrice}</strong> ·{" "}
                {ACCOUNT.termLine}
              </p>
            </div>
            <div className="flex" style={{ flexWrap: "wrap", gap: 8 }}>
              <span className="chip chip-mint">Active · paid</span>
              <Link className="btn btn-ghost btn-sm" href="/mineralownersite/soon/lease-audit">
                Start an included audit
              </Link>
            </div>
          </div>
        </div>

        <Fold title="Compare plans — what each tier shows" id="planCompare" open>
          <PlanCards />
          <CompareTable />
        </Fold>

        <Fold title="Your year in review — what Mineral View did for you">
          <div
            className="card card-pad"
            style={{ borderTop: "3px solid #b8892f", marginBottom: 4 }}
          >
            <div className="between" style={{ flexWrap: "wrap", gap: 8 }}>
              <h4>Before you decide — what Mineral View did for you this year</h4>
              <span className="chip chip-slate" style={{ fontSize: 10 }}>
                shown before every renewal decision
              </span>
            </div>
            <div className="grid g3" style={{ margin: "12px 0 4px", gap: 10 }}>
              {YEAR_REVIEW.map((stat) => (
                <div className="kpi" style={{ boxShadow: "none" }} key={stat.label}>
                  <div className="k-label">{stat.label}</div>
                  <div className="k-val num">{stat.value}</div>
                  <div className="k-sub">{stat.sub}</div>
                </div>
              ))}
            </div>
            <p className="tiny muted">
              This receipt arrives with the 60/30/14/7-day renewal reminders, so
              the renew / switch / revert decision is always made with the year in
              front of you — never from a blank invoice.
            </p>
          </div>
        </Fold>

        <InvoicesCard />

        <Fold title="Term & renewal — how the 12-month term works">
          <TermRenewal />
        </Fold>

        {/* `id="credits"` is the anchor the profile card's "See the full
            ledger" link lands on — see `_lib/referral-credits.ts`. */}
        <Fold title="Credits & term-end decision" id="credits">
          <CreditsAndTermEnd />
        </Fold>
      </Band>
    </>
  );
}

/**
 * NOTHING CLAIMED — see the note on `BillingView`.
 *
 * Free is $0, so the honest headline is that there is nothing to pay and
 * nothing to show. The four plan rows say what each tier would cost once there
 * IS a record to put on one, and the page ends on the claim.
 */
function NotClaimed() {
  return (
    <>
      <div className="between" style={{ flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, margin: 0 }}>Billing &amp; Plan</h2>
          <p className="small muted" style={{ margin: "2px 0 0" }}>
            Free plan · $0 · no payment method on file
          </p>
        </div>
        <span className="chip chip-mint">You owe nothing — Free is $0 forever</span>
      </div>

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h4>How the plans work once you claim</h4>
        <p className="small muted" style={{ margin: "6px 0 10px" }}>
          Plans differ by <strong>visible leases</strong> — leases your plan shows
          in full. Until you claim, Free costs nothing and there&rsquo;s nothing
          to pay for.
        </p>

        <div className="setrow">
          <div>
            <strong className="small">Free — $0 forever</strong>
            <div className="tiny muted">
              1 active owner · 1 visible lease · weekly report (headline + that
              lease) · public browse
            </div>
          </div>
          <span className="chip chip-mint">Your plan</span>
        </div>
        <div className="setrow">
          <div>
            <strong className="small">
              Pro — $49.99/mo · $499.90/yr · 12-mo term
            </strong>
            <div className="tiny muted">
              1 owner record · up to 5 visible leases · full weekly report ·
              portfolio exports · dossier-aware AI
            </div>
          </div>
          <span className="tiny muted">after claim</span>
        </div>
        <div className="setrow">
          <div>
            <strong className="small">
              Premium — $99.99/mo · $999.90/yr · 12-mo term
            </strong>
            <div className="tiny muted">
              2 owner records · 10 leases each · monthly report printed and
              mailed · document vault · 3 Lease Audits a year on 3 leases
              ($1,500 of value)
            </div>
          </div>
          <span className="tiny muted">after claim</span>
        </div>
        <div className="setrow">
          <div>
            <strong className="small">Enterprise — contact only</strong>
            <div className="tiny muted">
              entities, trusts, advisors — professional plans are Enterprise-only
            </div>
          </div>
          <Link className="small" href="/contact-us">
            contact →
          </Link>
        </div>

        <p className="tiny muted" style={{ marginTop: 10 }}>
          Every paid plan is a 12-month term billed monthly, or prepaid annually
          — pay ten months, get twelve. No auto-renew; renewal always needs your
          explicit approval. <Link href="/pricing#plans">Full pricing</Link> ·{" "}
          <Link href="/subscription-terms">Subscription Terms</Link>.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h4>Invoices</h4>
        <p className="small muted" style={{ margin: "6px 0 0" }}>
          None — you haven&rsquo;t paid anything. Receipts and invoices will live
          here.
        </p>
      </div>

      <div className="nc-hero">
        <h3 style={{ fontSize: 19, marginBottom: 8 }}>
          Most owners claim first, then decide.
        </h3>
        <p className="small" style={{ maxWidth: 600, margin: "0 0 12px" }}>
          Claiming is free and shows the <strong>lease list</strong> on your owner
          record. On Free you then choose <strong>1 lease to view in full</strong>{" "}
          — the rest stay listed by name but locked until you upgrade.
          You&rsquo;ll know exactly how many leases you&rsquo;d want visible
          before paying for anything.
        </p>
        <Link className="btn btn-primary" href="/mineralownersite/claim">
          Claim my owner record
        </Link>
      </div>
    </>
  );
}
