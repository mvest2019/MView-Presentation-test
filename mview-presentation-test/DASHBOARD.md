# The Owner Dashboard

`/mineralownersite` — what a mineral owner sees first: what their minerals are
worth, what changed since their last visit, and the one thing that needs them.

This document covers the route end to end: where every figure comes from, what
renders in each of the four densities and five account states, what every
control does, and what is still missing. It is written against the code as it
stands, and every behaviour described here was exercised in a browser against
the live `mineralview-api` dev service before it was written down.

---

## 1. Where it lives

| Concern | File |
|---|---|
| Route (server half) | `app/mineralownersite/(reference)/page.tsx` |
| Shell, routing, drawer, error states | `app/mineralownersite/_components/reference/Portal.tsx` |
| Sidebar, top bar, pinned bar, menus | `app/mineralownersite/_components/reference/Chrome.tsx` |
| The dashboard itself | `app/mineralownersite/_components/reference/Dashboard.tsx` |
| Right-rail and Essentials panels | `app/mineralownersite/_components/reference/panels.tsx` |
| Shared primitives (`Kpi`, `LBar`, `Spark`, `Hint`) | `app/mineralownersite/_components/reference/bits.tsx` |
| Lease-age band | `app/mineralownersite/_components/reference/maturity.tsx` |
| Plan / state card | `app/mineralownersite/_components/reference/funnel.tsx` |
| Charts | `LineChart.tsx`, `ForecastChart.tsx` |
| Evidence drawer | `DrawerPanel.tsx` |
| **The data seam** | `app/mineralownersite/_lib/reference/owner-data.ts` |
| Member-keyed API client | `app/mineralownersite/_lib/reference/member-api.ts` |
| Owner-keyed API client | `app/mineralownersite/_lib/reference/owner-api.ts` |
| Sample (not-claimed) transform | `app/mineralownersite/_lib/reference/sample.ts` |
| Payload types | `app/mineralownersite/_lib/reference/payload.ts` |
| Committed fallback capture | `app/mineralownersite/_lib/reference/owner-payload.json` |
| Client-side refetch endpoint | `app/api/portfolio/route.ts` |
| Stylesheet | `app/mineralownersite/dashboard-reference.css` |

`_components/dashboard/*` is an **earlier** dashboard tree. Only `ClaimRail` is
still imported (by the leases pages). Nothing in it renders on this route.

---

## 2. Data flow

```
 browser  ──▶  (reference)/page.tsx          server component, force-dynamic
                    │
                    ├─ loadInitial(searchParams)
                    │     owner / num / dist / year off the query string
                    │
                    ▼
              getOwnerPayload()               THE SEAM — owner-data.ts
                    │
        ┌───────────┼───────────────────────────────┐
        │           │                               │
   no API base   signed in                    not signed in
        │           │                               │
        ▼           ▼                               ▼
    capture   MEMBER-KEYED path              OWNER-KEYED path
   (fixture)  /api/v1/dashboard              /api/v1/alerts
              /api/v1/weekly                 /api/v1/activity
              /dashboard/drawers/{key} ×11   /api/v1/activity/summary
                                             /api/v1/activity/rings
                                             + capture for the rest
                    │
                    ▼
              Payload  ──▶  <Portal route="dashboard" initial={payload} />
                                    │
                                    ├─ null payload?  client retries
                                    │     GET /api/portfolio  ──▶ same seam
                                    │
                                    └─ <Chrome> … <Dashboard p tier funnel sample open go />
```

**The payload is loaded on the server for the first paint**, so the page arrives
with real figures in the HTML rather than a spinner. After that the client shell
owns navigation: moving between Dashboard, Weekly Report, Alerts, Activities and
Production re-uses the same snapshot instead of loading it twice. Each of those
routes still has a real server page, which is what makes a cold entry or a shared
link work.

### Who is asking

`member_id` is read **once**, on the server, in `owner-data.ts`:

```
login response .member_id
   → startSession() writes httpOnly cookie `mv_user`
      → getSessionUser() reads it back per request
         → currentMemberTarget() → buildMemberPayload(base, member)
```

