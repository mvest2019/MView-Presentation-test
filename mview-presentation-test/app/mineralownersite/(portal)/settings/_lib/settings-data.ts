/**
 * THE SETTINGS PAGE'S CONTENT — extracted from the redesign prototype's
 * `owner/src/routes/app-settings.html`, not authored.
 *
 * Every label, hint, default position and piece of copy below is the reference
 * build's own wording. Where the prototype carried a note explaining WHY a
 * setting reads the way it does (`v36 · #11`, `v11`, `v35 · feedback 19`), the
 * note travels with the data rather than being dropped, because those are the
 * decisions a future reader will otherwise re-litigate.
 *
 * ── "RECOMMENDED" IS RECORDED HERE FOR THE WIRING PASS ──
 *
 * The button does nothing yet — this is the UI pass — but WHICH rows it will
 * turn on is a decision, so it is written down rather than left to be
 * rediscovered.
 *
 * The prototype's `mvRecommendedSettings()` walked the DOM and matched each
 * row's label text against `/production|adjacent|permit/i` and
 * `/payment gap|permit|production/i`. That works exactly until somebody edits a
 * label — rename "Adjacent lease activity" to "Nearby lease activity" and the
 * button silently stops turning it on, with nothing to fail. So the same rule
 * is a `recommended: true` flag on the six rows those two expressions selected,
 * checked row by row: it survives a copy change, and a reader can see which
 * rows it covers without running the regex in their head.
 *
 * Marketing email and the group digest are deliberately NOT flagged — the
 * design's note is explicit that the button touches neither, and that restraint
 * is what makes the button trustworthy. Keep it that way when it is wired.
 */

import type {
  AccountRow,
  AlertPreference,
  QuietWeekOption,
  ToggleSetting,
} from "./settings-types";

/* ============================================================================
   THE PAGE'S OWN HEADINGS

   Kept as data because the jump navigation and the cards have to agree on both
   the wording and the anchor id. The prototype kept them in two places — its
   chips found each card by matching the heading text as a substring — so a
   heading edit broke the jump with nothing to fail.
   ============================================================================ */

export interface SettingsSection {
  /** The anchor id. Also what the jump chip links to. */
  id: string;
  /** The chip's label — short. */
  chip: string;
  /** The card's own heading — the full sentence. */
  heading: string;
}

export const SETTINGS_SECTIONS = {
  view: {
    id: "settings-view",
    chip: "Your view",
    heading:
      "Your view — one set of four: Ultra · Essentials · Detailed · Professional",
  },
  delivery: {
    id: "settings-delivery",
    chip: "Delivery",
    heading: "Weekly briefing delivery",
  },
  quietWeek: {
    id: "settings-quiet-week",
    chip: "Quiet weeks",
    heading: "Quiet-week behavior",
  },
  notifications: {
    id: "settings-notifications",
    chip: "Notifications",
    heading: "Notifications",
  },
  alertPrefs: {
    id: "settings-alert-preferences",
    chip: "Alert preferences",
    heading: "Alert preferences — per type, per channel",
  },
  tour: {
    id: "settings-tour",
    chip: "Guided tour",
    heading: "Guided tour",
  },
  credits: {
    id: "settings-credits",
    chip: "Credits",
    heading: "Credits & referrals",
  },
  profile: {
    id: "settings-profile",
    chip: "Profile",
    heading: "Profile & contact",
  },
  privacy: {
    id: "settings-privacy",
    chip: "Privacy",
    heading: "Privacy — your data is not sold. What you share is your choice.",
  },
  account: {
    id: "settings-account",
    chip: "Account",
    heading: "Account",
  },
  advanced: {
    id: "settings-advanced",
    chip: "Advanced",
    heading: "Advanced — Professional",
  },
} as const satisfies Record<string, SettingsSection>;

export type SettingsSectionKey = keyof typeof SETTINGS_SECTIONS;

/**
 * The order the jump chips appear in — the design's own seven.
 *
 * NOT every section. Quiet weeks, the tour, credits and the Professional card
 * are reachable by scrolling and were left off the chip row on purpose: a jump
 * bar that lists eleven destinations is another long list to read, which is the
 * problem it exists to solve.
 */
export const JUMP_ORDER: readonly SettingsSectionKey[] = [
  "view",
  "delivery",
  "notifications",
  "alertPrefs",
  "profile",
  "privacy",
  "account",
];

