# API request — a monthly series of the owner's own filed production

**From:** frontend (owner portal, Activities screen)
**Against:** `mineralview-api`, the contract in `OWNER-ALERTS-ACTIVITY-API.md`
**Status:** one chart on Activities cannot be built from the seven endpoints.

---

## The short version

The Activities screen is fully dynamic **except one chart**, "Your own filed
months". It needs **24 months of the owner's NET share of gas and oil**, and no
endpoint in the contract returns that. Everything else on Alerts and Activities
now comes from the API.

We need either a raised cap on an existing field, or one new field. Both options
are below; either one closes it.

---

## What the chart is

The right-hand chart on `/mineralownersite/activities`, titled **"Gas filed to
you, by month"** under the heading "Your own filed months". Two panels, gas and
oil, drawn from one monthly series.

It is the only place on the screen that shows the owner's **own** production
over time. The timeline shows individual filings; the KPI cards show counts;
this chart shows the trend of what was filed to them.

---

## Exactly what it needs

An array of **24 months, oldest first**, each:

```ts
{
  cycle: string;      // "202407"
  label: string;      // "Jul 2024"
  gas_net: number;    // the OWNER'S SHARE for that month, MCF
  oil_net: number;    // the OWNER'S SHARE for that month, BBL
  leases: number;     // how many of the owner's leases filed that month
}
```

Real example of the shape (first and last month of the window):

```json
{ "cycle": "202407", "label": "Jul 2024", "gas_net": 22734.59, "oil_net": 1568.37, "leases": 10 }
{ "cycle": "202606", "label": "Jun 2026", "gas_net": 14476.67, "oil_net": 664.72,  "leases": 9  }
```

### `leases` is not optional, and it is not decoration

`leases` is the count of the owner's leases that filed in that month. The chart
uses it to tell two different facts apart:

- `leases > 0`, `gas_net: 0` → they filed, and produced nothing. Draw a zero.
- `leases === 0` → **nobody filed yet**. Draw a **gap**, not a zero.

A month the state has not filed is not a month without production, and drawing
it as a fall to zero says something false about the owner's wells. Without
`leases` we cannot distinguish the two, so please send it even when it is 0.

---

## Why the existing endpoints cannot do it

Measured against the live API for `owner=Platis Sydney Kay&num=715109&dist=02`:

### `GET /activity/summary` → `production[]`

Has the right measure, not enough of it.

```
rows returned    60          (the contract's own cap, §10)
distinct months  7           202512 .. 202606
has gas_net      YES
```

Seven months of a 24-month chart. The cap is per-row, and rows are
lease×month, so for a 10-lease owner 60 rows only ever reaches ~6 months.

### `GET /activity/production`

Has enough months, but the wrong measure.

```
rows returned    210
distinct months  21          202501 .. 202609
has a net field  NO          lease_gas_production / lease_oil_production are
                             WHOLE-LEASE volumes
floor            202501      (§12) — cannot reach Jul 2024
```

Two problems: the volumes are whole-lease rather than the owner's share, and
the `202501` floor cannot cover a 24-month window ending June 2026.

### We tried to derive it anyway, and found a bug

`GET /owners/search` returns `interestValues` — the owner's decimal interest per
lease. Combined with `/activity/production` that is, in principle, enough:
`net = whole-lease volume x that lease's interest`, summed per month. Two things
we confirmed while testing that:

- `from` is **not** floored at `202501`. `?from=202407` returns 27 months, so a
  24-month window is reachable.
- The arithmetic is exact. Reconstructing all 24 months this way reproduced the
  known figures to within 1 MCF, and the per-month `leases` counts matched
  exactly, 24 of 24.

**But the oil is wrong, and that is a bug on your side.**

```
/activity/production   rows returned                270
                       rows with lease_oil_production > 0     0
                       distinct total_oil_production values   [0]

/activity/summary      production[] rows with oil or oil_net > 0    0
/activity              timeline production rows, OIL stat    "—" on all 120
```