The cookie is `httpOnly`, so the id never reaches page JavaScript. There is **no
member id in the environment and none hardcoded anywhere** in this tree — an
earlier pass read one from `MINERALVIEW_MEMBER_ID`, which meant every visitor saw
that member's minerals under their own name.

### Which block comes from where (member-keyed path)

| Source | Blocks |
|---|---|
| `GET /api/v1/dashboard?member_id=` | `owner`, `as_of`, `totals`, `leases`, `model_deck`, `operators`, `reserves`, `radius`, `radius_stamp`, `radius_note`, `series`, `sources`, `coverage`, `alerts`, `activities`, `ticker` |
| `GET /api/v1/weekly?member_id=` | `weekly` |
| `GET /api/v1/dashboard/drawers/{key}` × 11 | the flat explainers |
| derived in `member-drawers.ts` | `lease:*` and `well:*` explainers (the endpoint 404s all 89) |
| **the committed capture** | `timeline`, `rings`, `forecast`, `my_leases` |
| empty stand-ins | `nearby`, `alerts.ledger`, `activities.kpis_*`, `owner.districtcode` |

**The Dashboard reads none of the four capture-backed blocks** — verified by
search: no `p.timeline`, `p.rings`, `p.forecast`, `p.my_leases` or `p.nearby`
anywhere in `Dashboard.tsx`, `panels.tsx`, `bits.tsx`, `maturity.tsx` or
`funnel.tsx`. Only `activities.counts.nearby`, which is live. See §11 for what
that means for the routes that *do* read them.

### The eleven flat drawer keys

`appraised · completions · identity · operators · permits · prices · producing ·
production · reserves · status · value`

All eleven are fetched on every payload build, not lazily, because `Portal` opens
a drawer synchronously out of `p.drawers[key]` and `DrawerPanel` hides itself
when its copy is null — a scoped fetch left ten "expand →" controls doing nothing
at all, silently.

The drawer endpoint's `owner` parameter is read off **the dashboard's own
answer** (`dash.owner.ownername`), never configured. One member can claim several
roll owners and the parameter changes the figures; a pinned name would put one
owner's total on a card and another owner's inside the panel explaining it.

---

## 3. The two axes

These are orthogonal and confusing them is the most-repeated warning in the code.

### Axis 1 — view tier (the four personas)

A **display preference**. Never a plan.

| Key | Name shown | Root class |
|---|---|---|
| `ultra` | Ultra | `view-ultra` |
| `simple` | Essentials | `view-simple` |
| `detailed` | Detailed | *(none — the default)* |
| `pro` | Pro | `view-pro` |

* Default: `detailed`.
* Chosen from the **profile menu** (avatar, top right) — a real `role="tablist"`
  with `role="tab"` + `aria-selected` on each button.
* Persisted in `localStorage` under `mv.tier`; survives reload.
* **Decided in React, not in CSS.** The prototype's density rule was
  `section > :not(.tier-u)`, which depends on the child being a direct
  descendant of the route section; in a component tree that is not reliably
  true, and a wrong depth silently hides the whole page. So `Dashboard` takes
  `tier` as a prop and branches on it.
* `?view=<key>` is **not** honoured (see §11).

### Axis 2 — funnel state (the account)

| Key | Menu label | Root class |
|---|---|---|
| `unclaimed` | Not claimed | `no-claim mv-sample` |
| `claimed` | Claimed · free | `state-claimed` |
| `trial` | On trial | `state-trial` |
| `lapsed` | Lapsed | `state-lapsed` |
| `paid` | Paid | `state-paid` |

* Opens on what the record says: `owner.claimed_owners?.length === 0` →
  `unclaimed`, otherwise `paid`.
* The other four come from the **demo menu** ("Paid ▾" in the top bar) and are
  remembered in `localStorage` under `mv.funnel`. Nothing in the login response
  or in `/api/v1/dashboard` distinguishes paid from trial from lapsed, so
  seeding them from anything real would be inventing an entitlement.
* Starting a trial stamps `mv.trialStart`, so "7 days left" counts down instead
  of printing a frozen day 3.
* **`unclaimed` forces the density to Pro** (`effTier`). Someone deciding whether
  to claim is looking at a shop window. The persona buttons keep their own state
  and take effect the moment the record is claimed.

