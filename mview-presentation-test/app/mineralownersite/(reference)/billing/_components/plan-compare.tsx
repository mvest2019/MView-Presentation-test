"use client";

import Link from "next/link";

import { PlanCard } from "@/app/pricing/_components/plan-card";
import { PLANS as PRICING_PLANS } from "@/app/pricing/_components/pricing-content";
import {
  COMPARE,
  COMPARE_EXTRA,
  CURRENT_PLAN_ID,
  MINE_COLUMN,
  PLANS,
  TIER_HEADS,
} from "../_lib/billing-records";

/**
 * THE FOUR PLAN CARDS, AND THE TABLE UNDER THEM.
 *
 * ── WHY BOTH, WHICH LOOKS LIKE SAYING IT TWICE ──
 *
 * They answer different questions. The cards answer "which one am I, and what
 * would I gain or lose by moving" — four columns a reader compares by eye, with
 * the price as the headline and their own tier ringed. The table answers "does
 * plan X include capability Y", which a card cannot do without becoming a
 * table. The source ships both and so does this.
 *
 * ── THE CARD IS `/pricing`'S OWN, NOT A SECOND ONE ──
 *
 * This page used to draw its own four cards. They already read the right
 * FIGURES — `billing-records.ts` has taken those from `pricing-content.ts`
 * since it was built — but they were a different card: a bullet list where the
 * pricing card has a ruled capacity block, no feature groups, no ribbon system.
 * Asked for directly, and it closes the one seam this page had: the foot of it
 * says "Full pricing page →", and a reader who followed that link arrived at
 * the same four plans wearing different clothes.
 *
 * So `PlanCard` is imported and rendered over `PLANS` from `pricing-content`
 * — the ladder itself, not a projection of it. A price, a capacity figure or a
 * whole new tier now reaches this page the moment it reaches `/pricing`, with
 * nothing here to update.
 *
 * ── WHAT THIS PAGE STILL ADDS, BECAUSE `/pricing` CANNOT KNOW IT ──
 *
 * WHICH ONE IS THEIRS. The reader's tier takes the lifted treatment and its
 * ribbon is overwritten with "Your current plan", replacing the "Most popular"
 * a marketing page says to a stranger. `/pricing` is speaking to someone who
 * has no plan; this page is not.
 *
 * AND WHAT PRESSING WOULD DO. Three of the four feet describe a STATE rather
 * than an offer — "Current plan", "Downgrades at end of term", "Switch to Pro
 * at end of term" — which is why `PlanCard` takes a `cta`. They are drawn as
 * buttons so the row lines up, and `is-future` makes them inert and dimmed
 * rather than pretending to be pressable. Only Enterprise has somewhere to go.
 *
 * ── MONTHLY, BECAUSE THAT IS WHAT THE ACCOUNT IS ON ──
 *
 * `/pricing` has a monthly/annual switch because a visitor has not chosen yet.
 * This reader has: `billing="mo"` matches the term they are three months into,
 * and the annual figure is on every card anyway — `periodMo` carries "or
 * $999.90/yr" — and again in the table below.
 *
 * ── THE READER'S OWN COLUMN IS MARKED IN THE TABLE TOO ──
 *
 * A mint wash down the whole column. Without it a reader reads ten rows across
 * four columns and has to keep checking which one is theirs.
 */
export function PlanCards() {
  return (
    /* The outer box measures, the inner one lays out — see `billing.css`. */
    <div className="bill-plans">
      <div className="bill-plans-row">
        {PRICING_PLANS.map((plan) => {
          const mine = plan.id === CURRENT_PLAN_ID;
          /* The foot copy stays where it has always lived. `billing-records`
             keeps one entry per tier keyed the same way `pricing-content` ids
             them, so this is a lookup and not a second list to keep in step. */
          const foot = PLANS.find((tier) => tier.key === plan.id)?.cta;

          return (
            <PlanCard
              key={plan.id}
              billing="mo"
              plan={
                mine
                  ? { ...plan, flag: "Your current plan", emphasis: "popular" }
                  : plan
              }
              cta={
                foot?.href ? (
                  <Link className="btn btn-ghost cta" href={foot.href}>
                    {foot.label}
                  </Link>
                ) : (
                  /* `aria-disabled` and not `disabled`: it is a statement about
                     the account, and a disabled control is skipped by a screen
                     reader — which would drop the one line saying what happens
                     at term end. */
                  <span
                    className="btn btn-ghost cta is-future"
                    aria-disabled="true"
                  >
                    {foot?.label}
                  </span>
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export function CompareTable() {
  return (
    <div className="card" style={{ marginBottom: 18, overflow: "hidden" }}>
      <div className="tablewrap" style={{ border: 0 }}>
        <table className="bill-compare" style={{ minWidth: 680 }}>
          <thead>
            <tr>
              <th>What you get</th>
              {TIER_HEADS.map((head) => (
                <th key={head} className="right">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...COMPARE, ...COMPARE_EXTRA].map((row) => (
              <tr key={row.label}>
                <td className="small">
                  <strong>{row.label}</strong>
                  {row.note ? (
                    <span className="tiny muted cmp-note">{row.note}</span>
                  ) : null}
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={TIER_HEADS[i]}
                    className={`right small${/^[\d$]|^up to|^custom|^contact/.test(cell.value) ? " num" : ""}${
                      cell.value === "—" ? " muted" : ""
                    }`}
                  >
                    {/* the reader's own column is the one that may carry
                        emphasis — see `MINE_COLUMN` */}
                    {cell.strong && i === MINE_COLUMN ? (
                      <strong>{cell.value}</strong>
                    ) : (
                      cell.value
                    )}
                    {cell.sub ? (
                      <div className="tiny muted">{cell.sub}</div>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted" style={{ padding: "10px 16px" }}>
        All paid plans are 12-month terms — monthly billing, or prepay the year
        and pay ten months for twelve. Never auto-renewed.{" "}
        <Link href="/pricing#plans">Full pricing page →</Link>
      </p>
    </div>
  );
}
