# My Leases — `/mineralownersite/leases`

Converted from the redesign prototype's `owner/src/routes/app-leases.html`
(352 lines of markup, plus behaviour spread across `v33js.js`, `v39js.js` and
`route-groups.js`) into React server components, Tailwind and hand-added
shadcn/ui primitives.

## Layout

```
leases/
├── page.tsx                     the route: ten sections, in order, nothing else
├── _lib/                        data and pure logic — no JSX, no React
│   ├── lease-types.ts             the shape of one lease
│   ├── lease-records.ts           the ten leases + the owner record
│   ├── lease-totals.ts            every portfolio figure, derived
│   ├── lease-sorting.ts           sort keys, comparators, search
│   ├── lease-format.ts            the four ways money and volumes print
│   ├── lease-derivation.ts        the "explain this estimate" table
│   ├── lease-financials.ts        the twelve-month owner-share series
│   ├── lease-statements.ts        the seven monthly statements
│   ├── lease-activity.ts          the change feed + records-update event
│   ├── lease-routes.ts            where a lease lives (one function)
│   └── sample-leases.ts           the unclaimed sample record
├── _components/
│   ├── leases-header.tsx          title · record line · exports
│   ├── export-actions.tsx         ⚡ CSV / PDF buttons
│   ├── portfolio-value-band.tsx   the five dark-band figures
│   ├── estimate-explainer.tsx     how $26,340 is reached, lease by lease
│   ├── status-explainer.tsx       what "7 active · 3 inactive" means
│   ├── records-update-notice.tsx  ⚡ open → accepted → dismissed
│   ├── changes-since-card.tsx     ⚡ per-item mark-read
│   ├── plain-english-list.tsx     the Essentials tier
│   ├── ultra-summary.tsx          the Ultra tier
│   ├── unclaimed-sample.tsx       the unclaimed tier
│   ├── leases-tabs.tsx            ⚡ the three-tab shell
│   ├── statements-panel.tsx       Monthly Reports
│   ├── list/
│   │   ├── lease-list-panel.tsx   ⚡ owns sort · query · view
│   │   ├── lease-toolbar.tsx      ⚡ controlled, owns nothing
│   │   ├── lease-table.tsx        sixteen columns
│   │   ├── lease-table-row.tsx    one row
│   │   ├── lease-value-cell.tsx   the $0-fallback + county-gap rules
│   │   └── lease-grid.tsx         the same leases as cards
│   └── financials/
│       ├── financials-panel.tsx   composition + two-column layout
│       ├── income-trend-chart.tsx      inline SVG, server-rendered
│       ├── county-value-chart.tsx      inline SVG, server-rendered
│       └── annual-per-lease-table.tsx
└── [leaseNumber]/               the lease report — a placeholder, see its header
```

`⚡` = `"use client"`. Six components out of twenty-four. Both tab panels are
server-rendered and passed into the client tab shell as props, which is the only
reason two tables and two SVG charts stay off the client.

## The three rules this module keeps

**Data is numbers; formatting happens at render.** `_lib` holds `8700`, not
`"$8,700"`, because the module has to sort, sum and multiply with it. Everything
in `lease-format.ts` is display-only.

**Portfolio figures are derived, never listed.** The prototype printed its totals
as literals in seven places and they did not all agree. `lease-totals.ts`
computes them once, and the `$0`-fallback rule (three leases show a county value
that is never summed) is enforced there rather than remembered at each call site.

**Every figure says what kind of figure it is.** Derived, illustrative, or an
estimate. This is the screen where somebody decides whether they are being paid
what they are owed, and none of these numbers is a record of what was paid.

## Mode and funnel-state behaviour, verified against the prototype

Both gates were audited selector by selector against the prototype's
`mvfunnelstates.css` and `app-leases.html`, then measured in the browser across
all **20 combinations** (5 funnel states × 4 density tiers). No combination
renders an empty page.

### Density (`?view=`)

