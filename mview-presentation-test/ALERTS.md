# The Alerts page

`/mineralownersite/alerts` — everything that changed on the owner's record,
each row opening the evidence behind it.

This document covers the route end to end: where every figure comes from, what
renders in each of the four densities and the unclaimed state, what every
control does, which numbers were measured and where they came from, and what is
still missing. It is written against the code as it stands.

The companion document for the other half of the same snapshot is
[ACTIVITIES.md](ACTIVITIES.md).

---

## 1. Where it lives

| Concern | File |
|---|---|
| Route (server half) | `app/mineralownersite/(reference)/alerts/page.tsx` |
| The page itself | `app/mineralownersite/_components/reference/AlertsView.tsx` |
| Shell, drawer, **read state** | `app/mineralownersite/_components/reference/Portal.tsx` |
| Sidebar rail badge and the bell | `app/mineralownersite/_components/reference/Chrome.tsx` |
| Density gate (`Band`) | `app/mineralownersite/_components/reference/bits.tsx` |
| Evidence drawer | `app/mineralownersite/_components/reference/DrawerPanel.tsx` |
| **The data seam** | `app/mineralownersite/_lib/reference/owner-data.ts` |
| Owner-keyed API client (`/alerts`) | `app/mineralownersite/_lib/reference/owner-api.ts` |
| Payload types | `app/mineralownersite/_lib/reference/payload.ts` |
| Committed fallback capture | `app/mineralownersite/_lib/reference/owner-payload.json` |
| Number/plural formatters | `app/mineralownersite/_lib/reference/fmt.ts` |

### The second alert record, which is a different product

`app/mineralownersite/(portal)/alerts/_lib/` is an **earlier, hand-written**
alert set — `alert-records.tsx` (9 records), `alert-types.ts`,
`alert-counts.ts`, `alert-filters.ts`, `alert-explainers.tsx`. Its route page is
gone; the route at `/mineralownersite/alerts` is the reference's.

It is not dead code, though. Three files still import it:

| File | What it reads |
|---|---|
| `app/mineralownersite/_components/portal-top-nav.tsx` | `alertCounts.unread` — the bell badge on the `(portal)` chrome |
| `app/mineralownersite/_lib/portal-nav.ts` | `alertCounts.unread` — the sidebar row pill |
| `app/mineralownersite/_lib/portal-demo-data.ts` | `alertCounts`, `alertFilters`, `alertRecords` — the portal rollup |

So the `(portal)` group's chrome counts one record and the `(reference)` group's
chrome counts another. Inside each group the counts agree; across the two they
do not, because they are two different datasets. The `(portal)` copy carries its
own five-axis model (`category` · `severity` · `deliveryClass` · `unread`, with
`actionRecommended` derived rather than stored) and its own category key set —
`model` where the reference uses `models`.

`app/mineralownersite/_components/dashboard/alerts-summary.tsx` defines
`AlertsSummary` and nothing imports it.

---

## 2. Data flow

```
 browser  ──▶  (reference)/alerts/page.tsx       server component, force-dynamic
                    │   owner / num / dist / year off the query string
                    ▼
              getOwnerPayload(sel)                THE SEAM — owner-data.ts
                    │
        ┌───────────┴───────────┐
        │                       │
   signed in                not signed in / no API base
   MEMBER-KEYED              OWNER-KEYED  ──▶  GET /api/v1/alerts
   /api/v1/dashboard                           (awaited ALONE, first)
        │                       │
        └───────────┬───────────┘
                    │   withAlertDrawers() rebuilds every `alert:<id>` panel
                    ▼
              Payload  ──▶  <Portal route="alerts" initial={payload} />
                                    │
                                    ├─ null payload? client retries /api/portfolio
                                    │
                                    └─ <Chrome> … <AlertsView p tier funnel sample
                                                    open go readIds markRead />
```

`/alerts` is awaited **alone and first**, before the three activity reads run in
parallel. `owner-api.ts` records the reason: issuing it alongside them is the
same read twice on a cold owner.

`force-dynamic` — the owner comes off the query string, so there is nothing
correct to cache at the page level.

### The payload block

