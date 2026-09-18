import { PHONE_PLACEHOLDER } from "@/lib/phone";

/**
 * MY PROFILE — every label, hint, default and heading on the route.
 *
 * Same rule as `settings/_lib/settings-data.ts`: content is data, markup is
 * presentation. A card here is a `map` over a list rather than hand-written
 * rows, and the ids are stable so the functionality pass can attach handlers
 * without touching layout.
 *
 * ── WHERE THE IDENTITY CONTENT CAME FROM ──
 *
 * `ProfileField`, `ProfileGroup` and `identityForm` were MOVED here from
 * `settings/_lib/settings-data.ts` (where they were `profileCard`), not copied.
 * The Profile page owns editing identity now and Settings keeps a pointer card,
 * so there is exactly one definition of these four fields and their hints. If
 * you find yourself adding a second, put it back to one instead: the whole
 * reason this module exists is that the same field cannot be described two
 * different ways on two pages.
 *
 * The two hints are PRODUCT RULES, not form decoration, and they were carried
 * over verbatim:
 *   · changing the email sends a 6-digit code and the change waits for it;
 *   · changing the mailing address RE-RUNS the claim address check before it
 *     applies, because that address is what proved the record was theirs.
 *
 * ── THIS MODULE CARRIES COPY, NOT DATA ──
 *
 * Labels, hints, legends and the state sentences — nothing that claims to be a
 * fact about the reader's account. Every account fact on the route comes from
 * `GET /users/me` (via `profile-api.ts`) or, for the strip's fallback, from
 * the session cookie the sign-in flow stored. The Suzie Smith fixture that
 * used to live here — form defaults, the "SS" monogram, a password age, a
 * three-device session list, a $100 referral balance — is REMOVED, not kept as
 * a fallback: when the API cannot answer, the page says so and disables the
 * controls rather than rendering invented values as if they were the record.
 * See `README.md`.
 */

/** A card on this page: its heading, and the anchor a link can land on. */
export interface ProfileSection {
  id: string;
  heading: string;
}

export const PROFILE_SECTIONS = {
  identity: {
    /*
      HEADING: "Profile & contact", NOT "Who you are".

      "Who you are" is the first fieldset's legend, and it renders about 20px
      under this heading — the same three words twice, which reads as a
      rendering fault. The legend is the one that has to stay, because it is
      half of a pair ("Where royalty mail arrives") that tells the reader why
      the mailing address is separated from the phone number.

      So the card takes the name this form has always carried on Settings,
      which is also what the pointer card there is still titled. A reader who
      followed that link arrives at a card with the heading they just clicked.
    */
    id: "profile-identity",
    heading: "Profile & contact",
  },
  security: {
    id: "profile-security",
    heading: "Security & sign-in",
  },
  /*
    INVITATIONS SITS WITH IDENTITY AND SIGN-IN. A referral credit is earned by
    THIS PERSON doing something — writing to a co-owner they know — and the
    balance is the only part of it that is theirs rather than the
    subscription's; the card carries the rule and the two ways out (invite, or
    read the full ledger) beside it.

    ITS FIGURES ARE THE ONE FIXTURE LEFT ON THE ROUTE, KNOWINGLY. The balance
    comes from `_lib/referral-credits.ts` — shared with Billing and Invite, so
    there is exactly one copy — and the backend has no credits endpoint to
    replace it yet ("no plan price exists anywhere in the backend",
    PROFILE-API-FRONTEND.md §7). The card was briefly removed on those grounds
    and RESTORED on request (user, 2026-09-17: keep the UI); when the credits
    endpoint lands, `referral-credits.ts` is the one place to bind it.
  */
  invitations: {
    id: "profile-invitations",
    heading: "Invitations & credits",
  },
} as const satisfies Record<string, ProfileSection>;

export const profileMeta = {
  title: "My profile",
  strapline:
    "Your name, how we reach you, and how you sign in. Everything else about the account lives in Settings.",
  settingsLinkText: "Open settings",
} as const;

/* ============================================================================
   1 · PROFILE & CONTACT — the page's only real form.

   MOVED FROM SETTINGS, field for field. See the header note above.
   ============================================================================ */

