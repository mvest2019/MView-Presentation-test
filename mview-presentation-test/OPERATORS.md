# The operator pages

Five routes built on the Mineral View operator API (`/api/v1/operators/*`), plus the
twelve same-origin route handlers that stand in front of it.

Everything below was verified against the dev host (`mview-dev-api.mineralview.com`)
rather than inferred from the code. Where a number is quoted it was measured; where
the API cannot answer something, that is said plainly instead of worked around.

---

## Routes

| Route | File | Rendering |
|---|---|---|
| Operator Directory | `app/operators/page.tsx` | **dynamic** — reads the session and visitor cookies |
| Operator profile | `app/operators/[slug]/page.tsx` | **static**, 30 slugs prerendered by `generateStaticParams` |
| Compare Operators Performance | `app/features/compare-operator-production/page.tsx` | static |
| Compare Operator Statistics | `app/features/compare-operator-statistics/page.tsx` | static |
| Operator Presentations | `app/features/operator-presentations/page.tsx` | static |

**Keep the profile static.** Reading a cookie in that server component opts all 30
prerendered pages out of static rendering. Every gate on that page therefore lives in
a route handler, which is dynamic already.

---

## Why every call goes through a route handler

The operator API answers a browser `Origin` with no `Access-Control-Allow-Origin`
header, so a direct fetch from the client is blocked by CORS. On top of that, two
things the API needs — `member_id` and `visitorId` — come from cookies the client
deliberately cannot read (`mv_user` is httpOnly).

So the browser talks to this origin and this origin talks to the API.

| Handler | Upstream | Notes |
|---|---|---|
| `/api/operators/search` | `POST /operators/search` | pins `member_id` from the session |
| `/api/operators/names` | `GET /operators/names` | 4.3 MB; server-side memo, 20 rows per response |
| `/api/operators/compare` | `POST /operators/compare` | pins `member_id`; **not cached** |
| `/api/operators/production-info` | `POST /compare-operators-production_info` | pins `member_id`; **not cached** |
| `/api/operators/production-series` | `POST /compare-operators-production` | pins `member_id`; **not cached** |
| `/api/operators/wells` | `POST /operators/wells` | pins `member_id`; passes 429 through |
| `/api/operators/recent-wells-permits` | `POST /operators/recent-wells-permits` | gate is ours — see below |
| `/api/operators/[number]/what-changed` | the Python analysis service | gate is ours |
| `/api/operators/[number]/logo` | `GET /operators/<no>/logo` | re-serves the bytes same-origin |
| `/api/operators/address-correction` | `POST /operators/address-correction` | attaches `member_id` + `visitorId` |
| `/api/operators/presentations` | `POST /operators/presentations` | |
| `/api/operators/presentations/operators` | same endpoint, walked | |

### The logo route exists for one reason

`operator_logo` is an absolute URL on the API host and that response carries
`cross-origin-resource-policy: same-origin`. An `<img>` pointed straight at it
downloads a valid PNG and is then refused by the browser. `operatorLogoPath()` points
at our handler, which re-serves the same bytes. When the upstream header is fixed,
that function becomes `record.operator_logo` and the handler is deleted.

---

## The sign-in gate

`member_id` is the API's own access flag. `0` is anonymous. What it withholds was
measured per endpoint:

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
| `/operators/related-operators` | **nothing — `member_id` changes it not at all** | all of it |
| `/operators/all` | **nothing — takes no `member_id`** | all of it |

Two gates are **ours**, not the API's, and each has a reason on the page:

- **What changed** — the most expensive thing the site does, and the one part of a
  profile that is not simply the filed record.
- **Recent wells & permits** — the profile's own CTA has always described filings as
  the account's benefit. Giving them away above that ask is the page arguing with
  itself.

Both skip the upstream call entirely for a signed-out reader, so the gate removes work
rather than adding it, and no withheld payload sits in the network tab contradicting
the lock on screen.

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
   a trap here: every visitor carries a unique `guestUserID`, so it caches one entry
   per visitor.

`TEMP_MEMBER_ID` still appears in `operator-api-types.ts`, `operator-compare-api.ts`,
`operator-details-api.ts`, `operator-leases-api.ts`, `operator-production-api.ts`,
`operator-production-map-api.ts` and `operator-slug-api.ts`. It is a development
stand-in for a signed-in member and **must not reach production as-is**.