`stateAccess()` states the gate once as data: `claimed`, `showsEstimate`,
`showsFunnelBar`, `premium`.

---

## 4. What renders at each density

Measured on a live member record (13 leases, REEVES county), viewport 1280.

### Ultra — 0 cards, 1 button, 224 characters

One kicker, one headline, one status sentence, one button, one footnote. No
greeting, no strip, no rails.

```
YOUR MINERALS · JUNE 2026
$21,492,409
Your share across 13 leases. 12 filed gas in June 2026 — 53,885 MCF of gas
and no oil to you.
[ See what changed ]
Estimate, not an appraisal · re-run Sep 10, 2026 · gas through June 2026
```

The button opens the top finding's drawer, or `value` when there is no finding.

### Essentials — 7 cards

Greeting · portfolio strip · alerts rollup · the one-line hero, then five
plain-English cards and the month chart:

1. **Your minerals, in one line** — the top finding, or the filed-month summary
2. **Are my leases earning?**
3. **Is it going up or down?**
4. **What is it worth?**
5. **What is happening around me?**
6. **What should I watch next?**
7. **Your gas, month by month** — CSS bar chart (`.mcols > .mc`), heights are
   `value ÷ peak` and each bar's `title` carries the month, the volume and the
   number of leases filing

No tables, no SVG, no KPI grid, no rails.

### Detailed — 13 cards, 4 SVG charts

Everything Essentials has except the five plain-English cards, plus "what
changed", the alert strip, the four KPIs and both rails.

**Left rail** — switchable lease chart · monthly trend · what's going on around
you · how long these leases have produced · your operators · the price path

**Right rail** — what we watched · reserves & new-well outlook · neighbours &
standing permits · your wells · where your value sits · where every number came
from

### Pro — 14 cards, 1 table (one row per interest)

Detailed **plus "Every lease, every field"** under the left rail — and **the
price deck moves to the right rail**, because the table makes the left rail the
long one. That swap is deliberate, not a layout accident.

Table columns: Lease · County · Operator · Interest · Your value · Appraised ·
Last filed · Your share · Gas left · Oil left.

---

## 5. What renders in each account state

| State | What is different |
|---|---|
| **Not claimed** | SAMPLE PREVIEW banner at the top; everything below is the paid page. Density forced to Pro. Figures scaled by one seeded factor, names substituted. See §6. |
| **Claimed · free** | The owner's own density. Plan card explains the state. Value figures blurred by `.cl-lock` (7px blur, `user-select:none`) — every lease, volume and permit stays in the clear, because they claimed them; what Premium adds is what they are *worth*. |
| **On trial** | Full Premium — the trial *is* the plan. The plan card counts days from `mv.trialStart`. |
| **Lapsed** | Plan card says one lease stays live and the rest are on hold; value figures covered for that reason. |
| **Paid** | The full product, nothing withheld. |

---

## 6. The not-claimed (sample) dashboard

