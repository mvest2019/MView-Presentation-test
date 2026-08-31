# The operator pages — working reference and handover

Five routes built on the Mineral View operator API (`/api/v1/operators/*`), plus the
twelve same-origin route handlers in front of it.

This doubles as a handover: it is written so someone with no context can pick the
defect-sheet work up mid-flight. Everything was verified against the dev host
(`mview-dev-api.mineralview.com`) rather than inferred from the code. Where a number
is quoted it was measured; where the API cannot answer something, that is said plainly
instead of worked around.

**Branch:** `fix/operator-defect-sheet`, cut from `Dev-10-08-26`.
**Defect sheet:** `Mineral View Site Rebuild Defect sheet .xlsx`, `Sheet1`, rows
SR 116–167. Columns: `SR No. · FEATURE_NAME · SUB_FEATURE_NAME · STEPS_TO_INPUT ·
DEFECT · SNAP · OWNER · DEV STATUS · DEV COMMENT · QA STATUS · QA COMMENT`.

---

## 1. Where the work has got to

**28 of 51 actionable defects are done.** SR 167 is blank in the sheet — no
description, no screenshot — so 51, not 52.

| Section | Range | Total | Done | Open |
|---|---|---|---|---|
| Operator Directory | 116–125 | 10 | 9 | 1 (backend) |
| Operator Detail | 126–156 | 31 | 19 | 12 |
| Compare Operators Performance | 157–165 | 9 | 0 | 9 |
| Compare Operator Statistics | 166 | 1 | 0 | 1 |

**Remaining, all pages:** `125, 130, 131, 135, 139, 140, 141, 146, 147, 150, 151,
153, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166`

### Done

| # | What was wrong | Where |
|---|---|---|
| 116 | `>5`/`>10` cramped; chips and Clear all shared one tight gap | `lib/operator-search.ts`, `operator-page.tsx` |
| 117 | lede wrapped to two lines | `app/operators/page.tsx` |
| 118 | three whitespace bands (above h1, Applied row, above "Showing…") | `page.tsx`, `operator-page.tsx` |
| 119 | `CountyDirectory` unrendered but the file remained | deleted |
| 120 | search box 48px vs selects 44px | `operator-page.tsx` |
| 121 | export dumped all 24,744 in a fixed shape; no busy state | `use-operator-directory.ts` |
| 122 | opened ordered by oil, so Counties read unsorted | `lib/operator-search.ts` |
| 123 | no column floor; invalid state survived a refresh | `use-operator-directory.ts`, `operator-page.tsx` |
| 124 | caret `h-[7px] w-[11px]` — tiny and non-square | `control-styles.ts` |
| 126 | **wheel-jacking** — see §6 | `production-over-time.tsx` |
| 127 | three comparison periods, none named | `lib/operator-detail.ts` |
| 128 | already correct (`BOE Produced`) | — |
| 129 | no `:` between tooltip label and value | `production-over-time.tsx` |
| 132 | "County" repeated on every dropdown option | 3 components |
| 133 | two unexplained county counts | legend removed; panel relabelled |
| 134 | `"…could not be reached.:"` — stray colon | `operator-what-changed.tsx` |
| 136 | **not reproducible** — 0 of 1,005 lease names contain "test"; the data changed upstream | — |
| 137 | **not a defect on current data** — 7 of 1,005 lack an `api` and correctly show an em dash | — |
| 138 | tooltip overflowed the chart at the edges | `production-over-time.tsx` |
| 140 | *(decimals half)* volumes printed 4 dp | `lib/operator-detail.ts` |
| 142 | **backend-dependent** — see §7 | — |
| 143 | "Producing counties" is a claim the payload cannot support | `[slug]/page.tsx` |
| 144 | 84 `Submitted` permits all carried an `approved_date` — the submit date repeated | `recent-wells-permits.tsx` |
| 145 | directory sorted by oil while calling it "reported production" | both pages |
| 148 | arrow drawn with no delta | `[slug]/page.tsx` |
| 149 | logos had no alt | `operator-logo.tsx` |
| 152 | lease county filter listed all 255 counties | `[slug]/page.tsx` |
| 154 | already had message + retry; now prints the real reason | `operator-leases.tsx` |
| 155 | 429 collapsed into a generic 502 | `api/operators/wells/route.ts` |

