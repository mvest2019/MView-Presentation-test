import Link from "next/link";

import { inlineLink } from "./typography";

/**
 * The block that closes a legal page — the live site's `ContactCard`, restyled.
 *
 * Postal address and phone number are the live site's, verbatim; they are the
 * registered contact for legal notice and must not be edited here. The email is
 * the one change: `support@mineralview.com` replaces `help@mineralview.com`
 * (Ryan, 2026-08-13), the same address the footer now carries.
 *
 * The live site's version links to `/contact-us`; this build's contact route is
 * `/contact`.
 */
export function LegalContact({
  heading,
  intro,
}: {
  heading: string;
  intro: string;
}) {
  return (
    <div className="rounded-[12px] border border-mv-line bg-mv-mint p-[22px] max-[767px]:p-4">
      <h2 className="mb-2 font-sans text-[17px] font-bold tracking-[-.01em] text-mv-green-ink">
        {heading}
      </h2>
      <p className="mb-4 max-w-[620px] text-[14px] leading-[1.6] text-mv-green-ink">
        {intro}
      </p>

      <div className="rounded-[10px] border border-[#cdeede] bg-white/70 p-4 text-[14px] leading-[1.7] text-mv-slate">
        <p className="font-bold text-mv-ink">
          Mineral View, LLC — Attn: Legal Department
        </p>
        {/* `not-italic` because Tailwind's preflight leaves `address` italic, and
            a postal address set in italics reads as an aside rather than a fact. */}
        <address className="not-italic">
          7301 Ranch Road 620 N, Suite 155-194
          <br />
          Austin, TX 78726-4537
        </address>
        <p className="mt-2">
          <a
            href="mailto:support@mineralview.com"
            className={`${inlineLink} font-semibold`}
          >
            support@mineralview.com
          </a>
          {" · "}
          <a href="tel:+18666468439" className={inlineLink}>
            (866) 646-8439
          </a>
        </p>
      </div>

      <Link
        href="/contact"
        className="mt-4 inline-flex items-center justify-center rounded-[10px] bg-mv-green px-[18px] py-[10px] text-sm font-bold text-mv-green-ink !no-underline hover:brightness-[1.05]"
      >
        Send us a message
      </Link>
    </div>
  );
}
