# Invite Co-Owners — defect sheet triage and fixes

Source: `Mineral View Site Rebuild Defect sheet - Invite co-owners.csv`, 33 rows.
Branch: `Dev-10-08-26`. Round 3, 2026-09-19.

## Where round 3 stands

| | Rows |
|---|---|
| **Reopened by QA, fixed** | 14 |
| **Reopened, re-measured — already fixed in round 2** | 9 (layout half), 17 |
| **New, front-end, fixed** | 29, 30, 32, 33 (layout half) |
| **Content — Shubham's wording, not a code fix** | 9, 19, 20, 31, 33 |
| **Backend — not fixable in the front end** | 7, 15, 16 |
| **Closed in earlier rounds and still passing** | 1–6, 8, 10–13, 18, 21–28 |

### Read the screenshots against the build they were taken on

Three of the reopens (9, 14, 17) were shot on the **round-1** build, not on what
round 2 shipped. The tell is step 2's third column heading: round 1 clipped it
to `DECIMAL INT`, round 2 renamed it `Interest`. Every reopened shot shows
`DECIMAL INT`; row 30's shot — genuinely new — shows `Interest`.

That does not make the reopens noise. Row 14's carries a **new instruction**
("Need to remove customize") that stands whatever build it was taken on, and
rows 9 and 17 were worth re-measuring rather than assumed. Both are measured
below.

---

## Reopened

### 14 · Customize Invitation is gone

Round 1 seeded the editor from the displayed letter; round 2 moved it into the
letter's own place. QA's answer to the second attempt was not a layout note —
it was **"Need to remove customize"**.

So the whole feature is out: the link that read "Customize invitation" /
"Done customizing", the textarea, the `{name}` `{code}` `{url}` `{lease}` token
buttons, and "Start again from the standard letter". Step 3's action row is now
one primary button (`Copy this invitation`), plus `Copy all N` when there is
more than one letter.

**The wording is the service's, full stop.** `body` is gone from the wording the
page sends, so every render takes the backend's default letter and the letter on
screen is the letter that reaches the clipboard — there is no second version of
it to fall out of step. What the reader still chooses is who it goes to and how
it opens, which is the greeting strip above the preview.