| Surface | Gate | Tier it appears in |
| --- | --- | --- |
| Ultra summary | `tier-u` | Ultra only — replaces the page |
| Plain-English list | `tier-s` | Essentials only — replaces the table |
| Export buttons, tab strip, toolbar, table, grid, closing notices | `hide-s` | everything except Essentials |
| Wk Δ · Field · API · RRC district columns | `tier-p` | Professional only |
| Value band, both explainers, both notices | none | every tier — the design pins the dollars above the news |

### Funnel state (`?state=`)

| State | What changes | Status |
| --- | --- | --- |
| `paid` / `trial` | nothing withheld — the trial *is* the plan | matches |
| `claimed` | the MVestimate money blurs and **only** that: band total + week change, two of three Financials KPIs, the lease table's money column (all ten rows *and* the total), derivation columns 2·4·5, annual-view columns 3·4. County roll, decimal interests, volumes, operator and county names stay sharp. Stat tiles gain "What it's worth unlocks with your free 7-day trial". | matches |
| `lapsed` | every all-ten-lease figure blurs — all five band figures, all three KPI figures, the Ultra headline figure. Stat tiles gain "Portfolio totals cover all 10 leases — Premium". | matches |
| `unclaimed` | the sample panel replaces the page; claim rail above it | matches |

Four gaps were found and closed in the process. The Tailwind primitives emitted
none of the class hooks `portal.css` keys the **lapsed** rules on (`.pf-val`,
`.k-val`, `.u-headline strong`, `.kpi`), so nothing blurred and neither caption
appeared in that state; they now carry `data-mv-portfolio-figure`, `data-mv-kpi`
and `data-mv-headline`, and `portal.css`'s existing selector lists were extended
rather than duplicated. Separately, the **claimed** column gates for this route
(`#lsMainWrap td.mv-cell`, `#lsPanelFin td:nth-child(3),(4)`,
`#lsExplainEst td:nth-child(2),(4),(5)`) had never been ported into this repo at
all — the module did not exist when `portal.css` was written — so three money
columns and two totals rows were fully legible to a free account.

## Four corrections to the design's arithmetic

Each is noted at the code that makes it:

| Where | The design | Here |
| --- | --- | --- |
| Per-lease annual view | rows used a ÷5.5-ish divisor under a ÷6 total, so the column summed to ~$4,750 beneath a printed $4,390 | `annualShare` divides by 6; the column sums to the total |
| County value chart | Hood labelled $8,990 where its four leases come to $8,240, so three bars summed to $27,090 under a $26,340 total | reduced over the records; the bars sum to the total |
| "Worth a look" flag | notice says "roughly 3× or more"; markup flags at 2.45× | threshold set to the applied 2.4×, and the notice now reads the constant so prose and rule cannot drift |
| County placeholder total | prints "$940 display-only" twice, over leases valued $55 + $410 + $410 = $875 | derived; footer and chart caption both read $875 |

One more is **not** corrected, deliberately: the estimate-explainer's gross model
input column does not multiply out to its own product column (Smith 305892 shows
$1,099,456 × 0.00538700 = $8,700, which is really $5,923). Fixing it means
changing either a DB-sourced column or the $26,340 that six surfaces lead with.
`lease-derivation.ts` ports both columns verbatim, checks the arithmetic at module
load, and the panel drops its "multiply any row yourself" invitation while the
check fails — so nothing is hidden and nothing is claimed. The invitation returns
by itself once the data is fixed.

Two figures in the prototype's markup are **stale, not authoritative**, and were
easy to copy wrongly: the Financials tab's Jun KPI (`$118`) and its YTD row
(`$540`) are both overwritten at runtime by `drawFinTrend()` with values derived
from the same curve the chart draws — `$129` and `$1,082 (Jan–Jun)`. This module
prints the runtime values.

## Known holes left matching the design

Two surfaces leak the MVestimate that the `claimed` state withholds elsewhere,
because the prototype's gate is column-scoped CSS that cannot reach them:

- the **grid view's** card value (its markup was built by `innerHTML` and never
  carried the class)
- the **Essentials list's** per-lease figures

Both are one `portalGate.lockedValue` away from closed. Left as the design has
them because changing what a funnel state *shows* is a product decision, and
flagged here rather than silently altered.

