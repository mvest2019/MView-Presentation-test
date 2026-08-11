import type { Metadata } from "next";
import Link from "next/link";

import { headingBase } from "../_components/typography";
import { ContactForm } from "./_components/contact-form";
import { ContactInfo } from "./_components/contact-info";

export const metadata: Metadata = {
  title: "Contact Us | Mineral View",
  description:
    "Send Mineral View a message — a person, not a bot, replies within one business day.",
};

/** Contact — the prototype's `route:contact`. Form + get-in-touch panel. */
export default function ContactPage() {
  return (
    <div className="py-16 pt-[26px] max-[767px]:pb-11">
      <div className="mx-auto max-w-[1140px] px-7 max-[767px]:px-4">
        <nav aria-label="Breadcrumb" className="mb-6 text-[13px]">
          <Link
            href="/"
            className="font-semibold text-mv-green-deep no-underline hover:underline"
          >
            Home
          </Link>
          <span className="mx-2 text-mv-muted">›</span>
          <span className="font-bold text-mv-ink">Contact</span>
        </nav>

        <div className="mx-auto mb-3 max-w-[640px] text-center">
          <h1 className={`${headingBase} text-[clamp(28px,4vw,40px)] leading-[1.12]`}>
            Contact Us
          </h1>
        </div>

        {/* The form column is narrower than the 2fr/1fr split it started as, and
            the get-in-touch column is pinned at the 353px it already occupied —
            a fixed track rather than a second `fr`, because sharing the space
            proportionally would have widened the right card as the left shrank,
            and that card is meant to stay exactly where it was. */}
        <div className="mx-auto mt-3 grid max-w-[1015px] grid-cols-1 items-stretch gap-[22px] min-[861px]:grid-cols-[minmax(0,1fr)_353px]">
          <ContactForm />
          <ContactInfo />
        </div>
      </div>
    </div>
  );
}
