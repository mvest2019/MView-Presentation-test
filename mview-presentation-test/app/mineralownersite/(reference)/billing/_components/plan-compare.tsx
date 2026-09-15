"use client";

import Link from "next/link";

import {
  COMPARE,
  COMPARE_EXTRA,
  MINE_COLUMN,
  PLANS,
  TIER_HEADS,
} from "../_lib/billing-records";
import { Emphasise } from "./bits";

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
 * ── THE READER'S OWN COLUMN IS MARKED IN BOTH ──
 *
 * The card carries the ribbon and the green border; the table runs a mint wash
 * down the whole column. Without it a reader reads ten rows across four columns
 * and has to keep checking which one is theirs.
 *
 * ── THE CTA THAT IS NOT AN ACTION ──
 *
 * Three of the four foot controls describe a STATE, not a thing to press:
 * "Current plan", "Downgrades at end of term", "Switch to Pro at end of term".
 * They are drawn as buttons because the source draws them as buttons —
 * the row has to line up — and `is-future` makes them inert and dimmed rather
 * than pretending to be pressable. Only Enterprise has somewhere to go.
 */
export function PlanCards() {
  return (
    <div className="plan-grid" style={{ marginBottom: 18 }}>
      {PLANS.map((plan) => (
        <div key={plan.key} className={`plan${plan.current ? " hot" : ""}`}>
          {plan.current ? (
            <span className="chip chip-mint" style={{ alignSelf: "flex-start" }}>
              Your current plan
            </span>
          ) : null}
          <h3>{plan.name}</h3>
          <div className={`price${plan.price.startsWith("$") ? " num" : ""}`}>
            {plan.price}
            {plan.priceNote ? <span>{plan.priceNote}</span> : null}
          </div>
          <p className="small muted">
            <Emphasise text={plan.summary} />
          </p>
          <ul>
            {plan.points.map((point) => (
              <li key={point.text} className={point.no ? "no" : undefined}>
                <Emphasise text={point.text} />
              </li>
            ))}
          </ul>
          {plan.cta.href ? (
            <Link className="btn btn-ghost cta" href={plan.cta.href}>
              {plan.cta.label}
            </Link>
          ) : (
            /* `aria-disabled` and not `disabled`: it is a statement about the
               account, and a disabled control is skipped by a screen reader —
               which would drop the one line saying what happens at term end. */
            <span className="btn btn-ghost cta is-future" aria-disabled="true">
              {plan.cta.label}
            </span>
          )}
        </div>
      ))}
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
                    {cell.sub ? <div className="tiny muted">{cell.sub}</div> : null}
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