### Open

**Operator Detail (12)** — `130` county sort/filters · `131` wells filters (Status,
Date range, Wellbore profile) · `135` remove range · `139` remove info ·
`140` overflow half (decimals done) · `141` capitalise units · `146` oil unreadable
against gas on one axis · `147` unit convention · `150` values overflow ·
`151` mobile horizontal scroll · `153` **truncated in the sheet** (`map need to be i`,
no snap — report, do not guess) · `156` table height grows across pages

**Compare Performance (9)** — `157`–`165`. `158` (dropdown icon) may already be
covered by the shared `CONTROL_CARET` change from 124; verify before working it.

**Compare Statistics (1)** — `166` Try an Example shows no data.

**Blocked (1)** — `125`, see §7.

### Commits on the branch

```
19f828a  Operator detail: 144 approved date on submitted permits
07a8d67  OPERATORS.md: rewrite as a handover
73367a1  Listing: locked cells carry the claim page's "Free account" affordance
08724a6  Listing: gate the production figures; drop the map legend caption
dca864b  Operator detail: 126 wheel-jacking, 127 comparison periods, 140 decimals
db5eab9  Document the operator pages
cb032d7  Operator detail: defects 133, 134, 143, 145, 154, 155
35fb057  Operator detail: defects 129, 132, 138, 148, 149, 152
1452940  Operator Directory: 123 floor made dynamic, 121 export feedback
7d442f8  Operator Directory: defects 116-124
```

---

## 2. Routes

| Route | File | Rendering |
|---|---|---|
| Operator Directory | `app/operators/page.tsx` | **dynamic** — reads session + visitor cookies |
| Operator profile | `app/operators/[slug]/page.tsx` | **static**, 30 slugs prerendered |
| Compare Operators Performance | `app/features/compare-operator-production/page.tsx` | static |
| Compare Operator Statistics | `app/features/compare-operator-statistics/page.tsx` | static |
| Operator Presentations | `app/features/operator-presentations/page.tsx` | static |

**Keep the profile static.** Reading a cookie in that server component opts all 30
prerendered pages out of static rendering. Every gate on that page therefore lives in
a route handler, which is dynamic already.

---

## 3. Why every call goes through a route handler

The operator API answers a browser `Origin` with no `Access-Control-Allow-Origin`, so
a direct fetch from the client is blocked by CORS. And two things the API needs —
`member_id` and `visitorId` — come from cookies the client cannot read (`mv_user` is
httpOnly).

| Handler | Upstream | Notes |
|---|---|---|
| `/api/operators/search` | `POST /operators/search` | pins `member_id`; masks four fields when signed out |
| `/api/operators/names` | `GET /operators/names` | 4.3 MB; server memo, 20 rows per response |
| `/api/operators/compare` | `POST /operators/compare` | pins `member_id`; **not cached** |
| `/api/operators/production-info` | `POST /compare-operators-production_info` | pins `member_id`; **not cached** |
| `/api/operators/production-series` | `POST /compare-operators-production` | pins `member_id`; **not cached** |
| `/api/operators/wells` | `POST /operators/wells` | pins `member_id`; passes 429 through |
| `/api/operators/recent-wells-permits` | `POST /operators/recent-wells-permits` | gate is ours |
| `/api/operators/[number]/what-changed` | the Python analysis service | gate is ours |
| `/api/operators/[number]/logo` | `GET /operators/<no>/logo` | re-serves bytes same-origin |
| `/api/operators/address-correction` | `POST /operators/address-correction` | attaches `member_id` + `visitorId` |
| `/api/operators/presentations` | `POST /operators/presentations` | |
| `/api/operators/presentations/operators` | same endpoint, walked | |

### The logo route exists for one reason

