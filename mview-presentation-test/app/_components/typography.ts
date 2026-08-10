/**
 * Shared type classes.
 *
 * The prototype sets these as global element rules (`h1,h2,h3 { … }`, `a { … }`).
 * Here they are Tailwind utility strings applied at each usage instead, because
 * Tailwind's preflight resets heading size and weight to `inherit` — an `<h1>`
 * with no classes renders at body size. Anything that needs to look like a
 * heading has to say so.
 *
 * Leading is deliberately NOT in `headingBase`. Several headings override it
 * (the listing h2 at 1.16, cards at 1.3), and two utilities setting the same
 * property collide unpredictably — the winner depends on stylesheet order, not
 * on where they sit in the class string. Each heading states its own.
 */

/** Serif stack, weight and tracking common to h1–h3. */
export const headingBase = "font-serif font-semibold tracking-[-.01em]";

/** 44px, stepping down at the design's 1024px and 767px breakpoints. */
export const h1Class = `${headingBase} leading-[1.18] text-[44px] max-[1024px]:text-[36px] max-[767px]:text-[30px]`;

/** 30px, 24px below 768px. */
export const h2Class = `${headingBase} leading-[1.18] text-[30px] max-[767px]:text-[24px]`;

/** 20px. */
export const h3Class = `${headingBase} leading-[1.18] text-[20px]`;

/**
 * Body-copy links: brand green, underlined on hover only. Navigation, buttons
 * and cards set their own colours and opt out of the underline, so this is only
 * for links sitting inside prose.
 */
export const inlineLink = "text-mv-green-deep no-underline hover:underline";