`Payload['alerts']` (`payload.ts`) carries:

| Field | What it is |
|---|---|
| `items[]` | the alert rows |
| `count`, `counts` | total, and per category (`all` / `money` / `activity` / `models` / `community`) |
| `ledger` | the watch-ledger figures — §5 |
| `action_count`, `important_count`, `context_count` | the severity split |
| `since_label`, `window_label`, `window_note` | the period the page is about |
| `notes[]` | "what the record could not tell us" |
| `quiet`, `quiet_reason` | why a quiet page is quiet |

---

## 3. The shape of one alert

`Alert = Payload['alerts']['items'][number]`. Four axes look similar on screen
and mean different things, so they are four fields rather than one "kind":

| Axis | Values | What it drives |
|---|---|---|
| `category` | `money` · `activity` · `models` · `community` | the filter row, and the icon tile's tint |
| `severity` | `action` · `important` · `context` | the text tag, the `sev-action` row rule, the "asks something of you" count |
| `klass` | `Urgent` · `Important digest` · `Educational` · `Community` | which rail it travels on, and therefore what Settings can turn off. **Professional tier only** |
| `unread` | boolean | the green left rule, the sidebar badge, the bell |

The severity tag carries **colour and words**, never colour alone — a
colour-blind reader has to be able to sort the inbox too. `action` renders
"Action recommended", `important` renders "Important", `context` renders no tag.

The rest of the row: `icon`, `title`, `body`, `why`, `lead_lease`, `lease_id`,
`metric` / `metric_unit`, `event_label`, `detected_label`, `evidence[]`,
`action_label` / `action_href`, `link`, `next_step`, `stats[]`, `spark` /
`spark_label`, `channels`.

**"Asks something of you" is exactly `severity === 'action'`** — not unread, not
money, not urgent delivery. Widening that predicate is how a page saying "one
thing needs you" becomes a page saying four do, which is the inbox anxiety the
design exists to avoid.

### The category to tile-colour map

```
money      gold
models     blue
activity   mint (default)
community  mint (default)
```

The tile colour *is* the category, so a scan down the left edge groups without
reading.

---

## 4. What renders when

Density is decided in React by `Band`, not in CSS — the prototype's density rule
needs a direct child of the route section, which a component tree cannot promise.

| Tier | What is on the page |
|---|---|
| **Ultra** | one dot, one kicker, one headline — *"One thing needs a look"* or *"Nothing needs you today"* — the lead alert's own sentence, a four-figure stat strip, one button, the "also on your record" list, and the retention line |
| **Essentials** | the header with mark-all-read, the alerts-in-one-line card, and the rows |
| **Detailed** | adds the **watch ledger**, the search box, the quiet-week card, the delivery footer |
| **Professional** | adds the class legend, the method note under the ledger, the per-row class chip, the per-row evidence-line count, a fourth stat cell, and the email-policy footer |
| **Not claimed** | the claim rail above everything, the sample badge, the claim CTA at the foot. `Portal` forces the density to `pro` while nothing is claimed |

The Ultra tier is *undivided*, not *empty*. It was landing on a sentence and a
button — nothing to weigh, and nothing to suggest a fuller view existed. It now
carries four figures (`al.count`, `lg.action_count`, `lg.leases`,
`lg.production_filings`), each already printed somewhere below, plus the four
non-action alerts as a title-only list.

---

## 5. The watch ledger

The panel headed **"What you are actually paying for"**, and the reason the page
exists in this form. The argument it makes: on a quiet week the alert list is
the weakest possible case for renewing a subscription; the ledger is the
strongest, because it is true on quiet weeks too.

It makes **no savings claim**. Production is public, payment is not, and the
only place an underpayment can be proven is the owner's own statements — which
is what a lease audit is for. The promise is narrower and testable: the watch
ran every morning, a quiet week gets a quiet page, and nothing was invented to
look busy.

### The four cells

