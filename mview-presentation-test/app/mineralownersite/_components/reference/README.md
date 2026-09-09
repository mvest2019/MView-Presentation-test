# The reference build's five surfaces, ported

`/mineralownersite`, `/mineralownersite/briefing`, `/mineralownersite/alerts`,
`/mineralownersite/activities` and `/mineralownersite/production` are the
**reference build's** Dashboard, Weekly Report, Alerts, Activities and
Production & Forecast, ported from `mineral-owner-site-2.0` (the ZIP; its
`ARCHITECTURE.md` describes it) — chrome included. This folder holds the
components, `../_lib/reference/` the contract and the data,
`../dashboard-reference.css` the stylesheet, and `../(reference)/` the routes.

**The URLs did not move.** Alerts and Activities are at the same two paths they
have always been at; only what renders there changed. A route group's name never
appears in a URL, so relocating the two pages from `(portal)/` to `(reference)/`
is invisible to every link, bookmark and nav entry that points at them.

The reference was re-captured at its newer version for the Production &
Forecast port. That version's payload is **additive** — it adds `forecast` and
`my_leases` and changes nothing the other surfaces read — so all five routes
run off the one snapshot, and all of them were re-verified against it.

## Why the tree is shaped like this

`app/mineralownersite/` has **two route groups**, because the two shells are
different products:

```
(reference)/   layout.tsx · page.tsx (Dashboard) · briefing/ (Weekly Report)
               alerts/ · activities/     the reference's, at their own paths
               production/               Production & Forecast
               map/                      this app's map, borrowing the shell
               soon/[slug]/    the reference's "not in this build" page
(portal)/      layout.tsx  ← this app's existing shell, unchanged
               leases/ settings/ claim/
```

`(portal)/production/` used to hold a page built from the v1 prototype. Two
pages cannot claim one path, so it was removed when this one landed; its
components stay under `_components/production/` and `_lib/portal-production-*`,
unreferenced by any route. `soon/[slug]` lost its `production-and-forecast`
entry at the same time, for the reason that file already gives about My Leases
and Map — a "not in this build" page for a page one click away is a false
statement.

A route group's name never appears in a URL, so `(reference)/page.tsx` is still
`/mineralownersite` and `(portal)/alerts/page.tsx` is still
`/mineralownersite/alerts`. There is deliberately **no** `layout.tsx` at
`app/mineralownersite/` — a parent layout there would wrap both groups, and the
whole point is that they do not share one.

Moving the four existing routes into `(portal)/` broke every relative import
that reached out of a route folder. Those were repaired by **resolution**, not
by pattern: each import was checked against the filesystem and only the ones
that no longer resolved were rewritten. Six files needed it, including two
classes of breakage a pattern match had missed — a route file reaching out to
`app/_components/ui/tooltip`, and the shared `_lib/portal-nav.ts` reaching *in*
to `alerts/_lib/alert-counts`.

## Data is separated from UI

```
_lib/reference/owner-data.ts     ← THE SEAM. the only module that knows where a
                                    figure comes from
_lib/reference/owner-payload.json   one captured reference payload (2.0 MB)
_lib/reference/payload.ts        the Payload contract
_lib/reference/weekly.ts         the reference's own weekly type declarations
_lib/reference/forecast.ts       the reference's own forecast type declarations
```

Every component takes `Payload` and nothing else — no fetch, no fixture import,
no knowledge of the source. Replacing the temporary data with a backend is a
change to `owner-data.ts` alone:

```ts
export async function getOwnerPayload(sel) {
  const res = await fetch(`${API}/portfolio?${qs(sel)}`);
  return res.json() as Promise<Payload>;
}
```

Both of its functions are **already async** so no call site has to change when
they stop being synchronous. The four API routes read the same seam, so they do
not change either.

`nearby.rows` is kept in full (all 149) because the weekly report's five-mile
map plots every row; `timeline.events` in full (all 893) because Activities
renders it and counts its own totals off it; and `forecast` in full (707 KB of
the payload, 555 KB of it `leases[].months`) because Production & Forecast
charts every month of it — 261 months on the totals, 189 of them posted, and 102
to 279 per lease across the ten. Two arrays no route renders were shortened —
`activities.nearby`, `leases[*].monthly`; every key survives because `sample.ts`
maps over them. See `owner-data.ts` for the list and the reasoning.