This owner **does** produce oil. Read straight from Mongo by the reference
build on the same day, the same owner shows oil in **every one of the 24
months** — 1,568 BBL net in Jul 2024 down to 665 in Jun 2026 — and their leases
carry `total_oil` in the hundreds of thousands. `boe_net = gas_net/15 + oil_net`
checks out against those figures exactly, so the oil is real, not a stray field.

So every activity endpoint is reporting zero oil for an owner who has it. Had we
shipped the derivation, the chart would have shown correct gas beside a silently
empty oil panel — and the screen's own copy would have told the owner "not one
BBL of oil has ever been filed for your leases", which is false.

That is why we stopped and are asking instead.

### And the identity cannot be pinned safely

`GET /owners/search` returns no `ownerNumber` and no `districtCode` — only
`name`, `county` and `address`. §2 of the contract warns that a name and a
number are both reused across people. So there is no safe way to match a search
result to the owner whose alerts we are already showing, beyond hoping the name
is unique. For the sample owner it happens to return one row; that is luck, not
a guarantee, and a wrong match would attach another person's ownership
percentages to this owner's production.

---

## What we are asking for

**First, a bug fix, independent of everything else:** oil is missing from the
activity endpoints for an owner who has it (evidence above). This matters even
if you do nothing else on this page — the timeline already prints "—" for oil on
120 production rows.

**Then the chart, either option:**

### Option A — a new field on `GET /activity/summary` (preferred)

Add a sibling to the existing `monthly` array:

```ts
interface ActivitySummaryResponse {
  // ...existing fields
  series_months: { cycle: string; label: string;
                   gas_net: number; oil_net: number; leases: number }[];
  // 24 months, oldest first, aligned to window_months
}
```

Preferred because it is one field on an endpoint we already call, it needs no
extra request, and it matches `window_months` which is already 24.

### Option B — raise the cap on `production[]`

Keep the field as-is and let it cover the whole window instead of 60 rows, or
add a `months` parameter. We would then aggregate lease×month into month
ourselves.

Workable, but heavier: for a 10-lease owner over 24 months that is ~240 rows
sent so we can sum them down to 24, and we would have to derive `leases`
per month by counting distinct lease ids, which the server already knows.

### Option C — let us derive it ourselves

If neither A nor B is convenient, we can build it from `/activity/production` +
`/owners/search`, which we have already proven works. For that we need two
things:

1. **the oil bug fixed**, and
2. **`ownerNumber` and `districtCode` added to each `/owners/search` result**,
   so we can match a search row to the owner we are already displaying instead
   of guessing on the name.

This is our least preferred option — it moves a calculation you already do onto
the client, where it can drift from yours — but it is the smallest change on
your side if the other two are hard.

---

## How we will verify it

The chart currently renders a peak of **22,735 MCF** that appears nowhere in any
API response — that single number is what proves it is still reading a committed
fixture. When the field lands we will re-run the same check:

> take every value the page renders, and search for it in the API responses

Current result:

```
Alerts       63 of 63   values found in the API      100%
Activities  203 of 204  values found in the API      one miss: 22,735
```

With Option A or B, that becomes 204 of 204 and both screens are fully dynamic.

---

## Not blocking, but worth fixing while you are in there

`GET /activity`, `/activity/summary` and `/activity/rings` return British
spellings in server-authored copy — 75 occurrences, almost all the word
"neighbour". The rest of the product is American English, so the page currently
reads half-and-half. The frontend's own copy has been corrected already.

Fields carrying them:

| count | endpoint | field |
|---|---|---|
| 10 each | `/activity` | `events[].kind_label`, `events[].body`, `events[].stats[].label`, `events[].ring_stats.{1,3,5}[].label` |
| 4 | `/alerts` | `items[].evidence[]` |
| 2 | `/alerts` | `items[].body` |
| 1 each | `/alerts` | `items[].why`, `items[].stats[].label`, `notes[]` |
| 1 | `/activity` | `kinds[].label` — renders as the "Neighbours" card title |
| 1 | `/activity/summary` | `kpis_nearby[].sub` |
| 3 + 1 | `/activity/rings` | `rings.{1,3,5}.headline`, `rings.note` |
