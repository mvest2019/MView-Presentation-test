/**
 * THE THREE THINGS EVERY PORTAL ROUTE CARRIES, as data.
 *
 * EXTRACTED, NOT AUTHORED. All three are the reference's own shell components,
 * injected per route by `render()` in the prototype rather than written into
 * each page:
 *
 *   THE BACK ROW        §A-1 · `mvBackTrack` + `MV_TOPLEVEL` / `MV_PARENT`.
 *   "WHY THIS PAGE?"    v38 · P1-03 · `ppfInject` + `PAGE_PURPOSE`.
 *   THE ACTION FOOTER   v32 · C4 · `mvOwnerActions` + `MV_ACTIONS` /
 *                       `MV_ACTION_SETS`.
 *
 * THEY BELONG TO THE SHELL, NOT TO A PAGE, and that is the point of putting
 * them here. In the reference they are appended to whichever section is active,
 * so every route gets them for free and none of them can drift between routes.
 * This build does the same from `PortalShell`, which is why a module that lands
 * next week inherits all three by adding its entries below.
 *
 * ONE PIECE OF THE REFERENCE'S FURNITURE IS DELIBERATELY ABSENT. The persistent
 * owner trust strip (`mvTrustStrip`, v28 · P1) was RETIRED in v42 · UTK-TRUST —
 * "the strip ran on every screen and earned nothing" — and its function now
 * begins with an unconditional `return`. It is not reproduced here. Copying
 * dead code out of a reference because it is still in the file is how a
 * retired element comes back to life.
 */

/* ============================================================================
   1 · "WHY THIS PAGE?"  (v38 · P1-03 · v46 · OWNER-02)

   OPT-IN, NEVER ALWAYS-ON. The banner used to be a permanent panel at the top
   of every route, and Ryan's note on it is blunt: "can we put this tab
   somewhere else? It's just moving everything pretty far down the page." So it
   became a small pill the reader can press, and owner content starts at the
   top of every route — which is the whole mobile fold budget.
   ============================================================================ */

/**
 * What each route is FOR, in one sentence.
 *
 * Keyed by App Router path. A route with no entry renders no control at all,
 * which is the reference's behaviour and the right one: a "Why this page?"
 * button that opens an empty box is worse than no button.
 */
export const PAGE_PURPOSE: Record<string, string> = {
  "/mineralownersite":
    "Your whole record at a glance — what it’s worth, what changed, and what’s worth your time today.",
  "/mineralownersite/activities":
    "The raw feed — every posting and filing that touched your record or its neighbors.",
  "/mineralownersite/briefing":
    "Your Saturday-morning read — the four questions answered honestly, in five pages.",
};

/** Where the per-route dismissal is remembered. The reference's own key. */
export const PPF_STORAGE_KEY = "mv_ppf_hide";

/* ============================================================================
   2 · THE BACK ROW  (§A-1 · v38 · P1-03/P2-01 · v41 · AUDIT #4)

   TWO KINDS OF BACK, and mixing them is the defect P2-01 records.

   A SUB-PAGE goes to its DETERMINISTIC PARENT. A lease report always goes back
   to My Leases, whatever the reader did before — the note on that fix reads
   "Map → Back to Sign in is gone", which is what a raw history stack produced.

   A TOP-LEVEL PAGE goes BACK IN HISTORY, and only when there is history to go
   back to. AUDIT #4 asked for a back control on every tab, top-level included;
   the honest version of that on a page with no history is no control, not a
   button that guesses at "home".
   ============================================================================ */

/** The modules that are their own destination — the nav is their orientation. */
export const TOP_LEVEL_ROUTES: readonly string[] = [
  "/mineralownersite",
  "/mineralownersite/alerts",
  "/mineralownersite/leases",
  "/mineralownersite/map",
  "/mineralownersite/activities",
  "/mineralownersite/briefing",
  "/mineralownersite/production",
  "/mineralownersite/audit",
  "/mineralownersite/groups",
  "/mineralownersite/invite",
  "/mineralownersite/dossier",
  "/mineralownersite/settings",
  "/mineralownersite/billing",
];

/**
 * Sub-page → [parent path, parent label].
 *
 * Empty of built routes today, and populated anyway: the lease reports and the
 * audit sub-pages are the next modules, and their parents are already decided.
 * A sub-page added without an entry here falls through to history-back, which
 * is the behaviour P2-01 exists to prevent — so the map is the reminder.
 */
export const ROUTE_PARENT: Record<string, [string, string]> = {
  "/mineralownersite/lease": ["/mineralownersite/leases", "My Leases"],
  "/mineralownersite/county": ["/mineralownersite/activities", "Activities"],
  "/mineralownersite/audit/report": ["/mineralownersite/audit", "Lease Audit"],
  "/mineralownersite/checkout": ["/mineralownersite/billing", "Billing & Plan"],
};

