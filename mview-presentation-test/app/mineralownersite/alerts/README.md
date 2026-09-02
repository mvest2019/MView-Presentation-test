# Alerts — `/mineralownersite/alerts`

Converted from the redesign prototype's `owner/src/routes/app-alerts.html`
(261 lines of markup, plus behaviour in `route-groups-3.js` — `alFilter`,
`alSearch`, `alApply`, `alMarkAllRead`, `mvWatchLedger` — and nine explainer
drawers defined in `route-groups-2.js`) into React server components, Tailwind
and the portal's hand-added shadcn/ui primitives.

## Layout

```
alerts/
├── page.tsx                        the route: eleven sections, in order, nothing else
├── _lib/                           data and pure logic
│   ├── alert-types.ts                the shape of one alert — five axes, four fields
│   ├── alert-records.tsx             the nine alerts (the only place they exist)
│   ├── alert-explainers.tsx          the nine "what this alert means" panels
│   ├── alert-counts.ts               every count on the page, derived once
│   ├── alert-phrases.ts              "nine alerts, one of which asks"
│   ├── alert-filters.ts              the five pills + the one match predicate
│   ├── watch-ledger.ts               the watch figures and the price arithmetic
│   └── sample-alerts.ts              the unclaimed sample inbox
└── _components/
    ├── alerts-header.tsx           title · Mark all read · Alert preferences
    ├── alerts-read-state.tsx       ⚡ the one shared bit of state, as context
    ├── mark-all-read-button.tsx    ⚡ "Mark all read" → "All read ✓"
    ├── alerts-ultra.tsx            the Ultra tier — replaces the page
    ├── alerts-essentials-hero.tsx  the nine-in-one-line summary
    ├── watch-ledger-panel.tsx      "what you're actually paying for"
    ├── alert-class-legend.tsx      the delivery taxonomy (Professional)
    ├── alert-inbox.tsx             ⚡ search · filter · the nine rows
    ├── alert-search-box.tsx        ⚡ controlled, owns nothing
    ├── alert-filter-bar.tsx        ⚡ controlled, owns nothing
    ├── alert-row.tsx               one alert
    ├── alert-icon-box.tsx          the 34px tile — three tints, three meanings
    ├── alert-severity-tag.tsx      "Action recommended" / "Important"
    ├── delivery-class-badge.tsx    Urgent · digest · Educational · Community
    ├── alert-why.tsx               ⚡ the `why?` gloss, on tap as well as hover
    ├── alert-actions.tsx           the button row — link · prototype · dismissal
    ├── alert-explainer.tsx         the four-heading panel, as `<details>`
    ├── quiet-week-card.tsx         what next week probably looks like
    ├── delivery-note.tsx           delivery · dedup · retention
    └── unclaimed-alerts.tsx        the nc-only page replacement
```

`⚡` = `"use client"`. Six of twenty-one. **The nine alert rows and all nine
explainers are server-rendered** and handed to the client inbox shell as nodes —
the same arrangement `leases/_components/leases-tabs.tsx` uses, and the reason
most of this page's text never enters the client bundle.

## The one rule this module is built around

**Every count is derived from the alert list, and the list exists once.**

This is not a preference; it is the defect the prototype spent two revisions
fixing. Its own notes record both rounds:

- **v43 · OW-33** — the Essentials card said *"Six things changed"* while the
  list held nine and the filter row said 9.
- **v50 · BG-03** — the totals were then typed into the filter row *and again*
  into the watch ledger, "so the first person to add an alert row would have made
  this panel lie." Its fix was JavaScript that counts the rendered `.al-row`
  elements after paint.

Here the rows **are** `alert-records.tsx`, and `alert-counts.ts` counts them at
module scope. Six surfaces read that one object:

| Surface | Reads |
| --- | --- |
| Filter pills | `alertCounts.byCategory` |
| Watch ledger | `alertCounts.total` · `.action` · `.rest` |
| Essentials one-liner | the same three, spelled out by `alert-phrases.ts` |
| Dashboard rollup (`_lib/portal-demo-data.ts`) | all of them |
| Sidebar row badge (`_lib/portal-nav.ts`) | `alertCounts.unread` |
| Top-bar bell (`_components/portal-top-nav.tsx`) | `alertCounts.unread` |

Adding a tenth alert is one entry in one array. In the prototype it was six
edits, one of them in a comment.

**"Asks something of you" means `severity === "action"` and nothing else** —
one row, the Ledbetter payment check. Not "unread", not "money", not "urgent
delivery". Widening it turns a page that says one thing needs you into a page
that says four do, which is the inbox anxiety the design exists to avoid.

## Three numbers that disagreed, and now cannot

| Fact | Prototype | Here |
| --- | --- | --- |
| Unread count | sidebar `6` · top bar `6` · **seven** `unreadal` rows in the markup | one derived `7` in all three places |
| Category totals | typed in the filter row, re-typed in the ledger, corrected at runtime | derived; no runtime correction needed |
| Dashboard rollup | nine literals quoting the Alerts page | derived from the same records |

The unread one is worth naming: the badge promised six while the inbox showed
seven, in the same build whose panel comment promises that "the surfaces cannot
drift."

## Mode and funnel-state behaviour, measured

All **20 combinations** (5 funnel states × 4 density tiers) were driven in the
browser and the visible direct children of `.mv-dash-routes` counted. **No
combination renders an empty page** — the trap `portal-ui.md` warns about, where
a route root carrying `mv-dash-routes` without a `tier-u` and an `nc-only` child
goes blank in Ultra and while unclaimed.

