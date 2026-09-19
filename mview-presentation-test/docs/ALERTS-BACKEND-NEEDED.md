# Alerts & the detail panel — what the frontend now needs from the API

**Repo:** `MView-Presentation-test`, app at `mview-presentation-test/`
**Against:** `mineralview-api`, host `https://mview-dev-api.mineralview.com`
**Reference build:** `mineral-owner-site-2.0`, which reads MongoDB directly and
therefore already has every field below.

The client side is **done**. The Alerts page and the detail panel are at
element-for-element parity with the reference: same sections, same order, same
classes, same controls. Three blocks render empty, and every one of them is
empty because the API does not send a field — not because the UI is missing.

Nothing below is a breaking change. Every field is additive; the page renders
today and simply fills in as each one arrives.

---

## 0 · The one-line summary

| Block | Renders today? | What makes it real |
|---|---|---|
| Scope row (`Everything / My leases / Around me`) | yes, **on a hardcoded rule table** | `scope` on `/dashboard` alert items |
| `silent` rules disclosure | yes, **on a fixed list** | `silent` on `/dashboard` alerts block |
| Ordering (action first, then newest) | yes | `event_iso` on `/dashboard` alert items |
| PERMIT / COMPLETION / STATUS record grid | yes, **values invented** | `filing` on `/activity` timeline events |
| WHERE THIS IS map (per filing) | yes, **on a placed pin** | `lat` / `lon` on `/activity` timeline events |
| County maps on `alert:*` digests | yes, **on placed pins** | `lat` / `lon` on `/activity` timeline events |
| Ring map on `alert:permit-ring` | yes, **on placed pins, count too low** | `nearby.rows` with positions, member path |
| Kind panels (`permits`, `completions`) | yes, **on placed pins** | the same two above |

Everything on the Alerts page now renders. Nothing on it is blocked. What is
left is that four of those blocks are drawn on invented values rather than on
the record — listed field by field below.

---

## 0b · There is placeholder data in the app right now — read this first

`app/mineralownersite/_lib/reference/alerts-ui-placeholder.ts` fills every
field below with invented values, so the UI can be reviewed before this work
lands. **It is temporary and it must come out.**

It is built so that it cannot fight you:

- It fills a field **only where the payload does not already carry one.** The
  day `/activity` starts sending `filing`, the placeholder stops inventing one
  for that row — no code change, no conflict, no double-write.
- When every field below arrives it becomes a complete no-op, and deleting it
  changes the page by zero pixels.
- Removing it early is two lines in `owner-data.ts`: the import and the two
  `uiPlaceholder(...)` wrappers. Or set `UI_PLACEHOLDER_ON = false` in the file
  itself to see the real, emptier page.

### The one field to switch off first

Every other invented value here is a label, a number or a date: wrong in a
demo, and obviously a placeholder the moment the real one lands. **A coordinate
is not.** Drawn on satellite imagery a pin reads as surveyed fact, and no
caption fully undoes that — so a placed pin is the one value in this module
that could mislead somebody about where a well is going.

It therefore has a switch of its own, next to the main one:

```ts
export const UI_PLACEHOLDER_ON = true;   // everything in this module
export const DEMO_POSITIONS   = true;    // just the map pins
```

Set `DEMO_POSITIONS = false` and the rest of the placeholder keeps working.
Every map block simply closes and the panels fall back to the reference's own
unplaced behaviour — an evidence line reading "the state filed this against a
county and recorded no surface location for it … so there is nothing to put on
a map." That is the state to ship in if §2a lands late.

The pins are county centroids, jittered deterministically by the row's id, so
a pad does not stack and a screenshot reproduces between reloads.

Its own header lists exactly which values are *derived* (honest — `event_iso`
from `sort_key`, the filing dates from `when_label`) and which are *invented*
(coordinates, permit and tracking numbers, API numbers, `scope`, the silent
list). Nothing invented should ever reach a customer.

---

## 1 · `GET /api/v1/dashboard?member_id=…` — the alerts block

**This is the one that matters most, because it is the endpoint a signed-in
member actually reads.**

`GET /api/v1/alerts?owner=…` **already ships all three fields** — verified
2026-09-18 against `owner=Platis Sydney Kay` and `owner=Apache Corporation`.
`/dashboard` does not, and the portal's member path never calls `/alerts`.

Measured, `member_id=4785`:

```
GET /api/v1/dashboard?member_id=4785
  alerts.items: 10
  item keys: id,category,severity,klass,icon,title,body,why,lead_lease,lease_id,
             metric,metric_unit,event_label,detected_label,evidence,action_label,
             action_href,link,next_step,stats,spark,spark_label,unread,channels
  has scope:     false
  has event_iso: false
  has silent:    false
```

### What to add — identical to what `/alerts` already returns

