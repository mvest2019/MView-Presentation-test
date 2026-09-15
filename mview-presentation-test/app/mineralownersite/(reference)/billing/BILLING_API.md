# Billing & Plan — what the backend has to provide

`/mineralownersite/billing` is built and rendering. Every **price** on it is now
read from this repo's own pricing ladder
(`app/pricing/_components/pricing-content.ts`), so plan names, monthly and
annual figures, capacities and the add-on lease are correct and cannot drift
from `/pricing`.

Everything that is about **this account** — which term, which invoices, which
credits — is still a fixture in `_lib/billing-records.ts`. This document is the
list of endpoints that replace it, and the shape each one has to return.

Nothing here needs a new UI. Each endpoint maps onto an exported constant that
already exists, so wiring is swapping a constant for a fetch.

---

## 0. What is already correct and needs no API

| On the page | Source | Status |
|---|---|---|
| Plan names, prices, periods | `pricing-content.ts` → `PLANS` | ✅ canonical |
| Capacities (records, leases, add-on) | `pricing-content.ts` → `PLANS[].access` | ✅ canonical |
| Comparison rows (price, term, capacity) | `pricing-content.ts` → `COMPARE_ROWS` | ✅ canonical |

If the ladder changes, this page changes with it. A renamed tier or a removed
comparison row makes the build **throw** rather than render a card with no price
in it — see `planFor()` and the `COMPARE` builder.

**The prices are still not an offer.** `/pricing` and the FAQ both carry "all
pricing is illustrative for design review — not yet an offer", so the amber chip
on this page stays until that sentence comes off those pages too.

---

## 1. `GET /api/v1/billing/subscription` — the account's plan and term

Replaces: `ACCOUNT` in `_lib/billing-records.ts`.

Drives: the page header, the Ultra and Essentials cards, the "Current plan"
card, the term timeline, the renewal example, the term-end effective date.

```jsonc
{
  "plan_id": "premium",              // MUST match an id in pricing-content PLANS
  "billing_mode": "mo",              // "mo" | "yr"
  "status": "active",                // active | past_due | cancelled | lapsed | none
  "term": {
    "started_at": "2026-05-12",
    "ends_at": "2027-05-12",
    "month_of": 3,                   // which month of the term we are in
    "months_total": 12,
    "auto_renew": false              // always false today; the page says so
  },
  "usage": {
    "owner_records_used": 1,
    "owner_records_allowed": 2,      // may echo the ladder, never contradict it
    "leases_visible": 10,
    "leases_allowed": 20,
    "addon_leases": 0
  },
  "audits": { "included": 3, "used": 0, "leases": 3 },
  "credit_balance_cents": 10000,
  "payment_method": {                // null when none on file (Free)
    "processor": "braintree",
    "brand": "visa",
    "last4": "4242"
  }
}
```

Notes for whoever builds it:

- **`plan_id` is the contract.** The page looks the plan up in the pricing
  ladder by this id and reads the name and prices from there. Do **not** send a
  price in this payload — two sources for one figure is the bug this page was
  just fixed for.
- `status: "none"` (or a 404) is the not-claimed / Free case, which the page
  already renders as its own variant.
- `auto_renew` is `false` for every account today. The page's central promise is
  that nothing renews without an explicit click; if this ever returns `true` the
  copy has to change with it.

---

## 2. `GET /api/v1/billing/invoices` — the invoice table

Replaces: `INVOICES`.

Drives: the Invoices card. Search is client-side over what is returned, so this
can stay unpaginated until an account has enough terms to need paging.

```jsonc
{
  "invoices": [
    {
      "id": "inv_2026_07",
      "title": "Premium — monthly",
      "plan_id": "premium",
      "kind": "subscription",        // subscription | proration | service | refund
      "processor": "Braintree (PayPal)",
      "payment_method_hint": "card ending 4242",   // nullable
      "period_label": "Jul 2026 · month 3 of 12",
      "amount_cents": 9999,
      "currency": "USD",
      "status": "paid",             // paid | open | failed | refunded | void
      "issued_at": "2026-07-12",
      "pdf_url": "/api/v1/billing/invoices/inv_2026_07.pdf"   // nullable
    }
  ]
}
```

- **`pdf_url` is what makes the Download button real.** Today it confirms the
  press and stops, because there is nothing to fetch. When this field arrives,
  point the button at it. It must not be a blank tab or a zero-byte file — a
  broken download reads as a broken product, an honest "not yet" does not.
