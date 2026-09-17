/**
 * The pricing page's content, in one place.
 *
 * EXTRACTED, NOT AUTHORED. Every string below comes from the pricing design
 * delivered as a standalone HTML page ("pricing (1).html", 2026-09-11) — the
 * same revision the prototype's `data-route="pricing"` section carries. It was
 * lifted mechanically rather than retyped, so the plan cards, the comparison
 * table and the plan-by-plan detail cannot disagree about a figure: they all
 * read from here.
 *
 * Where a string deliberately departs from the design, an inline comment says
 * so and why. There is one so far: the Enterprise button's label.
 *
 * WHY THIS PAGE IS NOT PROTO-INJECTED. /pricing used to render
 * `PRICING_MARKUP` through `ProtoPage` with `dangerouslySetInnerHTML`. It is a
 * composed route now, so the feature cards can be real `next/link`
 * navigations — the prototype's cards were plain `<a>` full page loads — and
 * so `#plans` exists as a real anchor for `upgradeHref` in `lib/entitlements.ts`
 * to land on. `PRICING_MARKUP` is no longer read by anything.
 *
 * PRICE REVISION 2026-09-14 (user). The figures below are no longer the
 * delivered design's. The ladder was re-sized against the table the user
 * supplied: Pro drops to 1 record / 5 leases with no add-on meter, Premium
 * drops to 2 records / 10 leases each (20 capacity) and becomes the ONLY plan
 * carrying the $1.99 add-on lease, and Enterprise is stated as 3+ records
 * rather than "Unlimited". Annual is "pay 10 months, get 12", so the yearly
 * prices are exactly 10x monthly — $499.90 and $999.90, not the design's
 * $499.99/$999.99 — and the annual add-on lease is $19.90.
 *
 * The table's two derived columns are carried as their own comparison rows:
 * cost per lease (monthly price over full capacity — $10.00 Pro, $5.00
 * Premium) and the twelve-month total paid monthly ($599.88 and $1,199.88).
 *
 * ONE ROW WAS DROPPED, NOT RE-STATED. "Records fully covered by the limit"
 * read 66.9% / 87.6% / 97.2% / 100%, where 97.2% was measured at Premium's old
 * TWENTY visible leases per record. Premium opens ten now and there is no
 * measured figure for ten anywhere in this repo, so the row is gone rather
 * than carrying an interpolated number. The 66.9% (1 lease) and 87.6% (5
 * leases) figures are unaffected by the revision and still appear in the Free
 * and Pro plan-detail copy. Restore the row once the ten-lease share is
 * measured.
 *
 * THE FULL LADDER IS DELIBERATE (user, 2026-09-11). The proto generator trims
 * plan cards to two features each (`MAX_PLAN_FEATURES = 2`, Ryan 2026-08-24,
 * "till show only 2") and trims the Free tier to `map` + `opdata`. This page
 * shows all 17 on every plan, as the delivered design does, which reverses that
 * call. It was asked for explicitly after the conflict was raised. To put the
 * cap back, slice `FEATURE_GROUPS` where `PlanCard` reads it.
 */

export type BillingMode = "mo" | "yr";

/** One row of a plan card's access block — the only thing that differs by plan. */
export type PlanAccessRow = {
  label: string;
  /** Monthly and annual values, because the extra-lease price differs by term. */
  mo: string;
  yr: string;
  /** A trailing unit the design sets in muted type ("per record"). */
  muted: string;
};

export type Plan = {
  id: string;
  name: string;
  audience: string;
  priceMo: string;
  periodMo: string;
  priceYr: string;
  periodYr: string;
  access: PlanAccessRow[];
  lead: string;
  ctaHref: string;
  ctaLabel: string;
  /** The ribbon above the card, where it has one. */
  flag?: string;
  /** `popular` is the one lifted card; `starter` is the quieter free tier. */
  emphasis?: string;
  ctaVariant?: string;
};

/** A capability, and the page in this app that explains it. */
export type Feature = {
  name: string;
  blurb: string;
  /** null where this app has no page for it yet — the card renders unlinked. */
  href: string | null;
};

export type FeatureGroup = { label: string; items: Feature[] };

export type CompareRow =
  | { kind: "group"; label: string }
  | { kind: "row"; label: string; note: string; cells: string[] };

export type PlanDetail = {
  kind: string;
  name: string;
  price: string;
  who: string;
  rows: { label: string; value: string }[];
  example: string;
  note: string;
};

