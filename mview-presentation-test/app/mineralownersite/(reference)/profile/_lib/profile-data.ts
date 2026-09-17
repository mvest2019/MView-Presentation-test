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
  photoNote: "Profile photos arrive with the community module.",
} as const;

/* ============================================================================
   2 · SECURITY & SIGN-IN

   FIXTURE DATA — see the header note. Three rows plus the session list.
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
      THE UI PASS'S HINT, RESTORED ON REQUEST (user, 2026-09-17: "don't change
      this UI"). It is the FALLBACK only: whenever `GET /users/me` answered,
      `security-card.tsx` replaces it with the live "Last changed …" line built
      from `password.last_changed_label` — a pre-formatted server string,
      rendered rather than re-derived.

      Two caveats the next reader should know it carries: the "4 months ago" is
      the prototype figure (shown only when the record could not be read), and
      "signs out every other device" is honoured by the on-screen device list
      below — the API itself invalidates no server-side sessions yet
      (PROFILE-API-FRONTEND.md §5).
    */
    hint: "Last changed 4 months ago. A change signs out every other device.",
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
  {
    id: "security-2fa",
    label: "Two-factor authentication",
    hint: "A 6-digit code from your phone on every new sign-in. Strongly recommended — your record carries your royalty figures.",
    toggle: true,
    on: false,
  },
  {
    id: "security-passkey",
    label: "Passkey",
    hint: "Sign in with your device instead of a password — face, fingerprint or screen lock.",
    action: "Add a passkey",
    future: true,
  },
];

/*
 * THE DEVICE LIST — PROTOTYPE ROWS, RESTORED ON REQUEST.
 *
 * "Where you are signed in" was removed in the fixture purge (the API keeps no
 * session store: PROFILE-API-FRONTEND.md §7, "The device list on screen today
 * is not real data") and RESTORED as-was (user, 2026-09-17: "don't change this
 * UI"). So these rows are the UI pass's prototype figures, the sign-outs act
 * on local state only, and nothing persists a reload — exactly as before the
 * wiring. When the server-side session store ships, this list becomes a read
 * from it and the sign-out buttons get their endpoint.
 */

/** One signed-in device. */
export interface ProfileSession {
  id: string;
  device: string;
  place: string;
  lastActive: string;
  /** The one you are reading this on — it gets no sign-out button. */
  current?: boolean;
}

export const sessions: ProfileSession[] = [
  {
    id: "session-current",
    device: "Chrome on Windows",
    place: "Beeville, TX",
    lastActive: "Active now",
    current: true,
  },
  {
    id: "session-iphone",
    device: "Safari on iPhone",
    place: "Beeville, TX",
    lastActive: "Yesterday, 7:42 PM",
  },
  {
    id: "session-ipad",
    device: "Safari on iPad",
    place: "Corpus Christi, TX",
    lastActive: "3 weeks ago",
  },
];

export const sessionsBlock = {
  heading: "Where you are signed in",
  hint: "Sign out anything you do not recognize, then change your password.",
  currentTag: "This device",
  signOutOne: "Sign out",
  signOutAll: "Sign out everywhere else",
} as const;

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

/** the password row's live hint, from the server's pre-formatted label */
export const passwordCopy = {
  lastChanged: (label: string) => `Last changed ${label}.`,
  /* `last_changed_at: null` with `set: true` means NOT RECORDED — never shown
     as `member_since`, which is a different fact (the day the account was
     created) wearing the answer's clothes */
  notRecorded: "Last changed: not recorded.",
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