| State | Ultra | Essentials | Detailed | Professional |
| --- | --- | --- | --- | --- |
| `unclaimed` | claim rail + sample | claim rail + sample | claim rail + sample | claim rail + sample |
| `claimed` / `trial` / `lapsed` / `paid` | 1 section (the hero) | 5 | 6 | 8 |

### Density (`?view=`)

| Surface | Gate | Appears in |
| --- | --- | --- |
| Ultra hero | `tier-u` | Ultra only — replaces the page |
| Essentials one-liner + audit chips | `tier-s` | Essentials only |
| Watch-ledger sentence | `tier-s` | Essentials only — the grid replaces it above |
| Watch-ledger grid, price paragraph, "Choose what reaches you" | `hide-s` | everything except Essentials |
| Search box, filter pills | `hide-s` | everything except Essentials |
| Quiet-week card, delivery line | `hide-s` | everything except Essentials |
| Class legend, per-row class chip + `why?`, ledger method note, retention note | `tier-p` | Professional only |
| The nine rows, headlines, dates, buttons | none | every tier except Ultra |
| Action footer | `hide-u` + `nc-hide` | claimed states, not Ultra |

**One deliberate departure.** The prototype wraps each row's class chip and
`why?` in one `tier-p` span — except on the permit-trend row, where the same span
is ungated, and that row is the one carrying a blue *"Trend data not available
yet"* chip. Copying the exception verbatim would have meant an honesty label that
vanishes when the reader picks a calmer density. So the two were separated: the
**build chip shows in every tier**, the taxonomy stays Professional. Noted at
`alert-row.tsx`.

### Funnel state (`?state=`)

| State | What changes | Status |
| --- | --- | --- |
| `paid` / `trial` | nothing withheld | matches |
| `claimed` / `lapsed` | the funnel bar and the state card appear from the shell; this route carries no `cl-lock` of its own — see the hole below | matches |
| `unclaimed` | the claim rail, then the sample inbox replaces the page | matches |

## Two departures from the prototype's interaction model

**The row is not a `role="button"`.** The prototype makes the whole row a button
that opens the explainer, with a hand-rolled `onkeydown` and a guard ignoring
clicks that land on the links inside it — interactive controls nested inside a
control, announced by a screen reader as a button containing three buttons and a
link. The affordance survives as the `<summary>` of the row's own `<details>`, so
it opens on click, Enter and Space and is announced as a disclosure. What is lost
is clicking the row's whitespace.

**The explainer is inline, not a right-side drawer.** The drawer's stated purpose
is that the owner *stays where they are* — "explanation is the default;
navigation is the choice" — which an inline `<details>` under the row satisfies
better, with the alert still on screen and nothing overlaid. It also prints,
survives find-in-page, and works with JavaScript off, none of which
`mvCtxOpen()` did.

## What was dropped, and what was kept from it

Five explainers ended with a button opening a **second** drawer: the permit table
(`permits38`), the gas chart (`priceGas`), the masked names (`matches3`), the
trend view (`permitTrend`), a private message to a co-owner (`dmMargaret`). None
of those surfaces exist in this build, and the portal does not point an
affordance at nothing (`portal-nav.ts`).

Their **information** is kept — the 38 standing filings, the $3.245 print, the
three masked name variants all remain in the evidence lists where the design put
them. Only the chrome is gone. The records-refresh row's "See the 3 masked names"
button went the same way for a second reason: the names are already in that row's
own explainer, one click away in the same place.

## Known holes left matching the design

**The MVestimate is legible on this page in the `claimed` state.** Two rows print
it in prose — *"Your $26,340 held"* and *"it feeds your $8,700 six-year share"* —
and the prototype wraps neither in `cl-lock`, so a free claimed account reads the
figure the state is meant to withhold. Both are one `portalGate.lockedValue` away
from closed. Left as the design has them, because changing what a funnel state
*shows* is a product decision, and flagged here rather than silently altered.

**Read state is session-only.** Marking all read does not survive a reload. Read
state belongs to an owner on a server and there is neither yet — the record on
screen is fictional. Faking it in `localStorage` would half-work, remembering on
one browser and forgetting on another, which is worse than resetting predictably;
`leases/_components/records-update-notice.tsx` reached the same conclusion for
the same reason.

**Search matches an index, not the rendered prose.** The prototype searches
`row.textContent`, which it can because its rows are strings in a document. Rows
here are React nodes, so each record carries a `keywords` field — the entities
the placeholder actually promises ("lease, operator, county, or any word"),
several of which are not in the visible sentence at all. Searching `karnes`
finds the records-refresh row; searching it in the prototype did too, but only
because that county happened to be printed.

## New portal-level pieces this module added

- **Three icons** — `flag`, `price`, `chat` in `_components/portal-icon.tsx`,
  each mapped to the Feather path its `mvi-*` sprite `<symbol>` actually contains
  rather than picked by name.
- **Thirteen `mv-portal-*` colour tokens** in `app/globals.css` for the `.al-*`
  family. The two severity tags are deliberately not the nearby
  `mv-amber-bg`/`mv-red-bg` pair: V40-AL-SEV chose those six values to stay
  legible for colour-blind readers *while* the tag also carries its meaning as
  text, so approximating them would discard what they were measured for.
- **`portalActionSets["app-alerts"]`** — three actions, not four, and no
  `upgrade`. The design's own set: this page's job is retention, not conversion.
- **The bell and the rollup became links.** The top-bar bell was an inert span
  reporting a count it could not open; the dashboard rollup's button read "All 9
  alerts — soon". Wiring both was the first thing this module made possible, and
  the rollup's whole purpose (OW-33) is that it "clicks into the detailed
  section".
