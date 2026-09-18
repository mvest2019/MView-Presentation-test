# Alerts — Functionality & Reference

Everything the portal does with alerts: the data model, the inbox page, the counts, the
filters, the explainers, the settings matrix, and every other surface that reads the same
numbers. File paths are relative to the app root (`mview-presentation-test/`).

---

## 1. What "Alerts" is

The alert inbox tells a mineral owner **everything that changed on their record** — each
alert opens the evidence behind it. Alerts are **derived from the public record**
(Railroad Commission production, permit, completion and status filings, price feeds,
model re-runs), not read from a notification-sending table. The design's core promises:

- **Quiet by design** — alerts fire on real events, never to look busy. A quiet week gets
  a quiet page, and the page says *why* it is quiet.
- **A signal to verify — never an accusation.** Production is public, payment is not;
  only the owner's own statements can prove an underpayment. Copy never says "money owed".
- **A nearby permit is an interest signal, not income.**
- **Explanation is the default; navigation is the choice.** Every alert explains itself
  in place; the deeper screen is optional.
- **Retention argument**: the Watch Ledger sells what the subscription actually buys —
  the daily sweep — which is true on quiet weeks too.

---

## 2. Where alerts live (file map)

| Surface | File |
|---|---|
| Alert data model (types) | `app/mineralownersite/(portal)/alerts/_lib/alert-types.ts` |
| The nine demo alert records | `app/mineralownersite/(portal)/alerts/_lib/alert-records.tsx` |
| Derived counts (single source) | `app/mineralownersite/(portal)/alerts/_lib/alert-counts.ts` |
| Filter row + search predicate | `app/mineralownersite/(portal)/alerts/_lib/alert-filters.ts` |
| The nine explainers | `app/mineralownersite/(portal)/alerts/_lib/alert-explainers.tsx` |
| Alerts route (server half) | `app/mineralownersite/(reference)/alerts/page.tsx` |
| Alerts inbox UI (client) | `app/mineralownersite/_components/reference/AlertsView.tsx` |
| Dashboard rollup card | `app/mineralownersite/_components/dashboard/alerts-summary.tsx` |
| Sidebar bell badge | `app/mineralownersite/_lib/portal-nav.ts` (Alerts row, `badge: alertCounts.unread`) |
| Settings — Alert preferences | `app/mineralownersite/(reference)/settings/_components/alert-preferences-card.tsx` + `settings/_lib/settings-data.ts` |
| Inbox styles | `app/mineralownersite/dashboard-reference.alerts.css` |
| Payload types (reference data) | `app/mineralownersite/_lib/reference/payload.ts` (`alerts.items`, `alerts.ledger`) |
| Marketing pages | `app/feature/alerts/`, `app/feature/pro-alerts/`, `app/feature/pro-adv-alerts/` |

Route: **`/mineralownersite/alerts`** (metadata title "Alerts",
`export const dynamic = "force-dynamic"` because the owner comes off the query string).

---

## 3. Data model — the five axes of one alert

`alert-types.ts` defines `AlertRecord`. Four fields look similar on screen but mean
different things, so they are four fields, never one "kind":

| Axis | Type | Meaning |
|---|---|---|
| `category` | `"money" \| "activity" \| "community" \| "model"` | **What it is about.** The only axis the filter row filters on. |
| `severity` | `"action" \| "important"` (optional; most rows carry none) | **How loud it is, as text.** The tag carries a colour *and* the words (V40-AL-SEV) so a colour-blind reader can sort the inbox too. |
| `deliveryClass` | `"urgent" \| "digest" \| "educational" \| "community" \| "record"` | **Which rail it travels on** — what the owner can tune in Settings. Professional-tier detail. |
| `unread` | `boolean` | **Whether they have seen it.** Drives the green left rule and the sidebar badge; the only axis "Mark all read" touches. |

`actionRecommended` is **derived, not stored**: it is exactly `severity === "action"`
(`alert-counts.ts`). Widening that predicate — to unread, money, or urgent — is how "one
thing needs you" becomes "four things do", the inbox anxiety the design avoids (BG-03).