export interface ProfileField {
  id: string;
  label: string;
  type: "text" | "email" | "tel";
  required: boolean;
  /** shown but not editable — the box renders disabled and the submit ignores
   *  it. The email wears this (user, 2026-09-17: "do not give option to edit
   *  mail"); the backend's change-email endpoint stays wired in
   *  `profile-actions.ts` for the day the option returns. */
  locked?: boolean;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
}

export interface ProfileGroup {
  legend: string;
  fields: ProfileField[];
}

export const identityForm = {
  requiredNote: "Required field — everything else is optional.",
  optionalMark: "(optional)",
  groups: [
    {
      legend: "Who you are",
      fields: [
        /*
          NO `defaultValue` ON ANY FIELD, DELIBERATELY. Every box is seeded
          from `GET /users/me` and from nowhere else — the Suzie Smith fixture
          that used to sit here rendered as if it were the reader's record
          whenever the API was down, which is a worse failure than an empty,
          disabled form that says why. When the profile cannot be loaded the
          card disables itself; it never invents values.
        */
        {
          id: "profile-name",
          label: "Full name",
          type: "text",
          required: true,
          autoComplete: "name",
        },
        {
          id: "profile-email",
          label: "Email",
          type: "email",
          required: true,
          /*
            NOT EDITABLE, ON REQUEST (user, 2026-09-17). The box shows the
            sign-in address and nothing more; the old hint promised a 6-digit
            code flow this page no longer offers, so it went with the control.
          */
          locked: true,
          autoComplete: "email",
          hint: "The address you sign in with. It can't be changed from this page.",
        },
        {
          id: "profile-phone",
          label: "Phone",
          type: "tel",
          required: false,
          placeholder: PHONE_PLACEHOLDER,
          autoComplete: "tel",
          hint: "Only used for the SMS summary when it launches — never for sales calls.",
        },
      ],
    },
    {
      legend: "Where royalty mail arrives",
      fields: [
        /*
          THREE BOXES NOW, NOT ONE. `PATCH /users/me` stores the address as
          street, city and ZIP separately (plus a state id this build cannot
          edit — no states list ships in this repo, so it is omitted from every
          save rather than guessed at or cleared). One box would have meant
          jamming "100 Main St, Beeville 78102" into the street column.

          THE OLD HINT PROMISED A RECORD RE-CHECK, AND THE API DOES NOT RUN
          ONE — `PATCH /users/me` saves the address and nothing else
          (PROFILE-API-FRONTEND.md §7). The line is dropped rather than
          softened: a product rule stated in a hint and not kept by the save
          under it is worse than no hint.
        */
        {
          id: "profile-address",
          label: "Street address",
          type: "text",
          required: true,
          autoComplete: "street-address",
        },
        {
          id: "profile-city",
          label: "City",
          type: "text",
          required: false,
          autoComplete: "address-level2",
        },
        {
          id: "profile-zip",
          label: "ZIP",
          type: "text",
          required: false,
          autoComplete: "postal-code",
        },
      ],
    },
  ],
  idle: "Changes apply immediately after you save.",
  invalid: "Please fill in the required fields marked *",
  savedLive: "Saved ✓ — your profile is up to date.",
  noChanges: "No changes to save.",
  saving: "Saving…",
  /* the whole form's state when `GET /users/me` failed — the boxes stay empty
     and disabled rather than wearing invented values */
  unavailable:
    "Your profile could not be loaded, so changes cannot be saved right now. Reload the page to try again.",
  submit: "Save profile",
} as const satisfies {
  requiredNote: string;
  optionalMark: string;
  groups: readonly ProfileGroup[];
  idle: string;
  invalid: string;
  savedLive: string;
  noChanges: string;
  saving: string;
  unavailable: string;
  submit: string;
};

