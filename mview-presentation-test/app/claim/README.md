# Find Your Record (`/claim`)

The public record finder: search every Texas county appraisal mineral roll by
name, lease or county, then claim the owner records that are yours. Searching
needs no account; a free account unlocks mailing addresses and appraised
values, and filing a claim requires a signed-in member.

Reached from the header's **✚ Find your record** CTA.

---

## 1. Architecture

The page is **pure UI**. It holds no search logic and no data — every fetch
goes through one module, and the backend does all searching and scoring.

```
app/claim/
  page.tsx                     server component: reads the session, renders the finder
  _components/
    claim-finder.tsx           all page state + the two-panel layout
    lease-panel.tsx            left panel — leases in the result set
    owner-table.tsx            right panel — owner records (table / mobile cards)
    record-modal.tsx           "Is this you?" popup + address correction
    lease-details-modal.tsx    per-lease table for the ticked records
    lease-drawer.tsx           single lease report
    claim-card.tsx             merge-ask, ready-to-claim, claim result
    ui.tsx                     shared classes, icons, skeletons, locked values
  _lib/
    working-set.ts             CLIENT-side view algebra (pure, no network)

app/api/claim/[endpoint]/
  route.ts                     signed-out proxy: redacts the gated fields,
                               applies the Address filter before it does

lib/claim-search/
  api.ts                       the ONLY data access — typed fetchers
  types.ts                     API + view shapes (the contract)
  scoring.ts                   fuzzy helpers still used for client-side filtering
```

**Rule of thumb:** anything that needs data lives in `api.ts`; anything that
rearranges data already on screen lives in `working-set.ts`.

---

## 2. API

Host comes from `NEXT_PUBLIC_CLAIM_API_BASE_URL`
(default `https://mview-dev-api.mineralview.com`); the `/api/v1/owners` prefix
belongs to `api.ts`, so pointing at another environment is a host swap only.
The endpoints send CORS, so the browser calls them directly.

**Signed-out visitors read the two list endpoints through `/api/claim/*`**, a
same-origin route handler that deletes `address`, `appraisedValue` and
`leaseValues` before the response leaves the server (`app/api/claim/[endpoint]`).
Members call the backend directly — they are entitled to those fields, and the
direct call saves a hop on a request that can take the better part of a minute.
The Address filter is applied inside that proxy for signed-out visitors, since
their results no longer carry an address to filter on in the browser.

| Endpoint | Used for |
|---|---|
| `GET /owners/counties` | Hero stats + county dropdown |
| `GET /owners/search?name&lease[&county]` | The search. **Statewide = omit `county`** — the API 404s on a literal `*` |
| `GET /owners/lease-owners?county&lease` | Every owner on a ticked lease (`lease` is the despaced **base** name — see below) |
| `GET /owners/same-name?county&name&address` | Same-name records at other addresses, for the popup |
| `POST /owners/claim` | File a claim — `{member_id, mineralOwners:[{ownername}]}` |
| `POST /owners/address-correction` | Wrong mailing address — `{owner, county, oldAddress, newAddress, member_id｜visitorId}` |

### Owner payload

Each owner carries **index-aligned per-lease arrays**. Row *i* of `leases`
matches row *i* of every other array — this is what the Lease Details table
binds to:

```jsonc
{
  "name": "De IV Operating LLC",
  "county": "Andrews",
  "leaseCount": 5,
  "appraisedValue": 18689264,
  "leases":         ["MABEE RANCH14", "..."],
  "leaseNumbers":   ["39000", "..."],
  "operators":      ["DE IV Operating, LLC", "..."],
  "interestValues": [0.754464, "..."],   // decimal, NOT a percentage
  "leaseValues":    [52568, "..."],
  "address": "...", "workingInterest": true, "score": 1
}
```

> These arrays must be carried through **every** path that puts a record into
> the working set. Dropping them (as `fetchSameName` once did) makes Lease
> Details show "—" for lease number, operator and interest, the wrong interest
> type, and the whole-portfolio total instead of the per-lease value.

### Identity rules

- **Address correction** — exactly one identity: `member_id` when signed in,
  otherwise `visitorId` (the site's `guestUserID` cookie, shared with the news
  endpoints).
- **Claim** — `member_id` only; the endpoint rejects a visitor id (400), so
  anonymous visitors are shown the sign-up card instead.
- The session cookie is `httpOnly`, so the member id is passed from
  `page.tsx` as a prop — page JavaScript cannot read it.

---

## 3. Search

**No search button.** Results follow the filters:

- Typing debounces **450ms**; a name or lease needs **2+ characters**.
- Picking a county searches immediately.
- **Enter** commits at once and cancels the pending debounce (one request).
- Clearing every filter returns the page to its intro state.
- A sequence guard means a slow response can never overwrite a newer one.
- Results cap at 500; the tally shows `500+` when capped.