One more worth a look: in `lapsed`, the Ultra hero blurs `.u-headline strong`,
which is the **lease count** ("10 leases") — while the `$26,340` in the sentence
below it stays sharp. The blur lands on the one figure in that card that is not
money. Ported faithfully.

## The lease report — `[leaseNumber]/`

The three tied reports, converted from `app-lease-smith.html` (1,088 lines),
`app-lease-detail.html` (589) and `app-lease-generic.html` (50).

```
[leaseNumber]/
├── page.tsx                        ten sections; ?report= picks the panel
├── _lib/
│   ├── lease-report-types.ts         the three fidelity levels, as types
│   ├── lease-report-records.ts       Smith + Ledbetter in full, eight generic
│   ├── unit-outline-data.ts          the CROW A geometry, verbatim
│   ├── unit-outline-projection.ts    lon/lat → SVG, pad clustering, tile URL
│   ├── production-series.ts          237 months of CROW A 2H
│   └── decline-chart.ts              axis ticks, scales, broken-line paths
└── _components/
    ├── lease-report-nav.tsx        breadcrumb + lease→lease pager
    ├── lease-title-card.tsx        the lease, at 100%
    ├── owner-value-card.tsx        the owner's share, and one disclosure
    ├── report-tabs.tsx             three URLs, not three display toggles
    ├── what-changed-card.tsx       used by all three tabs
    ├── unit-outline-panel.tsx      ⚡ layers, zoom, readout
    ├── unit-outline-map.tsx        ⚡ the SVG over Esri imagery
    ├── production-chart.tsx        ⚡ posted history vs decline curve
    ├── next-payment-card.tsx       two ranges, never a point
    ├── lease-bottom-tiles.tsx      ten flowing tiles
    ├── reservoir-panel.tsx         the rock
    ├── wells-panel.tsx             the wellbores
    ├── action-footer.tsx           four actions, and permission to take none
    └── lease-report-unclaimed.tsx  the nc-only page replacement
```

**Both coordinates are in the URL.** `/leases/305892?report=reservoir`. The
prototype had neither: its pages were hand-named routes (`#/app/lease/smith`, so
eight of ten leases had no page) and its tabs toggled `style.display`, so the
reservoir report had no address an alert could link to.

**The map and the chart are real.** The boundary is the CROW A pooled unit
traced from the operator's filed plat, closing at 704.09 ac against the 704.00
filed — over Esri World Imagery with the plat sheet on top and all 21 wellbores
from the RRC record, 2 measured and 19 drawn as labelled estimates. The chart is
237 posted months of CROW A 2H. Both are labelled real-example-on-a-fictional-
lease, twice, because Bee County is not digitized: the alternative was to invent
geometry, which this module does not do.

## Two collisions between `portal.css` and Tailwind

`portal.css` defined `.flex` and `.grid` — names Tailwind also generates, at
higher specificity (`.mv-portal .flex` beats `.flex`). Every Tailwind flex
container under the portal root silently inherited `align-items:center` and a
`gap`, and a narrow-width rule forced `flex-wrap:wrap` on all of them below
900px. Measured: the owner card rendered with its `$8,700` centred. The two
utilities are now `.mv-row` and `.mv-grid`; the gates (`tier-*`, `hide-*`,
`nc-*`, `cl-lock`, `state-*`) collide with nothing and stay shared.

## What is not built

- **The lease report** (Lease · Reservoir · Wells). `[leaseNumber]/` is a
  placeholder that prints what the record holds and says the report is coming.
- **The ◈ show-on-map button** on each row — the owner map module does not exist.
- **The statement viewer** behind Monthly Reports' Open buttons.
- **Links out of the change feed** — they pointed at the lease report and
  Activities.
- **Real CSV/PDF export** — the buttons admit they are prototypes.

## Where the UI vocabulary lives

`../_components/ui/` — Card, Badge, Notice, Table, KpiTile, ValueBand,
ExplainPanel, Tabs, SegmentedControl, form controls, UltraHero, ViewTierLink and
the `portalGate` helpers. Portal-wide, reusable by the next module. Read
`portal-ui.md` there for the shadcn conventions followed and the two primitives
deliberately turned down.
