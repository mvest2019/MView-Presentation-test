# The Dashboard and the Weekly Report, ported

`/mineralownersite` and `/mineralownersite/briefing` are the **reference
build's** Dashboard and Weekly Report, ported from `mineral-owner-site-2.0`
(the ZIP; its `ARCHITECTURE.md` describes it) — chrome included. This folder
holds the components, `../_lib/reference/` the contract and the data,
`../dashboard-reference.css` the stylesheet, and `../(reference)/` the two
routes.

## Why the tree is shaped like this

`app/mineralownersite/` has **two route groups**, because the two shells are
different products:

```
(reference)/   layout.tsx · page.tsx (Dashboard) · briefing/ (Weekly Report)
               soon/[slug]/            the reference's "not in this build" page
(portal)/      layout.tsx  ← this app's existing shell, unchanged
               alerts/ leases/ activities/ settings/
```

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
_lib/reference/owner-payload.json   one captured reference payload (414 KB)
_lib/reference/payload.ts        the Payload contract
_lib/reference/weekly.ts         the reference's own weekly type declarations
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
map plots every row. Three arrays neither route renders were shortened —
`activities.nearby`, `timeline.events`, `leases[*].monthly`; every key survives
because `sample.ts` maps over all three. See `owner-data.ts` for the list.

## What came across, and how faithfully

Byte-for-byte the reference's, **import paths aside** — checked
mechanically, every changed line is an `import`: `Dashboard.tsx` (3),
`WeeklyView.tsx` (4), `panels.tsx` (2), `bits.tsx` (2), `funnel.tsx` (2),
`maturity.tsx` (2), `LineChart.tsx` (1), `DrawerPanel.tsx` (1),
`_lib/reference/fmt.ts` (0), `chart.ts` (0), `sample.ts` (0),
`weekly-render.ts` (0).

Two more are the reference's code with one non-import change each, and only
these: `Loader.tsx` gains the `eslint-disable` comment described below — no
code touched — and `Sprite.tsx`'s `export default function Sprite` becomes
`export function Sprite`, so the layout can import it by name.

**`Portal.tsx` and `Chrome.tsx` are ported with documented adaptations**, each
marked `ADAPTED` in the file:

| | |
|---|---|
| route table | the reference serves `/` and `/weekly`; here they are `/mineralownersite` and `/mineralownersite/briefing`, where this app's nav has always pointed |
| Alerts & Activities | out of scope, so `go()` navigates to this app's existing pages. Every label, icon, badge and position in the chrome is still the reference's |
| gate classes | the reference writes `in-app`, `view-*`, `state-*`, `ctx-open` to `<body>`; here they go on Portal's own wrapper, because this document also carries the marketing site |
| sidebar `href` | My Leases and Map exist in this app, so those rows link to them and lose the `soon` tag — see below |

Four ESLint `no-unused-vars` warnings (`ProdCols`, `Charts`, `productCharts`,
`max`, `CHIP`, `WeeklyReport`, `sample`) are the reference's own dead code, kept
so the files stay copies. `Portal`, `Chrome` and `Loader` carry a file-scoped
`eslint-disable` for `react-hooks/set-state-in-effect` with the reason in the
comment: all four reports are the reference's own external-system effects, and
rewriting them would make these files forks rather than copies.

## The one deliberate content deviation

The reference marks **My Leases** and **Map** `SOON`, because those modules are
not in that build. They are in this one, so those two rows are real links and
carry no tag. That is two lines of text across the whole port, and it is the
only place the rendered content differs from the reference. Keeping the
reference's copy would have printed "not in this build" about a page sitting one
click away.

The rows that genuinely have no page here — Production & Forecast, Lease Audit,
Groups, Invite Co-Owners — keep the reference's `soon` treatment and land on
`(reference)/soon/[slug]`, which carries the reference's own copy.

## How this was verified

Both apps were run side by side — this one on `:3000`, the reference on `:8787`
— and compared mechanically. Re-running needs the ZIP unpacked, `npm install`,
its `config.json`, and network access to the Mongo host it names.

**1 · Rendered text, whole shell, 40 combinations.** The reference and the port
expose the *same controls* after this port, so one script drives both: it clicks
the sidebar to each route, then the four density tabs and five state options,
and reads `.app-shell` as text.

```
DASHBOARD        20 of 20 identical
WEEKLY REPORT    20 of 20 identical
```

Compare on the same clock — `greetLine()` reads the viewer's own clock, so a
capture taken either side of noon differs by one line, correctly. The two
`SOON` lines above are normalised out and reported separately.

**2 · The Dashboard's click surface.** Every control in the route section,
enumerated in DOM order and clicked, with the drawer it opened recorded by title
and body length:

```
108 controls · 98 open a drawer · 4 no-ops · 6 navigate     identical
```

**3 · The Weekly Report's interaction surface**, 34 observations, identical:
7 rail anchors with live targets, the 4 cover `Page N →` links, the source chip,
5 controls, 2 collapsible explainers that both toggle, all 8 pages present at
identical byte counts, 7 tables, 2 axis bar charts, the five-mile map with 139
neighbour dots and 10 own-lease squares, the estimate band with 3 ticks, 4 price
boxes, 3 drivers with 3 source chips.

**4 · The four endpoints behind its buttons.**

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

**5 · Computed styles.** 146 selectors on the Dashboard and 122 on the Weekly
Report, 35 properties each, measured in the browser at a matched viewport with
both sides in the same state. Zero selectors absent on either side. What remains
after the two fixes below is: the `.soon-tag` auto-margin (a different element
is sampled, because of the deviation above), zero-width border *colours* (this
app's reset computes `0px solid`, the reference `0px none` — no pixels either
way), and sub-pixel rounding on auto margins and one 2.5px border whose
declaration is identical on both sides.

## What the checks caught

Neither of these was visible by eye, and the first was invisible to a text diff:

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
  selectors differed until the trailing block in `dashboard-reference.css`
  reverted them.