export type InfoCard = { title: string; body: string };

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    audience: "For the owner with one lease",
    priceMo: "$0",
    periodMo: "forever",
    priceYr: "$0",
    periodYr: "forever",
    access: [
      {
        label: "Owner records",
        mo: "1",
        yr: "1",
        muted: ""
      },
      {
        label: "Leases per record",
        mo: "1",
        yr: "1",
        muted: ""
      },
      {
        label: "Total capacity",
        mo: "1",
        yr: "1",
        muted: "lease"
      },
      {
        label: "Add-on lease",
        mo: "",
        yr: "",
        muted: "not available"
      }
    ],
    lead: "Every feature, on your 1 visible lease",
    ctaHref: "/register",
    ctaLabel: "Create your free account",
    flag: "Start here — free forever",
    emphasis: "starter"
  },
  {
    id: "pro",
    name: "Pro",
    audience: "For the owner with a handful of leases",
    priceMo: "$49.99",
    periodMo: "/mo",
    priceYr: "$499.90",
    periodYr: "/yr",
    access: [
      {
        label: "Owner records",
        mo: "1",
        yr: "1",
        muted: ""
      },
      {
        label: "Leases per record",
        mo: "5",
        yr: "5",
        muted: ""
      },
      {
        label: "Total capacity",
        mo: "5",
        yr: "5",
        muted: "leases"
      },
      {
        label: "Add-on lease",
        mo: "",
        yr: "",
        muted: "not available"
      }
    ],
    lead: "Everything in Free, on 5 leases",
    ctaHref: "/plan-checkout?plan=pro",
    ctaLabel: "Choose Pro"
  },
  {
    id: "premium",
    name: "Premium",
    audience: "For a family or an estate",
    priceMo: "$99.99",
    periodMo: "/mo",
    priceYr: "$999.90",
    periodYr: "/yr",
    access: [
      {
        label: "Owner records",
        mo: "2",
        yr: "2",
        muted: ""
      },
      {
        label: "Leases per record",
        mo: "10",
        yr: "10",
        muted: ""
      },
      {
        label: "Total capacity",
        mo: "20",
        yr: "20",
        muted: "leases"
      },
      {
        label: "Add-on lease",
        mo: "$1.99/mo",
        yr: "$19.90/yr",
        muted: ""
      }
    ],
    lead: "Everything in Pro, on 20 leases",
    ctaHref: "/plan-checkout?plan=premium",
    ctaLabel: "Choose Premium",
    flag: "Most popular",
    emphasis: "popular",
    ctaVariant: "primary"
  },
  {
    id: "enterprise",
    name: "Enterprise",
    audience: "For trusts, estates & advisors",
    priceMo: "Custom",
    periodMo: "· contact required",
    priceYr: "Custom",
    periodYr: "· contact required",
    access: [
      {
        label: "Owner records",
        mo: "3+",
        yr: "3+",
        muted: ""
      },
      {
        label: "Leases per record",
        mo: "All",
        yr: "All",
        muted: ""
      },
      {
        label: "Total capacity",
        mo: "",
        yr: "",
        muted: "no limit"
      },
      {
        label: "Add-on lease",
        mo: "",
        yr: "",
        muted: "in your quote"
      }
    ],
    lead: "Everything in Premium, with no limit",
    ctaHref: "/contact-us",
    // "Contact us", not the design's "Call us" (user, 2026-09-11). The button
    // opens /contact-us, which is a form rather than a phone number, so the
    // label now names what the click actually does.
    ctaLabel: "Contact us"
  }
];

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: "Track your minerals",
    items: [
      {
        name: "Dashboard",
        blurb: "Your figures strip, what changed since your last visit, the KPI row, and one switchable chart across value, gas, oil, appraised value and reserves. Every card opens an explainer.",
        href: "/feature/dashboard"
      },
      {
        name: "Alerts",
        blurb: "Measured findings, each carrying the evidence behind it — money, activity, model and community. Every alert says what it is, what it means for you, and what to do about it.",
        href: "/feature/alerts"
      },
      {
        name: "Activities",
        blurb: "One timeline of six event kinds: production filed, completions, permits, neighbours, well status and operator changes — filtered by date, and by 1, 3 or 5 measured miles from your acreage.",
        href: "/feature/alerts"
      },
      {
        name: "My Leases",
        blurb: "Three connected reports built from a single join, so they cannot disagree: the Lease report, the Reservoir report and the Wells report — spud and permit dates, perforated interval, casing and depths.",
        href: "/feature/my-leases"
      }
    ]
  },
  {
    label: "Value, forecast and maps",
    items: [
      {
        name: "Financials",
        blurb: "Two trends and a table under one control: switch between the full lease and your share and all three move together. Oil and gas on their own axes, plus the cash-flow curve.",
        href: "/feature/valuation"
      },
      {
        name: "Production & Forecast",
        blurb: "The filed record and the model in one picture with the seam marked — next month and next quarter as ranges, reserves and EUR, and how much is already out of the ground.",
        href: "/feature/production"
      },
      {
        name: "Interactive Map",
        blurb: "Your tracts drawn against the wells, permits and neighbouring leases around them on one live map of Texas — with each deviated well drawn from its surface hole to its bottom hole, the path the hole actually takes underground.",
        href: "/map-explorer"
      }
    ]
  },
  {
    label: "Reports and people",
    items: [
      {
        name: "Weekly Report",
        blurb: "The Saturday read, answering four questions: am I making money, are new wells being drilled around me, what does that activity mean for me, and what do world events mean for prices.",
        href: "/feature/weekly-report"
      },
      {
        name: "Monthly Report",
        blurb: "One month, every lease — the stats, the measured insights and a per-lease table. A month the state never filed says so, rather than showing a page of zeroes.",
        href: null
      },
      {
        name: "Mailed monthly report",
        blurb: "The same monthly report, printed and posted to your door.",
        href: null
      },
      {
        name: "AI Assistant",
        blurb: "Ask about your leases in plain English. Answers are grounded in your own record and cite what they are based on — a figure that is not in your record is never invented.",
        href: "/feature/dossier"
      },
      {
        name: "Owner Community",
        blurb: "County, operator and play rooms, plus a private group for each of your leases. Operators are never members.",
        href: "/feature/community"
      },
      {
        name: "Invite Co-Owners",
        blurb: "Bring the other owners on your leases into your record's private group so you can compare notes on the same acreage.",
        href: "/feature/community"
      }
    ]
  },
  {
    label: "Operators — no lease limit",
    items: [
      {
        name: "Operators Directory",
        blurb: "All 7,483 Texas operators, 6,434 of them currently active — who drills, who files and who produces. Public record, so this is the same on every plan.",
        href: "/feature/operators"
      },
      {
        name: "Operator statistics",
        blurb: "Leases held, oil and gas produced, counties worked and how long each operator has held its acreage — compared side by side.",
        href: "/features/compare-operator-statistics"
      },
      {
        name: "Operator performance",
        blurb: "What production actually did through each operator's tenure, and how often their leases change hands. The answer to “is my operator any good?”",
        href: "/features/compare-operator-performance"
      },
      {
        name: "Operator presentation",
        blurb: "An exportable operator profile you can hand to an accountant, an attorney or another owner in your family.",
        href: "/features/operator-presentations"
      }
    ]
  }
];

