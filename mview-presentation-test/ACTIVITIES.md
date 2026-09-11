# The Activities page

`/mineralownersite/activities` — one timeline of six event kinds, under two
controls: a date range and a distance.

This document covers the route end to end: where every figure comes from, what
each control actually filters, what renders in each of the four densities and
the unclaimed state, which numbers were measured and where they came from, and
what is still missing. It is written against the code as it stands.

The companion document for the other half of the same snapshot is
[ALERTS.md](ALERTS.md).

---

## 1. Where it lives

| Concern | File |
|---|---|
| Route (server half) | `app/mineralownersite/(reference)/activities/page.tsx` |
| The page itself | `app/mineralownersite/_components/reference/ActivitiesView.tsx` |
| Shell, drawer, routing | `app/mineralownersite/_components/reference/Portal.tsx` |
| Density gate (`Band`), `ProductPair` | `app/mineralownersite/_components/reference/bits.tsx` |
| Charts | `app/mineralownersite/_components/reference/LineChart.tsx` |
| Evidence drawer | `app/mineralownersite/_components/reference/DrawerPanel.tsx` |
| **The data seam** | `app/mineralownersite/_lib/reference/owner-data.ts` |
| Owner-keyed API client | `app/mineralownersite/_lib/reference/owner-api.ts` |
| Payload types | `app/mineralownersite/_lib/reference/payload.ts` |
| Chart spec type | `app/mineralownersite/_lib/reference/chart.ts` |
| Committed fallback capture | `app/mineralownersite/_lib/reference/owner-payload.json` |
| Formatters (`n0`, `plural`, `pctS`, `MCF`, `BBL`) | `app/mineralownersite/_lib/reference/fmt.ts` |

This route replaced the portal's own Activities page, which was a server
component over `_lib/portal-activities-data` — a separate hand-written record.
Reading `p.timeline` and `p.activities` instead means the counts here are the
Dashboard's counts, and a filing that reaches the alert list is the same filing
here.

`lib/operator-activity-api.ts` is a **different** thing: the operator-directory
API client for `/operators/*`, unrelated to this route. See
[OPERATORS.md](OPERATORS.md).

---

## 2. Data flow

```
 browser  ──▶  (reference)/activities/page.tsx    server component, force-dynamic
                    │   owner / num / dist / year off the query string
                    ▼
              getOwnerPayload(sel)                 THE SEAM — owner-data.ts
                    │
                    │   GET /api/v1/alerts          awaited alone, first
                    │   then, in parallel:
                    │     GET /api/v1/activity          -> Payload['timeline']
                    │     GET /api/v1/activity/summary  -> Payload['activities']
                    │     GET /api/v1/activity/rings    -> Payload['rings']
                    ▼
              Payload  ──▶  <Portal route="activities" initial={payload} />
                                    │
                                    ├─ null payload? client retries /api/portfolio
                                    │
                                    └─ <Chrome> … <ActivitiesView p tier funnel
                                                     sample open go />
```

`/activity/summary` also carries `series_months`, which the seam lifts out into
`p.series` — the owner's own filed production months. A response without it is
rejected with a 502, because the page's "Your own filed months" chart has no
other source.

`force-dynamic` — the owner comes off the query string, so there is nothing
correct to cache at the page level.

### The three payload blocks

| Block | Used for |
|---|---|
| `p.timeline` | the feed itself — `events[]`, `kinds[]`, `counts`, `mine_count`, `ring_count`, `county_count`, `standing_count`, `range`, `notes[]` |
| `p.activities` | the summary — `counties[]`, `monthly[]`, `compare_90` / `compare_180`, `operators[]`, `fields[]`, `counts` |
| `p.rings` | the distance panel — `rings['1' \| '3' \| '5']`, each with `neighbours[]`, `series[]`, `measured`, plus `note`, `distance_note`, `stamp`, `capped` |

---

## 3. The six kinds, and the three scopes

```ts
type EventKind = 'permit' | 'completion' | 'production' | 'adjacent' | 'status' | 'operator'
```

`EventKind` is **declared, not inferred**. This owner's record happens to hold
only permits and completions in some slices, and inferring the union from the
data would have narrowed it to two.

Each kind carries its own icon (`KIND_ICON`), its own dot colour on the
timeline, and its own card in the kind grid.

### Scope — what a row's location claim actually is

```ts
type EventScope = 'yours' | 'ring' | 'county'
```

