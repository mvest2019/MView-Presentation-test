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
 * ── THE SECURITY CONTENT IS NEW, AND ITS DATA IS A FIXTURE ──
 *
 * Nothing in this repo records a password age, a two-factor position or a
 * session list, so the values below are prototype figures written to be
 * consistent with the rest of the portal's Suzie Smith / Beeville, TX fixture.
 * They are plausible, not real. `sessions` in particular will come from the
 * session store when there is one; until then the list is here so the card can
 * be laid out, read and reviewed.
 *
 * ── NOTHING ON THIS ROUTE IS WIRED ──
 *
 * The form does not submit, the switch does not flip and the sign-out buttons
 * do nothing. They are real inputs and real `<button>`s carrying the right
 * roles and ARIA state, so wiring each one is adding a handler rather than
 * rebuilding the control. See `README.md`.
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
  defaultValue?: string;
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
        {
          id: "profile-name",
          label: "Full name",
          type: "text",
          required: true,
          defaultValue: "Suzie Smith",
          autoComplete: "name",
        },
        {
          id: "profile-email",
          label: "Email",
          type: "email",
          required: true,
          defaultValue: "suzie@example.com",
          autoComplete: "email",
          hint: "Changing your email sends a 6-digit verification code before it takes effect.",
        },
        {
          id: "profile-phone",
          label: "Phone",
          type: "tel",
          required: false,
          placeholder: "(___) ___-____",
          autoComplete: "tel",
          hint: "Only used for the SMS summary when it launches — never for sales calls.",
        },
      ],
    },
    {
      legend: "Where royalty mail arrives",
      fields: [
        {
          id: "profile-address",
          label: "Mailing address",
          type: "text",
          required: true,
          defaultValue: "Beeville, TX",
          autoComplete: "street-address",
          hint: "This address verified your claim — changing it re-runs the record check before it applies.",
        },
      ],
    },
  ],
  idle: "Changes apply immediately after you save.",
  invalid: "Please fill in the required fields marked *",
  saved: "Saved ✓ — your profile is up to date (prototype)",
  submit: "Save profile",
} as const satisfies {
  requiredNote: string;
  optionalMark: string;
  groups: readonly ProfileGroup[];
  idle: string;
  invalid: string;
  saved: string;
  submit: string;
};

/**
 * The identity strip at the top of the page.
 *
 * `initials` IS CARRIED RATHER THAN DERIVED FROM THE NAME. Splitting a name on
 * whitespace and taking first letters is wrong for a great many real names —
 * particles, multi-word surnames, single-word names, names whose first glyph is
 * a combining pair — and this is a mineral-rights product whose roll is full of
 * "SMITH, RAYMOND E" and trust names. A field the owner can be given control of
 * is the correct shape even while the value is a fixture.
 */
export const identityStrip = {
  initials: "SS",
  /**
   * The name and email the strip shows are READ OUT OF THE FORM below rather
   * than typed again here. They sit six inches apart on the same screen, so a
   * second copy is a defect waiting to happen — edit the field's
   * `defaultValue` and the strip follows it.
   */
  name: fieldDefault("profile-name"),
  email: fieldDefault("profile-email"),
  photoNote: "Profile photos arrive with the community module.",
} as const;

/**
 * The default value of one identity field, by id.
 *
 * Throws rather than returning `""` if the id is not there: an empty name in
 * the page's largest heading is a bug that renders as a blank and gets shipped,
 * whereas a build that stops names the id you mistyped. This runs at module
 * load, so the failure is immediate and not request-dependent.
 */
function fieldDefault(id: string): string {
  /*
    Widened to `ProfileGroup[]` on the way in. `identityForm` is `as const`, so
    each field's literal type carries only the keys that field actually has —
    the phone has no `defaultValue` at all — and a union of those shapes has no
    common `defaultValue` to read. The interface is the shape this lookup is
    written against, and `satisfies` on the constant already guarantees the
    value conforms to it.
  */
  const groups: readonly ProfileGroup[] = identityForm.groups;
  for (const group of groups) {
    for (const field of group.fields) {
      if (field.id === id) return field.defaultValue ?? "";
    }
  }
  throw new Error(`profile-data: no identity field with id "${id}"`);
}

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
    hint: "Last changed 4 months ago. A change signs out every other device.",
    value: "••••••••••••",
    action: "Change password",
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
  hint: "Sign out anything you do not recognise, then change your password.",
  currentTag: "This device",
  signOutOne: "Sign out",
  signOutAll: "Sign out everywhere else",
} as const;

export const securityNote = {
  glyph: "ⓘ",
  lead: "We will never ask you for your password.",
  body: "Not by email, not by phone, not in the community rooms. Mineral View staff cannot see it, and no operator or buyer can ask us for your account.",
} as const;