```ts
alerts: {
  items: ({
    scope: 'mine' | 'neighbours';   // ADD
    event_iso: string | null;       // ADD
    // …everything else unchanged…
  })[];
  silent: { id: string; label: string; reason: string }[];   // ADD
  // …everything else unchanged…
}
```

### Why the seam cannot work around it

The obvious fix — have the portal read `/alerts` for the member's own owner and
borrow the three fields — was tried and rejected. The two endpoints compute
**different findings for the same owner**:

```
owner "Apache Corporation" (700425)
  /dashboard  → 10 items: filed-202606, completions, permits-filed,
                handover-08_297752, permit-ring, trend-08_291583,
                trend-08_288043, newwell, pricedeck, opnews
  /alerts     →  8 items: filed-202606, trend-08_285483, trend-08_284972,
                pricedeck, completions, permits-filed, ring-quiet, newwell

  ids in common: 5 of 10
```

Backfilling by id would leave five items scoped and five not, so the scope row
would show counts that do not add up to the list underneath it. Better to show
zeros than to show a total that is wrong.

**Ideal:** `/dashboard` serves the same alerts block `/alerts` does.

---

## 2 · `GET /api/v1/activity?owner=…` — the timeline events

This drives the Alerts **log tab** (one row per filing) and every detail panel
opened from it or from Activities.

Measured, `owner=Apache Corporation&num=700425`:

```
GET /api/v1/activity?owner=Apache%20Corporation&num=700425
  timeline.events: 284
  event keys: id,kind,kind_label,title,body,is_mine,scope,distance_mi,ring,
              lease_id,lease_name,county,operator_name,sort_key,cycle,
              when_label,standing,stats,ring_stats,ctx,detail
  has filing: false   has lat: false   has well_number: false   has api: false
```

The reference's `TimelineEvent` carries eight more fields. These are what the
detail panel is built from.

### 2a · The map — `lat` / `lon` and how well the position is known

```ts
lat: number | null;
lon: number | null;
/** 'surveyed' = the well's own filed position;
 *  'abstract' = the centre of other filings in the same land grid */
location_basis: 'surveyed' | 'abstract' | null;
/** for an abstract point: how far apart the anchors were, in miles */
location_spread_mi: number | null;
/** "Abstract #642, BARRIER, A B Survey" */
legal_description: string | null;
/** labels the point; the map draws "?" without it */
well_number: string | null;
/** the API the filing carries, or the one its name resolved to */
api: string | null;
```

**Null is a fine answer** and the panel already handles it — it says "the state
filed this against a county and recorded no surface location for it… that is a
gap in the filing, not in the record here" and draws no map. What it cannot do
is guess a position.

`location_basis` matters: on `'abstract'` the panel reframes the map to the
whole survey grid and captions it "Roughly where this is", so a reader is never
shown a pad the record cannot actually locate.

### 2b · The record grid — `filing`

Null on a row that is not a filing. This is the whole "PERMIT RECORD" /
"COMPLETION RECORD" block.

```ts
filing: {
  of: 'permit' | 'completion' | 'status' | 'well';

  // permit only
  permit_no: string | null;
  permit_suffix: string | null;
  permit_action: string | null;
  total_depth: number | null;

  // completion only
  tracking_no: string | null;
  completion_type: string | null;
  completion_action: string | null;
  well_type: string | null;

  // status change only
  prev_well_status: string | null;
  new_well_status: string | null;
  prev_operator_name: string | null;
  new_operator_name: string | null;
  prev_completion_label: string | null;
  new_completion_label: string | null;
  changed: { status: boolean; operator: boolean; lease: boolean } | null;

  // shared
  status: string | null;              // Approved | PendingApproval | Withdrawn | Submitted
  submit_label: string | null;
  approved_label: string | null;
  completion_label: string | null;
  date_basis: 'completion' | 'approved' | 'submitted' | 'published' | null;
  purpose: string | null;
  profile: string | null;             // "Horizontal"
  field_name: string | null;
  api_source: 'filed' | 'resolved' | null;
  seen_label: string | null;
} | null;
```

`date_basis` is also read by the log rows themselves: it is what lets a row say
"approved Sep 16, 2026" rather than a bare date, and a completion "completed …"
rather than "filed …".

---

## 3 · `nearby.rows` on the member path

The ring maps — the `alert:*` panels that draw "every permit within 3 miles" —
select over `payload.nearby.rows`. On the member path the portal currently
serves an explicitly empty block (`NO_NEARBY` in `_lib/reference/owner-data.ts`),
because no endpoint supplies it for a `member_id`.

Two things needed:

1. **A source for `nearby.rows` on the member path** — the same shape
   `/activity/rings` already returns for an owner-keyed read.
2. **`lat` and `lon` on each row.** The rows carry `dx_mi` / `dy_mi`, which are
   offsets from the centre of the owner's *whole* record. That is the right
   origin for the portfolio rings and the wrong one for a panel about one
   filing, which may be forty miles away in the same county. The reference's
   `NearbyRow` carries the surface hole itself:

```ts
lat: number;   // ADD
lon: number;   // ADD
```

Also worth knowing: the frontend has narrowed `nearby.rows[].kind` to
`'permit' | 'completion' | 'wellbore'`, matching the reference's `NearbyKind`.
If the API can return anything else there, say so and we will widen it back.

**The visible symptom while this is outstanding.** The placeholder builds
`nearby.rows` from the timeline's own filings, capped at 120, so the ring map
on `alert:permit-ring` draws and captions ~115 permits while the card above it
counts 1,063. The map and its caption agree with each other — they are both the
rows that were drawn — but neither is the set the alert counted. The count comes
right on its own the day this block is real; nothing in the UI changes.

---

## 4 · Two small notes, no action needed

**`scope` keeps the British `u`.** `'neighbours'` is a wire identifier and the
frontend filters on that exact string. Every *rendered* string stays en-US.

**`event_iso` must stay null where there is no date.** The data-gap row, the
new-well model and the quiet-rings row have no date of their own, and null is
what sorts them last. Coalescing them to today would float three undated
findings to the top of an inbox read newest-first.

---

## 4b · Every invented value, in one list

The exact fields to replace, in the order they matter. Each is invented in
`alerts-ui-placeholder.ts` today and each stops being invented the moment the
payload carries it — the module fills only what is absent.

| # | Field | Where it shows | Invented as | Source asked for |
|---|---|---|---|---|
| 1 | `alerts.items[].scope` | the `My leases / Around me` counts | a per-rule table copied from the reference's `alerts.ts` | §1 |
| 2 | `alerts.items[].event_iso` | alert ordering | `null` | §1 |
| 3 | `alerts.silent[]` | the "what a quiet week looks like" disclosure | a fixed list of six rules | §1 |
| 4 | `timeline.events[].lat` / `.lon` | **every map on the page** | county centroid, jittered by row id | §2a |
| 5 | `timeline.events[].location_basis` | the map heading and caption | `'surveyed'` | §2a |
| 6 | `timeline.events[].api` | the record grid, the map label | a well number in the state's format, from the id | §2b |
| 7 | `filing.permit_no` / `.tracking_no` | the record grid | a stable number from the id | §2b |
| 8 | `filing.purpose` / `.permit_action` | the record grid | one draw, used for both, so they agree | §2b |
| 9 | `filing.submit_label` | the record grid | 3–28 days before the approval date | §2b |
| 10 | `filing.status` | the record grid | `'Approved'` on permits | §2b |
| 11 | `filing.total_depth` | the record grid | 9,000–17,000 ft | §2b |
| 12 | `filing.profile` | the record grid | `HORIZONTAL`, one in four `VERTICAL` | §2b |
| 13 | `filing.prev_well_status` / `.new_well_status` | the status-change grid | a forward-reading pair | §2b |
| 14 | `filing.field_name` | the record grid | **derived** — lifted off the row's own stats | — |
| 15 | `legal_description` | the record grid's "Filed against" | `Abstract #NNN, <COUNTY> Survey` | §2b |
| 16 | `nearby.rows[].lat` / `.lon` | the ring and kind-panel maps | county centroid, as #4 | §3 |

Rows 1–3 and 14 are safe to demo — a wrong count corrects itself and nobody
acts on it. Rows 4, 5 and 16 are the ones behind `DEMO_POSITIONS`. Rows 6–13
and 15 are wrong-but-harmless paperwork: they read as a filing and are not one,
so they should not reach a customer either.

**Two known symptoms while this stands.** The ring map on `alert:permit-ring`
captions ~115 filings while the card above it counts 1,063 — the rows are the
capture's, not the ring join's, so the map and its caption agree with each
other but neither is the set the alert counted. And every permit shows an
approval gap of a few days, which is invented; the real gaps are the part of
that grid worth reading.

---

## 5 · How to check it

```bash
# the member path — the one that matters
curl "https://mview-dev-api.mineralview.com/api/v1/dashboard?member_id=4785" \
  | jq '{scope: [.alerts.items[].scope] | unique,
         iso:   [.alerts.items[].event_iso] | length,
         silent: (.alerts.silent | length)}'

# the timeline events behind every detail panel
curl "https://mview-dev-api.mineralview.com/api/v1/activity?owner=Apache%20Corporation&num=700425" \
  | jq '{n: (.timeline.events | length),
         withFiling: [.timeline.events[] | select(.filing != null)] | length,
         withLatLon: [.timeline.events[] | select(.lat != null)] | length}'
```

Expected once shipped: `scope` is `["mine","neighbours"]`, `silent` is
non-empty, and `withFiling` / `withLatLon` are close to the permit and
completion counts (production months and operator changes legitimately carry
neither).