| Scope | Means | Answers a mile button? |
|---|---|---|
| `yours` | on a lease this owner holds | — |
| `ring` | a **measured** distance in miles from the owner's own wells | yes |
| `county` | county-matched: real, dated, but not placeable on a map | **no** |

**Distance is measured or it is not claimed.** A row with a real distance
carries it (`2.31 mi away`); a row matched only by county says `county-scope`
instead of implying a mile it cannot prove. The `title` on that chip spells it
out: the feed carries no coordinates for the row.

A **standing fact** (`standing: true`) comes from the radius survey rather than
from a dated event, so it carries no date at all.

---

## 4. What renders when

| Tier | What is on the page |
|---|---|
| **Ultra** | how many things happened, in one headline, with production / completion / permit counts as the status line, a four-figure strip, the four newest filings (owner's first), and one button into the neighbours explainer |
| **Essentials** | the header, the plain-English summary, and the ring panel |
| **Detailed** | adds the control bar (date range, custom months, distance, search), the pulse strip, the six kind cards, the by-month permits-and-completions chart, the owner's own production months, the neighbourhood curve, the timeline, and the method notes |
| **Professional** | the same, with a 40-row page instead of 20, 20 ring neighbours instead of 8, a fourth stat cell per row, and the **operators / fields ranking tables** |
| **Not claimed** | the claim rail and the sample badge — and the badge is precise about which half is real: the neighbouring filings and measured distances are public record and shown as filed; only the rows marked as the owner's are a sample |

### Detailed and Pro used to be the same page

Every band in this view was `to="ultra"`, `from="simple"` or `from="detailed"`
— not one `from="pro"` — so the two densest tiers differed only in how far a
list ran. Two tiers a reader chooses between should differ in what they *say*.

The **operators and fields tables** (§9) are that difference, and they are not
padding: `activities.operators` and `activities.fields` arrive on every
`/activity/summary` call and nothing rendered them.

### The sample cap

Unclaimed forces the density to `pro` (see `Portal`), so the timeline opened on
**forty rows of substituted names and scaled figures** — a wall of invented
detail, and the one state where volume argues against the page. A sample only
has to show what the feed looks like, so it caps at **five rows**. The "Show the
other *N*" button below is untouched, so nothing is hidden from anyone who asks.

```
cap = sample ? 5 : tier === 'pro' ? 40 : 20
```

---

## 5. The controls

### The page opens on the owner's own leases

`kind` initialises to `'mine'`, not `'all'`. The measurement is the argument: on
`all` this owner sees 893 rows of which 133 are hers, so the first screen was
her neighbours' permits and her own production was pages down. The neighbourhood
is still one click away.

### Date range — every filter is a string comparison

Seven options: **30 / 60 / 90 days · 12 months · Since &lt;floor&gt; · All dates ·
Custom range**.

Each resolves to a `[lo, hi]` pair of **eight-character keys**, compared against
the `sort_key` the ordering already uses. No date parsing happens in the browser
at all.

```
'30'      [range.cutoffs.d30,  '99999999']
'60'      [range.cutoffs.d60,  '99999999']
'90'      [range.cutoffs.d90,  '99999999']
'365'     [range.cutoffs.m12,  '99999999']
'jan25'   [range.floor_key,    '99999999']
'custom'  [from + '00', to + '99']     -- swapped if from > to
'all'     ['',                 '99999999']
```

A custom "to" month is padded to `99` rather than `00` so the whole of that month
falls inside the range.

**`Since <floor>` is not a static label.** The other six are durations and read
the same in any month; this one names the production record's floor, and the
bound behind it is the server's `range.floor_key`. A hardcoded "Since Jan 2025"
would go on printing January the month the floor moved, while filtering to the
new one. `rangeLabel()` derives it from `range.floor_month`. The same applies to
the custom-range note, which reads the last entry of `range.months` rather than
naming a month in prose.

**A standing fact is never removed by a date filter.** It carries no date, so a
date filter cannot include or exclude it honestly. It stays, pinned below the
dated rows by the ordering, and the summary line says so explicitly.

### Distance

Four buttons: **1 mi · 3 mi · 5 mi · County-wide**.

- `all` keeps everything, including the rows placeable only by county.
- A mile button keeps a row when `e.ring <= N`. A row with `ring == null` is
  dropped — it has no measured location.
- **`adjacent` rows always survive.** They *are* the rings: they carry their
  figures at every band, so a mile button changes what they say rather than
  whether they are there.

The note under the buttons switches accordingly — `County-wide` names the
`county_count` rows matched by county alone, and a mile setting names
`ring.measured.rows` and the nearest measured distance.

The selected mile also drives the **ring panel** below and the per-row stats:
a neighbour row states the ring the reader selected, not always the first one,
via `e.ring_stats[mi]`.

### Search

Matches `title`, `body`, `lease_name`, `county`, `operator_name`, `when_label`,
the formatted distance, and every `label value` pair in `stats` — joined,
lowercased, substring.

### The kind cards

Six cards, one per kind. They had three problems, all fixed:

1. **They looked dead.** They did filter the timeline, but the timeline sits a
   full screen below behind two charts, so a click changed nothing the reader
   could see. Clicking a card now **scrolls the page to the timeline it just
   filtered** (`feed` ref + a `jump` counter), and a filter summary bar names the
   active filter and can clear it.
2. **They had no accessible name** — the browser reported six unnamed buttons.
   Each now carries an `aria-label` giving its label, its count in the current
   filter, its total, and what clicking will do.
3. **Their counts were the server's totals**, not the filter's. `scopedCount(k)`
   counts the rows that survive range + distance + search but *not* the kind
   filter, so a card's number is the number it would actually give you. When the
   two differ, the card shows `N of M`.

Clicking the active card clears it back to `all`.

**No sparkline on these cards, and its absence is the design.** The reference
drew one between the title and its caption. It could never fill the space:
`Spark` is a 90×20 viewBox (aspect 4.5) and `.mv-kinds` is `flex: 1 1 340px`
with wrapping, so a card's content box runs from roughly 300px to 430px.
`xMidYMid meet` letterboxed it to about 99px and centred it at every one of
those widths — a stray squiggle holding two lines of copy apart. Four placements
were tried; none read as designed, because the problem is not where it sits. A
24-point line 20px tall carries no reading a reader can act on, and the card
already states the count, the newest date and what the kind means. The two
charts below show these same series at a size where the shape can be read.
`timeline.kinds[].spark` still arrives from the API; nothing reads it.

---

## 6. The pulse strip

Four cells, and the counting rule behind them matters.

| Cell | Value |
|---|---|
| In this filter | `rows.length` |
| On your leases | `shownMine` — counted on `rows`, the list actually on screen |
| Newest dated event | `tl.newest_label`, subtitled `range.today_iso` |
| Within *N* miles | `ring.neighbour_leases`, subtitled how many are producing |

`shownMine`, `shownRing` and `shownStanding` are counted on **`rows`**, not on
`scoped`. Counted on `scoped` — the list before the kind filter — the summary
read "120 of 886 events" above "133 on your leases", and no reader can tell
which list either number is about.

The filter summary above the strip reads `N of M events`, then
`X on your leases · Y measured in miles · Z standing facts, which carry no date
and so are never removed by the range`, then a **Clear all filters** button
whenever anything is narrowed.

### The production-lag hint

A production filing lands months after the month it covers, so "last 30 days"
legitimately contains none of them while the permit feed runs to within days of
today. Measured on this owner: the newest filed month is June 2026 against a
newest permit of September 3, 2026.

So when a day window (30 / 60 / 90) is selected, production exists on the record,
and zero production rows survive, the page **says so where the button is** rather
than leaving a zero to interpret — naming the newest filed month and suggesting a
wider range.

---

## 7. The charts

### Permits and completions, by month

Built from the **filtered** rows rather than a fixed server window, so narrowing
the range or the distance visibly redraws it. Last 24 cycles, needs at least
three dated rows or it renders a "widen the range" note instead.

- **Two series, not three.** Three over thirty-six months was about a hundred
  bars in three hues, and the third — status changes — is zero in most months,
  so it spent a whole colour on nothing. Permits and completions are the pair the
  question is about.
- **Bars, not a line.** A count per month is a bar. As a line it drew a slope
  between one month and the next, which says "the trend fell" about two numbers
  that are simply two numbers — and with a 30-day range it was a single straight
  segment between two points.
- **Clicking a month filters to it.** The chart looked like a control and behaved
  like a picture. `onPick(i)` maps bar *i* back through `monthCycles`, sets a
  custom range of that one month, and scrolls to the feed.

**Its own two colours**, `FILINGS_COLOUR = { permit: '#9fd8c0', completion:
'#1f7f60' }`. It used to read the kind palette, and before that
`COLOURS.oil` / `COLOURS.gas` — the *commodity* colours, which meant the permit
bar was drawn in the colour "oil" everywhere else in the app. Matching the kind
palette instead (gold against green) was correct by consistency and wrong by eye:
two saturated, similarly dark hues fighting for one axis.

These two are a **sequential** pair, not a categorical one, which is right for
what the chart compares — the same measure at two stages of the same process.
Depth carries the reading: pale is intent to drill, deep is a well finished.
That is the caption's own argument, and it survives greyscale and every common
form of colour blindness, which gold-on-green did not. **The cost, accepted:**
the permit bar no longer matches the gold permit card and timeline chip. Only
this chart departs; `dashboard-reference.css` still governs every other permit
mark.

### Your own filed months

`p.series.months` through `ProductPair` — gas in MCF, oil in BBL, one panel
each. A month with no leases becomes `NaN`, which draws as a **gap rather than a
fall to zero**: an unfiled month is not a month without production.

### The neighbourhood curve

`ring.series` through the same `ProductPair` builder. This was a single BOE
line. BOE is a blend nobody is paid in, and it hides which product the
neighbourhood actually makes — so it gets gas its MCF panel and oil its BBL
panel, and drops a product that never produced rather than drawing it as a flat
zero. Renders only with three or more months.

### The comparison windows

`Last 90 days` and `Last 180 days` from `activities.compare_90` /
`compare_180` — recent vs prior, with a signed percentage, or "no earlier window
to compare" when `change_pct` is null.

---

## 8. The ring panel

Headed **"Within *N* miles of your wells"**, driven by the distance buttons
above it. `ring.headline` is the server's sentence.

Seven KPIs: neighbouring leases · of those, producing · standing permits ·
nearest record · their gas last month · their oil last month · operators in the
ring.

Every volume here is captioned **"whole-lease volume next door — never your
share"**. When no oil was filed the caption changes to "these neighbors file gas
only" rather than printing a zero.

Then the neighbours table — lease, operator, status, last filed month, gas that
month, oil that month, months filed — capped at 20 rows on Professional and 8
below, with a line saying how many more there are. **The lease id is shown
beside the name** because four of this owner's neighbours genuinely share one
name.

Two empty states, and they say different things:

- The survey names leases in this ring but none is in the production record →
  "there is nothing to say about what they produce. A lease with no production
  record is usually one that never produced."
- No neighbouring lease sits in this ring at all → "widen the distance".

Detailed and above also print `rings.distance_note`, `rings.note`, and — when
`rings.capped` — a line saying the first *N* neighbours are read in a fixed
order so the figures do not change between builds.

---

## 9. The timeline

Rows are grouped by month heading (`monthBreak`), with standing facts collected
under **"Standing facts — no date attached"** and undated rows under "Date not
recorded".

A row is `role="button"` and opens `e.ctx` — a drawer key the **server** supplies,
which on this record resolves to `permits`, `completions`, `status`, `operators`
or `lease:<id>`.

```
│  [kind chip] [on your lease] [2.31 mi away] [standing fact]   Sep 3, 2026
●  Title of the filing
│  ┌──────────┬──────────┬──────────┐
│  │ stat     │ stat     │ stat     │        3 cells, 4 on Professional
│  └──────────┴──────────┴──────────┘
│  body prose                                   Detailed and above
```

The two zero rules are the same pair the Alerts rows use, and for the same
reason — see [ALERTS.md §7](ALERTS.md). `blankStat` drops a cell whose value is a
dash, a blank, or a bare zero (`0.8%` and `0,5` stay); `liveValue` splits a
`"no gas · 56 BBL"` value on the middle dot and keeps the half that is a reading.
`▲` / `▼` carry the direction and the sign is stripped from the number.

`n0d()` — a separate rule for the **tables**: a count of nothing in a numeric
column is an em dash, not a zero. A "0" in the completions column of an operator
with four permits reads as a score rather than an absence, and a column of zeros
makes a busy county look idle. Only for counts, never for a measured value that
means zero.

### Figures are printed in full

`nShort` turned 199,738 into "199K". Every figure elsewhere on the page is
printed whole by `n0`, so the ring panel was quietly the smallest-looking part of
the screen while describing the largest volumes on it — a neighbour lease
produces far more than the reader's own share does. Same values, same units, more
digits; nothing is scaled.

The server-formatted strings on Alerts still abbreviate (`14K MCF · 665 BBL`) and
are left exactly as sent — §13 says render those verbatim, and re-formatting them
is what once turned `$4,548,479` into `$45,48,479`.

### The empty state names the reason

Not one message but a composed one, depending on which control emptied the list:

| Condition | What it adds |
|---|---|
| a search term | "No event matches *term*." |
| `kind === 'mine'` | your own rows are production, operator changes and rings — and a date range narrower than a few months will usually contain none of them, because production is filed monthly |
| a mile filter | the measured records run back further than the dated feed; try All dates, or County-wide, which also keeps the *N* county-only rows |
| a date range, no mile filter | "Nothing of this kind falls inside *range*." |

Plus a "clear the filters and show all *N* →" button in every case.

---

## 10. Professional only — who is working here, and where

Two ranked tables from `activities.operators` and `activities.fields`, twelve
rows each, with a line naming how many smaller ones are in the feed above.

Columns: name · permits · completions · total.

**The split matters:** an operator filing permits is planning, one filing
completions is finishing, and the ratio is the reading a professional wants. The
note above says counts are **filings, not wells** — one well can carry both a
permit and a completion.

---

## 11. What the record could not say

`tl.notes[]` renders verbatim under its own band, and Detailed adds the method
paragraph:

> A permit in the dated feed carries no lease number and no coordinates, so it is
> matched to your area by county, is never labeled as being on a lease you hold,
> and can never answer a mile button — only the rows from the well map carry a
> location. The neighbor rows come from the standing radius survey, so they are
> dated by that survey rather than by an event, and a date range therefore never
> removes them.

---

## 12. What the numbers actually are

Measured against the committed capture
(`app/mineralownersite/_lib/reference/owner-payload.json`):

```
timeline.events         893
timeline.counts         permit 433 · completion 253 · production 120
                        status 74 · adjacent 10 · operator 3
mine_count              133
ring_count               51     (measured distance)
county_count            709     (county-matched, cannot answer a mile button)
standing_count           10

range.cutoffs           d30 20260809 · d60 20260710 · d90 20260610 · m12 20250908
range.floor             202501 / 20250100

activities.counts       mine 0 · nearby 709 · news 0 · production 60
                        permits 401 · completions 234 · status 74

ctx keys in use         permits · completions · status · operators · lease:<id>
```

The `mine 0` against `mine_count 133` is not a contradiction: `activities.counts`
is the county-feed summary (permits and completions, none of which fall on this
owner's leases), while `timeline.mine_count` counts the whole matched feed,
where her 120 production filings and 3 operator changes land.

---

## 13. Known gaps

- **`open('kind:' + e.kind)` is a dead control.** The Ultra tier's "The latest on
  the record" list opens `kind:permit`, `kind:completion` and so on, but the
  payload's `drawers` map carries no `kind:*` keys — the capture holds 52 keys,
  all of them flat names, `alert:*`, `lease:*`, `well:*` or `pf_*`, and
  `/api/v1/dashboard/drawers/{key}` serves only the eleven flat keys plus five
  of the nine `alert:*` (see `member-drawers.ts`). `DrawerPanel`
  puts `display:none` on the panel and the scrim when `copy` is null, so those
  buttons do nothing at all, with no error and nothing on screen. The dated rows
  in the denser tiers are fine — they open `e.ctx`, which the server supplies and
  which resolves. The fix is either to route those Ultra items through `e.ctx`
  too, or to derive `kind:*` panels from `timeline.kinds[]` the way
  `withAlertDrawers()` derives the alert panels.
- **`timeline.kinds[].spark`** arrives on every response and nothing reads it —
  deliberately, see §5, but it is bandwidth being spent on nothing.
- **`activities.news`** and `news_empty_reason` are in the payload type and not
  rendered anywhere on this route.
- **`MONTH_NAMES` is the only literal on the screen**, and that is the Gregorian
  calendar rather than anything about this owner. Two places turn a `cycle`
  (`"202501"`) into a month a reader recognises, and a cycle carries no name; the
  API's own labels are day-precision (`"Sep 8, 2026"`) so they cannot supply a
  month heading.
- **The status feed is behind.** On this owner, well-status changes stop at
  Jan 13, 2026 while permits and completions run to Sep 7, 2026. That is stated
  in `notes[]` rather than hidden — the page's rule is that "nothing happened"
  and "we could not see" are different answers.