/* ============================================================================
   THE PAGE HEAD
   ============================================================================ */

export const settingsMeta = {
  title: "Settings",
  strapline:
    "Delivery, notifications, credits, and privacy · every change confirms itself with a Saved ✓",
  /** v36 · #11 — the one button, and the tooltip that says what it will do. */
  recommendedLabel: "★ Use Recommended Settings",
  recommendedTitle:
    "Turns on the alerts most owners should have: possible payment gaps, new production on your leases, and permits or completions nearby",
  /* The two confirmations the strapline promises. Not rendered yet — kept here
     because they are the design's exact wording and the wiring pass needs them,
     not because anything reads them today. */
  recommendedToast: "Recommended settings applied ✓",
  savedToast: "Saved ✓",
} as const;

/**
 * v41 · AUDIT #2 (Ryan) — Settings differentiates by view too. Ultra gets a calm
 * one-card page; `portal.css` hides every sibling of a `tier-u` element, so this
 * card IS the page in that tier.
 */
export const ultraSettings = {
  heading: "The two settings that matter",
  deliveryLead: "Your report arrives",
  delivery: "Saturday morning by email",
  viewLead: ", and your view is set to",
  view: "Ultra — the calm one",
  tail: ". Everything else can wait.",
  more: "Show me a little more",
} as const;

/** v9 — the no-claim banner. Settings is fully usable without a claim. */
export const unclaimedNotice = {
  lead: "No claim yet — settings work now.",
  body: "Delivery, notifications, and privacy save immediately; lease-specific items (weekly briefing content, mailed production report, production alerts) activate the moment you",
  linkText: "claim your owner record",
} as const;

/* ============================================================================
   1 · YOUR VIEW
   ============================================================================ */

export const viewCard = {
  /** v41 · AUDIT #1 — this card is the ONE home of the view toggle, plus the
      avatar-menu shortcut. It no longer appears on every page. */
  lead: "Your view is",
  assigned: "assigned from your profile",
  currentLead: "(currently:",
  choose: "choose it yourself right here",
  /** The clause that stops the switch reading as a paywall. */
  reassurance:
    "your choice always wins. Views change density only — they never hide leases your plan makes visible.",
  footnote:
    "Ultra = the calm view (one headline, one status, one button — assigned for overwhelmed or low-engagement owners) · Essentials = plain-English, just what matters · Detailed = the standard dashboard · Professional = maximum density and precision.",
  dossierLead:
    "Mineral View tags each member’s knowledge level as their dossier builds; see your",
  dossierLink: "knowledge profile",
} as const;

/* ============================================================================
   2 · WEEKLY BRIEFING DELIVERY
   ============================================================================ */

export const deliveryDefault = "Default: Saturday morning · email + in-app";

export const deliverySettings: ToggleSetting[] = [
  {
    id: "delivery-email",
    label: "Email",
    hint: "HTML + charts · reply-tolerant",
    on: true,
  },
  {
    id: "delivery-in-app",
    label: "In-app briefing",
    hint: "web + mobile",
    on: true,
  },
  {
    id: "delivery-pdf",
    label: "Printable PDF attached to email",
    hint: "Saturday-with-coffee print layout",
    on: false,
  },
  {
    // The one row on the page with no switch. See `ToggleSetting.future`.
    id: "delivery-sms",
    label: "SMS text summary",
    hint: "plain-text",
    on: false,
    future: true,
  },
  {
    id: "delivery-mailed",
    label: "Mailed monthly production report",
    hint: "paper, monthly · included with Premium",
    on: true,
  },
];

/* ============================================================================
   3 · QUIET-WEEK BEHAVIOUR

   The card exists because most weeks ARE quiet, and an owner who opens a report
   saying "nothing happened" has to be able to tell that from a report that was
   never sent.
   ============================================================================ */

export const quietWeek = {
  lead: "When nothing changed near your leases:",
  /** The override that keeps the product honest — production always posts. */
  footnote:
    "Monthly production anchor always includes new numbers when they post — it overrides quiet-week settings.",
} as const;

export const quietWeekOptions: QuietWeekOption[] = [
  { id: "quiet-note", label: "Send a short “nothing new” note", selected: true },
  { id: "quiet-skip", label: "Skip entirely" },
  { id: "quiet-context", label: "Send with market / analyst context" },
];

