# Settings — `/mineralownersite/settings`

Converted from the redesign prototype's `owner/src/routes/app-settings.html`
(158 lines of markup) into React server components, Tailwind and the portal's
own primitives.

**This is the UI pass. Nothing on this page is wired.** Every component here is
a server component and the route ships no JavaScript of its own: the switches,
the channel chips, the two Recommended buttons and the profile form render the
positions their data gives them and do nothing when pressed. They are real
`<button>`s and real inputs carrying the right roles and ARIA state, so wiring
each one is adding a handler — not rebuilding the control. See **What the
functionality pass will need**, below.

## Layout

```
settings/
├── page.tsx                       the route: five direct children, in order
├── _lib/                          data and pure logic — no JSX, no React
│   ├── settings-types.ts            the shape of a switch, an alert row, a channel set
│   └── settings-data.ts             every label, hint, default and section heading
├── _components/
│   ├── settings-card.tsx            the card shell, the anchor, the heading,
│   │                                  and "★ Use Recommended Settings"
│   ├── setting-row.tsx              one label/hint/control line + the Future tag
│   ├── setting-toggle.tsx           the 40 × 22 switch
│   ├── channel-chips.tsx            email · push · in-app, per alert type
│   ├── settings-header.tsx          the page head + the no-claim banner
│   ├── settings-jump-nav.tsx        the seven jump chips — plain anchors
│   ├── ultra-settings.tsx           Ultra's whole page, in one card
│   ├── view-card.tsx                the four-density switch, and its one home
│   ├── delivery-card.tsx            five ways the Saturday report arrives
│   ├── quiet-week-card.tsx          what arrives when nothing happened
│   ├── notifications-card.tsx       whether each kind of event fires
│   ├── alert-preferences-card.tsx   where each one lands — the channel matrix
│   ├── guided-tour-card.tsx         replay the 60-second walkthrough
│   ├── credits-card.tsx             referral credits, and what they are not
│   ├── profile-card.tsx             the page's only real form
│   ├── privacy-card.tsx             sharing, export, deletion, and the rule
│   ├── account-card.tsx             two cards, one anchor, one ever visible
│   └── advanced-card.tsx            the Professional power-user surface
```

No component here carries `"use client"`.

## The three rules this module keeps

**Content is data; markup is presentation.** `_lib/settings-data.ts` holds every
label, hint, default position and section heading, so a card is a `map` over a
list rather than forty-one hand-written rows. It is also what will make the
functionality pass small: the rows already have stable ids.

**A control's ROLE is part of the UI, not part of the wiring.** The switches are
`role="switch"` with `aria-checked`, the chips are buttons with `aria-pressed`,
the quiet-week radios are a real `radiogroup`, the required fields carry
`required`, and the form's message line is already an `aria-live` region. All of
that is markup, so it belongs in this pass — and none of it should have to be
revisited when handlers land.

**"Not built" never looks like "not for your plan".** The SMS row renders a
dashed "Future" tag rather than a dead switch. That is the convention
`portal-nav.ts` and `portal-routes.ts` already state for navigation and for
prose, applied to a control: one is a temporary build fact, the other is the
product's funnel, and they must never be allowed to look the same.

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
| **unclaimed** | The `nc-only` banner appears, and it is **not** an `nc-swap` — every card below still renders. The claimed Account card swaps for the free one; the credits card goes; the two lease-specific notification hints swap to "activates when you claim your record". |
| **claimed / trial / lapsed / paid** | Identical. Nothing on this page is `cl-lock`: there is no modelled money figure here to withhold, and a preference is not something a plan gates. |

Settings is the one route that stays **fully usable with no claim**, which is a
product decision rather than an oversight — delivery, privacy and notification
preferences are about the person, not about a mineral record.

## What the functionality pass will need

Two things that are not obvious from the markup, recorded so they do not have to
be rediscovered:

**"Use Recommended Settings" needs SHARED state, not local state.** It is
rendered twice — in the page head and in the Ultra card — and one press has to
reach three rows in the Notifications card and every channel on three rows in
Alert preferences. That is four components, so a `useState` per switch will not
serve it. Each row already carries a stable `id` (`ToggleSetting.id`,
`AlertPreference.id`), emitted as `data-setting` / `data-alert` + `data-channel`,
and the switches and chips take their position as a **prop** — so they become
controlled by being passed a different value, not by being rewritten.

Which rows the button covers is already decided and recorded: the
`recommended: true` flag in `settings-data.ts`, checked row for row against the
prototype's two label regexes. Marketing email and the group digest are
pointedly not flagged, and that restraint is what makes the button trustworthy —
see the note in `settings-card.tsx`.

**The strapline promises a confirmation the page does not yet keep.** "every
change confirms itself with a Saved ✓" — there is no Save button here, and a
settings screen with no Save button is either instant or broken, so that
sentence is load-bearing. The wording is waiting in `settingsMeta`
(`savedToast`, `recommendedToast`); the prototype's own note is `v36 · #10` — a
bottom-centre pill, on every change, fading on its own.

Per-control notes worth reading before wiring one: `setting-toggle.tsx`,
`channel-chips.tsx`, `settings-card.tsx` (the Recommended button) and
`profile-card.tsx` — whose two build-contract rules, email re-verification and
the mailing-address change re-running the claim check, are product behaviour
rather than form validation.

## What was fixed on the way through

Three defects in the portal around this route, found while building it:

- **`pageNameForPath` could not name this page.** It only searched
  `navSections`, and AUDIT #35 moved Settings into the account menu — so the top
  bar of a page titled "Settings" read "Dashboard". It now searches both lists.
- **`BUILT_PORTAL_ROUTES` was missing `alerts` and `leases`** while both pages
  existed, so `PortalLink` rendered every cross-link to them as inert "not open
  yet" text. This page's "Open inbox →" was one of them.
- **The Account jump chip did nothing while unclaimed**, because its anchor sat
  on the card that state hides. The anchor moved one level out, onto
  `SettingsAnchor`, which both cards share.

## Two deliberate departures from the prototype

Everything else is the reference's own wording, geometry and behaviour.

- **The jump chips are `<a href="#…">`, not buttons calling `scrollIntoView`.**
  The arrival highlight is the CSS `:target` selector rather than a 1600ms class
  timer. It needs no JavaScript, is linkable, and cannot break when a card
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
