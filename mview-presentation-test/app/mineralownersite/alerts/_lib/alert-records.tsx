import { leaseReportPath } from "../../leases/_lib/lease-routes";
import { alertExplainers } from "./alert-explainers";
import type { AlertRecord } from "./alert-types";

/**
 * THE NINE ALERTS — one array, and the only place any of them is written down.
 *
 * ── WHY ONE ARRAY MATTERS MORE THAN IT LOOKS ──
 *
 * The reference shipped these as nine blocks of hand-written HTML, and then
 * typed their totals into the filter row (All · 9 · Money · 3 …) and AGAIN into
 * the watch ledger below it. Its own comment (v50 · BG-03) records what happened
 * next: the first person to add a tenth alert would have left one surface saying
 * nine and the other saying ten, on a panel whose entire argument is that the
 * numbers cannot drift.
 *
 * Its fix was to make the JavaScript count the rendered rows. This build&apos;s
 * fix is one step earlier and needs no JavaScript at all: the rows ARE this
 * array, and every count on the page — the filter pills, the ledger, the
 * Essentials one-liner, the dashboard rollup, the sidebar badge — is derived from
 * it in `alert-counts.ts`. Adding a tenth alert is adding an entry here, and six
 * surfaces move together.
 *
 * ── THE ORDER IS THE DESIGN'S, AND IT IS NOT CHRONOLOGICAL ──
 *
 * The one row that asks something of the reader is first (Jul 04); the annual
 * records refresh is LAST despite being newer than four rows above it. v38 ·
 * P2-06: a once-a-year account event "ranks below the recurring owner events and
 * reads as a record update, not a headline alert". Sorting this list by date
 * would quietly undo that judgement.
 *
 * ── THE COPY IS PORTED, NOT WRITTEN ──
 *
 * Two distinctions in it are load-bearing and must survive any edit:
 *
 *   · Ledbetter PRODUCED gas in months we can see. It does not say the owner was
 *     underpaid, because the public record cannot know that. The severity tag
 *     reads "Action recommended", never "Money owed".
 *   · A nearby permit is an interest signal, NOT income.
 */