The plumbing went with it rather than being left dangling: `templateFrom` and
its regex helper in `_api/invite-api.ts` (the editor's seeder), the
`paragraphs` field on `InviteEmailView` that only the seeder read, `body` on
`InviteWording`, and `.iv-edit` / `.iv-editnote` / `.iv-chips` / `.iv-chipk` /
`.iv-tok` in `invite.css`.

**One thing changed hands.** The 600ms debounce belonged to the textarea; the
custom-greeting box is the only typing left on the card, so it belongs there
now. A lease change that empties that box is not typing and takes the short
delay.

`_components/email-step.tsx`, `_components/invite-workbench.tsx`,
`_api/invite-api.ts`, `invite.css`.

### 9 · the empty list — the layout half was already fixed

QA's shot shows the round-1 state: a live column header over one left-aligned
sentence, which reads as a table that has lost its rows. Round 2 replaced that
with a centred panel (`.iv-blank`) in all four empty states.

Re-rendered this round against the real stylesheet, for a lease whose six owners
are all companies, trusts and the operator (QA's `LOTHRINGER (19441)` case):

```
tables on the page   0
.iv-blank            text-align: center · justify-content: center · min-height 120px
the sentence         "No individual owners on this lease — all 6 other owners of
                      record are companies, trusts or the operator. Show them
                      below to write to them anyway."
the way out          "Also show 6 companies, trusts, and the operator"  (kept)
```

It does **not** say "Nothing matches that" to a reader who has not searched —
that sentence is now reachable only from an actual search.

**What is left on this row is the wording, and the sheet gives it to Shubham.**
The sentence above is mine, not a copy deck's. `EmptyReason` in
`_components/people-step.tsx` holds all four.

### 17 · the density switch — measured at 1360px in every mode

Round 2 pinned all four `.app-body` widths to 1360px. QA's two shots predate
that. Re-measured this round on a cascade harness — both reference sheets inside
`@layer mv-reference`, the page-imported sheets unlayered, the real
`mv-ref-app in-app mv-wide-gutters mv-invite-page` wrapper, at a 1500px
viewport:

```
Detailed     max-width 1360px   rendered 1360px   gutters 105px / 105px
Essentials   max-width 1360px   rendered 1360px   gutters 105px / 105px
Ultra        max-width 1360px   rendered 1360px   gutters 105px / 105px
Pro          max-width 1360px   rendered 1360px   gutters 105px / 105px
```

Nothing else on this page varies by density either. `.chartbox` — the surface
all three step cards sit on — has no density variant, and the one rule that
would have reached inside them (`body .mv-ref-app.view-pro td` at
`dashboard-reference.css:491`, which retunes every table's padding and font size
in Pro) is outranked by `.iv-tbl th, .iv-tbl td` in the unlayered `invite.css`.

The harness has been deleted.

---

## New

### 29 · the printed sheet — a band of white, a split link, a poster for a code

Three complaints on one row, and a fourth thing the screenshot shows without
naming it: the print dialog said **"2 sheets of paper"**, with the signature and
the foot alone on the second one.

Measured against the real renderer, at the width `@page` actually leaves
(8.5in − 2 × 0.4in), before and after:

| | before | after |
|---|---|---|
| sheet height | **12.71in** — spills | **9.48in** — one sheet |
| top padding | 0.85in | 0.32in |
| invite code | 34px | 23px |
| the claim link | **2 line boxes** — split mid-URL | **1** — and its whole line is 1 |

**The white band.** `.sheet` carried 0.85in of its own padding on top of
whatever margin the browser was printing with, so the letterhead began about an
inch and a quarter down the page. `@page` is declared now rather than inherited
— `size: letter; margin: 0.4in` — so the total no longer depends on which
browser is printing, and the sheet's own padding is 0.32in. Three quarters of an
inch to the letterhead is a letter margin; what was there was a gap.

**The link.** The body ends on `Access your Mineral View account:
https://…/register?code=90760463`, and the sheet was breaking that URL wherever
the line ran out — `code=90760463` dangling on a line by itself, which is not
usable by someone retyping it. `escBody` splits each paragraph on its links
**before escaping** (running a URL pattern over escaped text means matching
against `&amp;` and closing the span inside an entity), wraps the link alone in
`.url { white-space: nowrap }`, and leaves trailing punctuation outside it.

**The code.** 34px was nearly three times the body — a banner in the middle of a
letter, and a third of the reason it ran to two sheets. It is 23px, still the
largest thing on the page.

`_lib/invite-render.ts`.

### 30 · "Your interest" was a percentage

Step 1's facts strip printed `1.47%`. The roll files the figure as `0.014714`,
step 2's column already prints the co-owners' shares as decimals (row 4), and
Mineral View's **own** claim screen — the second screenshot on this row — prints
`0.014714` under "Decimal interest". The page was the only place converting.

`formatInterest` returns `decimal.toFixed(6)` now: six places, trailing zeroes
and all, the same rule `formatShare` follows in step 2. A null share still says
"not filed" rather than 0.

`_components/lease-step.tsx`.

### 32 · going back to the first lease did nothing

*"The selected lease state is not refreshed correctly when returning to Lease 1."*

**The search survived the pick.** A reader who found their second lease by
typing its name was left with that search still running the next time they
opened the picker: the panel held only that lease's matches, the one they had
come from was not among them, and there was no way back short of noticing the
search box and clearing it by hand. Worse, `chooseLease` resolved the clicked
lease against the search results alone — so a lease outside the current matches
**could not be chosen at all**, and the click silently did nothing.

A pick is the end of a search, so the search is cleared with it and the panel
reopens on the browsable list with the chosen lease pinned to the top. The
lookup now reads the matches, the paged list and the current selection, so a
click can never resolve to nothing.

**And the restored letters were in the wrong wording.** Stepping back onto a
lease restores what was ticked on it from memory, while `chooseLease` resets the
greeting to the service's default — because row 20 says a greeting written for
one lease must not follow the reader onto the next. Together those left the page
disagreeing with itself: letters still opening "Hi cousin" under a greeting
strip reading "First Name". The re-render effect runs on a lease change now, so
the letters come back in the wording the page is showing. A lease with nothing
ticked on it costs no extra call.

`_components/invite-workbench.tsx`.

### 33 · the invite message was in the corner

13px of dark card pinned to the bottom right of the Dashboard, over a page full
of figures. Both states it carries are things the reader has to read and act on
— "this invitation is for somebody else's record, do you want it too" and "your
invitation could not be redeemed" — and down there it read as a toast that had
already gone.

It is centred on a scrim now, at a size that can be read. **It is still not a
gate**, which is the rule the corner card existed to keep: every state carries a
link that leaves, and the failed one gained "Go to my minerals" because it had
no exit of its own and could not be left sitting in the middle of the page
without one. Focus is not trapped and `aria-modal` is not claimed, because
neither is true.

**"Change the msg" is the other half of this row and the sheet gives it to
Shubham** — the wording is unchanged.

`_components/invite-redeem.tsx`.

---

## Content — Shubham's, not a code fix

| Row | What is wanted | Where the words live |
|---|---|---|
| 9 | the empty-list sentence | `EmptyReason`, `_components/people-step.tsx` |
| 19 | "What happens next", steps 5–8 | `FLOW[4..7]`, `_lib/invite-flow.ts` |
| 20 | the rail's step 5 wording (the defect itself is fixed and passing) | `_lib/invite-flow.ts` |
| 31 | "change the content from all over pages" | the page's prose is in `_lib/invite-flow.ts` and `_components/invite-header.tsx` |
| 33 | the redeem message's wording | `_components/invite-redeem.tsx` |

---

## Backend — unchanged

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
keeps answering for deactivated invites, or the page warns that unticking kills
a code already sent.

### 16 · "State Of Texas" greeted "Dear Of,"

`GET /api/v1/invite/owners?lease=01_16743` returns
`{ "name": "State Of Texas", "kind": "person" }`, so the service's own greeting
renderer takes a given name from the second word and sends back
`"greeting": "Dear Of,"` already resolved. Needs the classifier to read it as
not-a-person, and/or the first-name derivation to refuse names it cannot shorten
safely.

---

## Files touched in round 3

```
app/mineralownersite/(reference)/invite/invite.css
app/mineralownersite/(reference)/invite/_api/invite-api.ts
app/mineralownersite/(reference)/invite/_lib/invite-render.ts
app/mineralownersite/(reference)/invite/_components/lease-step.tsx
app/mineralownersite/(reference)/invite/_components/email-step.tsx
app/mineralownersite/(reference)/invite/_components/invite-workbench.tsx
app/mineralownersite/_components/invite-redeem.tsx
```

## Verification

- `npx tsc --noEmit` and `npx eslint` over the changed files — clean.
- **Row 29** measured against the real `renderInviteEmails` output, at the
  printable width `@page` leaves, with the print block applied: the before/after
  table above. The letter was also rendered and read end to end on one sheet.
- **Row 17** measured on a cascade harness in all four density classes: 1360px
  everywhere, identical gutters.
- **Rows 9, 14, 30** asserted on server-rendered markup from the real
  components, then rendered against the real stylesheet: 12 checks, all passing
  — the decimal interest with no `%` anywhere in the strip, no `<table>` and a
  centred `.iv-blank` in the empty state, and no Customize link, textarea or
  token button anywhere in step 3 with the letter and both copy buttons intact.
- **Rows 32 and 33** are interaction and redeem-flow changes and have **not**
  been exercised signed in — the Browser pane has its own cookie jar and is not
  signed into the app. They want a QA pass in the running app.
- Every harness has been deleted.

Nothing is committed.