| Cell | Source |
|---|---|
| "Every day" | prose, plus `ledger.last_read_label` |
| *N* **filings read** | `p.timeline.events.length` — the whole matched feed before any filter — falling back to `production_filings + nearby_filings`. Caption: `ledger.leases`, `ledger.counties`, `timeline.mine_count`, `ledger.adjacent_leases`, `ledger.standing_permits` |
| production filings | `ledger.production_filings`, `ledger.nearby_filings` |
| alerts raised | `ledger.alerts`, `ledger.action_count`, `ledger.rest_count` |

The volume leads deliberately. The cell used to open on the lease count, which
is the *smallest* true figure the panel holds, and it set the scale a reader
judged the rest by. Nothing is scaled or rounded up — it is a different true
figure, not the same one inflated — and `timeline.mine_count` keeps the caption
honest about how many landed on the reader's own leases.

### The ledger must never print a zero

`watchLedger(p)` in `AlertsView.tsx` is a backstop. Empty, the panel renders

> "We read the public record on your 0 leases every day" · "0 leases · 0
> counties" · "0" filings · "0" alerts · "Premium is  a month — about  a week"

which is the strongest available argument *against* subscribing, printed on the
one page whose job is to say what subscribing buys. A reader who has claimed
nothing is exactly the reader the panel is written for, and the one it was
failing.

`owner-data.ts` already swaps an empty ledger for the captured one, and runs
first. `watchLedger` covers every other way the block can arrive empty — a
payload assembled elsewhere, a cached RSC render from before that guard, a
future caller that skips the seam.

**What it substitutes**, derived from the rest of the payload rather than
asserted, so the panel cannot contradict the page:

| Ledger field | Derived from |
|---|---|
| `leases` | `totals.lease_count` |
| `counties` | `totals.county_count` |
| `wells` / `operators` | `totals.well_count` / `totals.operator_names.length` |
| `adjacent_leases` | `rings.rings['1'].neighbours.length` |
| `production_filings` | `timeline.counts.production` |
| `nearby_filings` | `activities.counts.nearby` |
| `alerts` / `action_count` / `rest_count` | the list rendered directly below |

Checked against the captured ledger, which the service computes independently:
10 leases, 1 county, 7 adjacent, 10 wells, 3 operators — the derivation
reproduces all five exactly.

**`leases` is the gate.** A populated ledger is trusted entirely, because a zero
inside one is a fact (an owner really can have no standing permits) and filling
it would invent a permit that does not exist.

**What stays zero deliberately:** `standing_permits` and `lease_months_read`
have no honest source elsewhere in the payload, so they are left at zero and the
two clauses that print them are guarded out. A missing clause is a smaller lie
than a fabricated permit.

An earlier version used a fixed set and was wrong in the field: a reader with 54
leases got "your 10 leases" directly under an alert reading "44 of your 54
leases filed production". A constant cannot know whose record it is on. The only
constants left are the plan prices, which are the same for every reader by
definition — `$99.95` / mo, `$999.50` / yr, `$23` / wk, `$19` / wk annual.

---

## 6. The controls

### Read state — owned by the shell, not the page

This used to be `useState` inside `AlertsView`, which is where the reference put
it. There, pressing "Mark all 6 read" emptied the page's Unread chip while the
sidebar rail and the bell went on saying 6, because `Chrome` counts
`alerts.items[].unread` straight off the payload. Two counts of one thing,
disagreeing on screen.

`Portal` owns `readIds: Set<string>` and hands it to both `AlertsView` and
`Chrome`, so `unread = a.unread && !readIds.has(a.id)` is asked once.

- **Persisted** to `localStorage` under `mv.alertsRead`, alongside `mv.tier` and
  `mv.funnel`. `unread` is the *server's* opinion and the contract says read
  state is client-side, so the browser is the right home for it.
- **Pruned on every new snapshot** by an effect on `data.alerts.items`. Two of
  the contract's ids carry a period or a lease (`filed-<YYYYMM>`,
  `handover-<lease_id>`), so an id stops existing when the month rolls.
  Unpruned, the key grows for ever and could resurrect a stale id.
- Every `try` / `catch` around it is for private mode, where nothing read yet is
  the correct default.

### The filter row

Five pills — All · Money · Activity · Models & forecasts · Community — counted
from `al.counts`. **A pill with a zero count is not rendered** (except `all`).
An Unread pill appears at the far right only while something is unread, and
pressing it marks everything read.