## What came across, and how faithfully

Byte-for-byte the reference's, **import paths aside** — checked
mechanically, every changed line is an `import`: `Dashboard.tsx` (3),
`WeeklyView.tsx` (4), `panels.tsx` (2), `bits.tsx` (2), `funnel.tsx` (2),
`maturity.tsx` (2), `LineChart.tsx` (1), `DrawerPanel.tsx` (1),
`_lib/reference/fmt.ts` (0), `chart.ts` (0), `sample.ts` (0),
`weekly-render.ts` (0), `weekly.ts` (0), `forecast.ts` (0).

`ProductionView.tsx` (1,175 lines) and `ForecastChart.tsx` (527 lines) came
across the same way — verbatim, plus the `eslint-disable` header described
below. `ProductionView` reads `p.forecast` and nothing else; `ForecastChart`
draws its own SVG, keeps the two axes apart (MCF and BBL are never added), and
owns the hover, the arrow keys and the pin.

Two more are the reference's code with one non-import change each, and only
these: `Loader.tsx` gains the `eslint-disable` comment described below — no
code touched — and `Sprite.tsx`'s `export default function Sprite` becomes
`export function Sprite`, so the layout can import it by name.

**`Portal.tsx` and `Chrome.tsx` are ported with documented adaptations**, each
marked `ADAPTED` in the file:

| | |
|---|---|
| route table | the reference serves `/`, `/alerts`, `/activities`, `/production` and `/weekly`; here they are the same five surfaces under `/mineralownersite`, where this app's nav has always pointed |
| the Map | a sixth route this app has and the reference marks `soon`. It renders itself and borrows the shell through `children`; it is in `ROUTE_PATH` so Back onto it lights the right sidebar row |
| My Leases | this app's own page, outside this work, so it is a `Route` the shell does not own — `go('leases')` navigates to it. The row is the reference's in every other respect |
| gate classes | the reference writes `in-app`, `view-*`, `state-*`, `ctx-open` to `<body>`; here they go on Portal's own wrapper, because this document also carries the marketing site |
| sidebar `href` | Map exists in this app, so that row loses the `soon` tag — see below |

Ten ESLint `no-unused-vars` warnings (`ProdCols`, `Charts`, `productCharts`,
`max`, `CHIP`, `WeeklyReport`, `sample`, `pctS`, `cap`, and this port's own
`_sel`) are the reference's own dead code, kept so the files stay copies.
`Portal`, `Chrome`, `Loader` and `ProductionView` carry a file-scoped
`eslint-disable` for `react-hooks/set-state-in-effect` with the reason in the
comment: every report is the reference's own external-system effect, and
rewriting them would make these files forks rather than copies. `npx tsc
--noEmit` is clean, `npm run build` exits 0, and ESLint reports **0 errors**.

## The one deliberate content deviation

The reference marks **Map** `SOON`, because that module is not in that build. It
is in this one, so the row is a real link and carries no tag. That is **one
line** of text across the whole port — the newer reference already ships My
Leases and Production & Forecast as real pages — and it is the only place the
rendered content differs from the reference. Keeping the reference's copy would
have printed "not in this build" about a page sitting one click away.

The rows that genuinely have no page here — Lease Audit, Groups, Invite
Co-Owners — keep the reference's `soon` treatment and land on
`(reference)/soon/[slug]`, which carries the reference's own copy.

## How this was verified

Both apps were run side by side — this one on `:3000`, the newer reference on
`:8788` — and compared mechanically. Re-running needs the ZIP unpacked, `npm
install`, its `config.json`, and network access to the Mongo host it names.

Two things about driving them, both learned the hard way. **The port hydrates
slower than the reference in dev, and a click on a button React has not attached
a handler to yet is silently a no-op** — that produced twenty *identical*
captures that looked like a frozen page. So every control click is verified
against the control's own `aria-selected` / `aria-checked` and retried.
**Second, a hidden browser pane throttles the task queue to about four turns a
second**, so waiting a fixed number of turns cost seconds and blew the
evaluation timeout; the driver waits for `.app-shell` text to go quiet instead.

