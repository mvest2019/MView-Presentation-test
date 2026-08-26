/**
 * The shape of a feature landing page's content — what
 * `scripts/extract-feature-content.py` emits into each route's generated
 * `content.ts`, and what `FeatureLanding` renders.
 *
 * Strings may carry `**bold**` runs — the prototype's own <strong> emphasis,
 * preserved as markers so the generated files stay plain data. Render them
 * through `RichText`, never with `dangerouslySetInnerHTML`.
 *
 * Two templates share this one shape (see the extractor's docstring): the
 * owner pages use `kicker`/`bullets`/`more`/`access`, the professional pages
 * use `saves`/`paragraphs`/`guardrail`. A field a template does not use is
 * simply absent from its files.
 */

export type FeatureImage = { src: string; alt: string };

export type FeatureStep = {
  /** The step chip — "01" … "05". */
  num: string;
  /** Owner pages only — "Step 1 · What it is". */
  kicker?: string | null;
  title: string;
  /** The emphasized lead paragraph(s) — `.fjp-lede` / `.fjq-why`. */
  lede?: string[];
  /** Professional pages — the running body copy, folds unwrapped inline. */
  paragraphs?: string[];
  /** Owner pages — the ✓ benefits list. */
  bullets?: string[];
  /** Professional pages — the "what it saves you" cards. */
  saves?: { lead: string; detail: string }[];
  /** The numbered how-it-works rows. */
  ordered?: string[];
  /** Owner pages — the "Read the full story" fold's paragraphs. */
  more?: string[];
  image?: FeatureImage | null;
  /** In the two-column split, whether the image leads on desktop. */
  imageFirst?: boolean;
};

export type FeatureContent = {
  slug: string;
  /** Page metadata — also the sr-only h1's text via the hero heading. */
  title: string;
  description: string;
  hero: {
    back: { href: string; label: string };
    label: string;
    heading: string;
    sub: string;
    image?: FeatureImage | null;
    stepsHint: { count: string; titles: string[] };
    /** my-leases only — the signup button the prototype puts in the hero. */
    cta?: { label: string; href: string; note: string };
    /** pro-valuation only — the amber "estimate, not an appraisal" notice. */
    notice?: string;
  };
  steps: FeatureStep[];
  /** Owner pages — the "How to access" card's three columns. */
  access?: { label: string; body: string }[];
  /** Professional pages — the owner-trust guardrail card. */
  guardrail?: { title: string; body: string };
  cta?: {
    heading: string;
    sub: string;
    primary: { label: string; href: string } | null;
    links: { label: string; href: string }[];
  };
};