Other record fields:

- `icon` / `iconTone` (`"mint" | "gold" | "blue"`) / `iconLabel` — the icon box; the tone
  groups by meaning on a scan down the left edge (gold = money, blue = model, mint = rest).
- `headline` (plain text), `detail` (React node — the emphasis is the design's), `meta`
  ("Jul 04 · email + push" — event date + channels used), `why` (the "why?" gloss: the
  reason this alert reached this reader).
- `buildNote` — a blue "we do not have this yet" honesty chip when the row promises
  something the data cannot yet deliver.
- `actions: AlertAction[]` — buttons under the alert. `href` absent means the destination
  is not built; the row then renders the prototype acknowledgement idiom
  (`acknowledgement` = the pressed-state receipt) instead of a link into a 404.
  `dismissal` is a one-way dismissal worded as a promise about *future* alerts
  ("quiet until the next records refresh").
- `explainer?: AlertExplainer` — see §7.
- `keywords` — the **search index** the search box matches (plus `headline` and `meta`).
  Deliberately not a copy of `detail`: it holds the entities a reader would type (lease
  number, operator, county), several of which are not in the visible sentence at all.

### Delivery classes, in words

| Class | Behaviour |
|---|---|
| `urgent` | Reaches **every enabled channel** immediately (the payment-check class — the money check the service exists for). |
| `digest` | Important digest — can roll up weekly if the owner prefers. |
| `educational` | Never asks anything; never a signal to buy, sell, or lease. |
| `community` | One group; mute a group's notifications without leaving it. |
| `record` | Fires only on a records refresh — about once a year, never a repeating nag; a dismissal sticks until the next refresh. |

---

## 4. The nine demo alerts (`alert-records.tsx`)

One array, the only place any alert is written down. **The order is the design's and is
not chronological**: the one action row is first; the annual records refresh is last
despite being newer than rows above it (v38 · P2-06 — a once-a-year account event "reads
as a record update, not a headline alert"). Do not sort this list by date.

| id | Category | Severity | Class | Unread | Headline (gist) |
|---|---|---|---|---|---|
| `paid-check` | money | **action** | urgent | ✓ | Payment check worth running — Ledbetter (74318) produced gas in months we can see |
| `permits-11` | activity | important | digest | ✓ | Nearby-permit list updated — 11 permits within 1 mi of Ledbetter |
| `permit-trend` | activity | — | digest | ✓ | Permit trend — holding, not fading (carries `buildNote: "Trend data not available yet"`) |
| `prod-smith` | activity | important | digest | ✓ | New production posted — Smith Gas Unit (305892): 27,120 mcf |
| `gas-move` | money | — | educational | ✓ | Price move touched your estimate — gas ▲ 1.53% |
| `group-post` | community | — | community | ✓ | Margaret D. posted in Smith Gas Unit — Owners |
| `new-well` | model | — | educational | read | New-well probability nudged up — Bee units |
| `briefing` | activity | — | digest | read | Your weekly briefing is ready |
| `records-3` | money | — | record | ✓ | 2026 mineral-owner records refreshed: 3 new possible matches in your name |

Two copy distinctions are load-bearing and must survive any edit:

1. Ledbetter **produced** gas in months we can see — it never says the owner was
   underpaid. The severity tag reads "Action recommended", never "Money owed".
2. A nearby permit is an **interest signal, not income**.

---

## 5. Counts — derived once, read everywhere (`alert-counts.ts`)

`countAlerts(records)` returns `AlertCounts`:

```ts
{ total, action, rest, unread, byCategory: { money, activity, community, model } }
```

Computed **on the server at module scope** from `alertRecords` and exported as
`alertCounts`. Six surfaces read this one object and **none may hold its own copy**:

1. The filter pills (`alert-filters.ts`)
2. The watch ledger
3. The Essentials one-liner
4. The Ultra hero's silence / headline
5. The dashboard rollup
6. The sidebar bell badge (`portal-nav.ts` → `badge: alertCounts.unread`)

History (v50 · BG-03): the reference hand-typed totals into two surfaces and they
drifted; its fix counted rendered rows in the browser (wrong for a frame, wrong forever
if the script failed). Here the counts *are* the list, so they cannot disagree. Adding a
tenth alert = adding one entry to `alertRecords`; all six surfaces move together.

---

## 6. Filtering & search (`alert-filters.ts`)

- `AlertFilter = "all" | AlertCategory` — `all` is the *absence* of a category filter.
- `alertFilters` — the five pills in the design's order, counts read from `alertCounts`:
  **All · Money · Activity · Community · Models & forecasts** (the label is
  "Models & forecasts", not "Model" — v37 · D2; the key stays `model`).
- `matchesAlertFilter(alert, filter, query)` — the one predicate:
  - Category gate AND search gate, **both always** — a search never silently resets the
    category (the empty state says "clear it or switch the filter back to All").
  - The search reads `headline + meta + keywords`, lowercased, substring match.
- `AlertFilterFields` — the slim four-field shape (`category, headline, meta, keywords`)
  that crosses into the client bundle; the full `AlertRecord` (nine explainers of prose)
  stays on the server. `AlertRecord` satisfies it structurally.

---

## 7. Explainers (`alert-explainers.tsx`)

Every alert can open an explainer — v34's **four headings, always in this order**:

1. **What this is** (`what`)
2. **What it means for you** (`means`)
3. **The evidence** (`evidence` — a bullet list node)
4. **What to do next** (`next`, plus `actions`)

Then, optionally, `openHref` — the door to the full screen — and `foot`, the closing
caveat. `title` carries the design's leading glyph; `subtitle` is the provenance line
("Alert explainer · Ledbetter (74318) · detected …").

Three sentences recur and may never be softened into claims:

- "A signal to verify — never an accusation."
- "An interest signal, not income."
- "An estimate, not an appraisal."

`deeper` lists controls that opened a **second drawer** in the reference (the permit
table, the gas chart, the masked names, the trend view, a private message to a
co-owner). None of those panels exists in this build, so they render as
prototype-acknowledging buttons (`_components/ui/prototype-button.tsx` convention) rather
than being dropped — the chip row is part of how the panel reads. Each becomes a real
opener when its panel lands.

Note: the `records-3` row deliberately has **no** "See the 3 masked names" button — the
three variants are already in its own explainer; a button that opens a panel to repeat
the panel beside it is duplication, not a feature.

---

## 8. The Alerts page (`(reference)/alerts/page.tsx` + `AlertsView.tsx`)

### Server half

Same server page as the Dashboard with `route="alerts"`: all four portal surfaces are
views of **one owner snapshot** (`getOwnerPayload(sel)` off the query string —
`owner/num/dist/year`). A failed read passes `initial={null}`; the client shell retries
on mount and shows the named loader instead of an error page. This page **replaced** the
portal's own hand-written Alerts page so the bell badge, filter row, ledger and list all
read `p.alerts` — one array — and cannot disagree.

### What renders per tier (decided in React by `Band`, not CSS)

| Tier | What shows |
|---|---|
| **Ultra** | One dot, kicker, one headline ("One thing **needs a look**" / "Nothing needs you **today**"), the lead alert's own sentence, one button, a four-figure stat line, the "Also on your record" list (up to 4 titles, real drawer openers), and the retention line: *most days there is nothing to tell you — and we will still have looked.* |
| **Essentials** | Header with **Mark all read** + **Alert preferences**, the "Your alerts, in one line" card, and the rows. No ledger, no search, no filters. |
| **Detailed** | Adds **the Watch Ledger**, the search box, the category filter row, per-row evidence, the quiet-week card, and the delivery footer. |
| **Professional** | Adds the class legend (Urgent / Important digest / Educational / Community chips), the method note under the ledger, the per-row delivery-class chip, and the "N lines behind it" evidence count. |
| **Not claimed** | The claim rail (green = live, amber = labeled sample; "claiming turns the amber into your green") and the sample badge above the page; Mark-all-read and preferences links are hidden (nothing here is the reader's), and a claim CTA repeats at the foot. |

### Behaviour worth knowing

- **Ordering — newest first** by `detected_label` (the day the finding entered the
  inbox), tie-broken by `event_label` (the day the filing is about). An unparseable date
  sorts to the *bottom* (`0`, not `NaN`) — a row with no date is not news.
- **Read state lives in `Portal`, not this component.** `readIds` + `markRead` come down
  as props so the page, the sidebar rail and the bell all read one value, and it
  persists (`mv.alertsRead`) so marking read survives a reload. `readReady` gates every
  unread *figure* (not the row colours): the server can't know what this browser has
  read, so counts wait for hydration rather than printing "Mark all 6 read" and
  correcting themselves a beat later.
- **Filter row**: five category pills (a zero-count category pill is hidden), plus an
  **Unread pill that is a filter, not a button** — it narrows to unread and toggles back
  out; it never marks anything read (that's the header button's job).
- **Search** matches anything the row shows: title, body, lead lease, class, event
  label, and the evidence lines.
- **Row anatomy**: tone-tinted icon box → severity tag ("Action recommended" /
  "Important") → title → (Pro) class chip → "why?" gloss (`data-def` = the `why` text) →
  date + channels → body with "expand →" hint → **stat strip** (up to 3 figures, 4 on
  Pro; up/down tone arrows carry the sign, so `-0.8%` renders as `▼ 0.8%`) → optional
  **sparkline** (20px bar strip, last bar highlighted, only when a real series exists) →
  meta line (lead lease, "detected …" when it differs from the event date).
  Rows are keyboard-activable (`Enter`, Space via `e.key` *and* `e.code`), and clicking
  marks the row read and opens the `alert:<id>` drawer.
- **Zero-suppression** (`nilStat` / `liveValue`): a stat cell whose value is a bare zero,
  dash, "none", "n/a" or "not filed" is dropped, not reworded (§13 — render the server's
  strings verbatim or not at all); composite values split on `·` keep their live half
  ("no gas · 56 BBL" → "56 BBL"). `0.8%` and `0,5` are real readings and survive.
- **Empty states**: exactly one. `quiet` (no filter, no search, no unread pill, zero
  rows) shows "What a quiet week looks like" with `quiet_reason` or the standard sweep
  sentence. A filtered-empty card names *which control* emptied the page ("No alert
  matches 'X' in money among the unread") and one **show all N →** button clears
  category, search and the unread pill together.
- **Quiet-week card also shows when there ARE alerts** (Detailed+): it previews what a
  quiet week will look like, as the retention promise.
- **"What the record could not tell us"** (`al.notes`): stated, not hidden — a finding
  that cannot be measured is not shown as a zero, because "nothing happened" and "we
  could not see" are different answers.
- **Settings links** (`PREFS_HREF = /mineralownersite/settings#settings-alert-preferences`)
  point at the real Settings page's Alert preferences card, as `next/link`.

### The Watch Ledger (Detailed+)

"What you are actually paying for" — the retention panel, true on quiet weeks:

- **Every day** — the sweep runs whether or not there is anything to tell you.
- **N filings read** — `timeline.events.length` leads (the volume is the argument),
  matched against N leases in N counties, with how many landed on a lease the reader
  holds, plus the neighbouring leases (and standing permits, when a real count exists)
  within about a mile.
- **N production filings read**, each checked against the model's expectation, + nearby
  permit/completion filings.
- **N alerts raised** this window — N ask something of you; the rest are good news,
  neighbors at work, or context.
- **Price, plainly**: $99.99/mo ≈ $23/wk, ≈ $19/wk annual ($999.90) — the only constants
  in the panel. It explicitly makes **no savings claim**: production is public, payment
  is not; proving an underpayment is what a Lease Audit is for.

`watchLedger(p)` **never prints a zero panel**: if the payload's ledger is empty
(`leases === 0`), every figure is derived from elsewhere in the same payload
(totals, rings, timeline, activities, and the alert list rendered directly below), so the
panel cannot contradict the page. A *populated* ledger is trusted entirely — a real zero
is a fact. `standing_permits` and `lease_months_read` have no honest fallback source, so
their clauses are guarded out instead of fabricated. The Pro method note explains the
sweep (RRC filings vs lease numbers and the 1/3/5-mile radius lists, price feed, decline
band changes, nightly value re-run) and the dedupe promise: one filing never reaches the
reader three times across dashboard, alerts and the activity feed.

### Delivery footer (Detailed+ / Pro)

- Delivery is the owner's call — email, push, or in-app **per alert type** in Settings.
- Alert emails are a **short summary with a link back — never the full content**.
- Every alert carries both its **event date and detected date**, so an old filing newly
  matched to the record says so.

---

## 9. Other surfaces

### Dashboard rollup — `AlertsSummary` (v43 · OW-33/OW-32)

A rollup, **not a fourth copy of the list**: one count since last visit, the split
(needs you / important / context), the category chips, and the single "NEEDS YOU" line —
which states a **production fact, not a payment one**. "All N alerts" links into
`/mineralownersite/alerts`. Reads `alertSummary` from `_lib/portal-demo-data.ts`.

### Sidebar bell badge — `portal-nav.ts`

The Alerts nav row (`navKey: "app-alerts"`, icon `bell`) carries
`badge: alertCounts.unread` — the derived count, so the pill and the green row edges
cannot disagree, and marking an alert read in the data moves both.

### Settings — Alert preferences card (v11)

Source shape: `PG.user_notification_settings` (a column per channel per event type),
made legible as **six rows × three channel chips** (email / push / in-app):

| Type | Email | Push | In-app | Note |
|---|:-:|:-:|:-:|---|
| New permit / completion near a lease | ✓ | ✓ | ✓ | recommended; lease-radius signal, not an exact pin |
| New production posted | – | ✓ | ✓ | recommended; your claimed leases |
| Price move touched your estimate | – | – | ✓ | only when it moves your number |
| Possible payment gap (Lease Audit) | ✓ | ✓ | ✓ | recommended; when findings post |
| A co-owner posted in your group | – | ✓ | ✓ | private lease groups |
| New-well probability band changed | – | – | ✓ | "model in build" — an unfinished model should not push anyone's phone |

Footnote promises: alerts fire on real events, never to look busy; **unsubscribing from
a channel never hides the in-app history**.

### Marketing pages

`/feature/alerts` ("Alerts & Activity" — hear about a new permit the day it's filed),
`/feature/pro-alerts` and `/feature/pro-adv-alerts` render generated content
(`content.ts`, extracted from the v44 prototype by `scripts/extract-feature-content.py` —
do not hand-edit) through the shared `FeatureLanding` component.

---

## 10. How to add a new alert

1. Add one entry to `alertRecords` in
   `app/mineralownersite/(portal)/alerts/_lib/alert-records.tsx` — **place it by the
   design's ranking, not by date** (action rows first; record-class updates last).
2. Give it a stable `id`, the right `category` / `deliveryClass`, and a `severity` only
   if it genuinely is "action" or "important".
3. Write `keywords` as the entities a reader would type (lease numbers, operator,
   county), not a copy of the sentence.
4. Add its explainer to `alertExplainers` (same key as the `id`) with the four headings.
5. For any button whose destination is not built, use `acknowledgement` (or `dismissal`)
   instead of an `href`; add a `buildNote` if the row promises data that doesn't exist yet.
6. That's it — the filter pills, ledger, Essentials line, Ultra hero, dashboard rollup
   and sidebar badge all recount automatically from `alert-counts.ts`.

## 11. Invariants (do not break)

- Counts are **derived from `alertRecords` / `p.alerts` only**; no surface keeps its own copy.
- "Asks something of you" = `severity === "action"`, exactly.
- Severity tags carry **words + colour**, never colour alone.
- Never claim payment facts from production facts; never present a nearby permit as income.
- Never show a bare zero as a stat; drop the cell (the prose keeps the fact).
- The unread pill filters; only "Mark all N read" mutates.
- The list order in `alert-records.tsx` is a design decision — do not sort by date.
- Category + search filters combine; clearing offers to clear **all** narrowing controls.