export const FEATURE_COUNT = FEATURE_GROUPS.reduce(
  (n, g) => n + g.items.length,
  0,
);

export const COMPARE_ROWS: CompareRow[] = [
  {
    kind: "group",
    label: "Price and term"
  },
  {
    kind: "row",
    label: "Monthly price",
    note: "",
    cells: [
      "$0",
      "$49.99",
      "$99.99",
      "Custom"
    ]
  },
  {
    kind: "row",
    label: "Yearly price",
    note: "Prepaid — pay 10 months, get 12",
    cells: [
      "$0",
      "$499.90",
      "$999.90",
      "Custom"
    ]
  },
  {
    kind: "row",
    label: "Cost per lease",
    note: "The monthly price over the plan’s full lease capacity",
    cells: [
      "$0",
      "$10.00",
      "$5.00",
      "In quote"
    ]
  },
  {
    kind: "row",
    label: "Twelve months, paid monthly",
    note: "Prepaying the year instead saves two of the twelve payments",
    cells: [
      "$0",
      "$599.88",
      "$1,199.88",
      "Custom"
    ]
  },
  {
    kind: "row",
    label: "Commitment",
    note: "",
    cells: [
      "None",
      "12 months",
      "12 months",
      "Custom"
    ]
  },
  {
    kind: "group",
    label: "What you can open — the only thing that changes"
  },
  {
    kind: "row",
    label: "Owner records you can claim",
    note: "Roll identities for one legal person link automatically and count as one",
    cells: [
      "1",
      "1",
      "2",
      "3 or more"
    ]
  },
  {
    kind: "row",
    label: "Leases per record",
    note: "Each record ranks its own — producing and highest-value first",
    cells: [
      "1",
      "5",
      "10",
      "All"
    ]
  },
  {
    kind: "row",
    label: "Total lease capacity",
    note: "Records multiplied by the leases each one opens",
    cells: [
      "1",
      "5",
      "20",
      "No limit"
    ]
  },
  {
    kind: "row",
    label: "Add-on lease",
    note: "Bought one at a time, on the same invoice — Premium only",
    cells: [
      "—",
      "—",
      "$1.99 each",
      "In quote"
    ]
  },
  {
    kind: "group",
    label: "Track your minerals"
  },
  {
    kind: "row",
    label: "Dashboard",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Alerts",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Activities",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "My Leases",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "group",
    label: "Value, forecast and maps"
  },
  {
    kind: "row",
    label: "Financials",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Production & Forecast",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Interactive Map",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "group",
    label: "Reports and people"
  },
  {
    kind: "row",
    label: "Weekly Report",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Monthly Report",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Mailed monthly report",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "AI Assistant",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Owner Community",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Invite Co-Owners",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "group",
    label: "Operators — no lease limit"
  },
  {
    kind: "row",
    label: "Operators Directory",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Operator statistics",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Operator performance",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  },
  {
    kind: "row",
    label: "Operator presentation",
    note: "",
    cells: [
      "✓",
      "✓",
      "✓",
      "✓"
    ]
  }
];