### Search

Detailed and above. Matches `title`, `body`, `lead_lease`, `klass`,
`event_label` and every line of `evidence`, joined and lowercased — the same
strings the reader can see, rather than a hidden index. The placeholder promises
"lease, operator, county, or any word".

Category and search are **both gates, always**. A search that silently reset the
category would strand a reader who narrowed to Money and then typed a lease
name. A search with no hits offers "clear it and show all *N*", which clears
both.

---

## 7. The row

Clicking or pressing Enter/Space on a row marks it read **and** opens
`alert:<id>` in the drawer. The whole row is `role="button"`, with an
`aria-label` that leads with "Action recommended." when the severity says so.

```
[icon tile]  [severity tag] Title        [class chip] why?   Jul 04 · email + push
             one-line body                                   expand →
             ┌──────────┬──────────┬──────────┐  ▁▂▅▃▇
             │ stat     │ stat     │ stat     │  spark
             └──────────┴──────────┴──────────┘
             Lead lease · detected Jul 06 · 4 lines behind it
```

### The stat strip, and the two zero rules

Without the strip a row was a notification — a title, a sentence and a date,
with every number behind a click. The strip is the figures the finding was built
from, so the card answers "how much, how many, since when" on sight. Three cells
(four on Professional).

`nilStat(value)` — a cell is dropped, not reworded:

> The server sends these verbatim and they are facts. `{label: "On leases you
> hold", value: "0", sub: "none carry your lease number"}` is the *point* of a
> county-wide completions alert: the wells are near you and none are yours. But
> it rendered in the same weight as the figures beside it, so a row reading
> "23 wells · 0 · Linder John Operating · Aug 16 2017" led with a zero in the
> second slot and the eye stopped there.

§13 of the contract says render the server's strings verbatim, so a zero is not
ours to rewrite into a word — the choice is show it or don't, and the
instruction is don't show a zero anywhere. **The cost, recorded as a decision:**
on a county-wide alert that cell is the qualifier stopping a reader assuming the
234 completions are theirs. The alert's *body* still says it in prose, which is
what makes dropping the cell survivable.

`0` followed by a digit, dot or comma is **not** nil — `0.8%` and `0,5` are real
readings. Only a bare zero, or a zero with a unit behind it (`0 MCF · no oil`),
counts. The same test also catches `—`, `no`, `none…`, `n/a`, `not filed`.

`liveValue(value)` — half a value can be nothing while the other half is a
reading. The API composes some values from two measures joined by a middle dot
and fills both even when one is empty: `"no gas · 56 BBL"`. Dropping the cell
takes the 56 BBL with it; printing it whole opens a sales panel with the words
"no gas". So the value is split on the dot, empty halves removed, and the rest
rendered — the cell goes only when nothing is left. Surviving halves are
untouched.

### Direction arrows

`tone: 'up' | 'down'` prefixes ▲ / ▼ **and strips the sign from the number** —
otherwise a fall rendered as "▼ -0.8%", which states it twice and reads as a
double negative.

### The spark

`AlertSpark` — a 20px bar strip, drawn only when `spark` holds more than two
non-zero values. Bars rather than a line and no axis: at this size a line is
noise and an axis is unreadable, but the *shape* is legible and is the only
thing being claimed. The last bar is at full opacity because it is the one the
sentence above is about. Colour follows the category — gold `#b8892f` for money,
blue `#3b5bdb` for models, green `#2e8f6d` otherwise.

---

## 8. The quiet states

| State | What it says |
|---|---|
| No alerts at all, no filter | **"What a quiet week looks like"** — `al.quiet_reason` if the server gave one, otherwise the default sentence naming the five feeds checked |
| Filter or search matches nothing | **"Nothing in that filter"** — names the category, and offers "show all *N* →" |
| There *are* rows (Detailed and above) | the quiet-week card renders anyway, as a promise about what most weeks look like |

The distinction the page is built on: *"No alerts"* and *"the well-status feed
stopped updating in January"* are different facts, and only the second one
belongs in `notes[]`.

