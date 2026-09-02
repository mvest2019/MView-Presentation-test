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
 */

export function UltraHero({
  kicker,
  headline,
  status,
  action,
  note,
  className = "",
}: {
  kicker: string;
  /** Wrap the figure that matters in `<strong>` — it renders deep green. */
  headline: ReactNode;
  status: ReactNode;
  action?: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto mt-[3vh] max-w-[640px] rounded-[22px] bg-mv-card px-5 pt-10 pb-9 text-center shadow-[0_1px_2px_rgba(13,14,23,.05),0_12px_40px_rgba(13,14,23,.06)] min-[520px]:mt-[8vh] min-[520px]:px-7 min-[520px]:pt-14 min-[520px]:pb-12 ${className}`.trim()}
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
        <p className="mt-[26px] text-sm leading-[1.55] text-mv-sublabel">
          {note}
        </p>
      )}
    </div>
  );
}