---

## Caching

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

`getOperatorNames()` keeps a per-instance memo and should stay. It is the 4.3 MB
shared directory used to translate a display name into the filed one the API matches
on; it takes 4–12 seconds, and re-reading it per request would cost far more than the
read it serves. It is **not** cached with `unstable_cache` — Next's data cache refuses
anything over 2 MB and silently declined to store it.

---

## Field shapes that bite

**Numbers arrive as unit-suffixed strings.** `/operators/compare` sends
`"1,907,873.826 (MBBL)"` where it used to send a bare number. `Number()` on that is
`NaN`, which falls through to `0`. Any parser here must strip a trailing `(UNIT)`
before parsing.

**The magnitude did not change on `/operators/compare`** — `1,907,873.826 (MBBL)` is
the same thousands figure the bare number was, so the existing `× 1000` scaling
stands. **It did change on `compare-operators-production_info`**, which now sends
pre-scaled millions (`"714.982 (MMBBL)"`) where it used to send raw barrels. The two
need different fixes; do not copy one to the other.

**Sort fields fail silently.** An unrecognised `sort.propertyName` does not error — it
falls back to the default ordering. Probe against a deliberately bogus field name to
tell a real sort from an ignored one. `countie_count`, `Total_Production_Oil` and
`Total_Production_Gas` are real; `oil_produced_current_quarter` no longer exists.

**`pageSize` is honoured up to at least 5000.** A 3,095-row query returns all of them
in one response, which is what makes the CSV export one request rather than 310.

---

## Known backend dependencies

Four things the frontend cannot fix. None has a workaround that would not amount to
fabricating data.

| What | Evidence | Needed |
|---|---|---|
| **County filter offers counties with no data** | `/operators/counties` returns 255 bare names, ignores `?status=`, and returns the same 255 with it. Blanco/Armstrong/Delta return 0 under `status: active` and 1 under all statuses | `?status=` filtering, or counts alongside names |
| **"Producing counties" cannot be computed** | `/operators/details` answers `counties` as `{"county":"CHEROKEE"}` — names only, no volume on any entry. The figure is `counties.length`, producing or not | per-county volumes on that endpoint |
| **Presentations library is empty** | `POST /operators/presentations` returns `totalCount: 0, totalPages: 0` for every payload tried, including dated ranges. Previously 190 records over 23 pages. Only host serving the path | records restored |
| **`production_info` volumes parse to 0 even signed in** | the unit-suffix change above, with a magnitude change on top | frontend fix, but needs the scaling decision confirmed |

---

## Testing notes

**Deferred sections do not mount in a hidden browser pane.** `DeferredSection` uses
IntersectionObserver, which needs the page to be compositing. Stub it and soft-navigate
away and back to force a remount:

```js
window.IntersectionObserver = class {
  constructor(cb) { this._cb = cb; }
  observe(el) { setTimeout(() => this._cb([{ isIntersecting: true, target: el }], this), 0); }
  unobserve() {} disconnect() {} takeRecords() { return []; }
  root = null; rootMargin = ""; thresholds = [];
};
```

**The column store key is `mv_kyo_cols`.** Testing against the wrong key reads an empty
slot, returns the defaults and proves nothing.

**Signing in for a test** is a `mv_user` cookie:
`{"id":3448,"firstName":"T","lastName":"U","email":"t@e.com"}`.

**The address-correction endpoint writes a real record.** Stub the fetch when verifying
the form; the dev queue already holds six test submissions for operator 665748.

---

## Funnel 2 gating on the page

The registration ask is one component — `app/_components/cta-band.tsx` — shared with
the map feature guide so the surfaces cannot drift apart. It is a server component:
no state, no handlers, no client JavaScript.

The primary action is always `/register`, never `/pricing`. Routing free-account
intent into a plan comparison is the defect the whole treatment exists to avoid;
pricing gets one quiet line underneath. `?from=` values are enumerated —
`operators`, `operator-profile`, `compare-statistics` — and `unlock=` belongs to the
claim flow only.

⚠️ **One hole is open.** The directory locks Counties and Leases, but the profile
serves `No. of leases` and `Producing counties` in plain HTML to a signed-out reader.
The lock is one click deep, so it is friction rather than a gate. Closing it means
either unlocking those two columns on the directory, or gating the profile panel and
losing its static prerender.