**The rule: it is the paid page, with a banner on top.** A visitor deciding
whether to claim should be looking at the thing they get, not at a different
product.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [SAMPLE PREVIEW]                                                         │  amber,
│ This is what your dashboard looks like once you claim your record. Every │  dashed
│ figure below belongs to Sample Owner, a fictional sample owner — the     │
│ dates are real, the amounts are illustrative. Claiming is free, takes    │
│ about two minutes, and never changes legal ownership.                    │
└──────────────────────────────────────────────────────────────────────────┘
Good morning, Priya · Thursday, September 10
Your minerals, through June 2026
10 leases · 10 producing · 9 filed for June 2026 · DE WITT · …
[ the paid strip, the paid rollup, the paid cards — identical ]
```

* The banner is `.smp-badge` + `.smp-tag` (`dashboard-reference.css:387–389`) —
  the same amber dashed pair already used on My Leases and the Weekly Report, so
  the sample state reads identically wherever a visitor meets it.
* **The pill sits on its own row and the sentence runs the full width — two
  lines on a desktop.** Three inline styles on this one banner do it, and none
  of them touches the shared class: `flex-direction: column` +
  `align-items: stretch` (the class is a `flex` row, which gave the copy a
  615px column in a 1114px box), `align-self: flex-start` on the pill so it
  keeps hugging its label, and `max-width: none` on the paragraph to lift the
  reference's `78ch` measure. My Leases, the Weekly Report, `.simple-hero > p`
  and `.act-empty p` keep the cap.
* The copy is cut to the two facts a reader needs before they look at a figure:
  whose record this is, and that the amounts are not real. The roll year, the
  filing month and the model run date are all printed on the strip and cards
  below, so they left the banner with the third line.
* **No claim rail, no per-card `sample` tags, no sixth "Sample / illustrative"
  cell in the strip.** All three re-arranged the page relative to paid; the
  banner says the same thing once.
* The claim CTA lives in the sidebar ("Claim Mineral Owner"), which `Chrome`
  renders throughout this state.
* `.no-claim` still puts an amber ring round the strip and the alert rollup —
  colour only, no layout change.

### How the sample figures are made — `sample.ts`

* One **seeded factor**, derived from `owner.ownername + ':' + roll_year`, in the
  band 0.55–1.70 and never exactly 1. Stable for one owner, different between
  owners. Every amount and volume is multiplied by it, so the rows still add to
  the totals and the *shape* the reader is shown is real while the amounts are
  not.
* Owner name → `Sample Owner`. Lease and operator names → substituted from a
  fixed list.
* `scrub()` masks any stray figure in prose to `•••`.
* **Exempt:** the price ticker and the price charts. Those are published market
  settlements, not this owner's information, and scaling them would be inventing
  a market. Dates are real too — that is the point of the "dates are real,
  amounts are illustrative" line.

### Lakh formatting

On the sample page **only**, the MVestimate and the production figures are
re-expressed in lakhs by `_lib/format-lakhs.ts`:

```
$21,492,409  →  $214.92 L
```

* It takes the already-formatted **string** and returns a string, so no value is
  restated and a figure it cannot parse comes back exactly as it arrived rather
  than as `NaN`.
* `LAKH_THRESHOLD` is 100,000. **A figure below one lakh is returned
  unchanged** — `17,306` stays `17,306`, because `0.17 L` is harder to read and
  throws away two significant digits. That threshold is the one lever in the
  file; lower it if the hero figures should read in lakhs regardless of size.
* Gated on `sample`. A claimed owner's own money keeps the format their
  statements and the rest of the product use.

---

## 7. UI anatomy

```
┌── app-top ────────────────────────────────────────────────────────────┐
│ ☰   [pinned value $21,492,409] [WTI][NAT GAS][BRENT][PROPANE]         │
│                                    [Paid ▾] [PREMIUM PLAN] [⚑6] [KR]  │
├── app-side ──────┬── app-body ────────────────────────────────────────┤
│ MY MINERALS      │  greeting + owner chip                             │
│  Dashboard       │  ┌ pf-strip ─────────────────────────────────────┐ │
│  Alerts      (6) │  │ Your value │ Gas filed │ Oil filed │ County   │ │
│  Activities      │  │            │           │           │ Producing│ │
│  My Leases       │  └───────────────────────────────────────────────┘ │
│  Map             │  ┌ mv-alsum (alerts rollup) ─────────────────────┐ │
│  Production      │  │ 9 findings … [Open all alerts →]              │ │
│  Weekly Report   │  │ [2 Money][5 Activity][2 Models & forecasts]   │ │
│ SERVICES         │  │ NEEDS YOU  <top finding>                      │ │
│  Lease Audit SOON│  └───────────────────────────────────────────────┘ │
│ COMMUNITY        │  what changed · alert strip · KPI grid             │
│  Groups      SOON│  ┌ left rail ───────┬ right rail ────────────────┐ │
│  Invite Co-Owners│  │ value by lease   │ what we watched            │ │
│                  │  │ month by month   │ reserves & outlook         │ │
│ Sample Owner     │  │ around you       │ neighbours & permits       │ │
│ Premium plan     │  │ lease age        │ your wells                 │ │
└──────────────────┴──│ your operators   │ where your value sits      │─┘
                      │ [Pro: the table] │ where every number came... │
                      └──────────────────┴────────────────────────────┘
                                            ┌─ ctx-drawer (680px) ──┐
                                            │ evidence, on demand   │
                                            └───────────────────────┘