/*
 * THE EMAIL-CHANGE PANEL'S COPY LIVED HERE (`emailVerify`: the sent line, the
 * code box label, confirm/resend/cancel) and was REMOVED with the option to
 * edit the address (user, 2026-09-17: "do not give option to edit mail"). The
 * three-step flow it fronted — send-code, verify-code, `PATCH /users/me/email`
 * — stays wired in `profile-actions.ts` / `profile-api.ts`, verified against
 * the live API, so restoring the option is UI work only: this copy block and
 * the panel in `identity-card.tsx` (both in git history, 2026-09-17).
 */

/**
 * The identity strip at the top of the page — COPY ONLY.
 *
 * The initials, name and email it used to carry as fixtures are gone: the
 * strip renders `GET /users/me` (the server's own pre-formatted `initials` —
 * never derived by splitting a name, which is wrong for particles, multi-word
 * surnames and trust names), and falls back to the SESSION cookie's name and
 * email — the record the sign-in flow stored — when the read fails. Nothing on
 * it is invented.
 */
export const identityStrip = {
  /*
    THE UPLOAD CONTROL'S COPY. The strip said "Profile photos arrive with the
    community module." for as long as no upload endpoint existed; §11 of the
    contract's second revision shipped one (PUT /users/me/profile-image), so
    the note is replaced by the control it promised. The two client-side
    checks mirror the API's own rules — four formats, 2 MB measured on the
    file itself (which IS the decoded size) — so an oversized file is refused
    before the request, not after (contract checklist).
  */
  changePhoto: "Change photo",
  uploading: "Uploading…",
  /*
    NO STANDING FORMAT/SIZE HINT under the button — removed on request (user,
    2026-09-17). The rules still reach the reader two ways: the file picker
    itself only offers the four formats (the input's `accept`), and a file
    that breaks a rule gets the specific sentence below, at the moment it
    matters, instead of a caption everyone else reads forever.
  */
  photoWrongType: "Choose a PNG, JPEG, GIF or WebP image.",
  photoTooBig: "That file is over 2 MB. Resize it and try again.",
  photoReadFailed: "That file could not be read. Try choosing it again.",
  photoSaved: "Photo updated ✓",
} as const;

/* ============================================================================
   2 · SECURITY & SIGN-IN

   One row (the password) plus the live session list. Two-factor and passkey
   were removed on request — see the note at the end of `securityRows`.
   ============================================================================ */

/** One row of the security card: a fact, and the control that changes it. */
export interface SecurityRow {
  id: string;
  label: string;
  hint: string;
  /** What is true now, shown where a value reads better than a control. */
  value?: string;
  /** The control's label, where the row carries a button. */
  action?: string;
  /** The button opens a panel inside the card rather than going anywhere. A
   *  row with an `action` and neither `panel` nor a handler has nothing to do,
   *  and is drawn disabled rather than pretending. */
  panel?: boolean;
  /** A `role="switch"` row instead of a button row, and its position. */
  toggle?: boolean;
  on?: boolean;
  /** Marks a row whose control is deliberately inert in this build. */
  future?: boolean;
}

export const securityRows: SecurityRow[] = [
  {
    id: "security-password",
    label: "Password",
    /*
      "LAST CHANGED 4 MONTHS AGO" IS GONE FOR GOOD — the contract's second
      revision removed the field outright ("There is no 'last changed' date —
      drop that line from the screen"): the database records that a password
      EXISTS and nothing about when, so any date here would be an invented fact
      about the reader's account, and `member_since` is a different fact. This
      supersedes the earlier restore of the prototype sentence.

      "Signs out every other device" stays because the on-screen device list
      below honours it locally — the API itself invalidates no server-side
      sessions yet (§5). On a Google account the whole hint is replaced by the
      API's own `unavailable_reason` in `security-card.tsx`.
    */
    hint: "A change signs out every other device.",
    /* the mask is shown only when the API says a password exists — see
       `security-card.tsx`; unqualified it would claim one on a Google account */
    value: "••••••••••••",
    action: "Change password",
    /* IT OPENS A PANEL IN THIS CARD, and does not leave for `/reset-password`.
       Asked for directly, and it is also the better flow: that route is the
       FORGOTTEN-password path — it mails a single-use link because the visitor
       cannot prove who they are. A reader already signed in can, with the
       password they are about to replace, so sending them out to their inbox
       to come back would be three minutes and two context switches to reach a
       form this card has room for. See `changePassword` below. */
    panel: true,
  },
  /*
   * TWO-FACTOR AND PASSKEY ARE OFF THE CARD (user, 2026-09-18: "remove this
   * two, other as it is"). Both were controls with nothing behind them — no
   * 2FA API, no WebAuthn (contract §7) — kept as honest prototypes until now;
   * removed as rows of DATA, so the card's renderer, the `SecurityRow` type's
   * `toggle`/`future` branches and the copy all stand ready for their return
   * when the endpoints exist. The two entries are in git history (2026-09-18).
   */
];