**1 · Rendered text, whole shell, 100 combinations.** The reference and the port
expose the *same controls*, so one script drives both: the four density tabs
against the five account states, on each of the five routes, reading
`.app-shell` as text.

```
DASHBOARD               20 of 20 identical
ALERTS                  20 of 20 identical
ACTIVITIES              20 of 20 identical
PRODUCTION & FORECAST   20 of 20 identical
WEEKLY REPORT           20 of 20 identical
```

Compare on the same clock, and close together — `greetLine()` reads the viewer's
own clock, and two reference captures taken minutes apart already differed by
two bytes. The one `SOON` line is normalised out and reported separately.

Two things about driving the two builds, both learned the hard way. **The port
hydrates slower than the reference in dev, and a click on a button React has not
attached a handler to yet is silently a no-op** — that produced twenty
*identical* captures that looked like a frozen page. So every control click is
verified against the control's own `aria-selected` / `aria-checked` and retried.
**Second, a hidden browser pane throttles the task queue to about four turns a
second**, so waiting a fixed number of turns cost seconds and blew the
evaluation timeout; the driver waits for `.app-shell` text to go quiet instead.

**2 · Production & Forecast's whole interactive surface**, every capture
byte-identical:

```
48 controls clicked in DOM order          14,770 B   identical
   3 boundary segments · 12 insight cards · 1 explainer link
   10 per-lease life bars · 12 chart presets · 10 table rows
   13 of them open a drawer, recorded by title and body length
11 lease-select options                    3,144 B   identical
the two-handle brush, 5 drags              1,389 B   identical
the chart: 4 hover positions               1,893 B   identical
the chart: pin, then 5 keys                2,803 B   identical
the chart: leave, then unpin                 751 B   identical
```

Each observation records the section's text length and hash, every `.on` /
`aria-pressed` element, the length of every SVG path, the select's value and the
open drawer — so a chart that redrew differently, or a selection that landed on
the wrong lease, shows up even when the wording does not change.

**3 · The Dashboard's click surface.** Every control in the route section,
enumerated in DOM order and clicked, with the drawer it opened recorded by title
and body length:

```
108 controls · 98 open a drawer · 4 no-ops · 6 navigate     identical
```

**4 · The Weekly Report's interaction surface**, 34 observations, identical:
7 rail anchors with live targets, the 4 cover `Page N →` links, the source chip,
5 controls, 2 collapsible explainers that both toggle, all 8 pages present at
identical byte counts, 7 tables, 2 axis bar charts, the five-mile map with 139
neighbour dots and 10 own-lease squares, the estimate band with 3 ticks, 4 price
boxes, 3 drivers with 3 source chips.

**5 · The four endpoints behind its buttons.**

```
GET  /api/weekly/email          identical JSON
POST /api/weekly/email          identical — every field, including the
                                1,657-byte text and the 26,001-byte HTML
GET  /api/weekly?format=html    byte-identical, 26,119 B, same filename header
GET  /api/weekly?format=csv     byte-identical, 567 B
```

And the mailer's whole flow through the UI: hidden → open (`aria-expanded`) →
"Prepare it" disabled until an address → "Nothing was sent." with the subject
and the honest explanation → *Open it in your mail app* / *Copy the message* /
*Download it to attach* → a `mailto:` with the encoded subject → the rendered
1,640-character message in its `<pre>`.

**6 · Computed styles.** 172 selectors on the Dashboard, 148 on the Weekly
Report and 180 on Production & Forecast — 41 properties each, measured in the
browser at a matched viewport with both sides in the same state, plus a second
Production & Forecast pass of 25 selectors taken *after* a lease row, a life bar
and a measure preset were clicked, so the `.on` states are measured too. The
lists now also carry the bare elements the two builds could disagree about
(`svg`, `p`, `a`, `ul`, `li`, `table`, `th`, `td`, `pre`, `code`, `summary`,
`dl`, `dt`, `dd`, `button`, `input`, `select`) rather than classes alone. Zero
selectors absent on either side, and after the four fixes below what remains is:

```
Dashboard               2 differences
Weekly Report          12 differences
Production & Forecast   2 differences
```

