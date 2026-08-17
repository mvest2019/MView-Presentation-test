import type { Metadata } from "next";
import Link from "next/link";

import { headingBase } from "../_components/typography";
import { contactConfig as cfg } from "./_components/contact-config";
import { ContactForm } from "./_components/contact-form";
import { ContactInfo } from "./_components/contact-info";

export const metadata: Metadata = {
  title: "Contact Us | Mineral View",
  description:
    "Send Mineral View a message — a person, not a bot, replies within one business day.",
};

/** Contact — form + get-in-touch panel. */
export default function ContactPage() {
  // `pb-10` is 40px below the cards, down from 64px. The `max-[767px]:pb-11`
  // override that used to sit alongside it is gone with it: at 44px it was larger
  // than the new desktop value, so it would have added space on phones rather
  // than saving it.
  return (
    <div className="pb-10 pt-[18px]">
      <div className="mx-auto max-w-[1140px] px-7 max-[767px]:px-4">
        {/* Breadcrumb, heading and cards share one width, so the heading's left
            edge lines up with the left edge of the form card below it. */}
        <div className="mx-auto max-w-[1015px]">
          <nav aria-label="Breadcrumb" className="mb-4 text-[13px]">
            <Link
              href="/"
              className="font-semibold text-mv-green-deep no-underline hover:underline"
            >
              Home
            </Link>
            <span className="mx-2 text-mv-muted">›</span>
            {/* "Contact Us", matching the page's own heading — a breadcrumb's last
                crumb names the page you are on. */}
            <span className="font-bold text-mv-ink">Contact Us</span>
          </nav>

          {/* 30px ceiling: at 38-40px the heading dwarfs the cards below it. */}
          <h1
            className={`${headingBase} text-[clamp(23px,2.6vw,30px)] leading-[1.15]`}
          >
            Contact Us
          </h1>
          {/* No max-width: the line is ~700px and the column is 1015px, so
              capping it was the only reason it wrapped. Still wraps naturally
              on narrower screens. */}
          <p className="mb-4 mt-2 text-[15px] leading-[1.55] text-mv-muted">
            We&rsquo;re real people, and we normally reply within one business
            day. Prefer email?{" "}
            <a
              className="font-semibold text-mv-green-deep no-underline hover:underline"
              href={cfg.email.href}
            >
              {cfg.supportEmail}
            </a>
          </p>

          {/* Form column flexes; the get-in-touch column is a fixed 353px track
              rather than a second `fr`, so it keeps its width whatever the form
              does. */}
          <div className="grid grid-cols-1 items-stretch gap-[22px] min-[861px]:grid-cols-[minmax(0,1fr)_353px]">
            <ContactForm />
            <ContactInfo />
          </div>
        </div>
      </div>
    </div>
  );
}