/*
 * THE DEVICE LIST — REAL, AS OF THE SESSION STORE.
 *
 * "Where you are signed in" was removed in the fixture purge (§7 of
 * PROFILE-API-FRONTEND.md: "The device list on screen today is not real data"),
 * restored as the UI pass's prototype rows (user, 2026-09-17: "don't change this
 * UI"), and is now a read from `GET /users/me/sessions`. The prototype rows are
 * gone — the UI around them is not. Every class, every string below and the
 * whole shape of `SessionList` are exactly what they were; only where the rows
 * come from has changed, and the sign-outs now reach a server.
 */

/**
 * THIS DEVICE HAS BEEN SIGNED OUT FROM ANOTHER ONE.
 *
 * The code a session action returns when the API refuses its token with a 401.
 * The panel switches on it and sends the reader to sign in again.
 *
 * ── WHY IT LIVES HERE, BESIDE UI COPY, AND NOT WITH THE ACTIONS ───────────
 *
 * Because a `"use server"` module may export ONLY async functions. Declaring
 * this const in `profile-actions.ts` makes the bundler report that file as
 * having NO EXPORTS AT ALL — every action in it stops resolving, and the build
 * fails with a message naming some unrelated import three files away. This
 * module has no directive, so both the server actions and the client component
 * can import it, which is exactly what a shared constant needs.
 *
 * Shared rather than typed twice: a string literal written in two places is one
 * that eventually differs by a character and silently stops matching, and the
 * failure mode here is a signed-out device quietly staying on the page.
 */
export const SESSION_REVOKED = "SESSION_REVOKED";

/** One signed-in device, as the panel renders it. */
export interface ProfileSession {
  id: string;
  device: string;
  /**
   * "Beeville, TX", or NULL — which is what the API sends today, on every row.
   *
   * It has no geolocation provider configured and will not guess a city. The
   * row renders without it; it must NOT fall back to "Unknown location", which
   * reads as a fact about the session under a heading that tells the reader to
   * sign out anything unfamiliar.
   */
  place: string | null;
  /** Already phrased for the reader — see `lastActiveLabel`. */
  lastActive: string;
  /** The one you are reading this on — it gets no sign-out button. */
  current?: boolean;
}

export const sessionsBlock = {
  heading: "Where you are signed in",
  hint: "Sign out anything you do not recognize, then change your password.",
  currentTag: "This device",
  signOutOne: "Sign out",
  signOutAll: "Sign out everywhere else",
  /**
   * A SUCCESSFUL read that came back with nothing — reassurance, not an error.
   *
   * There is no matching "we could not look" string here on purpose: that
   * sentence is produced by `failure()` in `profile-actions.ts`, which names
   * the actual cause (unreachable, timed out, service down) rather than
   * flattening all three into one line. Two copies of it would be one copy too
   * many, and the vaguer one would win by being nearer.
   */
  empty: "No other devices are signed in.",
} as const;