/** What a route is called when it is named as somewhere you came FROM. */
export const ROUTE_LABELS: Record<string, string> = {
  "/mineralownersite": "Dashboard",
  "/mineralownersite/alerts": "Alerts",
  "/mineralownersite/leases": "My Leases",
  "/mineralownersite/map": "Map",
  "/mineralownersite/activities": "Activities",
  "/mineralownersite/briefing": "Weekly Report",
  "/mineralownersite/production": "Production & Forecast",
  "/mineralownersite/audit": "Lease Audit",
  "/mineralownersite/groups": "Groups",
  "/mineralownersite/invite": "Invite Co-Owners",
  "/mineralownersite/dossier": "My Profile",
  "/mineralownersite/settings": "Settings",
  "/mineralownersite/billing": "Billing & Plan",
};

export const PREVIOUS_SCREEN_FALLBACK = "previous screen";

/* ============================================================================
   3 · THE OWNER ACTION FOOTER  (v32 · C4 · v40 · A6-ICONS)

   "WHAT DO YOU WANT TO DO NEXT?" at the foot of every major page, with a
   second line that matters more than the buttons: "No action is a fine choice
   — nothing here is urgent."

   THAT LINE IS THE COMPONENT'S POINT. A portal that ends every page with three
   calls to action teaches the owner that something is always wrong. Saying, in
   the same breath, that doing nothing is a legitimate answer is what keeps the
   footer from becoming a nag — and it is consistent with the rest of the
   product, which reports quiet weeks as results.

   IT DOES NOT RENDER WHILE UNCLAIMED. The reference returns early on
   `no-claim`, because every action here is a decision about an owner record and
   a visitor has none. This build carries `.nc-hide` instead, which is the same
   rule expressed in CSS.

   NO EMOJI IN THE LABELS — v40 · A6-ICONS dropped them; the text carries the
   meaning.
   ============================================================================ */

export interface OwnerAction {
  key: string;
  label: string;
  href: string;
  title: string;
}

export const OWNER_ACTIONS: Record<string, OwnerAction> = {
  watch: {
    key: "watch",
    label: "Watch this",
    href: "/mineralownersite/settings",
    title: "Add to your weekly briefing watch list",
  },
  audit: {
    key: "audit",
    label: "✓ Run my Lease Audit",
    href: "/mineralownersite/audit",
    title: "Compare production to your check stubs",
  },
  ask: {
    key: "ask",
    label: "Ask my operator",
    href: "/mineralownersite/groups",
    title: "Draft a question with your co-owners",
  },
  invite: {
    key: "invite",
    label: "Invite a co-owner",
    href: "/mineralownersite/invite",
    title: "Split costs, compare notes — privately",
  },
  upgrade: {
    key: "upgrade",
    label: "Upgrade my plan",
    href: "/mineralownersite/billing",
    title: "See more leases + mailed report",
  },
  map: {
    key: "map",
    label: "See it on the map",
    href: "/mineralownersite/map",
    title: "Your leases and the activity around them",
  },
  briefing: {
    key: "briefing",
    label: "Read this week",
    href: "/mineralownersite/briefing",
    title: "Your four questions, answered",
  },
};

/**
 * Which three or four actions each route offers.
 *
 * THE SET IS ROUTE-SPECIFIC ON PURPOSE — the footer is the reference's answer
 * to "I have read this, now what?", so it has to follow from the page. The
 * Activities page ends in watch / map / ask because its content is filings and
 * neighbours; the report ends in audit / watch / map because its content is a
 * question only the owner's paperwork can settle.
 */
export const ROUTE_ACTIONS: Record<string, readonly string[]> = {
  "/mineralownersite": ["watch", "audit", "briefing", "invite"],
  "/mineralownersite/activities": ["watch", "map", "ask"],
  "/mineralownersite/briefing": ["audit", "watch", "map"],
  "/mineralownersite/leases": ["audit", "watch", "map", "upgrade"],
  "/mineralownersite/alerts": ["audit", "watch", "map"],
  "/mineralownersite/map": ["watch", "audit", "briefing"],
  "/mineralownersite/audit": ["ask", "watch"],
  "/mineralownersite/groups": ["ask", "invite", "watch"],
  "/mineralownersite/dossier": ["audit", "watch", "ask"],
};

export const ACTION_FOOTER_COPY = {
  heading: "What do you want to do next?",
  reassurance: "No action is a fine choice — nothing here is urgent.",
} as const;