`operator_logo` is an absolute URL on the API host and that response carries
`cross-origin-resource-policy: same-origin`. An `<img>` pointed straight at it
downloads a valid PNG and is then refused by the browser. When the upstream header is
fixed, `operatorLogoPath()` becomes `record.operator_logo` and the handler is deleted.

---

## 4. The sign-in gate

`member_id` is the API's own access flag; `0` is anonymous. Measured per endpoint:

| Endpoint | At `member_id: 0` | Free either way |
|---|---|---|
| `/operators/search` | with a quick filter on, rows 4–10 come back `"****"` — 3 real, 7 gated, on **every** page, `total_count` unchanged | plain search, county, status, play type, paging |
| `/operators/compare` | the five volume fields **and every year** of `Historical_Production_Trends` | leases, counties, rank, latest production date |
| `compare-operators-production_info` | `total_production_boe/oil/gas`, `avg_oil/gas_production_per_lease` | rank, oil/gas split, county and lease counts, latest production date |
| `/operators/wells` | every field of every row (`*****`) | — |
| `/operators/production-map` | oil and gas; BOE stays real | BOE |
| `/operators/production-graph` | **nothing — takes no `member_id`** | all of it |
| `/operators/production-by-county` | **nothing — takes no `member_id`** | all of it |
| `/operators/leases` | **nothing** | all of it |
| `/operators/related-operators` | **nothing** | all of it |
| `/operators/details` | **nothing** | all of it |
| `/operators/all` | **nothing — takes no `member_id`** | all of it |

### What the Directory withholds, and where

`withoutGatedColumns()` in `app/api/operators/search/route.ts` replaces **four**
fields for a signed-out reader, on the server, before the response is serialised:

```
Total_Production_Oil · Total_Production_Gas · countie_count · leaseCount  →  "****"
```

Oil and gas were open originally; that was reversed on review. **It is a real gate,
not a blur** — verified: an anonymous request returns `Total_Production_Oil: "****"`,
so the figures are not in the network tab, not in the DOM, and not recoverable by
removing a CSS class. A soft gate that a right-click defeats teaches visitors the
locks mean nothing.

Two gates are **ours**, not the API's:

- **What changed** — the most expensive thing the site does, and the one part of a
  profile that is not simply the filed record.
- **Recent wells & permits** — the profile's own CTA has always described filings as
  the account's benefit.

Both skip the upstream call entirely for a signed-out reader, so the gate removes work
rather than adding it.

### Rules

1. **Never trust `member_id` from the client.** Every handler re-asserts it from the
   session. A request sending `member_id: 3448` while signed out is still gated —
   verified.
2. **`locked` travels on the response.** The page never infers the gate from a zero.
   Inferring it is what made a parse bug and a sign-in gate look identical, and the
   page blanked itself for both.
3. **Withheld values must never render as a figure.** `num("****")` is `0`, and `0`
   published as "0.0M bbl" is not a withheld figure but a wrong one — the most
   believable kind. Render a lock, or hide the block.
4. **Responses that depend on the reader are `private, no-store`.** `Vary: Cookie` is
   a trap: every visitor carries a unique `guestUserID`, so it caches per visitor.
5. **When you change what is gated, change the copy in the same commit.** The unlock
   prompt read "everything else is free and stays free" while the volumes were open;
   gating them made that sentence false and the reader could see fuzzed columns while
   being told the ranking was free. A lock notice that misdescribes the lock is worse
   than none.

### The lock affordance

Locked cells use the "Find your record" treatment (`app/claim/_components/ui.tsx`): a
redacted bar plus a lock and a **Free account** link, so the reader sees there IS a
value and what it costs. On the listing the two sit on **one line** rather than
stacked — thirty stacked cells would double every row — and each link carries its own
`aria-label` naming the field, because thirty links reading "Free account" would be
thirty identical stops in a screen reader's link list.

⚠️ **One hole is open.** The directory locks oil, gas, leases and counties, but the
**profile serves all four in plain HTML** to the same signed-out reader. The lock is
one click deep, so it is friction rather than a gate. Closing it means either
unlocking on the directory or gating the profile panel and losing its static
prerender. Not yet decided.

