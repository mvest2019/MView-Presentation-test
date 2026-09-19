# Invite Co-Owners — defect sheet triage and fixes

Source: `Mineral View Site Rebuild Defect sheet - Invite co-owners (1).csv`, 28 rows.
Branch: `Dev-10-08-26`. Round 2, 2026-09-19.

## Where round 2 stands

| | Rows |
|---|---|
| **Reopened by QA, now fixed** | 9, 14, 17 |
| **Reopened, content handoff — not a code fix** | 19, 20 |
| **New, front-end, fixed** | 24, 25, 26, 27, 28 |
| **Closed in round 1 and still passing** | 1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 18, 21, 22, 23 |
| **Backend — not fixable in the front end** | 7, 15, 16 |

One new row (the last, unnumbered) has a screenshot and no defect text — see
[Unlabelled rows](#unlabelled-rows).

---

## Reopened

### 9 + 24 · the empty list still drew a table

QA's reopen shot and the new row 24 are the same complaint from two angles:
*"No need to show table format and show msg in center."*

Round 1 fixed the **wording** of the empty row (it no longer says "Nothing
matches that" to a reader who has not searched) but left it inside the table —
a live column header over a single left-aligned cell, which reads as a table
that has lost its rows. On arrival, before a lease is even picked, that was the
first thing on the card.

The table is now **replaced** by a centred panel (`.iv-blank`) in all four empty
states: waiting on step 1, reading the roll, a search that matched nothing, and
a lease with no individual owners. The foot of the card follows it — the row
count and the sort note only appear when there is a list to describe, while the
"Also show 6 companies, trusts, and the operator" toggle stays, because that is
the way out of an empty list.

A `min-height: 120px` keeps the card from collapsing when a search stops
matching and throwing step 3 up the page.

`_components/people-step.tsx`, `invite.css` (`.iv-blank`).

### 14 · Customize Invitation still opened a different letter

Round 1 seeded the editor from the displayed letter. That closed half of it. The
other half is what QA's shot shows: the editor opened as a **second block below
the preview**, so there were two letters on screen and the reader was still not
editing the one they had been reading.

The editor now takes the letter's own place — inside the same framed card, under
the same To and Subject rows. One letter, either being read or being written.
The token buttons sit under it behind a hairline, still inside the card.

Also fixed in the same pass: **`{lease}` was not being reversed.** `templateFrom`
walked back the code, the claim link and the recipient but not the lease name, so
the template opened with the lease written into it in longhand — edit it and
every recipient on every other lease would have been told they own a share of
that one. The lease name comes off the service's own `heading`
(`JOE HINDES 'D' UNIT · Lease 16743 · ATASCOSA County`).

`_components/email-step.tsx`, `_api/invite-api.ts` (`templateFrom`),
`invite.css` (`.iv-edit`).

### 17 · the page still resized between modes — wrong number

The round-1 pin was real and worked; it was set to **the wrong width**.

`dashboard-reference.css` carries two sets of `.app-body` widths. The one at
lines 293/487/495 (1180 / 1340 / 920) is overridden by the authoritative set at
line 1179:

```
Detailed   1360px   .mv-ref-app .app-body
Essentials 1120px   body .mv-ref-app.view-simple .app-body
Ultra       860px   body .mv-ref-app.view-ultra  .app-body
Pro        1440px   body .mv-ref-app.view-pro    .app-body
```

Round 1 read the first set, pinned Essentials/Pro/Ultra to 1180 and left
Detailed alone — which is 1360. So the page still changed size, just with a
different set of widths.

All four are now pinned to **1360px**, the Detailed measure and the one the page
already wore, with the bare selector written out alongside the three tier ones.
Measured on a cascade harness at a 1500px viewport:

```
detailed     max-width=1360px
view-simple  max-width=1360px
view-pro     max-width=1360px
view-ultra   max-width=1360px
```

`invite.css` §1.

### 19 + 20 · content, not code

Row 20's own defect (a custom greeting surviving a lease change) is fixed and
QA's screenshot shows the reset working. The comment attached to it — *"take
content form shubham"*, with the rail's step 5 circled — is about the wording of
"What happens next", which is row 19. Row 19's QA status is blank.

Round 1 rewrote steps 5–8 to describe the flow that is actually built (there is
no "confirm a matching detail such as your town" step; `InviteRedeem` files the
claim itself). **That copy still needs Shubham's wording.** It is a content
handoff, not a defect I can close — the text lives in one array:

`_lib/invite-flow.ts`, `FLOW[4..7]`.

---

## New

### 25 · clipped header, ragged numbers

Two separate things in one row.

**The header.** The share column is cut for eight tabular characters and its
heading is `white-space: nowrap`, so "DECIMAL INTEREST" was clipped mid-word —
"DECIMAL INT". The column is now 90px (104px on a wide card, up from 78/96,
which were cut for `2.5109%`) and the heading is **"Interest"**, with
`title="Decimal interest, as the appraisal roll files it"` carrying the full
term.

**The numbers.** `formatShare` was trimming trailing zeroes, so `0.750000`
printed as `0.75` and sat four characters short of `0.010838` in the row above —
right-aligned, but with the decimal points out of line. It is `toFixed(6)` now,
so every row is the same width and the column reads as one.

`_components/people-step.tsx`, `invite.css` (`.iv-tbl th:nth-child(3)`).

### 26 · "0 of 6 leases match" over a lease

The chosen lease is pinned to the top of the picker whenever the current list
has lost it. That is right while browsing — the selection may sit past the pages
loaded so far — and wrong under a search: typing a name that matched nothing
produced a panel saying "0 of 6 leases match" above a row holding a lease.

While a search is running the list is **exactly** the matches, and an empty one
says "No lease on your record matches that." The selection is not lost by this;
it is on the button above, which is where a reader looks for what is chosen.

`_components/lease-step.tsx`.

### 27 · the dropdown was capped at a hundred

No defect text on this row; the screenshot circles the count chip, the search box
and the panel's foot ("Showing the first 100 of 782"), which is the cap.

The list was one page, and the only way past it was the search box — no use to a
reader who is browsing rather than looking for a name they already know.
Scrolling the panel now asks for the next page through the contract's own
`offset`; rows are appended and de-duplicated on `lease_id`. A failed page is
silent and retried by the next scroll. A **search is not paged** — its answer
already reaches every claimed lease and is what the reader asked for, not a
window onto a longer list.

The foot follows: *"100 of 782 loaded — keep scrolling, or type above to search
them all."*

`_components/lease-step.tsx`, `_components/invite-workbench.tsx`
(`loadMoreLeases`).

### 28 · the address column showed two different things

Round 1's fallback preferred the service's parsed town and dropped to the posting
block only when there wasn't one — so the same column held `Guntown, MS` on rows
the service could split and `CHEMIN DE LA TUYERE, 83440 FAYENCE FRANCE, NONUS`
on rows it could not, under one heading.

The **posting block is now the answer on every row**. It is what the roll holds,
it is present on every row the service returns, and it is what would go on an
envelope. The parsed town only stands in when there is no block at all, and
"no address on the roll" is kept for rows where the roll filed nothing. The
printed sheet takes the same value, in the same order, so the sheet and the row
cannot disagree.

`_components/people-step.tsx` (`placeOf`), `_components/invite-workbench.tsx`
(the `addresses` memo).

---

## Backend — unchanged from round 1

### 7 · search co-owners from the lease search box

`GET /api/v1/invite/leases` documents `q` as "lease name, lease number or
county". Nothing reaches the appraisal roll, and matching a co-owner name from
the client would mean pulling every lease's roster — the one thing the
endpoint's paging exists to avoid.

### 15 · a copied invite link fails as "not valid"

Reproduced against the dev API:

```
POST /api/v1/invite/lookup {"invite_code":"88659570"} → 200  owner_name "State Of Texas"
POST /api/v1/invite/lookup {"invite_code":"78096373"} → 404  INVITE_CODE_NOT_FOUND
```

The second belongs to an invite whose row is `active: false`. Unticking a
co-owner sends `DELETE /invite/co-owners`, which deactivates the row, and
`lookup` then refuses the code — so a link copied before the box was unticked is
dead, with exactly the message QA saw. **Product decision:** either `lookup`
keeps answering for deactivated invites, or the page warns that unticking kills a
code already sent.

### 16 · "State Of Texas" greeted "Dear Of,"

`GET /api/v1/invite/owners?lease=01_16743` returns
`{ "name": "State Of Texas", "kind": "person" }`, so the service's own greeting
renderer takes a given name from the second word and sends back
`"greeting": "Dear Of,"` already resolved. Needs the classifier to read it as
not-a-person, and/or the first-name derivation to refuse names it cannot shorten
safely.

---

## Unlabelled rows

The last CSV row carries a screenshot (`prnt.sc/LqE9rOV278Dq`) and no defect
text. It is the **printed sheet**, with two things circled:

1. The posting block under the recipient's name showed only the town
   (`Brazoria, TX`). **Covered by the row 28 fix** — the sheet now prints the
   roll's full posting block.
2. A band of white above the Mineral View letterhead, between the browser's own
   print header and the sheet. Not addressed: it needs a stated expectation
   before changing the print layout.

Please add the defect text for this row so it can be closed properly.

---

## Files touched in round 2

```
app/mineralownersite/(reference)/invite/invite.css
app/mineralownersite/(reference)/invite/_api/invite-api.ts
app/mineralownersite/(reference)/invite/_components/lease-step.tsx
app/mineralownersite/(reference)/invite/_components/people-step.tsx
app/mineralownersite/(reference)/invite/_components/email-step.tsx
app/mineralownersite/(reference)/invite/_components/invite-workbench.tsx
```

## Verification

- `npx tsc --noEmit` and `npx eslint` over the changed files — clean.
- **Row 17** measured on a temporary cascade harness (both stylesheets, the real
  layer wrapper, all four density classes): 1360px in every mode. The harness
  has been deleted.
- **Rows 9, 24, 25, 28** rendered in a static markup harness against the real
  stylesheet: centred empty panel with no table, "INTEREST" heading intact over
  six-decimal figures that align, and one kind of address on every row.
- **Row 21** re-checked in that harness at 3.2× — and it had regressed:
  `dashboard-reference.alerts.css` declares `.ml-segs { overflow: hidden }` too,
  so dropping the declaration from `invite.css` left the clip standing.
  `overflow: visible` is now written out explicitly, and the chosen segment's
  corners are complete.
- **Rows 14, 26, 27** are interaction changes and have not been exercised in a
  signed-in session — the Browser pane has its own cookie jar and was never
  signed in. They want a QA pass in the running app.

Nothing is committed.