Four filters: **County**, **Address**, **Lease Name**, **Owner Name**, each
with a clear button and each removable on its own from the chip row under the
fields. **Clear filters** clears the refine boxes, the county chip and every
tick too.

- **Address is a filter, not a search.** `/owners/search` has no address
  parameter, so an address alone cannot query anything — the field says so and
  waits for a county, owner or lease. Alongside one of those it narrows the
  results: in the browser for a member, in the proxy for a signed-out visitor.
  It no longer overwrites the owner refine box, which is what used to make a
  refine silently vanish whenever any filter was touched.
- **Punctuation is not a query.** A name or lease with no letter or digit in
  it never reaches the backend — `.` came back with every record in scope.
- **A multi-word lease query must actually match.** The backend ranks loosely
  enough that `MABEE 240A` returned the same set as `MABEE`; owners holding no
  lease that contains every typed word are dropped, and what remains is
  ordered by how well it matches. If that rejects everything the loose
  ranking is kept — an empty page would be a worse answer than a broad one.

### Ticks survive a re-search

Removing one filter re-runs the search, and the ticks a visitor has built up
are kept wherever the record is still in the results. Wiping them meant the
records someone had picked out vanished while their rows stayed on screen.

### Loading

Skeletons shaped like the real content (ghost lease cards / table rows), a
"Searching the rolls…" chip in the filter card, and a row-level spinner while
the same-name lookup runs. `role="status"` throughout. The dev API can take
**10–15s**, so these matter.

### Before the first search

Six feature cards (3 per row) stand in for the empty panels — record count and
county coverage from the live API, how forgiving the search is, how the panels
link, the same-name merge, lease reports, and what a free account unlocks.

---

## 4. The two panels (one working set)

Both panels render from a single derived set, so a filter on either side moves
both.

- **Universe** = the search results, **unless** leases are ticked — then it is
  exactly those leases' full membership from the API.
- **Working set** = universe minus the county chip, the owner refine, the
  lease refine, and the name query.

Locked behaviours (ported from the v90 prototype, do not "simplify"):

1. **Membership is exact** — an owner belongs to a lease by despaced name
   within the county. Fuzzy scoring only ever *ranks*, never links.
   *The name is the BASE name.* County rolls split one lease across an account
   per tract and export them as `SHAFTER LAKE /SAN ANDRES/ UNIT (1 of 18)` …
   `(18 of 18)`. The marker is presentation, not identity, and the backend
   agrees: `lease-owners` answers `SHAFTERLAKESANANDRESUNIT` with all 508
   owners and `SHAFTERLAKESANANDRESUNIT1OF11` with **zero**. Keying on the raw
   name listed one lease eighteen times AND made ticking any of them fetch an
   empty membership — which is why both panels used to answer a tick with
   "nothing found". `lkey` strips the marker; `baseLeaseName` is the rule.
2. **The name query persists after ticking a lease** (the v102 fix) — it keeps
   filtering that lease's membership.
3. **A ticked owner is never hidden** by that filter, or a second record could
   never be ticked for a multi-record claim.

**Left — Leases**: each lease with its owner count and appraised total,
aggregated over the working set. **The total is the sum of the API's PER-LEASE
values**, not the record total counted once per lease — the latter put a
five-lease owner's whole portfolio against each of their five leases, which is
why the panel and the lease-details modal disagreed. Where the roll carries no
per-lease figure for someone the row shows `$X+` and says so. Click the name for its report drawer; tick it
to keep only its owners. Has its own refine box and a county chip.

**Right — Owner records**: name, county, mailing address, property count,
appraised value, Claim. Tick a row (or the checkbox) to open the popup.

---

## 5. Claim flow

1. **Claim** on a row, or tick several rows and use **Claim N Records
   Together** in the sticky bar.
2. **Merge-ask** — if the same name exists at other addresses, they are offered
   pre-checked ("are these all you?"); merging sums properties and values and
   keeps every address.
3. **Signed in** → `POST /owners/claim` with the distinct owner names.
   - All succeeded → redirect to `/portal`.
   - Any rejected → stays put and lists what did and did not land
     (`OWNER_ALREADY_CLAIMED` is rendered in plain English). Silently
     redirecting past a failure would hide something the visitor must read.
   - Request failed → "We couldn't file that claim… nothing was saved."
   - A second click is guarded while the call is in flight.
4. **Anonymous** → the ready-to-claim card with **Create your free account**.
   The payload is stashed in `sessionStorage` as `mvClaimedOwner`.

`MergedTx` carries `owners[]` (every distinct name) and `records`, so a
multi-record claim names them all rather than just the first.

> ⚠️ **Gap:** nothing attaches an anonymous claim after registration. Until
> the register flow accepts the stashed claim (or a `/claim/attach` exists), a
> signed-out visitor's claim is lost at sign-up — the page's main funnel.

