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

/** Most asked — a speech bubble with a question in it. */
export function MostAskedArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <path
        d="M11 6h26a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H24l-9 7.5V34h-4a7 7 0 0 1-7-7V13a7 7 0 0 1 7-7Z"
        fill={T.green}
      />
      <path
        d="M19.5 16.2a4.7 4.7 0 1 1 8.2 3.2c-1.9 2.1-3.7 2.5-3.7 5"
        stroke={T.card}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="29.8" r="2.5" fill={T.card} />
    </Art>
  );
}

/** General — an oil barrel: the industry the whole site is about. */
export function GeneralArt({ className }: FaqIconProps) {
  return (
    <Art className={className}>
      <rect x="9" y="9" width="25" height="32" rx="7" fill={T.orange} />
      <rect x="9" y="17.4" width="25" height="5" fill={T.orangeDeep} />
      <rect x="9" y="28.4" width="25" height="5" fill={T.orangeDeep} />
      <ellipse cx="21.5" cy="9" rx="12.5" ry="4" fill={T.sand} />
      <path
        d="M40 9.5s4.2 4.8 4.2 6.9a4.2 4.2 0 0 1-8.4 0c0-2.1 4.2-6.9 4.2-6.9Z"
        fill={T.green}
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
