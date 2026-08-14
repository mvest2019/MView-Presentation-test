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
 * Two menu decisions in the document are load-bearing and should not be
 * "tidied" away:
 *   · Data keeps its own top-level slot. Folding it under "For professionals"
 *     shipped once and was reverted within the hour — a data buyer scans the
 *     bar for the category, not the page for an audience.
 *   · "Find your record" is the single filled CTA in the bar; "Free account"
 *     steps back to mint so the two funnel steps stop competing.
 */

export type NavLink = {
  label: string;
  href: string;
};

/** Top-level bar items, left to right, after the "Find your record" CTA. */
export const primaryNav: NavLink[] = [
  { label: "For owners", href: "/owners" },
  { label: "For professionals", href: "/professionals" },
  { label: "Data", href: "/data" },
  { label: "Map", href: "/map-explorer" },
  { label: "Pricing", href: "/pricing" },
];

/** The "Learn" dropdown — the library only, seven pages people reach for. */
export const learnNav: NavLink[] = [
  { label: "Guides — start here", href: "/resources" },
  { label: "Blog & News", href: "/blog" },
  { label: "Glossary", href: "/glossary" },
  { label: "Watch & Listen", href: "/media" },
  { label: "Community Q&A", href: "/qa" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact-us" },
];

/** Sits below a divider in the Learn dropdown. */
export const learnNavFooterLink: NavLink = {
  label: "Operator directory — free lookup",
  href: "/kyo",
};

/** Mobile drawer "Explore" section — mirrors the bar with fuller labels. */
export const drawerExploreNav: NavLink[] = [
  { label: "For owners — every feature", href: "/owners" },
  { label: "For professionals", href: "/professionals" },
  { label: "Data — licensed county datasets", href: "/data" },
  { label: "Map — explore free", href: "/map-explorer" },
  { label: "Pricing", href: "/pricing" },
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
      { label: "Know Your Operators", href: "/kyo" },
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
      { label: "Blog & News", href: "/blog" },
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
  { label: "Contact", href: "/contact-us" },
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
 */
export const logo = {
  /** Light surfaces (the header, the drawer) — "VIEW" renders dark. */
  onLight:
    "https://res.cloudinary.com/mview/image/upload/e_replace_color:0f1b16:48:ffffff/f_auto,q_auto,w_320/f_auto/icons/mineralview-logo.png",
  /** Dark surfaces (the footer) — "VIEW" renders white. */
  onDark:
    "https://res.cloudinary.com/mview/image/upload/f_auto/f_auto,q_auto,w_320/icons/mineralview-logo.png",
  /** Intrinsic dimensions of the source asset. */
  width: 320,
  height: 73,
} as const;