### "Is this you?" popup

Opened by ticking an owner. Shows the picked record (locked, pre-checked) and
every same-name record at a different address, each tickable. Any address can
be corrected inline — corrections persist in `localStorage`
(`mvAddrCorrections`), post to the API, and show an "updated" chip. Closing
via ×, Cancel, Escape or the backdrop all mean **cancel**.

### Lease Details

One row per lease per ticked record: **Owner Name, Lease Name (+ `#number`),
County, Current Operator, Interest Type, Interest Value, Appraised Value.**
Interest type comes from `workingInterest`; everything else from the aligned
arrays. Only a genuinely blank field shows "—".

### Lease report drawer

Opened by clicking a lease name: owner count and appraised total **for the
current result set** (not the lease's true totals), plus the county. Wells,
production and operators arrive with the full Lease Report in the portal.

---

## 6. Free-account gating

For signed-out visitors, **mailing address** and **appraised value** render as
a redacted bar over a 🔒 **Free account** link to `/register?from=claim` — in
the owner table, the mobile cards, the lease list, the drawer and the details
modal. Signed-in users see the real values.

The visitor can see a value *exists* and what it costs to read it; screen
readers get "Create a free account to see the mailing address".

The confirm popup still shows addresses: it is how someone identifies their own
record, and gating it would break claiming for signed-out visitors, which is
the page's whole promise.

> **The gate is enforced for this page's own traffic.** A signed-out visitor's
> search and lease-owner responses come through `/api/claim/*`, which deletes
> `address`, `appraisedValue` and `leaseValues` server-side — devtools show a
> payload that genuinely does not contain them. The Address filter still works
> because the proxy applies it before the delete.
>
> ⚠️ **It is not a boundary on the data itself.** `/api/v1/owners/*` is public
> and CORS-open, so the same fields are one `curl` away from anyone who knows
> the URL. Closing that needs the backend to withhold them without a session;
> this only makes sure the page is not the thing handing them out.

---

## 7. Responsive

Breakpoints: **767px** (phone/tablet split), 900px (panel stack), 640/560px
(field and button stacking).

Below 768px:

- Owner table becomes **cards** — a 6-column, 640px-wide grid needed sideways
  scrolling on a phone.
- **Tabs** switch between `Owners (n)` and `Leases (n)`; stacked, the lease
  panel buried the owner records ~1100px down. The tabs run to **1024px**, not
  768: the grid collapses to one column at 900px, so tablets used to get the
  stacked layout the tabs exist to avoid.
- Filter fields are **16px**. Below that, Safari on iOS zooms the viewport in
  on focus and does not zoom back out. (Not a `user-scalable=no` viewport —
  that takes pinch-zoom from everyone.)
- The filter card is **static** (not sticky — it is ~400px of an 812px screen)
  and **collapses after a search** into a sticky one-line summary with **Edit**;
  reopening gives a **Done** button.
- Lists load **20 at a time** with "Show more" (uncapped, 56 results made an
  11,800px page). Desktop is unaffected — its rows are hidden by a phone-only
  class, not dropped.
- Modals go full-screen; the claim bar's buttons stack full-width.
- After a committed search the page **scrolls to the results** — suppressed
  while a filter field still has focus, so live search never yanks the page
  away mid-word.

---

## 8. Conventions

Everything uses the site's `mv-` tokens: `rounded-mv` + `shadow-mv` cards,
`mv-table-head` dark table bands, `contact-form`-style fields, `mv-tint`
selection, `mv-green-deep` primary. No page-local palette.

Client-side storage:

| Key | Store | Why |
|---|---|---|
| `mvAddrCorrections` | localStorage | Your own corrections survive a refresh (the POST is the source of truth) |
| `mvClaimedOwner` | sessionStorage | Hands the claimed record to the sign-up / portal flow |
| `guestUserID` | cookie | Anonymous identity for address corrections, shared site-wide |

---

## 9. Known gaps

| Gap | Impact |
|---|---|
| No anonymous-claim attach on register | Signed-out claims lost at sign-up |
| No `GET /owners/claims` | Cannot show "already claimed" or list them |
| No change-of-address endpoint | The "Free perk" form is UI only |
| No stable record id | Records keyed by `county｜name｜address`; a corrected address changes the key |
| `/owners/*` is public and CORS-open | The proxy keeps the gated fields out of THIS page's responses, but the same data is one `curl` away. Only the backend withholding them without a session closes it |
| No typo tolerance on the backend | `Cochrn` returns nothing while `Cochran` works — the fuzzy scorer only ranks what the backend already sent |
| `leaseCount` counts roll rows | It disagreed with the lease list beside it and changed when the same owner came back from a different endpoint, so the page derives the count from the lease list (`propCount`) |
| Search ~10–15s on dev | Skeletons cover it; occasional timeouts |