export const PLAN_DETAIL: PlanDetail[] = [
  {
    kind: "free",
    name: "Free",
    price: "$0 forever",
    who: "For the owner with one lease. Two-thirds of Texas mineral owners hold exactly one — and for them this is not a trial or a teaser. It is the whole product, free, with no expiry and no card.",
    rows: [
      {
        label: "Owner records",
        value: "1"
      },
      {
        label: "Leases per record",
        value: "1"
      },
      {
        label: "Total capacity",
        value: "1 lease"
      },
      {
        label: "Add-on lease",
        value: "Not available"
      },
      {
        label: "Cost per lease",
        value: "$0"
      }
    ],
    example: "Worked example. You claim your record and it holds 1 lease. You see all 17 features on it — value estimate, forecast, reserves, maps, weekly and monthly reports — and pay nothing, ever. Your first 7 days also open full Premium so you can see what the paid plans do.",
    note: "To open more you move to Pro — Free does not carry the add-on lease meter."
  },
  {
    kind: "pro",
    name: "Pro",
    price: "$49.99/mo",
    who: "For the owner with a handful of leases. One record with five leases open on it — five covers 87.6% of Texas owner records in full, with nothing metered and nothing to add on.",
    rows: [
      {
        label: "Owner records",
        value: "1"
      },
      {
        label: "Leases per record",
        value: "5"
      },
      {
        label: "Total capacity",
        value: "5 leases"
      },
      {
        label: "Add-on lease",
        value: "Not available"
      },
      {
        label: "Cost per lease",
        value: "$10.00/mo"
      }
    ],
    example: "Worked example. Your record holds 12 leases. Pro opens the top 5 — producing and highest-value first — with all 17 features on each, for $49.99 a month, or $10.00 per open lease. The other 7 stay listed and stay under alert monitoring; to open them you move to Premium.",
    note: "Roll identities for one legal person link automatically and count as one, so a name spelled two ways on the roll does not need two claims."
  },
  {
    kind: "prem",
    name: "Premium",
    price: "$99.99/mo",
    who: "For a family, an estate, or an interest spread across counties. Two records with ten leases open on each — twenty in all, at half Pro’s cost per lease — and the only plan that carries the add-on meter when a record runs past ten.",
    rows: [
      {
        label: "Owner records",
        value: "2"
      },
      {
        label: "Leases per record",
        value: "10"
      },
      {
        label: "Total capacity",
        value: "20 leases"
      },
      {
        label: "Add-on lease",
        value: "$1.99/mo each"
      },
      {
        label: "Cost per lease",
        value: "$5.00/mo"
      }
    ],
    example: "Worked example. You claim two records holding 14 and 9 leases — 23 in all. You see 10 + 9 = 19 of them, and the remaining 4 cost $7.96 a month. $107.95 in all, with every one of your 23 leases live — about $4.69 each.",
    note: "This is the plan for anyone whose record runs past five leases, or who holds a second record. Past a few dozen add-ons an Enterprise quote usually costs less, and we say so rather than let the meter run."
  },
  {
    kind: "ent",
    name: "Enterprise",
    price: "Custom quote",
    who: "For trusts, estates, family partnerships and advisors. Three records or more, with no lease limit on any of them — and the right home for anyone whose single record runs past fifty leases, the top 0.76% of the Texas roll.",
    rows: [
      {
        label: "Owner records",
        value: "3 or more"
      },
      {
        label: "Leases per record",
        value: "All of them"
      },
      {
        label: "Total capacity",
        value: "No limit"
      },
      {
        label: "Add-on lease",
        value: "Included in the quote"
      },
      {
        label: "Cost per lease",
        value: "Set by your quote"
      }
    ],
    example: "How it is quoted. Tell us the records you hold and your total lease count, and we price against those two numbers — then add seats, API access and onboarding as you need them. Terms and invoicing suit the entity: no card, no self-checkout.",
    note: "Claims beyond your own record are verified against documented authority — a trust deed, letters testamentary or an operating agreement — because a claim opens someone’s private figures."
  }
];