- Send `amount_cents`, not a formatted string. The page formats.

---

## 3. `GET /api/v1/billing/credits` — the referral-credit ledger

Replaces: `LEDGER` and `ACCOUNT.credit_balance`.

```jsonc
{
  "balance_cents": 10000,
  "entries": [
    {
      "id": "cr_001",
      "kind": "referral_paid_conversion",  // referral_signup | referral_paid_conversion | spend | expiry
      "amount_cents": 10000,               // 0 for a signup that earned nothing
      "balance_after_cents": 10000,
      "occurred_at": "2026-06-18",
      "headline": "+ $100.00 — paid-conversion referral",
      "detail": "your referred co-owner became a paid member and cleared the 30-day confirmation window"
    }
  ]
}
```

- **Send the zero-value rows too.** The `$0.00 — free-account signup (no credit)`
  row is the reason the page can be honest that a credit posts only on paid
  conversion. Filtering it server-side would turn the ledger into a promise.
- Credits are non-cash and auto-apply at renewal — that rule is stated on the
  page, so the renewal quote in §1/§5 must reflect it.

---

## 4. `GET /api/v1/billing/year-in-review` — what the term bought

Replaces: `YEAR_REVIEW`.

Six figures, shown before every renewal decision.

```jsonc
{
  "term_started_at": "2026-05-12",
  "stats": {
    "leases_watched": 10,
    "alerts_sent": 18,
    "production_changes_flagged": 2,
    "weekly_briefings": 12,
    "audits_included": 3,
    "audits_used": 0,
    "referral_credits_cents": 10000
  }
}
```

**These are derivable from services that already exist** — alerts, the weekly
briefing, the audit module — so this is an aggregation endpoint rather than new
data. It could also be computed client-side from the existing payload, but it
covers a *term*, and the portal's payload covers a snapshot; a term-scoped
aggregate belongs on the server.

---

## 5. Writes — needed before the controls stop being prototypes

These four controls currently hold local state and report that they were
pressed. Each needs one endpoint.

| Control | Endpoint | Body |
|---|---|---|
| **Renew for another year** | `POST /api/v1/billing/renew` | `{ "term_months": 12, "billing_mode": "mo" \| "yr" }` |
| **Save my pick for term end** | `PUT /api/v1/billing/term-end-intent` | `{ "choice": "renew" \| "switch" \| "revert", "target_plan_id": "pro" \| null, "keep_lease_ids": ["305892"] }` |
| **Download PDF** | `GET /api/v1/billing/invoices/{id}.pdf` | — |
| **Start an included audit** | existing audit module | — |

`term-end-intent` also needs a **read** (`GET`) so a returning reader sees the
choice they saved. Right now the page cannot show a saved choice because there
is nowhere to have saved one, and it says so rather than implying otherwise.

### Checkout

Upgrade / downgrade / payment-method changes are **not** on this page and should
not be. The page links to `/pricing#plans`, and `pricing-content.ts` already
carries the checkout hrefs (`/plan-checkout?plan=pro`, `?plan=premium`). Those
routes do not exist in this app yet — that is a separate build, and Braintree
lives behind it.

---

## 6. Things to settle before wiring

1. **The naming collision.** "Pro" is a **billing plan** in
   `pricing-content.ts` and a **view density** in `lib/entitlements.ts`
   (`ultra | essential | detailed | pro`). They are unrelated axes with one
   word. Worth renaming one before billing is wired and the ambiguity reaches
   an API field.

2. **The captured payload still carries prices.**
   `_lib/reference/owner-payload.json` → `alerts.ledger.price_month` /
   `price_annual` is a real field on the alerts payload. If the live service
   keeps sending prices there, they must come from the same ladder, or the
   Alerts page's watch-ledger panel and this page will disagree. Consider
   dropping the price fields from the alerts payload entirely and having the
   client read the ladder.

3. **`status` vs the demo funnel.** The portal's five funnel states
   (`unclaimed / claimed / trial / lapsed / paid`) are still a demo menu backed
   by `localStorage` — nothing in any API distinguishes them, which
   `Portal.tsx` documents. `subscription.status` in §1 is the field that would
   finally make them real, and it should drive the funnel rather than a second
   mechanism being invented beside it.
