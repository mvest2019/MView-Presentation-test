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
  { label: "News", href: "/oil-and-gas-news", sub: "Oil and gas sector activity" },
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
    /*
     * THE SAME FOUR AS THE HEADER'S LEARN MENU (Ryan, 2026-08-13), and derived
     * from `learnNav` rather than restated, so the menu, this column and the
     * library tab row cannot disagree — trimming one trims all three.
     *
     * This column previously carried four more: Resources (/resources),
     * Watch & Listen (/media), Owner community (/groups/public) and Claim your
     * record (/claim). The first three now have NO link anywhere on the site;
     * /claim is still reached from the notice on every article and glossary page.
     * Worth a home somewhere if those pages get built.
     */
    links: learnNav.map(({ label, href }) => ({ label, href })),
  },
];

/** Company column — split out because it carries the support line mid-list. */
export const footerCompanyLinksTop: NavLink[] = [
  { label: "Our Story", href: "/story" },
  { label: "Reviews", href: "/reviews" },
  { label: "Contact", href: "/contact" },
];

/*
 * Terms and Privacy now point at REAL pages, on the same paths the live site uses
 * (`/terms-condition`, `/privacy-policy`) so existing links keep working. Both
 * previously pointed into `/legal?jump=…`, a Legal Center page that does not
 * exist — as the remaining four still do. Those four are subsections of that
 * unbuilt hub; leave them until it is built, or they become 404s in the footer.
 */
export const footerCompanyLinksBottom: NavLink[] = [
  { label: "Legal Center — all policies", href: "/legal" },
  { label: "Terms & Conditions", href: "/terms-condition" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Subscription Terms", href: "/legal?jump=leg-mv-sub" },
  { label: "Lease Audit Terms", href: "/legal?jump=leg-mv-audit" },
  { label: "Group Services Terms", href: "/legal?jump=leg-mv-grpsvc" },
];

/**
 * The real Mineral View logo — the Cloudinary assets the live site uses. Never
 * hand-recreate either as SVG.
 *
 * TWO ASSETS, one per breakpoint, both named explicitly by Ryan (2026-08-13):
 * `icons/mineralview-logo.png` on desktop, `icons/logo.jpg.jpg` on mobile.
 *
 * BOTH ARE USED RAW — no Cloudinary transform on either. That is a deliberate
 * instruction, given twice and confirmed after seeing the rendered result
 * (Ryan, 2026-08-13). Earlier revisions recoloured the desktop wordmark; every
 * one of those is gone. Do not reintroduce a transform without asking.
 *
 * THE KNOWN CONSEQUENCE, so nobody rediscovers it as a bug: the desktop file is
 * drawn for the live site's BLACK header — green "MINERAL" plus WHITE "VIEW". On
 * this build's white header the word VIEW is white-on-white and does not show,
 * and the icon's inner V and upper arc drop out for the same reason. The header
 * reads "MINERAL" with a partial mark beside it. That is the asset, not a bug in
 * this file.
 *
 * If it should ever read in full, the fix is NOT a colour swap — the icon's inner
 * V is the same pure white as the VIEW text, so one swap darkens both and turns
 * the mark into a dark blob. The two real options are a dark ground behind the
 * logo, or a dark header bar; either shows the asset exactly as the live site
 * does.
 *
 * The mobile file is a JPG and so has no alpha: its black ground is baked into
 * the pixels and renders as a black tile whatever sits behind it — which is why
 * the mark reads there and not on desktop. A small corner radius in the header
 * keeps that tile looking deliberate rather than like a clipped image.
 */
export const logo = {
  /**
   * Desktop header — the wordmark, the supplied URL VERBATIM.
   *
   * Do not add a transform here. It has been asked for twice and confirmed after
   * seeing the result (Ryan, 2026-08-13); see the note above for what that means
   * on a white header and for the two ways to change it if that is ever wanted.
   */
  desktop: {
    src: "https://res.cloudinary.com/mview/image/upload/icons/mineralview-logo.png",
    width: 577,
    height: 132,
  },
  /**
   * Mobile header — the square icon mark on its own, so the bar keeps its room
   * for the burger and the CTA at phone widths.
   *
   * A JPG, so it has NO transparency: the black ground is baked into the file and
   * shows as a black tile. That is the asset as it exists; it cannot be made
   * transparent by a URL parameter.
   */
  mobile: {
    src: "https://res.cloudinary.com/mview/image/upload/icons/logo.jpg.jpg",
    width: 63,
    height: 63,
  },
  /** Dark surfaces (the footer) — the wordmark, where white "VIEW" reads. */
  onDark: {
    src: "https://res.cloudinary.com/mview/image/upload/icons/mineralview-logo.png",
    width: 577,
    height: 132,
  },
} as const;
