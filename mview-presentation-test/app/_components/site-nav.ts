/**
 * Navigation data for the marketing header, mobile drawer and footer.
 *
 * The labels, ordering and groupings are taken verbatim from the redesign
 * document (`marketing/src/shell/chunk-005.html` for the header/drawer and
 * `chunk-124.html` for the footer). The prototype is a hash-router single
 * file, so its `#/claim` style hrefs are translated to the App Router paths
 * those routes will occupy. Only the home page exists today — every other
 * path is a placeholder until its page is built.
 *
 * One decision from the document still holds: "Find your record" is the single
 * filled CTA in the bar, and "Free account" steps back to mint so the two funnel
 * steps stop competing.
 *
 * The bar itself now follows `header-mockup.html` (Ryan, 2026-08-11): six items,
 * with the eleven data and operator destinations gathered into an Explore mega
 * menu instead of a `Data` tab, and `Map` no longer in the bar. Note that the
 * document records a failed experiment against removing the Data tab — see the
 * comment on `barNav` before restoring anything here.
 */

export type NavLink = {
  label: string;
  href: string;
};

/** A mega-menu entry: a link with a one-line description underneath. */
export type MegaLink = NavLink & {
  sub: string;
  /** Draws a hairline above this item, as the mockup does before Free samples. */
  dividerBefore?: boolean;
};

export type MegaColumn = {
  heading: string;
  links: MegaLink[];
};

/**
 * Top-level bar items, left to right, after the "Find your record" CTA.
 *
 * HISTORY WORTH READING BEFORE EDITING. The document's v133 folded `Data` out of
 * the bar and it failed within the hour — "Now there is no way to see how to get
 * to the Data Sales" — because a data buyer scans the bar for the CATEGORY. The
 * mockup's answer is different from v133's (the data links are one hover away
 * under Explore, not buried under an audience page), but `Explore` is still not
 * the word a data buyer is looking for. If Data Sales traffic drops, this is the
 * first place to look.
 *
 * `Map` is also gone from the bar, and appears in no menu or footer column, so
 * `/map-explorer` currently has no route into it at all.
 */
export type BarItem =
  | { kind: "link"; label: string; href: string }
  | { kind: "menu"; label: string; menu: "explore" | "learn" };

export const barNav: BarItem[] = [
  { kind: "link", label: "For owners", href: "/owners" },
  { kind: "link", label: "For professionals", href: "/professionals" },
  { kind: "menu", label: "Explore", menu: "explore" },
  // Restored to the bar (Ryan, 2026-08-11), in the slot the design gives it —
  // after the data destinations, before Pricing. The design's reason for a
  // first-class slot still stands: the map is the only nav item a visitor can
  // use before deciding anything.
  { kind: "link", label: "Map", href: "/map-explorer" },
  { kind: "link", label: "Pricing", href: "/pricing" },
  { kind: "menu", label: "Learn", menu: "learn" },
];

/**
 * The Explore mega menu — three columns, thirteen destinations.
 *
 * Labels and descriptions are the mockup's. The hrefs are NOT: the mockup links
 * every item to `#`, so these paths are inferred from the route names the design
 * document uses (`data-lookup`, `data-package`, `data-sample`,
 * `operators-compare-production`, `kyo`, …). None of these pages exist yet, so
 * they need checking against the real route map before launch.
 */
export const exploreNav: MegaColumn[] = [
  {
    heading: "Data coverage",
    links: [
      {
        label: "Mineral owners",
        href: "/data/mineral-owners",
        sub: "Mineral ownership records",
      },
      {
        label: "Production",
        href: "/data/production",
        sub: "Volumes by lease and well",
      },
      {
        label: "Completions",
        href: "/data/completions",
        sub: "Completion records for wells",
      },
      {
        label: "Permits",
        href: "/data/permits",
        sub: "Drilling permit records",
      },
    ],
  },
  {
    heading: "Know your operators",
    links: [
      {
        label: "Oil and gas companies",
        href: "/operators",
        sub: "The full operator directory",
      },
      {
        label: "Compare performance",
        href: "/operators/compare-performance",
        sub: "Compare operator performance",
      },
      {
        label: "Compare statistics",
        href: "/operators/compare-statistics",
        sub: "Compare operator stats",
      },
      {
        label: "Operator presentation",
        href: "/operators/presentation",
        sub: "Shareable operator presentation",
      },
    ],
  },
  {
    heading: "Data download",
    links: [
      {
        label: "Packages by region",
        href: "/data/packages",
        sub: "Delaware, Anadarko, statewide",
      },
      {
        label: "Filter and download",
        href: "/data/download",
        sub: "Pick your rows, export",
      },
      {
        label: "Free samples",
        href: "/data/samples",
        sub: "Try before you buy",
        dividerBefore: true,
      },
    ],
  },
];

/**
 * The "Learn" dropdown, and the drawer's Learn section that mirrors it.
 *
 * Four entries by request (Ryan, 2026-08-11). The design's dropdown carried
 * eight plus a free operator lookup below a divider; Resources, Watch & Listen,
 * Community Q&A, Contact and the operator lookup were dropped from the bar. No
 * route was removed — only where it is surfaced:
 *   · Contact, Resources, Watch & Listen and the operator directory are all
 *     still linked from the footer.
 *   · Community Q&A (/qa) now has no nav entry at all. Worth a footer link when
 *     that page is built.
 *
 * The design lists a single "Blog & News"; they are separate routes here, so
 * both appear.
 *
 * Each carries a `sub` so the panel reads like the Explore one rather than a
 * bare list of four words. These are CONDENSED from each page's own standfirst,
 * not written fresh — the full lines are far too long for a dropdown row. If the
 * page copy changes, shorten the new line rather than inventing a replacement:
 *   Blog     "Get the latest updates, tips, and insights on mineral rights, oil, and gas."
 *   News     "Get real-time updates and insights on the oil and gas sector & mineral rights."
 *   Glossary "Key industry terms and definitions related to mineral rights, oil, and gas."
 *   FAQ      "What Mineral View is, what it isn't, and how your data is handled."
 *
 * `sub` is optional on the type because the mobile sheet and the library tab row
 * share this list and show labels only.
 */