export const alertRecords: AlertRecord[] = [
  {
    id: "paid-check",
    category: "money",
    severity: "action",
    deliveryClass: "urgent",
    unread: true,
    icon: "audit",
    iconTone: "gold",
    iconLabel: "Payment check",
    headline:
      "Payment check worth running — Ledbetter produced gas in months we can see",
    detail: (
      <>
        Gas produced in{" "}
        <strong>Aug 2025, Nov 2025 and Feb 2026</strong> — only your statements
        show if you were paid. Worth a look, not a panic.
      </>
    ),
    meta: "Jul 04 · email + push",
    why: "Why you're seeing this: a produced-month vs payment question on a lease you own is the one class we escalate immediately — it's the money check the service exists for. Urgent alerts always reach every channel you've enabled.",
    actions: [
      {
        label: "Run your included Lease Audit",
        href: "/lease-audit",
        variant: "primary",
      },
      {
        label: "See a sample report",
        acknowledgement: "Sample report — opens here ✓ (prototype)",
      },
    ],
    explainer: alertExplainers["paid-check"],
    keywords:
      "ledbetter 74318 caddo pine resources cass county payment gap audit statements royalty produced gas august november february",
  },

  {
    id: "permits-11",
    category: "activity",
    severity: "important",
    deliveryClass: "digest",
    unread: true,
    icon: "flag",
    iconTone: "mint",
    iconLabel: "Nearby activity",
    headline:
      "Nearby-permit list updated — 11 permits within 1 mi of Ledbetter (74318)",
    detail: <>Neighbour tracts, Cass Co. — a signal for your area, not income.</>,
    meta: "Jul 03 · email + push",
    why: "Why you're seeing this: activity within 1 mile of a lease you own. Context for your area, not income — it can roll up weekly if you'd rather not hear about each permit.",
    actions: [
      {
        label: "View on the map + the list",
        acknowledgement: "The permit map — opens here ✓ (prototype)",
      },
    ],
    explainer: alertExplainers["permits-11"],
    keywords:
      "ledbetter 74318 cass county permits radius enervista pine belt cedarleaf caddo pine neighbour drilling",
  },

  {
    id: "permit-trend",
    category: "activity",
    deliveryClass: "digest",
    unread: true,
    icon: "trend",
    iconTone: "mint",
    iconLabel: "Trend",
    headline: "Permit trend — activity around Ledbetter is holding, not fading",
    detail: (
      <>
        <strong>11 permits within 1 mi</strong> — is drilling moving toward you,
        and is it your operator? The trend view answers.
      </>
    ),
    meta: "Jul 03 · in-app",
    why: "Why you're seeing this: permits and completions update daily, and the direction of drilling activity around your leases — toward or away, your operator or others — is one of the most decision-relevant signals an owner has.",
    buildNote: "Trend data not available yet",
    actions: [
      {
        label: "Open the permit & completion trend",
        acknowledgement: "The trend view — opens here ✓ (prototype)",
      },
    ],
    explainer: alertExplainers["permit-trend"],
    keywords:
      "ledbetter permit trend completions direction caddo pine operator cass county drilling activity",
  },

  {
    id: "prod-smith",
    category: "activity",
    severity: "important",
    deliveryClass: "digest",
    unread: true,
    icon: "leases",
    iconTone: "mint",
    iconLabel: "Production posting",
    headline: "New production posted — Smith Gas Unit (305892): 27,120 mcf",
    detail: (
      <>
        Your strongest lease keeps posting — it feeds your $8,700 six-year share. A
        production fact, not a payment.
      </>
    ),
    meta: "Jul 02 · in-app",
    why: "Why you're seeing this: a public production posting on a lease you own. A production fact, not a payment — digest-class because postings arrive in monthly batches.",
    actions: [
      { label: "Open the lease report", href: leaseReportPath("305892") },
    ],
    explainer: alertExplainers["prod-smith"],
    keywords:
      "smith gas unit 305892 bluestem bee units production posting mcf bbl 423065 267145 508936",
  },

  {
    id: "gas-move",
    category: "money",
    deliveryClass: "educational",
    unread: true,
    icon: "price",
    iconTone: "mint",
    iconLabel: "Price move",
    headline: "Price move touched your estimate — gas ▲ 1.53%",
    detail: (
      <>
        Gas $3.245, WTI eased — favours your gas-weighted Bee units. Your $26,340
        held.
      </>
    ),
    meta: "Jul 02 · in-app",
    why: "Why you're seeing this: market context that touched your estimate. Educational-class — no action needed, never a signal to buy, sell, or lease.",
    actions: [
      {
        label: "Why gas moved — chart + drivers",
        acknowledgement: "This week's briefing — opens here ✓ (prototype)",
      },
      {
        label: "Gas price chart",
        acknowledgement: "The gas chart — opens here ✓ (prototype)",
      },
    ],
    explainer: alertExplainers["gas-move"],
    keywords:
      "henry hub gas price wti brent mvestimate bee units gas-weighted benchmark strip",
  },

  {
    id: "group-post",
    category: "community",
    deliveryClass: "community",
    unread: true,
    icon: "chat",
    iconTone: "mint",
    iconLabel: "Community post",
    headline: "Margaret D. posted in Smith Gas Unit — Owners",
    detail: (
      <>
        &ldquo;Saw Bluestem&apos;s new posting on 305892 — does that change
        anyone&apos;s MVestimate?&rdquo;
      </>
    ),
    meta: "2h · push sent",
    why: "Why you're seeing this: activity in a private lease group you belong to. Community-class — mute any group's notifications without leaving it.",
    actions: [
      {
        label: "Open the thread",
        acknowledgement: "The group thread — opens here ✓ (prototype)",
      },
    ],
    explainer: alertExplainers["group-post"],
    keywords:
      "margaret smith gas unit owners group co-owner thread 305892 bluestem royalty audit pledge community",
  },

  {
    id: "new-well",
    category: "model",
    deliveryClass: "educational",
    unread: false,
    icon: "activity",
    iconTone: "blue",
    iconLabel: "Model indicator",
    headline: "New-well probability nudged up — Bee units",
    detail: (
      <>
        The spacing indicator moved within the <strong>Moderate</strong> band after
        two nearby completions. Directional only — a new well is your biggest
        upside.
      </>
    ),
    meta: "Jun 30 · in-app · read",
    why: "Why you're seeing this: a directional model indicator moved for your area. Educational-class — context to understand, not a prediction to act on.",
    actions: [{ label: "See the why", href: leaseReportPath("305892") }],
    explainer: alertExplainers["new-well"],
    keywords:
      "bee units new well probability spacing indicator moderate band completions decline model forecast",
  },

  {
    id: "briefing",
    category: "activity",
    deliveryClass: "digest",
    unread: false,
    icon: "mail",
    iconTone: "mint",
    iconLabel: "Briefing",
    headline: "Your weekly briefing is ready",
    detail: (
      <>Week ending Jun 27 — earning as expected, nothing needed your attention.</>
    ),
    meta: "Jun 28 · email + in-app · read",
    why: "Why you're seeing this: your Saturday briefing — the digest channel itself, where Important-digest alerts roll up if you've set them to weekly.",
    actions: [
      {
        label: "Open the briefing",
        acknowledgement: "The weekly briefing — opens here ✓ (prototype)",
      },
    ],
    explainer: alertExplainers.briefing,
    keywords:
      "weekly briefing digest saturday week ending jun 27 market context prices permits summary",
  },

  {
    id: "records-3",
    category: "money",
    deliveryClass: "record",
    unread: true,
    icon: "claim",
    iconTone: "gold",
    iconLabel: "Record update",
    headline:
      "Account / record update — the 2026 mineral-owner records refreshed: 3 new possible matches in your name",
    detail: (
      <>
        <strong>SMITH R E</strong> variants matched on 3 leases in Karnes and
        DeWitt — possible matches until you verify by address.
      </>
    ),
    meta: "Jul 03 · fires only on a records refresh",
    why: "Why you're seeing this: the mineral-owner records were refreshed (2026 roll) and the new roll matched your name variants. This alert fires only on a records refresh — about once a year, never as a repeating nag, and a dismissal sticks until the next refresh.",
    /* THE "SEE THE 3 MASKED NAMES" BUTTON IS ABSENT ON PURPOSE. It opened a
       second drawer holding exactly the three masked variants, and those three
       variants are already in this row's own explainer, one click away in the
       same place. A button that opens a panel to repeat what the panel beside it
       says is the duplication the drawer existed to avoid, not a feature. */
    actions: [
      { label: "Review in the claim flow", href: "/claim", variant: "primary" },
      {
        label: "Not mine — dismiss for good",
        dismissal: "Dismissed for good ✓ — quiet until the next records refresh",
      },
    ],
    explainer: alertExplainers["records-3"],
    keywords:
      "smith r e records refresh 2026 roll karnes dewitt possible matches claim verify address name variants",
  },
];