Also unresolved: the directory's `<h1>` lede and meta description still say "Search,
filter, and rank … by reported production", which reads oddly now that the production
figures are gated.

---

## 5. Caching

The two comparison flows have **no caching at any layer**, by requirement: no
`unstable_cache`, no `revalidate`, no `s-maxage`, no `stale-while-revalidate`, no
module-level maps. Every fetch and every response is `no-store`, and the hooks hold
one entry tagged with the key it answers, so a previous response is never read back.

Two lessons that cost real debugging time:

- **`unstable_cache` keys on its key parts and arguments, not on the code inside it.**
  Change what a cached reader *returns* without bumping its version string and entries
  built by the old code keep being served, with no error — and a cache hit makes no
  upstream call at all, so the page looks like it is not calling the API.
- **A cached response that depends on the reader is a leak.** A signed-in member was
  observed being served the cached anonymous copy.

`getOperatorNames()` keeps a per-instance memo and should stay: the 4.3 MB shared
directory used to translate a display name into the filed one, 4–12 seconds to fetch.
It is **not** `unstable_cache` — Next's data cache refuses anything over 2 MB and
silently declined to store it.

---

## 6. Traps that have already bitten

**Numbers arrive as unit-suffixed strings.** `/operators/compare` sends
`"1,907,873.826 (MBBL)"` where it used to send a bare number. `Number()` on that is
`NaN`, which falls through to `0`. Strip a trailing `(UNIT)` before parsing.

