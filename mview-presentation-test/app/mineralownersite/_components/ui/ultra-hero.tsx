import type { ReactNode } from "react";

/**
 * THE ULTRA TIER'S PAGE — `portal.css`'s `.ultra-hero` as Tailwind.
 *
 * Ultra REPLACES a route rather than simplifying it: one headline, one status
 * line, one action, centred on an otherwise empty page. `portal.css` §11 hides
 * every sibling of a `tier-u` element, so this component IS the page in that
 * tier and the caller renders nothing else.
 *
 * ⚠ THE DASHBOARD STILL HAS ITS OWN. `_components/dashboard/ultra-hero.tsx`
 * renders the `.ultra-hero` CSS classes directly, and the rules behind them are
 * still in `portal.css` §11 — the same design, defined twice while both exist.
 * This file is the Tailwind one; the dashboard's should move onto it the next
 * time that component is touched, at which point those ~90 lines of CSS can go.
 * Not done as part of the leases module, deliberately: it would mean editing the
 * dashboard to ship a lease page.
 *
 * Every measurement is that stylesheet's, the two phone breakpoints included —
 * 42px headline down to 32px, 8vh top margin down to 3vh below 520px.
 *
 * ── `footer` ATTACHES A BLOCK TO THE CARD'S FOOT, AND CHANGES ITS PROPORTIONS ──
 *
 * My Leases at Ultra is this hero with the portfolio's five figures under it.
 * They used to be a separate full-width dark strip below a 640px card, which
 * read as two objects that happened to be stacked — and the strip's fifth
 * figure wrapped onto a second row, leaving a quarter of it empty.
 *
 * Passing the block as `footer` puts it inside the card, full bleed, with the
 * card widened to 840px and its lower padding removed so the two are one
 * object. The measurements above are kept EXACTLY as the stylesheet has them
 * whenever no footer is passed, so a plain hero is untouched.
 */

export function UltraHero({
  kicker,
  headline,
  status,
  action,
  note,
  footer,
  className = "",
}: {
  kicker: string;
  /** Wrap the figure that matters in `<strong>` — it renders deep green. */
  headline: ReactNode;
  status: ReactNode;
  action?: ReactNode;
  note?: ReactNode;
  /** A full-bleed block at the foot of the card. See the note above. */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto rounded-[22px] bg-mv-card text-center shadow-[0_1px_2px_rgba(13,14,23,.05),0_12px_40px_rgba(13,14,23,.06)] ${
        footer
          ? /* WIDER, SHORTER AND WITH NO BOTTOM PADDING once something is
               attached. A 640px column of text above a full-width dark strip
               read as two unrelated objects stacked; at the page's own width
               with the strip inside it, it is one card. The vertical measures
               come down with it because the card is no longer three lines of
               text in a large empty box — it now has a foot. */
            "mt-[3vh] max-w-[840px] px-5 pt-9 min-[520px]:mt-[5vh] min-[520px]:px-7 min-[520px]:pt-11"
          : "mt-[3vh] max-w-[640px] px-5 pt-10 pb-9 min-[520px]:mt-[8vh] min-[520px]:px-7 min-[520px]:pt-14 min-[520px]:pb-12"
      } ${className}`.trim()}
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-[22px] h-3.5 w-3.5 rounded-full bg-mv-green shadow-[0_0_0_7px_rgba(84,191,150,.18)]"
      />
      <p className="mb-3.5 text-sm tracking-[0.08em] text-mv-sublabel uppercase">
        {kicker}
      </p>
      {/* `data-mv-headline` is why the caller is told to wrap the figure in
          `<strong>`: `portal.css` blurs `[data-mv-headline] strong` when the
          account has lapsed, exactly as it blurs `.u-headline strong` on the
          Dashboard's copy. The green colour comes from the same element, so the
          figure and the gate travel together. */}
      <h2
        data-mv-headline=""
        className="mb-[18px] text-[32px] leading-[1.12] font-extrabold tracking-[-0.01em] [&_strong]:text-mv-green-deep min-[520px]:text-[42px]"
      >
        {headline}
      </h2>
      <p className="mb-[30px] text-[17px] leading-[1.5] text-mv-ink-soft min-[520px]:text-[19px]">
        {status}
      </p>
      {action}
      {note && (
        <p
          className={`text-sm leading-[1.55] text-mv-sublabel ${
            footer ? "mt-[22px]" : "mt-[26px]"
          }`}
        >
          {note}
        </p>
      )}

      {/* FULL BLEED. The negative margin cancels the card's own horizontal
          padding so the block meets both edges, and the bottom corners are
          rounded to the card's radius so it reads as the card's foot rather
          than as something sitting inside it. Given the full width because the
          five figures it carries only fit on one line when they have it. */}
      {footer && (
        <div className="-mx-5 mt-7 overflow-hidden rounded-b-[22px] text-left min-[520px]:-mx-7">
          {footer}
        </div>
      )}
    </div>
  );
}