**"What the record could not tell us"** renders `al.notes[]` verbatim, under a
closing line: a finding that cannot be measured is not shown as a zero, because
"nothing happened" and "we could not see" are different answers.

---

## 9. The explainer drawer

Clicking a row opens `drawers['alert:' + id]`. **Every `alert:` panel is rebuilt
from the row**, in `withAlertDrawers()` (`owner-data.ts`), not just the missing
ones.

Two faults, one fix:

1. **A missing key is a dead control.** `DrawerPanel` puts `display:none` on
   both the panel and the scrim when `copy` is null, so a row whose key the
   capture never took in would have an "expand →" that does nothing at all — no
   error, nothing on screen. Every other row keeps working, which is what makes
   it the kind of fault nobody reports for a month.
2. **A stale key is worse than a missing one.** Measured on this owner, the live
   `permit-ring` finding has already moved its `evidence` and `next_step` since
   the capture was taken, so the row and its own explainer disagree today.

The composition is the reference's own builder, verbatim:

| Drawer field | From the alert |
|---|---|
| `title` | `a.title` |
| `sub` | `klass · event <date> · detected <date>`, each clause dropped when absent |
| `what` / `means` / `next` | `a.body` / `a.why` / `a.next_step` |
| `evidence` / `chips` / `stats` | `a.evidence` / `[a.klass]` / `a.stats` |
| `tone` | `a.category`, except `community` → `record` (community has no tone of its own) |
| `spark` / `spark_label` | `a.spark` / `a.spark_label` |

Checked against all nine of the capture's alert drawers, field for field: every
one reproduces identically. The other 31 keys — `permits`, `production`,
`value`, `lease:<id>`, `well:<api14>` — are not derivable from an alert and are
left exactly as the capture has them.

---

## 10. What the numbers actually are

Measured against the committed capture
(`app/mineralownersite/_lib/reference/owner-payload.json`):

```
alerts.count            9
alerts.counts           all 9 · money 2 · activity 5 · models 2 · community 0
action_count            1
window_label            "between May 2026 and June 2026"

the nine rows           id                    category   severity    class
                        filed-202606          money      action      Urgent
                        completions           activity   important   Important digest
                        permits-filed         activity   important   Important digest
                        handover-02_259558    money      important   Urgent
                        trend-02_295750       activity   important   Important digest
                        permit-ring           activity   context     Educational
                        trend-02_259558       activity   context     Important digest
                        newwell               models     context     Educational
                        pricedeck             models     context     Educational

ledger                  10 leases · 1 county · 7 adjacent · 3 standing permits
                        587 production filings · 476 lease-months · 709 nearby
                        10 wells · 3 operators
                        since May 2026 · last read Sep 8, 2026
                        $99.95 /mo · $999.50 /yr · $23 /wk · $19 /wk annual

"filings read" cell     893  (timeline.events.length, not a ledger field)
of which mine           133  (timeline.mine_count)
```

Note that the Community pill does not render on this owner — its count is zero,
and a zero pill is suppressed.

---

## 11. Known gaps

- **Two alert datasets.** The `(portal)` chrome's bell and sidebar pill count
  `(portal)/alerts/_lib/alert-records.tsx` (9 hand-written records); the
  `(reference)` chrome's bell and rail count `p.alerts.items` minus `readIds`.
  Inside each group the counts agree. Across the two they are different numbers
  for the same-sounding thing. Collapsing them means porting
  `portal-demo-data.ts` and `portal-nav.ts` onto the payload.
- **`AlertsSummary`** (`_components/dashboard/alerts-summary.tsx`) is defined
  and never imported.
- **`standing_permits` and `lease_months_read`** have no second source, so
  `watchLedger`'s derived path leaves them at zero and drops their clauses. Only
  a populated server ledger prints them.
- **Read state is per-browser.** `mv.alertsRead` is `localStorage`; marking read
  on a phone does not mark read on a desktop. The contract says read state is
  client-side, so this is by design until the API grows somewhere to record it —
  `markRead` in `Portal.tsx` is the one place that would change.
- **The Settings links** point at `/mineralownersite/soon/settings`, which is
  the "coming soon" page.