**The magnitude did not change on `/operators/compare`** — same thousands figure, so
the existing `× 1000` scaling stands. **It did change on
`compare-operators-production_info`**, which now sends pre-scaled millions
(`"714.982 (MMBBL)"`) where it sent raw barrels. Different fixes; do not copy one to
the other. *(This is why defect 161's values read 0, and it is still open.)*

**Sort fields fail silently.** An unrecognised `sort.propertyName` does not error — it
falls back to the default ordering. Probe against a deliberately bogus field name to
tell a real sort from an ignored one. `countie_count`, `Total_Production_Oil`,
`Total_Production_Gas` are real; `oil_produced_current_quarter` no longer exists.

**`pageSize` is honoured to at least 5000.** A 3,095-row query returns all of them in
one response — which is what makes the CSV export one request rather than 310.

**Nothing may mutate content on scroll.** Defect 126 was `onWheel` calling
`preventDefault()` and rewriting the chart's year range on every tick, so scrolling the
page past the chart silently re-zoomed it. Wheel-jacking a scroll container is a defect
in its own right.

**One derived value must not gate a whole page.** The statistics comparison hid every
block when `findStatisticsLeaders` returned null, which happens whenever any single
leader is missing — so a zero, a parse bug or the sign-in gate blanked the page on a
request that had succeeded. Guard the section, not the page.

---

## 7. Backend dependencies

Four things the frontend cannot fix. None has a workaround short of fabricating data.

| What | Evidence | Needed |
|---|---|---|
| **125 — county filter offers counties with no data** | `/operators/counties` returns 255 bare names, ignores `?status=`, returns the same 255 with it. Blanco/Armstrong/Delta return 0 under `status: active`, 1 under all statuses. `counties-with-data` and `active-counties` both 404 | `?status=` filtering, or counts alongside names |
| **143 — "producing counties" cannot be computed** | `/operators/details` answers `counties` as `{"county":"CHEROKEE"}` — names only, no volume on any entry. Relabelled "Counties on record" as the honest reading | per-county volumes on that endpoint |
| **Presentations library is empty** | `POST /operators/presentations` returns `totalCount: 0, totalPages: 0` for every payload tried, dated ranges included. Previously 190 records over 23 pages. Only host serving the path | records restored |
| **142 — well oil/gas/production dates blank** | the wells endpoint answers `totalOilProduction: "NO RPT"` on 492 of 500 sampled wells, gas on 491, `production_start_date: "00-0000"` on 487. Only 8 carry figures. The parsers were verified against those eight — "133"→133, "6,587"→6587, "10-2011"→"Oct 2011" — and confirmed end to end on lease 259602 | the values themselves |
| **161 — `production_info` volumes parse to 0 even signed in** | the unit-suffix change above, plus a magnitude change | frontend fix, but the scaling decision needs confirming |

---

## 8. Working notes

### Reading the defect sheet

```python
import openpyxl
wb = openpyxl.load_workbook(r"…\Mineral View Site Rebuild Defect sheet .xlsx", data_only=True)
ws = wb["Sheet1"]           # SR No. in column A, DEFECT in E, SNAP in F, DEV COMMENT in I
```

**The screenshots matter and are reachable.** Lightshot links (`prnt.sc/<id>`) resolve
to an image URL in the page HTML:

```bash
curl -s -A "Mozilla/5.0 …" "https://prnt.sc/<id>" | grep -oE 'https://img\.lightshot\.app/[A-Za-z0-9_-]+\.png'
```

Read them. Several defects say something narrower than the written brief — 116's snaps
ring `>5`/`>10`, not just spacing; 118's rings **three** separate bands.

### Testing

**Deferred sections do not mount in a hidden browser pane.** `DeferredSection` uses
IntersectionObserver, which needs the page to be compositing. Stub it, then
soft-navigate away and back to force a remount:

```js
window.IntersectionObserver = class {
  constructor(cb) { this._cb = cb; }
  observe(el) { setTimeout(() => this._cb([{ isIntersecting: true, target: el }], this), 0); }
  unobserve() {} disconnect() {} takeRecords() { return []; }
  root = null; rootMargin = ""; thresholds = [];
};
// then: click a link to /operators, wait, history.back(), wait ~13s
```

**`window.scrollTo` hangs** in a hidden pane. Dispatch the event you actually care
about instead — for 126 that was `new WheelEvent("wheel", { cancelable: true })` and
checking `defaultPrevented`.

**The column store key is `mv_kyo_cols`.** Testing against the wrong key reads an empty
slot, returns the defaults and proves nothing. This produced one false "verified".

**Signing in for a test** is a `mv_user` cookie:
`{"id":3448,"firstName":"T","lastName":"U","email":"t@e.com"}`. Always check both
states — several fixes are only correct in one.

**The address-correction endpoint writes a real record.** Stub the fetch when
verifying the form; the dev queue already holds six test submissions for 665748.

**Capturing a CSV without downloading it:** stub `URL.createObjectURL` to read the
blob and no-op `HTMLAnchorElement.prototype.click`.

### Before every commit

```bash
npx tsc --noEmit
npx eslint app lib
```

Then exercise the affected page in both signed-in and signed-out states.

---

## 9. Funnel 2 gating

The registration ask is one component — `app/_components/cta-band.tsx` — shared with
the map feature guide so the surfaces cannot drift. It is a server component: no
state, no handlers, no client JavaScript.

The primary action is always `/register`, never `/pricing`. Routing free-account
intent into a plan comparison is the defect the whole treatment exists to avoid;
pricing gets one quiet line underneath. `?from=` values are enumerated —
`operators`, `operator-profile`, `compare-statistics` — and `unlock=` belongs to the
claim flow only.

---

## 10. Standing constraints

1. Do not change API URLs, payload shapes or response contracts.
2. Do not hardcode, mask or fabricate API data to make the UI look right. If a defect
   is backend-dependent, report it — §7 is the list.
3. Preserve the signed-in/signed-out gating and the Funnel 2 CTA behaviour.
4. `TEMP_MEMBER_ID` is a development stand-in for a signed-in member and **must not
   reach production**. It still appears in `operator-api-types.ts`,
   `operator-compare-api.ts`, `operator-details-api.ts`, `operator-leases-api.ts`,
   `operator-production-api.ts`, `operator-production-map-api.ts` and
   `operator-slug-api.ts`.
5. No automatic retry loops — a rate limit must not be retried on a timer.
6. Keep the profile route static; keep deferred sections deferred.
7. Verify a fix on the page before calling it done. Several defects in this sheet were
   already fixed, and several "obvious" ones were not what the screenshot showed.