export const learnNav: (NavLink & { sub: string })[] = [
  { label: "Blog", href: "/blogs", sub: "Updates, tips and insights" },
  { label: "News", href: "/news", sub: "Oil and gas sector activity" },
  { label: "Glossary", href: "/glossary", sub: "Key industry terms defined" },
  { label: "FAQ", href: "/faq", sub: "What we are, and how data is handled" },
];

export type FooterColumn = {
  heading: string;
  links: NavLink[];
};

export const footerColumns: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "For owners — all eleven features", href: "/owners" },
      { label: "For professionals — workspaces", href: "/professionals" },
      { label: "Pricing — free to start", href: "/pricing" },
      { label: "Lease Audit", href: "/lease-audit" },
      { label: "Know Your Operators", href: "/operators" },
      {
        label: "Data for business — coverage, downloads & lookup",
        href: "/data",
      },
      { label: "Create your free account", href: "/signup" },
      { label: "Start a free professional account", href: "/signup/pro" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    heading: "Guides",
    links: [
      { label: "Permian Basin Guide", href: "/guide-permian-basin" },
      {
        label: "Is my royalty being paid correctly?",
        href: "/guide/royalty-audit",
      },
      { label: "Who is my operator?", href: "/guide/know-your-operator" },
      { label: "Texas mineral data by county", href: "/guide/county-data" },
      { label: "What are my minerals worth?", href: "/guide/mineral-value" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Resources", href: "/resources" },
      { label: "Blog", href: "/blogs" },
      { label: "News", href: "/news" },
      { label: "Watch & Listen", href: "/media" },
      { label: "Glossary", href: "/glossary" },
      { label: "FAQ", href: "/faq" },
      { label: "Owner community", href: "/groups/public" },
      { label: "Claim your record", href: "/claim" },
    ],
  },
];

/** Company column — split out because it carries the support line mid-list. */
export const footerCompanyLinksTop: NavLink[] = [
  { label: "Our Story", href: "/story" },
  { label: "Reviews", href: "/reviews" },
  { label: "Contact", href: "/contact" },
];

export const footerCompanyLinksBottom: NavLink[] = [
  { label: "Legal Center — all policies", href: "/legal" },
  { label: "Terms of Use", href: "/legal?jump=leg-mv-tou" },
  { label: "Privacy Policy", href: "/legal?jump=leg-mv-priv" },
  { label: "Subscription Terms", href: "/legal?jump=leg-mv-sub" },
  { label: "Lease Audit Terms", href: "/legal?jump=leg-mv-audit" },
  { label: "Group Services Terms", href: "/legal?jump=leg-mv-grpsvc" },
];

/**
 * The real Mineral View logo — the Cloudinary asset the live site uses. Never
 * hand-recreate it as SVG. The non-green part of the mark must be dark on
 * light surfaces and white on dark ones, hence the two transforms.
 *
 * The source asset is green "MINERAL" plus WHITE "VIEW", which is why the plain
 * URL suits dark surfaces and every production use of it sits on black. The
 * light-surface variant recolours only that white word — `e_replace_color` takes
 * `to:tolerance:from`, so this reads "replace #ffffff with the brand ink". The
 * green is untouched: decoded, both variants carry the identical rgb(0,200,160).
 *
 * TWO transforms are chained on the light variant, both taking their targets
 * from `header-mockup.html` (Ryan, 2026-08-11), which colours the wordmark
 * MINERAL `--mv-green-deep` and VIEW `--mv-green-ink`:
 *   1. #ffffff -> #04231a   the VIEW word, brand ink
 *   2. #00cd95 -> #2e8f6d   the MINERAL word, green-deep
 *
 * Step 2 moves the mark OFF the brand green the asset ships (#00CD95, and the
 * value the memory record names) onto the mockup's deeper green, so the wordmark
 * and the header CTA sit in one family. Worth knowing that the mockup's logo is
 * a hand-drawn placeholder using whatever CSS tokens it had to hand, so this may
 * be an approximation rather than a brand decision — it is one line to drop if
 * the vivid green is meant to stay.
 *
 * Order and tolerance are not arbitrary: chained at tolerance 45 the second pass
 * dragged VIEW to #091513 instead of #04231A. Decoded, this pair lands both words
 * exactly on target. Re-check with a pixel sample if you touch either.
 *
 * The dark variant is deliberately left alone — the mockup only shows the light
 * header, and #2E8F6D on the footer's #0D0E17 would be muddy.
 */
export const logo = {
  /** Light surfaces (the header, the drawer) — MINERAL green-deep, VIEW ink. */
  onLight:
    "https://res.cloudinary.com/mview/image/upload/e_replace_color:04231a:48:ffffff/e_replace_color:2e8f6d:25:00cd95/f_auto,q_auto,w_320/f_auto/icons/mineralview-logo.png",
  /** Dark surfaces (the footer) — "VIEW" renders white. */
  onDark:
    "https://res.cloudinary.com/mview/image/upload/f_auto/f_auto,q_auto,w_320/icons/mineralview-logo.png",
  /** Intrinsic dimensions of the source asset. */
  width: 320,
  height: 73,
} as const;