/* ============================================================================
   4 · NOTIFICATIONS
   ============================================================================ */

export const notificationSettings: ToggleSetting[] = [
  {
    id: "notify-production",
    label: "New production postings",
    hint: "your 10 claimed leases · as posted",
    unclaimedHint: "activates when you claim your record",
    on: true,
    recommended: true,
  },
  {
    id: "notify-adjacent",
    label: "Adjacent lease activity",
    hint: "near your units · currently 22 adjacent leases + 38 permits tracked",
    unclaimedHint: "activates when you claim your record",
    on: true,
    recommended: true,
  },
  {
    id: "notify-permits",
    label: "Permit & completion alerts",
    // The limit is stated in the hint rather than in a footnote: the product
    // does not have exact permit pins, and the row that sells the alert is
    // where that has to be said.
    hint: "nearby-permit list · lease-radius signal, list/count only — exact permit pins are not available yet",
    on: true,
    recommended: true,
  },
  {
    id: "notify-groups",
    label: "Group activity digest",
    hint: "daily summary of my groups",
    on: false,
  },
  {
    id: "notify-marketing",
    label: "Marketing email",
    hint: "turning this off never affects service email",
    on: false,
  },
];

/* ============================================================================
   5 · ALERT PREFERENCES — per type, per channel  (v11)

   SOURCE: PG.user_notification_settings (channel columns per event type; push
   token via the mobile app).
   ============================================================================ */

export const alertPrefsCard = {
  lead: "Every alert deep-links to the exact screen. Pick where each type reaches you — in-app always keeps the history.",
  inboxLink: "Open inbox →",
  footnote:
    "Quiet by design — alerts fire on real events, never to look busy. Unsubscribing from a channel never hides the in-app history.",
} as const;

export const alertPreferences: AlertPreference[] = [
  {
    id: "alert-permit",
    label: "New permit / completion near a lease",
    hint: "nearby-permit list update · lease-radius signal, not an exact pin",
    channels: { email: true, push: true, inApp: true },
    recommended: true,
  },
  {
    id: "alert-production",
    label: "New production posted",
    hint: "your claimed leases",
    channels: { email: false, push: true, inApp: true },
    recommended: true,
  },
  {
    id: "alert-price",
    label: "Price move touched your estimate",
    hint: "only when it moves your number",
    channels: { email: false, push: false, inApp: true },
  },
  {
    id: "alert-payment-gap",
    label: "Possible payment gap (Lease Audit)",
    hint: "when findings post",
    channels: { email: true, push: true, inApp: true },
    recommended: true,
  },
  {
    id: "alert-group",
    label: "A co-owner posted in your group",
    hint: "private lease groups",
    channels: { email: false, push: true, inApp: true },
  },
  {
    id: "alert-new-well",
    label: "New-well probability band changed",
    hint: "directional",
    annotation: " — model in build",
    channels: { email: false, push: false, inApp: true },
  },
];

/* ============================================================================
   6 · GUIDED TOUR  (v11)
   ============================================================================ */

export const guidedTour = {
  duration: "60 seconds",
  body: "New here, or showing a family member around? Replay the one-time walkthrough of the dashboard, alerts, and your leases. New accounts start in the",
  defaultTier: "Essentials",
  bodyTail: "view with the tour offered once.",
  cta: "Replay the 60-second tour",
} as const;

/* ============================================================================
   7 · CREDITS & REFERRALS
   ============================================================================ */

export const credits = {
  invite: "Invite →",
  available: {
    label: "Available credits",
    value: "$100.00",
    basisLead: "spend on services (e.g. a",
    basisLink: "Lease Audit",
    basisTail: ") or auto-apply at renewal",
  },
  lifetime: {
    label: "Lifetime earned",
    value: "$100.00",
    basis: "1 paid-conversion referral · free signups earn no credit",
  },
  /* The last sentence is the one that matters: a credit is not a free month,
     and saying so here is cheaper than saying it in a support reply. */
  footnoteLead:
    "Earned from 1 referred co-owner who became a paid member (free signups earn no credit). One more invite outstanding (printed letter). Credits are not cash and are never a “free month.” Full ledger in",
  footnoteLink: "Billing & Plan",
} as const;

