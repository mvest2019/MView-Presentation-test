import type { Metadata } from "next";

import { headingBase } from "../_components/typography";
import { ContactForm } from "./_components/contact-form";
import { ContactInfo } from "./_components/contact-info";
import { Breadcrumb } from "../_components/breadcrumb";

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
        <Breadcrumb trail={[{ label: "Contact" }]} />

        <div className="mx-auto mb-3 max-w-[640px] text-center">
          {/* 30px ceiling, down from 40px: at 40px the heading dwarfed the cards. */}
          <h1
            className={`${headingBase} text-[clamp(23px,2.6vw,30px)] leading-[1.15]`}
          >
            Contact Us
          </h1>
        </div>

        {/* Form column flexes; the get-in-touch column is a fixed 353px track
            rather than a second `fr`, so it keeps its width whatever the form
            does. */}
        <div className="mx-auto mt-3 grid max-w-[1015px] grid-cols-1 items-stretch gap-[22px] min-[861px]:grid-cols-[minmax(0,1fr)_353px]">
          <ContactForm />
          <ContactInfo />
        </div>
      </div>
    </div>
  );
}
