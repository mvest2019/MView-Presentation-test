# Settings — `/mineralownersite/settings`

Converted from the redesign prototype's `owner/src/routes/app-settings.html`
(158 lines of markup, plus behaviour spread across `route-groups.js`,
`route-groups-3.js` and `v33js.js`) into React server components, Tailwind and
the portal's own primitives.

## Layout

```
settings/
├── page.tsx                       the route: five direct children, in order
├── _lib/                          data and pure logic — no JSX, no React
│   ├── settings-types.ts            the shape of a switch, an alert row, a channel set
│   └── settings-data.ts             every label, hint, default and section heading
├── _components/
│   ├── settings-state.tsx         ⚡ the shared state + the "Saved ✓" toast
│   ├── settings-card.tsx            the card shell, the anchor, the heading
│   ├── setting-row.tsx              one label/hint/control line + the Future tag
│   ├── setting-toggle.tsx         ⚡ the 40 × 22 switch
│   ├── channel-chips.tsx          ⚡ email · push · in-app, per alert type
│   ├── recommended-button.tsx     ⚡ "★ Use Recommended Settings" (rendered twice)
│   ├── settings-header.tsx          the page head + the no-claim banner
│   ├── settings-jump-nav.tsx        the seven jump chips — plain anchors
│   ├── ultra-settings.tsx           Ultra's whole page, in one card
│   ├── view-card.tsx                the four-density switch, and its one home
│   ├── delivery-card.tsx            five ways the Saturday report arrives
│   ├── quiet-week-card.tsx        ⚡ what arrives when nothing happened
│   ├── notifications-card.tsx       whether each kind of event fires
│   ├── alert-preferences-card.tsx   where each one lands — the channel matrix
│   ├── guided-tour-card.tsx         replay the 60-second walkthrough
│   ├── credits-card.tsx             referral credits, and what they are not
│   ├── profile-card.tsx           ⚡ the page's only real form
│   ├── privacy-card.tsx             sharing, export, deletion, and the rule
│   ├── account-card.tsx             two cards, one anchor, one ever visible
│   └── advanced-card.tsx            the Professional power-user surface
```

`⚡` = `"use client"`. Six of eighteen components. Everything else is server
rendered, including all eleven card shells — the client leaves are the controls
that move.

## The three rules this module keeps

**Every change confirms itself.** There is no Save button on this page, and a
settings screen with no Save button is either instant or broken. The strapline
promises "every change confirms itself with a Saved ✓" and
`SettingsStateProvider` is what keeps that promise: one live region, one pill,
every control calls `announce()`.

**"Recommended" is data, not a text match.** The prototype's
`mvRecommendedSettings()` found the rows to switch on by running
`/production|adjacent|permit/i` over the rendered label text. That is a
behaviour that a copy edit can silently change, so it is a `recommended: true`
flag on the six rows instead — verified row for row against both of the
prototype's expressions. Marketing email and the group digest are pointedly not
flagged; see `recommended-button.tsx` for why that restraint is the point.

**"Not built" never looks like "not for your plan".** The SMS row renders a
dashed "Future" tag rather than a dead switch, and the API-token row is a real
button that admits it is a prototype. Both are the conventions `portal-nav.ts`
and `portal-routes.ts` already state for navigation and for prose, applied to
controls.

## Mode and funnel-state behaviour

### Density (`?view=`)

| Tier | What renders |
| --- | --- |
| **Ultra** | `UltraSettings` alone. `portal.css` hides every sibling of a `tier-u` element inside `.mv-dash-routes`, so the calm card **is** the page — no header, no jump chips, no cards, and the shell's back row and "Why this page?" pill go too. |
| **Essentials** | Everything except the quiet-week card, the credits card and the Professional card (`hide-s`, the design's own). |
| **Detailed** | Adds quiet weeks and credits. |
| **Professional** | Adds `Advanced — Professional`: scheduled export, API token, audit log, and the density row that reports rather than controls. |

### Funnel state (`?state=`)

| State | What changes |
| --- | --- |
| **unclaimed** | The `nc-only` banner appears, and it is **not** an `nc-swap` — every card below still renders and still works. The claimed Account card swaps for the free one; the credits card goes; the two lease-specific notification hints swap to "activates when you claim your record". |
| **claimed / trial / lapsed / paid** | Identical. Nothing on this page is `cl-lock`: there is no modelled money figure here to withhold, and a preference is not something a plan gates. |

Settings is the one route that stays **fully usable with no claim**, which is a
product decision rather than an oversight — delivery, privacy and notification
preferences are about the person, not about a mineral record.

## What was fixed on the way through

Four defects, three of them in the conversion's own first draft and one
pre-existing:

- **`pageNameForPath` could not name this page.** It only searched
  `navSections`, and AUDIT #35 moved Settings into the account menu — so the top
  bar of a page titled "Settings" read "Dashboard". It now searches both lists.
- **`BUILT_PORTAL_ROUTES` was missing `alerts` and `leases`** while both pages
  existed, so `PortalLink` rendered every cross-link to them as inert "not open
  yet" text. This page's "Open inbox →" was one of them.
- **The Account jump chip did nothing while unclaimed**, because its anchor sat
  on the card that state hides. The anchor moved one level out, onto
  `SettingsAnchor`, which both cards share.
- **The profile form's focus-on-invalid was a no-op.** `querySelector(":invalid")`
  matches the `<fieldset>` before it reaches the input, and a fieldset cannot
  take focus.

## Two deliberate departures from the prototype

Everything else is the reference's own wording, geometry and behaviour.

- **The jump chips are `<a href="#…">`, not buttons calling `scrollIntoView`.**
  The arrival highlight is the CSS `:target` selector rather than a 1600ms class
  timer. It works with JavaScript off, is linkable, and cannot break when a card
  heading is reworded — which the substring search it replaced could.
- **A settings row's control stays on the right when the row wraps.** The
  prototype left it at the start of the wrapped line. See the note in
  `setting-row.tsx`; nothing above the wrap point moves.

## Known: the profile card is not gated for the unclaimed state

`Profile & contact` shows "Suzie Smith" and `suzie@example.com` whatever the
funnel state, because the prototype's card carries no `nc-*` class. It is
reproduced as-is rather than quietly gated, but it sits oddly beside `v26 · S3`,
which made the Account card a swap so exactly that pair of values could not
appear on an unclaimed page. Worth a decision before this route carries a real
account.