/**
 * "Active now", "Yesterday, 7:42 PM", "3 weeks ago".
 *
 * ── IT RUNS IN THE BROWSER, AND THAT IS THE POINT ─────────────────────────
 *
 * The API sends ISO instants and deliberately does not phrase them: the phrase
 * belongs in the READER's timezone, and the API does not know it — a member's
 * stored address is where their minerals are, not where they are sitting. Doing
 * it server-side would render every session in the server's timezone and
 * mis-state the hour for anyone outside it, on the one screen whose job is
 * helping somebody recognise their own activity. `SecurityCard` is a client
 * component, so this runs where the timezone is correct.
 *
 * ── THE THRESHOLDS MATCH WHAT THE SERVER MEANS ────────────────────────────
 *
 * "Active now" is under five minutes because that is the API's touch interval
 * (`TOUCH_INTERVAL_MS`): it does not record activity more often than that, so a
 * tighter window here would say "12 minutes ago" about a device being used
 * right now. The rest are the ordinary human brackets, and beyond a week it
 * gives a date — "8 weeks ago" is harder to place than "24 July".
 */
export function lastActiveLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "Unknown";

  const seconds = Math.round((now.getTime() - at.getTime()) / 1000);

  /* A clock skew between the server and this browser can put "last active" a
     little in the future. Reading that as "in -3 minutes" would be absurd, so
     anything up to the touch interval ahead is simply now. */
  if (seconds < 5 * 60) return "Active now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const time = at.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isSameDay(at, now)) return `Today, ${time}`;
  if (isSameDay(at, new Date(now.getTime() - DAY_MS))) return `Yesterday, ${time}`;

  const days = Math.floor(seconds / 86_400);
  if (days < 7) return `${days} days ago`;
  if (days < 28) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  /* Past a month a count stops helping — "11 weeks ago" is arithmetic the
     reader has to do. A date is something they can place against a trip. */
  return at.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * THE CHANGE-PASSWORD PANEL — every word of it.
 *
 * ── THREE BOXES, AND THE FIRST ONE IS THE POINT ──
 *
 * Current, new, confirm. `changePasswordSchema` explains why the current one is
 * required here and not on the reset route; the confirm box is there because a
 * typo in a password you cannot see costs you the account.
 *
 * ── NO PERMANENT HINT UNDER THE NEW-PASSWORD BOX ──
 *
 * The rule — eight characters, an uppercase, a digit, a symbol — is already
 * the schema message, and it appears under the box the moment it is broken. A
 * second copy standing there always would be the same sentence twice, and the
 * one that never changes is the one that goes stale when the rule does.
 */
export const changePassword = {
  legend: "Change your password",
  fields: [
    {
      key: "currentPassword",
      id: "profile-current-password",
      label: "Current password",
      autoComplete: "current-password",
    },
    {
      key: "password",
      id: "profile-new-password",
      label: "New password",
      autoComplete: "new-password",
    },
    {
      key: "confirmPassword",
      id: "profile-confirm-password",
      label: "Confirm new password",
      autoComplete: "new-password",
    },
  ],
  submit: "Update password",
  cancel: "Cancel",
  /*
   * NO SIGN-OUT CLAIM IN THE SENTENCE. The old copy promised "every other
   * device has been signed out" — the API keeps no server-side sessions to
   * invalidate yet (PROFILE-API-FRONTEND.md §5), so the promise is dropped
   * until the auth guard ships, not softened.
   */
  saved: "Password updated ✓",
} as const satisfies {
  legend: string;
  fields: readonly {
    key: "currentPassword" | "password" | "confirmPassword";
    id: string;
    label: string;
    autoComplete: string;
  }[];
  submit: string;
  cancel: string;
  saved: string;
};

/** the password row's copy for the no-password account */
export const passwordCopy = {
  /* the fallback when the API says `set: false` but sends no
     `unavailable_reason` sentence of its own */
  noPassword: "This account has no password to change.",
  /** the disabled button's tooltip on a Google account (user, 2026-09-17:
   *  say WHY it is disabled where the reader's pointer already is). Names the
   *  control they actually pressed at sign-up — "Continue with Google" — where
   *  the row's hint carries the API's own longer sentence. */
  googleDisabled:
    "This account was created with “Continue with Google”, so it has no password to change.",
} as const;

export const securityNote = {
  glyph: "ⓘ",
  lead: "We will never ask you for your password.",
  body: "Not by email, not by phone, not in the community rooms. Mineral View staff cannot see it, and no operator or buyer can ask us for your account.",
} as const;