/* ============================================================================
   8 · PROFILE & CONTACT  (v35 · feedback 19)

   SOURCE: PG.members_entity (name/email/phone) + the claim-verification mailing
   address.

   BUILD-CONTRACT, and both halves are real product rules rather than form
   decoration: an email change re-verifies with a 6-digit code, and a
   mailing-address change re-runs the claim address check before it applies. In
   this build the save is a confirmation only.
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

export const profileCard = {
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

/* ============================================================================
   9 · PRIVACY
   ============================================================================ */

export const privacyCard = {
  lead: "Public records are public. What you upload — division orders, check statements, deeds, correspondence — stays in your private vault unless you explicitly share it with an advisor. You can revoke advisor sharing anytime.",
  rows: [
    {
      id: "privacy-advisor",
      label: "Advisor sharing",
      hint: "no advisors connected",
      action: "Connect an advisor",
      acknowledgement: "Invite sent ✓ (prototype)",
    },
    {
      id: "privacy-export",
      label: "Export my data",
      hint: "CSV of everything on your record",
      action: "Export",
      acknowledgement: "Exported ✓ (prototype)",
    },
  ],
  deletion: {
    label: "Delete my account",
    hint: "removes your claim, vault, findings & preferences · invoices and the consent log are kept as tax/legal records —",
    hintLink: "full retention schedule →",
    action: "Request deletion",
    acknowledgement: "Deletion requested ✓ (prototype)",
  },
  /* A PRODUCT RULE, NOT A TOGGLE — and it is printed here precisely because it
     is not a toggle. An owner cannot verify a promise that only lives in a
     policy document they never open. */
  ruleLead: "Product rule, not a toggle:",
  ruleBody:
    "Mineral View does not sell owner data — not sold, brokered, or bundled to third parties. Shown here so you can see it stated plainly — and defined exactly (processors, legal process, AI training) in the",
  ruleLink: "Privacy Policy",
  ruleTail: ", alongside the retention schedule for every artifact type.",
} as const;

/* ============================================================================
   10 · ACCOUNT

   v26 · S3 (P0) — the claimed card never renders while unclaimed: the free card
   swaps in, so no real name, record or plan leaks into the no-claim state.
   ============================================================================ */

export const accountRows: AccountRow[] = [
  { label: "Name", value: "Suzie Smith" },
  { label: "Email", value: "suzie@example.com" },
];

export const activeOwnerRecord = {
  label: "Active owner record",
  hint: "switchable once every 7 days",
  value: "SMITH, RAYMOND E",
  switchLabel: "Switch Owner ▾",
  switchTitle:
    "Swap which owner record fills every page — dashboard, leases, map and reports",
  acknowledgement: "Switch requested ✓ (prototype)",
} as const;

export const accountPlan = {
  label: "Plan",
  value: "Premium · manage →",
} as const;

export const unclaimedAccountRows: AccountRow[] = [
  { label: "Name", value: "Your account" },
  { label: "Email", value: "you@example.com" },
];

export const unclaimedAccount = {
  record: {
    label: "Active owner record",
    hint: "populated the moment you claim",
    value: "None yet — claim your record →",
    href: "/claim",
  },
  plan: { label: "Plan", value: "Free · $0 forever →" },
} as const;

/* ============================================================================
   11 · ADVANCED — PROFESSIONAL  (v41 · AUDIT #2)

   The power-user surface. `tier-p`, so it exists only for the reader who chose
   the densest view.
   ============================================================================ */

const scheduledExport: ToggleSetting = {
  id: "adv-scheduled-export",
  label: "Scheduled data export",
  hint: "weekly CSV of postings + estimates to your email",
  on: false,
};

export const advancedCard = {
  badge: "Power-user surface",
  export: scheduledExport,
  token: {
    label: "Read-only API token",
    hint: "for your CPA or land software ·",
    annotation: "wires with the API program",
    action: "Request",
    acknowledgement: "Token requested ✓ (prototype)",
  },
  auditLog: {
    label: "Account audit log",
    hint: "sign-ins, exports, sharing changes — last 90 days",
    action: "View log",
    acknowledgement: "Log opened ✓ (prototype)",
  },
  density: {
    label: "Density",
    hint: "tables default to maximum columns in Professional",
    value: "On — via your view",
  },
} as const;
