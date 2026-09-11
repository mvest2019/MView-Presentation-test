import Link from "next/link";

import { inlineLink } from "../../_components/typography";

/**
 * The note the Professionals segment shows.
 *
 * A STRAIGHT PORT OF THE DELIVERED DESIGN (user, 2026-09-11: "for professional
 * need same UI that i give you in html, don't change it"). The prototype builds
 * this card in script and drops it directly after the segment control, above
 * the billing toggle; everything below stays where it is, with the owner ladder
 * dimmed behind it. Copy, placement, width and colours are the design's own.
 *
 * An earlier version of this file replaced the note with a gold header and the
 * nine professional feature pages this app has. That is deliberately gone.
 */
export function ProNote() {
  return (
    <div className="mx-auto mt-[14px] max-w-[560px] rounded-[13px] border border-mv-sand-line bg-mv-sand-wash px-[22px] py-5 text-left shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <p className="text-[12px] font-bold uppercase tracking-[.14em] text-mv-portal-alert-gold-ink">
        Professional plans are a separate product
      </p>
      <p className="mt-1.5 text-[14px] leading-[1.55] text-mv-muted">
        Operators, land professionals and advisors work from their own workspace
        — team seats, multi-owner portfolios, the full Texas well map and data
        licensing.{" "}
        <Link href="/professionals" className={inlineLink}>
          See For professionals
        </Link>{" "}
        for those plans. Professional accounts never see private owner data.
      </p>
    </div>
  );
}