/** "How the pricing works" — what a visible lease is, and how they are chosen. */
export const HOW_CARDS: InfoCard[] = [
  {
    title: "What “visible lease” means",
    body: "A lease on your claimed record that your plan shows in full — dashboard, map, reports, forecast and alerts. It is the unit every plan is sized in: leases per record × records = your total capacity."
  },
  {
    title: "How your visible leases are chosen",
    body: "Each record ranks its own and opens the top ones automatically: producing and most recently filed first, then by your-share volume, then by recent activity nearby. You can override any slot."
  },
  {
    title: "Leases over your limit are not hidden",
    body: "They stay listed with lease name, county, operator, your decimal interest and the county appraised value — all public record. Archived, never deleted."
  },
  {
    title: "Alerts watch every lease you hold",
    body: "Including the ones over your limit. The moment one starts producing, gets a permit within a mile or changes operator, you are told — the limit caps detail, never monitoring."
  }
];

/** The 12-month term, renewal, upgrades and downgrades. */
export const BILLING_CARDS: InfoCard[] = [
  {
    title: "How the 12-month term works",
    body: "Every paid plan is a 12-month term starting at checkout. Pay it monthly and we take twelve automatic payments — $599.88 on Pro, $1,199.88 on Premium. Prepay the year instead and you pay ten months and get twelve: $499.90 and $999.90. The price is fixed for the term."
  },
  {
    title: "Automatic payments, no automatic renewal",
    body: "Monthly instalments are charged automatically — that is the commitment being collected, not a renewal. At month twelve billing stops. Renewing is one explicit click."
  },
  {
    title: "Your first 7 days are full Premium",
    body: "The trial starts when you claim your record, not when you sign up — no card, and no countdown while you are still searching for your name. On day 8 the account settles onto Free."
  },
  {
    title: "Upgrades now, downgrades at term end",
    body: "Upgrade any time — immediate, and you pay only the prorated difference. Downgrades take effect at the end of your term, and you choose which leases stay open before it closes."
  },
  {
    title: "Add-on leases ride the same invoice",
    body: "A Premium feature, and never a separate charge. A lease added on the 20th appears as a part-month line on your next invoice, so you get one number to look at rather than a scatter of receipts. Free and Pro do not carry the meter — they step up a plan instead."
  },
  {
    title: "Nothing is ever deleted",
    body: "Leases over your limit are archived, not removed. They keep their public roll details on screen, stay under alert monitoring, and come back in full the moment you add capacity."
  },
  {
    title: "Claiming someone else’s record",
    body: "Your own record is self-serve — that is the one Free and Pro carry. Premium’s second record, and any record beyond it under Enterprise, needs a relationship attestation and a document, because a claim opens someone’s private figures. Entities are reviewed by a person."
  },
  {
    title: "Our promise",
    body: "Not a broker. No buyer or operator influence. Your private data is never sold. The prices on this page are the only way Mineral View makes money — and estimates are estimates, never appraisals."
  }
];