```

### The greeting

`Good {morning|afternoon|evening}, {name} · {weekday}, {Month} {day}`.

**The name is the SIGNED-IN MEMBER's, not the record's** —
`usePortalMember()?.firstName`, filled on the server in the group's layout from
the httpOnly `mv_user` cookie, so it is in the first HTML and no identity is
ever requested from the browser. That distinction matters whenever a member
claims a record filed under a relative's name, a trust or a company: the
greeting names the reader and the owner chip beside it names the record. In the
sample state it also stops the page reading "Good morning, there".

The record's `owner.first_name` remains the fallback for a visitor who is not
signed in — a shared link or a cold visit — because greeting the record beats
greeting nobody.

### The pinned bar

`#mvPinBar` — the value estimate plus four commodity settlements (WTI, natural
gas, Brent, propane), each a button opening the `prices` drawer. Values,
percentage moves and settlement dates all come from `payload.ticker`, sourced
from the U.S. Energy Information Administration. A commodity with
`change_pct: 0` renders no arrow.

### The portfolio strip

Five `.pf-cell` tiles: **Your value · Gas filed in {month} · Oil filed in
{month} · County appraised · Producing**. Each is `role="button"` + `tabIndex=0`
with both a click and an Enter/Space handler, and each opens its own drawer.
Both product cells always render — a gas-only owner sees the oil cell say
"none", because *absent from the record* and *absent from the strip* are
different facts.

### The KPI grid (Detailed and Pro)

**Your value · Leases earning · Still to come, your share · Permits within 1
mile.** Same activation contract as the strip. The value KPI carries a
sparkline drawn from the real monthly series.

### The evidence drawer

`.ctx-drawer`, 680px, slides from the right; `.mv-ref-app.ctx-open` drives it.
Closed it is `visibility:hidden`, and the scrim is `display:none`, so nothing
invisible captures a click. Opened from any tile, any alert row, any `→` hint or
any bar. Close with the ✕.

---

## 8. Every control, and what it does

| Control | Behaviour |
|---|---|
| Sidebar rows (7) | Client-side route change; the payload is re-used, so the switch is instant |
| "Coming soon" rows (3) | Navigate to `/mineralownersite/soon/{slug}` |
| Hamburger (≤860px) | Opens the mobile drawer |
| Pinned value | Opens the `value` drawer |
| Four price chips | Open the `prices` drawer |
| "Paid ▾" | Demo funnel menu — five states |
| Plan pill | Links to `/mineralownersite/soon/billing-and-plan` |
| Bell ⚑ + badge | Links to Alerts. Badge = `alerts.items.filter(a => a.unread).length` |
| Avatar | Profile menu: the four persona tabs, "How this record was identified", Log out |
| "How we matched this" | Opens the `identity` drawer |
| 5 strip tiles | Open `value` / `production` / `production` / `appraised` / `producing` |
| 4 KPI tiles | Open `value` / `producing` / `reserves` / `permits` |
| "Open all alerts →" | Navigates to Alerts |
| Category chips | Navigate to Alerts (**unfiltered** — see §11) |
| 9 alert "expand →" | Each opens its own drawer with that finding's evidence |
| Value / Gas / Appraised / Reserves | Re-sorts and re-labels the lease bar chart in place |
| Lease bars | Open that lease's `lease:*` drawer |
| "See all N filings →" | Navigates to Activities |
| "the whole feed →" | Navigates to Activities |
| "why a handover matters →" | Opens the `operators` drawer |
| "How the two differ →" | Opens the `prices` drawer |
| "what was matched →" | Opens the `identity` drawer |
| Ultra's single button | Opens the top finding's drawer |
| Drawer ✕ | Closes; root loses `ctx-open` |

Every `role="button"` div in this tree carries `tabIndex={0}` **and** an
`onKeyDown` that fires on Enter and Space. Verified by dispatching a real
`keydown` — the tiles are not mouse-only.

---

## 9. States

### Loading

`<Loader on={busy} name={loadingName} steps={STEPS} />` — a **named** loader that
says whose record is being read and what stage it is at:

