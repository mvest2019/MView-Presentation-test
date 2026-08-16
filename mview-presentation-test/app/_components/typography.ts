/**
 * The site's type scale — one place for every text size, weight and tracking.
 *
 * The prototype sets these as global element rules (`h1,h2,h3 { … }`, `a { … }`).
 * Here they are Tailwind utility strings applied at each usage instead, because
 * Tailwind's preflight resets heading size and weight to `inherit` — an `<h1>`
 * with no classes renders at body size. Anything that needs to look like a
 * heading has to say so.
 *
 * Font family is deliberately absent from all but `headingBase`: `<body>` in
 * `app/layout.tsx` carries `font-sans`, and everything inherits it, so repeating
 * the family per component is noise. See the note in `globals.css`.
 *
 * EXTRACTED, NOT AUTHORED — same rule as the colour tokens. Every value below
 * already existed in the design; this file only gives it a name so the same
 * literal is not retyped in six components. Adding a *new* size means changing
 * the design first.
 *
 * Leading is deliberately NOT in `headingBase`. Several headings override it
 * (the listing h2 at 1.16, cards at 1.3), and two utilities setting the same
 * property collide unpredictably — the winner depends on stylesheet order, not
 * on where they sit in the class string. Each heading states its own.
 */

/** Weight and tracking common to every heading. */
export const headingBase = "font-sans font-semibold tracking-[-.01em]";

/* --------------------------------------------------------------------------
   Headings — the stepped scale
   -------------------------------------------------------------------------- */

/** 44px, stepping down at the design's 1024px and 767px breakpoints. */
export const h1Class = `${headingBase} leading-[1.18] text-[44px] max-[1024px]:text-[36px] max-[767px]:text-[30px]`;

/** 30px, 24px below 768px. */
export const h2Class = `${headingBase} leading-[1.18] text-[30px] max-[767px]:text-[24px]`;

/** 20px. */
export const h3Class = `${headingBase} leading-[1.18] text-[20px]`;

/** 16px — the design's `.filter-head h2`, for headings inside a panel. */
export const h4Class = `${headingBase} leading-[1.3] text-[16px]`;

/* --------------------------------------------------------------------------
   Headings — the fluid display sizes

   Newer prototype pages size their lead heading with `clamp()` rather than the
   stepped scale, so both live here. These are not extra sizes invented for this
   file; each is the exact value its page already used inline.
   -------------------------------------------------------------------------- */

/** 28→40px. The operator directory's `.mv-h1`. */
export const displayLgClass = `${headingBase} leading-[1.18] text-[clamp(28px,4vw,40px)]`;

/** 26→34px. The listing pages' `.res-h`. */
export const displayMdClass = `${headingBase} leading-[1.16] text-[clamp(26px,3vw,34px)]`;

/** 22→30px. A section heading below the page's own h1. */
export const displaySmClass = `${headingBase} leading-[1.18] text-[clamp(22px,2.6vw,30px)]`;

/** 24→32px. The compare tool's `.cp-head h1`, tighter than the directory's. */
export const displayXsClass = `${headingBase} leading-[1.2] tracking-[-.02em] text-[clamp(24px,3vw,32px)]`;

/** 19px — the design's `.ws-title h3` / `.tbl-head h2`, a panel's own title. */
export const panelTitleClass = `${headingBase} text-[19px]`;

/**
 * 20px bold — the compare tool's `.cp-sechead h2`, the heading that titles a
 * band of the page. Distinct from `h3Class` (20px semibold): these carry the
 * heavier weight and tighter tracking the design gives its section heads.
 */
export const sectionTitleClass =
  "font-sans font-bold leading-[1.2] tracking-[-.015em] text-[20px]";

/** 17px bold — the compare tool's `.cp-cardhead h3`, a card's own title. */
export const cardTitleClass = "font-sans font-bold leading-[1.25] text-[17px]";

/* --------------------------------------------------------------------------
   Body and supporting text
   -------------------------------------------------------------------------- */

/**
 * 15px/1.55. Body copy already inherits this from `<body>`; use it only to
 * restore the default inside something that sets its own size.
 */
export const bodyClass = "text-[15px] leading-[1.55]";

/** 14px — the prototype's `.small`. */
export const bodySmallClass = "text-[14px]";

/** 13.5px — supporting copy under a panel title, and control labels. */
export const bodyCompactClass = "text-[13.5px]";

/** 12.5px — the prototype's `.tiny`, for meta lines and counts. */
export const tinyClass = "text-[12.5px]";

/** 12px muted — helper text and captions. */
export const captionClass = "text-[12px] text-mv-muted";

/** 12px semibold muted — a form control's own label (the design's `.adv label`). */
export const labelClass = "text-[12px] font-semibold text-mv-muted";

/**
 * The green all-caps kicker above a page or section heading — the design's
 * `.section-label`: 12px, bold, .14em tracking.
 */
export const eyebrowClass =
  "text-[12px] font-bold uppercase tracking-[.14em] text-mv-green-deep";

/**
 * The smaller all-caps label that titles a group of controls, with the short
 * teal rule before it — the design's `.fgroup-label`.
 */
export const fieldGroupLabelClass =
  "inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-mv-green-deep before:h-[2px] before:w-4 before:rounded-sm before:bg-mv-green before:content-['']";

/* --------------------------------------------------------------------------
   Tables
   -------------------------------------------------------------------------- */

/** 13px semibold — `thead th` on the dark header. */
export const tableHeadClass = "text-[13px] font-semibold";

/** 14.5px — `tbody td`. */
export const tableCellClass = "text-[14.5px]";

/** 12px muted — the second line inside a table cell. */
export const tableSubClass = "text-[12px] font-normal text-mv-muted";

/* --------------------------------------------------------------------------
   Links
   -------------------------------------------------------------------------- */

/**
 * Body-copy links: brand green, underlined on hover only. Navigation, buttons
 * and cards set their own colours and opt out of the underline, so this is only
 * for links sitting inside prose.
 */
export const inlineLink = "text-mv-green-deep no-underline hover:underline";
