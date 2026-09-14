# My Profile — `/mineralownersite/profile`

The destination for the account menu's **My Profile** row, which until now fell
through to the `/soon/` placeholder. Built to the Settings route's conventions:
server components, content in `_lib/`, presentation in `_components/`, and the
portal's shared primitives.

**This is the UI pass. Nothing on this page is wired.** No component here
carries `"use client"` and the route ships no JavaScript of its own: the form
does not submit, the two-factor switch does not flip, and the sign-out buttons
do nothing. They are real inputs and real `<button>`s carrying the right roles
and ARIA state, so wiring each one is adding a handler — not rebuilding the
control. See **What the functionality pass will need**, below.

## Layout

```
profile/
├── page.tsx                     the route: head, strip, two-column grid
├── _lib/
│   └── profile-data.ts            every label, hint, default and heading
└── _components/
    ├── profile-shell.tsx          the page head + the card shell/anchor
    ├── identity-strip.tsx         monogram, name, email
    ├── identity-card.tsx          "Profile & contact" — the only real form
    └── security-card.tsx          password, 2FA, passkey, device list
```

## What this page owns — and what it deliberately does not

It owns **identity** and **sign-in**: name, email, phone, mailing address, and
how you get into the account. That is the whole scope, asked for explicitly.

It does **not** carry your owner records, your plan or your capacity. Their
absence is a decision, not an omission:

- the active owner record and its 7-day switch stay in Settings' **Account**
  card, which is also where the unclaimed state swaps;
- plan and capacity belong to **Billing & Plan**, its own account-menu row.
  Summarising them here would put a second, staler answer on screen next to
  that page's real one.

The page head links to Settings so a reader who came looking for either is told
where to go in one glance.

## The form moved here; Settings keeps a pointer

`profileCard` in `settings/_lib/settings-data.ts` — the four fields, their
hints, the two fieldset legends and the submit copy — **moved** to
`_lib/profile-data.ts` as `identityForm`. It was not copied.
`settings/_components/profile-card.tsx` is now a card that names the four
fields and links here.

Rendering the form on **both** routes from the shared content module was
considered and rejected: two forms writing the same four fields means two
submit paths, two validation states, and two places for the
email-verification and address-recheck rules to be half-implemented. The reader
loses one click; the build loses a whole class of drift.

The Settings section kept its id, so `#settings-profile` still resolves and the
**Profile** jump chip still lands there — on the card that says where the form
went. That is why the section was not simply deleted.

**Do not re-add the fields to Settings.** One definition, deliberately.

## Two product rules travelled with the form

Both are in the field hints, where somebody about to make the change will read
them — neither is form decoration:

- changing the **email** sends a 6-digit code, and the change waits for it;
- changing the **mailing address** re-runs the claim address check before it
  applies, because that address is what proved the record was theirs.

## Where the data comes from

| Block | Source |
| --- | --- |
| Name, email, phone | `PG.members_entity` |
| Mailing address | the address that verified the claim |
| Password age, 2FA position, sessions | **fixture** — see below |

Nothing in this repo records a password age, a two-factor position or a session
list. Those values are prototype figures written to be consistent with the rest
of the portal's Suzie Smith / Beeville, TX record. They are plausible, not real.

## Decisions a reader is likely to question

**The monogram has no upload control.** A "Change photo" button would be the
one control here implying a capability nothing behind it has — no upload
endpoint, no storage, no moderation path. A reader who presses an inert one
concludes their photo failed to save, not that the feature has not shipped. The
strip states plainly when photos arrive instead.

**The card heading is "Profile & contact", not "Who you are."** The latter is
the first fieldset's legend, 20px below it, and the legend has to stay — it is
half of a pair with "Where royalty mail arrives" that tells the reader why the
mailing address is separated from the phone number. "Profile & contact" is also
what the Settings pointer card is titled, so the link lands on the heading it
promised.

**The current device has no sign-out button.** Signing out the device you are
reading on is the account menu's "Log out", where a reader already looks for it.
Repeating it in a list of suspicious-device sign-outs invites a misclick whose
cost is losing the session you were using to secure the account.

**The strip's name and email are read out of the form's own defaults**
(`fieldDefault`), not typed again. They sit inches apart on one screen, so a
second copy is a defect waiting to happen.

**`initials` is stored, not derived from the name.** Splitting on whitespace and
taking first letters is wrong for a great many real names, and this product's
roll is full of `SMITH, RAYMOND E` and trust names. A field the owner can be
given control of is the right shape even while the value is a fixture.

**The sessions block is a `<ul>`, not a table.** Device / place / time looks
tabular, but each row is one object with a control attached rather than a grid
of comparable values, and at phone width a table of that shape either scrolls
sideways or collapses into something the reader has to re-learn.

## Two imports cross a route boundary

`security-card.tsx` imports `SettingRow`, `FutureTag` and `SettingToggle` from
`settings/_components/`. Deliberately: all three are pure presentation with no
settings content in them, and a second copy of the switch is exactly how two
pages end up disagreeing about the off colour. **If a third route needs them,
move them up to `_components/ui/`** — two is not yet enough to justify it.

The page does **not** reuse `SettingsCard`, because that component is typed
against `SETTINGS_SECTIONS`. Using it would mean either adding this page's
sections to the settings map — where a jump chip would then try to scroll to a
card on another route — or widening its type until it no longer guarantees the
settings jump nav can find every section it lists. `ProfileCardShell` is a few
lines of composition over the shared `Card`, which is the piece worth sharing.

## Gating

`gates("pageRoot")` puts `.mv-dash-routes` on the wrapper, which is what
`portal.css` selects for the portal's density and claim-state rules.

This page has **no gated sections** — identity and sign-in are the same at every
view density and in both claim states, which is why there is no `nc-swap` panel
and no `tier-*` card. It still carries the root class so it sits in the same
layout context as its siblings.

## What the functionality pass will need

1. **The form.** A handler on `<form>` plus state for the one message line,
   which is already an `aria-live="polite"` region. `identityForm` carries
   `idle`, `invalid` and `saved` for its three states. The fields are
   uncontrolled (`defaultValue`) and `required` is on the inputs, so the
   browser's own constraint validation already works.
2. **The email and address rules.** The 6-digit code exchange and the claim
   address re-check are both server work; the hints already promise them.
3. **Two-factor.** `role="switch"` with `aria-checked` is in place; it needs an
   enrolment flow behind it, not a toggle that flips a boolean.
4. **Sessions.** `sessions` becomes a read from the session store. Each row's
   sign-out needs the session id — already on the fixture as `id` — and
   "Sign out everywhere else" must exclude the current one.
5. **Passkey** is marked `future: true` and renders a `FutureTag`. Leave it
   inert until WebAuthn registration exists.

## Where this route is registered

Three places, all of which key off the presence of an `href`:

- `_lib/portal-routes.ts` — `BUILT_PORTAL_ROUTES`, so `PortalLink` renders it
  as a real link rather than the unbuilt span;
- `_lib/portal-nav.ts` — `accountMenu` (the avatar menu and the mobile drawer's
  Account section) and `tabBar` (the phone bar's fifth slot). Adding the `href`
  is what dropped the "soon" tag and made the row current;
- `_components/reference/Chrome.tsx` — the reference shell's own `ACCOUNT`
  list, which is a separate array serving the reference group's top bar.
