import type { Metadata } from "next";

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
    <div className="py-16 pt-[52px] max-[767px]:py-11">
      <div className="mx-auto max-w-[1140px] px-7 max-[767px]:px-4">
        <div className="mx-auto mb-3 max-w-[640px] text-center">
          <h1 className={`${headingBase} text-[clamp(28px,4vw,40px)] leading-[1.12]`}>
            Contact Us
          </h1>
        </div>

        <div className="mx-auto mt-3 grid max-w-[1080px] grid-cols-1 items-stretch gap-[22px] min-[861px]:grid-cols-[2fr_1fr]">
          <ContactForm />
          <ContactInfo />
        </div>
      </div>
    </div>
  );
}
