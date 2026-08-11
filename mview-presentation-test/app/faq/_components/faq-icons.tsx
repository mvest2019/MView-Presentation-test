/**
 * Category illustrations for the FAQ cards.
 *
 * lucide — the repo's icon set everywhere else — is single-colour outline art by
 * design, which is what made these cards read as unfinished. These are small
 * flat illustrations instead.
 *
 * Drawn to be legible at 48px, which is the whole constraint: few shapes, each
 * one large, strokes no thinner than 2.4, and every shape filling as much of the
 * 48-unit canvas as it can. Fine detail disappears at this size — a barrel with
 * a rim highlight reads, a barrel with rivets does not.
 *
 * Every colour is a `--color-mv-*` token so `app/globals.css` stays the single
 * source; the `art` tokens exist because the UI status colours are tuned for
 * text contrast and go muddy as large flat fills.
 */

import type { ReactNode } from "react";

const T = {
  green: "var(--color-mv-green)",
  greenDeep: "var(--color-mv-green-deep)",
  greenInk: "var(--color-mv-green-ink)",
  mint: "var(--color-mv-mint)",
  orange: "var(--color-mv-art-orange)",
  orangeDeep: "var(--color-mv-art-orange-deep)",
  sand: "var(--color-mv-art-sand)",
  sky: "var(--color-mv-art-sky)",
  skyLight: "var(--color-mv-art-sky-light)",
  violet: "var(--color-mv-art-violet)",
  violetDeep: "var(--color-mv-art-violet-deep)",
  ink: "var(--color-mv-ink)",
  slate: "var(--color-mv-slate)",
  card: "var(--color-mv-card)",
};

export type FaqIconProps = { className?: string };

function Art({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
      {children}
    </svg>
  );
}

/**
 * Most asked — a speech bubble with a question in it.
 *
 * The tail is drawn first and deliberately overshoots into the bubble, so the
 * bubble covers all of it but the point: one shape, no seam to line up.
 */
export function MostAskedArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <path d="M15 28h11L15 42Z" fill={T.violetDeep} />
      <rect x="6" y="7" width="36" height="28" rx="9" fill={T.violet} />
      <path
        d="M20 16a4.4 4.4 0 1 1 7.7 3c-1.8 2-3.7 2.3-3.7 4.6"
        stroke={T.card}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="28.6" r="2.4" fill={T.card} />
    </Art>
  );
}

/** General — a verified record: what this is, and that it checks out. */
export function GeneralArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <path
        d="M8 12a4 4 0 0 1 4-4h12l8 8v20a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V12Z"
        fill={T.green}
      />
      {/* Folded corner, so the shape reads as paper and not as a tile. */}
      <path d="M24 8l8 8h-6a2 2 0 0 1-2-2V8Z" fill={T.mint} />
      <path
        d="M14 22h9M14 27.5h12M14 33h8"
        stroke={T.card}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle
        cx="36"
        cy="35"
        r="8.4"
        fill={T.greenDeep}
        stroke={T.card}
        strokeWidth="2.2"
      />
      <path
        d="M32.3 35.2l2.7 2.7 5.1-5.4"
        stroke={T.card}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Art>
  );
}

/**
 * Products — the stacked data the product is built on.
 *
 * Four discs of one flat blue, each outlined in the card colour so the seams
 * read as clean gaps. Drawn bottom-up: every disc overlaps the one below by its
 * cap height, which is what makes the stack look solid instead of like four
 * floating ellipses.
 */
export function ProductsArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <g fill={T.sky} stroke={T.card} strokeWidth="1.8">
        <path d="M9 33.8A15 4.2 0 0 1 39 33.8V37.2A15 4.2 0 0 1 9 37.2Z" />
        <path d="M9 26.2A15 4.2 0 0 1 39 26.2V29.6A15 4.2 0 0 1 9 29.6Z" />
        <path d="M9 18.6A15 4.2 0 0 1 39 18.6V22A15 4.2 0 0 1 9 22Z" />
        <path d="M9 11A15 4.2 0 0 1 39 11V14.4A15 4.2 0 0 1 9 14.4Z" />
      </g>
    </Art>
  );
}

/** Payments — a wallet with a card in it. */
export function PaymentsArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <rect
        x="16"
        y="6"
        width="24"
        height="15"
        rx="3.5"
        fill={T.sky}
        transform="rotate(-10 28 13)"
      />
      <rect x="5" y="15" width="38" height="26" rx="6" fill={T.orange} />
      <path
        d="M5 26h38v9a6 6 0 0 1-6 6H11a6 6 0 0 1-6-6v-9Z"
        fill={T.orangeDeep}
      />
      <rect x="29" y="26" width="16" height="8" rx="4" fill={T.sand} />
      <circle cx="41" cy="30" r="2.2" fill={T.orangeDeep} />
    </Art>
  );
}

/** Pricing — a price tag with what it costs on it. */
export function PricingArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <rect
        x="10"
        y="10"
        width="28"
        height="28"
        rx="7"
        fill={T.greenDeep}
        transform="rotate(45 24 24)"
      />
      <circle cx="24" cy="12.8" r="3.4" fill={T.card} />
      <path
        d="M24 19.6v15"
        stroke={T.card}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M28.4 23.4c-1.2-1.8-8.8-2.4-8.8 1.1s8.8 1.9 8.8 5.2-7.6 2.9-8.8 1.1"
        stroke={T.card}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Art>
  );
}

/** Terminology — an open book, with a magnifier over it. */
export function TerminologyArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <path
        d="M4 11c6-3 12-3 18 0v23c-6-3-12-3-18 0V11Z"
        fill={T.skyLight}
      />
      <path d="M44 11c-6-3-12-3-18 0v23c6-3 12-3 18 0V11Z" fill={T.sky} />
      <rect x="22.2" y="9.4" width="3.6" height="26" rx="1.8" fill={T.sky} />
      <path
        d="M9 17.4h9M9 23h7"
        stroke={T.card}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="31.5" cy="31" r="8.6" fill={T.mint} />
      <circle
        cx="31.5"
        cy="31"
        r="8.6"
        stroke={T.greenDeep}
        strokeWidth="3.4"
      />
      <path
        d="M38.2 37.6 43.4 42.8"
        stroke={T.greenDeep}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </Art>
  );
}

/** Portal Action — doing something in the portal: a screen mid-click. */
export function PortalActionArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <rect x="4" y="8" width="40" height="26" rx="4.5" fill={T.slate} />
      <rect x="7.6" y="11.6" width="32.8" height="18.8" rx="2.5" fill={T.green} />
      <path d="M21.5 34h5v4h-5z" fill={T.slate} />
      <rect x="15" y="37.6" width="18" height="4" rx="2" fill={T.slate} />
      <path
        d="M15.4 14.6 13 12.2M13.6 19.6h-3.4"
        stroke={T.sand}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M19 15.5l13 5.2-5.4 1.8-1.8 5.4L19 15.5Z"
        fill={T.card}
        stroke={T.ink}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Art>
  );
}