| at | text |
|---|---|
| 0 ms | Finding the appraisal-roll rows for this name |
| 1.2 s | Reading production, value and reserves for each lease |
| 3.2 s | Matching permits and completions around the acreage |
| 5.2 s | Building the alerts and the activity feed |
| 8.0 s | Still working — a first read scans the whole roll year |

A cold member build is about eleven seconds: `/dashboard` is 648 KB and eight of
them, `/weekly` runs beside it, the eleven drawers take three more. A cold
*owner* (owner-keyed path) is 23–28 seconds, because the appraisal roll carries
no index on the owner name. The client allows 60 s per call — **do not lower
that**; a 10-second default aborts a request that was going to succeed.

### Nothing claimed yet

`GET /api/v1/dashboard` answers `404 DASHBOARD_NO_CLAIM` for a signed-in member
who has not claimed a roll owner. That is where every new account starts, so it
is **not** rendered as a failure:

```
Nothing is claimed on this account yet
Your dashboard fills in the moment a record is claimed — your leases, what
they produced, what they are worth and what changed since your last visit.
This member has not claimed an owner record yet (request 1dc6897a-…)
[ Claim your record — free → ]        →  /mineralownersite/claim
```

### Error

Any other failure renders `ErrorCard`: "That did not load", the service's own
sentence, its request id, and "Nothing is cached from a failed read, so nothing
stale is being shown."

**A failure is never patched with the capture.** A page showing this owner's
chrome above last month's figures, with nothing on screen saying so, is worse
than a page that says it could not load. The capture is the source only when
*no* API is configured at all.

`/api/portfolio` translates each service code into a headline:

| Code | Headline |
|---|---|
| `VALIDATION_ERROR` | That request was not valid |
| `PORTFOLIO_OWNER_NOT_FOUND` | We could not find that name on the roll |
| `DATABASE_UNAVAILABLE` | Records are temporarily unavailable |
| `QUERY_TIMEOUT` / `CLIENT_TIMEOUT` | That took too long |
| `NETWORK_ERROR` | The records service could not be reached |
| `OWNER_NOT_AVAILABLE` | That owner is not available yet |
| `DASHBOARD_NO_CLAIM` | Nothing is claimed on this account yet |

`retryable` is true only for 503, 504 and status 0 — a 400 or a 404 will answer
the same way every time.

### Empty

