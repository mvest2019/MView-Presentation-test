import type { Metadata } from "next";

import { headingBase } from "../_components/typography";
import { contactConfig as cfg } from "./_components/contact-config";
import { ContactForm } from "./_components/contact-form";
import { ContactInfo } from "./_components/contact-info";
import { Breadcrumb } from "../_components/breadcrumb";

export const metadata: Metadata = {
  title: "Contact Us | Mineral View",
  description:
    "Send Mineral View a message — a person, not a bot, replies within one business day.",
};

/** Contact — form + get-in-touch panel. */
export default function ContactPage() {
  return (
    <div className="pb-16 pt-[18px] max-[767px]:pb-11">
      <div className="mx-auto max-w-[1140px] px-7 max-[767px]:px-4">
        {/* Breadcrumb, heading and cards share one width, so the heading's left
            edge lines up with the left edge of the form card below it. */}
        <div className="mx-auto max-w-[1015px]">
          <Breadcrumb trail={[{ label: "Contact" }]} />

          {/* 30px ceiling: at 38-40px the heading dwarfs the cards below it. */}
          <h1
            className={`${headingBase} text-[clamp(23px,2.6vw,30px)] leading-[1.15]`}
          >
            Contact us
          </h1>
          {/* No max-width: the line is ~700px and the column is 1015px, so
              capping it was the only reason it wrapped. Still wraps naturally
              on narrower screens. */}
          <p className="mb-6 mt-2 text-[15px] leading-[1.55] text-mv-muted">
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
