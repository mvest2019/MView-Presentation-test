# My Profile — `/mineralownersite/profile`

The destination for the account menu's **My Profile** row, which until now fell
through to the `/soon/` placeholder. Built to the Settings route's conventions:
server components, content in `_lib/`, presentation in `_components/`, and the
portal's shared primitives.

**The identity, password and avatar halves are LIVE against `mineralview-api`'s
users module** (`PROFILE-API-FRONTEND 1.md` — the contract's SECOND revision,
which added the photo (§11) and removed the password's `last_changed_*` fields;
backend branch `feat/users-profile`):

- `GET /users/me` renders the strip, seeds the form, and drives the password
  row (`_lib/profile-api.ts`, fetched in `page.tsx` off the session cookie);
- `PATCH /users/me` saves the form — **dirty fields only**, because `""`
  clears a field and an omitted key leaves it alone;
- `PATCH /users/me/email` and its 6-digit send-code / verify-code exchange are
  wired in `profile-actions.ts` and verified against the live API — but **the
  page offers no email editing** (user, 2026-09-17): the box renders disabled,
  showing the sign-in address. The inline code panel lives in git history;
- `PUT /users/me/password` backs the change-password panel, gated on
  `password.set` so a Google account (which has no password) gets a disabled
  button, the API's own `unavailable_reason`, and a tooltip naming "Continue
  with Google". **There is no "last changed" line** — the API cannot answer it
  and `member_since` is a different fact;
- `PUT /users/me/profile-image` backs the strip's **Change photo** control:
  client-checked (the API's four formats, 2 MB — a file's size IS the decoded
  size), uploaded as the `FileReader` data-URL, then the fresh profile is
  re-read so the new `profile_image_url` (new `v`) paints immediately. The
  avatar renders that server-built URL **through `app/api/profile-image`**, a
  same-origin proxy that passes it through untouched — the browser never
  learns the API host — and only serves the session's own member. Null URL →
  the first name's letter (user's rule); no DELETE exists, so no remove
  control.

`member_id` comes from the session cookie in exactly one place
(`_lib/profile-actions.ts`), ready to be deleted when the auth guard moves
identity onto the bearer token.

**The identity facts are never fixtures.** When `GET /users/me` fails or no
API is configured, the form and the strip seed from the session cookie's own
name and email — the reader's real record, just a staler copy. The Suzie Smith
form defaults and the "SS" monogram were removed rather than kept as
fallbacks: invented values rendering as the reader's account is a worse
failure than an honest fallback.

**Two prototype blocks stay, on request** (user, 2026-09-17: "don't change
this UI"), both flagged in code where the next reader will look:

- the **device list** and the security card's fixture hints — local-state
  sign-outs, nothing persists, replaced by the session store when it exists
  (contract §7);
- the **Invitations & credits** balance from `_lib/referral-credits.ts`
  (shared with Billing and Invite), bound to the credits endpoint when one
  exists.

## Layout

```
profile/
├── page.tsx                     the route: head, strip, two-column grid
├── _lib/
│   ├── profile-data.ts            copy only — labels, hints, headings, state sentences
│   ├── profile-api.ts             server-only client for the users endpoints
│   └── profile-actions.ts         the writes, as server actions
└── _components/
    ├── profile-shell.tsx          the page head + the card shell/anchor
    ├── identity-strip.tsx         monogram, name, email — off GET /users/me
    ├── identity-card.tsx          "Profile & contact" — saves; email shown, not editable
    └── security-card.tsx          password (live), inert 2FA and passkey rows
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

## The two product rules the UI pass carried are both gone from the hints

- The **email** rule ("changing it sends a 6-digit code") went with the option
  itself: the address is shown, not editable (user, 2026-09-17), and the hint
  now says exactly that. The code flow stays wired server-side for its return.
- The **mailing address** re-check ("re-runs the claim address check") was
  removed with the wiring: `PATCH /users/me` saves the address and runs no
  record check (contract §7), and a hint promising work the save does not do
  is worse than no hint.

## Where the data comes from

| Block | Source |
| --- | --- |
| Name, email, phone, mailing address | `GET /users/me` |
| Password age (`last_changed_label`), `password.set` | `GET /users/me` |
| Strip fallback when the GET fails | the session cookie (name + email only) |

2FA, passkey and the device list carry the UI pass's prototype figures and
local-only behavior (kept on request — see the intro); the invitations card's
balance is the other deliberate fixture.

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

**"Where you are signed in" is the prototype's list, kept on request.** There
is no session store to read real devices from (contract §7), so the rows are
fixtures, the sign-outs act on local state, and nothing survives a reload. It
becomes a read from the session store when one exists.

**The strip and the form both render `GET /users/me`,** so they cannot
disagree; the strip's only fallback is the session cookie's name and email —
the reader's own record, never a fixture.

**`initials` is the server's, not derived from the name.** Splitting on
whitespace and taking first letters is wrong for a great many real names, and
this product's roll is full of `SMITH, RAYMOND E` and trust names. When the
server sends `initials: null` the circle renders plain — no "?" and no
browser-side guess.

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

## What the functionality pass still needs

1. ~~The form~~ — **done.** Saves through `saveProfileAction`, dirty fields
   only, with the email held out for its own endpoint.
2. ~~The email rule~~ — the 6-digit exchange
   (`send-code → verify-code → PATCH /users/me/email`) is wired and verified
   server-side, but the page **no longer offers email editing** (user,
   2026-09-17); the box is disabled. The **address re-check** hint was REMOVED
   rather than wired: `PATCH /users/me` runs no record check (contract §7).
3. **Two-factor.** `role="switch"` with `aria-checked` is in place; it needs an
   enrolment flow behind it, not a toggle that flips a boolean. No API yet.
4. **Sessions.** `sessions` becomes a read from the server-side session store
   when one exists — today the list is the prototype's and the sign-outs are
   local-state only. The API keeps no sessions yet, so a real password change
   does not actually invalidate other devices, whatever the local list shows.
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