— and all sixteen are one of three known artefacts: the `.soon-tag` auto-margin
(a *different element* is sampled, because of the deviation above), sub-pixel
rounding on auto margins (`0.075px`, `116.963` against `117.062`), and one
2.5px border that computes `2.4px` at the reference tab's device-pixel ratio and
`2px` at this one's, from an identical declaration.

## What the checks caught

None of these was visible by eye, and the first was invisible to a text diff.

- **The strip's lead figure was white instead of green.** `PfStrip` passes
  `'big cl-lock'` as an *argument* and the cell helper renders
  `'pf-val num ' + big`, so a `className` scraper never sees `big` — and
  `.pf-strip .pf-val.big{color:var(--green)}` was dropped from the extract.
  Found by listing every string literal in the components that the reference
  stylesheets also style; `big` was the only real one among 17 candidates.
- **The pinned bar lost its value range at Ultra.** This app's older
  `_lib/portal-state.ts` documents a v1 rule where Ultra also carries
  `view-simple`; the v2.0 reference dropped it. Carrying it over fired every
  `.hide-s` rule at Ultra and hid `$3.71M-$5.29M`. Caught by the whole-shell
  text diff, in 4 of 40 combinations.
- **Form controls rendered in the wrong face.** Tailwind's preflight sets
  `font: inherit` on button and input; the reference lets them take the UA's
  own, which is why its avatar initials are Arial at `line-height: normal`. Six
  selectors differed until the reset-neutralising block in
  `dashboard-reference.css` reverted them.

The Alerts and Activities pass and the Production & Forecast pass then found
**the same three defects independently**, on different surfaces, which is worth
recording: this app's reset and the rescoping are systematic, so anything they
break breaks everywhere and shows up on whichever route you measure next.

- **The Professional table padding was the wrong one.** Scoping `body.view-pro`
  to `.mv-ref-app.view-pro` adds a class *and removes an element*, so every
  state rule silently lost one element-level unit against every other rule in
  the sheet. `body.view-pro td` beats `.rp-tbl td` in the reference; the folded
  pair tie, and the later one won. Alerts saw it on the alert panel's table;
  Production & Forecast saw it on the all-leases table, `10px 12px` where the
  reference prints `7px 10px` / `6px 10px`. Every such selector now carries a
  leading `body `, which restores exactly the unit the fold removed and no more
  — all 96 of them, not the two that showed a symptom. The header of
  `dashboard-reference.css` works the arithmetic.
- **Inline icons were block boxes.** Preflight sets `svg{display:block}`; the
  reference sets nothing, so its `.mvi-inline` glyphs stay inline — and its own
  `vertical-align:-2px` on them is written for an inline box. Inside a flex
  parent display is blockified anyway, which is why only the Dashboard, the one
  surface that puts an icon in running text, showed it: the block also swallowed
  the explicit `{' '}` after the activity icon in the "What changed" heading, so
  the port printed the heading without the reference's leading space, in 12 of
  20 combinations.
- **The buttons the reference leaves uncoloured were the wrong colour.**
  Preflight sets `color: inherit` on form controls, so they took this app's ink
  (`#0d0e17`) where the reference's take the UA's `buttontext` — the alert
  chips, and on Production & Forecast the boundary strip, the insight cards and
  the per-lease life bars.

Two more came only out of the Production & Forecast pass:

- **`appearance` differed on every shared control** — preflight's
  `-webkit-appearance: button` against the reference's `auto`, on all eleven.
  `appearance: revert`.
- **The neutralising block itself was in the wrong place.** It sat at the *end*
  of the stylesheet, where `.mv-ref-app input` ties on specificity with the
  ported `input,select,textarea{font-size:16px}` from mvtaptargets.css and wins
  on order — so it was overriding a real reference rule and printing the brush
  handles at the UA's 13.3333px instead of 16px. It now sits above the extract,
  where every ported rule beats it and preflight still loses to it.

What remains, on all five routes: the `.soon-tag` auto-margin (a *different
element* is sampled, because of the deviation above), sub-pixel rounding on auto
margins, one 2.5px border that computes `2.4px` at the reference tab's
device-pixel ratio and `2px` at this one's from an identical declaration, and
zero-width border *colours* (this app's reset computes `currentColor`, the
reference the UA's grey — no pixels either way).