Zero-count fields render `0` or a named absence ("none", "no gas has ever been
filed on these leases"), never a fabricated figure. Missing labels render `—`.

---

## 10. Formatting, responsive, accessibility

**Numbers.** `usd` / `usdShort` / `n0` / `nShort` / `vol` / `pctS` in
`_lib/reference/fmt.ts`. Owner-share figures always use the `_net` fields;
whole-lease figures are labelled as such ("your share of $71.45M", "life of
lease, on a 100% basis"). Lakhs apply on the sample page only (§6).

**Spelling.** The upstream service spells British. `american.ts` rewrites values
— never keys — once at the seam, at module load, so "Neighbours" reads
"Neighbors" without touching 2 MB per request.

**Responsive.** No horizontal document overflow at 1280 or 375.

| Breakpoint | Behaviour |
|---|---|
| ≤ 860px | Sidebar hidden, hamburger + bottom nav (Dashboard · Alerts · Leases · Production · Weekly) |
| ≤ 767px | Drawer goes full-width |
| ≤ 560px | Strip cells and 4-up grids stack to one column |
| any | The Pro table (1241px) scrolls inside its own `overflow-x:auto` wrapper |
| any | The price ticker scrolls inside `.pin-spot` |

**Accessibility.** Persona switch is a real tablist. Every clickable tile is
`role="button"` + `tabIndex=0` + Enter/Space. The drawer close button has
`aria-label="Close"`. Sparklines are `aria-hidden`. The chart tabs
(Value/Gas/Appraised/Reserves) are plain buttons with an `.on` class rather than
`role="tab"` + `aria-selected` — that is the reference's own markup.

**Print.** `@media print` hides the sidebar, the loader, the drawer, the scrim
and the alert filter.

---

## 11. Known gaps

| # | Gap | Where it belongs |
|---|---|---|
| 1 | **Cross-owner data on the neighbouring routes.** `timeline`, `rings`, `forecast` and `my_leases` still come from the committed capture even for a signed-in member, so Activities / Production & Forecast / My Leases show the captured owner's record under this member's chrome. Reachable in one click from the Dashboard's "See all N filings →". The seam refuses exactly this mixing on the owner-keyed path (409 `OWNER_NOT_AVAILABLE`) but permits it here. | Backend / API — no member-keyed endpoint |
| 2 | **Plan pill is not an entitlement.** It reads "Premium plan" for every signed-in member. There is no subscription, entitlement or trial field in the login response or in `/api/v1/dashboard`. | Backend / API |
| 3 | **Greeting is computed from `new Date()`** inside an SSR'd client component with no `suppressHydrationWarning`. Where the server and the browser are in different time zones the greeting is wrong and hydration mismatches. Not reproducible on a single-machine local setup. | Frontend |
| 4 | **Alert category chips do not carry their category** — "2 Money" lands on the unfiltered Alerts page. | Frontend (reference behaviour) |
| 5 | **`?view=<tier>` is ignored.** The v1 contract in `_lib/portal-state.ts` lists it as clause 5; the v2 `Portal` reads `localStorage` only. | Frontend |
| 6 | **`alerts.ledger` is an empty stand-in** on the member path, so the Alerts watch-ledger panel reads zero. | Backend / API |
| 7 | **The five-mile map has no source.** `nearby` needs per-row `dx_mi`/`dy_mi`; `dashboard/nearby`, `nearby`, `weekly/nearby` and `activity/nearby` all 404. The map renders its own "not available" notice. | Backend / API |
| 8 | **Value delta is unavailable.** The value model stores yesterday's figure equal to today's on every document, so the month-over-month production change is shown instead. | Data |

---

## 12. Configuration

`MINERALVIEW_API_BASE_URL` is the whole switch. `next.config.ts` declares it with
the dev host as its default, so a fresh checkout calls the backend out of the box.

| Value | Behaviour |
|---|---|
| unset / default | Calls the dev service |
| a different host | Calls that host (no trailing slash, no `/api/v1` — the client appends it) |
| **empty string** | Forces the committed capture — useful offline or to compare against a known-good record |

Not `NEXT_PUBLIC_`, and it must not become one: it is read in `server-only` code,
so the browser never learns the address and the API's CORS allowlist never has to
carry a browser origin.

---

## 13. QA checklist

**Data**
- [ ] Every strip and KPI figure matches `GET /api/v1/dashboard?member_id=<id>`
- [ ] `alerts.counts` matches the rollup chips; the bell badge is the *unread* count
- [ ] The Pro table has one row per interest and its values match `leases[]`
- [ ] `sum(leases[].owner_value) === totals.owner_value`
- [ ] Value / Gas / Appraised / Reserves each re-sort by the right field
- [ ] Month-chart bar heights are `value ÷ peak`
- [ ] No hardcoded member id, owner name, lease name, count or currency literal

**States**
- [ ] All five funnel states render without a console error
- [ ] Not claimed: banner present, no claim rail, no `samp-tag`, five strip cells,
      card list identical to paid
- [ ] Not claimed: MVestimate in lakhs; claimed states unchanged
- [ ] Claimed and lapsed blur the value figures
- [ ] Trial counts down from the stamp rather than printing a fixed day
- [ ] A member with no claim gets the claim invitation, not "That did not load"

**Density**
- [ ] Ultra 0 cards · Essentials 7 · Detailed 13 · Pro 14 + 1 table
- [ ] Pro moves the price deck to the right rail
- [ ] The choice survives a reload
- [ ] Unclaimed forces Pro whatever is stored

**Interaction**
- [ ] Every tile opens its drawer by mouse **and** by Enter
- [ ] All nine alert "expand →" open distinct content
- [ ] The drawer closes cleanly (`ctx-open` removed, scrim `display:none`)
- [ ] Route changes re-use the payload (no refetch)

**Layout**
- [ ] No horizontal document overflow at 1280 or 375
- [ ] The Pro table scrolls inside its own wrapper
- [ ] Bottom nav and hamburger appear ≤860px

**Build**
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` — no new errors
- [ ] `npm run build` exits 0
